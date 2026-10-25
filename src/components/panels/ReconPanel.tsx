"use client";

import { useMemo, useState } from "react";
import { Crosshair, Play, Radar, ShieldCheck, TriangleAlert } from "lucide-react";
import Panel, { Empty, Loading } from "./Panel";
import type { ToolId } from "@/lib/types";

type Tab = "dns" | "whois" | "ssl" | "bgp" | "ip" | "threat" | "http" | "scan";

const TABS: { id: Tab; label: string; hint: string; placeholder: string }[] = [
  { id: "dns", label: "DNS", hint: "Resolve every record type through Cloudflare DoH.", placeholder: "example.com" },
  { id: "whois", label: "WHOIS", hint: "Registration data via RDAP for domains and IPs.", placeholder: "example.com" },
  { id: "ssl", label: "TLS", hint: "Certificate chain, expiry and Certificate Transparency.", placeholder: "example.com" },
  { id: "bgp", label: "BGP", hint: "Prefix, ASN and routing intelligence from RIPEstat.", placeholder: "8.8.8.8 or AS15169" },
  { id: "ip", label: "IP", hint: "Geolocation, ASN, network and reverse DNS.", placeholder: "8.8.8.8" },
  { id: "threat", label: "THREAT", hint: "Match indicators against Feodo, Tor and Spamhaus DROP.", placeholder: "185.220.101.1" },
  { id: "http", label: "HTTP", hint: "Headers, technology fingerprint and security posture.", placeholder: "https://example.com" },
  { id: "scan", label: "SCAN", hint: "Authorized TCP connect scan of a public host.", placeholder: "example.com" },
];

