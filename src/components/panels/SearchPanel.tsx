"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import Panel, { Empty } from "./Panel";
import { flyTo, mapCommand } from "@/lib/mapBus";
import { useOsiris } from "@/lib/store";
import { describe } from "@/lib/describe";

type Hit = { id: string; name: string; detail: string; lat: number; lon: number; kind: string };

const QUICK = [
  { label: "New York", lat: 40.7128, lon: -74.006 },
  { label: "London", lat: 51.5072, lon: -0.1276 },
  { label: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { label: "Singapore", lat: 1.3521, lon: 103.8198 },
  { label: "Dubai", lat: 25.2048, lon: 55.2708 },
  { label: "São Paulo", lat: -23.5505, lon: -46.6333 },
  { label: "Sydney", lat: -33.8688, lon: 151.2093 },
  { label: "New Delhi", lat: 28.6139, lon: 77.209 },
];

export default function SearchPanel() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const select = useOsiris((s) => s.select);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const value = q.trim();
    if (value.length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    timer.current = setTimeout(async () => {
      const coord = value.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
      if (coord) {
        const lat = Number(coord[1]);
        const lon = Number(coord[2]);
        if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          setLoading(false);
          setHits([
            {
              id: `coord-${lat}-${lon}`,
              name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              detail: "Coordinate target",
              lat,
              lon,
              kind: "coordinates",
            },
          ]);
          return;
        }
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setHits(json.data?.results ?? []);
        setError(null);
      } catch {
        setError("Search is unavailable.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function go(hit: Hit) {
    flyTo(hit.lat, hit.lon, hit.kind === "airport" ? 11 : 7);
    mapCommand({ type: "setSearch", lat: hit.lat, lon: hit.lon });
    if (hit.kind === "airport") {
      select(
        describe(
          "airport",
          JSON.stringify({ name: hit.name, city: hit.detail, lat: hit.lat, lon: hit.lon }),
          hit.lat,
          hit.lon,
        ),
      );
    } else {
      select({
        kind: hit.kind,
        title: hit.name,
        subtitle: hit.detail,
        lat: hit.lat,
        lon: hit.lon,
        props: [
          { label: "Coordinates", value: `${hit.lat.toFixed(5)}, ${hit.lon.toFixed(5)}` },
          { label: "Class", value: hit.kind },
          { label: "Source", value: "OpenStreetMap / Nominatim" },
        ],
      });
    }
  }

  return (
    <Panel tool="search" title="SEARCH" subtitle="Places · airports · coordinates" icon={Search}>
      <div className="field">
        <label htmlFor="global-search">Query</label>
        <input
          id="global-search"
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anywhere on Earth…"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {q.trim().length >= 2 && (
        <>
          <div className="section-label">{loading ? "Searching" : `${hits.length} results`}</div>
          {error && <p className="hint" style={{ color: "#ff9b94" }}>{error}</p>}
          {!loading && !error && hits.length === 0 && <Empty label="Nothing matched" />}
          <div className="list">
            {hits.map((h) => (
              <button key={h.id} className="list-item" onClick={() => go(h)}>
                <div className="li-top">
                  <MapPin size={10} style={{ color: "var(--gold)" }} />
                  <span className="li-title" style={{ flex: 1 }}>{h.name}</span>
                  <span className="badge">{h.kind}</span>
                </div>
                <div className="li-meta">{h.detail}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {q.trim().length < 2 && (
        <>
          <div className="section-label">Jump to</div>
          <div className="pill-row">
            {QUICK.map((p) => (
              <button
                key={p.label}
                className="pill"
                onClick={() => {
                  setQ(p.label);
                  flyTo(p.lat, p.lon, 6);
                  mapCommand({ type: "setSearch", lat: p.lat, lon: p.lon });
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="section-label">Tips</div>
          <div className="hint">
            Type a city, airport name or IATA code. Coordinates can be pasted directly as <b>lat, lon</b>. Results are
            geocoded with OpenStreetMap and matched against the bundled OurAirports catalogue.
          </div>
        </>
      )}
    </Panel>
  );
}
