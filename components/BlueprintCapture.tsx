"use client";

import { useState } from "react";

type Blueprint = {
  title: string;
  steps: { name: string; agent: string; detail: string; approvalGate: string }[];
  tier: "Basic" | "Standard" | "Premium";
  tierPrice: string;
  buildTime: string;
  whyThisTier: string;
  estimatedHoursSavedPerWeek: string;
  estimatedMonthlyApiCost: string;
};

const FIVERR_URL = "https://www.fiverr.com/king12fx/build-your-custom-claude-ai-assistant-and-automated-dashboard";
const EXAMPLES = [
  "Triaging client emails and updating HubSpot deals manually",
  "Copying Stripe refunds into a spreadsheet and Slack every morning",
  "Answering the same onboarding questions in Telegram all day",
  "Matching Paystack and Flutterwave payouts to invoices in Xero by hand",
  "Replying to WhatsApp Business order questions one by one",
];

/**
 * Lead-capture card: one bottleneck sentence + work email -> tailored 3-step architecture blueprint,
 * shown inline and emailed. Posts to /api/leads/blueprint; nothing secret lives in this component.
 */
export default function BlueprintCapture() {
  const [bottleneck, setBottleneck] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blueprint: Blueprint; emailed: boolean; emailNote?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/leads/blueprint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bottleneck, email, website }),
      });
      const j = (await res.json()) as { ok: boolean; error?: string; blueprint?: Blueprint; emailed?: boolean; emailNote?: string };
      if (!res.ok || !j.ok || !j.blueprint) throw new Error(j.error ?? "Something went wrong. Try again.");
      setResult({ blueprint: j.blueprint, emailed: !!j.emailed, emailNote: j.emailNote });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  return (
    <section id="blueprint" className="rounded-2xl border border-signal/30 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-850 p-6 shadow-[0_0_60px_-30px_rgba(94,234,212,0.6)] sm:p-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-signal">Free in 30 seconds</div>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-[26px]">
            Have a messy manual workflow? Get a custom Claude architecture blueprint in 30 seconds.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Describe the bottleneck in one line. You get a 3-step Operations Desk design: the agents, the approval gates, the
            build time, and which fixed-price tier it fits. Sent to your inbox too.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
            <li>· Human approval in front of every write action</li>
            <li>· Your keys, your .env, your source code</li>
            <li>· Built on the same stack as this live sandbox</li>
          </ul>
          <p className="mt-4 rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-400">
            <span className="font-medium text-slate-200">Worldwide Async Delivery</span> · All Timezones (Americas, Africa, Europe, Middle East &amp; APAC) · Works with Gmail,
            WhatsApp Business, Slack, Telegram, Paystack, Flutterwave, Stripe, HubSpot, Pipedrive &amp; Xero.
          </p>
        </div>

        <div className="lg:col-span-3">
          {state !== "done" ? (
            <form onSubmit={submit} className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Your workflow bottleneck</span>
                <input
                  required
                  minLength={12}
                  maxLength={400}
                  value={bottleneck}
                  onChange={(e) => setBottleneck(e.target.value)}
                  placeholder="e.g. Triaging client emails and updating HubSpot deals manually"
                  className="mt-1 w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-signal focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((x) => (
                  <button key={x} type="button" onClick={() => setBottleneck(x)} className="rounded-full border border-ink-600 px-2.5 py-1 text-[11px] text-slate-400 hover:border-signal/50 hover:text-slate-200">
                    {x}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Work email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1 w-full rounded-lg border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-signal focus:outline-none"
                />
              </label>
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden name="website" />
              {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}
              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full rounded-lg bg-signal px-4 py-3 text-sm font-semibold text-ink-950 transition hover:bg-signal-dim disabled:cursor-wait disabled:opacity-70"
              >
                {state === "loading" ? "Designing your blueprint…" : "Generate My Free Blueprint →"}
              </button>
              <p className="text-center text-[11px] text-slate-600">No spam. One blueprint email, plus the optional Friday Ops Brief you can leave with one reply.</p>
            </form>
          ) : (
            result && <BlueprintView bp={result.blueprint} emailed={result.emailed} emailNote={result.emailNote} onReset={() => { setState("idle"); setResult(null); }} />
          )}
        </div>
      </div>
    </section>
  );
}

