import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// 股票主表：中国AI科创100指数成分股 + 近期科创板新股
// ---------------------------------------------------------------------------
export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  market: varchar("market", { length: 20 }).notNull(), // 科创板 / 创业板 / 沪主板 / 深主板
  sector: varchar("sector", { length: 64 }).notNull(), // 细分行业
  concept: text("concept").notNull().default(""), // 概念标签，逗号分隔
  listedDate: date("listed_date").notNull(),
  isIndexMember: boolean("is_index_member").notNull().default(false), // 中国AI科创100成分股
  isNewIpo: boolean("is_new_ipo").notNull().default(false), // 近期新股
  description: text("description").notNull().default(""),
  totalMarketCapYi: numeric("total_market_cap_yi", { precision: 12, scale: 2 }).notNull().default("0"), // 亿元
  peRatio: numeric("pe_ratio", { precision: 10, scale: 2 }).notNull().default("0"),
  volatilityFactor: numeric("volatility_factor", { precision: 6, scale: 4 }).notNull().default("0.02"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;

// ---------------------------------------------------------------------------
// 实时行情快照（模拟盘中跳动的最新价）
// ---------------------------------------------------------------------------
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  stockId: integer("stock_id")
    .notNull()
    .unique()
    .references(() => stocks.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 12, scale: 3 }).notNull(),
  prevClose: numeric("prev_close", { precision: 12, scale: 3 }).notNull(),
  open: numeric("open", { precision: 12, scale: 3 }).notNull(),
  high: numeric("high", { precision: 12, scale: 3 }).notNull(),
  low: numeric("low", { precision: 12, scale: 3 }).notNull(),
  changePct: numeric("change_pct", { precision: 8, scale: 3 }).notNull().default("0"),
  volumeLots: numeric("volume_lots", { precision: 14, scale: 2 }).notNull().default("0"), // 成交量（手）
  amountWan: numeric("amount_wan", { precision: 14, scale: 2 }).notNull().default("0"), // 成交额（万元）
  turnoverRate: numeric("turnover_rate", { precision: 8, scale: 3 }).notNull().default("0"),
  ma5: numeric("ma5", { precision: 12, scale: 3 }).notNull().default("0"),
  ma10: numeric("ma10", { precision: 12, scale: 3 }).notNull().default("0"),
  ma20: numeric("ma20", { precision: 12, scale: 3 }).notNull().default("0"),
  ma60: numeric("ma60", { precision: 12, scale: 3 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;

// ---------------------------------------------------------------------------
// 日K线历史数据（用于绘制K线图与均线计算）
// ---------------------------------------------------------------------------
export const klines = pgTable(
  "klines",
  {
    id: serial("id").primaryKey(),
    stockId: integer("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    tradeDate: date("trade_date").notNull(),
    open: numeric("open", { precision: 12, scale: 3 }).notNull(),
    high: numeric("high", { precision: 12, scale: 3 }).notNull(),
    low: numeric("low", { precision: 12, scale: 3 }).notNull(),
    close: numeric("close", { precision: 12, scale: 3 }).notNull(),
    volume: numeric("volume", { precision: 14, scale: 2 }).notNull().default("0"),
  },
  (table) => [uniqueIndex("klines_stock_date_idx").on(table.stockId, table.tradeDate)],
);

export type Kline = typeof klines.$inferSelect;
export type NewKline = typeof klines.$inferInsert;

// ---------------------------------------------------------------------------
// 20维度深度评分：宏观面 / 财务面 / K线技术面 / 产业面 各5项
// ---------------------------------------------------------------------------
export const dimensionScores = pgTable(
  "dimension_scores",
  {
    id: serial("id").primaryKey(),
    stockId: integer("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 20 }).notNull(), // macro / financial / technical / industry
    dimensionKey: varchar("dimension_key", { length: 40 }).notNull(),
    label: varchar("label", { length: 40 }).notNull(),
    score: integer("score").notNull().default(50), // 0-100
    summary: text("summary").notNull().default(""),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("dimension_scores_stock_key_idx").on(table.stockId, table.dimensionKey)],
);

export type DimensionScore = typeof dimensionScores.$inferSelect;
export type NewDimensionScore = typeof dimensionScores.$inferInsert;

// ---------------------------------------------------------------------------
// 行情刷新元信息：控制"实时"模拟节奏，避免每次请求都重算
// ---------------------------------------------------------------------------
export const marketMeta = pgTable("market_meta", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 40 }).notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MarketMeta = typeof marketMeta.$inferSelect;
