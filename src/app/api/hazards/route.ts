import { feed } from "@/lib/api";
import { loadEonet, loadGdacs } from "@/lib/feeds/hazards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const what = searchParams.get("type") ?? "all";

  if (what === "volcanoes") {
    return feed(
      { source: "NASA EONET", key: "volcanoes", ttlMs: 600_000 },
      () => loadEonet("volcanoes"),
      { count: (v) => v.length },
    );
  }

  return feed(
    { source: "GDACS", key: "gdacs", ttlMs: 300_000 },
    loadGdacs,
    { count: (v) => v.events.length },
  );
}