function blueprintText(bp: Blueprint) {
  const steps = bp.steps.map((s, i) => `${i + 1}. ${s.name} — ${s.agent}: ${s.detail} (approval gate: ${s.approvalGate})`).join("\n");
  return `${bp.title}\nRecommended: ${bp.tier} · ${bp.tierPrice} · ${bp.buildTime}\n\n${steps}\n\n${bp.whyThisTier}\nEst. time saved: ${bp.estimatedHoursSavedPerWeek} · Est. API cost: ${bp.estimatedMonthlyApiCost}\n\nGenerated at https://caelaralabs.com/#blueprint · OpsJarvis by Caelara Labs`;
}

function BlueprintView({ bp, emailed, emailNote, onReset }: { bp: Blueprint; emailed: boolean; emailNote?: string; onReset: () => void }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "shared" | "failed">("idle");
  async function share() {
    const text = blueprintText(bp);
    try {
      if (typeof navigator !== "undefined" && "share" in navigator && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: `${bp.title} — OpsJarvis blueprint`, text });
        setCopied("shared");
      } else {
        await navigator.clipboard.writeText(text);
        setCopied("copied");
      }
    } catch {
      try { await navigator.clipboard.writeText(text); setCopied("copied"); } catch { setCopied("failed"); }
    }
    setTimeout(() => setCopied("idle"), 2500);
  }
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-signal">Your blueprint</div>
          <div className="mt-1 text-lg font-semibold text-white">{bp.title}</div>
        </div>
        <div className="rounded-lg border border-signal/30 bg-signal/10 px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Recommended</div>
          <div className="text-sm font-semibold text-white">
            {bp.tier} · {bp.tierPrice} · {bp.buildTime}
          </div>
        </div>
      </div>
      <ol className="mt-4 space-y-3">
        {bp.steps.map((s, i) => (
          <li key={i} className="rounded-lg border border-ink-700 bg-ink-900 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-signal text-[11px] font-bold text-ink-950">{i + 1}</span>
              {s.name}
              <span className="ml-auto rounded-full bg-ink-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">{s.agent}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-300">{s.detail}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              <span className="text-amber-300/80">Approval gate:</span> {s.approvalGate}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-400">{bp.whyThisTier}</p>

      {/* ROI & running-cost estimate */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-signal/25 bg-signal/[0.06] px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Est. time saved</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-signal">{bp.estimatedHoursSavedPerWeek}</div>
          <div className="text-[10px] text-slate-500">manual work removed, conservative</div>
        </div>
        <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Est. API cost</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-white">{bp.estimatedMonthlyApiCost}</div>
          <div className="text-[10px] text-slate-500">billed by your own Claude account, no markup</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={FIVERR_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-signal-dim">
          Book this build ({bp.tierPrice}) →
        </a>
        <button
          onClick={share}
          className="rounded-lg border border-signal/40 bg-signal/10 px-3 py-2.5 text-xs font-medium text-signal hover:bg-signal/20"
          title="Copy the full blueprint as text to forward to a co-founder or CTO"
        >
          {copied === "copied" ? "Copied ✓" : copied === "shared" ? "Shared ✓" : copied === "failed" ? "Select & copy manually" : "Copy / Share Blueprint"}
        </button>
        <button onClick={onReset} className="rounded-lg border border-ink-600 px-3 py-2.5 text-xs text-slate-300 hover:bg-ink-800">
          Try another workflow
        </button>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">{emailed ? "A copy is on its way to your inbox." : emailNote ?? ""}</p>
    </div>
  );
}
