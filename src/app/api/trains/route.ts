import { feed } from "@/lib/api";
import { fetchJson } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TrainLocation = {
  trainNumber: number;
  departureDate: string;
  location: { coordinates: [number, number] };
  speed: number;
  timestamp: string;
};

type TrainMeta = {
  trainNumber: number;
  departureDate: string;
  trainType: string;
  trainCategory: string;
  operator: { operatorName: string };
};

export async function GET() {
  return feed(
    { source: "Digitraffic Rail", key: "trains", ttlMs: 20_000 },
    async () => {
      const [locs, meta] = await Promise.allSettled([
        fetchJson<TrainLocation[]>("https://rata.digitraffic.fi/api/v1/train-locations/latest", { timeout: 10000 }),
        fetchJson<TrainMeta[]>("https://rata.digitraffic.fi/api/v1/trains/latest", { timeout: 12000 }),
      ]);
      if (locs.status !== "fulfilled") throw new Error("rail feed unavailable");
      const names = new Map<string, TrainMeta>();
      if (meta.status === "fulfilled")
        for (const t of meta.value) names.set(`${t.trainNumber}-${t.departureDate}`, t);
      const trains = locs.value.map((t) => {
        const [lon, lat] = t.location.coordinates;
        const m = names.get(`${t.trainNumber}-${t.departureDate}`);
        return {
          id: `${t.trainNumber}-${t.departureDate}`,
          number: t.trainNumber,
          lat,
          lon,
          speed: t.speed,
          type: m?.trainType ?? "Train",
          operator: m?.operator?.operatorName ?? "VR",
          timestamp: t.timestamp,
        };
      });
      return { trains, source: "Digitraffic (Finland)", updated: new Date().toISOString() };
    },
    { count: (v) => v.trains.length, note: "Live rail positions — Finland open data" },
  );
}
