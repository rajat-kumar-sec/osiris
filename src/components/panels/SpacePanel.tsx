"use client";

import { useMemo, useState } from "react";
import { Orbit, Radio, Sun, Zap } from "lucide-react";
import Panel, { Empty, Loading } from "./Panel";
import { useFeed, fmtNum, timeOfDay } from "@/lib/client";
import { flyTo } from "@/lib/mapBus";
import { useOsiris } from "@/lib/store";
import { describe } from "@/lib/describe";
import type { SatellitePosition, SpaceWeather } from "@/lib/types";

const GROUPS: { id: string; label: string }[] = [
  { id: "stations", label: "STATIONS" },
  { id: "gps-ops", label: "GPS" },
  { id: "weather", label: "WEATHER" },
  { id: "science", label: "SCIENCE" },
  { id: "starlink", label: "STARLINK" },
  { id: "active", label: "ALL ACTIVE" },
];

export default function SpacePanel() {
  const [tab, setTab] = useState<"orbital" | "weather">("orbital");
  const [group, setGroup] = useState("stations");
  const select = useOsiris((s) => s.select);

  const sats = useFeed<{ satellites: SatellitePosition[]; tleCount: number; epoch: string }>(
    `/api/satellites?group=${group}`,
    60_000,
    tab === "orbital",
  );
  const sw = useFeed<SpaceWeather>("/api/spaceweather", 120_000, tab === "weather");

  const filtered = useMemo(() => {
    const list = sats.data?.satellites ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 80);
  }, [sats.data]);

  return (
    <Panel
      tool="space"
      title="SPACE"
      subtitle="Orbital tracking · space weather"
      icon={Orbit}
      tabs={[
        { id: "orbital", label: "Orbital", active: tab === "orbital", onClick: () => setTab("orbital") },
        { id: "weather", label: "Space Weather", active: tab === "weather", onClick: () => setTab("weather") },
      ]}
    >
      {tab === "orbital" ? (
        <>
          <div className="pill-row">
            {GROUPS.map((g) => (
              <button key={g.id} className={`pill ${group === g.id ? "active" : ""}`} onClick={() => setGroup(g.id)}>
                {g.label}
              </button>
            ))}
          </div>

          <div className="stat-grid">
            <div className="stat">
              <div className="s-label">Objects tracked</div>
              <div className="s-value">{fmtNum(sats.data?.satellites.length ?? 0)}</div>
            </div>
            <div className="stat">
              <div className="s-label">TLE catalogue</div>
              <div className="s-value">{fmtNum(sats.data?.tleCount ?? 0)}</div>
            </div>
          </div>

          <div className="section-label">Objects · SGP4 propagated</div>
          {sats.loading && <Loading label="Propagating orbital elements" />}
          {!sats.loading && filtered.length === 0 && <Empty label="No objects in this group" />}
          <div className="list">
            {filtered.map((s) => (
              <button
                key={`${s.id}-${s.name}`}
                className="list-item"
                onClick={() => {
                  flyTo(s.lat, s.lon, 3.4);
                  select(describe("satellite", JSON.stringify(s), s.lat, s.lon));
                }}
              >
                <div className="li-top">
                  <span style={{ color: "var(--gold)", fontSize: 8 }}>◆</span>
                  <span className="li-title" style={{ flex: 1 }}>{s.name}</span>
                  <span className="li-meta">{s.category}</span>
                </div>
                <div className="li-meta">
                  ALT {s.altitude.toFixed(0)} KM · VEL {s.velocity.toFixed(2)} KM/S · {s.lat.toFixed(2)}, {s.lon.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 9 }}>
            Positions computed in-browser from CelesTrak GP elements. Source epoch: {sats.data?.epoch ? timeOfDay(sats.data.epoch) : "—"}.
          </p>
        </>
      ) : (
        <>
          {sw.loading && <Loading label="Acquiring NOAA SWPC products" />}
          {sw.data && (
            <>
              <div className="stat-grid">
                <div className="stat">
                  <div className="s-label">Planetary K-index</div>
                  <div className="s-value" style={{ color: sw.data.kp >= 5 ? "var(--danger)" : "var(--gold-bright)" }}>
                    {sw.data.kp.toFixed(1)}
                  </div>
                </div>
                <div className="stat">
                  <div className="s-label">Solar wind</div>
                  <div className="s-value">
                    {sw.data.solarWind.speed.toFixed(0)}
                    <small>km/s</small>
                  </div>
                </div>
                <div className="stat">
                  <div className="s-label">Bz</div>
                  <div className="s-value">
                    {sw.data.solarWind.bz.toFixed(1)}
                    <small>nT</small>
                  </div>
                </div>
                <div className="stat">
                  <div className="s-label">Density</div>
                  <div className="s-value">
                    {sw.data.solarWind.density.toFixed(1)}
                    <small>p/cc</small>
                  </div>
                </div>
              </div>

              <div className="section-label">NOAA scales</div>
              <div className="kv">
                <dt>Radio blackout</dt>
                <dd>R{sw.data.scales.r}</dd>
                <dt>Solar radiation</dt>
                <dd>S{sw.data.scales.s}</dd>
                <dt>Geomagnetic</dt>
                <dd>G{sw.data.scales.g}</dd>
              </div>

              <div className="section-label">Recent flares</div>
              {sw.data.flares.length === 0 ? (
                <Empty label="No flares in the last 7 days" />
              ) : (
                <div className="list">
                  {sw.data.flares.slice(0, 10).map((f, i) => (
                    <div className="list-item" key={`${f.time}-${i}`}>
                      <div className="li-top">
                        <Zap size={10} style={{ color: f.klass.startsWith("X") ? "var(--danger)" : "var(--warn)" }} />
                        <span className="li-title" style={{ flex: 1 }}>{f.klass}</span>
                        <span className="li-meta">{timeOfDay(f.time)}</span>
                      </div>
                      <div className="li-meta">Active region {f.region ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="section-label">Kp history</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 44 }}>
                {sw.data.kpForecast.slice(-24).map((p, i) => (
                  <div
                    key={`${p.time}-${i}`}
                    title={`${p.time} · Kp ${p.kp}`}
                    style={{
                      flex: 1,
                      height: `${Math.max(6, (p.kp / 9) * 100)}%`,
                      background: p.kp >= 5 ? "var(--danger)" : "var(--gold)",
                      opacity: 0.35 + (i / 24) * 0.65,
                      borderRadius: 1,
                    }}
                  />
                ))}
              </div>
              <p className="hint" style={{ marginTop: 9 }}>
                <Radio size={9} style={{ verticalAlign: "-1px" }} /> NOAA Space Weather Prediction Center · updated{" "}
                {timeOfDay(sw.data.updated)}
              </p>
              <p className="hint">
                <Sun size={9} style={{ verticalAlign: "-1px" }} /> Kp ≥ 5 indicates geomagnetic storm conditions.
              </p>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
