import { NextResponse } from "next/server";
import { inspectTls } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`ssl:${clientIp(req)}`, 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const host = (searchParams.get("host") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
    return NextResponse.json({ ok: false, error: "invalid hostname" }, { status: 400 });
  }

  try {
    const data = await inspectTls(host);
    return NextResponse.json({ ok: true, data, meta: { source: "TLS + Cert Spotter", fetchedAt: new Date().toISOString(), latencyMs: 0 } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "TLS inspection failed" }, { status: 502 });
  }
}
