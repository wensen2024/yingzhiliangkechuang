import { getStockAnalyticsByCode } from "@/lib/marketEngine";
import { toDetail } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const item = await getStockAnalyticsByCode(code);

  if (!item) {
    return Response.json({ error: "股票不存在" }, { status: 404 });
  }

  return Response.json(toDetail(item));
}
