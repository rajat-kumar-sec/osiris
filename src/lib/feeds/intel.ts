import { cellToLatLng } from "h3-js";
import { fetchJson, fetchText, num } from "../http";
import type { Cable, GpsJamCell, NuclearSite, Outage } from "../types";
import { COUNTRY_CENTROIDS } from "./cyber";

/* ── News (GDELT + Google News fallback) ───────────────────── */

type GdeltArticle = {
  url: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
};

export type NewsArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  published: string;
  country?: string;
  image?: string;
  lat?: number;
  lon?: number;
};

export const NEWS_TOPICS = {
  world: "world news",
  conflict: "(conflict OR war OR military OR strike)",
  cyber: "(cyberattack OR ransomware OR data breach OR hacking)",
  maritime: "(shipping OR vessel OR port OR maritime security)",
  aviation: "(aviation OR airline OR airport OR airspace)",
  energy: "(oil OR gas OR pipeline OR energy security)",
  india: "India",
} as const;

export type NewsTopic = keyof typeof NEWS_TOPICS;

const COUNTRY_NAMES: Record<string, [number, number]> = {
  "United States": COUNTRY_CENTROIDS.US, China: COUNTRY_CENTROIDS.CN, Russia: COUNTRY_CENTROIDS.RU,
  Germany: COUNTRY_CENTROIDS.DE, Netherlands: COUNTRY_CENTROIDS.NL, France: COUNTRY_CENTROIDS.FR,
  "United Kingdom": COUNTRY_CENTROIDS.GB, India: COUNTRY_CENTROIDS.IN, Brazil: COUNTRY_CENTROIDS.BR,
  Japan: COUNTRY_CENTROIDS.JP, "South Korea": COUNTRY_CENTROIDS.KR, Singapore: COUNTRY_CENTROIDS.SG,
  "Hong Kong": COUNTRY_CENTROIDS.HK, Taiwan: COUNTRY_CENTROIDS.TW, Vietnam: COUNTRY_CENTROIDS.VN,
  Thailand: COUNTRY_CENTROIDS.TH, Indonesia: COUNTRY_CENTROIDS.ID, Malaysia: COUNTRY_CENTROIDS.MY,
  Philippines: COUNTRY_CENTROIDS.PH, Australia: COUNTRY_CENTROIDS.AU, Canada: COUNTRY_CENTROIDS.CA,
  Mexico: COUNTRY_CENTROIDS.MX, Argentina: COUNTRY_CENTROIDS.AR, Chile: COUNTRY_CENTROIDS.CL,
  Colombia: COUNTRY_CENTROIDS.CO, Peru: COUNTRY_CENTROIDS.PE, Venezuela: COUNTRY_CENTROIDS.VE,
  "South Africa": COUNTRY_CENTROIDS.ZA, Nigeria: COUNTRY_CENTROIDS.NG, Egypt: COUNTRY_CENTROIDS.EG,
  Kenya: COUNTRY_CENTROIDS.KE, Morocco: COUNTRY_CENTROIDS.MA, Turkey: COUNTRY_CENTROIDS.TR,
  "Saudi Arabia": COUNTRY_CENTROIDS.SA, "United Arab Emirates": COUNTRY_CENTROIDS.AE,
  Israel: COUNTRY_CENTROIDS.IL, Iran: COUNTRY_CENTROIDS.IR, Iraq: COUNTRY_CENTROIDS.IQ,
  Pakistan: COUNTRY_CENTROIDS.PK, Bangladesh: COUNTRY_CENTROIDS.BD, "Sri Lanka": COUNTRY_CENTROIDS.LK,
  Ukraine: COUNTRY_CENTROIDS.UA, Poland: COUNTRY_CENTROIDS.PL, Romania: COUNTRY_CENTROIDS.RO,
  Sweden: COUNTRY_CENTROIDS.SE, Norway: COUNTRY_CENTROIDS.NO, Finland: COUNTRY_CENTROIDS.FI,
  Denmark: COUNTRY_CENTROIDS.DK, Italy: COUNTRY_CENTROIDS.IT, Spain: COUNTRY_CENTROIDS.ES,
  Portugal: COUNTRY_CENTROIDS.PT, Greece: COUNTRY_CENTROIDS.GR, "New Zealand": COUNTRY_CENTROIDS.NZ,
};

function parseGdeltDate(s: string): string {
  // 20261025T133000Z
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return new Date().toISOString();
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString();
}

