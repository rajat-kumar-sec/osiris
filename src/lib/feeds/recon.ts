import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";
import { fetchJson, fetchText, num } from "../http";

/* ── DNS ───────────────────────────────────────────────────── */

export const DNS_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA", "SRV", "PTR", "DS", "DNSKEY"] as const;

type DohAnswer = { name: string; type: number; TTL: number; data: string };
const DNS_TYPE_NAMES: Record<number, string> = {
  1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA",
  33: "SRV", 43: "DS", 48: "DNSKEY", 257: "CAA",
};

export async function lookupDns(name: string, types: string[]) {
  const results: Record<string, { type: string; ttl: number; data: string }[]> = {};
  await Promise.all(
    types.map(async (type) => {
      try {
        const data = await fetchJson<{ Answer?: DohAnswer[]; Status: number }>(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
          { timeout: 8000, headers: { Accept: "application/dns-json" } },
        );
        results[type] = (data.Answer ?? []).map((a) => ({
          type: DNS_TYPE_NAMES[a.type] ?? String(a.type),
          ttl: a.TTL,
          data: a.data,
        }));
      } catch {
        results[type] = [];
      }
    }),
  );
  return { name, results, resolver: "Cloudflare DoH" };
}

/* ── RDAP / WHOIS ──────────────────────────────────────────── */

function vcardName(entity: Record<string, unknown>): string | undefined {
  const vcard = entity.vcardArray as unknown[] | undefined;
  if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) return undefined;
  for (const field of vcard[1] as unknown[][]) {
    if (field[0] === "fn" && Array.isArray(field[3])) return String(field[3][0]);
  }
  return undefined;
}

export async function lookupWhois(query: string) {
  const isIp = net.isIP(query) !== 0;
  const url = isIp ? `https://rdap.org/ip/${encodeURIComponent(query)}` : `https://rdap.org/domain/${encodeURIComponent(query)}`;
  const data = await fetchJson<Record<string, unknown>>(url, {
    timeout: 10000,
    headers: { Accept: "application/rdap+json" },
  });

  const events = (data.events as { eventAction: string; eventDate: string }[] | undefined) ?? [];
  const entities = (data.entities as Record<string, unknown>[] | undefined) ?? [];
  const nameservers = (data.nameservers as { ldhName?: string }[] | undefined) ?? [];

  return {
    query,
    type: isIp ? "ip" : "domain",
    handle: data.handle,
    name: data.ldhName ?? data.name,
    status: data.status ?? [],
    registrar: entities.map((e) => vcardName(e)).filter(Boolean).slice(0, 4),
    roles: entities.map((e) => e.roles).flat().filter(Boolean).slice(0, 12),
    nameservers: nameservers.map((n) => n.ldhName).filter(Boolean),
    events: events.map((e) => ({ action: e.eventAction, date: e.eventDate })),
    secureDns: data.secureDNS ?? null,
    raw: undefined,
  };
}

/* ── TLS certificate ───────────────────────────────────────── */

export async function inspectTls(hostname: string, port = 443) {
  const cert = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const socket = tls.connect(
      { host: hostname, port, servername: hostname, timeout: 8000, rejectUnauthorized: false },
      () => {
        const c = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        socket.end();
        resolve({
          subject: c.subject,
          issuer: c.issuer,
          validFrom: c.valid_from,
          validTo: c.valid_to,
          serialNumber: c.serialNumber,
          fingerprint256: c.fingerprint256,
          subjectAltName: c.subjectaltname?.split(", ") ?? [],
          bits: c.bits,
          protocol,
          cipher: cipher?.name,
        });
      },
    );
    socket.on("error", reject);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("TLS timeout"));
    });
  });

  const t = Date.now();
  const ct = await fetchJson<{ id: string; dns_names: string[]; not_before: string; not_after: string; issuer: { name: string } }[]>(
    `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(hostname)}&include_subdomains=true&expand=dns_names&expand=issuer`,
    { timeout: 12000 },
  ).catch(() => []);

  return {
    hostname,
    cert,
    expiresInDays: Math.round(((cert.validTo ? new Date(String(cert.validTo)).getTime() : t) - t) / 86400000),
    ctEntries: ct.slice(0, 40).map((c) => ({
      id: c.id,
      names: c.dns_names?.slice(0, 8),
      notBefore: c.not_before,
      notAfter: c.not_after,
      issuer: c.issuer?.name,
    })),
    ctTotalSampled: ct.length,
  };
}

/* ── BGP / ASN ─────────────────────────────────────────────── */

export async function lookupBgp(query: string) {
  const isAsn = /^as\d+$/i.test(query);
  const resource = isAsn ? query.toUpperCase() : query;
  const [overview, asn] = await Promise.allSettled([
    fetchJson<{ data: Record<string, unknown> }>(
      `https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent(resource)}`,
      { timeout: 10000 },
    ),
    isAsn
      ? fetchJson<{ data: Record<string, unknown> }>(
          `https://stat.ripe.net/data/as-overview/data.json?resource=${encodeURIComponent(resource)}`,
          { timeout: 10000 },
        )
      : Promise.resolve(null),
  ]);

  return {
    query,
    prefix: overview.status === "fulfilled" ? overview.value.data : null,
    asn: asn.status === "fulfilled" && asn.value ? asn.value.data : null,
    source: "RIPEstat",
  };
}

