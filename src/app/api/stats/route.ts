import { NextResponse } from "next/server";
import { cacheStats } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const boot = Date.now();

export async function GET() {
  const stats = cacheStats();
  return NextResponse.json({
    ok: true,
    data: {
      version: "5.0.0",
      status: "operational",
      uptimeSec: Math.round((Date.now() - boot) / 1000),
      serverTime: new Date().toISOString(),
      cachedFeeds: stats.keys,
      redis: stats.redis,
      feeds: [
        { id: "flights", source: "adsb.lol / OpenSky", cadence: "9 s" },
        { id: "satellites", source: "CelesTrak", cadence: "60 s" },
        { id: "earthquakes", source: "USGS", cadence: "45 s" },
        { id: "fires", source: "NASA FIRMS / EONET", cadence: "5 min" },
        { id: "maritime", source: "Digitraffic / AISStream", cadence: "25 s" },
        { id: "cctv", source: "Caltrans + TfL", cadence: "10 min" },
        { id: "cyber", source: "CISA KEV + NVD", cadence: "5 min" },
        { id: "news", source: "GDELT", cadence: "3 min" },
        { id: "markets", source: "Yahoo + CoinGecko", cadence: "90 s" },
        { id: "spaceweather", source: "NOAA SWPC", cadence: "2 min" },
        { id: "gpsjam", source: "gpsjam.org", cadence: "15 min" },
        { id: "cables", source: "TeleGeography", cadence: "24 h" },
        { id: "nuclear", source: "Wikidata", cadence: "7 d" },
        { id: "trains", source: "Digitraffic", cadence: "20 s" },
      ],
      layers: 19,
      tools: 12,
    },
    meta: { source: "osiris", fetchedAt: new Date().toISOString(), latencyMs: 0 },
  });
}