async function gdeltNews(topic: NewsTopic): Promise<NewsArticle[]> {
  const q = encodeURIComponent(NEWS_TOPICS[topic]);
  const data = await fetchJson<{ articles?: GdeltArticle[] }>(
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=60&format=json&sort=datedesc&timespan=1d`,
    { timeout: 9000, retries: 0 },
  );
  return (data.articles ?? []).map((a, i) => {
    const c = COUNTRY_NAMES[a.sourcecountry];
    return {
      id: `${topic}-${i}-${a.url}`,
      title: a.title,
      url: a.url,
      source: a.domain,
      published: parseGdeltDate(a.seendate),
      country: a.sourcecountry,
      image: a.socialimage || undefined,
      lat: c?.[0],
      lon: c?.[1],
    };
  });
}

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

async function rssNews(topic: NewsTopic): Promise<NewsArticle[]> {
  const q = encodeURIComponent(NEWS_TOPICS[topic]);
  const xml = await fetchText(
    `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`,
    { timeout: 9000, retries: 0 },
  );
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 40);
  return items.map((m, i) => {
    const block = m[1];
    const pick = (tag: string) => decodeXml(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
    return {
      id: `rss-${topic}-${i}-${pick("link")}`,
      title: pick("title"),
      url: pick("link"),
      source: pick("source") || "Google News",
      published: new Date(pick("pubDate") || Date.now()).toISOString(),
    };
  });
}

/** Attach approximate coordinates to headlines that do not carry them. */
function geocodeHeadlines<T extends { title: string; lat?: number; lon?: number }>(items: T[]): T[] {
  const aliases: [string, [number, number]][] = [
    ["united states", COUNTRY_CENTROIDS.US],
    ["u.s.", COUNTRY_CENTROIDS.US],
    [" us ", COUNTRY_CENTROIDS.US],
    ["britain", COUNTRY_CENTROIDS.GB],
    ["uk", COUNTRY_CENTROIDS.GB],
    ["united kingdom", COUNTRY_CENTROIDS.GB],
  ];
  const lookup = [...Object.entries(COUNTRY_NAMES), ...aliases];
  for (const item of items) {
    if (item.lat != null && item.lon != null) continue;
    const hay = ` ${item.title.toLowerCase()} `;
    for (const [name, c] of lookup) {
      if (hay.includes(name.toLowerCase())) {
        item.lat = c[0];
        item.lon = c[1];
        break;
      }
    }
  }
  return items;
}

export async function loadNews(topic: NewsTopic) {
  const [gdelt, rss] = await Promise.allSettled([gdeltNews(topic), rssNews(topic)]);
  const g = gdelt.status === "fulfilled" ? gdelt.value : [];
  const r = rss.status === "fulfilled" ? rss.value : [];
  const mapped = (list: { lat?: number }[]) => list.filter((a) => a.lat != null).length;
  const useGdelt = mapped(g) >= 8 || g.length >= r.length;
  const articles = geocodeHeadlines(useGdelt ? g : r);
  if (!articles.length) throw new Error("news upstreams returned no articles");
  return { articles, source: useGdelt ? "GDELT 2.0 DOC" : "Google News RSS", topic };
}

/* ── GPS jamming (gpsjam.org H3 cells) ─────────────────────── */

export async function loadGpsJam() {
  const manifest = await fetchText("https://gpsjam.org/data/manifest.csv", {
    timeout: 10000,
    headers: { Referer: "https://gpsjam.org/" },
  });
  const rows = manifest.trim().split(/\r?\n/).slice(1);
  const latest = rows.at(-1)?.split(",")[0] ?? "";
  if (!latest) throw new Error("no GPSJam manifest");
  const csv = await fetchText(`https://gpsjam.org/data/${latest}-h3_4.csv`, {
    timeout: 15000,
    headers: { Referer: "https://gpsjam.org/" },
  });

  const cells: GpsJamCell[] = [];
  for (const line of csv.split(/\r?\n/).slice(1)) {
    if (!line) continue;
    const [hex, goodS, badS] = line.split(",");
    const good = num(goodS, 0);
    const bad = num(badS, 0);
    if (bad <= 0) continue;
    const total = good + bad;
    const ratio = total ? bad / total : 0;
    if (ratio < 0.1 || bad < 1) continue;
    try {
      const [lat, lon] = cellToLatLng(hex);
      cells.push({ lat, lon, ratio, count: bad });
    } catch {
      /* skip malformed cell */
    }
  }
  cells.sort((a, b) => b.ratio * b.count - a.ratio * a.count);
  return { cells: cells.slice(0, 3000), date: latest, source: "gpsjam.org (ADS-B Exchange)" };
}

