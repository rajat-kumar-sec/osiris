import { fetchJson, num } from "../http";
import type { Aircraft } from "../types";

type AdsbAc = Record<string, unknown>;

type AdsbResponse = { ac?: AdsbAc[]; total?: number; now?: number };

function parseAdsb(ac: AdsbAc[]): Aircraft[] {
  const out: Aircraft[] = [];
  for (const a of ac) {
    const lat = num(a.lat, NaN);
    const lon = num(a.lon, NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const alt = num(a.alt_baro ?? a.alt_geom, 0);
    out.push({
      id: String(a.hex ?? `${lat},${lon}`),
      callsign: String(a.flight ?? "").trim() || String(a.r ?? "").trim() || "UNKNOWN",
      registration: a.r ? String(a.r) : undefined,
      type: a.t ? String(a.t) : undefined,
      lat,
      lon,
      altitude: Number.isFinite(alt) ? alt : 0,
      groundSpeed: num(a.gs, 0),
      track: num(a.track, 0),
      verticalRate: num(a.baro_rate ?? a.geom_rate, 0),
      squawk: a.squawk ? String(a.squawk) : undefined,
      onGround: a.alt_baro === "ground",
      category: a.category ? String(a.category) : undefined,
      country: a.ownOp ? String(a.ownOp) : undefined,
      seen: num(a.seen_pos, 0),
    } as Aircraft);
  }
  return out;
}

/** Live aircraft around a point. adsb.lol primary, OpenSky fallback. */
export async function loadFlights(lat: number, lon: number, radiusNm: number, limit = 900) {
  const radius = Math.min(250, Math.max(25, radiusNm));
  let aircraft: Aircraft[] = [];
  let source = "adsb.lol";

  try {
    const data = await fetchJson<AdsbResponse>(
      `https://api.adsb.lol/v2/point/${lat.toFixed(3)}/${lon.toFixed(3)}/${Math.round(radius)}`,
      { timeout: 8000 },
    );
    aircraft = parseAdsb(data.ac ?? []);
  } catch {
    source = "opensky";
  }

  if (aircraft.length === 0) {
    const dLat = radius / 60;
    const dLon = radius / (60 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    try {
      const data = await fetchJson<{ states?: unknown[][] }>(
        `https://opensky-network.org/api/states/all?lamin=${(lat - dLat).toFixed(3)}&lomin=${(lon - dLon).toFixed(3)}&lamax=${(lat + dLat).toFixed(3)}&lomax=${(lon + dLon).toFixed(3)}`,
        { timeout: 9000 },
      );
      const states = data.states ?? [];
      aircraft = states
        .filter((s) => s[5] != null && s[6] != null)
        .map((s) => ({
          id: String(s[0]),
          callsign: String(s[1] ?? "").trim() || "UNKNOWN",
          lat: num(s[6], 0),
          lon: num(s[5], 0),
          altitude: num(s[13] ?? s[7], 0),
          groundSpeed: num(s[9], 0) * 1.94384,
          track: num(s[10], 0),
          verticalRate: num(s[11], 0) * 196.85,
          onGround: Boolean(s[8]),
          country: s[2] ? String(s[2]) : undefined,
          seen: s[4] && s[3] ? Math.max(0, num(s[4]) - num(s[3])) : 0,
        }));
      source = aircraft.length ? "opensky" : source;
    } catch {
      /* keep whatever adsb.lol returned */
    }
  }

  const seen = new Set<string>();
  const deduped = aircraft.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return a.altitude > -1000;
  });

  return {
    aircraft: deduped.slice(0, limit),
    source,
    total: deduped.length,
  };
}

/**
 * Global snapshot for the default world view. ADS-B APIs are local, so we
 * sample the busiest airspaces in parallel and merge them. This is the same
 * approach used by community flight maps.
 */
const Hubs: [number, number][] = [
  [40.7, -74.0], [34.0, -118.2], [41.9, -87.6], [32.8, -96.8], [37.6, -122.3],
  [51.5, -0.1], [50.1, 8.7], [48.9, 2.35], [41.9, 12.5], [40.4, -3.7],
  [28.6, 77.2], [19.1, 72.9], [1.35, 103.8], [22.3, 114.1], [35.7, 139.7],
  [31.2, 121.5], [37.6, 127.0], [-33.9, 151.2], [-23.5, -46.6], [25.2, 55.3],
  [24.7, 46.7], [-26.2, 28.0], [30.0, 31.2], [45.5, -73.6],
];

export async function loadGlobalFlights(limit = 2200) {
  const results = await Promise.allSettled(
    Hubs.map(([lat, lon]) =>
      fetchJson<AdsbResponse>(`https://api.adsb.lol/v2/point/${lat}/${lon}/240`, { timeout: 9000 }),
    ),
  );

  const seen = new Set<string>();
  const aircraft: Aircraft[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of parseAdsb(r.value.ac ?? [])) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      aircraft.push(a);
      if (aircraft.length >= limit) break;
    }
  }

  return {
    aircraft,
    source: "adsb.lol (multi-region)",
    total: aircraft.length,
    hubs: Hubs.length,
  };
}
