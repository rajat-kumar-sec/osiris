import type {
  Aircraft,
  Cable,
  CctvCamera,
  GpsJamCell,
  NewsItem,
  NuclearSite,
  Port,
  Quake,
  SatellitePosition,
  Storm,
  Vessel,
  Wildfire,
} from "@/lib/types";
import { COUNTRY_CENTROIDS } from "@/lib/feeds/cyber";

type Feature = {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, string | number | boolean>;
};

function fc(features: Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features } as unknown as GeoJSON.FeatureCollection;
}

function point(lon: number, lat: number): { type: "Point"; coordinates: [number, number] } {
  return { type: "Point", coordinates: [lon, lat] };
}

export function flightsGeo(aircraft: Aircraft[]): GeoJSON.FeatureCollection {
  return fc(
    aircraft.map((a) => ({
      type: "Feature",
      geometry: point(a.lon, a.lat),
      properties: {
        id: a.id,
        kind: "flight",
        title: a.callsign,
        subtitle: a.registration ?? a.type ?? "Aircraft",
        track: a.track,
        alt: a.altitude,
        payload: JSON.stringify(a),
      },
    })),
  );
}

export function shipsGeo(vessels: Vessel[]): GeoJSON.FeatureCollection {
  return fc(
    vessels.map((v) => ({
      type: "Feature",
      geometry: point(v.lon, v.lat),
      properties: {
        id: v.id,
        kind: "vessel",
        title: v.name,
        subtitle: v.type ?? "Vessel",
        track: v.cog ?? 0,
        payload: JSON.stringify(v),
      },
    })),
  );
}

export function satellitesGeo(sats: SatellitePosition[]): GeoJSON.FeatureCollection {
  return fc(
    sats.map((s) => ({
      type: "Feature",
      geometry: point(s.lon, s.lat),
      properties: {
        id: s.id,
        kind: "satellite",
        title: s.name,
        subtitle: s.category,
        payload: JSON.stringify(s),
      },
    })),
  );
}

export function quakesGeo(quakes: Quake[]): GeoJSON.FeatureCollection {
  return fc(
    quakes.map((q) => ({
      type: "Feature",
      geometry: point(q.lon, q.lat),
      properties: {
        id: q.id,
        kind: "earthquake",
        title: `M${q.mag.toFixed(1)}`,
        subtitle: q.place,
        mag: q.mag,
        depth: q.depth,
        payload: JSON.stringify(q),
      },
    })),
  );
}

export function firesGeo(fires: Wildfire[]): GeoJSON.FeatureCollection {
  return fc(
    fires.map((f) => ({
      type: "Feature",
      geometry: point(f.lon, f.lat),
      properties: {
        id: f.id,
        kind: "fire",
        title: "Fire detection",
        subtitle: f.satellite ?? "NASA",
        frp: f.frp ?? 0,
        payload: JSON.stringify(f),
      },
    })),
  );
}

export function camerasGeo(cameras: CctvCamera[]): GeoJSON.FeatureCollection {
  return fc(
    cameras.map((c) => ({
      type: "Feature",
      geometry: point(c.lon, c.lat),
      properties: {
        id: c.id,
        kind: "camera",
        title: c.name,
        subtitle: c.city,
        payload: JSON.stringify(c),
      },
    })),
  );
}

export function nuclearGeo(sites: NuclearSite[]): GeoJSON.FeatureCollection {
  return fc(
    sites.map((s) => ({
      type: "Feature",
      geometry: point(s.lon, s.lat),
      properties: {
        id: s.id,
        kind: "nuclear",
        title: s.name,
        subtitle: s.country,
        payload: JSON.stringify(s),
      },
    })),
  );
}

export function portsGeo(ports: Port[]): GeoJSON.FeatureCollection {
  return fc(
    ports.map((p) => ({
      type: "Feature",
      geometry: point(p.lon, p.lat),
      properties: {
        id: p.id,
        kind: "port",
        title: p.name,
        subtitle: p.country,
        payload: JSON.stringify(p),
      },
    })),
  );
}

export type Airport = { id: string; iata: string; icao: string; name: string; city: string; country: string; lat: number; lon: number };

export function airportsGeo(airports: Airport[]): GeoJSON.FeatureCollection {
  return fc(
    airports.map((a) => ({
      type: "Feature",
      geometry: point(a.lon, a.lat),
      properties: {
        id: a.id,
        kind: "airport",
        title: a.iata ? `${a.iata} · ${a.name}` : a.name,
        subtitle: `${a.city}, ${a.country}`,
        payload: JSON.stringify(a),
      },
    })),
  );
}

export function stormsGeo(storms: Storm[]): GeoJSON.FeatureCollection {
  return fc(
    storms.map((s) => ({
      type: "Feature",
      geometry: point(s.lon, s.lat),
      properties: {
        id: s.id,
        kind: "storm",
        title: s.name,
        subtitle: `${s.category}${s.wind ? ` · ${s.wind} kt` : ""}`,
        payload: JSON.stringify(s),
      },
    })),
  );
}

