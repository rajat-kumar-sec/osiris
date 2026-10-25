"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  CloudRain,
  Plane,
  Ship,
  TrainFront,
  Satellite,
  Cctv,
  Flame,
  ShieldAlert,
  Network,
  Layers,
  Mountain,
  Radar,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";
import { LAYER_GROUPS, LAYERS, GROUP_COLORS } from "@/lib/layers";
import { useOsiris } from "@/lib/store";
import { fmtNum } from "@/lib/client";
import type { LayerGroupId } from "@/lib/types";

const GROUP_ICONS: Record<LayerGroupId, LucideIcon> = {
  weather: CloudRain,
  aviation: Plane,
  maritime: Ship,
  transit: TrainFront,
  space: Satellite,
  surveillance: Cctv,
  hazards: Flame,
  threats: ShieldAlert,
  network: Network,
  display: Layers,
};

export default function LayerRail() {
  const railOpen = useOsiris((s) => s.railOpen);
  const setRailOpen = useOsiris((s) => s.setRailOpen);
  const layers = useOsiris((s) => s.layers);
  const counts = useOsiris((s) => s.counts);
  const toggleLayer = useOsiris((s) => s.toggleLayer);
  const terrain = useOsiris((s) => s.terrain);
  const setTerrain = useOsiris((s) => s.setTerrain);
  const globe = useOsiris((s) => s.globe);
  const setGlobe = useOsiris((s) => s.setGlobe);
  const setTool = useOsiris((s) => s.setTool);

  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(LAYER_GROUPS.map((g) => [g.id, true])),
  );
  const [focus, setFocus] = useState<LayerGroupId | null>(null);

  const totalActive = useMemo(() => Object.values(layers).filter(Boolean).length, [layers]);
  const visibleGroups = focus ? LAYER_GROUPS.filter((g) => g.id === focus) : LAYER_GROUPS;
  const focusLabel = focus ? LAYER_GROUPS.find((g) => g.id === focus)?.label : null;

  const openGroup = (id: LayerGroupId) => {
    if (railOpen && focus === id) {
      setRailOpen(false);
      return;
    }
    setFocus(id);
    setRailOpen(true);
    setOpen((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <>
      <nav className="layer-icons" aria-label="Layer groups">
        {LAYER_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.id];
          const activeCount = LAYERS.filter((l) => l.group === group.id && layers[l.id]).length;
          const isActive = focus === group.id && railOpen;
          return (
            <button
              key={group.id}
              className={`layer-icon ${isActive ? "active" : ""}`}
              onClick={() => openGroup(group.id)}
              title={group.label}
              aria-label={group.label}
            >
              <Icon size={15} strokeWidth={1.6} />
              {activeCount > 0 && <span className="layer-badge">{activeCount}</span>}
            </button>
          );
        })}

        <span className="layer-icons-gap" />

        <button
          className={`layer-icon ${layers["weather-radar"] ? "active" : ""}`}
          onClick={() => toggleLayer("weather-radar")}
          title="Weather radar overlay"
          aria-label="Weather radar overlay"
        >
          <Radar size={15} strokeWidth={1.6} />
        </button>
        <button
          className={`layer-icon ${terrain ? "active" : ""}`}
          onClick={() => setTerrain(!terrain)}
          title="3D terrain"
          aria-label="3D terrain"
        >
          <Mountain size={15} strokeWidth={1.6} />
        </button>
        <a className="layer-icon" href="/docs" title="Documentation" aria-label="Documentation">
          <CircleHelp size={15} strokeWidth={1.6} />
        </a>
      </nav>

      <aside className={`layer-rail ${railOpen ? "" : "collapsed"}`} aria-label="Map layers">
        <div className="rail-head">
          <span className="rail-title">{focusLabel ? focusLabel.toUpperCase() : "LAYER CONTROL"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {focus && (
              <button className="rail-reset" onClick={() => setFocus(null)}>
                ALL
              </button>
            )}
            <span className="rail-count">{totalActive} ACTIVE</span>
            <button
              className="panel-close"
              style={{ width: 20, height: 20 }}
              onClick={() => setRailOpen(false)}
              title="Collapse layers"
            >
              <ChevronLeft size={13} />
            </button>
          </div>
        </div>

        <div className="rail-scroll">
          {visibleGroups.map((group) => {
            const items = LAYERS.filter((l) => l.group === group.id);
            const Icon = GROUP_ICONS[group.id];
            const activeCount = items.filter((l) => layers[l.id]).length;
            const isOpen = open[group.id];

            if (group.id === "display") {
              return (
                <div className="layer-group" key={group.id}>
                  <button className="layer-group-head" onClick={() => setOpen({ ...open, [group.id]: !isOpen })}>
                    <Icon size={12} className="g-icon" />
                    <span className="g-label">{group.label}</span>
                    <span className="g-count">UI</span>
                    <ChevronRight size={11} className={`chev ${isOpen ? "open" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="layer-items">
                      <button className={`layer-row ${terrain ? "on" : ""}`} onClick={() => setTerrain(!terrain)}>
                        <span className="layer-swatch" style={{ background: "#8f8977" }} />
                        <span className="l-name">3D Terrain</span>
                        <span className="toggle" />
                      </button>
                      <button className={`layer-row ${globe ? "on" : ""}`} onClick={() => setGlobe(!globe)}>
                        <span className="layer-swatch" style={{ background: "#e8dcb0" }} />
                        <span className="l-name">Globe Projection</span>
                        <span className="toggle" />
                      </button>
                      <button className="layer-row" onClick={() => setTool("style")}>
                        <span className="layer-swatch" style={{ background: "#d4af37" }} />
                        <span className="l-name">Style Studio</span>
                        <ChevronRight size={10} style={{ color: "var(--muted-2)" }} />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="layer-group" key={group.id}>
                <button className="layer-group-head" onClick={() => setOpen({ ...open, [group.id]: !isOpen })}>
                  <Icon size={12} className="g-icon" />
                  <span className="g-label">{group.label}</span>
                  <span className="g-count">{activeCount}</span>
                  <ChevronRight size={11} className={`chev ${isOpen ? "open" : ""}`} />
                </button>

                {isOpen && (
                  <div className="layer-items">
                    {items.map((layer) => {
                      const on = Boolean(layers[layer.id]);
                      const count = counts[layer.id] ?? 0;
                      return (
                        <button
                          key={`${group.id}-${layer.id}`}
                          className={`layer-row ${on ? "on" : ""}`}
                          onClick={() => toggleLayer(layer.id)}
                          title={layer.description}
                        >
                          <span className="layer-swatch" style={{ background: GROUP_COLORS[layer.group] }} />
                          <span className="l-name">{layer.label}</span>
                          {count > 0 && <span className="l-count">{fmtNum(count)}</span>}
                          <span className="toggle" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rail-foot">
          <span>ALL SYSTEMS LIVE</span>
          <span style={{ color: "var(--gold)" }}>◈ {totalActive}</span>
        </div>
      </aside>
    </>
  );
}
