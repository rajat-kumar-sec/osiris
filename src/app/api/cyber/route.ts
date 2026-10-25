import { feed } from "@/lib/api";
import { loadCyber } from "@/lib/feeds/cyber";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return feed(
    { source: "CISA KEV + NVD + abuse.ch", key: "cyber", ttlMs: 300_000 },
    loadCyber,
    { count: (v) => v.items.length, note: "Exploited vulnerabilities, recent CVEs and botnet C2 infrastructure" },
  );
}
