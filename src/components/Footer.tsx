export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 text-xs leading-relaxed text-slate-400 sm:px-6">
        <p className="mb-1 font-semibold text-slate-500">中国AI科创100 · 科创板新股跟踪系统</p>
        <p>
          本系统由 <span className="font-medium text-slate-500">盈指量杭州科技有限公司</span> 设计出品，围绕中国AI科创100指数成分股与近期科创板新股，
          从宏观面、财务面、K线技术面、产业面等20个维度进行深度量化跟踪，自动识别"底部均线突破且成长性高"的潜力标的。
        </p>
        <p className="mt-2">
          风险提示：本系统展示的行情、财务及评分数据均由内置模拟行情引擎生成，用于产品能力演示，不接入真实交易所行情，不构成任何投资建议。
          股市有风险，投资需谨慎。
        </p>
        <p className="mt-3 text-slate-300">© {new Date().getFullYear()} 盈指量杭州科技有限公司 YingZhiLiang Hangzhou Technology Co., Ltd. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
