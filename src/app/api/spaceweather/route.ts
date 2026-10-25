import { feed } from "@/lib/api";
import { loadSpaceWeather } from "@/lib/feeds/space";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return feed(
    { source: "NOAA SWPC", key: "spaceweather", ttlMs: 120_000 },
    loadSpaceWeather,
  );
}
