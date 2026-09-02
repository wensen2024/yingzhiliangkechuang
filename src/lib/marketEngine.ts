import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { stocks, quotes, klines, dimensionScores, marketMeta, type Stock, type Quote, type DimensionScore } from "@/db/schema";
import { DIMENSIONS, GROWTH_DIMENSION_KEYS, type DimensionCategory } from "@/lib/dimensions";
import { computeMaSet, detectBottomBreakout, randomWalkStep, round, type BreakoutResult } from "@/lib/technical";

export const REFRESH_INTERVAL_MS = 4000;

export interface KlinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockAnalytics {
  stock: Stock;
  quote: Quote;
  kline: KlinePoint[];
  dimensions: DimensionScore[];
  categoryAverages: Record<DimensionCategory, number>;
  overallScore: number;
  growthScore: number;
  breakout: BreakoutResult;
}

let tickInFlight: Promise<void> | null = null;

async function getLastTickAt(): Promise<number> {
  const rows = await db.select().from(marketMeta).where(eq(marketMeta.key, "last_tick_at")).limit(1);
  if (rows.length === 0) return 0;
  const t = Date.parse(rows[0].value);
  return Number.isNaN(t) ? 0 : t;
}

async function setLastTickAt(iso: string): Promise<void> {
  await db
    .insert(marketMeta)
    .values({ key: "last_tick_at", value: iso })
    .onConflictDoUpdate({ target: marketMeta.key, set: { value: iso, updatedAt: new Date() } });
}

async function fetchEastMoneyData(secidsStr: string) {
  const url = `http://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f12,f13,f14,f2,f3,f4,f15,f16,f17,f18,f8,f9,f10,f20&secids=${secidsStr}`;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    const result = await response.json();
    return result?.data?.diff || [];
  } catch (error) {
    console.error("Fetch EastMoney failed:", error);
    return [];
  }
}

async function runTick(): Promise<void> {
  const allStocks = await db.select().from(stocks);
  const allQuotes = await db.select().from(quotes);
  const quoteByStock = new Map(allQuotes.map((q) => [q.stockId, q]));

  // 拉取每只股票最近90个交易日收盘价用于重算均线
  const recentKlines = await db.execute<{
    stock_id: number;
    close: string;
    volume: string;
  }>(sql`
    select stock_id, close, volume from (
      select stock_id, close, volume, trade_date,
        row_number() over (partition by stock_id order by trade_date desc) as rn
      from klines
    ) t where rn <= 90
    order by stock_id, trade_date asc
  `);

  const closesByStock = new Map<number, number[]>();
  for (const row of recentKlines.rows as unknown as { stock_id: number; close: string; volume: string }[]) {
    const arr = closesByStock.get(row.stock_id) ?? [];
    arr.push(Number(row.close));
    closesByStock.set(row.stock_id, arr);
  }

  const updates: Promise<unknown>[] = [];

  const secidsMap = allStocks.map(s => {
       const prefix = (s.market === '科创板' || s.market === '沪主板') ? '1.' : '0.';
       return `${prefix}${s.code}`;
  });
  
  const batchSize = 40;
  for (let i = 0; i < secidsMap.length; i += batchSize) {
      const batch = secidsMap.slice(i, i + batchSize);
      const secidsStr = batch.join(',');
      const marketData = await fetchEastMoneyData(secidsStr);
      
      for (const data of marketData) {
          const stockCode = data.f12;
          const stock = allStocks.find(s => s.code === stockCode);
          if (!stock) continue;
          
          const quote = quoteByStock.get(stock.id);
          if (!quote) continue;

          const newPrice = Number(data.f2) === Number(data.f2) ? Number(data.f2) / 100 : Number(quote.price); 
          const high = Number(data.f15) === Number(data.f15) ? Number(data.f15) / 100 : Number(quote.high);
          const low = Number(data.f16) === Number(data.f16) ? Number(data.f16) / 100 : Number(quote.low);
          const open = Number(data.f17) === Number(data.f17) ? Number(data.f17) / 100 : Number(quote.open);
          const prevClose = Number(data.f18) === Number(data.f18) ? Number(data.f18) / 100 : Number(quote.prevClose);
          const changePct = Number(data.f3) === Number(data.f3) ? Number(data.f3) / 100 : Number(quote.changePct); 
          const volumeLots = Number(data.f8) === Number(data.f8) ? Number(data.f8) : Number(quote.volumeLots);
          const amountWan = Number(data.f9) === Number(data.f9) ? Number(data.f9) / 10000 : Number(quote.amountWan);

          const closes = closesByStock.get(stock.id) ?? [prevClose];
          const effectiveCloses = [...closes, newPrice];
          const maSet = computeMaSet(effectiveCloses);

          updates.push(
            db
              .update(quotes)
              .set({
                price: newPrice.toString(),
                high: high.toString(),
                low: low.toString(),
                open: open.toString(),
                prevClose: prevClose.toString(),
                changePct: changePct.toString(),
                volumeLots: volumeLots.toString(),
                amountWan: amountWan.toString(),
                ma5: maSet.ma5.toString(),
                ma10: maSet.ma10.toString(),
                ma20: maSet.ma20.toString(),
                ma60: maSet.ma60.toString(),
                updatedAt: new Date(),
              })
              .where(eq(quotes.id, quote.id)),
          );
      }
  }

  await Promise.all(updates);
  await setLastTickAt(new Date().toISOString());
}

