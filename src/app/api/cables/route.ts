import { feed } from "@/lib/api";
import { loadCables } from "@/lib/feeds/intel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return feed(
    { source: "TeleGeography", key: "cables", ttlMs: 86_400_000 },
    loadCables,
    { count: (v) => v.cables.length },
  );
}
