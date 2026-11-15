"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY,
  INBOX,
  SERVICES,
  TASKS,
  type InboxItem,
  type LogEntry,
  type Priority,
  type Service,
  type Task,
} from "@/lib/demo-data";

const PRIORITY_STYLE: Record<Priority, string> = {
  urgent: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  normal: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  low: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
};

const STATE_STYLE: Record<Service["state"], { dot: string; text: string; label: string }> = {
  operational: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Operational" },
  degraded: { dot: "bg-amber-400", text: "text-amber-300", label: "Degraded" },
  down: { dot: "bg-rose-400", text: "text-rose-300", label: "Down" },
};

const RISK_STYLE: Record<Task["risk"], string> = {
  low: "text-emerald-300",
  medium: "text-amber-300",
  high: "text-rose-300",
};

const TIER_STYLE: Record<"standard" | "premium", string> = {
  standard: "bg-sky-500/10 text-sky-300/90 ring-sky-500/25",
  premium: "bg-violet-500/10 text-violet-300/90 ring-violet-500/25",
};

function TierBadge({ tier, label }: { tier: "standard" | "premium"; label: string }) {
  return (
    <span
      title={tier === "premium" ? "Included in the Premium ($950) package" : "Included in Standard ($325) and Premium ($950)"}
      className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ring-1 ${TIER_STYLE[tier]}`}
    >
      {label}
    </span>
  );
}

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** A Claude-drafted X reply waiting for a human click. Served by /api/x/queue when running locally. */
type XQueueItem = {
  id: string;
  kind: "reply" | "post";
  tweetId: string;
  authorHandle: string;
  sourceText: string;
  sourceUrl: string;
  draft: string;
  createdAt: string;
};
type XActivity = { id: string; time: string; actor: LogEntry["actor"]; text: string; url?: string };

const FIVERR_URL = "https://www.fiverr.com/king12fx/build-your-custom-claude-ai-assistant-and-automated-dashboard";
const TG_DEMO_URL = "https://t.me/OpsJarvisAI_bot";

export default function Dashboard() {
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [checkedAt, setCheckedAt] = useState<string>("just now");
  const [inbox, setInbox] = useState<InboxItem[]>(INBOX);
  const [selectedId, setSelectedId] = useState<string>(INBOX[0].id);
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [log, setLog] = useState<LogEntry[]>(ACTIVITY);
  const [autopilot, setAutopilot] = useState(false);
  const [xQueue, setXQueue] = useState<XQueueItem[]>([]);
  const [xEnabled, setXEnabled] = useState(false);
  const [xBusy, setXBusy] = useState<string | null>(null);
  const [xError, setXError] = useState<string | null>(null);

  // Poll the X approval queue + autonomous activity (only populated when the dashboard runs locally).
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [q, a] = await Promise.all([
          fetch("/api/x/queue", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/x/activity", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (!alive) return;
        setXEnabled(Boolean(q.enabled));
        setXQueue(q.items ?? []);
        const entries: LogEntry[] = ((a.items ?? []) as XActivity[]).map((e) => ({
          id: e.id,
          time: new Date(e.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          actor: e.actor,
          text: e.text,
        }));
        if (entries.length) setLog((l) => [...entries, ...l.filter((x) => !x.id.startsWith("x"))].slice(0, 20));
      } catch {
        /* demo mode: endpoints absent */
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const decideX = async (item: XQueueItem, action: "approve" | "reject") => {
    setXBusy(item.id);
    setXError(null);
    try {
      const res = await fetch("/api/x/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setXQueue((q) => q.filter((x) => x.id !== item.id));
      const what = item.kind === "post" ? "X build update" : `X reply to @${item.authorHandle}`;
      addLog("human", action === "approve" ? `Approved ${what}.` : `Rejected ${what}.`);
    } catch (e) {
      setXError((e as Error).message);
    } finally {
      setXBusy(null);
    }
  };

  // Poll the server-side status route. Keys never leave the server.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setServices(data.services);
        setCheckedAt(nowTime());
      } catch {
        /* keep last known state */
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const addLog = (actor: LogEntry["actor"], text: string) =>
    setLog((l) => [{ id: `l${Date.now()}${Math.random()}`, time: nowTime(), actor, text }, ...l].slice(0, 12));

  const finishTask = (id: string, title: string) => {
    setTimeout(() => {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: "done" } : t)));
      addLog("jarvis", `Completed: ${title}.`);
    }, 2200);
  };

  const approve = (task: Task) => {
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: "running" } : t)));
    addLog("human", `Approved: ${task.title}.`);
    finishTask(task.id, task.title);
  };

  const reject = (task: Task) => {
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    addLog("human", `Rejected: ${task.title}.`);
  };

  const runNow = (task: Task) => {
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: "running" } : t)));
    addLog("jarvis", `Started: ${task.title}.`);
    finishTask(task.id, task.title);
  };

  const resolveMessage = (item: InboxItem) => {
    setInbox((xs) => xs.filter((x) => x.id !== item.id));
    addLog("jarvis", `Handled "${item.subject}" from ${item.from}.`);
    const rest = inbox.filter((x) => x.id !== item.id);
    if (rest.length) setSelectedId(rest[0].id);
  };

  const visible = useMemo(() => inbox.filter((i) => filter === "all" || i.priority === filter), [inbox, filter]);
  const selected = inbox.find((i) => i.id === selectedId) ?? visible[0];
  const urgent = inbox.filter((i) => i.priority === "urgent").length;
  const pending = tasks.filter((t) => t.status === "needs_approval").length + xQueue.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const healthy = services.filter((s) => s.state === "operational").length;

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-700 bg-ink-900 px-4 py-5 lg:flex">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-signal/15 ring-1 ring-signal/40">
              <span className="h-2.5 w-2.5 rounded-full bg-signal pulse-dot" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">OpsJarvis</div>
              <div className="text-[11px] text-slate-400">AI operations desk</div>
            </div>
          </div>
          <nav className="mt-8 space-y-1 text-sm">
            {["Overview", "Inbox triage", "Task queue", "Integrations", "Activity"].map((n, i) => (
              <a
                key={n}
                href={i === 0 ? "#top" : `#${n.split(" ")[0].toLowerCase()}`}
                className={`block rounded-md px-3 py-2 ${
                  i === 0 ? "bg-ink-700 text-white" : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                }`}
              >
                {n}
              </a>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border border-ink-700 bg-ink-850 p-3 text-[11px] leading-relaxed text-slate-400">
            <div className="mb-1 font-medium text-slate-200">Keys stay server-side</div>
            API keys live in <span className="font-mono text-signal">.env.local</span> and are read only by server
            routes.
          </div>
        </aside>

        {/* Main */}
        <main id="top" className="min-w-0 flex-1 px-5 py-5 sm:px-8">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">Good morning. Here is your desk.</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Demo workspace with sample data. Nothing here sends real messages.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-ink-600 px-3 py-1 font-mono text-[11px] text-slate-400">
                Status checked {checkedAt}
              </span>
              <button
                onClick={() => {
                  const turningOn = !autopilot;
                  setAutopilot(turningOn);
                  addLog("human", `Autopilot for low-risk tasks turned ${turningOn ? "on" : "off"}.`);
                  // Autopilot only ever starts low-risk queued work; approvals still wait for a person.
                  if (turningOn) tasks.filter((t) => t.status === "queued" && t.risk === "low").forEach(runNow);
                }}
                aria-pressed={autopilot}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                  autopilot
                    ? "bg-signal/15 text-signal ring-signal/40"
                    : "bg-ink-800 text-slate-300 ring-ink-600 hover:bg-ink-700"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${autopilot ? "bg-signal" : "bg-slate-500"}`} />
                Autopilot {autopilot ? "on" : "off"}
              </button>
              <a
                href={FIVERR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-ink-600 transition hover:bg-white/10 hover:text-white"
              >
                Deploy for your team →
              </a>
            </div>
          </header>

          {/* KPI row */}
          <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Urgent messages", value: urgent, hint: `${inbox.length} in inbox` },
              { label: "Awaiting approval", value: pending, hint: "human-in-the-loop" },
              { label: "Tasks completed", value: done + 37, hint: "today" },
              { label: "Integrations healthy", value: `${healthy}/${services.length}`, hint: "live checks" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-ink-700 bg-ink-900 p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">{k.label}</div>
                <div className="mt-1.5 text-2xl font-semibold tabular-nums text-white">{k.value}</div>
                <div className="mt-0.5 text-xs text-slate-500">{k.hint}</div>
              </div>
            ))}
          </section>

          {/* Status badges */}
          <section id="integrations" className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-medium text-slate-300">Live API status</h2>
              <TierBadge tier="standard" label="Standard & Premium" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              {services.map((s) => {
                const st = STATE_STYLE[s.state];
                return (
                  <div key={s.id} className="rounded-xl border border-ink-700 bg-ink-900 p-3">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                        {s.name}
                        {s.id === "worker" && <TierBadge tier="premium" label="Premium" />}
                      </span>
                      <span className={`h-2 w-2 rounded-full ${st.dot} pulse-dot`} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{s.kind}</div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
                      <span className="font-mono text-[11px] tabular-nums text-slate-400">{s.latencyMs} ms</span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-slate-500">{s.uptime}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-5">
            {/* Inbox triage */}
            <section id="inbox" className="rounded-xl border border-ink-700 bg-ink-900 xl:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-white">Inbox triage</h2>
                  <TierBadge tier="standard" label="Standard & Premium" />
                </div>
                <div className="flex gap-1 text-xs">
                  {(["all", "urgent", "normal", "low"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-2.5 py-1 capitalize ${
                        filter === f ? "bg-ink-600 text-white" : "text-slate-400 hover:bg-ink-800"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2">
                <ul className="max-h-[420px] divide-y divide-ink-700 overflow-y-auto md:border-r md:border-ink-700">
                  {visible.length === 0 && (
                    <li className="px-4 py-10 text-center text-sm text-slate-500">Inbox clear for this filter.</li>
                  )}
                  {visible.map((m) => (
                    <li key={m.id}>
                      <button
                        onClick={() => setSelectedId(m.id)}
                        className={`block w-full px-4 py-3 text-left transition ${
                          selected?.id === m.id ? "bg-ink-800" : "hover:bg-ink-850"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-xs text-slate-400">
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                                m.source === "email" ? "bg-indigo-500/15 text-indigo-300" : m.source === "slack" ? "bg-fuchsia-500/15 text-fuchsia-300" : "bg-sky-500/15 text-sky-300"
                              }`}
                            >
                              {m.source}
                            </span>
                            {m.from}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{m.minutesAgo}m</span>
                        </div>
                        <div className="mt-1 truncate text-sm font-medium text-white">{m.subject}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ring-1 ${PRIORITY_STYLE[m.priority]}`}>
                            {m.priority}
                          </span>
                          <span className="text-[11px] text-slate-500">{m.category}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="p-4">
                  {selected ? (
                    <>
                      <div className="text-[11px] text-slate-500">{selected.channel}</div>
                      <div className="mt-1 text-sm font-semibold text-white">{selected.subject}</div>
                      <p className="mt-2 rounded-lg bg-ink-850 p-3 text-sm leading-relaxed text-slate-300">
                        {selected.preview}
                      </p>
                      <div className="mt-3 text-[11px] font-medium uppercase tracking-wider text-signal">Summary</div>
                      <p className="mt-1 text-sm text-slate-300">{selected.summary}</p>
                      <div className="mt-3 text-[11px] font-medium uppercase tracking-wider text-signal">
                        Suggested next step
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{selected.suggestion}</p>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => resolveMessage(selected)}
                          className="rounded-md bg-signal px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-signal-dim"
                        >
                          Do it
                        </button>
                        <button
                          onClick={() => {
                            addLog("human", `Snoozed "${selected.subject}" for 1 hour.`);
                            setInbox((xs) => xs.filter((x) => x.id !== selected.id));
                          }}
                          className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800"
                        >
                          Snooze 1h
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center text-sm text-slate-500">Nothing selected.</div>
                  )}
                </div>
              </div>
            </section>

            {/* Activity */}
            <section id="activity" className="rounded-xl border border-ink-700 bg-ink-900 xl:col-span-2">
              <div className="border-b border-ink-700 px-4 py-3">
                <h2 className="text-sm font-medium text-white">Activity log</h2>
              </div>
              <ol className="max-h-[420px] space-y-3 overflow-y-auto p-4">
                {log.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span className="mt-0.5 w-10 shrink-0 font-mono text-[11px] text-slate-500">{e.time}</span>
                    <span
                      className={`mt-0.5 w-14 shrink-0 text-[10px] font-medium uppercase tracking-wider ${
                        e.actor === "jarvis" ? "text-signal" : e.actor === "human" ? "text-sky-300" : "text-amber-300"
                      }`}
                    >
                      {e.actor}
                    </span>
                    <span className="text-slate-300">{e.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {/* Task queue */}
          <section id="task" className="mt-5 rounded-xl border border-ink-700 bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-white">Task queue</h2>
                <TierBadge tier="premium" label="Premium" />
              </div>
              <span className="text-xs text-slate-500">High-risk steps always wait for a person</span>
            </div>
            <ul className="divide-y divide-ink-700">
              {xError && (
                <li className="bg-rose-500/10 px-4 py-2 text-xs text-rose-300">X reply failed: {xError}</li>
              )}
              {xEnabled && xQueue.length === 0 && (
                <li className="px-4 py-2 text-[11px] text-slate-500">X queue is empty. The scout and poster draft here (and to your Telegram) for approval.</li>
              )}
              {xQueue.map((q) => (
                <li key={q.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 bg-sky-500/[0.03] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      {q.kind === "post" ? "Publish build update on X" : `Reply to @${q.authorHandle} on X`}
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-sky-300 ring-1 ring-sky-500/25">drafted by Claude</span>
                    </div>
                    <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] text-slate-500 hover:text-slate-300">
                      {q.sourceText}
                    </a>
                    <p className="mt-1.5 rounded-lg bg-ink-850 px-3 py-2 text-sm text-slate-200">{q.draft}</p>
                    <div className="mt-1 text-[11px] text-slate-500">
                      <span className="font-mono">X API</span> · <span className="text-amber-300">medium risk</span> · posts only when you approve
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={xBusy === q.id}
                      onClick={() => decideX(q, "approve")}
                      className="rounded-md bg-signal px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-signal-dim disabled:opacity-50"
                    >
                      {xBusy === q.id ? "Posting…" : "Approve"}
                    </button>
                    <button
                      disabled={xBusy === q.id}
                      onClick={() => decideX(q, "reject")}
                      className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
              {tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{t.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                      <span>{t.detail}</span>
                      <span className="font-mono">{t.tool}</span>
                      <span className={RISK_STYLE[t.risk]}>{t.risk} risk</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {t.steps.map((s, i) => (
                        <span key={s} className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                          {i + 1}. {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status === "needs_approval" && (
                      <>
                        <button
                          onClick={() => approve(t)}
                          className="rounded-md bg-signal px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-signal-dim"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reject(t)}
                          className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {t.status === "queued" && (
                      <button
                        onClick={() => runNow(t)}
                        className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800"
                      >
                        Run now
                      </button>
                    )}
                    {t.status === "running" && (
                      <span className="flex items-center gap-2 rounded-md bg-sky-500/10 px-3 py-1.5 text-xs text-sky-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-300 pulse-dot" />
                        Running
                      </span>
                    )}
                    {t.status === "done" && (
                      <span className="rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">Done</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <footer className="space-y-1 py-6 text-center text-[11px] text-slate-500">
            <div className="text-slate-400">
              Built by{" "}
              <a href={FIVERR_URL} target="_blank" rel="noopener noreferrer" className="text-slate-200 underline-offset-2 hover:underline">
                Efe — AI Automation Architect (Caelara Labs)
              </a>{" "}
              | Custom Claude Assistants &amp; Live Dashboards ·{" "}
              <a href={TG_DEMO_URL} target="_blank" rel="noopener noreferrer" className="text-slate-200 underline-offset-2 hover:underline">
                Live Telegram Demo (@OpsJarvisAI_bot)
              </a>
            </div>
            <div>OpsJarvis demo. Sample data only. Built with Next.js and Tailwind, ready for Vercel.</div>
          </footer>
        </main>
      </div>
    </div>
  );
}
