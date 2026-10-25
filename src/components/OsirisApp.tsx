"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import BootScreen from "@/components/hud/BootScreen";
import TopBar from "@/components/hud/TopBar";
import LayerRail from "@/components/hud/LayerRail";
import ToolRail from "@/components/hud/ToolRail";
import MapModes from "@/components/hud/MapModes";
import MapZoom from "@/components/hud/MapZoom";
import StatusBar from "@/components/hud/StatusBar";
import ReconPanel from "@/components/panels/ReconPanel";
import SpacePanel from "@/components/panels/SpacePanel";
import MarketsPanel from "@/components/panels/MarketsPanel";
import AlertsPanel from "@/components/panels/AlertsPanel";
import DrawPanel from "@/components/panels/DrawPanel";
import OIPanel from "@/components/panels/OIPanel";
import DirectionsPanel from "@/components/panels/DirectionsPanel";
import SearchPanel from "@/components/panels/SearchPanel";
import ArcGisPanel from "@/components/panels/ArcGisPanel";
import RemotePanel from "@/components/panels/RemotePanel";
import StylePanel from "@/components/panels/StylePanel";
import GhostPanel from "@/components/panels/GhostPanel";
import { useOsiris } from "@/lib/store";

const Globe = dynamic(() => import("@/components/map/Globe"), {
  ssr: false,
  loading: () => <div className="map-shell" style={{ background: "#05050a" }} />,
});

const PANELS = {
  recon: ReconPanel,
  space: SpacePanel,
  markets: MarketsPanel,
  alerts: AlertsPanel,
  draw: DrawPanel,
  oi: OIPanel,
  directions: DirectionsPanel,
  search: SearchPanel,
  arcgis: ArcGisPanel,
  remote: RemotePanel,
  style: StylePanel,
  ghost: GhostPanel,
} as const;

export default function OsirisApp() {
  const activeTool = useOsiris((s) => s.activeTool);
  const setTool = useOsiris((s) => s.setTool);
  const theme = useOsiris((s) => s.theme);
  const ghost = useOsiris((s) => s.ghost);
  const toast = useOsiris((s) => s.toast);
  const booted = useOsiris((s) => s.booted);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.ghost = ghost ? "on" : "off";
  }, [theme, ghost]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setTool("search");
        return;
      }
      if (e.key === "Escape" && !typing) setTool(null);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setTool("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);

  const Active = activeTool ? PANELS[activeTool] : null;

  return (
    <div className={`osiris-root ${ghost ? "ghosted" : ""}`} data-booted={booted ? "true" : "false"}>
      <Globe />
      <TopBar />
      <LayerRail />
      <ToolRail />
      <MapModes />
      <MapZoom />
      <StatusBar />
      {Active && <Active />}
      {toast && <div className="toast">{toast}</div>}
      <BootScreen />
    </div>
  );
}