/* ── Submarine cables ──────────────────────────────────────── */

type CableGeo = {
  features: {
    properties: { id: string; name: string; feature_id?: string };
    geometry: { type: "MultiLineString" | "LineString"; coordinates: number[][][] | number[][] };
  }[];
};

export async function loadCables() {
  const data = await fetchJson<CableGeo>("https://www.submarinecablemap.com/api/v3/cable/cable-geo.json", {
    timeout: 15000,
  });
  const byId = new Map<string, Cable>();
  for (const f of data.features ?? []) {
    const id = f.properties.id;
    const lines = f.geometry.type === "MultiLineString" ? (f.geometry.coordinates as number[][][]) : [f.geometry.coordinates as number[][]];
    const longest = lines.slice().sort((a, b) => b.length - a.length)[0];
    if (!longest) continue;
    const coords = longest
      .filter((_, i) => i % 3 === 0 || i === longest.length - 1)
      .map(([lon, lat]) => [Number(lon.toFixed(3)), Number(lat.toFixed(3))] as [number, number]);
    const existing = byId.get(id);
    if (existing) existing.coordinates.push(...coords);
    else
      byId.set(id, {
        id,
        name: f.properties.name,
        coordinates: coords,
      });
  }
  return { cables: [...byId.values()], source: "TeleGeography Submarine Cable Map" };
}

/* ── Nuclear facilities (Wikidata) ─────────────────────────── */

type SparqlResponse = {
  results: {
    bindings: {
      item: { value: string };
      itemLabel?: { value: string };
      coord?: { value: string };
      countryLabel?: { value: string };
      capacity?: { value: string };
    }[];
  };
};

const NUCLEAR_QUERY = `SELECT ?item ?itemLabel ?coord ?countryLabel ?capacity WHERE {
  ?item wdt:P31/wdt:P279* wd:Q134447 .
  ?item wdt:P625 ?coord .
  OPTIONAL { ?item wdt:P17 ?country . }
  OPTIONAL { ?item wdt:P2109 ?capacity . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 500`;

export async function loadNuclear() {
  const data = await fetchJson<SparqlResponse>(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(NUCLEAR_QUERY)}`,
    {
      timeout: 20000,
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": "OSIRIS/5.0 (open-source intelligence platform; +https://osirisai.live)",
      },
    },
  );
  const sites: NuclearSite[] = [];
  for (const b of data.results.bindings) {
    const m = b.coord?.value?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
    if (!m) continue;
    sites.push({
      id: b.item.value.split("/").pop() ?? "",
      name: b.itemLabel?.value ?? "Nuclear facility",
      lon: parseFloat(m[1]),
      lat: parseFloat(m[2]),
      country: b.countryLabel?.value ?? "",
      capacityMw: b.capacity ? num(b.capacity.value, 0) : undefined,
    });
  }
  return { sites, source: "Wikidata / IAEA" };
}

/* ── Internet outages (Cloudflare Radar, optional) ─────────── */

export async function loadOutages() {
  const token = process.env.CLOUDFLARE_RADAR_TOKEN;
  if (!token) return { outages: [] as Outage[], note: "Set CLOUDFLARE_RADAR_TOKEN to enable live outage annotations." };
  const data = await fetchJson<{
    result?: {
      annotations?: {
        id: string;
        description?: string;
        startDate: string;
        endDate?: string;
        asnDetails?: { asn: string; name: string };
        locations?: string[];
        linkedUrl?: string;
      }[];
    };
  }>(
    "https://api.cloudflare.com/client/v4/radar/annotations/outages?dateRange=7d&limit=100&format=json",
    { timeout: 12000, headers: { Authorization: `Bearer ${token}` } },
  );
  const outages: Outage[] = (data.result?.annotations ?? []).map((a, i) => ({
    id: a.id ?? `outage-${i}`,
    region: a.locations?.join(", ") ?? a.asnDetails?.name ?? "Unknown region",
    country: a.locations?.[0] ?? "",
    lat: 0,
    lon: 0,
    severity: a.endDate ? 1 : 2,
    start: a.startDate,
    end: a.endDate,
    score: 0,
    source: a.asnDetails ? `AS${a.asnDetails.asn} ${a.asnDetails.name}` : "Cloudflare Radar",
  }));
  return { outages, note: "Cloudflare Radar annotations" };
}
