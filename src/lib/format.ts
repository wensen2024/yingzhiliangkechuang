export function formatPrice(n: number): string {
  return n.toFixed(2);
}

export function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function changeColorClass(n: number): string {
  if (n > 0) return "text-rose-600";
  if (n < 0) return "text-emerald-600";
  return "text-slate-500";
}

export function changeBgClass(n: number): string {
  if (n > 0) return "bg-rose-50 text-rose-600 border-rose-200";
  if (n < 0) return "bg-emerald-50 text-emerald-600 border-emerald-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

export function formatWan(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(2)}亿`;
  return `${n.toFixed(0)}万`;
}

export function formatMarketCap(yi: number): string {
  if (yi >= 10000) return `${(yi / 10000).toFixed(2)}万亿`;
  return `${yi.toFixed(1)}亿`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-rose-600";
  if (score >= 65) return "text-amber-600";
  if (score >= 50) return "text-slate-600";
  return "text-slate-400";
}

export function scoreBarColor(score: number): string {
  if (score >= 80) return "bg-rose-500";
  if (score >= 65) return "bg-amber-500";
  if (score >= 50) return "bg-sky-500";
  return "bg-slate-400";
}
