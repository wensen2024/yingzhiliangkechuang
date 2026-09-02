import type { DimensionCategory } from "@/lib/dimensions";

export interface CategoryAverages {
  macro: number;
  financial: number;
  technical: number;
  industry: number;
}

export interface BreakoutInfo {
  isBreakout: boolean;
  isBullishAligned: boolean;
  distanceFromLowPct: number;
  basePatternDays: number;
  strength: number;
  reason: string;
}

export interface StockListItem {
  code: string;
  name: string;
  market: string;
  sector: string;
  concept: string;
  isIndexMember: boolean;
  isNewIpo: boolean;
  listedDate: string;
  marketCapYi: number;
  peRatio: number;
  price: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volumeLots: number;
  amountWan: number;
  turnoverRate: number;
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  overallScore: number;
  growthScore: number;
  categoryAverages: CategoryAverages;
  breakout: BreakoutInfo;
  isScreenerHit: boolean;
  updatedAt: string;
}

export interface StockListResponse {
  total: number;
  totalUniverse: number;
  sectors: string[];
  items: StockListItem[];
  serverTime: string;
}

export interface DimensionItem {
  category: DimensionCategory;
  key: string;
  label: string;
  score: number;
  summary: string;
}

export interface KlinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockDetailResponse {
  stock: {
    code: string;
    name: string;
    market: string;
    sector: string;
    concept: string[];
    isIndexMember: boolean;
    isNewIpo: boolean;
    listedDate: string;
    description: string;
    marketCapYi: number;
    peRatio: number;
  };
  quote: {
    price: number;
    changePct: number;
    open: number;
    high: number;
    low: number;
    prevClose: number;
    volumeLots: number;
    amountWan: number;
    turnoverRate: number;
    ma5: number;
    ma10: number;
    ma20: number;
    ma60: number;
    updatedAt: string;
  };
  kline: KlinePoint[];
  dimensions: DimensionItem[];
  categoryAverages: CategoryAverages;
  overallScore: number;
  growthScore: number;
  breakout: BreakoutInfo;
  isScreenerHit: boolean;
  serverTime: string;
}
