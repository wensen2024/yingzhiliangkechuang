import { CATEGORY_LABEL, DIMENSIONS, type DimensionCategory } from "@/lib/dimensions";

export const metadata = {
  title: "方法论与关于我们 | 中国AI科创100 · 科创板新股跟踪系统",
};

const CATEGORIES: DimensionCategory[] = ["macro", "financial", "technical", "industry"];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <section className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">About Us</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">关于盈指量杭州科技有限公司</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          盈指量杭州科技有限公司专注于人工智能与量化投研技术的融合创新，致力于打造代表中国科技产业未来方向的智能化研究工具。
          「中国AI科创100 · 科创板新股跟踪系统」是公司面向科创板与AI核心资产打造的产业研究与量化选股平台，
          汇集顶级产业研究员的行业洞察与资深交易员的技术面判研经验，构建了覆盖宏观、财务、技术、产业四大维度、共20项指标的深度评分体系，
          帮助投资者快速识别底部反转、成长确定性高的核心资产。
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-bold text-slate-900">20维度深度评分体系</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold text-indigo-600">{CATEGORY_LABEL[cat]}</h3>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-600">
                {DIMENSIONS.filter((d) => d.category === cat).map((d) => (
                  <li key={d.key}>{d.label}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-bold text-slate-900">「底部均线突破 + 高成长」选股逻辑</h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            1. <b>底部形态识别</b>：系统追溯每只股票过去20~50个交易日的价格区间，若波动幅度小于阈值，判定为有效底部盘整区域。
          </p>
          <p>
            2. <b>均线突破确认</b>：当最新收盘价从下方有效站上20日均线，且成交量较底部区间放大超过5%，视为突破信号触发。
          </p>
          <p>
            3. <b>趋势结构验证</b>：结合MA5/MA10/MA20是否呈多头排列、股价是否重新站上60日均线，评估趋势反转的稳固程度，生成0-100的突破强度分。
          </p>
          <p>
            4. <b>成长性交叉验证</b>：叠加营收增长、利润增长、研发投入强度、行业景气度、商业化落地进度五项成长维度评分，
            只有成长性评分达到68分以上的突破标的，才会进入「均线突破精选池」。
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-800">
        <p className="font-semibold">风险与数据说明</p>
        <p className="mt-1">
          本系统所有行情、财务与评分数据均由内置模拟行情引擎自动生成并周期性刷新，用于产品能力演示，不接入真实证券交易所行情数据，不构成任何投资建议。
          实际投资决策请以真实市场行情及权威信息披露为准，股市有风险，投资需谨慎。
        </p>
      </section>
    </main>
  );
}
