import { feed } from "@/lib/api";
import { loadMarkets } from "@/lib/feeds/markets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

export async function GET() {
  return feed(
    { source: "Yahoo Finance + CoinGecko", key: "markets", ttlMs: 90_000 },
    loadMarkets,
    { count: (v) => v.quotes.length },
  );
}
