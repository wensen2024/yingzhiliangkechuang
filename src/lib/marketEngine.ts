import { DIMENSIONS, GROWTH_DIMENSION_KEYS, type DimensionCategory } from "@/lib/dimensions";
import { detectBottomBreakout, type BreakoutResult } from "@/lib/technical";

// Re-declare local interfaces since we are not using DB anymore
export interface Stock {
  id: number;
  code: string;
  name: string;
  market: string;
  sector: string;
  isIndexMember: boolean;
  isNewIpo: boolean;
}

export interface Quote {
  id: number;
  stockId: number;
  price: string;
  open: string;
  high: string;
  low: string;
  prevClose: string;
  changePct: string;
  volumeLots: string;
  amountWan: string;
  ma5: string;
  ma10: string;
  ma20: string;
  ma60: string;
}

export interface DimensionScore {
  id: number;
  stockId: number;
  dimensionKey: string;
  category: DimensionCategory;
  score: number;
}

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

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

// Generate deterministic random dimensions based on stock code to simulate 20 dimensions
function generateDims(stockId: number, code: string): DimensionScore[] {
  let seed = parseInt(code, 10) || 123456;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return DIMENSIONS.map((d) => {
    // Generate score between 40 and 95
    const score = Math.floor(random() * 55) + 40;
    return {
      id: 0,
      stockId,
      dimensionKey: d.key,
      category: d.category,
      score,
    };
  });
}

// Global cache to avoid rate limits
let cachedSnapshot: StockAnalytics[] | null = null;
let cacheTime = 0;

export async function getMarketSnapshot(): Promise<StockAnalytics[]> {
  const now = Date.now();
  // 5 seconds cache
  if (cachedSnapshot && now - cacheTime < 5000) {
    return cachedSnapshot;
  }

  try {
    // 爬取全球权威前100 - 这里使用东方财富API抓取科创板前100及A股前列股票实时行情
    // m:1+t:23 代表上交所科创板
    const url = `http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:1+t:23&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } });
    const json = await res.json();
    const items = json?.data?.diff || [];

    const result: StockAnalytics[] = items.map((item: any, idx: number) => {
      const price = Number(item.f2) / 100 || 0;
      const changePct = Number(item.f3) / 100 || 0;
      const open = Number(item.f17) / 100 || price;
      const high = Number(item.f15) / 100 || price;
      const low = Number(item.f16) / 100 || price;
      const prevClose = Number(item.f18) / 100 || price;
      const volumeLots = Number(item.f8) || 0;
      const amountWan = Number(item.f9) / 10000 || 0;

      const stock: Stock = {
        id: idx + 1,
        code: item.f12 || "000000",
        name: item.f14 || "未知",
        market: "科创板",
        sector: "硬科技",
        isIndexMember: idx < 50,
        isNewIpo: idx % 10 === 0,
      };

      const quote: Quote = {
        id: idx + 1,
        stockId: stock.id,
        price: price.toString(),
        open: open.toString(),
        high: high.toString(),
        low: low.toString(),
        prevClose: prevClose.toString(),
        changePct: changePct.toString(),
        volumeLots: volumeLots.toString(),
        amountWan: amountWan.toString(),
        ma5: (price * 0.98).toFixed(2),
        ma10: (price * 0.95).toFixed(2),
        ma20: (price * 0.92).toFixed(2),
        ma60: (price * 0.9).toFixed(2),
      };

      const kline: KlinePoint[] = [
        { date: "2026-09-01", open: prevClose, high: prevClose * 1.02, low: prevClose * 0.98, close: prevClose, volume: volumeLots * 0.9 },
        { date: "2026-09-02", open, high, low, close: price, volume: volumeLots },
      ];

      const dims = generateDims(stock.id, stock.code);

      const categoryAverages = {
        macro: average(dims.filter((d) => d.category === "macro").map((d) => d.score)),
        financial: average(dims.filter((d) => d.category === "financial").map((d) => d.score)),
        technical: average(dims.filter((d) => d.category === "technical").map((d) => d.score)),
        industry: average(dims.filter((d) => d.category === "industry").map((d) => d.score)),
      } as Record<DimensionCategory, number>;

      const overallScore = average(dims.map((d) => d.score));
      const growthScore = average(dims.filter((d) => GROWTH_DIMENSION_KEYS.includes(d.dimensionKey)).map((d) => d.score));

      const breakout = detectBottomBreakout(kline.map(k=>k.close), kline.map(k=>k.volume));

      return {
        stock,
        quote,
        kline,
        dimensions: dims,
        categoryAverages,
        overallScore,
        growthScore,
        breakout,
      };
    });

    cachedSnapshot = result;
    cacheTime = now;
    return result;
  } catch (error) {
    console.error("Live fetch error:", error);
    return cachedSnapshot || [];
  }
}

export async function getStockAnalyticsByCode(code: string): Promise<StockAnalytics | null> {
  const snapshot = await getMarketSnapshot();
  return snapshot.find((s) => s.stock.code === code) ?? null;
}

export function isScreenerHit(item: StockAnalytics): boolean {
  return item.breakout.isBreakout && item.growthScore >= 68;
}