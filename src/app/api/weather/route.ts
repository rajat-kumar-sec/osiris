import { feed } from "@/lib/api";
import { loadRadar, loadWeatherAlerts } from "@/lib/feeds/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const what = searchParams.get("type") ?? "radar";

  if (what === "alerts") {
    return feed(
      { source: "NOAA NWS", key: "nws:alerts", ttlMs: 120_000 },
      loadWeatherAlerts,
      { count: (v) => v.alerts.length },
    );
  }

  if (what === "point") {
    const lat = Number(searchParams.get("lat"));
    const lon = Number(searchParams.get("lon"));
    return feed(
      { source: "Open-Meteo", key: `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`, ttlMs: 300_000 },
      async () => {
        const { loadPointWeather } = await import("@/lib/feeds/weather");
        return loadPointWeather(lat, lon);
      },
    );
  }

  return feed(
    { source: "RainViewer", key: "radar", ttlMs: 120_000 },
    loadRadar,
    { count: (v) => v.frames.length },
  );
}
