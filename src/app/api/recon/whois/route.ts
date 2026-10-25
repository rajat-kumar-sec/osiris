import { NextResponse } from "next/server";
import net from "node:net";
import { lookupWhois } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`whois:${clientIp(req)}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q || (!net.isIP(q) && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(q))) {
    return NextResponse.json({ ok: false, error: "provide a valid domain or IP" }, { status: 400 });
  }

  try {
    const data = await lookupWhois(q);
    return NextResponse.json({ ok: true, data, meta: { source: "RDAP", fetchedAt: new Date().toISOString(), latencyMs: 0 } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "whois failed" }, { status: 502 });
  }
}
