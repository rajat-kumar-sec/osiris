"use client";

import { Box, Square, MoonStar, Satellite } from "lucide-react";
import { useOsiris } from "@/lib/store";
import { fmtNum } from "@/lib/client";

export default function MapModes() {
  const basemap = useOsiris((s) => s.basemap);
  const setBasemap = useOsiris((s) => s.setBasemap);
  const globe = useOsiris((s) => s.globe);
  const setGlobe = useOsiris((s) => s.setGlobe);
  const scaleKm = useOsiris((s) => s.scaleKm);

  return (
    <div className="map-modes">
      <button
        className={`map-mode ${globe ? "active" : ""}`}
        onClick={() => setGlobe(true)}
        title="3D globe projection"
      >
        <Box size={11} />
        3D
      </button>
      <button
        className={`map-mode ${!globe ? "active" : ""}`}
        onClick={() => setGlobe(false)}
        title="2D map projection"
      >
        <Square size={10} />
        2D
      </button>
      <button
        className={`map-mode ${globe && basemap === "dark" ? "active" : ""}`}
        onClick={() => {
          setGlobe(true);
          setBasemap("dark");
        }}
        title="Night map"
      >
        <MoonStar size={11} />
        MAP
      </button>
      <button
        className={`map-mode ${globe && basemap === "satellite" ? "active" : ""}`}
        onClick={() => {
          setGlobe(true);
          setBasemap("satellite");
        }}
        title="Satellite view"
      >
        <Satellite size={11} />
        SAT
      </button>

      <div className="scale-bar" aria-hidden="true">
        <span className="scale-bar-line" />
        <em>{fmtNum(scaleKm)} km</em>
      </div>
    </div>
  );
}
