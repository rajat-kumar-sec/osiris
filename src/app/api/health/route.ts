import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "operational",
      version: "5.0.0",
      service: "OSIRIS Global Intelligence Platform",
      time: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      runtime: "nodejs",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
