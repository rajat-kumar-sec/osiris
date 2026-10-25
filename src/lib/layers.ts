import type { LayerDef, LayerGroupId, LayerId } from "./types";

export const LAYER_GROUPS: { id: LayerGroupId; label: string; icon: string }[] = [
  { id: "weather", label: "Weather", icon: "cloud" },
  { id: "aviation", label: "Aviation", icon: "plane" },
  { id: "maritime", label: "Maritime", icon: "ship" },
  { id: "transit", label: "Ground Transit", icon: "train" },
  { id: "space", label: "Space Tracking", icon: "satellite" },
  { id: "surveillance", label: "Surveillance", icon: "camera" },
  { id: "hazards", label: "Natural Hazards", icon: "flame" },
  { id: "threats", label: "Threats & Intel", icon: "shield" },
  { id: "network", label: "Network Intel", icon: "network" },
  { id: "display", label: "Display", icon: "layers" },
];

export const LAYERS: LayerDef[] = [
  { id: "weather-radar", label: "Precipitation Radar", group: "weather", color: "#4fa3d1", description: "RainViewer global radar composite" },
  { id: "storms", label: "Tropical Storms", group: "weather", color: "#ff8a5c", description: "NOAA NHC + GDACS active cyclones" },

  { id: "flights", label: "Live Aircraft", group: "aviation", color: "#d4af37", description: "ADS-B positions from adsb.lol / OpenSky" },
  { id: "airports", label: "Airports", group: "aviation", color: "#9c9580", description: "1,175 large airports worldwide" },

  { id: "ships", label: "Live Vessels", group: "maritime", color: "#5fc9d8", description: "AIS vessel positions" },
  { id: "ports", label: "Major Ports", group: "maritime", color: "#8fb8c2", description: "Top container and bulk ports" },
  { id: "cables", label: "Submarine Cables", group: "maritime", color: "#c9a227", description: "TeleGeography cable routes" },

  { id: "trains", label: "Rail Traffic", group: "transit", color: "#b6d46a", description: "Live train positions (open data)" },

  { id: "satellites", label: "Satellites", group: "space", color: "#e8dcb0", description: "SGP4 propagation from CelesTrak TLEs" },
  { id: "iss", label: "ISS / Stations", group: "space", color: "#fff2c4", description: "Crewed stations and orbital labs" },

  { id: "cctv", label: "CCTV Cameras", group: "surveillance", color: "#ff6b6b", description: "Public traffic cameras with live streams" },

  { id: "earthquakes", label: "Earthquakes", group: "hazards", color: "#ffb454", description: "USGS M2.5+ / M4.5+ feeds" },
  { id: "fires", label: "Wildfires", group: "hazards", color: "#ff5f2e", description: "NASA FIRMS / EONET fire detections" },
  { id: "volcanoes", label: "Volcanoes", group: "hazards", color: "#c56b4a", description: "Open volcanic activity (EONET)" },
  { id: "nuclear", label: "Nuclear Facilities", group: "hazards", color: "#9d8cff", description: "Global nuclear power plants" },

  { id: "cyber", label: "Cyber Threats", group: "threats", color: "#ff4d6d", description: "CISA KEV, NVD and botnet C2 geolocation" },
  { id: "gpsjam", label: "GPS Jamming", group: "threats", color: "#ff2d55", description: "ADS-B navigation degradation cells" },
  { id: "conflict", label: "Conflict Watch", group: "threats", color: "#ff9f1c", description: "Geolocated conflict reporting" },
  { id: "live-news", label: "Live News", group: "threats", color: "#ffd166", description: "Geolocated world headlines from GDELT and Google News" },
  { id: "incidents", label: "Global Incidents", group: "hazards", color: "#ff7a45", description: "GDACS disaster alerts worldwide" },

  { id: "outages", label: "Internet Outages", group: "network", color: "#7d7dff", description: "Cloudflare Radar outage annotations" },

  { id: "day-night", label: "Day / Night", group: "display", color: "#55617a", description: "Live solar terminator shading" },
];

export const LAYER_BY_ID = new Map<LayerId, LayerDef>(LAYERS.map((l) => [l.id, l]));

export const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  flights: true,
  airports: false,
  ships: true,
  ports: false,
  satellites: true,
  iss: true,
  cctv: true,
  earthquakes: true,
  fires: true,
  storms: true,
  volcanoes: false,
  nuclear: false,
  cables: true,
  cyber: false,
  gpsjam: false,
  outages: false,
  "weather-radar": true,
  conflict: false,
  "live-news": false,
  incidents: false,
  "day-night": false,
  trains: false,
};

export const GROUP_COLORS: Record<LayerGroupId, string> = {
  weather: "#4fa3d1",
  aviation: "#d4af37",
  maritime: "#5fc9d8",
  transit: "#b6d46a",
  space: "#e8dcb0",
  surveillance: "#ff6b6b",
  hazards: "#ffb454",
  threats: "#ff4d6d",
  network: "#7d7dff",
  display: "#8f8977",
};
