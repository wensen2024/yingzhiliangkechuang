import { NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, stocks } from "@/db/schema";
import { eq } from "drizzle-orm";

// 东方财富API获取行情数据
async function fetchEastMoneyData(secids: string) {
  const url = `http://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f12,f13,f14,f2,f3,f4,f15,f16,f17,f18,f8,f9,f10,f20&secids=${secids}`;
  try {
    const response = await fetch(url);
    const result = await response.json();
    return result?.data?.diff || [];
  } catch (error) {
    console.error("Fetch EastMoney failed:", error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const allStocks = await db.select().from(stocks);
    
    // 构造东方财富secids (1.上交所, 0.深交所)
    const secidsMap = allStocks.map(s => {
       const prefix = (s.market === '科创板' || s.market === '沪主板') ? '1.' : '0.';
       return `${prefix}${s.code}`;
    });
    
    // 分批请求，避免单次URL过长
    const batchSize = 40;
    for (let i = 0; i < secidsMap.length; i += batchSize) {
        const batch = secidsMap.slice(i, i + batchSize);
        const secidsStr = batch.join(',');
        
        const marketData = await fetchEastMoneyData(secidsStr);
        
        for (const data of marketData) {
            const stockCode = data.f12; // 代码
            const stock = allStocks.find(s => s.code === stockCode);
            if (!stock) continue;
            
            // f2: 最新价, f15: 最高, f16: 最低, f17: 开盘, f18: 昨收, f3: 涨跌幅, f8: 成交量, f9: 成交额
            // 东方财富的数据如果是 '-' 表示停牌或无数据，这里需要处理一下
            // 注意东方财富返回的价格通常是真实价格（非放大100倍），有些特殊字段可能例外，根据实际接口情况调整
            const price = Number(data.f2) === Number(data.f2) ? Number(data.f2) : 0; 
            const high = Number(data.f15) === Number(data.f15) ? Number(data.f15) : 0;
            const low = Number(data.f16) === Number(data.f16) ? Number(data.f16) : 0;
            const open = Number(data.f17) === Number(data.f17) ? Number(data.f17) : 0;
            const prevClose = Number(data.f18) === Number(data.f18) ? Number(data.f18) : 0;
            const changePct = Number(data.f3) === Number(data.f3) ? Number(data.f3) : 0; 
            const volumeLots = Number(data.f8) === Number(data.f8) ? Number(data.f8) : 0;
            const amountWan = Number(data.f9) === Number(data.f9) ? Number(data.f9) / 10000 : 0;

            if (price > 0) {
               await db.update(quotes).set({
                 price: price.toString(),
                 high: high.toString(),
                 low: low.toString(),
                 open: open.toString(),
                 prevClose: prevClose.toString(),
                 changePct: changePct.toString(),
                 volumeLots: volumeLots.toString(),
                 amountWan: amountWan.toString(),
                 updatedAt: new Date(),
               }).where(eq(quotes.stockId, stock.id));
            }
        }
    }
    
    return NextResponse.json({ success: true, message: "Quotes updated" });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
