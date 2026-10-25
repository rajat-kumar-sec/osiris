import type { Metadata } from "next";
import DocPage from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Documentation — OSIRIS",
  description: "Layer catalogue, tool reference, API routes, data sources, configuration and deployment for OSIRIS.",
};

const LAYERS: [string, string, string][] = [
  ["Live Aircraft", "adsb.lol + OpenSky Network", "~20 s"],
  ["Airports", "Bundled OurAirports catalogue (1,175)", "static"],
  ["Live Vessels", "AISStream · Digitraffic AIS", "~60 s"],
  ["Major Ports", "Bundled world port index (73)", "static"],
  ["Submarine Cables", "TeleGeography cable GeoJSON", "daily"],
  ["Rail Traffic", "Digitraffic / open rail APIs", "~45 s"],
  ["Satellites", "CelesTrak GP elements + SGP4", "~60 s"],
  ["ISS / Stations", "CelesTrak stations group + SGP4", "~60 s"],
  ["CCTV Cameras", "Caltrans · TfL · public camera APIs", "~5 min"],
  ["Earthquakes", "USGS M2.5+ / M4.5+ summaries", "~60 s"],
  ["Wildfires", "NASA FIRMS · NASA EONET", "~10 min"],
  ["Volcanoes", "NASA EONET volcanic events", "~10 min"],
  ["Nuclear Facilities", "Wikidata / IAEA-derived open data", "daily"],
  ["Cyber Threats", "CISA KEV · NVD · Feodo Tracker", "~15 min"],
  ["GPS Jamming", "gpsjam.org ADS-B degradation cells", "daily"],
  ["Conflict Watch", "GDELT geolocated reporting", "~5 min"],
  ["Internet Outages", "Cloudflare Radar annotations", "~5 min"],
  ["Precipitation Radar", "RainViewer composite tiles", "~5 min"],
  ["Tropical Storms", "NOAA NHC · GDACS", "~10 min"],
];

const TOOLS: [string, string][] = [
  ["RECON", "DNS, WHOIS/RDAP, TLS + Certificate Transparency, BGP, IP intelligence, threat matching, HTTP fingerprinting and an authorized TCP connect scan."],
  ["SPACE", "Browse orbital groups, propagate positions, inspect NOAA space-weather indices, flares and Kp history."],
  ["MARKET", "Live indices, defense equities, energy, commodities, FX and crypto with breadth and sparklines."],
  ["ALERTS", "Unified incident stream across seismic, wildfire, cyber, weather, conflict, space and outage feeds."],
  ["DRAW", "Drop markers, measure paths, measure areas and export annotations as GeoJSON."],
  ["OI", "The resident analyst. Answers from live layer counts, your selected entity and workspace context."],
  ["ROUTE", "Multi-modal directions with OSRM, turn-by-turn steps and automatic map framing."],
  ["SEARCH", "Geocode places with Nominatim, match the bundled airport catalogue, or jump to raw coordinates."],
  ["ARCGIS", "Swap in Esri reference basemaps or stack any public XYZ raster with opacity control."],
  ["REMOTE", "Share a map cursor with another operator window over BroadcastChannel. No server involved."],
  ["STYLE", "Five accent themes, four basemaps, globe/terrain/radar composition and presets."],
  ["GHOST", "Mask coordinates and operator identity, dim identifying chrome and purge local traces."],
];

const API: [string, string][] = [
  ["GET /api/flights", "Global aircraft positions, region-tagged"],
  ["GET /api/satellites?group=", "SGP4-propagated catalogue; mode=iss for stations"],
  ["GET /api/earthquakes", "USGS seismic events"],
  ["GET /api/fires", "Active fire detections"],
  ["GET /api/storms", "Active tropical cyclones"],
  ["GET /api/hazards", "GDACS + EONET + volcanoes"],
  ["GET /api/weather", "RainViewer frames and host"],
  ["GET /api/maritime", "Vessel positions from AIS feeds"],
  ["GET /api/cctv", "Public traffic camera inventory"],
  ["GET /api/cyber", "KEV, NVD and botnet C2 intelligence"],
  ["GET /api/news", "Geolocated GDELT reporting"],
  ["GET /api/markets", "Equities, commodities, FX, crypto"],
  ["GET /api/spaceweather", "NOAA SWPC product summary"],
  ["GET /api/gpsjam", "Navigation-degradation cells"],
  ["GET /api/cables", "Submarine cable geometry"],
  ["GET /api/nuclear", "Nuclear facility inventory"],
  ["GET /api/trains", "Live rail positions"],
  ["GET /api/alerts", "Aggregated alert stream"],
  ["GET /api/stats", "Platform status and cache counters"],
  ["GET /api/search?q=", "Geocoding and airport matching"],
  ["GET /api/directions?from=&to=&mode=", "OSRM routing"],
  ["POST /api/oi", "Analyst reply from workspace context"],
  ["GET /api/recon/dns|whois|ssl|bgp|ip|threat|http", "Passive reconnaissance"],
  ["POST /api/recon/scan", "Authorized TCP connect scan"],
];

