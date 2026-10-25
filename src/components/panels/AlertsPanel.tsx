"use client";

import { useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import Panel, { Empty, Loading } from "./Panel";
import { useFeed, relativeTime } from "@/lib/client";
import { flyTo } from "@/lib/mapBus";
import type { Alert } from "@/lib/types";

const FILTERS = ["ALL", "CRITICAL", "HIGH", "WEATHER", "CYBER", "SPACE"] as const;

export default function AlertsPanel() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const alerts = useFeed<{ alerts: Alert[] }>("/api/alerts", 45_000);

  const list = useMemo(() => {
    const all = alerts.data?.alerts ?? [];
    if (filter === "ALL") return all;
    if (filter === "CRITICAL" || filter === "HIGH") {
      return all.filter((a) => a.severity === filter.toLowerCase());
    }
    if (filter === "WEATHER") return all.filter((a) => a.kind === "weather");
    if (filter === "CYBER") return all.filter((a) => a.kind === "cyber");
    if (filter === "SPACE") return all.filter((a) => a.kind === "space");
    return all;
  }, [alerts.data, filter]);

  return (
    <Panel
      tool="alerts"
      title="ALERTS"
      subtitle="Global incident stream"
      icon={BellRing}
      actions={<span className="badge live">LIVE</span>}
    >
      <div className="pill-row">
        {FILTERS.map((f) => (
          <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {alerts.loading && <Loading label="Aggregating global alerts" />}
      {!alerts.loading && list.length === 0 && <Empty label="No alerts in this category" />}

      <div className="list">
        {list.map((a) => (
          <button
            key={a.id}
            className="list-item"
            onClick={() => {
              if (a.lat != null && a.lon != null) flyTo(a.lat, a.lon, 4.2);
              if (a.url) window.open(a.url, "_blank", "noopener,noreferrer");
            }}
          >
            <div className="li-top">
              <span className={`badge ${a.severity}`}>{a.severity}</span>
              <span className="li-meta" style={{ marginLeft: "auto" }}>{relativeTime(a.time)}</span>
            </div>
            <div className="li-title">{a.title}</div>
            {a.detail && <div className="li-detail">{a.detail}</div>}
            <div className="li-meta" style={{ marginTop: 4 }}>
              {a.kind} {a.lat != null && a.lon != null ? `· ${a.lat.toFixed(2)}, ${a.lon.toFixed(2)}` : ""}
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
