import { feed } from "@/lib/api";
import { loadEarthquakes } from "@/lib/feeds/hazards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return feed(
    { source: "USGS", key: "earthquakes", ttlMs: 45_000 },
    loadEarthquakes,
    { count: (v) => v.quakes.length },
  );
}
