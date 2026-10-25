import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Message = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `You are OI, the resident intelligence analyst inside OSIRIS — an open-source intelligence (OSINT) platform.
Rules:
- Be concise and operational. Use short sections and bullets.
- Never invent coordinates, counts, or events. If live context is missing, say what to enable.
- Distinguish observed data from inference.
- For targeting questions, provide analysis from public data only, and flag legal/ethical constraints.
- Output plain text or light markdown. No emojis.`;

function localAnalysis(messages: Message[], context: string): string {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const lines: string[] = [];
  lines.push("OI / LOCAL ANALYSIS MODE");
  lines.push("No model key is configured, so this is a deterministic read of the live workspace.");
  lines.push("");
  lines.push(`QUERY: ${last.slice(0, 300)}`);
  if (context) {
    lines.push("");
    lines.push("LIVE CONTEXT");
    lines.push(context.slice(0, 1400));
  }
  lines.push("");
  lines.push("ASSESSMENT");
  lines.push("- Cross-reference the active layers above; entity counts are refreshed from their upstream feeds.");
  lines.push("- Highest-value next step: open ALERTS and RECON, then pivot on the strongest indicator (place, IP, domain, MMSI or callsign).");
  lines.push("- Add OI_API_KEY to .env.local to enable full natural-language reasoning over this same context.");
  return lines.join("\n");
}

export async function POST(req: Request) {
  const rl = rateLimit(`oi:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ ok: false, error: "rate limit — retry shortly" }, { status: 429 });

  let body: { messages?: Message[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role))
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!messages.length) return NextResponse.json({ ok: false, error: "no messages" }, { status: 400 });

  const key = process.env.OI_API_KEY;
  const base = process.env.OI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OI_MODEL ?? "gpt-4o-mini";
  const context = (body.context ?? "").slice(0, 6000);

  if (!key) {
    return NextResponse.json({
      ok: true,
      data: { reply: localAnalysis(messages, context), mode: "local" },
      meta: { source: "OSIRIS OI", fetchedAt: new Date().toISOString(), latencyMs: 0 },
    });
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 900,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: `LIVE WORKSPACE CONTEXT:\n${context || "no live context supplied"}` },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) throw new Error(`model upstream ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("empty model response");
    return NextResponse.json({
      ok: true,
      data: { reply, mode: "model" },
      meta: { source: "OI", fetchedAt: new Date().toISOString(), latencyMs: 0 },
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      data: { reply: localAnalysis(messages, context), mode: "local-fallback", warning: err instanceof Error ? err.message : "model unavailable" },
      meta: { source: "OSIRIS OI", fetchedAt: new Date().toISOString(), latencyMs: 0 },
    });
  }
}
