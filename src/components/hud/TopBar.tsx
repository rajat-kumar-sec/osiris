"use client";

import { Search, ShieldOff, Radio, Menu, X } from "lucide-react";
import { useOsiris } from "@/lib/store";
import { useFeed } from "@/lib/client";

export default function TopBar() {
  const setTool = useOsiris((s) => s.setTool);
  const activeTool = useOsiris((s) => s.activeTool);
  const ghost = useOsiris((s) => s.ghost);
  const toggleGhost = useOsiris((s) => s.toggleGhost);
  const railOpen = useOsiris((s) => s.railOpen);
  const setRailOpen = useOsiris((s) => s.setRailOpen);

  const stats = useFeed<{ status: string; cachedFeeds: number; uptimeSec: number }>("/api/stats", 30_000);
  const live = stats.data?.status === "operational";

  return (
    <header className="top-bar">
      <button className="brand" onClick={() => setTool(null)} aria-label="OSIRIS home">
        <svg className="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="17.2" stroke="#d4af37" strokeWidth="1" opacity="0.5" />
          <circle cx="20" cy="20" r="12.4" stroke="#f3d97f" strokeWidth="0.8" opacity="0.35" strokeDasharray="2 3" />
          <path d="M20 3.2 24.4 15.6 36.8 20 24.4 24.4 20 36.8 15.6 24.4 3.2 20 15.6 15.6Z" fill="#d4af37" opacity="0.92" />
          <circle cx="20" cy="20" r="3.1" fill="#06060c" />
          <circle cx="20" cy="20" r="1.4" fill="#f3d97f" />
        </svg>
        <span className="brand-text">
          <span className="brand-title">OSIRIS</span>
          <span className="brand-sub">OPEN SOURCE INTELLIGENCE</span>
        </span>
      </button>

      <span className="brand-tag" aria-hidden="true">
        REAL-TIME GLOBAL MONITORING · FLIGHTS · MARITIME · SATELLITES · CCTV · WEATHER · CYBER THREATS
      </span>

      <div className="top-actions">
        <button
          className="top-status desktop-only"
          onClick={toggleGhost}
          title="Toggle ghost protocol"
          aria-label="Connection status — toggle ghost protocol"
        >
          <span className={`status-dot ${live ? "" : "connecting"}`} />
          <span>
            STATUS: <b>{ghost ? "GHOST" : live ? "LIVE" : "LINKING"}</b>
          </span>
          <span className="ver">V5.0</span>
          {ghost ? <ShieldOff size={11} /> : <Radio size={11} />}
        </button>

        <button className="top-icon desktop-only" onClick={() => setTool("search")} title="Search (Ctrl+K)" aria-label="Search">
          <Search size={14} />
        </button>

        <button className="pill pill-gold desktop-only" onClick={() => setTool("markets")} title="Live markets">
          <span className="token-glyph">◈</span> $OSIRIS
        </button>

        <a className="pill desktop-only" href="/docs">
          SUPPORT
        </a>

        <button
          className="top-icon mobile-only"
          onClick={() => setRailOpen(!railOpen)}
          title="Toggle layers"
          aria-label="Toggle layers"
        >
          <Menu size={14} />
        </button>

        {activeTool && (
          <button className="top-icon" onClick={() => setTool(null)} title="Close panel" aria-label="Close panel">
            <X size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
