import { fetchJson, fetchText, num } from "../http";
import type { CyberItem } from "../types";

type KevVuln = {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
};

export async function loadKev() {
  const data = await fetchJson<{ vulnerabilities: KevVuln[]; count: number; dateReleased: string }>(
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    { timeout: 15000 },
  );
  const items: CyberItem[] = data.vulnerabilities
    .slice()
    .sort((a, b) => (a.dateAdded < b.dateAdded ? 1 : -1))
    .slice(0, 120)
    .map((v) => ({
      id: v.cveID,
      title: v.vulnerabilityName,
      description: v.shortDescription,
      severity: "critical",
      published: v.dateAdded,
      source: "CISA KEV",
      url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
      vendor: v.vendorProject,
      product: v.product,
      kev: true,
      ransomware: v.knownRansomwareCampaignUse?.toLowerCase() === "known",
    }));
  return { items, catalogVersion: data.dateReleased, total: data.count, source: "CISA KEV" };
}

type NvdResponse = {
  vulnerabilities: {
    cve: {
      id: string;
      published: string;
      descriptions: { lang: string; value: string }[];
      metrics?: {
        cvssMetricV31?: { cvssData: { baseScore: number; baseSeverity: string } }[];
        cvssMetricV40?: { cvssData: { baseScore: number; baseSeverity: string } }[];
      };
    };
  }[];
};

export async function loadNvdRecent(days = 7) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const data = await fetchJson<NvdResponse>(
    `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${fmt(start)}&pubEndDate=${fmt(end)}&resultsPerPage=60&noRejected`,
    { timeout: 15000 },
  );
  const items: CyberItem[] = (data.vulnerabilities ?? []).map((v) => {
    const c = v.cve;
    const m = c.metrics?.cvssMetricV40?.[0]?.cvssData ?? c.metrics?.cvssMetricV31?.[0]?.cvssData;
    const score = m?.baseScore;
    const sev = (m?.baseSeverity ?? "").toLowerCase();
    return {
      id: c.id,
      title: c.descriptions.find((d) => d.lang === "en")?.value?.slice(0, 180) ?? c.id,
      description: c.descriptions.find((d) => d.lang === "en")?.value ?? "",
      severity: sev === "critical" || sev === "high" ? (sev as "critical" | "high") : sev === "medium" ? "medium" : "low",
      cvss: score,
      published: c.published,
      source: "NVD",
      url: `https://nvd.nist.gov/vuln/detail/${c.id}`,
    };
  });
  return { items, source: "NIST NVD" };
}

type FeodoEntry = {
  ip_address: string;
  port: number;
  status: string;
  hostname?: string | null;
  as_number?: number;
  as_name?: string;
  country?: string;
  first_seen?: string;
  last_online?: string;
  malware?: string;
};

export async function loadFeodo() {
  const data = await fetchJson<FeodoEntry[]>("https://feodotracker.abuse.ch/downloads/ipblocklist.json", {
    timeout: 12000,
  });
  return data;
}

export async function loadCyber() {
  const [kev, nvd, feodo] = await Promise.allSettled([loadKev(), loadNvdRecent(10), loadFeodo()]);
  const items: CyberItem[] = [];
  if (kev.status === "fulfilled") items.push(...kev.value.items);
  if (nvd.status === "fulfilled") items.push(...nvd.value.items);

  const botnets = feodo.status === "fulfilled" ? feodo.value.slice(0, 400) : [];

  return {
    items: items.slice(0, 180),
    botnets,
    kevTotal: kev.status === "fulfilled" ? kev.value.total : 0,
    source: "CISA KEV + NIST NVD + abuse.ch",
  };
}

export async function loadUrlhaus(limit = 60) {
  const key = process.env.URLHAUS_AUTH_KEY;
  if (!key) return { urls: [], note: "Set URLHAUS_AUTH_KEY for live malware URL intelligence." };
  const text = await fetchText("https://urlhaus-api.abuse.ch/v1/urls/recent/", {
    method: "POST",
    headers: { "Auth-Key": key, "Content-Type": "application/x-www-form-urlencoded" },
    body: "limit=100",
    timeout: 12000,
  });
  const data = JSON.parse(text) as { urls?: { id: string; url: string; threat: string; date_added: string; tags?: string[] }[] };
  return { urls: (data.urls ?? []).slice(0, limit), note: "abuse.ch URLhaus" };
}

/** Rough country centroid used to place C2 infrastructure on the globe. */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [39.8, -98.6], CN: [35.9, 104.2], RU: [61.5, 105.3], DE: [51.2, 10.4], NL: [52.1, 5.3],
  FR: [46.2, 2.2], GB: [55.4, -3.4], IN: [20.6, 79.0], BR: [-14.2, -51.9], JP: [36.2, 138.3],
  KR: [35.9, 127.8], SG: [1.35, 103.8], HK: [22.3, 114.2], TW: [23.7, 121.0], VN: [14.1, 108.3],
  TH: [15.9, 101.0], ID: [-0.8, 113.9], MY: [4.2, 101.98], PH: [12.9, 121.8], AU: [-25.3, 133.8],
  CA: [56.1, -106.3], MX: [23.6, -102.6], AR: [-38.4, -63.6], CL: [-35.7, -71.5], CO: [4.6, -74.3],
  PE: [-9.2, -75.0], VE: [6.4, -66.6], ZA: [-30.6, 22.9], NG: [9.1, 8.7], EG: [26.8, 30.8],
  KE: [-0.0, 37.9], MA: [31.8, -7.1], TR: [39.0, 35.2], SA: [23.9, 45.1], AE: [23.4, 53.8],
  IL: [31.0, 34.9], IR: [32.4, 53.7], IQ: [33.2, 43.7], PK: [30.4, 69.3], BD: [23.7, 90.4],
  LK: [7.9, 80.8], UA: [48.4, 31.2], PL: [51.9, 19.1], RO: [45.9, 25.0], CZ: [49.8, 15.5],
  SE: [60.1, 18.6], NO: [60.5, 8.5], FI: [61.9, 25.7], DK: [56.3, 9.5], BE: [50.5, 4.5],
  CH: [46.8, 8.2], AT: [47.5, 14.6], IT: [41.9, 12.6], ES: [40.5, -3.7], PT: [39.4, -8.2],
  GR: [39.1, 21.8], IE: [53.4, -8.2], NZ: [-40.9, 174.9], KZ: [48.0, 66.9], UZ: [41.4, 64.6],
};
