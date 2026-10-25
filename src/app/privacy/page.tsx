import type { Metadata } from "next";
import DocPage from "@/components/DocPage";

export const metadata: Metadata = {
  title: "Privacy — OSIRIS",
  description: "What OSIRIS stores, what it never collects, and how reconnaissance queries are handled.",
};

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="DATA HANDLING"
      title="Privacy"
      intro="OSIRIS has no accounts, no advertising identifiers and no analytics beacons. The workspace runs in your browser and the API routes relay public data. This page explains exactly what that means."
    >
      <h2>What we do not collect</h2>
      <ul>
        <li>No user accounts, email addresses or passwords.</li>
        <li>No advertising, tracking pixels, fingerprinting scripts or third-party analytics.</li>
        <li>No cookies for identity. The interface state lives in memory and in local storage only.</li>
        <li>No sale or sharing of personal data, because none is gathered.</li>
      </ul>

      <h2>What stays in your browser</h2>
      <p>
        Annotations, theme choice, panel state and a random operator identifier are written to{" "}
        <code>localStorage</code> under keys beginning with <code>osiris</code>. They never leave the device. Ghost
        Protocol → <em>Purge local traces</em> removes every one of them, plus session storage.
      </p>

      <h2>Server requests</h2>
      <p>
        The API routes fetch upstream public sources on your behalf. Those providers see the server&apos;s IP, not yours,
        and the usual request metadata. Standard edge or host access logs may record the requested path, timestamp, user
        agent and coarse location for operational purposes; they are not linked to any identity and are not used for
        profiling.
      </p>
      <p>
        Reconnaissance queries are forwarded to public registries such as Cloudflare DNS-over-HTTPS, RDAP, RIPEstat,
        crt.sh, ipwho.is and the target&apos;s own HTTPS endpoint. Treat those queries as attributable to the deployment
        you are using.
      </p>

      <h2>Port scanning</h2>
      <p>
        The scanner opens TCP connections from the server to the host you specify. It requires an explicit authorization
        confirmation, rejects private and reserved ranges, and is rate limited. Targets may observe connection attempts
        originating from the server&apos;s address. Never scan infrastructure you do not own or have written permission
        to test.
      </p>

      <h2>OI assistant</h2>
      <p>
        Without <code>OI_API_KEY</code>, OI runs a deterministic local analysis and no message leaves the deployment.
        With a key configured, your prompt plus the workspace context you can see in the panel (layer counts and the
        selected entity) is sent to the model endpoint you configured. Review that provider&apos;s retention policy
        before sending sensitive material.
      </p>

      <h2>Remote presence</h2>
      <p>
        Remote mode uses the browser <code>BroadcastChannel</code> API. Cursors are shared only between windows on the
        same device and are never transmitted to a server. If you later configure a WebSocket relay, that relay becomes
        the trust boundary for presence data.
      </p>

      <h2>Ghost protocol</h2>
      <p>
        Ghost Protocol is a presentation control: it masks coordinate readouts and operator tags, dims identifying
        chrome and can purge local state. It does not change your network route, encrypt traffic or hide requests from
        upstream providers. Use a VPN or Tor Browser for network-level anonymity.
      </p>

      <h2>Third-party data</h2>
      <p>
        Aircraft, vessel, satellite, seismic, weather, camera, cyber and market data belong to their respective
        providers and are subject to their terms. OSIRIS links to originals wherever possible. Camera streams are public
        feeds published by transport authorities and are not recorded by this platform.
      </p>

      <h2>Children</h2>
      <p>OSIRIS is an intelligence tool intended for professional and research use. It is not directed at children.</p>

      <h2>Changes</h2>
      <p>
        Material changes to data handling will appear on this page with an updated date. Because there is no account
        system, there is nothing to notify you about individually.
      </p>
      <p className="doc-note">Last updated: 25 October 2026</p>
    </DocPage>
  );
}