export function trainsGeo(trains: { id: string; number: number; lat: number; lon: number; speed: number; type: string; operator: string; timestamp: string }[]): GeoJSON.FeatureCollection {
  return fc(
    trains.map((t) => ({
      type: "Feature",
      geometry: point(t.lon, t.lat),
      properties: {
        id: t.id,
        kind: "train",
        title: `${t.type} ${t.number}`,
        subtitle: `${t.speed} km/h`,
        payload: JSON.stringify(t),
      },
    })),
  );
}

export function gpsJamGeo(cells: GpsJamCell[]): GeoJSON.FeatureCollection {
  return fc(
    cells.map((c, i) => ({
      type: "Feature",
      geometry: point(c.lon, c.lat),
      properties: {
        id: `jam-${i}`,
        kind: "gpsjam",
        title: `${(c.ratio * 100).toFixed(0)}% degraded`,
        subtitle: `${c.count} aircraft`,
        ratio: c.ratio,
        count: c.count,
        payload: JSON.stringify(c),
      },
    })),
  );
}

export function cyberGeo(botnets: { ip_address: string; port: number; country?: string; malware?: string; as_name?: string; last_online?: string }[]): GeoJSON.FeatureCollection {
  return fc(
    botnets
      .map((b) => {
        const c = b.country ? COUNTRY_CENTROIDS[b.country] : undefined;
        if (!c) return null;
        return {
          type: "Feature" as const,
          geometry: point(c[1], c[0]),
          properties: {
            id: b.ip_address,
            kind: "cyber",
            title: b.ip_address,
            subtitle: b.malware ?? "Botnet C2",
            payload: JSON.stringify(b),
          },
        };
      })
      .filter(Boolean) as Feature[],
  );
}

export function cablesGeo(cables: Cable[]): GeoJSON.FeatureCollection {
  return fc(
    cables.map((c) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: c.coordinates },
      properties: { id: c.id, kind: "cable", title: c.name, subtitle: "Submarine cable" },
    })),
  );
}

export function conflictGeo(items: NewsItem[]): GeoJSON.FeatureCollection {
  return fc(
    items
      .filter((i) => i.lat != null && i.lon != null)
      .map((i) => ({
        type: "Feature",
        geometry: point(i.lon as number, i.lat as number),
        properties: {
          id: i.id,
          kind: "conflict",
          title: i.title.slice(0, 80),
          subtitle: i.source,
          payload: JSON.stringify(i),
        },
      })),
  );
}

type Incident = { id: string; type: string; name: string; alert: string; lat: number; lon: number; from: string; url: string };

export function incidentsGeo(events: Incident[]): GeoJSON.FeatureCollection {
  return fc(
    events
      .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon))
      .map((e) => ({
        type: "Feature",
        geometry: point(e.lon, e.lat),
        properties: {
          id: e.id,
          kind: "incident",
          title: e.name.slice(0, 90),
          subtitle: `${e.type} · ${e.alert}`,
          level: e.alert,
          payload: JSON.stringify(e),
        },
      })),
  );
}

/**
 * Solar terminator polygon: the region where the sun is below the horizon.
 * Recomputed on a short interval so the shading tracks real time.
 */
export function nightGeo(date: Date = new Date()): GeoJSON.FeatureCollection {
  const rad = Math.PI / 180;
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const doy = (date.getTime() - yearStart) / 86_400_000;
  const dec = -23.44 * Math.cos(rad * (360 / 365) * (doy + 10));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const subLon = 180 - utcHours * 15;

  const ring: [number, number][] = [];
  const tanDec = Math.tan(dec * rad);
  for (let lon = -180; lon <= 180; lon += 1.5) {
    const h = (lon - subLon) * rad;
    const lat = Math.abs(tanDec) < 1e-6 ? 0 : Math.atan(-Math.cos(h) / tanDec) / rad;
    ring.push([lon, Math.max(-89.5, Math.min(89.5, lat))]);
  }
  const darkPole = dec >= 0 ? -90 : 90;
  ring.push([180, darkPole], [-180, darkPole], [ring[0][0], ring[0][1]]);

  return fc([
    {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { kind: "night" },
    },
  ]);
}

export function drawingsGeo(drawings: { id: string; type: string; coords: [number, number][]; label?: string }[]): GeoJSON.FeatureCollection {
  const features: Feature[] = [];
  for (const d of drawings) {
    if (d.type === "point" && d.coords[0]) {
      features.push({
        type: "Feature",
        geometry: point(d.coords[0][0], d.coords[0][1]),
        properties: { id: d.id, kind: "drawing", title: d.label ?? "Marker" },
      });
    } else if (d.type === "line" && d.coords.length > 1) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: d.coords },
        properties: { id: d.id, kind: "drawing", title: "Line" },
      });
    } else if (d.type === "polygon" && d.coords.length > 2) {
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[...d.coords, d.coords[0]]] },
        properties: { id: d.id, kind: "drawing", title: "Area" },
      });
    }
  }
  return fc(features);
}

export function routeGeo(coords: [number, number][] | null): GeoJSON.FeatureCollection {
  if (!coords || coords.length < 2) return fc([]);
  return fc([
    {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: { kind: "route" },
    },
  ]);
}
