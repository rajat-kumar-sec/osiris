"use client";

import { create } from "zustand";
import { DEFAULT_LAYERS } from "./layers";
import type { LayerId, ToolId } from "./types";

export type SelectedEntity = {
  kind: string;
  title: string;
  subtitle?: string;
  lat: number;
  lon: number;
  props: { label: string; value: string }[];
  media?: { type: "image" | "hls"; url: string };
  link?: string;
};

export type Drawing = {
  id: string;
  type: "point" | "line" | "polygon";
  coords: [number, number][];
  label?: string;
};

type State = {
  booted: boolean;
  setBooted: (v: boolean) => void;

  layers: Record<LayerId, boolean>;
  toggleLayer: (id: LayerId) => void;
  setLayer: (id: LayerId, on: boolean) => void;
  counts: Partial<Record<LayerId, number>>;
  setCounts: (c: Partial<Record<LayerId, number>>) => void;

  activeTool: ToolId | null;
  setTool: (t: ToolId | null) => void;

  selected: SelectedEntity | null;
  select: (e: SelectedEntity | null) => void;

  theme: "gold" | "cobalt" | "terminal" | "crimson" | "mono";
  setTheme: (t: State["theme"]) => void;

  ghost: boolean;
  toggleGhost: () => void;

  basemap: "dark" | "satellite" | "topo" | "streets" | "arcgis";
  setBasemap: (b: State["basemap"]) => void;

  globe: boolean;
  setGlobe: (v: boolean) => void;

  terrain: boolean;
  setTerrain: (v: boolean) => void;

  scaleKm: number;
  setScaleKm: (n: number) => void;

  railOpen: boolean;
  setRailOpen: (v: boolean) => void;

  drawMode: "off" | "point" | "line" | "polygon";
  setDrawMode: (m: State["drawMode"]) => void;
  drawings: Drawing[];
  addDrawing: (d: Drawing) => void;
  clearDrawings: () => void;

  route: { coordinates: [number, number][]; distanceKm: number; durationMin: number } | null;
  setRoute: (r: State["route"]) => void;

  ghostNodes: number;
  setGhostNodes: (n: number) => void;

  toast: string | null;
  pushToast: (msg: string) => void;
};

export const useOsiris = create<State>((set, get) => ({
  booted: false,
  setBooted: (v) => set({ booted: v }),

  layers: { ...DEFAULT_LAYERS },
  toggleLayer: (id) => {
    const layers = { ...get().layers, [id]: !get().layers[id] };
    set({ layers });
  },
  setLayer: (id, on) => set({ layers: { ...get().layers, [id]: on } }),
  counts: {},
  setCounts: (c) => set({ counts: { ...get().counts, ...c } }),

  activeTool: null,
  setTool: (t) => set({ activeTool: t, selected: t ? get().selected : null, railOpen: t ? false : get().railOpen }),

  selected: null,
  select: (e) => set({ selected: e }),

  theme: "gold",
  setTheme: (t) => set({ theme: t }),

  ghost: false,
  toggleGhost: () => {
    const ghost = !get().ghost;
    set({ ghost });
    get().pushToast(ghost ? "GHOST PROTOCOL ENGAGED — UI identity masking active" : "Ghost protocol disengaged");
  },

  basemap: "dark",
  setBasemap: (b) => set({ basemap: b }),

  globe: true,
  setGlobe: (v) => set({ globe: v }),

  terrain: true,
  setTerrain: (v) => set({ terrain: v }),

  scaleKm: 1000,
  setScaleKm: (n) => set({ scaleKm: n }),

  railOpen: false,
  setRailOpen: (v) => set({ railOpen: v }),

  drawMode: "off",
  setDrawMode: (m) => set({ drawMode: m }),
  drawings: [],
  addDrawing: (d) => set({ drawings: [...get().drawings, d] }),
  clearDrawings: () => set({ drawings: [] }),

  route: null,
  setRoute: (r) => set({ route: r }),

  ghostNodes: 0,
  setGhostNodes: (n) => set({ ghostNodes: n }),

  toast: null,
  pushToast: (msg) => {
    set({ toast: msg });
    if (typeof window !== "undefined") {
      window.clearTimeout((window as unknown as { __osirisToast?: number }).__osirisToast);
      (window as unknown as { __osirisToast?: number }).__osirisToast = window.setTimeout(() => {
        if (get().toast === msg) set({ toast: null });
      }, 3800);
    }
  },
}));
