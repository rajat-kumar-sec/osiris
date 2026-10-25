"use client";

import { useFeed } from "@/lib/client";
import type { MarketQuote, Quake } from "@/lib/types";

function price(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

function pct(n: number) {
  const s = `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
  return s;
}

function Tick({ q, color }: { q: MarketQuote; color: string }) {
  const up = q.changePct >= 0;
  return (
    <span className="tick" title={`${q.name} · ${q.symbol}`}>
      <span className="tick-sym" style={{ color }}>
        {q.symbol}
      </span>
      <span className="tick-price">${price(q.price)}</span>
      <span className={up ? "tick-up" : "tick-down"}>{up ? "▲" : "▼"}{pct(q.changePct).replace("+", "")}</span>
    </span>
  );
}

export default function StatusBar() {
  const markets = useFeed<{ quotes: MarketQuote[] }>("/api/markets", 120_000);
  const quakes = useFeed<{ quakes: Quake[] }>("/api/earthquakes", 90_000);

  const crypto = (markets.data?.quotes ?? []).filter((q) => q.group === "crypto").slice(0, 3);
  const colors = ["var(--gold-bright)", "#8fb8ff", "#b6d46a"];
  const topQuakes = (quakes.data?.quakes ?? []).slice(0, 2);

  return (
    <footer className="status-bar">
      <span className="sb-social">
        <a href="https://discord.com" target="_blank" rel="noreferrer noopener" aria-label="Discord">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.2a18.3 18.3 0 0 0-5.6 0L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9.2-.3 13.9.2 18.5A19.9 19.9 0 0 0 6 21l1.2-1.9c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.6 0l.5.4c-.6.4-1.3.7-2 1L18 21a19.9 19.9 0 0 0 5.8-2.5c.6-5.3-.6-9.9-3.5-14.1ZM8.2 15.6c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Zm7.6 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z" />
          </svg>
        </a>
        <a href="https://x.com" target="_blank" rel="noreferrer noopener" aria-label="X">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.1 3.8H5.3L17.8 20Z" />
          </svg>
        </a>
      </span>

      <a className="sb-logo" href="/" aria-label="OSIRIS home">
        <svg width="16" height="16" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="17.2" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
          <path d="M20 5 24.2 15.8 35 20 24.2 24.2 20 35 15.8 24.2 5 20 15.8 15.8Z" fill="currentColor" />
          <circle cx="20" cy="20" r="2.8" fill="#06060c" />
        </svg>
      </a>

      <a className="sb-item sb-link" href="/docs">
        DOCS
      </a>
      <a className="sb-item sb-link" href="/privacy">
        PRIVACY
      </a>

      <span className="sb-divider" />

      <span className="ticker-group">
        {crypto.length > 0 ? (
          crypto.map((q, i) => <Tick key={q.symbol} q={q} color={colors[i % colors.length]} />)
        ) : (
          <span className="tick tick-muted">MARKETS · LINKING</span>
        )}
      </span>

      {topQuakes.length > 0 && <span className="sb-divider" />}

      <span className="ticker-group quakes">
        {topQuakes.map((q) => (
          <span className="tick quake" key={q.id} title={q.place}>
            <span className="tick-mag">M{q.mag.toFixed(1)}</span>
            <span className="tick-place">{q.place}</span>
          </span>
        ))}
      </span>

      <span className="sb-online">
        <span className="status-dot" /> ONLINE
      </span>
    </footer>
  );
}
