"use client";

import {
  Radar,
  Orbit,
  TrendingUp,
  BellRing,
  PenTool,
  Sparkles,
  Navigation,
  Search,
  Map as MapIcon,
  Users,
  Palette,
  Ghost,
  type LucideIcon,
} from "lucide-react";
import { useOsiris } from "@/lib/store";
import type { ToolId } from "@/lib/types";

type ToolDef = { id: ToolId; label: string; title: string; icon: LucideIcon; divider?: boolean };

const TOOLS: ToolDef[] = [
  { id: "recon", label: "RECON", title: "Full OSINT reconnaissance suite", icon: Radar },
  { id: "space", label: "SPACE", title: "Orbital tracking and space weather", icon: Orbit },
  { id: "markets", label: "MARKET", title: "Live markets and defense equities", icon: TrendingUp },
  { id: "alerts", label: "ALERTS", title: "Global alert stream", icon: BellRing },
  { id: "draw", label: "DRAW", title: "Map annotation tools", icon: PenTool },
  { id: "oi", label: "OI", title: "OI — intelligence analyst", icon: Sparkles },
  { id: "directions", label: "ROUTE", title: "Directions and routing", icon: Navigation },
  { id: "search", label: "SEARCH", title: "Global search", icon: Search, divider: true },
  { id: "arcgis", label: "ARCGIS", title: "ArcGIS layers and imagery", icon: MapIcon },
  { id: "remote", label: "REMOTE", title: "Remote operator presence", icon: Users },
  { id: "style", label: "STYLE", title: "Style Studio — map appearance", icon: Palette },
  { id: "ghost", label: "GHOST", title: "Ghost protocol — privacy mode", icon: Ghost },
];

export default function ToolRail() {
  const activeTool = useOsiris((s) => s.activeTool);
  const setTool = useOsiris((s) => s.setTool);
  const ghost = useOsiris((s) => s.ghost);

  return (
    <nav className="tool-rail" aria-label="Intelligence tools">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const active = activeTool === tool.id || (tool.id === "ghost" && ghost);
        return (
          <div key={tool.id}>
            {tool.divider && <div className="tool-divider" />}
            <button
              className={`tool-btn ${active ? "active" : ""}`}
              onClick={() => setTool(activeTool === tool.id ? null : tool.id)}
              title={tool.title}
              aria-label={tool.title}
            >
              <Icon size={16} strokeWidth={1.6} />
              <span>{tool.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
