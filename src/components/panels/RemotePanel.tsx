"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Radio, Users } from "lucide-react";
import Panel from "./Panel";
import { useOsiris } from "@/lib/store";

export default function RemotePanel() {
  const activeTool = useOsiris((s) => s.activeTool);
  const setTool = useOsiris((s) => s.setTool);
  const ghostNodes = useOsiris((s) => s.ghostNodes);
  const push = useOsiris((s) => s.pushToast);
  const [session, setSession] = useState("");

  useEffect(() => {
    const key = "osiris-remote-session";
    let id = "";
    try {
      id = localStorage.getItem(key) ?? "";
    } catch {
      /* storage blocked */
    }
    if (!id) {
      id = `OP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      try {
        localStorage.setItem(key, id);
      } catch {
        /* ignore */
      }
    }
    setSession(id);
  }, []);

  const live = activeTool === "remote";
  const invite = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL(window.location.href);
    u.searchParams.set("remote", session);
    return u.toString();
  }, [session]);

  return (
    <Panel
      tool="remote"
      title="REMOTE"
      subtitle="Shared map presence"
      icon={Users}
      actions={<span className={`badge ${live ? "live" : ""}`}>{live ? "BROADCASTING" : "IDLE"}</span>}
    >
      <div className="stat-grid">
        <div className="stat">
          <div className="s-label">Operator ID</div>
          <div className="s-value" style={{ fontSize: 13 }}>{session || "—"}</div>
        </div>
        <div className="stat">
          <div className="s-label">Live peers</div>
          <div className="s-value">{ghostNodes}</div>
        </div>
      </div>

      <div className="section-label">Presence</div>
      <p className="hint" style={{ marginTop: 0 }}>
        Remote mode broadcasts your map cursor to other operator windows using a local broadcast channel. Open a second
        window on this machine to see the shared cursor. No location is sent to a server.
      </p>

      <button
        className={`btn btn-block ${live ? "btn-primary" : ""}`}
        onClick={() => setTool(live ? null : "remote")}
        style={{ marginTop: 9 }}
      >
        <Radio size={11} /> {live ? "STOP BROADCASTING" : "START BROADCASTING"}
      </button>

      <div className="section-label">Session</div>
      <div className="field">
        <label>Invite link</label>
        <div className="input-row">
          <input className="input" value={invite} readOnly />
          <button
            className="btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(invite);
                push("Invite link copied");
              } catch {
                push("Clipboard blocked by browser");
              }
            }}
          >
            <Copy size={11} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="btn btn-sm"
          style={{ flex: 1 }}
          onClick={() => {
            window.open(window.location.href, "_blank", "noopener");
            push("Second operator window opened");
          }}
        >
          <ExternalLink size={10} /> NEW WINDOW
        </button>
        <button
          className="btn btn-sm"
          style={{ flex: 1 }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(invite);
              push("Session link copied");
            } catch {
              push("Clipboard blocked by browser");
            }
          }}
        >
          <Copy size={10} /> COPY LINK
        </button>
      </div>

      <div className="section-label">What peers see</div>
      <div className="kv">
        <dt>Cursor</dt>
        <dd>Shared cyan crosshair with operator tag</dd>
        <dt>Transport</dt>
        <dd>BroadcastChannel — same device only</dd>
        <dt>Retention</dt>
        <dd>Presence expires after 12 seconds</dd>
        <dt>Privacy</dt>
        <dd>No server logging, no account required</dd>
      </div>

      <p className="hint" style={{ marginTop: 10 }}>
        For cross-device sessions, point the platform at a shared WebSocket relay and set
        <b> NEXT_PUBLIC_REMOTE_RELAY</b>. The UI and cursor protocol are already wired.
      </p>
    </Panel>
  );
}
