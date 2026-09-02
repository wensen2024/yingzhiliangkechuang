"use client";

import { CATEGORY_COLOR, CATEGORY_LABEL, type DimensionCategory } from "@/lib/dimensions";
import { scoreBarColor, scoreColor } from "@/lib/format";
import type { CategoryAverages, DimensionItem } from "@/lib/types";

interface Props {
  dimensions: DimensionItem[];
  categoryAverages: CategoryAverages;
}

const CATEGORIES: DimensionCategory[] = ["macro", "financial", "technical", "industry"];

function RadarChart({ categoryAverages }: { categoryAverages: CategoryAverages }) {
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 30;
  const axes = CATEGORIES;
  const angleFor = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;

  const points = axes
    .map((cat, i) => {
      const value = categoryAverages[cat] ?? 0;
      const r = (value / 100) * radius;
      const x = center + r * Math.cos(angleFor(i));
      const y = center + r * Math.sin(angleFor(i));
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[240px]">
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <polygon
          key={p}
          points={axes
            .map((_, i) => {
              const x = center + radius * p * Math.cos(angleFor(i));
              const y = center + radius * p * Math.sin(angleFor(i));
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}
      {axes.map((cat, i) => {
        const x = center + radius * Math.cos(angleFor(i));
        const y = center + radius * Math.sin(angleFor(i));
        const lx = center + (radius + 18) * Math.cos(angleFor(i));
        const ly = center + (radius + 18) * Math.sin(angleFor(i));
        return (
          <g key={cat}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={lx} y={ly} fontSize={11} fill="#475569" textAnchor="middle" dominantBaseline="middle">
              {CATEGORY_LABEL[cat]}
            </text>
          </g>
        );
      })}
      <polygon points={points} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth={2} />
    </svg>
  );
}

export default function DimensionPanel({ dimensions, categoryAverages }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">四大维度综合雷达</h3>
        <RadarChart categoryAverages={categoryAverages} />
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[cat] }} />
                {CATEGORY_LABEL[cat]}
              </span>
              <span className={`font-semibold ${scoreColor(categoryAverages[cat] ?? 0)}`}>{(categoryAverages[cat] ?? 0).toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">20维度深度评分明细</h3>
        <div className="space-y-4">
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[cat] }} />
                {CATEGORY_LABEL[cat]}
              </div>
              <div className="space-y-1.5">
                {dimensions
                  .filter((d) => d.category === cat)
                  .map((d) => (
                    <div key={d.key} className="group relative">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-36 shrink-0 truncate text-slate-600" title={d.label}>{d.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${scoreBarColor(d.score)}`} style={{ width: `${d.score}%` }} />
                        </div>
                        <span className={`w-8 shrink-0 text-right font-semibold ${scoreColor(d.score)}`}>{d.score}</span>
                      </div>
                      <p className="mt-0.5 pl-[9.5rem] text-[11px] leading-4 text-slate-400">{d.summary}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
