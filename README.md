# OSIRIS

**Open Source Intelligence Platform** — a self-hostable geospatial workspace that puts live aircraft, vessels,
satellites, public cameras, natural hazards, cyber threats and a full OSINT recon suite on one 3D globe.

Built with Next.js 16, React 19, MapLibre GL 6 and Tailwind 4. No accounts, no paywall, no proprietary data.

---

## Highlights

- **3D / 2D globe** with terrain, animated radar, four basemaps (dark vector, satellite, topographic, streets) and smooth camera commands.
- **19 live layers** across aviation, maritime, ground transit, space, surveillance, hazards, threats, network intel
  and weather.
- **12 operator tools**: Recon, Space, Markets, Alerts, Draw, OI, Directions, Search, ArcGIS, Remote, Style Studio and
  Ghost Protocol.
- **Passive-first reconnaissance**: DNS, WHOIS/RDAP, TLS + Certificate Transparency, BGP, IP intelligence, threat
  matching, HTTP fingerprinting and an authorized TCP connect scanner.
- **Unified alert stream** with severity and category filters.
- **Everything degrades gracefully**: every environment variable is optional and keyless public feeds are the default.

## Quick start

```bash
# Node 20+ required
npm install
cp .env.example .env.local     # optional — every key may stay empty
npm run dev                    # http://localhost:3000

npm run typecheck
npm run build && npm start
```

The boot screen is cosmetic; skip it with the link. Feeds load in parallel and each layer caches independently.

## Layers

| Group | Layers |
| --- | --- |
| Weather | Precipitation radar, tropical storms |
| Aviation | Live aircraft, 1,175 airports |
| Maritime | Live vessels, major ports, submarine cables |
| Ground Transit | Rail traffic |
| Space Tracking | Satellites, ISS / crewed stations |
| Surveillance | Public CCTV cameras |
| Natural Hazards | Earthquakes, wildfires, volcanoes, nuclear facilities |
| Threats & Intel | Cyber threats, GPS jamming, conflict watch |
| Network Intel | Internet outages |
| Display | Terrain, projection, Style Studio |

## Tools

| Tool | What it does |
| --- | --- |
| **RECON** | DNS, WHOIS, TLS, BGP, IP, threat, HTTP and port scanning |
| **SPACE** | Orbital catalogue browser and NOAA space weather |
| **MARKET** | Indices, defense, energy, commodities, FX, crypto |
| **ALERTS** | Aggregated incident stream with filters |
| **DRAW** | Markers, distance and area measurement, GeoJSON export |
| **OI** | Resident analyst using live workspace context |
| **ROUTE** | OSRM multi-modal directions with turn list |
| **SEARCH** | Nominatim geocoding, airport lookup, coordinates |
| **ARCGIS** | Esri reference basemaps and custom XYZ rasters |
| **REMOTE** | Same-device cursor presence over BroadcastChannel |
| **STYLE** | Five themes, basemaps, composition presets |
| **GHOST** | Coordinate masking and local trace purge |

## Data sources

All upstreams are public. OSIRIS does not scrape other aggregators; it talks to the primary source.

- **Aviation** — adsb.lol, OpenSky Network
- **Maritime** — AISStream (optional key), Digitraffic AIS
- **Orbital** — CelesTrak GP elements, propagated in-process with SGP4 (`satellite.js`); SatNOGS DB, AMSAT and the keyless TLE API are used automatically if CelesTrak is unreachable
- **Space weather** — NOAA SWPC
- **Seismic** — USGS
- **Fires / volcanoes** — NASA EONET, NASA FIRMS (optional key)
- **Storms** — NOAA NHC, GDACS
- **Weather radar** — RainViewer
- **Basemaps** — OpenFreeMap (dark vector), Esri World Imagery / Topo / Streets
- **Surveillance** — Caltrans, Transport for London and other public camera APIs
- **Cyber** — CISA KEV, NVD, Feodo Tracker, abuse.ch URLhaus (optional key), Spamhaus DROP, Tor exit list
- **Network** — Cloudflare Radar (optional token), RIPEstat, ipwho.is, RDAP, Cloudflare DoH, crt.sh
- **News / conflict** — GDELT 2.0 DOC and Google News RSS, queried in parallel
- **Markets** — Yahoo Finance chart API, CoinGecko
- **Cables** — TeleGeography public GeoJSON
- **Nuclear** — Wikidata / IAEA-derived open records
- **Rail** — Digitraffic
- **Geocoding / routing** — OpenStreetMap Nominatim, OSRM

