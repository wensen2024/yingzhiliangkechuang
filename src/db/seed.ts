import "dotenv/config";
import { db, pool } from "./index";
import { stocks, quotes, klines, dimensionScores, marketMeta } from "./schema";
import { SEED_STOCKS_CLEAN, type SeedStock, type PatternHint } from "./seedData";
import { DIMENSIONS } from "../lib/dimensions";
import { mulberry32, round, computeMaSet, detectBottomBreakout, average } from "../lib/technical";

const TRADING_DAYS = 130;

interface GeneratedSeries {
  dates: string[];
  closes: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
}

function isoDaysBack(fromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() - fromToday);
  return d.toISOString().slice(0, 10);
}

function generateTradingDates(count: number): string[] {
  // 生成 count 个交易日日期（跳过周末），倒序回填，最后一个是"昨天"
  const result: string[] = [];
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1); // 昨天作为最新历史收盘日
  while (result.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      result.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return result.reverse();
}

function generateSeries(seed: SeedStock, rng: () => number): GeneratedSeries {
  const dates = generateTradingDates(TRADING_DAYS);
  const closes: number[] = [];
  const opens: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const volumes: number[] = [];

  const vol = seed.volatility;
  const base = seed.basePrice;
  const baseVolume = Math.max(500, (seed.marketCapYi * 8 + rng() * 2000) / 10);

  let price = base;
  const n = TRADING_DAYS;

  const phase1End = Math.floor(n * 0.42);
  // "breakout" 形态的历史K线全程保持底部盘整，决定性放量突破留给"今日"实时价完成
  const phase2End = n;

  // 依据形态确定起始锚点，让最新价格回归到 basePrice 附近
  let startPrice: number;
  switch (seed.pattern) {
    case "breakout":
      startPrice = base * (1 + 0.28 + rng() * 0.12); // 前期高位回落
      break;
    case "trend_up":
      startPrice = base * (1 - 0.22 - rng() * 0.1); // 前期低位，逐步走高
      break;
    case "trend_down":
      startPrice = base * (1 + 0.22 + rng() * 0.1);
      break;
    case "volatile":
      startPrice = base * (1 + (rng() - 0.5) * 0.1);
      break;
    default:
      startPrice = base * (1 + (rng() - 0.5) * 0.06);
  }
  price = startPrice;

  const baseLowAnchor = base * (1 - 0.06 - rng() * 0.06);

  for (let i = 0; i < n; i++) {
    let drift = 0;
    let localVol = vol;

    if (seed.pattern === "breakout") {
      if (i < phase1End) {
        // 下跌寻底
        drift = -Math.abs(vol) * 0.55 * (1 - i / phase1End);
        localVol = vol * 1.1;
      } else if (i < phase2End) {
        // 底部盘整
        const target = baseLowAnchor;
        drift = (target - price) / price * 0.15;
        localVol = vol * 0.55;
      } else {
        // 临界突破前的温和试探性上行（决定性放量突破留给"今日"实时价完成）
        const progress = (i - phase2End) / Math.max(1, n - phase2End);
        drift = vol * (0.35 + progress * 0.55);
        localVol = vol * 0.85;
      }
    } else if (seed.pattern === "trend_up") {
      drift = vol * 0.32;
      localVol = vol * 0.9;
    } else if (seed.pattern === "trend_down") {
      drift = -vol * 0.3;
      localVol = vol * 0.9;
    } else if (seed.pattern === "volatile") {
      drift = (rng() - 0.5) * vol * 0.4;
      localVol = vol * 1.3;
    } else {
      // range
      const reversion = (base - price) / price * 0.08;
      drift = reversion;
      localVol = vol * 0.7;
    }

    const noise = (rng() - 0.5) * 2 * localVol;
    price = Math.max(price * (1 + drift + noise), base * 0.15);

    const dayVolMultiplier =
      seed.pattern === "breakout" && i >= phase2End
        ? 1.3 + ((i - phase2End) / Math.max(1, n - phase2End)) * 1.8
        : 0.7 + rng() * 0.6;

    const open = round(price * (1 + (rng() - 0.5) * localVol * 0.6));
    const close = round(price);
    const high = round(Math.max(open, close) * (1 + rng() * localVol * 0.5));
    const low = round(Math.min(open, close) * (1 - rng() * localVol * 0.5));
    const volume = round(baseVolume * dayVolMultiplier, 2);

    opens.push(open);
    closes.push(close);
    highs.push(high);
    lows.push(low);
    volumes.push(volume);
  }

  return { dates, closes, opens, highs, lows, volumes };
}

function scoreFromRange(rng: () => number, min: number, max: number): number {
  return Math.round(min + rng() * (max - min));
}

function sectorGrowthBias(seed: SeedStock): { financial: [number, number]; industry: [number, number]; macro: [number, number] } {
  if (seed.growthTier === "high") {
    return { financial: [70, 96], industry: [72, 96], macro: [60, 92] };
  }
  if (seed.growthTier === "mid") {
    return { financial: [50, 80], industry: [50, 82], macro: [45, 80] };
  }
  return { financial: [30, 62], industry: [30, 60], macro: [35, 65] };
}

