import { NextResponse } from "next/server";
import { lookupDns } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DOMAIN_RE = /^(?!-)[a-z0-9_*-]{1,63}(\.(?!-)[a-z0-9_-]{1,63})+$/i;

export async function GET(req: Request) {
  const rl = rateLimit(`dns:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("name") ?? "").trim().toLowerCase();
  const typesParam = searchParams.get("types") ?? "A,AAAA,MX,TXT,NS,CNAME,SOA,CAA";
  const types = typesParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 12);

  if (!DOMAIN_RE.test(name)) return NextResponse.json({ ok: false, error: "invalid domain name" }, { status: 400 });

  try {
    const data = await lookupDns(name, types);
    return NextResponse.json({ ok: true, data, meta: { source: "Cloudflare DoH", fetchedAt: new Date().toISOString(), latencyMs: 0 } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "lookup failed" }, { status: 502 });
  }
}
