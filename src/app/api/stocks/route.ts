import { NextRequest } from "next/server";
import { getMarketSnapshot, isScreenerHit } from "@/lib/marketEngine";
import { toListItem } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all"; // all | index | newipo | screener
  const keyword = (searchParams.get("q") ?? "").trim().toLowerCase();
  const sector = searchParams.get("sector") ?? "";
  const sort = searchParams.get("sort") ?? "score";

  const snapshot = await getMarketSnapshot();

  let list = snapshot;
  if (filter === "index") list = list.filter((s) => s.stock.isIndexMember);
  if (filter === "newipo") list = list.filter((s) => s.stock.isNewIpo);
  if (filter === "screener") list = list.filter(isScreenerHit);

  if (sector) list = list.filter((s) => s.stock.sector === sector);
  if (keyword) {
    list = list.filter(
      (s) =>
        s.stock.name.toLowerCase().includes(keyword) ||
        s.stock.code.toLowerCase().includes(keyword) ||
        s.stock.sector.toLowerCase().includes(keyword),
    );
  }

  const sorters: Record<string, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
    score: (a, b) => b.overallScore - a.overallScore,
    growth: (a, b) => b.growthScore - a.growthScore,
    change: (a, b) => Number(b.quote.changePct) - Number(a.quote.changePct),
    marketCap: (a, b) => Number(b.stock.totalMarketCapYi) - Number(a.stock.totalMarketCapYi),
    breakout: (a, b) => b.breakout.strength - a.breakout.strength,
  };
  const sorter = sorters[sort] ?? sorters.score;
  list = [...list].sort(sorter);

  const sectors = Array.from(new Set(snapshot.map((s) => s.stock.sector))).sort();

  return Response.json({
    total: list.length,
    totalUniverse: snapshot.length,
    sectors,
    items: list.map(toListItem),
    serverTime: new Date().toISOString(),
  });
}
