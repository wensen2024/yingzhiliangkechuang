"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import KLineChart from "@/components/KLineChart";
import DimensionPanel from "@/components/DimensionPanel";
import { changeBgClass, formatMarketCap, formatPct, formatPrice, formatWan, scoreColor } from "@/lib/format";
import type { StockDetailResponse } from "@/lib/types";

export default function StockDetailClient({ code, initialData }: { code: string; initialData: StockDetailResponse }) {
  const [data, setData] = useState<StockDetailResponse>(initialData);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/stocks/${code}`, { cache: "no-store" });
        if (!res.ok) return;
        const json: StockDetailResponse = await res.json();
        setData(json);
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [code]);

  const { stock, quote, breakout } = data;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/" className="mb-4 inline-block text-xs text-indigo-500 hover:underline">
        ← 返回跟踪系统首页
      </Link>

      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{stock.name}</h1>
            <span className="text-sm text-slate-400">{stock.code}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{stock.market}</span>
            {stock.isIndexMember && <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">AI科创100成分股</span>}
            {stock.isNewIpo && <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">科创板新股</span>}
            {data.isScreenerHit && (
              <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">★ 底部均线突破 · 高成长精选</span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {stock.sector} · {stock.concept.join(" / ")} · 上市日期 {stock.listedDate}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{stock.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="font-mono text-4xl font-bold text-slate-900">{formatPrice(quote.price)}</span>
          <span className={`mt-1 inline-block rounded-md border px-2 py-0.5 font-mono text-sm font-semibold ${changeBgClass(quote.changePct)}`}>
            {formatPct(quote.changePct)}
          </span>
          <span className="mt-1 text-[11px] text-slate-400">更新于 {new Date(quote.updatedAt).toLocaleTimeString("zh-CN")}</span>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <InfoCell label="今开" value={formatPrice(quote.open)} />
        <InfoCell label="最高" value={formatPrice(quote.high)} />
        <InfoCell label="最低" value={formatPrice(quote.low)} />
        <InfoCell label="昨收" value={formatPrice(quote.prevClose)} />
        <InfoCell label="成交额" value={formatWan(quote.amountWan)} />
        <InfoCell label="换手率" value={`${quote.turnoverRate.toFixed(2)}%`} />
        <InfoCell label="总市值" value={formatMarketCap(stock.marketCapYi)} />
        <InfoCell label="市盈率(TTM)" value={stock.peRatio > 0 ? stock.peRatio.toFixed(1) : "—"} />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">K线技术面 · 日线 + 均线系统</h2>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>MA5 {formatPrice(quote.ma5)}</span>
            <span>MA10 {formatPrice(quote.ma10)}</span>
            <span>MA20 {formatPrice(quote.ma20)}</span>
            <span>MA60 {formatPrice(quote.ma60)}</span>
          </div>
        </div>
        <KLineChart
          kline={data.kline}
          livePrice={quote.price}
          liveOpen={quote.open}
          liveHigh={quote.high}
          liveLow={quote.low}
          liveVolumeLots={quote.volumeLots}
        />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">底部均线突破信号研判</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <BreakoutCell label="突破状态" value={breakout.isBreakout ? "已触发突破" : "尚未触发"} highlight={breakout.isBreakout} />
          <BreakoutCell label="突破强度" value={`${breakout.strength} / 100`} />
          <BreakoutCell label="均线排列" value={breakout.isBullishAligned ? "多头排列" : "排列偏弱"} highlight={breakout.isBullishAligned} />
          <BreakoutCell label="距60日低点涨幅" value={`${breakout.distanceFromLowPct}%`} />
        </div>
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{breakout.reason}</p>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">20维度深度评分体系</h2>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>
              综合评分 <b className={scoreColor(data.overallScore)}>{data.overallScore.toFixed(0)}</b>
            </span>
            <span>
              成长性评分 <b className={scoreColor(data.growthScore)}>{data.growthScore.toFixed(0)}</b>
            </span>
          </div>
        </div>
        <DimensionPanel dimensions={data.dimensions} categoryAverages={data.categoryAverages} />
      </section>
    </main>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function BreakoutCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${highlight ? "text-indigo-600" : "text-slate-700"}`}>{value}</p>
    </div>
  );
}