async function ensureFreshMarket(): Promise<void> {
  const lastTick = await getLastTickAt();
  const now = Date.now();
  if (now - lastTick < REFRESH_INTERVAL_MS) return;

  if (!tickInFlight) {
    tickInFlight = runTick().finally(() => {
      tickInFlight = null;
    });
  }
  await tickInFlight;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export async function getMarketSnapshot(): Promise<StockAnalytics[]> {
  await ensureFreshMarket();

  const [allStocks, allQuotes, allKlines, allDims] = await Promise.all([
    db.select().from(stocks),
    db.select().from(quotes),
    db.select().from(klines).orderBy(klines.stockId, klines.tradeDate),
    db.select().from(dimensionScores),
  ]);

  const quoteByStock = new Map(allQuotes.map((q) => [q.stockId, q]));
  const klinesByStock = new Map<number, typeof allKlines>();
  for (const row of allKlines) {
    const arr = klinesByStock.get(row.stockId) ?? [];
    arr.push(row);
    klinesByStock.set(row.stockId, arr);
  }
  const dimsByStock = new Map<number, DimensionScore[]>();
  for (const row of allDims) {
    const arr = dimsByStock.get(row.stockId) ?? [];
    arr.push(row);
    dimsByStock.set(row.stockId, arr);
  }

  const result: StockAnalytics[] = [];

  for (const stock of allStocks) {
    const quote = quoteByStock.get(stock.id);
    const kRows = klinesByStock.get(stock.id) ?? [];
    const dims = dimsByStock.get(stock.id) ?? [];
    if (!quote || kRows.length === 0) continue;

    const kline: KlinePoint[] = kRows.map((r) => ({
      date: r.tradeDate,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
    }));

    const closes = kline.map((k) => k.close);
    const volumes = kline.map((k) => k.volume);
    const livePrice = Number(quote.price);
    const liveVolume = Number(quote.volumeLots) * 100 || volumes[volumes.length - 1];
    const effectiveCloses = [...closes, livePrice];
    const effectiveVolumes = [...volumes, liveVolume];

    const breakout = detectBottomBreakout(effectiveCloses, effectiveVolumes);

    const categoryAverages = {
      macro: average(dims.filter((d) => d.category === "macro").map((d) => d.score)),
      financial: average(dims.filter((d) => d.category === "financial").map((d) => d.score)),
      technical: average(dims.filter((d) => d.category === "technical").map((d) => d.score)),
      industry: average(dims.filter((d) => d.category === "industry").map((d) => d.score)),
    } as Record<DimensionCategory, number>;

    const overallScore = average(dims.map((d) => d.score));
    const growthScore = average(dims.filter((d) => GROWTH_DIMENSION_KEYS.includes(d.dimensionKey)).map((d) => d.score));

    result.push({
      stock,
      quote,
      kline,
      dimensions: dims.sort((a, b) => DIMENSIONS.findIndex((d) => d.key === a.dimensionKey) - DIMENSIONS.findIndex((d) => d.key === b.dimensionKey)),
      categoryAverages,
      overallScore,
      growthScore,
      breakout,
    });
  }

  return result;
}

export async function getStockAnalyticsByCode(code: string): Promise<StockAnalytics | null> {
  const snapshot = await getMarketSnapshot();
  return snapshot.find((s) => s.stock.code === code) ?? null;
}

export function isScreenerHit(item: StockAnalytics): boolean {
  return item.breakout.isBreakout && item.growthScore >= 68;
}
