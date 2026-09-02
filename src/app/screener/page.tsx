import { getMarketSnapshot, isScreenerHit } from "@/lib/marketEngine";
import { toListItem } from "@/lib/serialize";
import Dashboard from "@/components/Dashboard";
import type { StockListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  const snapshot = await getMarketSnapshot();
  const hits = snapshot.filter(isScreenerHit).sort((a, b) => b.breakout.strength - a.breakout.strength);
  const sectors = Array.from(new Set(snapshot.map((s) => s.stock.sector))).sort();

  const initialData: StockListResponse = {
    total: hits.length,
    totalUniverse: snapshot.length,
    sectors,
    items: hits.map(toListItem),
    serverTime: new Date().toISOString(),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="mb-8 rounded-3xl border border-indigo-100 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">底部均线突破 · 高成长筛选模型</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">均线突破精选池</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
          系统在全部跟踪样本中，实时计算每只股票的均线结构、底部形态与量能变化，并结合财务成长与产业景气度评分，自动筛选出同时满足下列条件的标的：
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RuleCard title="① 底部盘整" desc="过去20~50个交易日价格在低位窄幅震荡（波动区间 < 28%），形成有效底部。" />
          <RuleCard title="② 放量突破MA20" desc="最新收盘价从下方有效突破20日均线，且伴随成交量较底部区间明显放大。" />
          <RuleCard title="③ 均线多头排列" desc="MA5 > MA10 > MA20，且股价站上60日均线，趋势结构转强。" />
          <RuleCard title="④ 成长性评分 ≥ 68" desc="营收/利润增速、研发强度、行业景气度与商业化进度综合成长评分达标。" />
        </div>
      </section>

      <Dashboard initialData={initialData} initialFilter="screener" />
    </main>
  );
}

function RuleCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
      <p className="text-sm font-semibold text-indigo-600">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
    </div>
  );
}
