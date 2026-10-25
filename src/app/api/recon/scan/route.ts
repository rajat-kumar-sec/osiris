import { NextResponse } from "next/server";
import { scanPorts, TOP_100 } from "@/lib/feeds/recon";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const WEB_PORTS = [80, 443, 3000, 5000, 8000, 8080, 8081, 8443, 8888, 9443, 9000, 9090];

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = Number(process.env.SCAN_RATE_PER_HOUR ?? 20);
  const rl = rateLimit(`scan:${ip}`, limit, 3_600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: `scan budget exhausted (${limit}/hour). Retry in ${Math.ceil(rl.resetMs / 1000)}s.` },
      { status: 429 },
    );
  }

  let body: { host?: string; ports?: number[]; preset?: string; authorized?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (body.authorized !== true) {
    return NextResponse.json(
      { ok: false, error: "You must confirm you own or are explicitly authorized to test this target." },
      { status: 403 },
    );
  }

  const host = String(body.host ?? "").trim();
  if (!host) return NextResponse.json({ ok: false, error: "target host is required" }, { status: 400 });

  let ports: number[];
  if (Array.isArray(body.ports) && body.ports.length) ports = body.ports.map(Number).slice(0, 1024);
  else if (body.preset === "web") ports = WEB_PORTS;
  else if (body.preset === "full") ports = Array.from({ length: 1024 }, (_, i) => i + 1);
  else ports = TOP_100;

  try {
    const result = await scanPorts(
      host,
      ports,
      Number(process.env.SCAN_TIMEOUT_MS ?? 1200),
      Number(process.env.SCAN_CONCURRENCY ?? 96),
    );
    return NextResponse.json({
      ok: true,
      data: result,
      meta: {
        source: "OSIRIS TCP scanner",
        fetchedAt: new Date().toISOString(),
        latencyMs: result.durationMs,
        remaining: rl.remaining,
        note: "Authorized testing only. TCP connect scan — no raw packets.",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "scan failed", remaining: rl.remaining },
      { status: 400 },
    );
  }
}
