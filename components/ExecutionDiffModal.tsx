"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, TaskPayload } from "@/lib/demo-data";

type Props = {
  task: Task;
  /** True while the HubSpot circuit breaker is open; HubSpot writes cannot be confirmed. */
  breakerActive: boolean;
  onConfirm: (editedDraft: string | null) => void;
  onCancel: () => void;
  onSimulateRecovery: () => void;
};

/** Tasks without a hand-written payload still get a plausible simulated call so the diff is never empty. */
function derivePayload(task: Task): TaskPayload {
  const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  return { method: "POST", endpoint: `/v1/${task.tool.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/actions`, body: { action: slug, steps: task.steps.length, dry_run: false } };
}

function Row({ k, before, after }: { k: string; before?: string; after?: string }) {
  const changed = before !== after;
  return (
    <div className="grid grid-cols-[1fr_1.1fr_1.1fr] gap-2 border-t border-ink-700 py-1.5 text-[12px]">
      <span className="text-slate-400">{k}</span>
      <span className={changed ? "text-rose-300/90 line-through decoration-rose-500/50" : "text-slate-300"}>{before ?? "—"}</span>
      <span className={changed ? "text-emerald-300" : "text-slate-300"}>{after ?? "—"}</span>
    </div>
  );
}

/**
 * Side-by-side execution review. Left: the exact (simulated) API call and a before → after state diff.
 * Right: the customer-facing draft in an editable textarea. Nothing runs until "Confirm & Execute".
 */
export default function ExecutionDiffModal({ task, breakerActive, onConfirm, onCancel, onSimulateRecovery }: Props) {
  const payload = task.payload ?? derivePayload(task);
  const [draft, setDraft] = useState(task.draft?.body ?? "");
  const isHubSpot = /hubspot/i.test(task.tool);
  const blocked = isHubSpot && breakerActive;
  const keys = useMemo(() => Array.from(new Set([...Object.keys(task.before ?? {}), ...Object.keys(task.after ?? {})])), [task.before, task.after]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !blocked) onConfirm(task.draft ? draft : null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm, blocked, draft, task.draft]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={onCancel} role="dialog" aria-modal="true" aria-label="Review before executing">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-ink-600 bg-ink-900 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink-700 px-5 py-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-signal">Review before executing</div>
            <div className="mt-0.5 text-base font-semibold text-white">{task.title}</div>
            <div className="mt-0.5 text-xs text-slate-400">
              {task.detail} · <span className="font-mono">{task.tool}</span> ·{" "}
              <span className={task.risk === "high" ? "text-rose-300" : task.risk === "medium" ? "text-amber-300" : "text-emerald-300"}>{task.risk} risk</span>
            </div>
          </div>
          <button onClick={onCancel} className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-ink-800 hover:text-white" aria-label="Close">
            Esc
          </button>
        </div>

        {blocked && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/10 px-5 py-2 text-xs text-amber-200">
            <span>
              <span className="font-semibold">Circuit Breaker Active:</span> HubSpot CRM writes paused until latency &lt; 800 ms. This action stays queued.
            </span>
            <button onClick={onSimulateRecovery} className="rounded border border-amber-400/40 px-2 py-0.5 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20">
              Simulate latency recovery
            </button>
          </div>
        )}

        <div className="grid gap-0 md:grid-cols-2">
          {/* Left: payload + diff */}
          <div className="border-b border-ink-700 p-5 md:border-b-0 md:border-r">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Simulated API call</div>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 p-3 font-mono text-[12px] leading-relaxed text-slate-200">
              <span className="text-signal">{payload.method}</span> <span className="text-sky-300">{payload.endpoint}</span>
              {"\n"}
              {JSON.stringify(payload.body, null, 2)}
            </pre>
            <div className="mt-4 text-[11px] font-medium uppercase tracking-wider text-slate-400">State diff</div>
            <div className="mt-2 rounded-lg bg-ink-950 px-3 pb-1 pt-2">
              <div className="grid grid-cols-[1fr_1.1fr_1.1fr] gap-2 pb-1 text-[10px] uppercase tracking-wider text-slate-500">
                <span>Field</span>
                <span>Before</span>
                <span>After</span>
              </div>
              {keys.length ? keys.map((k) => <Row key={k} k={k} before={task.before?.[k]} after={task.after?.[k]} />) : <Row k="Status" before="needs approval" after="executed · logged" />}
            </div>
          </div>

          {/* Right: editable draft */}
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {task.draft ? (task.draft.kind === "email" ? "Customer email (editable)" : "Slack update (editable)") : "Outbound message"}
              </div>
              {task.draft && <span className="rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-sky-300 ring-1 ring-sky-500/25">drafted by AI</span>}
            </div>
            {task.draft ? (
              <>
                <div className="mt-2 space-y-1 text-[12px] text-slate-400">
                  <div>
                    <span className="text-slate-500">To:</span> <span className="font-mono text-slate-300">{task.draft.to}</span>
                  </div>
                  {task.draft.subject && (
                    <div>
                      <span className="text-slate-500">Subject:</span> <span className="text-slate-300">{task.draft.subject}</span>
                    </div>
                  )}
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={11}
                  className="mt-2 w-full resize-y rounded-lg border border-ink-600 bg-ink-950 p-3 text-[13px] leading-relaxed text-slate-200 focus:border-signal focus:outline-none"
                  aria-label="Edit draft message"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>{draft !== task.draft.body ? "Edited — your version will be sent." : "Tweak anything before it goes out."}</span>
                  <span className="font-mono">{draft.length} chars</span>
                </div>
              </>
            ) : (
              <p className="mt-2 rounded-lg bg-ink-950 p-3 text-[13px] text-slate-400">This task writes to {task.tool} only; no customer-facing message is sent.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-700 px-5 py-3">
          <span className="text-[11px] text-slate-500">Demo: nothing leaves this page. In a client build this is the exact call that runs, logged with actor, time and target.</span>
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800">
              Cancel
            </button>
            <button
              disabled={blocked}
              onClick={() => onConfirm(task.draft ? draft : null)}
              title={blocked ? "Paused by the HubSpot circuit breaker" : "⌘/Ctrl + Enter"}
              className="rounded-md bg-signal px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-signal-dim disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm &amp; Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
