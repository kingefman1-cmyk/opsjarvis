"use client";

import { useState } from "react";

const FIVERR_URL = "https://www.fiverr.com/king12fx";
const REPO_URL = "https://github.com/kingefman1-cmyk/opsjarvis";

type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "Where do my API keys live? Does anything secret reach the browser?",
    a: "Every key (LLM provider, Gmail, Slack, Stripe, HubSpot…) sits in a server-side .env.local on your own Vercel project or VPS and is read only inside Server Actions, Route Handlers and background workers. The dashboard is a Client Component with no secrets; the browser bundle never contains a key. A clean .env.example ships with every build so you paste your own keys and nothing of ours.",
  },
  {
    q: "Which tools does it connect to — WhatsApp Business, Paystack, Stripe, HubSpot?",
    a: "Inbound: Gmail, WhatsApp Business, Slack and Telegram land in one triage queue. Outbound writes: Stripe, Paystack and Flutterwave (refunds, payouts, payment-link reconciliation), HubSpot and Pipedrive (deal stages, notes), Xero (invoices) and any documented REST or OAuth API. Payment providers used across Africa are first-class, not an afterthought.",
  },
  {
    q: "What does “human-in-the-loop” actually mean here?",
    a: "The AI reads, classifies and drafts automatically. Anything that writes to the outside world — a refund, a CRM stage change, an outbound message — opens a side-by-side review with the exact API payload, a before/after state diff and the editable draft. A deterministic executor runs only what you confirmed, and the activity log records actor, time and target. Low-risk items can be bulk-approved; nothing is auto-sent unless you switch that on yourself.",
  },
  {
    q: "What is the circuit breaker?",
    a: "A latency guard in front of each downstream API. If HubSpot (or Stripe, or Xero) starts answering slowly or failing, the desk pauses writes to that service, keeps queuing drafts, and shows a recovery banner; nothing half-executes against a degraded API. When the service recovers, held items resume from the queue with a fresh approval.",
  },
  {
    q: "How much does a build cost, and what do I get?",
    a: "Three fixed tiers on Fiverr. Basic $120 (2 days): one automated API pipeline or AI workflow script with .env.example and setup guide. Standard $325 (4 days): the Next.js 15 dark-mode dashboard on Vercel connected to up to three REST/OAuth APIs with inbox triage, summaries, read and draft actions. Premium $950 (7 days): multi-step write actions, approval switches, 24/7 PM2 workers on your VPS and unlimited standard APIs. Standard plus exactly one write action is a $575 custom offer. You own 100% of the source.",
  },
  {
    q: "Can I run it myself instead of ordering a build?",
    a: "Yes. The core is open-core under MIT. Clone the repo, add your keys to .env.local, run npm run dev or deploy to Vercel. The paid tiers are for wiring your real APIs, your approval rules and your hosting, with handover docs and a walkthrough.",
  },
  {
    q: "Does it work across time zones?",
    a: "It is built for async teams: someone in Lagos approves from Telegram at 09:30 WAT, the London accountant sees actor, time and target in the log at 08:30 GMT, and nobody in Toronto had to be awake. Coverage spans the Americas, Africa, Europe, the Middle East and APAC.",
  },
];

export default function SeoFaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <section id="faq" aria-labelledby="faq-heading" className="rounded-2xl border border-white/5 bg-ink-900/60 p-6 sm:p-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-signal/80">Before you order</p>
          <h2 id="faq-heading" className="mt-1 text-lg font-semibold text-slate-100">
            Self-hosted AI operations desk — common questions
          </h2>
        </div>
        <div className="flex gap-2 text-xs">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="rounded-md border border-white/10 px-3 py-1.5 text-slate-300 hover:border-signal/40 hover:text-signal">
            Source (MIT)
          </a>
          <a href={FIVERR_URL} target="_blank" rel="noopener noreferrer" className="rounded-md bg-signal/15 px-3 py-1.5 text-signal hover:bg-signal/25">
            Order a build
          </a>
        </div>
      </div>

      <ul className="divide-y divide-white/5">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left text-sm text-slate-200 transition hover:text-white"
              >
                <span>{f.q}</span>
                <span aria-hidden className={`shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
              </button>
              <div id={`faq-panel-${i}`} hidden={!isOpen} className="pb-4 pr-8 text-sm leading-relaxed text-slate-400">
                {f.a}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
