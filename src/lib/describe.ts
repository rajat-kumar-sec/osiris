import type { SelectedEntity } from "./store";
import { fmtCoord, relativeTime } from "./client";

type Any = Record<string, unknown>;

function s(v: unknown, fallback = "—"): string {
  if (v == null || v === "") return fallback;
  return String(v);
}

function n(v: unknown, digits = 0, suffix = ""): string {
  const num = Number(v);
  if (!Number.isFinite(num)) return "—";
  return `${num.toLocaleString("en-US", { maximumFractionDigits: digits })}${suffix}`;
}

export function describe(kind: string, raw: string, lat: number, lon: number): SelectedEntity {
  let p: Any = {};
  try {
    p = JSON.parse(raw) as Any;
  } catch {
    p = {};
  }
  const coords = fmtCoord(lat, lon);
  const base = { kind, lat, lon };

  switch (kind) {
    case "flight":
      return {
        ...base,
        title: s(p.callsign, "Unknown aircraft"),
        subtitle: [s(p.registration, ""), s(p.type, "")].filter(Boolean).join(" · ") || "Aircraft",
        props: [
          { label: "Callsign", value: s(p.callsign) },
          { label: "Registration", value: s(p.registration) },
          { label: "Type", value: s(p.type) },
          { label: "Altitude", value: n(p.altitude, 0, " ft") },
          { label: "Ground speed", value: n(p.groundSpeed, 0, " kt") },
          { label: "Heading", value: n(p.track, 0, "°") },
          { label: "Vertical rate", value: n(p.verticalRate, 0, " ft/min") },
          { label: "Squawk", value: s(p.squawk) },
          { label: "Position", value: coords },
          { label: "Last seen", value: `${n(p.seen, 1, "s")} ago` },
        ],
      };

    case "vessel":
      return {
        ...base,
        title: s(p.name, "Unknown vessel"),
        subtitle: [s(p.type, "Vessel"), s(p.destination, "")].filter(Boolean).join(" → "),
        props: [
          { label: "MMSI", value: s(p.id) },
          { label: "Type", value: s(p.type) },
          { label: "Speed", value: n(p.sog, 1, " kn") },
          { label: "Course", value: n(p.cog, 0, "°") },
          { label: "Heading", value: n(p.heading, 0, "°") },
          { label: "Destination", value: s(p.destination) },
          { label: "Draught", value: p.draught ? n(p.draught, 1, " m") : "—" },
          { label: "Flag", value: s(p.flag) },
          { label: "Position", value: coords },
          { label: "Source", value: s(p.source) },
        ],
      };

    case "satellite":
      return {
        ...base,
        title: s(p.name, "Satellite"),
        subtitle: s(p.category, "Orbital object"),
        props: [
          { label: "NORAD", value: s(p.id) },
          { label: "Category", value: s(p.category) },
          { label: "Altitude", value: n(p.altitude, 0, " km") },
          { label: "Velocity", value: n(p.velocity, 2, " km/s") },
          { label: "Position", value: coords },
          { label: "Source", value: "CelesTrak GP / SGP4" },
        ],
      };

    case "earthquake":
      return {
        ...base,
        title: `M${n(p.mag, 1)} earthquake`,
        subtitle: s(p.place),
        props: [
          { label: "Magnitude", value: n(p.mag, 1) },
          { label: "Depth", value: n(p.depth, 0, " km") },
          { label: "Time", value: relativeTime(Number(p.time)) },
          { label: "Tsunami", value: p.tsunami ? "FLAG RAISED" : "none" },
          { label: "Alert", value: s(p.alert, "—") },
          { label: "Position", value: coords },
        ],
        link: s(p.url) === "—" ? undefined : s(p.url),
      };

    case "fire":
      return {
        ...base,
        title: "Thermal anomaly",
        subtitle: s(p.satellite, "NASA detection"),
        props: [
          { label: "Brightness", value: n(p.brightness, 1, " K") },
          { label: "FRP", value: n(p.frp, 1, " MW") },
          { label: "Confidence", value: s(p.confidence) },
          { label: "Acquired", value: s(p.acquired) },
          { label: "Day / night", value: s(p.daynight) },
          { label: "Position", value: coords },
        ],
      };

    case "camera":
      return {
        ...base,
        title: s(p.name, "Camera"),
        subtitle: [s(p.city, ""), s(p.region, "")].filter(Boolean).join(" · "),
        props: [
          { label: "City", value: s(p.city) },
          { label: "Region", value: s(p.region) },
          { label: "Country", value: s(p.country) },
          { label: "Source", value: s(p.source) },
          { label: "Stream", value: s(p.kind, "image").toUpperCase() },
          { label: "Status", value: p.online === false ? "offline" : "online" },
          { label: "Position", value: coords },
        ],
        media: p.stream ? { type: s(p.kind) === "hls" ? "hls" : "image", url: s(p.stream) } : undefined,
      };

    case "nuclear":
      return {
        ...base,
        title: s(p.name, "Nuclear facility"),
        subtitle: s(p.country),
        props: [
          { label: "Country", value: s(p.country) },
          { label: "Capacity", value: p.capacityMw ? n(p.capacityMw, 0, " MW") : "—" },
          { label: "Reactors", value: s(p.reactors) },
          { label: "Status", value: s(p.status) },
          { label: "Position", value: coords },
          { label: "Source", value: "Wikidata / IAEA" },
        ],
      };

    case "port":
      return {
        ...base,
        title: s(p.name, "Port"),
        subtitle: s(p.country),
        props: [
          { label: "Country", value: s(p.country) },
          { label: "UN/LOCODE", value: s(p.code) },
          { label: "Position", value: coords },
        ],
      };

    case "airport":
      return {
        ...base,
        title: s(p.name, "Airport"),
        subtitle: [s(p.city, ""), s(p.country, "")].filter(Boolean).join(", "),
        props: [
          { label: "IATA", value: s(p.iata) },
          { label: "ICAO", value: s(p.icao) },
          { label: "City", value: s(p.city) },
          { label: "Country", value: s(p.country) },
          { label: "Elevation", value: n(p.elev, 0, " ft") },
          { label: "Position", value: coords },
        ],
      };

    case "storm":
      return {
        ...base,
        title: s(p.name, "Tropical cyclone"),
        subtitle: s(p.category),
        props: [
          { label: "Category", value: s(p.category) },
          { label: "Max wind", value: n(p.wind, 0, " kt") },
          { label: "Pressure", value: n(p.pressure, 0, " hPa") },
          { label: "Basin", value: s(p.basin) },
          { label: "Movement", value: s(p.movement) },
          { label: "Updated", value: s(p.updated) },
          { label: "Position", value: coords },
        ],
      };

    case "train":
      return {
        ...base,
        title: s(p.title, `Train ${s(p.number)}`),
        subtitle: s(p.operator, "Rail"),
        props: [
          { label: "Train", value: s(p.number) },
          { label: "Type", value: s(p.type) },
          { label: "Speed", value: n(p.speed, 0, " km/h") },
          { label: "Operator", value: s(p.operator) },
          { label: "Updated", value: relativeTime(s(p.timestamp)) },
          { label: "Position", value: coords },
        ],
      };

    case "gpsjam":
      return {
        ...base,
        title: `${((Number(p.ratio) || 0) * 100).toFixed(0)}% degraded`,
        subtitle: "GPS / ADS-B interference cell",
        props: [
          { label: "Degraded", value: `${((Number(p.ratio) || 0) * 100).toFixed(1)}%` },
          { label: "Aircraft", value: n(p.count) },
          { label: "H3 resolution", value: "4" },
          { label: "Position", value: coords },
          { label: "Source", value: "gpsjam.org" },
        ],
      };

    case "cyber":
      return {
        ...base,
        title: s(p.ip_address, "C2 infrastructure"),
        subtitle: s(p.malware, "Botnet"),
        props: [
          { label: "IP", value: s(p.ip_address) },
          { label: "Port", value: s(p.port) },
          { label: "Malware", value: s(p.malware) },
          { label: "ASN", value: s(p.as_name) },
          { label: "Country", value: s(p.country) },
          { label: "Last online", value: relativeTime(s(p.last_online)) },
        ],
        link: `https://feodotracker.abuse.ch/browse/host/${s(p.ip_address)}/`,
      };

    case "cable":
      return {
        ...base,
        title: s(p.title, "Submarine cable"),
        subtitle: "TeleGeography cable route",
        props: [
          { label: "Cable", value: s(p.title) },
          { label: "ID", value: s(p.id) },
          { label: "Source", value: "submarinecablemap.com" },
        ],
      };

    case "conflict":
      return {
        ...base,
        title: s(p.title, "Conflict report"),
        subtitle: s(p.source),
        props: [
          { label: "Source", value: s(p.source) },
          { label: "Published", value: relativeTime(s(p.published)) },
          { label: "Position", value: coords },
        ],
        media: p.image ? { type: "image", url: s(p.image) } : undefined,
        link: s(p.url) === "—" ? undefined : s(p.url),
      };

    case "news":
      return {
        ...base,
        title: s(p.title, "Report"),
        subtitle: s(p.source),
        props: [
          { label: "Source", value: s(p.source) },
          { label: "Published", value: relativeTime(s(p.published)) },
          { label: "Country", value: s(p.country) },
        ],
        media: p.image ? { type: "image", url: s(p.image) } : undefined,
        link: s(p.url) === "—" ? undefined : s(p.url),
      };

    default:
      return {
        ...base,
        title: s(p.title, "Entity"),
        subtitle: s(p.subtitle, kind),
        props: Object.entries(p)
          .filter(([, v]) => typeof v !== "object")
          .slice(0, 10)
          .map(([k, v]) => ({ label: k, value: s(v) })),
      };
  }
}
