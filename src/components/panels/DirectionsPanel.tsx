"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Navigation, Route } from "lucide-react";
import Panel, { Empty, Loading } from "./Panel";
import { mapCommand, sharedMap } from "@/lib/mapBus";
import { useOsiris } from "@/lib/store";

type Place = { name: string; detail: string; lat: number; lon: number };

function PlaceInput({
  label,
  placeholder,
  onPick,
  value,
  setValue,
}: {
  label: string;
  placeholder: string;
  onPick: (p: Place) => void;
  value: string;
  setValue: (v: string) => void;
}) {
  const [hits, setHits] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setHits((json.data?.results ?? []).slice(0, 6));
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 380);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  return (
    <div className="field" style={{ position: "relative" }}>
      <label>{label}</label>
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        spellCheck={false}
        autoComplete="off"
      />
      {open && hits.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 5,
            background: "var(--panel-solid)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
            maxHeight: 190,
            overflowY: "auto",
          }}
        >
          {hits.map((h) => (
            <button
              key={`${h.lat}-${h.lon}-${h.name}`}
              className="list-item"
              style={{ borderRadius: 0, borderWidth: 0, borderBottom: "1px solid var(--line-soft)" }}
              onClick={() => {
                onPick(h);
                setValue(h.name);
                setOpen(false);
              }}
            >
              <div className="li-title">{h.name}</div>
              <div className="li-meta">{h.detail}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectionsPanel() {
  const route = useOsiris((s) => s.route);
  const setRoute = useOsiris((s) => s.setRoute);
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [mode, setMode] = useState<"driving" | "walking" | "cycling">("driving");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ instruction: string; road: string; distanceM: number }[]>([]);

  async function build() {
    if (!from || !to) {
      setError("Choose both an origin and a destination.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/directions?from=${from.lat},${from.lon}&to=${to.lat},${to.lon}&mode=${mode}`,
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "routing failed");
      const data = json.data as {
        coordinates: [number, number][];
        distanceKm: number;
        durationMin: number;
        steps: { instruction: string; road: string; distanceM: number }[];
      };
      setRoute({ coordinates: data.coordinates, distanceKm: data.distanceKm, durationMin: data.durationMin });
      setSteps(data.steps);
      const lons = data.coordinates.map((c) => c[0]);
      const lats = data.coordinates.map((c) => c[1]);
      mapCommand({
        type: "flyToBounds",
        bbox: [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "routing failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      tool="directions"
      title="DIRECTIONS"
      subtitle="Multi-modal routing · OSRM"
      icon={Navigation}
      actions={
        <button
          className="btn btn-sm"
          onClick={() => {
            const map = sharedMap.current;
            if (!map) return;
            const c = map.getCenter();
            const label = `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
            setFrom({ name: label, detail: "Map centre", lat: c.lat, lon: c.lng });
            setFromText(label);
          }}
          title="Use map centre as origin"
        >
          <Crosshair size={10} /> CENTRE
        </button>
      }
    >
      <PlaceInput label="Origin" placeholder="Search a place or address" value={fromText} setValue={setFromText} onPick={setFrom} />
      <PlaceInput label="Destination" placeholder="Search a place or address" value={toText} setValue={setToText} onPick={setTo} />

      <div className="field">
        <label htmlFor="route-mode">Mode</label>
        <select id="route-mode" className="select" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="driving">Driving</option>
          <option value="walking">Walking</option>
          <option value="cycling">Cycling</option>
        </select>
      </div>

      <button className="btn btn-primary btn-block" onClick={() => void build()} disabled={loading}>
        {loading ? <span className="spinner" /> : <Route size={12} />} CALCULATE ROUTE
      </button>

      {error && <p className="hint" style={{ color: "#ff9b94", marginTop: 9 }}>{error}</p>}
      {loading && <Loading label="Solving route" />}

      {route && (
        <>
          <div className="stat-grid" style={{ marginTop: 12 }}>
            <div className="stat">
              <div className="s-label">Distance</div>
              <div className="s-value">
                {route.distanceKm.toFixed(1)}
                <small>km</small>
              </div>
            </div>
            <div className="stat">
              <div className="s-label">Duration</div>
              <div className="s-value">
                {Math.round(route.durationMin)}
                <small>min</small>
              </div>
            </div>
          </div>

          <div className="section-label">Turn list</div>
          {steps.length === 0 ? (
            <Empty label="No turn instructions" />
          ) : (
            <div className="list">
              {steps.map((s, i) => (
                <div className="list-item" key={i}>
                  <div className="li-top">
                    <span className="badge">{i + 1}</span>
                    <span className="li-title" style={{ flex: 1, textTransform: "capitalize" }}>{s.instruction}</span>
                  </div>
                  <div className="li-meta">
                    {s.road || "unnamed road"} · {(s.distanceM / 1000).toFixed(2)} km
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-sm"
            style={{ marginTop: 10, width: "100%" }}
            onClick={() => {
              setRoute(null);
              setSteps([]);
            }}
          >
            CLEAR ROUTE
          </button>
        </>
      )}

      <p className="hint" style={{ marginTop: 10 }}>
        Routing by OSRM open data. Distances are indicative; always verify locally.
      </p>
    </Panel>
  );
}
