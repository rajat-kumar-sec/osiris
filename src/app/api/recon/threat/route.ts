import { NextResponse } from "next/server";
import { lookupThreat } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`threat:${clientIp(req)}`, 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q || q.length > 253) return NextResponse.json({ ok: false, error: "provide an IP or domain" }, { status: 400 });

  try {
    const data = await lookupThreat(q);
    return NextResponse.json({ ok: true, data, meta: { source: "Feodo / Tor / Spamhaus", fetchedAt: new Date().toISOString(), latencyMs: 0 } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "threat lookup failed" }, { status: 502 });
  }
}
