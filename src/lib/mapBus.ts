"use client";

import type { Map as MapLibreMap } from "maplibre-gl";

export type MapCommand =
  | { type: "flyTo"; lat: number; lon: number; zoom?: number; pitch?: number }
  | { type: "flyToBounds"; bbox: [[number, number], [number, number]] }
  | { type: "reset" }
  | { type: "setProjection"; mode: "globe" | "mercator" }
  | { type: "zoomIn" }
  | { type: "zoomOut" }
  | { type: "setBasemap"; id: string }
  | { type: "setSearch"; lat: number; lon: number }
  | { type: "setTerrain"; on: boolean }
  | { type: "setRadar"; on: boolean }
  | { type: "setDrawMode"; mode: "off" | "point" | "line" | "polygon" }
  | { type: "clearDrawings" }
  | { type: "setRoute"; coordinates: [number, number][] | null }
  | { type: "resize" };

type Listener = (cmd: MapCommand) => void;

const listeners = new Set<Listener>();

export const sharedMap: { current: MapLibreMap | null } = { current: null };

export function onMapCommand(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function mapCommand(cmd: MapCommand) {
  for (const fn of listeners) fn(cmd);
}

export function flyTo(lat: number, lon: number, zoom = 5) {
  mapCommand({ type: "flyTo", lat, lon, zoom });
}
