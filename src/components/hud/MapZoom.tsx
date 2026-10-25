"use client";

import { Minus, Plus } from "lucide-react";
import { mapCommand } from "@/lib/mapBus";

export default function MapZoom() {
  return (
    <div className="map-zoom">
      <button onClick={() => mapCommand({ type: "zoomIn" })} title="Zoom in" aria-label="Zoom in">
        <Plus size={14} />
      </button>
      <button onClick={() => mapCommand({ type: "zoomOut" })} title="Zoom out" aria-label="Zoom out">
        <Minus size={14} />
      </button>
    </div>
  );
}
