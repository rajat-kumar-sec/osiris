import { feed } from "@/lib/api";
import { loadWildfires } from "@/lib/feeds/hazards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return feed(
    { source: "NASA FIRMS / EONET", key: "fires", ttlMs: 300_000 },
    loadWildfires,
    { count: (v) => v.fires.length },
  );
}
