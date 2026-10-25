import { NextResponse } from "next/server";
import { serve } from "@/lib/cache";
import type { Alert } from "@/lib/types";
import { loadEarthquakes, loadGdacs } from "@/lib/feeds/hazards";
import { loadStorms } from "@/lib/feeds/hazards";
import { loadWeatherAlerts } from "@/lib/feeds/weather";
import { loadKev } from "@/lib/feeds/cyber";
import { loadSpaceWeather } from "@/lib/feeds/space";
import { loadNews } from "@/lib/feeds/intel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

const sevRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export async function GET() {
  const now = Date.now();
  const alerts: Alert[] = [];

  const [quakes, storms, weather, gdacs, kev, space, news] = await Promise.allSettled([
    serve("earthquakes", 45_000, "USGS", loadEarthquakes),
    serve("storms", 180_000, "NHC/GDACS", loadStorms),
    serve("nws:alerts", 120_000, "NWS", loadWeatherAlerts),
    serve("gdacs", 300_000, "GDACS", loadGdacs),
    serve("cyber", 300_000, "CISA KEV", loadKev),
    serve("spaceweather", 120_000, "NOAA SWPC", loadSpaceWeather),
    serve("news:conflict", 180_000, "GDELT", () => loadNews("conflict")),
  ]);

  if (quakes.status === "fulfilled") {
    for (const q of quakes.value.value.quakes) {
      if (q.mag < 4.2 || now - q.time > 86400000) continue;
      alerts.push({
        id: `eq-${q.id}`,
        kind: "earthquake",
        title: `M${q.mag.toFixed(1)} earthquake — ${q.place}`,
        detail: `Depth ${q.depth.toFixed(0)} km${q.tsunami ? " · TSUNAMI FLAG" : ""}`,
        severity: q.mag >= 6.5 ? "critical" : q.mag >= 5.5 ? "high" : "medium",
        time: new Date(q.time).toISOString(),
        lat: q.lat,
        lon: q.lon,
        url: q.url,
      });
    }
  }

  if (storms.status === "fulfilled") {
    for (const s of storms.value.value.storms) {
      alerts.push({
        id: `storm-${s.id}`,
        kind: "weather",
        title: `${s.name} — ${s.category}${s.wind ? ` · ${s.wind} kt` : ""}`,
        detail: s.basin ?? "",
        severity: (s.wind ?? 0) >= 96 ? "critical" : (s.wind ?? 0) >= 64 ? "high" : "medium",
        time: new Date().toISOString(),
        lat: s.lat,
        lon: s.lon,
      });
    }
  }

  if (weather.status === "fulfilled") {
    for (const a of weather.value.value.alerts) {
      if (a.severity !== "Severe" && a.severity !== "Extreme") continue;
      if (!a.effective) continue;
      alerts.push({
        id: `wx-${a.id}`,
        kind: "weather",
        title: a.headline || a.event,
        detail: a.area.slice(0, 160),
        severity: a.severity === "Extreme" ? "critical" : "high",
        time: a.effective,
        lat: a.lat,
        lon: a.lon,
      });
    }
  }

  if (gdacs.status === "fulfilled") {
    for (const e of gdacs.value.value.events) {
      if (!/red|orange/i.test(e.alert)) continue;
      alerts.push({
        id: `gdacs-${e.id}`,
        kind: "earthquake",
        title: `${e.type} — ${e.name}`,
        detail: `GDACS ${e.alert}`,
        severity: /red/i.test(e.alert) ? "critical" : "high",
        time: e.from || new Date().toISOString(),
        lat: e.lat,
        lon: e.lon,
        url: e.url,
      });
    }
  }

  if (kev.status === "fulfilled") {
    for (const item of kev.value.value.items.filter((i) => i.ransomware).slice(0, 8)) {
      alerts.push({
        id: `kev-${item.id}`,
        kind: "cyber",
        title: `${item.id} — ${item.title}`,
        detail: `${item.vendor} ${item.product} · known ransomware use`,
        severity: "high",
        time: item.published ?? new Date().toISOString(),
        url: item.url,
      });
    }
  }

  if (space.status === "fulfilled") {
    const sw = space.value.value;
    if (sw.kp >= 5) {
      alerts.push({
        id: `space-kp-${sw.kp}`,
        kind: "space",
        title: `Geomagnetic storm — Kp ${sw.kp}`,
        detail: `Solar wind ${sw.solarWind.speed.toFixed(0)} km/s · Bz ${sw.solarWind.bz.toFixed(1)} nT`,
        severity: sw.kp >= 7 ? "critical" : "high",
        time: sw.updated,
      });
    }
    const xFlare = sw.flares.find((f) => f.klass.startsWith("X"));
    if (xFlare)
      alerts.push({
        id: `space-flare-${xFlare.time}`,
        kind: "space",
        title: `X-class solar flare ${xFlare.klass}`,
        detail: `Active region ${xFlare.region ?? "unknown"}`,
        severity: "high",
        time: xFlare.time || sw.updated,
      });
  }

  if (news.status === "fulfilled") {
    for (const a of news.value.value.articles.slice(0, 6)) {
      alerts.push({
        id: `news-${a.id}`,
        kind: "conflict",
        title: a.title.slice(0, 150),
        detail: a.source,
        severity: "low",
        time: a.published,
        lat: a.lat,
        lon: a.lon,
        url: a.url,
      });
    }
  }

  alerts.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || +new Date(b.time) - +new Date(a.time));

  return NextResponse.json({
    ok: true,
    data: { alerts: alerts.slice(0, 120) },
    meta: { source: "OSIRIS aggregation", fetchedAt: new Date().toISOString(), latencyMs: 0, count: alerts.length },
  });
}
