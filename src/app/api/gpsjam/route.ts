import { feed } from "@/lib/api";
import { loadGpsJam } from "@/lib/feeds/intel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

export async function GET() {
  return feed(
    { source: "gpsjam.org", key: "gpsjam", ttlMs: 900_000 },
    loadGpsJam,
    { count: (v) => v.cells.length, note: "H3 cells with elevated ADS-B navigation degradation" },
  );
}
