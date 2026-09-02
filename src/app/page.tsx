import { getMarketSnapshot, isScreenerHit } from "@/lib/marketEngine";
import { toListItem } from "@/lib/serialize";
import Dashboard from "@/components/Dashboard";
import type { StockListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type FilterKey = "all" | "index" | "newipo" | "screener";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const filterParam = (sp.filter as FilterKey) ?? "all";
  const initialFilter: FilterKey = ["all", "index", "newipo", "screener"].includes(filterParam) ? filterParam : "all";

  const snapshot = await getMarketSnapshot();
  let list = snapshot;
  if (initialFilter === "index") list = list.filter((s) => s.stock.isIndexMember);
  if (initialFilter === "newipo") list = list.filter((s) => s.stock.isNewIpo);
  if (initialFilter === "screener") list = list.filter(isScreenerHit);

  list = [...list].sort((a, b) => b.overallScore - a.overallScore);
  const sectors = Array.from(new Set(snapshot.map((s) => s.stock.sector))).sort();

  const initialData: StockListResponse = {
    total: list.length,
    totalUniverse: snapshot.length,
    sectors,
    items: list.map(toListItem),
    serverTime: new Date().toISOString(),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-10 text-white sm:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-300">AI SCI-TECH 100 · STAR MARKET IPO TRACKER</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(1.6rem,3.2vw,2.6rem)] font-bold leading-tight">
          代表中国未来的100家公司 <br className="hidden sm:block" />
          中国AI科创100成分股 × 科创板新股 全景跟踪
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-indigo-100/80">
          由产业研究团队与量化策略引擎共同驱动，覆盖宏观面、财务面、K线技术面、产业面等 <b className="text-white">20个深度维度</b>，
          实时监测行情与均线结构，自动圈定「底部均线突破 + 高成长性」的核心观察池。
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-indigo-100/70">
          <span className="rounded-full border border-white/20 px-3 py-1">100+ 样本股票池</span>
          <span className="rounded-full border border-white/20 px-3 py-1">20维度量化评分</span>
          <span className="rounded-full border border-white/20 px-3 py-1">分钟级模拟行情刷新</span>
          <span className="rounded-full border border-white/20 px-3 py-1">底部突破智能选股</span>
        </div>
      </section>

      <Dashboard initialData={initialData} initialFilter={initialFilter} />
    </main>
  );
}
