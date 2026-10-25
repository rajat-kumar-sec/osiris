"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Envelope, FeedMeta } from "./types";

export function useFeed<T>(
  url: string | null,
  intervalMs = 0,
  enabled = true,
): { data: T | null; meta: FeedMeta | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<FeedMeta | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled && url));
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const active = useRef(true);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    const run = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(run, Math.max(5000, intervalMs));
        return;
      }
      try {
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        const json = (await res.json()) as Envelope<T>;
        if (cancelled || !active.current) return;
        if (json.ok && json.data != null) {
          setData(json.data);
          setMeta(json.meta);
          setError(null);
        } else {
          setError(json.error ?? "feed unavailable");
          if (json.meta) setMeta(json.meta);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "network error");
      } finally {
        if (!cancelled) {
          setLoading(false);
          if (intervalMs > 0) timer = setTimeout(run, intervalMs);
        }
      }
    };

    setLoading((prev) => (data === null ? true : prev));
    void run();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, intervalMs, nonce]);

  return { data, meta, loading, error, refresh };
}

export function relativeTime(iso: string | number | undefined): string {
  if (!iso) return "—";
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  if (abs < 45_000) return "just now";
  const mins = Math.round(abs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function fmtNum(n: number | undefined | null, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtCoord(lat: number, lon: number, masked = false): string {
  if (masked) return "██.███° / ███.███°";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns} ${Math.abs(lon).toFixed(3)}°${ew}`;
}

export function fmtUtc(d = new Date()): string {
  return d.toISOString().slice(11, 19);
}

export function compass(deg = 0): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

export function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function timeOfDay(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(11, 16) + "Z" : "—";
}
