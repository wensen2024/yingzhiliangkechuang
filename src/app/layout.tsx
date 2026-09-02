import type { Metadata } from "next";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "中国AI科创100 · 科创板新股跟踪系统 | 盈指量杭州科技",
  description:
    "盈指量杭州科技有限公司出品：聚焦中国AI科创100指数成分股与近期科创板新股，20个维度深度跟踪宏观、财务、K线技术面与产业面，智能筛选底部均线突破且成长性高的潜力股票。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
