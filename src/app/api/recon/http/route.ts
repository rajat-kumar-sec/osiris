import { NextResponse } from "next/server";
import { inspectHttp } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`http:${clientIp(req)}`, 40, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!/^(https?:\/\/)?[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(q)) {
    return NextResponse.json({ ok: false, error: "provide a URL or hostname" }, { status: 400 });
  }

  try {
    const data = await inspectHttp(q);
    return NextResponse.json({ ok: true, data, meta: { source: "HTTP fingerprint", fetchedAt: new Date().toISOString(), latencyMs: data.latencyMs } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "HTTP inspection failed" }, { status: 502 });
  }
}
