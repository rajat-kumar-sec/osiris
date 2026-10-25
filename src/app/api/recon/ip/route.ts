import { NextResponse } from "next/server";
import net from "node:net";
import dns from "node:dns/promises";
import { lookupIp } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`ip:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  let q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ ok: false, error: "provide an IP or hostname" }, { status: 400 });

  try {
    if (net.isIP(q) === 0) {
      const addrs = await dns.lookup(q, { all: true });
      if (!addrs.length) throw new Error("hostname did not resolve");
      q = addrs[0].address;
    }
    const data = await lookupIp(q);
    return NextResponse.json({ ok: true, data, meta: { source: "ipwho.is / PTR", fetchedAt: new Date().toISOString(), latencyMs: 0 } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "IP lookup failed" }, { status: 502 });
  }
}