/* ── IP intelligence ───────────────────────────────────────── */

export async function lookupIp(ip: string) {
  const [geo, hostname] = await Promise.allSettled([
    fetchJson<Record<string, unknown>>(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 8000 }),
    dns.reverse(ip),
  ]);
  return {
    ip,
    geo: geo.status === "fulfilled" ? geo.value : null,
    ptr: hostname.status === "fulfilled" ? hostname.value[0] : null,
  };
}

/* ── Threat intelligence ───────────────────────────────────── */

type FeodoEntry = { ip_address: string; port: number; malware?: string; country?: string; last_online?: string };

const blocklistCache: { at: number; feodo: FeodoEntry[]; tor: Set<string>; drop: { cidr: string; sbl: string }[] } = {
  at: 0,
  feodo: [],
  tor: new Set(),
  drop: [],
};

async function loadBlocklists() {
  if (Date.now() - blocklistCache.at < 3600_000) return blocklistCache;
  const [feodo, tor, drop] = await Promise.allSettled([
    fetchJson<FeodoEntry[]>("https://feodotracker.abuse.ch/downloads/ipblocklist.json", { timeout: 12000 }),
    fetchText("https://check.torproject.org/torbulkexitlist", { timeout: 12000 }),
    fetchText("https://www.spamhaus.org/drop/drop.txt", { timeout: 12000 }),
  ]);
  if (feodo.status === "fulfilled") blocklistCache.feodo = feodo.value;
  if (tor.status === "fulfilled")
    blocklistCache.tor = new Set(tor.value.split(/\r?\n/).map((l) => l.trim()).filter((l) => net.isIP(l)));
  if (drop.status === "fulfilled")
    blocklistCache.drop = drop.value
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith(";"))
      .map((l) => {
        const [cidr, sbl] = l.split(";").map((s) => s.trim());
        return { cidr, sbl: sbl ?? "" };
      })
      .filter((x) => x.cidr);
  blocklistCache.at = Date.now();
  return blocklistCache;
}

function ipToLong(ip: string): number | null {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

export async function lookupThreat(indicator: string) {
  const bl = await loadBlocklists();
  const matches: { source: string; detail: string; severity: "critical" | "high" | "medium" }[] = [];

  if (net.isIP(indicator)) {
    const hit = bl.feodo.find((f) => f.ip_address === indicator);
    if (hit) matches.push({ source: "Feodo Tracker", detail: `${hit.malware ?? "botnet C2"} · ${hit.country ?? ""}`, severity: "critical" });
    if (bl.tor.has(indicator)) matches.push({ source: "Tor exit list", detail: "Known Tor exit relay", severity: "medium" });

    const asLong = ipToLong(indicator);
    if (asLong !== null) {
      for (const d of bl.drop) {
        const [base, bitsS] = d.cidr.split("/");
        const baseLong = ipToLong(base);
        const bits = Number(bitsS);
        if (baseLong === null || !Number.isFinite(bits)) continue;
        const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
        if ((asLong & mask) === (baseLong & mask)) {
          matches.push({ source: "Spamhaus DROP", detail: `${d.cidr} ${d.sbl}`, severity: "high" });
          break;
        }
      }
    }
  }

  const risk = matches.some((m) => m.severity === "critical") ? "critical" : matches.some((m) => m.severity === "high") ? "high" : matches.length ? "medium" : "low";
  return { indicator, matches, risk, checked: ["Feodo Tracker", "Tor exit list", "Spamhaus DROP"], listSize: bl.feodo.length + bl.tor.size + bl.drop.length };
}

/* ── HTTP fingerprint ──────────────────────────────────────── */

export async function inspectHttp(target: string) {
  const url = target.startsWith("http") ? target : `https://${target}`;
  const started = Date.now();
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OSIRIS/5.0; +https://osirisai.live)" },
  });
  const body = await res.text();
  const headers = Object.fromEntries(res.headers.entries());
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().slice(0, 160);
  const generator = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1];
  const security = {
    hsts: Boolean(headers["strict-transport-security"]),
    csp: Boolean(headers["content-security-policy"]),
    xfo: Boolean(headers["x-frame-options"]),
    xcto: Boolean(headers["x-content-type-options"]),
    referrer: Boolean(headers["referrer-policy"]),
    permissions: Boolean(headers["permissions-policy"]),
  };
  const score = Object.values(security).filter(Boolean).length;
  return {
    url: res.url,
    status: res.status,
    latencyMs: Date.now() - started,
    server: headers["server"] ?? null,
    poweredBy: headers["x-powered-by"] ?? null,
    title,
    generator,
    headers,
    security,
    securityScore: Math.round((score / 6) * 100),
    bodyBytes: body.length,
  };
}

