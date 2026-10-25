import { fetchJson, num } from "../http";
import type { Storm } from "../types";

type RainViewer = {
  version: string;
  generated: number;
  host: string;
  radar: { past: { time: number; path: string }[]; nowcast: { time: number; path: string }[] };
  satellite?: { infrared: { time: number; path: string }[] };
};

export async function loadRadar() {
  const rv = await fetchJson<RainViewer>("https://api.rainviewer.com/public/weather-maps.json", { timeout: 8000 });
  const frames = [...rv.radar.past, ...rv.radar.nowcast].slice(-14);
  return {
    host: rv.host,
    frames: frames.map((f) => ({ time: f.time, path: f.path })),
    latest: frames.at(-1)?.time ?? rv.generated,
    generated: rv.generated,
    attribution: "RainViewer",
  };
}

export type WeatherAlert = {
  id: string;
  event: string;
  severity: string;
  headline: string;
  area: string;
  effective: string;
  expires: string;
  sender: string;
  lat?: number;
  lon?: number;
};

type NwsFeature = {
  id: string;
  geometry: { type: string; coordinates: unknown } | null;
  properties: {
    event?: string;
    severity?: string;
    headline?: string;
    areaDesc?: string;
    effective?: string;
    expires?: string;
    senderName?: string;
  };
};

function centroid(geometry: NwsFeature["geometry"]): { lat: number; lon: number } | null {
  if (!geometry) return null;
  const walk = (c: unknown): [number, number][] => {
    if (!Array.isArray(c)) return [];
    if (typeof c[0] === "number" && typeof c[1] === "number") return [[c[0], c[1]]];
    return (c as unknown[]).flatMap(walk);
  };
  const pts = walk(geometry.coordinates);
  if (!pts.length) return null;
  const sum = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return { lon: sum[0] / pts.length, lat: sum[1] / pts.length };
}

export async function loadWeatherAlerts() {
  const data = await fetchJson<{ features: NwsFeature[] }>(
    "https://api.weather.gov/alerts/active?status=actual&message_type=alert&limit=500",
    {
      timeout: 12000,
      headers: { Accept: "application/geo+json", "User-Agent": "OSIRIS/5.0 (open-source intelligence platform)" },
    },
  );
  const alerts: WeatherAlert[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    const c = centroid(f.geometry);
    alerts.push({
      id: f.id,
      event: p.event ?? "Weather Alert",
      severity: p.severity ?? "Unknown",
      headline: p.headline ?? "",
      area: p.areaDesc ?? "",
      effective: p.effective ?? "",
      expires: p.expires ?? "",
      sender: p.senderName ?? "NWS",
      lat: c?.lat,
      lon: c?.lon,
    });
  }
  return { alerts, source: "NOAA / NWS" };
}

export type PointWeather = {
  lat: number;
  lon: number;
  temp: number;
  wind: number;
  gust: number;
  humidity: number;
  code: number;
  pressure: number;
  visibility: number;
};

export async function loadPointWeather(lat: number, lon: number): Promise<PointWeather> {
  const data = await fetchJson<{
    current: {
      temperature_2m: number;
      wind_speed_10m: number;
      wind_gusts_10m: number;
      relative_humidity_2m: number;
      weather_code: number;
      surface_pressure: number;
      visibility: number;
    };
  }>(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,weather_code,surface_pressure,visibility`,
    { timeout: 7000 },
  );
  const c = data.current;
  return {
    lat,
    lon,
    temp: num(c.temperature_2m, 0),
    wind: num(c.wind_speed_10m, 0),
    gust: num(c.wind_gusts_10m, 0),
    humidity: num(c.relative_humidity_2m, 0),
    code: num(c.weather_code, 0),
    pressure: num(c.surface_pressure, 0),
    visibility: num(c.visibility, 0),
  };
}

/** GDACS tropical cyclones, used to supplement seasonal NHC data. */
export async function loadGdacsStorms(): Promise<Storm[]> {
  try {
    const data = await fetchJson<{
      features: { id?: string; geometry: { coordinates: [number, number] }; properties: Record<string, unknown> }[];
    }>("https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=TC", { timeout: 9000 });
    return (data.features ?? []).map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties;
      return {
        id: `gdacs-${String(p.eventid ?? f.id)}`,
        name: String(p.eventname ?? "Tropical Cyclone"),
        category: String(p.alertlevel ?? "TC"),
        lat,
        lon,
        wind: num(p.maxwind, 0),
        pressure: num(p.pressure, 0),
        basin: String(p.basin ?? ""),
        updated: String(p.todate ?? ""),
      };
    });
  } catch {
    return [];
  }
}
