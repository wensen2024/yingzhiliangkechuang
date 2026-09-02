"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { changeBgClass, formatMarketCap, formatPct, formatPrice, formatWan, scoreColor } from "@/lib/format";
import type { StockListItem, StockListResponse } from "@/lib/types";

type FilterKey = "all" | "index" | "newipo" | "screener";

const FILTER_TABS: { key: FilterKey; label: string; hint: string }[] = [
  { key: "all", label: "全部跟踪池", hint: "指数成分股 + 科创新股" },
  { key: "index", label: "AI科创100成分股", hint: "指数样本代表股" },
  { key: "newipo", label: "科创板新股", hint: "近期上市次新股" },
  { key: "screener", label: "均线突破精选", hint: "底部突破 · 高成长" },
];

const SORT_OPTIONS = [
  { key: "score", label: "综合评分优先" },
  { key: "growth", label: "成长性优先" },
  { key: "breakout", label: "突破强度优先" },
  { key: "change", label: "今日涨幅优先" },
  { key: "marketCap", label: "总市值优先" },
];

interface Props {
  initialData: StockListResponse;
  initialFilter?: FilterKey;
}

export default function Dashboard({ initialData, initialFilter = "all" }: Props) {
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [sector, setSector] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("score");
  const [data, setData] = useState<StockListResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({});
  const prevPrices = useRef<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (sector) params.set("sector", sector);
    if (keyword) params.set("q", keyword);
    if (sort) params.set("sort", sort);

    try {
      const res = await fetch(`/api/stocks?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const json: StockListResponse = await res.json();

      const nextFlash: Record<string, "up" | "down"> = {};
      json.items.forEach((item) => {
        const prev = prevPrices.current[item.code];
        if (prev !== undefined && prev !== item.price) {
          nextFlash[item.code] = item.price > prev ? "up" : "down";
        }
        prevPrices.current[item.code] = item.price;
      });
      setFlashMap(nextFlash);
      setData(json);
    } catch {
      // 静默失败，保留上次数据
    }
  }, [filter, sector, keyword, sort]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const kpis = useMemo(() => {
    const items = data.items;
    const up = items.filter((i) => i.changePct > 0).length;
    const down = items.filter((i) => i.changePct < 0).length;
    const breakoutCount = items.filter((i) => i.breakout.isBreakout).length;
    const avgScore = items.length ? items.reduce((a, b) => a + b.overallScore, 0) / items.length : 0;
    return { up, down, breakoutCount, avgScore, total: items.length };
  }, [data]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="当前跟踪池" value={`${kpis.total}`} sub={`样本总数 ${data.totalUniverse}`} />
        <KpiCard label="上涨家数" value={`${kpis.up}`} sub="今日实时统计" tone="up" />
        <KpiCard label="下跌家数" value={`${kpis.down}`} sub="今日实时统计" tone="down" />
        <KpiCard label="底部均线突破" value={`${kpis.breakoutCount}`} sub="满足突破形态家数" tone="highlight" />
        <KpiCard label="平均综合评分" value={kpis.avgScore.toFixed(1)} sub="20维度均值" />
      </section>

      <section className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-xl border px-4 py-2 text-left text-sm transition ${
              filter === tab.key
                ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <span className="block font-semibold">{tab.label}</span>
            <span className={`block text-[11px] ${filter === tab.key ? "text-indigo-100" : "text-slate-400"}`}>{tab.hint}</span>
          </button>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索代码 / 名称 / 行业，如 688981 或 寒武纪"
          className="w-64 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        >
          <option value="">全部行业</option>
          {data.sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-400">
          {loading ? "刷新中…" : `已加载 ${data.items.length} 只 · 服务器时间 ${new Date(data.serverTime).toLocaleTimeString("zh-CN")}`}
        </span>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
              <th className="px-3 py-2.5 font-medium">代码/名称</th>
              <th className="px-3 py-2.5 font-medium">板块/行业</th>
              <th className="px-3 py-2.5 font-medium text-right">最新价</th>
              <th className="px-3 py-2.5 font-medium text-right">涨跌幅</th>
              <th className="px-3 py-2.5 font-medium text-right">MA20/MA60</th>
              <th className="px-3 py-2.5 font-medium text-right">成交额</th>
              <th className="px-3 py-2.5 font-medium text-right">总市值</th>
              <th className="px-3 py-2.5 font-medium text-center">综合评分</th>
              <th className="px-3 py-2.5 font-medium text-center">成长性</th>
              <th className="px-3 py-2.5 font-medium">均线突破信号</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <StockRow key={item.code} item={item} flash={flashMap[item.code]} />
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-sm text-slate-400">
                  没有符合条件的股票
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "up" | "down" | "highlight" }) {
  const toneClass = tone === "up" ? "text-rose-600" : tone === "down" ? "text-emerald-600" : tone === "highlight" ? "text-indigo-600" : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function StockRow({ item, flash }: { item: StockListItem; flash?: "up" | "down" }) {
  const flashClass = flash === "up" ? "bg-rose-50/70" : flash === "down" ? "bg-emerald-50/70" : "";
  return (
    <tr className={`border-b border-slate-50 transition-colors duration-500 last:border-0 hover:bg-slate-50 ${flashClass}`}>
      <td className="px-3 py-2.5">
        <Link href={`/stocks/${item.code}`} className="block">
          <span className="font-semibold text-slate-900">{item.name}</span>
          <span className="ml-1.5 text-xs text-slate-400">{item.code}</span>
          <span className="mt-0.5 flex gap-1">
            {item.isIndexMember && <Tag color="indigo">指数成分</Tag>}
            {item.isNewIpo && <Tag color="amber">新股</Tag>}
          </span>
        </Link>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500">
        <div>{item.market}</div>
        <div className="text-slate-400">{item.sector}</div>
      </td>
      <td className="px-3 py-2.5 text-right font-mono font-semibold">{formatPrice(item.price)}</td>
      <td className="px-3 py-2.5 text-right">
        <span className={`inline-block rounded-md border px-1.5 py-0.5 font-mono text-xs font-semibold ${changeBgClass(item.changePct)}`}>
          {formatPct(item.changePct)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500">
        {formatPrice(item.ma20)} / {formatPrice(item.ma60)}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-slate-500">{formatWan(item.amountWan)}</td>
      <td className="px-3 py-2.5 text-right text-xs text-slate-500">{formatMarketCap(item.marketCapYi)}</td>
      <td className="px-3 py-2.5 text-center">
        <span className={`font-bold ${scoreColor(item.overallScore)}`}>{item.overallScore.toFixed(0)}</span>
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className={`font-bold ${scoreColor(item.growthScore)}`}>{item.growthScore.toFixed(0)}</span>
      </td>
      <td className="px-3 py-2.5">
        {item.breakout.isBreakout ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
            ▲ 突破中 · 强度{item.breakout.strength}
          </span>
        ) : (
          <span className="text-xs text-slate-300">观察中</span>
        )}
      </td>
    </tr>
  );
}

function Tag({ color, children }: { color: "indigo" | "amber"; children: ReactNode }) {
  const cls = color === "indigo" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600";
  return <span className={`rounded px-1 py-0 text-[10px] font-medium ${cls}`}>{children}</span>;
}
