import Link from "next/link";
import LiveClock from "./LiveClock";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-bold text-white shadow-sm">
              盈
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-slate-900">中国AI科创100 · 科创板新股跟踪系统</span>
              <span className="block text-[11px] text-slate-400">盈指量杭州科技有限公司 出品 · AI Sci-Tech Tracker</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 md:flex">
            <Link href="/" className="hover:text-indigo-600">仪表盘</Link>
            <Link href="/?filter=index" className="hover:text-indigo-600">指数成分股</Link>
            <Link href="/?filter=newipo" className="hover:text-indigo-600">科创板新股</Link>
            <Link href="/screener" className="hover:text-indigo-600">均线突破精选</Link>
            <Link href="/about" className="hover:text-indigo-600">方法论</Link>
          </nav>
          <LiveClock />
        </div>
      </div>
    </header>
  );
}
