"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type RasterTileSource,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Serve MapLibre's worker as a static asset. Bundler-resolved worker URLs break
// under Turbopack's dev server (the chunk path returns HTML), so pin it.
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}
import { useOsiris } from "@/lib/store";
import { useFeed, fmtCoord } from "@/lib/client";
import { mapCommand, onMapCommand, sharedMap } from "@/lib/mapBus";
import { describe } from "@/lib/describe";
import { ICON, addOsirisIcons } from "./icons";
import {
  airportsGeo,
  cablesGeo,
  camerasGeo,
  conflictGeo,
  cyberGeo,
  drawingsGeo,
  firesGeo,
  flightsGeo,
  gpsJamGeo,
  nuclearGeo,
  portsGeo,
  quakesGeo,
  routeGeo,
  satellitesGeo,
  shipsGeo,
  stormsGeo,
  trainsGeo,
} from "./geo";
import type {
  Aircraft,
  Cable,
  CctvCamera,
  GpsJamCell,
  NewsItem,
  NuclearSite,
  Port,
  Quake,
  SatellitePosition,
  Storm,
  Vessel,
  Wildfire,
} from "@/lib/types";
import airportsJson from "@/data/airports.json";
import portsJson from "@/data/ports.json";

const BASE_LAYERS = ["base", "satellite", "topo", "streets", "radar"];

const EMPTY = { type: "FeatureCollection", features: [] } as GeoJSON.FeatureCollection;

const INTERACTIVE = [
  "flights",
  "ships",
  "sats",
  "stations",
  "quakes",
  "fires",
  "cams",
  "nukes",
  "ports",
  "airports",
  "storms",
  "trains",
  "jam",
  "cyber",
  "conflict",
  "cables",
];

