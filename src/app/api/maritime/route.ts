import { feed } from "@/lib/api";
import { loadAisStream, loadDigitraffic } from "@/lib/feeds/maritime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const span = Number(searchParams.get("span") ?? 8);
  const hasAis = Boolean(process.env.AISSTREAM_API_KEY);

  if (hasAis && Number.isFinite(lat) && Number.isFinite(lon)) {
    const key = `ships:global:${lat.toFixed(1)}:${lon.toFixed(1)}:${span}`;
    return feed(
      { source: "AISStream", key, ttlMs: 20_000 },
      async () => {
        const vessels = await loadAisStream(
          Math.max(-85, lat - span),
          lon - span * 1.5,
          Math.min(85, lat + span),
          lon + span * 1.5,
        );
        return { vessels, source: "AISStream (global AIS)", region: "Viewport", updated: new Date().toISOString() };
      },
      { count: (v) => v.vessels.length, note: "Live global AIS via aisstream.io WebSocket" },
    );
  }

  return feed(
    { source: "Digitraffic AIS", key: "ships:baltic", ttlMs: 25_000 },
    loadDigitraffic,
    {
      count: (v) => v.vessels.length,
      note: hasAis ? "Global AIS key detected — pan the map to stream local vessels" : "Free open AIS: Baltic/Nordic. Add AISSTREAM_API_KEY for global coverage.",
    },
  );
}