const ENV: [string, string][] = [
  ["AISSTREAM_API_KEY", "Global live vessel positions. Keyless Baltic/Nordic AIS is the fallback."],
  ["NASA_FIRMS_KEY", "Higher-volume fire detections. EONET remains keyless."],
  ["URLHAUS_AUTH_KEY", "Malicious URL intelligence from abuse.ch."],
  ["CLOUDFLARE_RADAR_TOKEN", "Outage annotations and radar summaries."],
  ["OI_API_KEY / OI_BASE_URL / OI_MODEL", "Connect any OpenAI-compatible model for OI reasoning."],
  ["UPSTASH_REDIS_REST_URL / TOKEN", "Shared cache across serverless instances."],
  ["SCAN_MAX_PORTS / SCAN_TIMEOUT_MS / SCAN_CONCURRENCY / SCAN_RATE_PER_HOUR", "Scanner guardrails."],
];

export default function DocsPage() {
  return (
    <DocPage
      eyebrow="OPERATOR MANUAL"
      title="Documentation"
      intro="OSIRIS is a self-hostable intelligence workspace. It aggregates public feeds into one globe and pairs them with a passive-first reconnaissance suite. No account, no paywall, no proprietary data."
    >
      <h2>Quick start</h2>
      <pre className="code-block">{`# Node 20+ is required
npm install
cp .env.example .env.local   # every key is optional
npm run dev                  # http://localhost:3000

npm run typecheck
npm run build && npm start`}</pre>
      <p>
        The first paint shows a short boot sequence. Skip it at any time. Feeds begin loading in parallel and each layer
        caches independently, so a slow upstream never blocks the map.
      </p>

      <h2>Layer catalogue</h2>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Source</th>
              <th>Refresh</th>
            </tr>
          </thead>
          <tbody>
            {LAYERS.map(([name, source, cadence]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{source}</td>
                <td className="mono">{cadence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Tools</h2>
      <dl className="doc-defs">
        {TOOLS.map(([name, text]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>

      <h2>HTTP API</h2>
      <p>
        Every route returns an envelope: <code>{`{ ok, data, meta }`}</code> where <code>meta</code> carries the source,
        fetch time, latency and staleness. Routes are server-rendered and cache with stale-while-revalidate semantics.
      </p>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Returns</th>
            </tr>
          </thead>
          <tbody>
            {API.map(([route, desc]) => (
              <tr key={route}>
                <td className="mono">{route}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Configuration</h2>
      <p>
        The platform is keyless by default. Optional variables unlock higher-volume or higher-fidelity upstreams and
        never change the interface.
      </p>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            {ENV.map(([key, desc]) => (
              <tr key={key}>
                <td className="mono">{key}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Keyboard</h2>
      <div className="doc-keys">
        <span><kbd>Ctrl</kbd> <kbd>K</kbd> global search</span>
        <span><kbd>/</kbd> global search</span>
        <span><kbd>Esc</kbd> close panel / cancel draft</span>
        <span><kbd>Shift</kbd> <kbd>Enter</kbd> newline in OI</span>
      </div>

      <h2>Deployment</h2>
      <p>
        Any Node host works. On Vercel, deploy the repository as-is; the API routes are serverless-compatible and the
        in-memory cache degrades gracefully to per-instance reuse. Add Upstash for a shared cache across regions.
      </p>

      <h2>Authorized use</h2>
      <p>
        Passive lookups query public registries and are safe. The port scanner performs TCP connect attempts against a
        host you name, so it requires an explicit authorization checkbox and refuses private, loopback, link-local and
        reserved address space. Only scan systems you own or have written permission to test. You are responsible for
        complying with local law.
      </p>
      <p className="doc-note">
        OSIRIS aggregates publicly available data. Freshness, accuracy and completeness depend on the upstream
        providers. Verify before acting on anything you see here.
      </p>
    </DocPage>
  );
}
