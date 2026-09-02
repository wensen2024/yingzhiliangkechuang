"use client";

import { useMemo } from "react";
import type { KlinePoint } from "@/lib/types";

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isLive?: boolean;
}

interface Props {
  kline: KlinePoint[];
  livePrice: number;
  liveOpen: number;
  liveHigh: number;
  liveLow: number;
  liveVolumeLots: number;
  visibleCount?: number;
}

function maSeries(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    out.push(sum / period);
  }
  return out;
}

export default function KLineChart({ kline, livePrice, liveOpen, liveHigh, liveLow, liveVolumeLots, visibleCount = 60 }: Props) {
  const combined: Candle[] = useMemo(() => {
    const hist: Candle[] = kline.map((k) => ({ ...k }));
    hist.push({
      date: "实时",
      open: liveOpen,
      high: liveHigh,
      low: liveLow,
      close: livePrice,
      volume: Math.max(1, liveVolumeLots * 100),
      isLive: true,
    });
    return hist;
  }, [kline, livePrice, liveOpen, liveHigh, liveLow, liveVolumeLots]);

  const closes = combined.map((c) => c.close);
  const ma5Full = maSeries(closes, 5);
  const ma10Full = maSeries(closes, 10);
  const ma20Full = maSeries(closes, 20);
  const ma60Full = maSeries(closes, 60);

  const start = Math.max(0, combined.length - visibleCount);
  const view = combined.slice(start);
  const ma5 = ma5Full.slice(start);
  const ma10 = ma10Full.slice(start);
  const ma20 = ma20Full.slice(start);
  const ma60 = ma60Full.slice(start);

  const width = 900;
  const height = 320;
  const volHeight = 70;
  const padding = { top: 12, right: 12, bottom: 8, left: 4 };
  const chartHeight = height - volHeight - padding.top - padding.bottom;

  const highs = view.map((c) => c.high);
  const lows = view.map((c) => c.low);
  const maxPrice = Math.max(...highs, ...ma5.filter((v): v is number => v !== null), ...ma20.filter((v): v is number => v !== null));
  const minPrice = Math.min(...lows.filter((v) => v > 0));
  const priceRange = Math.max(maxPrice - minPrice, 0.01);

  const maxVol = Math.max(...view.map((c) => c.volume), 1);

  const slotWidth = (width - padding.left - padding.right) / view.length;
  const candleWidth = Math.max(2, slotWidth * 0.6);

  const xAt = (i: number) => padding.left + i * slotWidth + slotWidth / 2;
  const yAt = (price: number) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  const yVol = (vol: number) => height - (vol / maxVol) * (volHeight - 6);

  function linePath(series: (number | null)[]): string {
    let d = "";
    let started = false;
    series.forEach((v, i) => {
      if (v === null) return;
      const x = xAt(i);
      const y = yAt(v);
      d += started ? ` L ${x} ${y}` : `M ${x} ${y}`;
      started = true;
    });
    return d;
  }

  const lastLabelEvery = Math.max(1, Math.floor(view.length / 6));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[640px]" role="img" aria-label="K线图">
        {/* 网格 */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + chartHeight * p}
            y2={padding.top + chartHeight * p}
            stroke="#eef2f7"
            strokeWidth={1}
          />
        ))}

        {/* K线 */}
        {view.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? "#e11d48" : "#059669";
          const x = xAt(i);
          return (
            <g key={c.date + i} opacity={c.isLive ? 0.95 : 1}>
              <line x1={x} x2={x} y1={yAt(c.high)} y2={yAt(c.low)} stroke={color} strokeWidth={1} />
              <rect
                x={x - candleWidth / 2}
                y={yAt(Math.max(c.open, c.close))}
                width={candleWidth}
                height={Math.max(1, Math.abs(yAt(c.open) - yAt(c.close)))}
                fill={color}
                stroke={c.isLive ? "#0f172a" : "none"}
                strokeDasharray={c.isLive ? "2 2" : undefined}
                strokeWidth={c.isLive ? 1 : 0}
              />
            </g>
          );
        })}

        {/* 均线 */}
        <path d={linePath(ma5)} fill="none" stroke="#f59e0b" strokeWidth={1.4} />
        <path d={linePath(ma10)} fill="none" stroke="#8b5cf6" strokeWidth={1.4} />
        <path d={linePath(ma20)} fill="none" stroke="#0ea5e9" strokeWidth={1.6} />
        <path d={linePath(ma60)} fill="none" stroke="#334155" strokeWidth={1.4} />

        {/* 成交量 */}
        {view.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? "#fda4af" : "#6ee7b7";
          const x = xAt(i);
          return (
            <rect
              key={"v" + c.date + i}
              x={x - candleWidth / 2}
              y={yVol(c.volume)}
              width={candleWidth}
              height={height - yVol(c.volume)}
              fill={color}
            />
          );
        })}

        {/* X轴日期标签 */}
        {view.map((c, i) =>
          i % lastLabelEvery === 0 ? (
            <text key={"t" + i} x={xAt(i)} y={height - volHeight - 2} fontSize={9} fill="#94a3b8" textAnchor="middle">
              {c.isLive ? "实时" : c.date.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f59e0b]" />MA5</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />MA10</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0ea5e9]" />MA20</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#334155]" />MA60</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />上涨</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />下跌</span>
        <span className="flex items-center gap-1 rounded border border-slate-300 px-1">虚线 = 实时跳动价</span>
      </div>
    </div>
  );
}
