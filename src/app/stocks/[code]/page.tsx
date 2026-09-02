import { notFound } from "next/navigation";
import { getStockAnalyticsByCode } from "@/lib/marketEngine";
import { toDetail } from "@/lib/serialize";
import StockDetailClient from "@/components/StockDetailClient";

export const dynamic = "force-dynamic";

export default async function StockDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const item = await getStockAnalyticsByCode(code);

  if (!item) {
    notFound();
  }

  return <StockDetailClient code={code} initialData={toDetail(item)} />;
}
