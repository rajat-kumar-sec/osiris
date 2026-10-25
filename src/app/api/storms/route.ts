import { feed } from "@/lib/api";
import { loadStorms } from "@/lib/feeds/hazards";
import { loadGdacsStorms } from "@/lib/feeds/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return feed(
    { source: "NOAA NHC + GDACS", key: "storms", ttlMs: 180_000 },
    async () => {
      const [nhc, gdacs] = await Promise.all([loadStorms(), loadGdacsStorms()]);
      const seen = new Set<string>();
      const storms = [...nhc.storms, ...gdacs].filter((s) => {
        const key = `${s.name}-${Math.round(s.lat)}-${Math.round(s.lon)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { storms, source: nhc.source };
    },
    { count: (v) => v.storms.length },
  );
}
