import { feed } from "@/lib/api";
import { loadIss, loadSatellites, SAT_GROUPS, type SatGroupId } from "@/lib/feeds/space";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const group = (searchParams.get("group") ?? "stations") as SatGroupId;
  const mode = searchParams.get("mode");

  if (mode === "iss") {
    return feed({ source: "CelesTrak", key: "iss", ttlMs: 15_000 }, loadIss, { count: (v) => v.all.length });
  }

  const valid = Object.keys(SAT_GROUPS).includes(group) ? group : "stations";
  return feed(
    { source: "CelesTrak GP", key: `sats:${valid}`, ttlMs: 60_000 },
    () => loadSatellites(valid),
    { count: (v) => v.satellites.length },
  );
}
