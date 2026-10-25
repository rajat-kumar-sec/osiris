"use client";

import { useState } from "react";
import { Layers, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import Panel, { Empty } from "./Panel";
import { useOsiris } from "@/lib/store";
import { sharedMap } from "@/lib/mapBus";

const SERVICES = [
  {
    id: "imagery",
    name: "World Imagery",
    detail: "High-resolution satellite and aerial imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "topo",
    name: "World Topographic",
    detail: "Terrain, contours and place labels",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "streets",
    name: "World Street Map",
    detail: "Road network and urban detail",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "ocean",
    name: "Ocean Basemap",
    detail: "Bathymetry and marine features",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "natgeo",
    name: "National Geographic",
    detail: "Editorial reference styling",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "hillshade",
    name: "World Hillshade",
    detail: "Terrain relief shading",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
  },
];

type CustomLayer = { id: string; name: string; url: string; opacity: number; visible: boolean };

export default function ArcGisPanel() {
  const basemap = useOsiris((s) => s.basemap);
  const setBasemap = useOsiris((s) => s.setBasemap);
  const setGlobe = useOsiris((s) => s.setGlobe);
  const [custom, setCustom] = useState<CustomLayer[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function apply(id: string) {
    if (id === "imagery") setBasemap("satellite");
    else if (id === "topo" || id === "hillshade") setBasemap("topo");
    else if (id === "streets" || id === "natgeo") setBasemap("streets");
    else {
      const svc = SERVICES.find((s) => s.id === id);
      if (svc) addCustom(svc.name, svc.url);
    }
  }

  function addCustom(layerName: string, template: string) {
    const map = sharedMap.current;
    if (!map) {
      setError("Map is still loading.");
      return;
    }
    if (!/^https?:\/\//.test(template) || !template.includes("{z}")) {
      setError("Enter an XYZ tile URL containing {z}, {x} and {y}.");
      return;
    }
    const id = `arcgis-${Date.now()}`;
    try {
      map.addSource(id, { type: "raster", tiles: [template], tileSize: 256, maxzoom: 19, attribution: "ArcGIS / custom" });
      map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": 0.85 } });
      setCustom((prev) => [...prev, { id, name: layerName, url: template, opacity: 0.85, visible: true }]);
      setError(null);
      setName("");
      setUrl("");
    } catch {
      setError("Could not add that tile layer.");
    }
  }

  function update(id: string, patch: Partial<CustomLayer>) {
    setCustom((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        const map = sharedMap.current;
        if (map?.getLayer(id)) {
          if (patch.opacity != null) map.setPaintProperty(id, "raster-opacity", patch.opacity);
          if (patch.visible != null) map.setLayoutProperty(id, "visibility", patch.visible ? "visible" : "none");
        }
        return next;
      }),
    );
  }

  function remove(id: string) {
    const map = sharedMap.current;
    try {
      if (map?.getLayer(id)) map.removeLayer(id);
      if (map?.getSource(id)) map.removeSource(id);
    } catch {
      /* already removed */
    }
    setCustom((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <Panel
      tool="arcgis"
      title="ARCGIS"
      subtitle="Reference layers · imagery services"
      icon={MapIcon}
      actions={<span className="badge">ESRI</span>}
    >
      <div className="hint" style={{ marginTop: 0, marginBottom: 9 }}>
        Switch to an ArcGIS reference basemap or stack a custom XYZ raster over the globe. All services are public.
      </div>

      <div className="list">
        {SERVICES.map((s) => {
          const active =
            (s.id === "imagery" && basemap === "satellite") ||
            ((s.id === "topo" || s.id === "hillshade") && basemap === "topo") ||
            ((s.id === "streets" || s.id === "natgeo") && basemap === "streets");
          return (
            <button key={s.id} className="list-item" onClick={() => apply(s.id)}>
              <div className="li-top">
                <Layers size={10} style={{ color: "var(--gold)" }} />
                <span className="li-title" style={{ flex: 1 }}>{s.name}</span>
                {active && <span className="badge medium">ACTIVE</span>}
              </div>
              <div className="li-meta">{s.detail}</div>
            </button>
          );
        })}
      </div>

      <div className="section-label">Custom XYZ layer</div>
      <div className="field">
        <label>Layer name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="My raster layer" />
      </div>
      <div className="field">
        <label>Tile URL template</label>
        <input
          className="input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/{z}/{x}/{y}.png"
          spellCheck={false}
        />
      </div>
      <button
        className="btn btn-primary btn-block"
        onClick={() => addCustom(name.trim() || "Custom layer", url.trim())}
      >
        <Plus size={11} /> ADD LAYER
      </button>
      {error && <p className="hint" style={{ color: "#ff9b94", marginTop: 8 }}>{error}</p>}

      {custom.length > 0 && (
        <>
          <div className="section-label">Stacked layers</div>
          <div className="list">
            {custom.map((l) => (
              <div className="list-item" key={l.id}>
                <div className="li-top">
                  <span className="li-title" style={{ flex: 1 }}>{l.name}</span>
                  <button className="panel-close" style={{ width: 20, height: 20 }} onClick={() => remove(l.id)}>
                    <Trash2 size={10} />
                  </button>
                </div>
                <div className="li-meta" style={{ marginBottom: 5 }}>{l.url.slice(0, 52)}…</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={l.opacity}
                  onChange={(e) => update(l.id, { opacity: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "#d4af37" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span className="li-meta">OPACITY {Math.round(l.opacity * 100)}%</span>
                  <button className="btn btn-sm" onClick={() => update(l.id, { visible: !l.visible })}>
                    {l.visible ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {custom.length === 0 && (
        <div style={{ marginTop: 10 }}>
          <Empty label="No custom layers stacked" />
        </div>
      )}

      <button className="btn btn-block btn-sm" style={{ marginTop: 10 }} onClick={() => setGlobe(true)}>
        RETURN TO 3D GLOBE
      </button>
    </Panel>
  );
}
