import { NextResponse } from "next/server";
import { serve } from "@/lib/cache";
import { fetchJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import airports from "@/data/airports.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Nominatim = { place_id: number; display_name: string; lat: string; lon: string; type: string; class: string; boundingbox?: string[] };

export async function GET(req: Request) {
  const rl = rateLimit(`search:${clientIp(req)}`, 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ ok: true, data: { results: [] } });

  const lower = q.toLowerCase();
  const airportHits = (airports as { id: string; iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number }[])
    .filter(
      (a) =>
        a.iata?.toLowerCase() === lower ||
        a.icao?.toLowerCase() === lower ||
        a.name.toLowerCase().includes(lower) ||
        a.city?.toLowerCase().includes(lower),
    )
    .slice(0, 10)
    .map((a) => ({
      id: `airport-${a.id}`,
      name: `${a.name}${a.iata ? ` (${a.iata})` : ""}`,
      detail: `${a.city}, ${a.country} · Airport`,
      lat: a.lat,
      lon: a.lon,
      kind: "airport",
    }));

  let places: { id: string; name: string; detail: string; lat: number; lon: number; kind: string }[] = [];
  try {
    const cached = await serve(`geocode:${lower}`, 3_600_000, "Nominatim", () =>
      fetchJson<Nominatim[]>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=0`,
        { timeout: 8000, headers: { "User-Agent": "OSIRIS/5.0 (open-source intelligence platform)" } },
      ),
    );
    places = cached.value.map((p) => ({
      id: `osm-${p.place_id}`,
      name: p.display_name.split(",").slice(0, 3).join(","),
      detail: p.display_name,
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      kind: p.type,
    }));
  } catch {
    /* geocoder is optional */
  }

  const exactAirport = (airports as { iata: string; icao: string }[]).some(
    (a) => a.iata?.toLowerCase() === lower || a.icao?.toLowerCase() === lower,
  );
  const results = exactAirport ? [...airportHits, ...places] : [...places, ...airportHits];

  return NextResponse.json({
    ok: true,
    data: { results: results.slice(0, 16) },
    meta: { source: "OSM Nominatim + OurAirports", fetchedAt: new Date().toISOString(), latencyMs: 0 },
  });
}
