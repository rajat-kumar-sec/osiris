import { fetchJson } from "../http";
import type { CctvCamera } from "../types";

type CaltransCamera = {
  index: string;
  inService: string;
  location: {
    district: string;
    locationName: string;
    nearbyPlace: string;
    longitude: string;
    latitude: string;
    county: string;
    route: string;
  };
  imageData: {
    streamingVideoURL?: string;
    static?: { currentImageURL?: string };
  };
};

type TflPlace = {
  id: string;
  commonName: string;
  lat: number;
  lon: number;
  additionalProperties?: { key: string; value: string }[];
};

const CALTRANS_DISTRICTS: [string, string][] = [
  ["3", "Sacramento / North State"],
  ["4", "Bay Area"],
  ["7", "Los Angeles / Ventura"],
  ["11", "San Diego / Imperial"],
  ["12", "Orange County"],
];

async function loadCaltrans(): Promise<CctvCamera[]> {
  const results = await Promise.allSettled(
    CALTRANS_DISTRICTS.map(([d]) =>
      fetchJson<{ data: { cctv: CaltransCamera }[] }>(`https://cwwp2.dot.ca.gov/data/d${d}/cctv/cctvStatusD${d}.json`, {
        timeout: 12000,
      }),
    ),
  );
  const out: CctvCamera[] = [];
  results.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const [district, region] = CALTRANS_DISTRICTS[i];
    for (const row of r.value.data ?? []) {
      const c = row.cctv;
      const lat = parseFloat(c.location.latitude);
      const lon = parseFloat(c.location.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (c.inService === "false") continue;
      const stream = c.imageData?.streamingVideoURL || c.imageData?.static?.currentImageURL || "";
      if (!stream) continue;
      out.push({
        id: `cal-d${district}-${c.index}`,
        name: c.location.locationName,
        lat,
        lon,
        city: c.location.nearbyPlace,
        region: `US-CA D${district}`,
        country: "United States",
        stream,
        kind: c.imageData?.streamingVideoURL ? "hls" : "image",
        source: "Caltrans",
        online: true,
      });
    }
  });
  return out;
}

async function loadTfl(): Promise<CctvCamera[]> {
  const data = await fetchJson<TflPlace[]>("https://api.tfl.gov.uk/Place/Type/JamCam", { timeout: 15000 });
  const out: CctvCamera[] = [];
  for (const p of data) {
    const props = new Map((p.additionalProperties ?? []).map((a) => [a.key, a.value]));
    const stream = props.get("videoUrl") || props.get("imageUrl");
    if (!stream) continue;
    out.push({
      id: `tfl-${p.id}`,
      name: p.commonName,
      lat: p.lat,
      lon: p.lon,
      city: "London",
      region: "GB-LND",
      country: "United Kingdom",
      stream,
      kind: props.get("videoUrl") ? "hls" : "image",
      source: "TfL JamCams",
      online: props.get("available") !== "false",
    });
  }
  return out;
}

export async function loadCctv(region = "all", limit = 1400) {
  const [cal, tfl] = await Promise.allSettled([loadCaltrans(), loadTfl()]);
  let cameras: CctvCamera[] = [
    ...(cal.status === "fulfilled" ? cal.value : []),
    ...(tfl.status === "fulfilled" ? tfl.value : []),
  ];

  if (region === "us") cameras = cameras.filter((c) => c.country === "United States");
  else if (region === "uk") cameras = cameras.filter((c) => c.country === "United Kingdom");
  else if (region.startsWith("US-CA")) cameras = cameras.filter((c) => c.region.startsWith("US-CA"));

  return {
    cameras: cameras.slice(0, limit),
    total: cameras.length,
    source: "Caltrans + TfL",
    regions: ["all", "us", "uk", "US-CA"],
  };
}