Cables, nuclear and airport/port catalogues are bundled so the map is useful even when an upstream is down.

## API

Every route returns `{ ok, data, meta }`. `meta` records source, fetch time, latency and staleness.

```
GET  /api/flights                 GET  /api/satellites?group=
GET  /api/earthquakes             GET  /api/fires
GET  /api/storms                  GET  /api/hazards
GET  /api/weather                 GET  /api/maritime
GET  /api/cctv                    GET  /api/cyber
GET  /api/news                    GET  /api/markets
GET  /api/spaceweather            GET  /api/gpsjam
GET  /api/cables                  GET  /api/nuclear
GET  /api/trains                  GET  /api/alerts
GET  /api/stats                   GET  /api/search?q=
GET  /api/directions?from=&to=    POST /api/oi
GET  /api/recon/dns|whois|ssl|bgp|ip|threat|http
POST /api/recon/scan
```

The cache is an in-memory stale-while-revalidate store with request coalescing. Set Upstash credentials for a shared
cache on serverless platforms.

## Configuration

Copy `.env.example` to `.env.local`. Empty values are fine.

| Variable | Purpose |
| --- | --- |
| `AISSTREAM_API_KEY` | Global live vessel positions |
| `NASA_FIRMS_KEY` | Higher-volume fire detections |
| `URLHAUS_AUTH_KEY` | Malicious URL intelligence |
| `ABUSEIPDB_API_KEY` | IP reputation enrichment |
| `CLOUDFLARE_RADAR_TOKEN` | Outage annotations |
| `OI_API_KEY` / `OI_BASE_URL` / `OI_MODEL` | Any OpenAI-compatible model for OI |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Shared cache |
| `SCAN_MAX_PORTS` / `SCAN_TIMEOUT_MS` / `SCAN_CONCURRENCY` / `SCAN_RATE_PER_HOUR` | Scanner guardrails |

## Scanner safety

`POST /api/recon/scan` performs TCP connect attempts from the server.

- Requires `authorized: true`; otherwise `403`.
- Rejects loopback, private, link-local, multicast and reserved address space.
- Caps port count, concurrency and duration, and rate limits per client.
- Returns only open ports, service guesses and latency.

**Only scan systems you own or have explicit written permission to test.** Unauthorized scanning may be illegal.

## Deploy

**Vercel** — import the repository, leave the build settings on defaults, add optional env vars. All route handlers are
serverless-compatible.

**Docker / Node host**

```bash
npm ci
npm run build
npm start          # binds 0.0.0.0:3000
```

**Static export** is not supported because the feeds are server routes.

## Keyboard

| Keys | Action |
| --- | --- |
| `Ctrl/Cmd + K`, `/` | Global search |
| `Esc` | Close panel or cancel a drawing draft |
| `Shift + Enter` | New line in OI |

## Project structure

```
src/
  app/                 App Router pages, docs, privacy, API route handlers
  components/
    hud/               Top bar, layer rail, tool rail, status bar, boot screen
    map/               MapLibre globe, GeoJSON builders, icon sprites
    panels/            The twelve operator tools
  data/                Bundled airports and ports
  lib/
    feeds/             Upstream integrations
    cache.ts           Stale-while-revalidate cache
    rates / http       Fetch, CSV and rate-limit helpers
```

## Legal

OSIRIS is an aggregation interface over public data. Each upstream keeps its own licence and terms; respect them.
Camera streams are published by public authorities and are not recorded here. Nothing in this platform grants
permission to access systems you do not own. The software is provided as-is, without warranty, for research and
professional use.

## Licence

MIT for the code. Bundled data retains the licence of its source.
