import { fetchJson, fetchText, num, parseCsv } from "../http";
import type { Quake, Storm, Wildfire } from "../types";

type GeoFeature<G = unknown, P = Record<string, unknown>> = {
  id?: string;
  geometry: { type: string; coordinates: G };
  properties: P;
};

const USGS = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary";

export async function loadEarthquakes() {
  const [day, week] = await Promise.allSettled([
    fetchJson<{ features: GeoFeature<[number, number, number], Record<string, unknown>>[] }>(`${USGS}/2.5_day.geojson`, {
      timeout: 8000,
    }),
    fetchJson<{ features: GeoFeature<[number, number, number], Record<string, unknown>>[] }>(`${USGS}/4.5_week.geojson`, {
      timeout: 8000,
    }),
  ]);

  const features = [
    ...(day.status === "fulfilled" ? day.value.features : []),
    ...(week.status === "fulfilled" ? week.value.features : []),
  ];

  const seen = new Set<string>();
  const quakes: Quake[] = [];
  for (const f of features) {
    const id = String(f.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const [lon, lat, depth] = f.geometry.coordinates;
    const p = f.properties;
    quakes.push({
      id,
      mag: num(p.mag, 0),
      place: String(p.place ?? "Unknown location"),
      time: num(p.time, Date.now()),
      lat,
      lon,
      depth: num(depth, 0),
      url: String(p.url ?? ""),
      tsunami: Boolean(p.tsunami),
      alert: p.alert ? String(p.alert) : undefined,
    });
  }
  quakes.sort((a, b) => b.time - a.time);
  return { quakes, source: "USGS" };
}

export async function loadWildfires() {
  const key = process.env.NASA_FIRMS_KEY;
  if (key) {
    try {
      const csv = await fetchText(
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/world/1`,
        { timeout: 15000 },
      );
      const rows = parseCsv(csv);
      if (rows.length) {
        const fires: Wildfire[] = rows.slice(0, 5000).map((r, i) => ({
          id: `firms-${r.latitude}-${r.longitude}-${i}`,
          lat: num(r.latitude, 0),
          lon: num(r.longitude, 0),
          brightness: num(r.bright_ti4, 0),
          confidence: num(r.confidence, 0),
          frp: num(r.frp, 0),
          acquired: `${r.acq_date} ${r.acq_time}`,
          satellite: r.satellite,
          daynight: r.daynight,
        }));
        return { fires, source: "NASA FIRMS (VIIRS SNPP NRT)", mode: "satellite" as const };
      }
    } catch {
      /* fall through to EONET */
    }
  }

  const eonet = await fetchJson<{ events: EonetEvent[] }>(
    "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=120",
    { timeout: 10000 },
  );
  const fires: Wildfire[] = [];
  for (const e of eonet.events) {
    const g = e.geometry?.at(-1);
    if (!g || g.type !== "Point") continue;
    fires.push({
      id: e.id,
      lat: g.coordinates[1],
      lon: g.coordinates[0],
      acquired: g.date,
      satellite: e.sources?.[0]?.id ?? "EONET",
    });
  }
  return { fires, source: "NASA EONET (wildfire incidents)", mode: "incident" as const };
}

type EonetEvent = {
  id: string;
  title: string;
  categories?: { id: string; title: string }[];
  sources?: { id: string; url: string }[];
  geometry?: { date: string; type: string; coordinates: [number, number] }[];
};

export async function loadEonet(category: "volcanoes" | "severeStorms") {
  const data = await fetchJson<{ events: EonetEvent[] }>(
    `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=${category}&limit=120`,
    { timeout: 10000 },
  );
  return data.events
    .map((e) => {
      const g = e.geometry?.at(-1);
      if (!g || g.type !== "Point") return null;
      return {
        id: e.id,
        name: e.title,
        lat: g.coordinates[1],
        lon: g.coordinates[0],
        date: g.date,
        source: e.sources?.[0]?.url ?? "NASA EONET",
      };
    })
    .filter(Boolean) as { id: string; name: string; lat: number; lon: number; date: string; source: string }[];
}

/* ── Tropical storms (NHC + GDACS) ─────────────────────────── */

type NhcStorm = {
  id: string;
  name: string;
  classification: string;
  intensity: string;
  pressure: string;
  latitude: string;
  longitude: string;
  movementDir: string;
  movementSpeed: string;
  lastUpdate: string;
  basin?: string;
};

function parseNhcCoord(v: string, axis: "lat" | "lon"): number {
  const m = v.match(/([\d.]+)\s*([NSEW])/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const dir = m[2].toUpperCase();
  return axis === "lat" ? (dir === "S" ? -n : n) : dir === "W" ? -n : n;
}

export async function loadStorms() {
  const storms: Storm[] = [];
  try {
    const nhc = await fetchJson<{ activeStorms?: NhcStorm[] }>("https://www.nhc.noaa.gov/CurrentStorms.json", {
      timeout: 8000,
    });
    for (const s of nhc.activeStorms ?? []) {
      storms.push({
        id: `nhc-${s.id}`,
        name: s.name,
        category: s.classification,
        lat: parseNhcCoord(s.latitude, "lat"),
        lon: parseNhcCoord(s.longitude, "lon"),
        wind: num(s.intensity, 0),
        pressure: num(s.pressure, 0),
        movement: `${s.movementDir} ${s.movementSpeed} kt`,
        basin: s.basin ?? (s.id.startsWith("ep") || s.id.startsWith("cp") ? "East Pacific" : "Atlantic"),
        updated: s.lastUpdate,
      });
    }
  } catch {
    /* NHC is seasonal */
  }

  try {
    const gdacs = await fetchJson<{ features: GeoFeature<[number, number], Record<string, unknown>>[] }>(
      "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=TC",
      { timeout: 10000 },
    );
    for (const f of gdacs.features ?? []) {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      storms.push({
        id: `gdacs-${String(p.eventid ?? f.id)}`,
        name: String(p.eventname ?? p.name ?? "Tropical Cyclone"),
        category: String(p.alertlevel ?? "TC"),
        lat,
        lon,
        wind: num(p.maxwind, 0),
        pressure: num(p.pressure, 0),
        basin: String(p.basin ?? ""),
        updated: String(p.todate ?? p.fromdate ?? ""),
      });
    }
  } catch {
    /* optional feed */
  }

  return { storms, source: "NOAA NHC + GDACS" };
}

export async function loadGdacs() {
  const types = ["EQ", "FL", "VO", "WF", "DR", "TC"];
  const results = await Promise.allSettled(
    types.map((t) =>
      fetchJson<{ features: GeoFeature<[number, number], Record<string, unknown>>[] }>(
        `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=${t}`,
        { timeout: 9000 },
      ),
    ),
  );
  const out: {
    id: string;
    type: string;
    name: string;
    alert: string;
    lat: number;
    lon: number;
    from: string;
    url: string;
  }[] = [];
  const seen = new Set<string>();
  results.forEach((r) => {
    if (r.status !== "fulfilled") return;
    for (const f of r.value.features ?? []) {
      const p = f.properties;
      const id = String(p.eventid ?? f.id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const [lon, lat] = f.geometry.coordinates;
      out.push({
        id,
        type: String(p.eventtype ?? ""),
        name: String(p.eventname ?? p.name ?? "Disaster"),
        alert: String(p.alertlevel ?? "Green"),
        lat,
        lon,
        from: String(p.fromdate ?? ""),
        url: String(p.url ?? ""),
      });
    }
  });
  return { events: out, source: "GDACS" };
}