async function main() {
  console.log(`准备写入 ${SEED_STOCKS_CLEAN.length} 只股票样本数据...`);

  await db.delete(dimensionScores);
  await db.delete(klines);
  await db.delete(quotes);
  await db.delete(stocks);

  // 先生成全部股票的技术序列，用于计算相对强弱排名
  const prepared = SEED_STOCKS_CLEAN.map((seed) => {
    const rng = mulberry32(seed.code + seed.name);
    const series = generateSeries(seed, rng);
    const return20 = series.closes.length > 20
      ? (series.closes[series.closes.length - 1] - series.closes[series.closes.length - 21]) / series.closes[series.closes.length - 21]
      : 0;
    return { seed, rng, series, return20 };
  });

  const sortedByReturn = [...prepared].sort((a, b) => a.return20 - b.return20);
  const rsRankMap = new Map<string, number>();
  sortedByReturn.forEach((item, idx) => {
    rsRankMap.set(item.seed.code, Math.round((idx / Math.max(1, sortedByReturn.length - 1)) * 100));
  });

  for (const { seed, rng, series } of prepared) {
    const [inserted] = await db
      .insert(stocks)
      .values({
        code: seed.code,
        name: seed.name,
        market: seed.market,
        sector: seed.sector,
        concept: seed.concept,
        listedDate: isoDaysBack(seed.listedDaysAgo),
        isIndexMember: seed.isIndexMember,
        isNewIpo: seed.isNewIpo,
        description: seed.description,
        totalMarketCapYi: seed.marketCapYi.toString(),
        peRatio: seed.pe.toString(),
        volatilityFactor: seed.volatility.toString(),
      })
      .returning();

    // 写入K线
    const klineRows = series.dates.map((date, idx) => ({
      stockId: inserted.id,
      tradeDate: date,
      open: series.opens[idx].toString(),
      high: series.highs[idx].toString(),
      low: series.lows[idx].toString(),
      close: series.closes[idx].toString(),
      volume: series.volumes[idx].toString(),
    }));
    await db.insert(klines).values(klineRows);

    // 生成"今日"实时价：普通形态做微小游走，"breakout"形态在今日决定性放量突破MA20
    const prevClose = series.closes[series.closes.length - 1];
    const isBreakoutPattern = seed.pattern === "breakout";
    const dailyLimit = seed.market === "科创板" || seed.market === "创业板" ? 0.195 : 0.095;
    const rawTodayDrift = isBreakoutPattern
      ? seed.volatility * (2.4 + rng() * 2.2) // 决定性跳空放量突破
      : (rng() - 0.45) * seed.volatility * 1.2;
    const todayDrift = Math.min(rawTodayDrift, dailyLimit);
    const todayPrice = round(Math.max(prevClose * (1 + todayDrift), prevClose * 0.85));
    const todayOpen = round(prevClose * (1 + (isBreakoutPattern ? rng() * seed.volatility * 0.3 : (rng() - 0.5) * seed.volatility * 0.5)));
    const todayHigh = round(Math.max(todayOpen, todayPrice) * (1 + rng() * seed.volatility * 0.4));
    const todayLow = round(Math.min(todayOpen, todayPrice) * (1 - rng() * seed.volatility * 0.25));

    const effectiveCloses = [...series.closes, todayPrice];
    const maSet = computeMaSet(effectiveCloses);

    const changePct = round(((todayPrice - prevClose) / prevClose) * 100, 3);
    const recentAvgVolume = average(series.volumes.slice(-5));
    const volumeLots = round(
      (recentAvgVolume * (isBreakoutPattern ? 2.2 + rng() * 1.2 : 0.8 + rng() * 0.6)) / 100,
      2,
    );
    const amountWan = round((volumeLots * 100 * todayPrice) / 10, 2);
    const turnoverRate = round(rng() * 3 + (isBreakoutPattern ? 1.5 : 0.3), 3);

    await db.insert(quotes).values({
      stockId: inserted.id,
      price: todayPrice.toString(),
      prevClose: prevClose.toString(),
      open: todayOpen.toString(),
      high: todayHigh.toString(),
      low: todayLow.toString(),
      changePct: changePct.toString(),
      volumeLots: volumeLots.toString(),
      amountWan: amountWan.toString(),
      turnoverRate: turnoverRate.toString(),
      ma5: maSet.ma5.toString(),
      ma10: maSet.ma10.toString(),
      ma20: maSet.ma20.toString(),
      ma60: maSet.ma60.toString(),
    });

    // 技术面维度：基于真实计算出的突破/均线情况
    const liveVolumeForDetection = volumeLots * 100 || series.volumes[series.volumes.length - 1];
    const breakout = detectBottomBreakout(effectiveCloses, [...series.volumes, liveVolumeForDetection]);
    const rsRank = rsRankMap.get(seed.code) ?? 50;

    const bias = sectorGrowthBias(seed);

    const dimensionValues: Record<string, { score: number; summary: string }> = {
      macro_cycle: { score: scoreFromRange(rng, bias.macro[0], bias.macro[1]), summary: "受宏观经济景气度及信贷周期影响程度评估" },
      macro_policy: {
        score: scoreFromRange(rng, seed.sector.includes("半导体") || seed.sector.includes("AI") ? 70 : 45, 96),
        summary: "产业政策、专项基金与地方扶持力度综合评估",
      },
      macro_localization: {
        score: scoreFromRange(
          rng,
          /半导体|芯片|EDA|软件|数据库|工业软件/.test(seed.sector) ? 68 : 40,
          96,
        ),
        summary: "国产替代逻辑下的进口替代空间与紧迫性",
      },
      macro_liquidity: { score: scoreFromRange(rng, 40, 90), summary: "流动性宽松环境下估值弹性评估" },
      macro_geopolitics: {
        score: scoreFromRange(rng, /半导体|芯片|设备|材料/.test(seed.sector) ? 35 : 60, 88),
        summary: "出口管制、关税与供应链自主可控风险抵御能力",
      },
      fin_revenue_growth: { score: scoreFromRange(rng, bias.financial[0], bias.financial[1]), summary: "近三年营业收入复合增长趋势" },
      fin_profit_growth: { score: scoreFromRange(rng, bias.financial[0] - 5, bias.financial[1]), summary: "归母净利润增速与业绩弹性" },
      fin_gross_margin: { score: scoreFromRange(rng, 40, 92), summary: "产品结构与议价能力对毛利率的支撑" },
      fin_rd_intensity: {
        score: scoreFromRange(rng, /芯片|软件|EDA|机器人|AI/.test(seed.sector) ? 65 : 40, 95),
        summary: "研发费用率与核心技术团队投入强度",
      },
      fin_cashflow: { score: scoreFromRange(rng, 35, 88), summary: "经营性现金流与应收账款周转健康度" },
      tech_ma_alignment: {
        score: Math.min(97, Math.max(15, Math.round((breakout.isBullishAligned ? 78 : 45) + (rng() - 0.3) * 20))),
        summary: `MA5/MA10/MA20 排列：${maSet.ma5 > maSet.ma10 && maSet.ma10 > maSet.ma20 ? "多头排列" : "排列偏弱"}`,
      },
      tech_volume_price: {
        score: Math.min(96, Math.max(20, Math.round(breakout.strength * 0.8 + rng() * 15))),
        summary: breakout.reason,
      },
      tech_base_pattern: {
        score: Math.min(95, Math.max(20, Math.round((100 - breakout.distanceFromLowPct) * 0.5 + rng() * 20))),
        summary: `距60日低点涨幅 ${breakout.distanceFromLowPct}%，底部窗口约${breakout.basePatternDays}个交易日`,
      },
      tech_relative_strength: { score: rsRank, summary: `20日相对强弱在样本股中排名前 ${100 - rsRank}%` },
      tech_chip_stability: {
        score: Math.min(95, Math.max(20, Math.round(90 - seed.volatility * 900 + rng() * 10))),
        summary: "基于历史波动率评估筹码集中与稳定程度",
      },
      ind_prosperity: { score: scoreFromRange(rng, bias.industry[0], bias.industry[1]), summary: "所处细分行业景气度与需求趋势" },
      ind_moat: {
        score: scoreFromRange(rng, /芯片|设备|EDA|材料|机器人核心/.test(seed.sector) ? 60 : 40, 92),
        summary: "技术专利、客户认证与工艺壁垒构筑的护城河",
      },
      ind_customer: { score: scoreFromRange(rng, 35, 88), summary: "核心客户集中度与在手订单可见性" },
      ind_market_share: { score: scoreFromRange(rng, 35, 90), summary: "细分市场市占率与竞争格局地位" },
      ind_commercialization: { score: scoreFromRange(rng, bias.industry[0] - 5, bias.industry[1]), summary: "技术成果商业化落地节奏与放量速度" },
    };

    const dimRows = DIMENSIONS.map((def) => ({
      stockId: inserted.id,
      category: def.category,
      dimensionKey: def.key,
      label: def.label,
      score: dimensionValues[def.key]?.score ?? 50,
      summary: dimensionValues[def.key]?.summary ?? "",
    }));
    await db.insert(dimensionScores).values(dimRows);
  }

  await db
    .insert(marketMeta)
    .values({ key: "last_tick_at", value: new Date().toISOString() })
    .onConflictDoUpdate({ target: marketMeta.key, set: { value: new Date().toISOString(), updatedAt: new Date() } });

  console.log("种子数据写入完成 ✅");
}

main()
  .catch((err) => {
    console.error("种子数据写入失败", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
