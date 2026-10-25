import { feed } from "@/lib/api";
import { loadFlights, loadGlobalFlights } from "@/lib/feeds/aviation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const lat = Number(searchParams.get("lat") ?? 20);
  const lon = Number(searchParams.get("lon") ?? 0);
  const radius = Number(searchParams.get("radius") ?? 180);
  const limit = Number(searchParams.get("limit") ?? 900);

  if (mode === "global") {
    return feed(
      { source: "adsb.lol", key: "flights:global", ttlMs: 12_000 },
      () => loadGlobalFlights(2200),
      { count: (v) => v.aircraft.length, note: "Global multi-region ADS-B snapshot" },
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return feed(
      { source: "adsb.lol", key: "flights:invalid", ttlMs: 1000 },
      async () => ({ aircraft: [], total: 0, source: "none" }),
    );
  }

  const key = `flights:${lat.toFixed(1)}:${lon.toFixed(1)}:${Math.round(radius)}`;

  return feed(
    { source: "adsb.lol / OpenSky", key, ttlMs: 9_000 },
    () => loadFlights(lat, lon, radius, Math.min(1500, limit)),
    { count: (v) => v.aircraft.length, note: "Live ADS-B positions around the map viewport" },
  );
}
