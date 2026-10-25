import { NextResponse } from "next/server";
import { serve } from "./cache";
import type { Envelope, FeedMeta } from "./types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type FeedOptions = {
  source: string;
  key: string;
  ttlMs: number;
  timeoutMs?: number;
};

/** Wrap an upstream loader in the standard OSIRIS envelope + SWR cache. */
export async function feed<T>(
  opts: FeedOptions,
  loader: () => Promise<T>,
  extra?: { count?: (v: T) => number; note?: string },
): Promise<NextResponse<Envelope<T>>> {
  const started = Date.now();
  try {
    const result = await serve(opts.key, opts.ttlMs, opts.source, loader);
    const meta: FeedMeta = {
      source: result.source,
      fetchedAt: new Date(result.at).toISOString(),
      latencyMs: Date.now() - started,
      count: extra?.count ? extra.count(result.value) : undefined,
      stale: result.stale,
      cached: result.cached,
      note: extra?.note,
    };
    return NextResponse.json(
      { ok: true, data: result.value, meta },
      { headers: { "X-OSIRIS-Source": opts.source, "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream unavailable";
    const meta: FeedMeta = {
      source: opts.source,
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      note: extra?.note,
    };
    return NextResponse.json(
      { ok: false, data: null as unknown as T, meta, error: message },
      { status: 200, headers: { "X-OSIRIS-Source": opts.source, "Cache-Control": "no-store" } },
    );
  }
}

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function jsonOk<T>(data: T, meta?: Partial<FeedMeta>) {
  return NextResponse.json({
    ok: true,
    data,
    meta: { source: "osiris", fetchedAt: new Date().toISOString(), latencyMs: 0, ...meta },
  });
}
