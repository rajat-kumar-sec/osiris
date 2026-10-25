"use client";

import { useEffect, useRef, useState } from "react";
import { useOsiris } from "@/lib/store";

const STEPS = [
  "initialising geospatial engine",
  "mounting 3d globe renderer",
  "linking adsb.lol aviation grid",
  "syncing celtrak orbital elements",
  "attaching usgs seismic feed",
  "loading noaa weather products",
  "indexing cisa kev + nvd intel",
  "calibrating sigint recon suite",
  "verifying surveillance relays",
  "osiris online",
];

export default function BootScreen() {
  const booted = useOsiris((s) => s.booted);
  const setBooted = useOsiris((s) => s.setBooted);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (booted) return;
    let i = 0;
    const start = Date.now();

    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / 2400) * 100));
      setProgress(pct);

      const nextIndex = Math.min(STEPS.length, Math.floor((elapsed / 2400) * STEPS.length) + 1);
      if (nextIndex > i) {
        i = nextIndex;
        setLogs(STEPS.slice(0, i));
      }

      if (elapsed >= 2400 && !done.current) {
        done.current = true;
        clearInterval(tick);
        setProgress(100);
        setLogs(STEPS);
        window.setTimeout(() => setLeaving(true), 180);
        window.setTimeout(() => setBooted(true), 820);
      }
    }, 55);

    return () => clearInterval(tick);
  }, [booted, setBooted]);

  if (booted) return null;

  return (
    <div className={`boot ${leaving ? "leaving" : ""}`}>
      <div className="boot-grid" />
      <div className="boot-inner">
        <div className="boot-version">OSIRIS · GLOBAL INTELLIGENCE · V5.0</div>
        <h1 className="boot-title">OSIRIS</h1>
        <div className="boot-sub">OPEN SOURCE INTELLIGENCE PLATFORM</div>

        <div className="boot-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="boot-meta">
          <span>INITIALISING SUBSYSTEMS</span>
          <span>{progress.toString().padStart(3, "0")}%</span>
        </div>

        <div className="boot-log">
          {logs.map((line, i) => (
            <div key={line}>
              <span>{String(i + 1).padStart(2, "0")} //</span> {line}
            </div>
          ))}
        </div>

        <button
          className="boot-skip"
          onClick={() => {
            done.current = true;
            setProgress(100);
            setLogs(STEPS);
            setLeaving(true);
            window.setTimeout(() => setBooted(true), 600);
          }}
        >
          skip sequence →
        </button>
      </div>
    </div>
  );
}
