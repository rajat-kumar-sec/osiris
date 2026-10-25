"use client";

import { useMemo } from "react";
import { Download, Eraser, MapPin, PenLine, Pentagon, PenTool, XCircle } from "lucide-react";
import Panel, { Empty } from "./Panel";
import { useOsiris } from "@/lib/store";
import { flyTo } from "@/lib/mapBus";
import { drawingsGeo } from "@/components/map/geo";

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function lineLength(coords: [number, number][]) {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) sum += haversineKm(coords[i - 1], coords[i]);
  return sum;
}

function polygonArea(coords: [number, number][]) {
  if (coords.length < 3) return 0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  let total = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[(i + 1) % coords.length];
    total += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * R * R) / 2);
}

export default function DrawPanel() {
  const drawMode = useOsiris((s) => s.drawMode);
  const setDrawMode = useOsiris((s) => s.setDrawMode);
  const drawings = useOsiris((s) => s.drawings);
  const clearDrawings = useOsiris((s) => s.clearDrawings);
  const pushToast = useOsiris((s) => s.pushToast);

  const totals = useMemo(() => {
    let km = 0;
    let area = 0;
    for (const d of drawings) {
      if (d.type === "line") km += lineLength(d.coords);
      if (d.type === "polygon") area += polygonArea(d.coords);
    }
    return { km, area };
  }, [drawings]);

  function exportGeo() {
    const fc = drawingsGeo(drawings);
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osiris-annotations-${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Annotations exported as GeoJSON");
  }

  return (
    <Panel
      tool="draw"
      title="DRAW"
      subtitle="Map annotation & measurement"
      icon={PenTool}
      actions={<span className="badge">{drawings.length} ITEMS</span>}
    >
      <div className="hint" style={{ marginTop: 0, marginBottom: 10 }}>
        Select a tool, then click the globe. Double-click to finish lines and polygons. Press Esc to cancel the draft.
      </div>

      <div className="pill-row">
        <button
          className={`pill ${drawMode === "point" ? "active" : ""}`}
          onClick={() => setDrawMode(drawMode === "point" ? "off" : "point")}
        >
          <MapPin size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} /> MARKER
        </button>
        <button
          className={`pill ${drawMode === "line" ? "active" : ""}`}
          onClick={() => setDrawMode(drawMode === "line" ? "off" : "line")}
        >
          <PenLine size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} /> LINE
        </button>
        <button
          className={`pill ${drawMode === "polygon" ? "active" : ""}`}
          onClick={() => setDrawMode(drawMode === "polygon" ? "off" : "polygon")}
        >
          <Pentagon size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} /> AREA
        </button>
        <button className={`pill ${drawMode === "off" ? "active" : ""}`} onClick={() => setDrawMode("off")}>
          <XCircle size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} /> OFF
        </button>
      </div>

      <div className="stat-grid" style={{ marginTop: 11 }}>
        <div className="stat">
          <div className="s-label">Total path</div>
          <div className="s-value">
            {totals.km.toFixed(1)}
            <small>km</small>
          </div>
        </div>
        <div className="stat">
          <div className="s-label">Total area</div>
          <div className="s-value">
            {totals.area > 1000 ? (totals.area / 1000).toFixed(1) : totals.area.toFixed(0)}
            <small>{totals.area > 1000 ? "k km²" : "km²"}</small>
          </div>
        </div>
      </div>

      <div className="section-label">Annotations</div>
      {drawings.length === 0 && <Empty label="No annotations yet" />}
      <div className="list">
        {[...drawings].reverse().map((d) => {
          const center = d.coords[Math.floor(d.coords.length / 2)];
          return (
            <button
              key={d.id}
              className="list-item"
              onClick={() => center && flyTo(center[1], center[0], 6)}
            >
              <div className="li-top">
                <span className="badge">{d.type}</span>
                <span className="li-title" style={{ flex: 1 }}>{d.label ?? "Annotation"}</span>
              </div>
              <div className="li-meta">
                {d.type === "line" && `${lineLength(d.coords).toFixed(1)} km`}
                {d.type === "polygon" && `${polygonArea(d.coords).toFixed(0)} km²`}
                {d.type === "point" && d.coords[0] && `${d.coords[0][1].toFixed(4)}, ${d.coords[0][0].toFixed(4)}`}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button className="btn btn-sm" style={{ flex: 1 }} onClick={exportGeo} disabled={!drawings.length}>
          <Download size={10} /> EXPORT
        </button>
        <button
          className="btn btn-sm"
          style={{ flex: 1 }}
          onClick={() => {
            clearDrawings();
            pushToast("All annotations cleared");
          }}
          disabled={!drawings.length}
        >
          <Eraser size={10} /> CLEAR
        </button>
      </div>

      <p className="hint" style={{ marginTop: 10 }}>
        Annotations are stored locally in this browser session and can be exported as standard GeoJSON.
      </p>
    </Panel>
  );
}
