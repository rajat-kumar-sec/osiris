import { NextResponse } from "next/server";
import { clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const h = req.headers;
  const headerLat = Number(h.get("x-vercel-ip-latitude") ?? h.get("cf-iplatitude"));
  const headerLon = Number(h.get("x-vercel-ip-longitude") ?? h.get("cf-iplongitude"));
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? "";
  const city = h.get("x-vercel-ip-city") ?? "";

  if (Number.isFinite(headerLat) && Number.isFinite(headerLon) && (headerLat !== 0 || headerLon !== 0)) {
    return NextResponse.json({
      ok: true,
      data: { lat: headerLat, lon: headerLon, city: decodeURIComponent(city), country, source: "edge-geo" },
      meta: { source: "edge", fetchedAt: new Date().toISOString(), latencyMs: 0 },
    });
  }

  const ip = clientIp(req);
  try {
    if (ip !== "127.0.0.1" && ip !== "::1") {
      const res = await fetch(`https://ipwho.is/${ip}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "OSIRIS/5.0" },
      });
      const data = (await res.json()) as {
        success?: boolean;
        latitude?: number;
        longitude?: number;
        city?: string;
        country?: string;
      };
      if (data.success && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
        return NextResponse.json({
          ok: true,
          data: { lat: data.latitude, lon: data.longitude, city: data.city ?? "", country: data.country ?? "", source: "ip-geo" },
          meta: { source: "ipwho.is", fetchedAt: new Date().toISOString(), latencyMs: 0 },
        });
      }
    }
  } catch {
    /* fall through */
  }

  return NextResponse.json({
    ok: true,
    data: { lat: 20, lon: 0, city: "", country, source: "default" },
    meta: { source: "default", fetchedAt: new Date().toISOString(), latencyMs: 0 },
  });
}
