/**
 * Single text-completion adapter behind every drafting call in the repo.
 *
 * Order: Claude (primary, branded engine) -> Gemini (Google free tier) -> Groq.
 * The first provider whose key is present is used; if it errors, the next one is tried.
 * Swap or reorder here only; business logic never talks to a vendor SDK directly.
 */
import Anthropic from "@anthropic-ai/sdk";

export type Completion = { text: string; provider: "claude" | "gemini" | "groq" };
type Req = { system: string; user: string; maxTokens?: number };

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 30_000);

const has = (k: string) => Boolean(process.env[k] && process.env[k]!.trim());

export function availableProviders(): Completion["provider"][] {
  const out: Completion["provider"][] = [];
  if (has("ANTHROPIC_API_KEY")) out.push("claude");
  if (has("GEMINI_API_KEY")) out.push("gemini");
  if (has("GROQ_API_KEY")) out.push("groq");
  return out;
}

async function claude(r: Req): Promise<string> {
  const c = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  const res = await c.messages.create({ model: CLAUDE_MODEL, max_tokens: r.maxTokens ?? 300, system: r.system, messages: [{ role: "user", content: r.user }] });
  const b = res.content.find((x) => x.type === "text");
  return b && b.type === "text" ? b.text.trim() : "";
}

// Model preference lists. The first entry is the branded default; later ones are tried only when
// the provider says the model does not exist / is not available to this account (404/400 model errors).
const GEMINI_MODELS = [GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"].filter((m, i, a) => a.indexOf(m) === i);
const GROQ_MODELS = [GROQ_MODEL, "llama-3.3-70b-versatile", "openai/gpt-oss-20b", "openai/gpt-oss-120b", "llama-3.1-8b-instant", "qwen/qwen3-32b"].filter((m, i, a) => a.indexOf(m) === i);
const resolved: Partial<Record<Completion["provider"], string>> = {};
const isModelError = (status: number, body: string) => (status === 404 || status === 400) && /model|not found|does not exist|not supported/i.test(body);

async function geminiOnce(model: string, r: Req): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: r.system }] },
      contents: [{ role: "user", parts: [{ text: r.user }] }],
      generationConfig: { maxOutputTokens: r.maxTokens ?? 300, temperature: 0.7 },
    }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    const err = new Error(`gemini ${res.status}: ${body}`) as Error & { modelError?: boolean };
    err.modelError = isModelError(res.status, body);
    throw err;
  }
  const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
}

async function gemini(r: Req): Promise<string> {
  const order = resolved.gemini ? [resolved.gemini] : GEMINI_MODELS;
  let last: unknown;
  for (const m of order) {
    try {
      const t = await geminiOnce(m, r);
      resolved.gemini = m;
      return t;
    } catch (e) {
      last = e;
      if (!(e as { modelError?: boolean }).modelError) throw e; // auth/quota/network: do not keep trying models
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

async function groqOnce(model: string, r: Req): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      max_tokens: r.maxTokens ?? 300,
      temperature: 0.7,
      // gpt-oss / qwen3 are reasoning models: keep thinking short so the answer fits the token budget
      ...(/gpt-oss|qwen3/.test(model) ? { reasoning_effort: "low" } : {}),
      messages: [
        { role: "system", content: r.system },
        { role: "user", content: r.user },
      ],
    }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    const err = new Error(`groq ${res.status}: ${body}`) as Error & { modelError?: boolean };
    err.modelError = isModelError(res.status, body);
    throw err;
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (j.choices?.[0]?.message?.content ?? "").trim();
}

async function groq(r: Req): Promise<string> {
  const order = resolved.groq ? [resolved.groq] : GROQ_MODELS;
  let last: unknown;
  for (const m of order) {
    try {
      const t = await groqOnce(m, r);
      resolved.groq = m;
      return t;
    } catch (e) {
      last = e;
      if (!(e as { modelError?: boolean }).modelError) throw e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** Which concrete model each provider settled on (after discovery). */
export function resolvedModels() {
  return { claude: CLAUDE_MODEL, gemini: resolved.gemini ?? GEMINI_MODELS[0], groq: resolved.groq ?? GROQ_MODELS[0] };
}

const RUNNERS: Record<Completion["provider"], (r: Req) => Promise<string>> = { claude, gemini, groq };
// A provider that answers 401/403 or "API key not valid" is misconfigured; stop asking it for this process.
const disabled = new Map<Completion["provider"], string>();
const isAuthError = (msg: string) => /\b(401|403)\b|api key not valid|invalid api key|invalid_api_key|unauthorized|permission denied/i.test(msg);
// A provider that times out or is quota-limited twice in a row is parked for this process too: paying 30 s per call
// before failover turns a 20-candidate scout run into a 10-minute one.
const isSlowOrQuota = (msg: string) => /timeout|aborted|\b429\b|quota|rate limit/i.test(msg);
const strikes = new Map<Completion["provider"], number>();
export function disabledProviders() {
  return Object.fromEntries(disabled);
}

/** Complete with the first configured provider; fall through on error. Throws only if none work. */
export async function complete(r: Req): Promise<Completion> {
  const providers = availableProviders();
  if (!providers.length) throw new Error("No LLM key set (ANTHROPIC_API_KEY, GEMINI_API_KEY or GROQ_API_KEY)");
  let lastErr: unknown;
  for (const p of providers) {
    if (disabled.has(p)) { lastErr = new Error(`${p} disabled: ${disabled.get(p)}`); continue; }
    try {
      const text = await RUNNERS[p](r);
      strikes.delete(p);
      if (text) return { text, provider: p };
      lastErr = new Error(`${p} returned empty text`);
    } catch (e) {
      lastErr = e;
      const msg = (e as Error).message;
      if (isAuthError(msg)) disabled.set(p, msg.slice(0, 100));
      else if (isSlowOrQuota(msg)) {
        const n = (strikes.get(p) ?? 0) + 1;
        strikes.set(p, n);
        if (n >= 2) disabled.set(p, `parked after ${n} timeouts/quota errors: ${msg.slice(0, 60)}`);
      }
      console.warn(`[llm] ${p} failed: ${msg.slice(0, 120)}${providers.indexOf(p) < providers.length - 1 ? " -> trying next" : ""}`);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
