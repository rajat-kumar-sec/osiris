"use client";

import { Check, Palette, RotateCcw } from "lucide-react";
import Panel from "./Panel";
import { useOsiris } from "@/lib/store";

const THEMES: { id: "gold" | "cobalt" | "terminal" | "crimson" | "mono"; label: string; colors: string[] }[] = [
  { id: "gold", label: "OSIRIS GOLD", colors: ["#d4af37", "#f3d97f", "#8f7420"] },
  { id: "cobalt", label: "COBALT", colors: ["#4d8dff", "#9dc0ff", "#1f4f9e"] },
  { id: "terminal", label: "TERMINAL", colors: ["#4ade80", "#a7f3c0", "#15803d"] },
  { id: "crimson", label: "CRIMSON", colors: ["#ff4d6d", "#ff9fb0", "#9e1832"] },
  { id: "mono", label: "MONOCHROME", colors: ["#d4d4d4", "#ffffff", "#6b6b6b"] },
];

const BASEMAPS: { id: "dark" | "satellite" | "topo" | "streets"; label: string }[] = [
  { id: "dark", label: "Dark Matter" },
  { id: "satellite", label: "Satellite" },
  { id: "topo", label: "Topographic" },
  { id: "streets", label: "Streets" },
];

export default function StylePanel() {
  const theme = useOsiris((s) => s.theme);
  const setTheme = useOsiris((s) => s.setTheme);
  const basemap = useOsiris((s) => s.basemap);
  const setBasemap = useOsiris((s) => s.setBasemap);
  const terrain = useOsiris((s) => s.terrain);
  const setTerrain = useOsiris((s) => s.setTerrain);
  const globe = useOsiris((s) => s.globe);
  const setGlobe = useOsiris((s) => s.setGlobe);
  const railOpen = useOsiris((s) => s.railOpen);
  const setRailOpen = useOsiris((s) => s.setRailOpen);
  const layers = useOsiris((s) => s.layers);
  const toggleLayer = useOsiris((s) => s.toggleLayer);
  const pushToast = useOsiris((s) => s.pushToast);

  return (
    <Panel tool="style" title="STYLE STUDIO" subtitle="Appearance & map composition" icon={Palette}>
      <div className="section-label">Accent theme</div>
      <div className="list">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className="list-item"
            style={{ borderColor: theme === t.id ? "rgba(212,175,55,0.5)" : undefined }}
            onClick={() => {
              setTheme(t.id);
              pushToast(`Theme set to ${t.label}`);
            }}
          >
            <div className="li-top">
              <span style={{ display: "flex", gap: 3 }}>
                {t.colors.map((c) => (
                  <span key={c} style={{ width: 9, height: 9, background: c, borderRadius: 1 }} />
                ))}
              </span>
              <span className="li-title" style={{ flex: 1 }}>{t.label}</span>
              {theme === t.id && <Check size={12} style={{ color: "var(--gold)" }} />}
            </div>
          </button>
        ))}
      </div>

      <div className="section-label">Basemap</div>
      <div className="pill-row">
        {BASEMAPS.map((b) => (
          <button key={b.id} className={`pill ${basemap === b.id ? "active" : ""}`} onClick={() => setBasemap(b.id)}>
            {b.label}
          </button>
        ))}
      </div>

      <div className="section-label">Composition</div>
      <button className={`layer-row ${globe ? "on" : ""}`} onClick={() => setGlobe(!globe)} style={{ paddingLeft: 2 }}>
        <span className="layer-swatch" style={{ background: "var(--gold)" }} />
        <span className="l-name">3D globe projection</span>
        <span className="toggle" />
      </button>
      <button className={`layer-row ${terrain ? "on" : ""}`} onClick={() => setTerrain(!terrain)} style={{ paddingLeft: 2 }}>
        <span className="layer-swatch" style={{ background: "var(--gold)" }} />
        <span className="l-name">Terrain exaggeration</span>
        <span className="toggle" />
      </button>
      <button
        className={`layer-row ${layers["weather-radar"] ? "on" : ""}`}
        onClick={() => toggleLayer("weather-radar")}
        style={{ paddingLeft: 2 }}
      >
        <span className="layer-swatch" style={{ background: "var(--cyan)" }} />
        <span className="l-name">Animated radar</span>
        <span className="toggle" />
      </button>
      <button className={`layer-row ${railOpen ? "on" : ""}`} onClick={() => setRailOpen(!railOpen)} style={{ paddingLeft: 2 }}>
        <span className="layer-swatch" style={{ background: "var(--muted)" }} />
        <span className="l-name">Layer control rail</span>
        <span className="toggle" />
      </button>

      <div className="section-label">Presets</div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="btn btn-sm"
          style={{ flex: 1 }}
          onClick={() => {
            setTheme("gold");
            setBasemap("dark");
            setGlobe(true);
            setTerrain(true);
            pushToast("OSIRIS default preset restored");
          }}
        >
          <RotateCcw size={10} /> DEFAULT
        </button>
        <button
          className="btn btn-sm"
          style={{ flex: 1 }}
          onClick={() => {
            setTheme("terminal");
            setBasemap("dark");
            setTerrain(false);
            pushToast("Field terminal preset applied");
          }}
        >
          FIELD OPS
        </button>
      </div>

      <p className="hint" style={{ marginTop: 10 }}>
        Themes recolour the HUD only. Data layers keep their semantic colours so intelligence stays readable.
      </p>
    </Panel>
  );
}
