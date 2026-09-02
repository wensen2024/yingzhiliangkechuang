// 20维度深度评分体系定义：宏观面 / 财务面 / K线技术面 / 产业面 各5项

export type DimensionCategory = "macro" | "financial" | "technical" | "industry";

export interface DimensionDef {
  key: string;
  label: string;
  category: DimensionCategory;
}

export const CATEGORY_LABEL: Record<DimensionCategory, string> = {
  macro: "宏观面",
  financial: "财务面",
  technical: "K线技术面",
  industry: "产业面",
};

export const CATEGORY_COLOR: Record<DimensionCategory, string> = {
  macro: "#6366f1",
  financial: "#0ea5e9",
  technical: "#f59e0b",
  industry: "#10b981",
};

export const DIMENSIONS: DimensionDef[] = [
  // 宏观面 5
  { key: "macro_cycle", label: "宏观经济周期敏感度", category: "macro" },
  { key: "macro_policy", label: "产业政策支持力度", category: "macro" },
  { key: "macro_localization", label: "国产替代受益程度", category: "macro" },
  { key: "macro_liquidity", label: "利率与流动性环境", category: "macro" },
  { key: "macro_geopolitics", label: "地缘政治与出口管制风险抵御力", category: "macro" },
  // 财务面 5
  { key: "fin_revenue_growth", label: "营收增长率", category: "financial" },
  { key: "fin_profit_growth", label: "净利润增长率", category: "financial" },
  { key: "fin_gross_margin", label: "毛利率水平", category: "financial" },
  { key: "fin_rd_intensity", label: "研发投入强度", category: "financial" },
  { key: "fin_cashflow", label: "现金流健康度", category: "financial" },
  // K线技术面 5
  { key: "tech_ma_alignment", label: "均线多头排列强度", category: "technical" },
  { key: "tech_volume_price", label: "量价配合度", category: "technical" },
  { key: "tech_base_pattern", label: "底部形态完整度", category: "technical" },
  { key: "tech_relative_strength", label: "相对强弱RS排名", category: "technical" },
  { key: "tech_chip_stability", label: "波动率与筹码稳定性", category: "technical" },
  // 产业面 5
  { key: "ind_prosperity", label: "行业景气度", category: "industry" },
  { key: "ind_moat", label: "技术壁垒与护城河", category: "industry" },
  { key: "ind_customer", label: "客户集中度与订单可见性", category: "industry" },
  { key: "ind_market_share", label: "市场份额与竞争地位", category: "industry" },
  { key: "ind_commercialization", label: "商业化落地进度", category: "industry" },
];

export const GROWTH_DIMENSION_KEYS = [
  "fin_revenue_growth",
  "fin_profit_growth",
  "fin_rd_intensity",
  "ind_prosperity",
  "ind_commercialization",
];
