"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Sparkles } from "lucide-react";
import Panel from "./Panel";
import { useOsiris } from "@/lib/store";

type Msg = { role: "user" | "assistant"; content: string; mode?: string };

const CHIPS = [
  "Summarise the highest-severity alerts right now.",
  "What is happening in the South China Sea?",
  "Explain the current GPS jamming picture.",
  "Assess global cyber threat activity this week.",
  "Which conflict flashpoints should I watch?",
  "How do I investigate a suspicious IP?",
];

export default function OIPanel() {
  const counts = useOsiris((s) => s.counts);
  const selected = useOsiris((s) => s.selected);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "OI online. I am the resident analyst for this workspace.\n\nAsk me about live layers, entities, alerts or an investigation path. I can see the current entity counts and the selected feature. Add OI_API_KEY to .env.local for full model reasoning; otherwise I run a deterministic local analysis.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => {
    const parts = [
      `ACTIVE LAYER COUNTS: ${Object.entries(counts)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`,
    ];
    if (selected) {
      parts.push(`SELECTED ENTITY: ${selected.title} (${selected.kind}) at ${selected.lat},${selected.lon}`);
      parts.push(selected.props.map((p) => `${p.label}: ${p.value}`).join(" | "));
    }
    return parts.join("\n");
  }, [counts, selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    setWarning(null);
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setBusy(true);

    try {
      const res = await fetch("/api/oi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => m.role === "user" || m.role === "assistant").slice(-8),
          context,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "OI unavailable");
      setMessages((prev) => [...prev, { role: "assistant", content: json.data.reply, mode: json.data.mode }]);
      if (json.data.warning) setWarning(json.data.warning);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err instanceof Error ? err.message : "OI request failed." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel tool="oi" title="OI" subtitle="Intelligence analyst · live workspace" icon={Sparkles}>
      <div className="chat">
        {messages.map((m, i) => (
          <div className={`chat-msg ${m.role}`} key={i}>
            <span className="who">
              {m.role === "user" ? "OPERATOR" : `OI${m.mode ? ` · ${m.mode.toUpperCase()}` : ""}`}
            </span>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="loading-inline">
            <span className="spinner" /> OI is analysing
          </div>
        )}
        <div ref={endRef} />
      </div>

      {warning && (
        <p className="hint" style={{ color: "var(--warn)" }}>
          {warning}
        </p>
      )}

      <div className="quick-chips">
        {CHIPS.map((c) => (
          <button key={c} className="chip" onClick={() => void send(c)} disabled={busy}>
            {c}
          </button>
        ))}
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="oi-input">Message OI</label>
        <div className="input-row">
          <textarea
            id="oi-input"
            className="textarea"
            style={{ minHeight: 54 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask about live intelligence…"
          />
          <button className="btn btn-primary" onClick={() => void send()} disabled={busy || !input.trim()} style={{ height: 54 }}>
            <CornerDownLeft size={12} /> SEND
          </button>
        </div>
      </div>

      <p className="hint" style={{ marginTop: 8 }}>
        OI uses only public data and the current workspace context. Verify before acting. Shift+Enter for a new line.
      </p>
    </Panel>
  );
}
