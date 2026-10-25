import { fetchJson } from "../http";
import type { Vessel } from "../types";

type DigitrafficVessel = {
  mmsi: number;
  callSign?: string;
  destination?: string;
  draught?: number;
  eta?: number;
  name?: string;
  shipType?: number;
};

type DigitrafficLocation = {
  mmsi: number;
  geometry: { coordinates: [number, number] };
  properties: {
    sog?: number;
    cog?: number;
    heading?: number;
    navStat?: number;
    timestampExternal?: number;
  };
};

const TYPE_MAP: [number, number, string][] = [
  [30, 30, "Fishing"],
  [31, 32, "Towing"],
  [33, 33, "Dredging"],
  [34, 34, "Diving"],
  [35, 35, "Military"],
  [36, 36, "Sailing"],
  [37, 37, "Pleasure Craft"],
  [50, 50, "Pilot"],
  [51, 51, "SAR"],
  [52, 52, "Tug"],
  [53, 53, "Port Tender"],
  [55, 55, "Law Enforcement"],
  [60, 69, "Passenger"],
  [70, 79, "Cargo"],
  [80, 89, "Tanker"],
  [90, 99, "Other"],
];

function shipType(code?: number): string {
  if (!code) return "Vessel";
  for (const [min, max, label] of TYPE_MAP) if (code >= min && code <= max) return label;
  return "Vessel";
}

export async function loadDigitraffic() {
  const [loc, meta] = await Promise.allSettled([
    fetchJson<{ features: DigitrafficLocation[]; dataUpdatedTime?: string }>(
      "https://meri.digitraffic.fi/api/ais/v1/locations",
      { timeout: 12000 },
    ),
    fetchJson<DigitrafficVessel[]>("https://meri.digitraffic.fi/api/ais/v1/vessels", { timeout: 12000 }),
  ]);
  if (loc.status !== "fulfilled") throw new Error("digitraffic AIS unavailable");

  const info = new Map<number, DigitrafficVessel>();
  if (meta.status === "fulfilled") for (const v of meta.value) info.set(v.mmsi, v);

  const vessels: Vessel[] = [];
  for (const f of loc.value.features ?? []) {
    const [lon, lat] = f.geometry.coordinates;
    const m = info.get(f.mmsi);
    vessels.push({
      id: String(f.mmsi),
      name: m?.name?.trim() || String(f.mmsi),
      lat,
      lon,
      sog: f.properties.sog ?? 0,
      cog: f.properties.cog ?? 0,
      heading: f.properties.heading ?? f.properties.cog ?? 0,
      type: shipType(m?.shipType),
      destination: m?.destination?.trim() || undefined,
      draught: m?.draught ? m.draught / 10 : undefined,
      flag: m?.callSign?.slice(0, 2),
      source: "Digitraffic (FI)",
    });
  }

  return {
    vessels,
    source: "Digitraffic AIS",
    region: "Baltic / Nordic",
    updated: loc.value.dataUpdatedTime ?? new Date().toISOString(),
  };
}

/* ── Optional global AIS via aisstream.io ──────────────────── */

type AisPosition = {
  MessageType: string;
  MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number };
  Message?: {
    PositionReport?: {
      Latitude: number;
      Longitude: number;
      Sog: number;
      Cog: number;
      TrueHeading: number;
      NavigationalStatus: number;
    };
    ShipStaticData?: { Name?: string; Destination?: string; Type?: number; ImoNumber?: number };
  };
};

/** Collect live global AIS for a few seconds over the public AISStream WebSocket. */
export async function loadAisStream(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number,
  budgetMs = 6500,
): Promise<Vessel[]> {
  const key = process.env.AISSTREAM_API_KEY;
  if (!key) return [];

  const { WebSocket } = await import("ws");
  return new Promise((resolve) => {
    const found = new Map<string, Vessel>();
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        ws.close();
      } catch {
        /* noop */
      }
      resolve([...found.values()]);
    };
    const timer = setTimeout(finish, budgetMs);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          APIKey: key,
          BoundingBoxes: [
            [
              [minLat, minLon],
              [maxLat, maxLon],
            ],
          ],
          FilterMessageTypes: ["PositionReport", "ShipStaticData"],
        }),
      );
    });

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as AisPosition;
        const mmsi = String(msg.MetaData?.MMSI ?? "");
        if (!mmsi) return;
        const pos = msg.Message?.PositionReport;
        const stat = msg.Message?.ShipStaticData;
        if (pos) {
          found.set(mmsi, {
            id: mmsi,
            name: msg.MetaData?.ShipName?.trim() || mmsi,
            lat: pos.Latitude,
            lon: pos.Longitude,
            sog: pos.Sog,
            cog: pos.Cog,
            heading: pos.TrueHeading,
            type: shipType(stat?.Type),
            destination: stat?.Destination?.trim() || undefined,
            source: "AISStream",
          });
        } else if (stat) {
          const prev = found.get(mmsi);
          if (prev) {
            prev.name = stat.Name?.trim() || prev.name;
            prev.destination = stat.Destination?.trim() || prev.destination;
            prev.type = shipType(stat.Type);
          }
        }
        if (found.size >= 1200) finish();
      } catch {
        /* ignore malformed frames */
      }
    });

    ws.on("error", () => {
      clearTimeout(timer);
      finish();
    });
    ws.on("close", () => {
      clearTimeout(timer);
      finish();
    });
  });
}
