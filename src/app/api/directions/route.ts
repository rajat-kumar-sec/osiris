import { NextResponse } from "next/server";
import { serve } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OsrmRoute = {
  geometry: { coordinates: [number, number][] };
  distance: number;
  duration: number;
  legs: { steps: { maneuver: { type: string; modifier?: string; location: [number, number] }; name: string; distance: number }[] }[];
};

export async function GET(req: Request) {
  const rl = rateLimit(`route:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")?.split(",").map(Number);
  const to = searchParams.get("to")?.split(",").map(Number);
  const mode = searchParams.get("mode") === "straight" ? "driving" : searchParams.get("mode") ?? "driving";

  if (!from || !to || from.length !== 2 || to.length !== 2 || from.some((n) => !Number.isFinite(n)) || to.some((n) => !Number.isFinite(n))) {
    return NextResponse.json({ ok: false, error: "from and to must be lat,lon pairs" }, { status: 400 });
  }

  try {
    const cached = await serve(`route:${from.join(",")}:${to.join(",")}:${mode}`, 300_000, "OSRM", () =>
      fetchJson<{ routes: OsrmRoute[]; code: string }>(
        `https://router.project-osrm.org/route/v1/${mode}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`,
        { timeout: 12000 },
      ),
    );
    const route = cached.value.routes?.[0];
    if (!route) throw new Error("no route found");
    return NextResponse.json({
      ok: true,
      data: {
        coordinates: route.geometry.coordinates,
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        steps: route.legs.flatMap((l) => l.steps.map((s) => ({
          instruction: [s.maneuver.type, s.maneuver.modifier].filter(Boolean).join(" "),
          road: s.name,
          distanceM: s.distance,
        }))).slice(0, 40),
      },
      meta: { source: "OSRM", fetchedAt: new Date().toISOString(), latencyMs: 0 },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "routing failed" }, { status: 502 });
  }
}
