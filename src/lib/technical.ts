// 技术面计算工具：均线、突破识别、随机游走模拟盘口跳动

export function round(n: number, digits = 3): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function movingAverage(closesOldToNew: number[], period: number): number {
  if (closesOldToNew.length === 0) return 0;
  const slice = closesOldToNew.slice(Math.max(0, closesOldToNew.length - period));
  return average(slice);
}

export interface BreakoutResult {
  isBreakout: boolean;
  isBullishAligned: boolean; // 均线多头排列 MA5>MA10>MA20>MA60
  distanceFromLowPct: number; // 距离60日低点的涨幅
  basePatternDays: number; // 底部盘整天数估算
  strength: number; // 0-100 突破强度
  reason: string;
}

/**
 * 判断"底部均线突破"：
 * 1. 此前一段时间价格在低位窄幅震荡（底部形态）
 * 2. 最新收盘价从下方突破 MA20，且 MA5/MA10 开始转多头
 * 3. 量能较此前底部区间放大
 */
export function detectBottomBreakout(closesOldToNew: number[], volumesOldToNew: number[]): BreakoutResult {
  const n = closesOldToNew.length;
  if (n < 30) {
    return {
      isBreakout: false,
      isBullishAligned: false,
      distanceFromLowPct: 0,
      basePatternDays: 0,
      strength: 0,
      reason: "历史数据不足",
    };
  }

  const last = closesOldToNew[n - 1];
  const prev = closesOldToNew[n - 2];

  const ma5 = movingAverage(closesOldToNew, 5);
  const ma10 = movingAverage(closesOldToNew, 10);
  const ma20 = movingAverage(closesOldToNew, 20);
  const ma60 = movingAverage(closesOldToNew, 60);

  const ma20Prev = movingAverage(closesOldToNew.slice(0, n - 1), 20);

  // 底部区间：过去 20~50 日窗口的最低价
  const lookback = closesOldToNew.slice(Math.max(0, n - 55), Math.max(0, n - 5));
  const baseLow = lookback.length ? Math.min(...lookback) : Math.min(...closesOldToNew);
  const baseHigh = lookback.length ? Math.max(...lookback) : Math.max(...closesOldToNew);
  const baseRangePct = baseLow > 0 ? ((baseHigh - baseLow) / baseLow) * 100 : 100;

  // "最近突破"判定：过去6个交易日内曾贴近或位于20日均线下方，且当前价已明确站上20日均线
  let wasNearOrBelowMa20Recently = false;
  for (let k = 1; k <= 6; k++) {
    const idx = n - 1 - k;
    if (idx < 20) continue;
    const maAtIdx = movingAverage(closesOldToNew.slice(0, idx + 1), 20);
    if (closesOldToNew[idx] <= maAtIdx * 1.01) {
      wasNearOrBelowMa20Recently = true;
      break;
    }
  }
  const crossedUp = wasNearOrBelowMa20Recently && last > ma20 * 1.01 && prev <= ma20Prev * 1.06;
  const isBullishAligned = ma5 > ma10 && ma10 > ma20;
  const distanceFromLowPct = baseLow > 0 ? ((last - baseLow) / baseLow) * 100 : 0;

  const recentVol = average(volumesOldToNew.slice(Math.max(0, n - 5)));
  const baseVol = average(volumesOldToNew.slice(Math.max(0, n - 30), Math.max(0, n - 5)));
  const volExpand = baseVol > 0 ? recentVol / baseVol : 1;

  const isConsolidatedBase = baseRangePct < 28; // 底部窄幅震荡
  const isBreakout = crossedUp && isConsolidatedBase && last > ma60 * 0.98 && volExpand > 1.05;

  let strength = 0;
  strength += isBullishAligned ? 30 : 0;
  strength += crossedUp ? 25 : 0;
  strength += isConsolidatedBase ? 20 : 0;
  strength += Math.min(15, Math.max(0, (volExpand - 1) * 30));
  strength += Math.min(10, Math.max(0, 10 - distanceFromLowPct / 4));
  strength = Math.max(0, Math.min(100, Math.round(strength)));

  const reasonParts: string[] = [];
  if (crossedUp) reasonParts.push("放量站上20日均线");
  if (isBullishAligned) reasonParts.push("均线呈多头排列");
  if (isConsolidatedBase) reasonParts.push(`底部窄幅盘整${Math.round(baseRangePct)}%`);
  if (volExpand > 1.05) reasonParts.push(`量能放大${round(volExpand, 2)}倍`);
  if (reasonParts.length === 0) reasonParts.push("暂未形成有效突破形态");

  return {
    isBreakout,
    isBullishAligned,
    distanceFromLowPct: round(distanceFromLowPct, 2),
    basePatternDays: lookback.length,
    strength,
    reason: reasonParts.join("，"),
  };
}

export interface MaSet {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
}

export function computeMaSet(closesOldToNew: number[]): MaSet {
  return {
    ma5: round(movingAverage(closesOldToNew, 5)),
    ma10: round(movingAverage(closesOldToNew, 10)),
    ma20: round(movingAverage(closesOldToNew, 20)),
    ma60: round(movingAverage(closesOldToNew, 60)),
  };
}

// 简单可复现的伪随机数生成器（基于字符串种子）
export function mulberry32(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomWalkStep(price: number, volatility: number, rng: () => number): number {
  // 布朗运动式微小随机游走，带轻微均值回归
  const drift = (rng() - 0.5) * 2 * volatility;
  const next = price * (1 + drift);
  return round(Math.max(next, price * 0.7), 3);
}
