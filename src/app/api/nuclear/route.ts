import { feed } from "@/lib/api";
import { loadNuclear } from "@/lib/feeds/intel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

export async function GET() {
  return feed(
    { source: "Wikidata", key: "nuclear", ttlMs: 604_800_000 },
    loadNuclear,
    { count: (v) => v.sites.length },
  );
}
