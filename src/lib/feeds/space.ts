import * as satellite from "satellite.js";
import { fetchJson, fetchText, num } from "../http";
import type { SatellitePosition, SpaceWeather } from "../types";

export const SAT_GROUPS = {
  stations: { label: "Space Stations", cap: 60, category: "Station" },
  "gps-ops": { label: "GPS Constellation", cap: 80, category: "Navigation" },
  weather: { label: "Weather Satellites", cap: 120, category: "Weather" },
  science: { label: "Science", cap: 150, category: "Science" },
  starlink: { label: "Starlink", cap: 1400, category: "Comms" },
  active: { label: "All Active", cap: 1600, category: "Active" },
} as const;

export type SatGroupId = keyof typeof SAT_GROUPS;

type Tle = { name: string; line1: string; line2: string };

function parseTle(text: string): Tle[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Tle[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("1 ") && lines[i + 1]?.startsWith("2 ")) {
      out.push({ name: `OBJECT ${lines[i].slice(2, 7).trim()}`, line1: lines[i], line2: lines[i + 1] });
      i++;
    } else if (lines[i + 1]?.startsWith("1 ") && lines[i + 2]?.startsWith("2 ")) {
      out.push({ name: lines[i], line1: lines[i + 1], line2: lines[i + 2] });
      i += 2;
    }
  }
  return out;
}

function epochOf(tle: Tle): number {
  const yy = parseInt(tle.line1.slice(18, 20), 10);
  const doy = parseFloat(tle.line1.slice(20, 32));
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  return Date.UTC(year, 0, 1) + (doy - 1) * 86400000;
}

/** Fetch a TLE group and propagate every object to the current instant. */
export async function loadSatellites(group: SatGroupId) {
  const cfg = SAT_GROUPS[group];
  const text = await fetchText(
    `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`,
    { timeout: 15000, retries: 1 },
  );
  const tles = parseTle(text);
  const now = new Date();
  const gmst = satellite.gstime(now);
  const out: SatellitePosition[] = [];

  for (const tle of tles) {
    if (out.length >= cfg.cap) break;
    try {
      const rec = satellite.twoline2satrec(tle.line1, tle.line2);
      const p = satellite.propagate(rec, now);
      if (!p || !p.position || typeof p.position === "boolean") continue;
      const geo = satellite.eciToGeodetic(p.position, gmst);
      const lat = satellite.degreesLat(geo.latitude);
      const lon = satellite.degreesLong(geo.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const v = p.velocity && typeof p.velocity !== "boolean" ? Math.hypot(p.velocity.x, p.velocity.y, p.velocity.z) : 0;
      out.push({
        id: Number(rec.satnum) || out.length,
        name: tle.name.replace(/\s+/g, " ").trim(),
        lat,
        lon,
        altitude: geo.height,
        velocity: v,
        category: cfg.category,
        launchDate: tle.line1.slice(9, 17).trim(),
      });
    } catch {
      /* skip decayed / malformed objects */
    }
  }

  return {
    group,
    label: cfg.label,
    satellites: out,
    tleCount: tles.length,
    epoch: now.toISOString(),
    source: "CelesTrak GP",
  };
}

export async function loadIss() {
  const data = await loadSatellites("stations");
  const iss =
    data.satellites.find((s) => /ISS \(ZARYA\)/i.test(s.name)) ??
    data.satellites.find((s) => /TIANHE|CSS/i.test(s.name)) ??
    null;
  return { iss, all: data.satellites, epoch: data.epoch, source: data.source };
}

/* ── Space weather ─────────────────────────────────────────── */

type SwpcScale = Record<string, { Scale?: string | null; Text?: string | null }>;
type PlasmaRow = [string, ...(string | number | null)[]];

export async function loadSpaceWeather() {
  const [scales, kp, plasma, mag, flares] = await Promise.allSettled([
    fetchJson<Record<string, { R?: SwpcScale; S?: SwpcScale; G?: SwpcScale }>>(
      "https://services.swpc.noaa.gov/products/noaa-scales.json",
      { timeout: 7000 },
    ),
    fetchJson<PlasmaRow[]>("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", { timeout: 7000 }),
    fetchJson<PlasmaRow[]>("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json", { timeout: 7000 }),
    fetchJson<PlasmaRow[]>("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json", { timeout: 7000 }),
    fetchJson<{ "Flare class"?: string; "Begin Time"?: string; "Active Region"?: string }[]>(
      "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json",
      { timeout: 7000 },
    ),
  ]);

  const s0 = scales.status === "fulfilled" ? scales.value["0"] ?? {} : {};
  const kpRows = kp.status === "fulfilled" ? kp.value.slice(1) : [];
  const recentKp = kpRows.slice(-24).map((r) => ({ time: String(r[0]), kp: num(r[1], 0) }));
  const currentKp = recentKp.at(-1)?.kp ?? 0;

  const plasmaRows = plasma.status === "fulfilled" ? plasma.value.slice(1).filter((r) => r[2] != null) : [];
  const lastPlasma = plasmaRows.at(-1);
  const magRows = mag.status === "fulfilled" ? mag.value.slice(1).filter((r) => r[6] != null) : [];
  const lastMag = magRows.at(-1);

  const flareRows = flares.status === "fulfilled" ? flares.value : [];
  const flareList = flareRows
    .slice(-12)
    .reverse()
    .map((f) => ({
      time: String(f["Begin Time"] ?? ""),
      klass: String(f["Flare class"] ?? ""),
      region: f["Active Region"] != null ? String(f["Active Region"]) : undefined,
    }));

  const data: SpaceWeather = {
    kp: currentKp,
    kpForecast: recentKp,
    solarWind: {
      speed: num(lastPlasma?.[2], 0),
      density: num(lastPlasma?.[1], 0),
      bt: num(lastMag?.[6], 0),
      bz: num(lastMag?.[3], 0),
    },
    flares: flareList,
    scales: {
      r: num(String(s0.R?.Scale ?? "0"), 0),
      s: num(String(s0.S?.Scale ?? "0"), 0),
      g: num(String(s0.G?.Scale ?? "0"), 0),
    },
    updated: new Date().toISOString(),
  };

  return data;
}
