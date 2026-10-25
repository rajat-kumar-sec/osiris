import { feed } from "@/lib/api";
import { loadCctv } from "@/lib/feeds/surveillance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region") ?? "all";
  return feed(
    { source: "Caltrans + TfL", key: `cctv:${region}`, ttlMs: 600_000 },
    () => loadCctv(region, 1800),
    { count: (v) => v.cameras.length, note: "Public traffic cameras with live HLS / JPEG streams" },
  );
}