export default function ReconPanel() {
  const [tab, setTab] = useState<Tab>("dns");
  const [target, setTarget] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [preset, setPreset] = useState("top");
  const [custom, setCustom] = useState("22,80,443,8080");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  const active = useMemo(() => TABS.find((t) => t.id === tab) ?? TABS[0], [tab]);

  async function run() {
    const value = target.trim();
    if (!value) {
      setError("Enter a target first.");
      return;
    }
    if (tab === "scan" && !authorized) {
      setError("Confirm you own or are authorized to test this target.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res: Response;
      if (tab === "scan") {
        const ports =
          preset === "custom"
            ? custom
                .split(/[,\s]+/)
                .map((p) => Number(p))
                .filter((p) => Number.isInteger(p) && p > 0 && p < 65536)
            : undefined;
        res = await fetch("/api/recon/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host: value, authorized: true, preset, ports }),
        });
      } else {
        const urls: Record<Exclude<Tab, "scan">, string> = {
          dns: `/api/recon/dns?name=${encodeURIComponent(value)}`,
          whois: `/api/recon/whois?q=${encodeURIComponent(value)}`,
          ssl: `/api/recon/ssl?host=${encodeURIComponent(value)}`,
          bgp: `/api/recon/bgp?q=${encodeURIComponent(value)}`,
          ip: `/api/recon/ip?q=${encodeURIComponent(value)}`,
          threat: `/api/recon/threat?q=${encodeURIComponent(value)}`,
          http: `/api/recon/http?q=${encodeURIComponent(value)}`,
        };
        res = await fetch(urls[tab]);
      }

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        setError(json.error ?? `Request failed (${res.status})`);
      } else {
        setResult(json.data ?? json);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel
      tool={"recon" as ToolId}
      title="RECON"
      subtitle="Full-spectrum OSINT toolkit"
      icon={Radar}
      tabs={TABS.map((t) => ({
        id: t.id,
        label: t.label,
        active: tab === t.id,
        onClick: () => {
          setTab(t.id);
          setResult(null);
          setError(null);
        },
      }))}
    >
      <p className="hint" style={{ marginTop: 0 }}>
        {active.hint}
      </p>

      <div className="field">
        <label htmlFor="recon-target">Target</label>
        <div className="input-row">
          <input
            id="recon-target"
            className="input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void run();
            }}
            placeholder={active.placeholder}
            spellCheck={false}
            autoComplete="off"
          />
          <button className="btn btn-primary" onClick={() => void run()} disabled={loading}>
            {loading ? <span className="spinner" /> : <Play size={11} />}
            RUN
          </button>
        </div>
      </div>

      {tab === "scan" && (
        <>
          <div className="field">
            <label htmlFor="scan-preset">Port selection</label>
            <select id="scan-preset" className="select" value={preset} onChange={(e) => setPreset(e.target.value)}>
              <option value="top">Top {`${100}`} common ports</option>
              <option value="web">Web-facing ports</option>
              <option value="full">Ports 1–1024</option>
              <option value="custom">Custom list</option>
            </select>
          </div>
          {preset === "custom" && (
            <div className="field">
              <label htmlFor="scan-ports">Ports</label>
              <input
                id="scan-ports"
                className="input"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="22,80,443"
              />
            </div>
          )}
          <label className="checkline">
            <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
            <span>
              I confirm I own this system or have explicit written authorization to test it. Unauthorized scanning may be
              illegal. Private and reserved addresses are blocked.
            </span>
          </label>
        </>
      )}

      {error && (
        <div className="checkline" style={{ borderColor: "rgba(255,95,86,0.35)", color: "#ff9b94", background: "rgba(255,95,86,0.06)" }}>
          <TriangleAlert size={12} />
          <span>{error}</span>
        </div>
      )}

      {loading && <Loading label={`Running ${active.label.toLowerCase()} reconnaissance`} />}

      {!loading && !result && !error && (
        <div style={{ marginTop: 14 }}>
          <div className="section-label">Targets</div>
          <div className="pill-row">
            {["example.com", "8.8.8.8", "AS15169", "cloudflare.com", "1.1.1.1"].map((t) => (
              <button
                key={t}
                className="pill"
                onClick={() => {
                  setTarget(t);
                  setResult(null);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="empty" style={{ marginTop: 10 }}>
            <Crosshair size={14} style={{ display: "block", margin: "0 auto 6px" }} />
            Awaiting target
          </div>
        </div>
      )}

      {result && <ReconResult tab={tab} data={result} />}
    </Panel>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ReconResult({ tab, data }: { tab: Tab; data: any }) {
  if (tab === "dns") {
    const results = (data.results ?? {}) as Record<string, { type: string; ttl: number; data: string }[]>;
    return (
      <>
        <div className="section-label">DNS records · {data.name}</div>
        {Object.entries(results).map(([type, rows]) => (
          <div key={type} style={{ marginBottom: 9 }}>
            <div className="li-meta" style={{ marginBottom: 4 }}>
              {type} · {rows.length} records
            </div>
            {rows.length === 0 ? (
              <div className="hint">no records</div>
            ) : (
              rows.map((r, i) => (
                <div key={`${type}-${i}`} className="list-item" style={{ padding: "6px 8px" }}>
                  <div className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, wordBreak: "break-all" }}>
                    {r.data}
                  </div>
                  <div className="li-meta">TTL {r.ttl}s</div>
                </div>
              ))
            )}
          </div>
        ))}
        {Object.keys(results).length === 0 && <Empty label="No records returned" />}
      </>
    );
  }

  if (tab === "scan") {
    const open = (data.open ?? []) as { port: number; service: string; latencyMs: number }[];
    return (
      <>
        <div className="section-label">Scan result · {data.host}</div>
        <div className="stat-grid" style={{ marginBottom: 10 }}>
          <div className="stat">
            <div className="s-label">Resolved IP</div>
            <div className="s-value" style={{ fontSize: 12 }}>{data.ip}</div>
          </div>
          <div className="stat">
            <div className="s-label">Open ports</div>
            <div className="s-value">{open.length}</div>
          </div>
          <div className="stat">
            <div className="s-label">Scanned</div>
            <div className="s-value">{data.scanned}</div>
          </div>
          <div className="stat">
            <div className="s-label">Duration</div>
            <div className="s-value">
              {data.durationMs}
              <small>ms</small>
            </div>
          </div>
        </div>
        {open.length === 0 ? (
          <Empty label="No open ports detected" />
        ) : (
          <div className="list">
            {open.map((p) => (
              <div className="list-item" key={p.port} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={12} style={{ color: "var(--ok)" }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gold-bright)", width: 52 }}>
                  {p.port}
                </span>
                <span style={{ flex: 1, fontSize: 10.5 }}>{p.service}</span>
                <span className="li-meta">{p.latencyMs}ms</span>
              </div>
            ))}
          </div>
        )}
        <p className="hint" style={{ marginTop: 9 }}>{data.warning}</p>
      </>
    );
  }

  return (
    <>
      <div className="section-label">Result</div>
      <pre className="code-block">{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
