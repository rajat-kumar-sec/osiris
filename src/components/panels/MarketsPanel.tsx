"use client";

import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import Panel, { Empty, Loading } from "./Panel";
import { useFeed, fmtNum, relativeTime } from "@/lib/client";
import type { MarketQuote } from "@/lib/types";

const GROUPS: { id: MarketQuote["group"] | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "index", label: "INDICES" },
  { id: "crypto", label: "CRYPTO" },
  { id: "defense", label: "DEFENSE" },
  { id: "energy", label: "ENERGY" },
  { id: "commodity", label: "COMMODITIES" },
  { id: "fx", label: "FX" },
];

function Spark({ values, up }: { values?: number[]; up: boolean }) {
  if (!values || values.length < 2) return <span className="spark" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 48;
      const y = 15 - ((v - min) / span) * 13;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="spark" viewBox="0 0 48 16" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? "#56d68b" : "#ff5f56"} strokeWidth="1.2" />
    </svg>
  );
}

export default function MarketsPanel() {
  const [group, setGroup] = useState<MarketQuote["group"] | "all">("all");
  const markets = useFeed<{ quotes: MarketQuote[]; errors: string[] }>("/api/markets", 90_000);

  const quotes = useMemo(() => {
    const all = markets.data?.quotes ?? [];
    return group === "all" ? all : all.filter((q) => q.group === group);
  }, [markets.data, group]);

  const gainers = useMemo(
    () => (markets.data?.quotes ?? []).filter((q) => q.changePct > 0).length,
    [markets.data],
  );
  const losers = useMemo(
    () => (markets.data?.quotes ?? []).filter((q) => q.changePct < 0).length,
    [markets.data],
  );

  return (
    <Panel tool="markets" title="MARKETS" subtitle="Live equities · energy · crypto" icon={TrendingUp}>
      <div className="stat-grid">
        <div className="stat">
          <div className="s-label">Instruments</div>
          <div className="s-value">{markets.data?.quotes.length ?? 0}</div>
        </div>
        <div className="stat">
          <div className="s-label">Breadth</div>
          <div className="s-value" style={{ fontSize: 13 }}>
            <span className="up">{gainers}↑</span> <span className="down">{losers}↓</span>
          </div>
        </div>
      </div>

      <div className="pill-row" style={{ marginTop: 11 }}>
        {GROUPS.map((g) => (
          <button key={g.id} className={`pill ${group === g.id ? "active" : ""}`} onClick={() => setGroup(g.id)}>
            {g.label}
          </button>
        ))}
      </div>

      {markets.loading && <Loading label="Streaming market quotes" />}
      {!markets.loading && quotes.length === 0 && <Empty label="No quotes in this group" />}
      {markets.data && (
        <>
          <div className="market-row" style={{ borderBottomColor: "var(--line)" }}>
            <span className="market-sym">SYMBOL</span>
            <span className="market-name">INSTRUMENT</span>
            <span className="market-chg" style={{ color: "var(--muted-2)" }}>24H</span>
            <span className="market-price" style={{ color: "var(--muted-2)" }}>LAST</span>
          </div>
          {quotes.map((q) => (
            <div className="market-row" key={q.symbol}>
              <span className="market-sym">{q.symbol}</span>
              <span className="market-name">{q.name}</span>
              <Spark values={q.spark} up={q.changePct >= 0} />
              <span className={`market-chg ${q.changePct >= 0 ? "up" : "down"}`}>
                {q.changePct >= 0 ? "+" : ""}
                {q.changePct.toFixed(2)}%
              </span>
              <span className="market-price">
                {q.price >= 1000 ? fmtNum(q.price, 2) : q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <p className="hint" style={{ marginTop: 10 }}>
            Yahoo Finance + CoinGecko · refreshed {relativeTime(markets.meta?.fetchedAt)}
          </p>
        </>
      )}
    </Panel>
  );
}
