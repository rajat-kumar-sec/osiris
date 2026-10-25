import { NextResponse } from "next/server";
import net from "node:net";
import { lookupBgp } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`bgp:${clientIp(req)}`, 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!/^(AS\d+|\d{1,3}(\.\d{1,3}){3}|[0-9a-f:]+)$/i.test(q)) {
    return NextResponse.json({ ok: false, error: "provide an IP, prefix or ASN (e.g. AS15169)" }, { status: 400 });
  }
  if (net.isIP(q) === 0 && !/^AS\d+$/i.test(q) && !q.includes("/")) {
    return NextResponse.json({ ok: false, error: "invalid resource" }, { status: 400 });
  }

  try {
    const data = await lookupBgp(q);
    return NextResponse.json({ ok: true, data, meta: { source: "RIPEstat", fetchedAt: new Date().toISOString(), latencyMs: 0 } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "BGP lookup failed" }, { status: 502 });
  }
}
