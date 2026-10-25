export type FeedMeta = {
  source: string;
  fetchedAt: string;
  latencyMs: number;
  count?: number;
  stale?: boolean;
  note?: string;
  cached?: boolean;
};

export type Envelope<T> = {
  ok: boolean;
  data: T;
  meta: FeedMeta;
  error?: string;
};

export type LatLon = { lat: number; lon: number };

export type Aircraft = {
  id: string;
  callsign: string;
  registration?: string;
  type?: string;
  lat: number;
  lon: number;
  altitude: number;
  groundSpeed: number;
  track: number;
  verticalRate?: number;
  squawk?: string;
  onGround?: boolean;
  country?: string;
  seen?: number;
};

export type Vessel = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  sog?: number;
  cog?: number;
  heading?: number;
  type?: string;
  destination?: string;
  draught?: number;
  eta?: string;
  flag?: string;
  source: string;
};

export type SatellitePosition = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  category: string;
  country?: string;
  launchDate?: string;
};

export type Quake = {
  id: string;
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depth: number;
  url: string;
  tsunami: boolean;
  alert?: string;
};

export type Wildfire = {
  id: string;
  lat: number;
  lon: number;
  brightness?: number;
  confidence?: number;
  frp?: number;
  acquired?: string;
  satellite?: string;
  daynight?: string;
};

export type Storm = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  wind?: number;
  pressure?: number;
  movement?: string;
  basin?: string;
  updated?: string;
};

export type CctvCamera = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
  region: string;
  country: string;
  stream: string;
  kind: "hls" | "image" | "youtube";
  source: string;
  online?: boolean;
};

export type CyberItem = {
  id: string;
  title: string;
  description?: string;
  severity?: "critical" | "high" | "medium" | "low" | "info";
  cvss?: number;
  published?: string;
  source: string;
  url?: string;
  vendor?: string;
  product?: string;
  kev?: boolean;
  ransomware?: boolean;
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  published: string;
  country?: string;
  tone?: number;
  lat?: number;
  lon?: number;
  image?: string;
  summary?: string;
};

export type Cable = {
  id: string;
  name: string;
  coordinates: [number, number][];
  lengthKm?: number;
  owners?: string;
  rfs?: string;
  landingPoints?: string[];
};

export type NuclearSite = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  capacityMw?: number;
  reactors?: number;
  status?: string;
  operator?: string;
};

export type Port = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  code?: string;
  teu?: number;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  currency?: string;
  group: "crypto" | "defense" | "energy" | "commodity" | "index" | "fx";
  spark?: number[];
};

export type SpaceWeather = {
  kp: number;
  kpForecast: { time: string; kp: number }[];
  solarWind: { speed: number; density: number; bt: number; bz: number };
  flares: { time: string; klass: string; region?: string }[];
  scales: { r: number; s: number; g: number };
  updated: string;
};

export type GpsJamCell = {
  lat: number;
  lon: number;
  ratio: number;
  count: number;
};

export type Outage = {
  id: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  severity: number;
  start: string;
  end?: string;
  score?: number;
  source: string;
};

export type Alert = {
  id: string;
  kind: "earthquake" | "fire" | "cyber" | "weather" | "conflict" | "space" | "outage" | "maritime";
  title: string;
  detail?: string;
  severity: "critical" | "high" | "medium" | "low";
  time: string;
  lat?: number;
  lon?: number;
  url?: string;
};

export type LayerId =
  | "flights"
  | "airports"
  | "ships"
  | "ports"
  | "satellites"
  | "iss"
  | "cctv"
  | "earthquakes"
  | "fires"
  | "storms"
  | "volcanoes"
  | "nuclear"
  | "cables"
  | "cyber"
  | "gpsjam"
  | "outages"
  | "weather-radar"
  | "conflict"
  | "live-news"
  | "incidents"
  | "day-night"
  | "trains";

export type LayerGroupId =
  | "weather"
  | "aviation"
  | "maritime"
  | "transit"
  | "space"
  | "surveillance"
  | "hazards"
  | "threats"
  | "network"
  | "display";

export type LayerDef = {
  id: LayerId;
  label: string;
  group: LayerGroupId;
  color: string;
  description: string;
};

export type ToolId =
  | "recon"
  | "space"
  | "markets"
  | "alerts"
  | "draw"
  | "oi"
  | "directions"
  | "search"
  | "arcgis"
  | "remote"
  | "style"
  | "ghost";