export default function Globe() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ lat: 18, lon: 8, zoom: 1.3, radius: 200, global: true });
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const layers = useOsiris((s) => s.layers);
  const setCounts = useOsiris((s) => s.setCounts);
  const select = useOsiris((s) => s.select);
  const selected = useOsiris((s) => s.selected);
  const setScaleKm = useOsiris((s) => s.setScaleKm);
  const basemap = useOsiris((s) => s.basemap);
  const terrain = useOsiris((s) => s.terrain);
  const globe = useOsiris((s) => s.globe);
  const drawMode = useOsiris((s) => s.drawMode);
  const addDrawing = useOsiris((s) => s.addDrawing);
  const drawings = useOsiris((s) => s.drawings);
  const route = useOsiris((s) => s.route);
  const activeTool = useOsiris((s) => s.activeTool);
  const setGhostNodes = useOsiris((s) => s.setGhostNodes);
  const ghost = useOsiris((s) => s.ghost);

  const lastHover = useRef(0);
  const draft = useRef<{ type: "line" | "polygon"; coords: [number, number][] }>({ type: "line", coords: [] });
  const peers = useRef(new Map<string, { lat: number; lon: number; at: number; name: string }>());
  const channel = useRef<BroadcastChannel | null>(null);
  const peerId = useRef(`node-${Math.random().toString(36).slice(2, 7)}`);

  /* â”€â”€ feeds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const flightsUrl = view.global
    ? "/api/flights?mode=global"
    : `/api/flights?lat=${view.lat}&lon=${view.lon}&radius=${Math.round(view.radius)}`;

  const flights = useFeed<{ aircraft: Aircraft[] }>(flightsUrl, view.global ? 15_000 : 9_000, layers.flights);
  const ships = useFeed<{ vessels: Vessel[] }>(
    `/api/maritime?lat=${view.lat}&lon=${view.lon}&span=${Math.max(4, Math.min(30, view.zoom < 4 ? 22 : 6))}`,
    25_000,
    layers.ships,
  );
  const sats = useFeed<{ satellites: SatellitePosition[] }>("/api/satellites?group=active", 60_000, layers.satellites || layers.iss);
  const stations = useFeed<{ all: SatellitePosition[] }>("/api/satellites?mode=iss", 60_000, layers.iss);
  const quakes = useFeed<{ quakes: Quake[] }>("/api/earthquakes", 45_000, layers.earthquakes);
  const fires = useFeed<{ fires: Wildfire[] }>("/api/fires", 300_000, layers.fires);
  const storms = useFeed<{ storms: Storm[] }>("/api/storms", 180_000, layers.storms);
  const cams = useFeed<{ cameras: CctvCamera[] }>("/api/cctv?region=all", 600_000, layers.cctv);
  const nuclear = useFeed<{ sites: NuclearSite[] }>("/api/nuclear", 3_600_000, layers.nuclear);
  const gpsjam = useFeed<{ cells: GpsJamCell[]; date: string }>("/api/gpsjam", 900_000, layers.gpsjam);
  const cyber = useFeed<{ botnets: { ip_address: string; port: number; country?: string; malware?: string; as_name?: string; last_online?: string }[] }>(
    "/api/cyber",
    300_000,
    layers.cyber,
  );
  const cables = useFeed<{ cables: Cable[] }>("/api/cables", 3_600_000, layers.cables);
  const trains = useFeed<{ trains: { id: string; number: number; lat: number; lon: number; speed: number; type: string; operator: string; timestamp: string }[] }>(
    "/api/trains",
    20_000,
    layers.trains,
  );
  const volcanoes = useFeed<{ id: string; name: string; lat: number; lon: number; date: string; source: string }[]>(
    "/api/hazards?type=volcanoes",
    600_000,
    layers.volcanoes,
  );
  const conflictNews = useFeed<{ articles: NewsItem[] }>("/api/news?topic=conflict", 300_000, layers.conflict);
  const radar = useFeed<{ host: string; frames: { time: number; path: string }[] }>("/api/weather", 120_000, layers["weather-radar"]);

  const airportFeatures = useMemo(() => airportsGeo(airportsJson as never), []);
  const portsData = useMemo<Port[]>(() => portsJson as Port[], []);
  const portFeatures = useMemo(() => portsGeo(portsData), [portsData]);

  /* â”€â”€ init map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [8, 18],
      zoom: 2,
      minZoom: 0.4,
      maxZoom: 16,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      dragRotate: true,
      maxPitch: 75,
    });

    mapRef.current = map;
    sharedMap.current = map;
    (window as unknown as { __osirisMap?: MapLibreMap }).__osirisMap = map;
    map.addControl(new AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      try {
        map.setProjection({ type: "globe" });
      } catch {
        /* older style spec */
      }
      addOsirisIcons(map);
      const nativeSymbols = map
        .getStyle()
        .layers.filter((l) => l.type === "symbol")
        .map((l) => l.id);
      const applyLabelDensity = () => {
        const show = map.getZoom() >= 3.4;
        for (const id of nativeSymbols) {
          if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", show ? "visible" : "none");
        }
      };
      applyLabelDensity();
      map.on("zoomend", applyLabelDensity);
      addRasters(map);
      addDataLayers(map);
      setReady(true);
    });

    const onMove = () => {
      const c = map.getCenter();
      const z = map.getZoom();
      const globeView = z < 3.4;
      let radius = 200;
      if (!globeView) {
        const b = map.getBounds();
        const dLat = Math.abs(b.getNorth() - b.getSouth());
        radius = Math.max(30, Math.min(250, dLat * 60));
      }
      setView((prev) => {
        const next = {
          lat: Number(c.lat.toFixed(2)),
          lon: Number(c.lng.toFixed(2)),
          zoom: Number(z.toFixed(2)),
          radius: Math.round(radius),
          global: globeView,
        };
        if (prev.lat === next.lat && prev.lon === next.lon && prev.zoom === next.zoom && prev.global === next.global) return prev;
        return next;
      });

      const mpp = (156543.03392 * Math.cos((c.lat * Math.PI) / 180)) / Math.pow(2, z);
      const raw = (mpp * 90) / 1000;
      const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 0.01))));
      const nice = Math.max(pow, Math.round(raw / pow) * pow);
      setScaleKm(Number(nice.toPrecision(2)));
    };

    map.on("moveend", onMove);
    map.on("zoomend", onMove);

    const onClick = (e: MapMouseEvent) => {
      if (useOsiris.getState().drawMode !== "off") return;
      const hits = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE.filter((l) => map.getLayer(l)) });
      if (!hits.length) {
        select(null);
        return;
      }
      const f = hits[0];
      const p = f.properties ?? {};
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      select(describe(String(p.kind ?? "entity"), String(p.payload ?? "{}"), coords[1], coords[0]));
    };

    const onMouseMove = (e: MapMouseEvent) => {
      if (performance.now() - lastHover.current < 45) return;
      lastHover.current = performance.now();
      const hits = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE.filter((l) => map.getLayer(l)) });
      if (hits.length) {
        map.getCanvas().style.cursor = "pointer";
        const f = hits[0];
        const title = f.properties?.title ?? "";
        const sub = f.properties?.subtitle ?? "";
        setHover({ x: e.point.x, y: e.point.y, text: [title, sub].filter(Boolean).join(" Â· ") });
      } else {
        map.getCanvas().style.cursor = "";
        setHover((h) => (h ? null : h));
      }
    };

    map.on("click", onClick);
    map.on("mousemove", onMouseMove);
    map.on("mouseout", () => setHover(null));

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);

    const unsub = onMapCommand((cmd) => {
      const m = mapRef.current;
      if (!m) return;
      switch (cmd.type) {
        case "flyTo":
          m.flyTo({ center: [cmd.lon, cmd.lat], zoom: cmd.zoom ?? 5, duration: 1600, essential: true });
          break;
        case "flyToBounds":
          m.fitBounds(cmd.bbox, { padding: 80, duration: 1600 });
          break;
        case "reset":
          m.flyTo({ center: [8, 18], zoom: 1.3, pitch: 0, bearing: 0, duration: 900 });
          break;
        case "setProjection":
          try {
            m.setProjection({ type: cmd.mode });
          } catch {
            /* noop */
          }
          break;
        case "setSearch": {
          const src = m.getSource("search") as GeoJSONSource | undefined;
          src?.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [cmd.lon, cmd.lat] },
                properties: { title: "Search result" },
              },
            ],
          } as unknown as GeoJSON.FeatureCollection);
          break;
        }
        case "zoomIn":
          m.zoomIn({ duration: 300 });
          break;
        case "zoomOut":
          m.zoomOut({ duration: 300 });
          break;
        case "setTerrain":
          try {
            m.setTerrain(cmd.on ? { source: "terrain-dem", exaggeration: 1.25 } : null);
          } catch {
            /* noop */
          }
          break;
        case "resize":
          m.resize();
          break;
        default:
          break;
      }
    });

    return () => {
      unsub();
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      sharedMap.current = null;
    };
  }, [select, setScaleKm]);

  /* â”€â”€ base layers / basemap switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    for (const id of ["base", "base-labels", "satellite", "topo", "streets"]) {
      if (!m.getLayer(id)) continue;
      const on =
        id === "base" || id === "base-labels" ? basemap === "dark" : basemap === id;
      m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    }
  }, [basemap, ready]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    try {
      m.setProjection({ type: globe ? "globe" : "mercator" });
    } catch {
      /* noop */
    }
  }, [globe, ready]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    try {
      m.setTerrain(terrain ? { source: "terrain-dem", exaggeration: 1.25 } : null);
    } catch {
      /* noop */
    }
  }, [terrain, ready]);

  /* â”€â”€ push feed data into sources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    setSource("flights", flights.data ? flightsGeo(flights.data.aircraft) : null);
    setSource("ships", ships.data ? shipsGeo(ships.data.vessels) : null);
    setSource("sats", sats.data ? satellitesGeo(sats.data.satellites.filter((s) => !/ISS|TIANHE|CSS|ZARYA/i.test(s.name))) : null);
    setSource("stations", stations.data ? satellitesGeo(stations.data.all) : null);
    setSource("quakes", quakes.data ? quakesGeo(quakes.data.quakes) : null);
    setSource("fires", fires.data ? firesGeo(fires.data.fires) : null);
    setSource("storms", storms.data ? stormsGeo(storms.data.storms) : null);
    setSource("cams", cams.data ? camerasGeo(cams.data.cameras) : null);
    setSource("nukes", nuclear.data ? nuclearGeo(nuclear.data.sites) : null);
    setSource("jam", gpsjam.data ? gpsJamGeo(gpsjam.data.cells) : null);
    setSource("cyber", cyber.data ? cyberGeo(cyber.data.botnets) : null);
    setSource("cables", cables.data ? cablesGeo(cables.data.cables) : null);
    setSource("trains", trains.data ? trainsGeo(trains.data.trains) : null);
    setSource("airports", airportFeatures);
    setSource("ports", portFeatures);
    setSource("conflict", conflictNews.data ? conflictGeo(conflictNews.data.articles) : null);
  }, [ready, flights.data, ships.data, sats.data, stations.data, quakes.data, fires.data, storms.data, cams.data, nuclear.data, gpsjam.data, cyber.data, cables.data, trains.data, conflictNews.data, airportFeatures, portFeatures]);

  useEffect(() => {
    if (!volcanoes.data) return;
    const features = volcanoes.data.map((v) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [v.lon, v.lat] },
      properties: { id: v.id, kind: "volcano", title: v.name, subtitle: "Volcanic activity", payload: JSON.stringify(v) },
    }));
    setSource("volcanoes", { type: "FeatureCollection", features } as unknown as GeoJSON.FeatureCollection);
  }, [volcanoes.data]);

  useEffect(() => {
    setSource("drawings", drawingsGeo(drawings));
  }, [drawings]);

  useEffect(() => {
    setSource("route", routeGeo(route?.coordinates ?? null));
  }, [route]);

  /* â”€â”€ counts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    setCounts({
      flights: flights.data?.aircraft.length ?? 0,
      ships: ships.data?.vessels.length ?? 0,
      satellites: sats.data?.satellites.length ?? 0,
      iss: stations.data?.all.length ?? 0,
      earthquakes: quakes.data?.quakes.length ?? 0,
      fires: fires.data?.fires.length ?? 0,
      storms: storms.data?.storms.length ?? 0,
      cctv: cams.data?.cameras.length ?? 0,
      nuclear: nuclear.data?.sites.length ?? 0,
      gpsjam: gpsjam.data?.cells.length ?? 0,
      cyber: cyber.data?.botnets.length ?? 0,
      cables: cables.data?.cables.length ?? 0,
      trains: trains.data?.trains.length ?? 0,
      volcanoes: volcanoes.data?.length ?? 0,
      conflict: conflictNews.data?.articles.length ?? 0,
      airports: (airportsJson as unknown[]).length,
      ports: portsData.length,
      outages: 0,
    });
  }, [flights.data, ships.data, sats.data, stations.data, quakes.data, fires.data, storms.data, cams.data, nuclear.data, gpsjam.data, cyber.data, cables.data, trains.data, volcanoes.data, conflictNews.data, portsData.length, setCounts]);

  /* â”€â”€ radar frames â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready || !radar.data?.frames.length) return;
    const urls = radar.data.frames.map((f) => `${radar.data!.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`);
    let src = m.getSource("radar") as RasterTileSource | undefined;

    if (!src) {
      m.addSource("radar", { type: "raster", tiles: urls, tileSize: 256, maxzoom: 7, attribution: "RainViewer" });
      m.addLayer(
        {
          id: "radar",
          type: "raster",
          source: "radar",
          paint: { "raster-opacity": 0.58, "raster-fade-duration": 0, "raster-saturation": -0.2 },
        },
        firstDataLayer(m),
      );
      m.setLayoutProperty(
        "radar",
        "visibility",
        useOsiris.getState().layers["weather-radar"] ? "visible" : "none",
      );
      src = m.getSource("radar") as RasterTileSource | undefined;
    }

    let idx = 0;
    const tick = () => {
      const s = m.getSource("radar") as RasterTileSource | undefined;
      if (!s) return;
      s.setTiles(urls);
      idx = (idx + 1) % urls.length;
    };
    tick();
    const timer = setInterval(tick, 850);
    const fade = () => {
      if (!m.getLayer("radar")) return;
      const z = m.getZoom();
      m.setPaintProperty("radar", "raster-opacity", z <= 7 ? 0.58 : Math.max(0, 0.58 - (z - 7) * 0.34));
    };
    fade();
    m.on("zoom", fade);
    return () => {
      clearInterval(timer);
      m.off("zoom", fade);
    };
  }, [radar.data, ready]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready || !m.getLayer("radar")) return;
    m.setLayoutProperty("radar", "visibility", layers["weather-radar"] ? "visible" : "none");
  }, [layers, ready]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    const visibility: [string, boolean][] = [
      ["flights", layers.flights],
      ["airports", layers.airports],
      ["ships", layers.ships],
      ["ports", layers.ports],
      ["cables", layers.cables],
      ["trains", layers.trains],
      ["sats", layers.satellites],
      ["stations", layers.iss],
      ["cams", layers.cctv],
      ["quakes", layers.earthquakes],
      ["quakes-label", layers.earthquakes],
      ["fires", layers.fires],
      ["storms", layers.storms],
      ["volcanoes", layers.volcanoes],
      ["nukes", layers.nuclear],
      ["cyber", layers.cyber],
      ["jam", layers.gpsjam],
      ["conflict", layers.conflict],
    ];
    for (const [id, on] of visibility) {
      if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    }
  }, [layers, ready]);

  /* â”€â”€ draw mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    draft.current.coords = [];
    setSource("draft", EMPTY);
    if (drawMode === "off") {
      m.doubleClickZoom.enable();
      m.getCanvas().style.cursor = "";
      return;
    }
    m.doubleClickZoom.disable();
    m.getCanvas().style.cursor = "crosshair";

    const onClick = (e: MapMouseEvent) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      if (drawMode === "point") {
        addDrawing({ id: `mark-${Date.now()}`, type: "point", coords: [coords], label: fmtCoord(coords[1], coords[0]) });
        return;
      }
      draft.current.coords.push(coords);
      renderDraft(m, draft.current);
    };

    const onDbl = () => {
      const { type, coords } = draft.current;
      if (coords.length >= (type === "polygon" ? 3 : 2)) {
        addDrawing({ id: `draw-${Date.now()}`, type, coords, label: type === "polygon" ? "Area" : "Line" });
      }
      draft.current.coords = [];
      setSource("draft", EMPTY);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        draft.current.coords = [];
        setSource("draft", EMPTY);
      }
    };

    m.on("click", onClick);
    m.on("dblclick", onDbl);
    window.addEventListener("keydown", onKey);
    return () => {
      m.off("click", onClick);
      m.off("dblclick", onDbl);
      window.removeEventListener("keydown", onKey);
    };
  }, [drawMode, addDrawing]);

  /* â”€â”€ remote cursors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel("osiris-world-remote");
    channel.current = ch;

    ch.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { id?: string; lat?: number; lon?: number; name?: string };
      if (!d?.id || d.id === peerId.current || !Number.isFinite(d.lat) || !Number.isFinite(d.lon)) return;
      peers.current.set(d.id, { lat: d.lat as number, lon: d.lon as number, at: Date.now(), name: d.name ?? d.id });
      renderRemote();
    };

    const gc = setInterval(() => {
      let changed = false;
      for (const [id, p] of peers.current) {
        if (Date.now() - p.at > 12_000) {
          peers.current.delete(id);
          changed = true;
        }
      }
      if (changed) renderRemote();
    }, 5000);

    return () => {
      clearInterval(gc);
      ch.close();
      channel.current = null;
    };
  }, []);

  useEffect(() => {
    if (activeTool !== "remote" || !ready) return;
    const m = mapRef.current;
    if (!m) return;
    let last = 0;
    const onMove = (e: MapMouseEvent) => {
      if (Date.now() - last < 650) return;
      last = Date.now();
      channel.current?.postMessage({ id: peerId.current, lat: e.lngLat.lat, lon: e.lngLat.lng, name: peerId.current });
    };
    m.on("mousemove", onMove);
    return () => {
      m.off("mousemove", onMove);
    };
  }, [activeTool, ready]);

  useEffect(() => {
    setGhostNodes(peers.current.size);
  }, [setGhostNodes, activeTool]);

  /* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function setSource(id: string, data: GeoJSON.FeatureCollection | null) {
    const m = mapRef.current;
    if (!m || !ready || !data) return;
    const src = m.getSource(id) as GeoJSONSource | undefined;
    src?.setData(data);
  }

  function renderRemote() {
    const features = [...peers.current.entries()].map(([id, p]) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
      properties: { id, name: p.name },
    }));
    const m = mapRef.current;
    const src = m?.getSource("remote") as GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features } as unknown as GeoJSON.FeatureCollection);
    setGhostNodes(peers.current.size);
  }

  function renderDraft(m: MapLibreMap, d: { type: "line" | "polygon"; coords: [number, number][] }) {
    if (d.coords.length < 2) return;
    const geometry =
      d.type === "polygon"
        ? { type: "Polygon", coordinates: [[...d.coords, d.coords[0]]] }
        : { type: "LineString", coordinates: d.coords };
    const src = m.getSource("draft") as GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry, properties: {} }] } as unknown as GeoJSON.FeatureCollection);
  }

  return (
    <div className="map-shell" data-ghost={ghost ? "on" : "off"}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      <div className="map-vignette" />
      <div className="scanlines" />
      <div className="grain" />

      {hover && (
        <div
          style={{
            position: "absolute",
            left: Math.min(hover.x + 14, (container.current?.clientWidth ?? 800) - 220),
            top: Math.max(hover.y - 30, 60),
            pointerEvents: "none",
            zIndex: 15,
            padding: "4px 8px",
            background: "rgba(8,8,14,0.92)",
            border: "1px solid rgba(212,175,55,0.35)",
            borderRadius: 2,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.04em",
            color: "#e9e5d8",
            maxWidth: 240,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            boxShadow: "0 4px 18px rgba(0,0,0,0.6)",
          }}
        >
          {hover.text}
        </div>
      )}

      {selected && (
        <div className="entity-card">
          <div className="entity-head">
            <span style={{ color: "var(--gold)", fontSize: 10 }}>â—†</span>
            <div className="ec-title">{selected.title}</div>
            <button className="panel-close" onClick={() => select(null)} aria-label="Close entity">
              âœ•
            </button>
          </div>
          <div className="entity-body">
            {selected.subtitle && <div className="li-meta" style={{ marginBottom: 7 }}>{selected.subtitle}</div>}
            <dl className="kv">
              {selected.props.map((p, i) => (
                <div key={`${p.label}-${i}`} style={{ display: "contents" }}>
                  <dt>{p.label}</dt>
                  <dd className={/^[\d.\-âˆ’, ]+/.test(p.value) ? "mono" : ""}>{p.value}</dd>
                </div>
              ))}
            </dl>
            {selected.link && (
              <a
                href={selected.link}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-sm"
                style={{ marginTop: 9, width: "100%" }}
              >
                Open source record
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* â”€â”€ map layer construction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function addRasters(map: MapLibreMap) {
  const raster = (id: string, tiles: string[], attribution: string) => {
    map.addSource(id, { type: "raster", tiles, tileSize: 256, maxzoom: 19, attribution });
    map.addLayer({
      id,
      type: "raster",
      source: id,
      layout: { visibility: "none" },
      paint: { "raster-opacity": 1, "raster-fade-duration": 250 },
    });
  };

  raster(
    "satellite",
    ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    "Esri Â· Maxar Â· Earthstar Geographics",
  );
  raster(
    "topo",
    ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],
    "Esri Topographic",
  );
  raster(
    "streets",
    ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
    "Esri Streets",
  );

  map.addSource("terrain-dem", {
    type: "raster-dem",
    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 12,
  });
}

function firstDataLayer(map: MapLibreMap): string | undefined {
  return map.getLayer("cables") ? "cables" : undefined;
}

function addDataLayers(map: MapLibreMap) {
  const add = (id: string, data: GeoJSON.FeatureCollection = EMPTY) =>
    map.addSource(id, { type: "geojson", data });

  add("cables");
  map.addLayer({
    id: "cables",
    type: "line",
    source: "cables",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#c9a227", "line-width": 0.8, "line-opacity": 0.45 },
  });

  add("jam");
  map.addLayer({
    id: "jam",
    type: "circle",
    source: "jam",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "ratio"], 0.1, 6, 0.6, 22],
      "circle-color": "#ff2d55",
      "circle-opacity": 0.28,
      "circle-blur": 0.8,
      "circle-stroke-color": "#ff2d55",
      "circle-stroke-width": 0.4,
      "circle-stroke-opacity": 0.5,
    },
  });

  add("conflict");
  map.addLayer({
    id: "conflict",
    type: "circle",
    source: "conflict",
    paint: {
      "circle-radius": 4,
      "circle-color": "#ff9f1c",
      "circle-opacity": 0.65,
      "circle-stroke-color": "#ffcf8a",
      "circle-stroke-width": 0.5,
    },
  });

  add("quakes");
  map.addLayer({
    id: "quakes",
    type: "circle",
    source: "quakes",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 1, 2.5, 4, 5, 6, 10, 8.5, 20],
      "circle-color": ["interpolate", ["linear"], ["get", "mag"], 2, "#f3d97f", 5, "#ffb454", 7, "#ff5f56"],
      "circle-opacity": 0.28,
      "circle-stroke-color": ["interpolate", ["linear"], ["get", "mag"], 2, "#f3d97f", 7, "#ff5f56"],
      "circle-stroke-width": 1,
      "circle-stroke-opacity": 0.9,
    },
  });
  map.addLayer({
    id: "quakes-label",
    type: "symbol",
    source: "quakes",
    filter: [">=", ["get", "mag"], 5.6],
    layout: {
      "text-field": ["get", "title"],
      "text-size": 9,
      "text-offset": [0, -1.3],
      "text-font": ["Noto Sans Regular"],
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffd9a0", "text-halo-color": "#000", "text-halo-width": 1.2 },
  });

  add("fires");
  map.addLayer({
    id: "fires",
    type: "circle",
    source: "fires",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 1.6, 6, 3.2, 10, 5],
      "circle-color": "#ff5f2e",
      "circle-opacity": 0.72,
      "circle-blur": 0.25,
    },
  });

  add("volcanoes");
  map.addLayer({
    id: "volcanoes",
    type: "symbol",
    source: "volcanoes",
    layout: {
      "icon-image": ICON.volcano,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.45, 8, 0.8],
      "icon-allow-overlap": true,
    },
    paint: { "icon-color": "#c56b4a", "icon-halo-color": "#000", "icon-halo-width": 1 },
  });

  add("nukes");
  map.addLayer({
    id: "nukes",
    type: "symbol",
    source: "nukes",
    minzoom: 2,
    layout: {
      "icon-image": ICON.radiation,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.35, 8, 0.7],
      "icon-allow-overlap": true,
    },
    paint: { "icon-color": "#9d8cff", "icon-halo-color": "#000", "icon-halo-width": 1.2 },
  });

  add("storms");
  map.addLayer({
    id: "storms",
    type: "symbol",
    source: "storms",
    layout: {
      "icon-image": ICON.storm,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 6, 1.4],
      "icon-allow-overlap": true,
      "text-field": ["get", "title"],
      "text-size": 9,
      "text-offset": [0, 1.6],
      "text-font": ["Noto Sans Regular"],
    },
    paint: { "icon-color": "#ff8a5c", "text-color": "#ffc9a8", "text-halo-color": "#000", "text-halo-width": 1.2 },
  });

  add("airports");
  map.addLayer({
    id: "airports",
    type: "circle",
    source: "airports",
    minzoom: 3,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 9, 4],
      "circle-color": "#9c9580",
      "circle-opacity": 0.55,
    },
  });

  add("ports");
  map.addLayer({
    id: "ports",
    type: "symbol",
    source: "ports",
    minzoom: 2,
    layout: {
      "icon-image": ICON.anchor,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.32, 8, 0.6],
      "icon-allow-overlap": true,
    },
    paint: { "icon-color": "#8fb8c2", "icon-opacity": 0.8 },
  });

  add("trains");
  map.addLayer({
    id: "trains",
    type: "symbol",
    source: "trains",
    minzoom: 4,
    layout: { "icon-image": ICON.train, "icon-size": 0.4, "icon-allow-overlap": true },
    paint: { "icon-color": "#b6d46a" },
  });

  add("ships");
  map.addLayer({
    id: "ships",
    type: "symbol",
    source: "ships",
    layout: {
      "icon-image": ICON.ship,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.3, 8, 0.65],
      "icon-rotate": ["get", "track"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
    },
    paint: { "icon-color": "#5fc9d8", "icon-halo-color": "#001014", "icon-halo-width": 1 },
  });

  add("flights");
  map.addLayer({
    id: "flights",
    type: "symbol",
    source: "flights",
    layout: {
      "icon-image": ICON.plane,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.3, 5, 0.5, 10, 0.8],
      "icon-rotate": ["get", "track"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "text-field": ["get", "title"],
      "text-size": 8.5,
      "text-offset": [0, 1.35],
      "text-font": ["Noto Sans Regular"],
      "text-optional": true,
    },
    paint: {
      "icon-color": "#f0cf6a",
      "icon-halo-color": "#000",
      "icon-halo-width": 0.7,
      "text-color": "#e9dcae",
      "text-halo-color": "#000",
      "text-halo-width": 1,
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0, 7, 0.85],
    },
  });

  add("sats");
  map.addLayer({
    id: "sats",
    type: "circle",
    source: "sats",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 1.4, 6, 2.6, 10, 4],
      "circle-color": "#e8dcb0",
      "circle-opacity": 0.75,
      "circle-stroke-color": "#fff6d8",
      "circle-stroke-width": 0.3,
    },
  });

  add("stations");
  map.addLayer({
    id: "stations",
    type: "symbol",
    source: "stations",
    layout: {
      "icon-image": ICON.satellite,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 6, 0.8],
      "icon-allow-overlap": true,
      "text-field": ["get", "title"],
      "text-size": 9,
      "text-offset": [0, 1.5],
      "text-font": ["Noto Sans Regular"],
    },
    paint: { "icon-color": "#fff2c4", "text-color": "#fff2c4", "text-halo-color": "#000", "text-halo-width": 1.2 },
  });

  add("cams");
  map.addLayer({
    id: "cams",
    type: "symbol",
    source: "cams",
    minzoom: 2,
    layout: {
      "icon-image": ICON.camera,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.28, 8, 0.55, 13, 0.8],
      "icon-allow-overlap": false,
      "icon-padding": 4,
    },
    paint: { "icon-color": "#ff6b6b", "icon-halo-color": "#000", "icon-halo-width": 1 },
  });

  add("cyber");
  map.addLayer({
    id: "cyber",
    type: "symbol",
    source: "cyber",
    layout: {
      "icon-image": ICON.cyber,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 1, 0.35, 8, 0.7],
      "icon-allow-overlap": true,
    },
    paint: { "icon-color": "#ff4d6d", "icon-halo-color": "#000", "icon-halo-width": 1 },
  });

  add("drawings");
  map.addLayer({
    id: "drawings-fill",
    type: "fill",
    source: "drawings",
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": "#d4af37", "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "drawings-line",
    type: "line",
    source: "drawings",
    filter: ["in", ["geometry-type"], ["literal", ["LineString", "Polygon"]]],
    paint: { "line-color": "#f3d97f", "line-width": 1.6, "line-dasharray": [2, 1.5] },
  });
  map.addLayer({
    id: "drawings-point",
    type: "circle",
    source: "drawings",
    filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-radius": 5, "circle-color": "#d4af37", "circle-stroke-color": "#fff6d8", "circle-stroke-width": 1 },
  });

  add("draft");
  map.addLayer({
    id: "draft",
    type: "line",
    source: "draft",
    paint: { "line-color": "#f3d97f", "line-width": 1.4, "line-dasharray": [1, 1] },
  });

  add("route");
  map.addLayer({
    id: "route-casing",
    type: "line",
    source: "route",
    paint: { "line-color": "#00161a", "line-width": 6, "line-opacity": 0.8 },
  });
  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    paint: { "line-color": "#5fc9d8", "line-width": 2.4 },
  });

  add("remote");
  map.addLayer({
    id: "remote",
    type: "circle",
    source: "remote",
    paint: {
      "circle-radius": 7,
      "circle-color": "#5fc9d8",
      "circle-opacity": 0.15,
      "circle-stroke-color": "#5fc9d8",
      "circle-stroke-width": 1.2,
    },
  });
  map.addLayer({
    id: "remote-label",
    type: "symbol",
    source: "remote",
    layout: {
      "text-field": ["get", "name"],
      "text-size": 8,
      "text-offset": [0, 1.4],
      "text-font": ["Noto Sans Regular"],
    },
    paint: { "text-color": "#5fc9d8", "text-halo-color": "#000", "text-halo-width": 1 },
  });

  add("search");
  map.addLayer({
    id: "search",
    type: "circle",
    source: "search",
    paint: {
      "circle-radius": 7,
      "circle-color": "rgba(212,175,55,0.15)",
      "circle-stroke-color": "#f3d97f",
      "circle-stroke-width": 1.4,
    },
  });

  void BASE_LAYERS;
}
