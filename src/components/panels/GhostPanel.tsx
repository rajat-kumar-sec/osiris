"use client";

import { EyeOff, Ghost, ShieldCheck, Trash2 } from "lucide-react";
import Panel from "./Panel";
import { useOsiris } from "@/lib/store";

export default function GhostPanel() {
  const ghost = useOsiris((s) => s.ghost);
  const toggleGhost = useOsiris((s) => s.toggleGhost);
  const ghostNodes = useOsiris((s) => s.ghostNodes);
  const clearDrawings = useOsiris((s) => s.clearDrawings);
  const pushToast = useOsiris((s) => s.pushToast);

  function purge() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("osiris")) localStorage.removeItem(key);
      }
      sessionStorage.clear();
    } catch {
      /* storage blocked */
    }
    clearDrawings();
    pushToast("Local OSIRIS traces purged");
  }

  return (
    <Panel
      tool="ghost"
      title="GHOST PROTOCOL"
      subtitle="Privacy & identity masking"
      icon={Ghost}
      actions={<span className={`badge ${ghost ? "live" : ""}`}>{ghost ? "ENGAGED" : "STANDBY"}</span>}
    >
      <div className="checkline" style={{ borderColor: ghost ? "rgba(157,140,255,0.4)" : undefined }}>
        <ShieldCheck size={14} style={{ color: ghost ? "var(--violet)" : "var(--muted)" }} />
        <span>
          Ghost protocol masks coordinate readouts in the status bar, hides your operator identity in remote sessions and
          dims identifying UI. It does not change your network route or upstream requests.
        </span>
      </div>

      <button className={`btn btn-block ${ghost ? "btn-primary" : ""}`} onClick={toggleGhost}>
        {ghost ? <EyeOff size={12} /> : <Ghost size={12} />} {ghost ? "DISENGAGE GHOST" : "ENGAGE GHOST"}
      </button>

      <div className="section-label">Masking</div>
      <div className="kv">
        <dt>Coordinates</dt>
        <dd>{ghost ? "MASKED" : "visible"}</dd>
        <dt>Operator tag</dt>
        <dd>{ghost ? "redacted" : "broadcast when remote is active"}</dd>
        <dt>Remote peers</dt>
        <dd>{ghostNodes}</dd>
        <dt>Server logs</dt>
        <dd>No account data collected</dd>
      </div>

      <div className="section-label">Local data</div>
      <p className="hint" style={{ marginTop: 0 }}>
        Annotations, session identifiers and theme preferences are stored only in this browser. Purge removes every
        OSIRIS key from local and session storage.
      </p>
      <button className="btn btn-block btn-sm" onClick={purge} style={{ marginTop: 7 }}>
        <Trash2 size={10} /> PURGE LOCAL TRACES
      </button>

      <div className="section-label">Recommended</div>
      <ul className="hint" style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
        <li>Use a VPN or Tor Browser for network-level anonymity.</li>
        <li>Do not sign in to third-party accounts while ghosted.</li>
        <li>Recon queries are still made from the server; treat them as attributable.</li>
        <li>Clear annotations before sharing your screen.</li>
      </ul>

      <div className="section-label">Hardening</div>
      <div className="checkline" style={{ marginBottom: 0 }}>
        <input type="checkbox" checked readOnly />
        <span>Block third-party cookies and cross-site tracking in your browser for full effect.</span>
      </div>
    </Panel>
  );
}