/* ── Port scanner ──────────────────────────────────────────── */

const SERVICES: Record<number, string> = {
  20: "ftp-data", 21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "dns", 67: "dhcp", 69: "tftp",
  80: "http", 88: "kerberos", 110: "pop3", 111: "rpcbind", 123: "ntp", 135: "msrpc", 137: "netbios-ns",
  138: "netbios-dgm", 139: "netbios-ssn", 143: "imap", 161: "snmp", 162: "snmptrap", 179: "bgp", 389: "ldap",
  443: "https", 445: "microsoft-ds", 465: "smtps", 500: "isakmp", 514: "syslog", 515: "printer", 548: "afp",
  554: "rtsp", 587: "submission", 631: "ipp", 636: "ldaps", 873: "rsync", 902: "vmware", 990: "ftps",
  993: "imaps", 995: "pop3s", 1025: "nfs-or-iis", 1080: "socks", 1433: "mssql", 1434: "mssql-browser",
  1521: "oracle", 1723: "pptp", 1883: "mqtt", 1900: "upnp", 2049: "nfs", 2082: "cpanel", 2083: "cpanel-ssl",
  2181: "zookeeper", 2222: "ssh-alt", 2375: "docker", 2376: "docker-tls", 2483: "oracle", 3000: "dev-http",
  3128: "squid", 3260: "iscsi", 3306: "mysql", 3389: "rdp", 3690: "svn", 4000: "dev-http", 4369: "epmd",
  4443: "https-alt", 4505: "salt", 4506: "salt", 5000: "upnp-http", 5432: "postgres", 5555: "adb",
  5601: "kibana", 5672: "amqp", 5900: "vnc", 5984: "couchdb", 6000: "x11", 6379: "redis", 6443: "kubernetes",
  7001: "weblogic", 7070: "realserver", 8000: "http-alt", 8008: "http-alt", 8080: "http-proxy", 8081: "http-alt",
  8086: "influxdb", 8088: "http-alt", 8090: "http-alt", 8161: "activemq", 8443: "https-alt", 8500: "consul",
  8888: "http-alt", 9000: "http-alt", 9042: "cassandra", 9092: "kafka", 9100: "printer", 9200: "elasticsearch",
  9300: "elasticsearch", 9418: "git", 9999: "http-alt", 10000: "webmin", 10250: "kubelet", 11211: "memcached",
  15672: "rabbitmq-mgmt", 27017: "mongodb", 27018: "mongodb", 50000: "db2", 50070: "hdfs", 61616: "activemq",
};

const TOP_100 = Object.keys(SERVICES).map(Number);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return (
      p[0] === 0 || p[0] === 10 || p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      p[0] >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    return low === "::1" || low === "::" || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("fe80") || low.startsWith("::ffff:127.");
  }
  return true;
}

function connect(ip: string, port: number, timeout: number): Promise<number | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    let settled = false;
    const done = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open ? Date.now() - started : null);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, ip);
  });
}

export type ScanTarget = { host: string; ip: string; authorized: boolean };

export async function resolveScanTarget(host: string): Promise<{ ip: string; host: string }> {
  const trimmed = host.trim().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  if (!trimmed) throw new Error("invalid target");
  if (net.isIP(trimmed)) {
    if (isPrivateIp(trimmed)) throw new Error("private, reserved or multicast addresses are not permitted");
    return { host: trimmed, ip: trimmed };
  }
  if (!/^(?!-)[a-z0-9-]{1,63}(\.(?!-)[a-z0-9-]{1,63})+$/i.test(trimmed)) throw new Error("invalid hostname");
  const addrs = await dns.lookup(trimmed, { all: true, verbatim: true });
  if (!addrs.length) throw new Error("hostname did not resolve");
  for (const a of addrs) if (isPrivateIp(a.address)) throw new Error("target resolves to a private/reserved address");
  return { host: trimmed, ip: addrs[0].address };
}

export async function scanPorts(host: string, ports: number[], timeoutMs = 1200, concurrency = 96) {
  const target = await resolveScanTarget(host);
  const unique = [...new Set(ports)].filter((p) => Number.isInteger(p) && p > 0 && p < 65536).slice(0, 2048);
  if (!unique.length) throw new Error("no valid ports requested");

  const started = Date.now();
  const open: { port: number; service: string; latencyMs: number }[] = [];
  let index = 0;

  async function worker() {
    while (index < unique.length) {
      const port = unique[index++];
      const latency = await connect(target.ip, port, timeoutMs);
      if (latency !== null) open.push({ port, service: SERVICES[port] ?? "unknown", latencyMs: latency });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  open.sort((a, b) => a.port - b.port);

  return {
    ...target,
    scanned: unique.length,
    open,
    closedFiltered: unique.length - open.length,
    durationMs: Date.now() - started,
    scannedAt: new Date().toISOString(),
    warning: "Only scan systems you own or are explicitly authorized to test.",
  };
}

export { TOP_100, SERVICES };
