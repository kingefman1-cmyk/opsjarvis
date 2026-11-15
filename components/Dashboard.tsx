"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BlueprintCapture from "./BlueprintCapture";
import CommandPalette, { type Command } from "./CommandPalette";
import ExecutionDiffModal from "./ExecutionDiffModal";
import {
  ACTIVITY,
  CRISIS_INBOX,
  CRISIS_TASK,
  INBOX,
  SERVICES,
  TASKS,
  type InboxItem,
  type LogEntry,
  type Priority,
  type Service,
  type Task,
} from "@/lib/demo-data";

/** HubSpot writes are paused while its measured latency is above this (the circuit breaker). */
const BREAKER_THRESHOLD_MS = 800;
const UNDO_MS = 10_000;

type Undo = { id: number; label: string; run: () => void; expiresAt: number };
/** Keyboard focus walks inbox items first, then tasks that still need a decision. */
type FocusTarget = { kind: "inbox"; item: InboxItem } | { kind: "task"; task: Task };

/** Items without a hand-written trace still show a realistic, read-only path. */
function defaultTrace(m: InboxItem): NonNullable<InboxItem["trace"]> {
  return [
    { t: 0.11, step: `Sender verified: ${m.from} via ${m.source}` },
    { t: 0.36, step: `Classified as ${m.category} · ${m.priority}; summary written` },
    { t: 0.57, step: `Next step drafted: ${m.suggestion.split(",")[0].replace(/\.$/, "")}` },
    { t: 0.69, step: m.priority === "low" ? "Auto-handled (read-only action, no approval needed)" : "Held at human approval gate" },
  ];
}

function isTypingTarget(el: EventTarget | null) {
  const n = el as HTMLElement | null;
  if (!n) return false;
  const tag = n.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || n.isContentEditable;
}

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
  // Command-center polish: review modal, ⌘K palette, keyboard focus, undo toast, breaker + trace toggles.
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState<number>(-1);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [undoLeft, setUndoLeft] = useState(UNDO_MS);
  const [hubspotRecovered, setHubspotRecovered] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [crisisInjected, setCrisisInjected] = useState(false);
  const finishTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  const addLog = useCallback(
    (actor: LogEntry["actor"], text: string) =>
      setLog((l) => [{ id: `l${Date.now()}${Math.random()}`, time: nowTime(), actor, text }, ...l].slice(0, 12)),
    [],
  );

  // ---- Undo toast (10 s). Only one pending undo at a time; a new action replaces the previous one. ----
  const offerUndo = useCallback((label: string, run: () => void) => {
    setUndo({ id: Date.now(), label, run, expiresAt: Date.now() + UNDO_MS });
    setUndoLeft(UNDO_MS);
  }, []);
  useEffect(() => {
    if (!undo) return;
    const t = setInterval(() => {
      const left = undo.expiresAt - Date.now();
      if (left <= 0) setUndo(null);
      else setUndoLeft(left);
    }, 100);
    return () => clearInterval(t);
  }, [undo]);
  const runUndo = useCallback(() => {
    if (!undo) return;
    undo.run();
    addLog("human", `Undo: ${undo.label}`);
    setUndo(null);
  }, [undo, addLog]);

  // ---- HubSpot circuit breaker: derived from the live latency card, cleared by the recovery simulation. ----
  const hubspot = services.find((s) => s.id === "hubspot");
  const breakerActive = !hubspotRecovered && (hubspot?.latencyMs ?? 0) > BREAKER_THRESHOLD_MS;
  const shownServices = useMemo(
    () => (hubspotRecovered ? services.map((s) => (s.id === "hubspot" ? { ...s, state: "operational" as const, latencyMs: 236 + Math.round(Math.random() * 40) } : s)) : services),
    [services, hubspotRecovered],
  );
  const simulateRecovery = useCallback(() => {
    setHubspotRecovered(true);
    addLog("system", "HubSpot CRM latency back under 800 ms. Circuit breaker closed; CRM writes resumed.");
  }, [addLog]);

  const finishTask = useCallback(
    (id: string, title: string) => {
      const h = setTimeout(() => {
        finishTimers.current.delete(id);
        setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: "done" } : t)));
        addLog("jarvis", `Completed: ${title}.`);
      }, 2200);
      finishTimers.current.set(id, h);
    },
    [addLog],
  );
  const cancelFinish = (id: string) => {
    const h = finishTimers.current.get(id);
    if (h) clearTimeout(h);
    finishTimers.current.delete(id);
  };

  /** The one code path that "executes" a reviewed task. `editedDraft` is non-null when the human changed the message. */
  const executeTask = useCallback(
    (task: Task, editedDraft: string | null, via: "review" | "keyboard") => {
      if (/hubspot/i.test(task.tool) && breakerActive) {
        addLog("system", `Held: ${task.title} — HubSpot circuit breaker is open (latency > ${BREAKER_THRESHOLD_MS} ms).`);
        return;
      }
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: "running", draft: t.draft && editedDraft !== null ? { ...t.draft, body: editedDraft } : t.draft } : t)));
      const edited = editedDraft !== null && task.draft && editedDraft !== task.draft.body;
      addLog("human", `Approved${via === "keyboard" ? " (A)" : ""}: ${task.title}.${edited ? " Draft edited before sending." : ""}`);
      if (task.payload) addLog("jarvis", `${task.payload.method} ${task.payload.endpoint} → 200 OK (simulated).`);
      finishTask(task.id, task.title);
      offerUndo(`approval of "${task.title}"`, () => {
        cancelFinish(task.id);
        setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: "needs_approval" } : t)));
      });
    },
    [addLog, breakerActive, finishTask, offerUndo],
  );

  /** Clicking Approve opens the side-by-side review; keyboard "A" approves directly (undo covers it). */
  const approve = (task: Task) => setReviewTask(task);

  const reject = useCallback(
    (task: Task, via: "click" | "keyboard" = "click") => {
      const index = tasks.findIndex((t) => t.id === task.id);
      setTasks((ts) => ts.filter((t) => t.id !== task.id));
      addLog("human", `Rejected${via === "keyboard" ? " (R)" : ""}: ${task.title}.`);
      offerUndo(`rejection of "${task.title}"`, () =>
        setTasks((ts) => {
          const copy = ts.filter((t) => t.id !== task.id);
          copy.splice(Math.min(Math.max(index, 0), copy.length), 0, task);
          return copy;
        }),
      );
    },
    [tasks, addLog, offerUndo],
  );

  const runNow = useCallback(
    (task: Task) => {
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: "running" } : t)));
      addLog("jarvis", `Started: ${task.title}.`);
      finishTask(task.id, task.title);
    },
    [addLog, finishTask],
  );

  const removeInbox = useCallback(
    (item: InboxItem, logText: string, undoLabel: string) => {
      const index = inbox.findIndex((x) => x.id === item.id);
      const rest = inbox.filter((x) => x.id !== item.id);
      setInbox(rest);
      addLog(logText.startsWith("Snoozed") ? "human" : "jarvis", logText);
      if (rest.length) setSelectedId(rest[Math.min(index, rest.length - 1)].id);
      offerUndo(undoLabel, () =>
        setInbox((xs) => {
          const copy = xs.filter((x) => x.id !== item.id);
          copy.splice(Math.min(Math.max(index, 0), copy.length), 0, item);
          return copy;
        }),
      );
    },
    [inbox, addLog, offerUndo],
  );
  const resolveMessage = (item: InboxItem) => removeInbox(item, `Handled "${item.subject}" from ${item.from}.`, `handling "${item.subject}"`);
  const snoozeMessage = (item: InboxItem) => removeInbox(item, `Snoozed "${item.subject}" for 1 hour.`, `snooze of "${item.subject}"`);

  const visible = useMemo(() => inbox.filter((i) => filter === "all" || i.priority === filter), [inbox, filter]);
  const selected = inbox.find((i) => i.id === selectedId) ?? visible[0];
  const urgent = inbox.filter((i) => i.priority === "urgent").length;
  const pending = tasks.filter((t) => t.status === "needs_approval").length + xQueue.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const healthy = shownServices.filter((s) => s.state === "operational").length;

  // Reset the trace toggle when a different message is selected.
  useEffect(() => setTraceOpen(false), [selectedId]);

  // ---- Keyboard triage: J/K walk inbox then decision-pending tasks; A approves, R rejects, U undoes. ----
  const focusList = useMemo<FocusTarget[]>(
    () => [...visible.map((item) => ({ kind: "inbox" as const, item })), ...tasks.filter((t) => t.status === "needs_approval").map((task) => ({ kind: "task" as const, task }))],
    [visible, tasks],
  );
  const focused = focusIdx >= 0 ? focusList[Math.min(focusIdx, focusList.length - 1)] : undefined;

  const injectCrisis = useCallback(() => {
    if (crisisInjected) {
      setSelectedId(CRISIS_INBOX.id);
      document.getElementById("inbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setCrisisInjected(true);
    setInbox((xs) => [CRISIS_INBOX, ...xs]);
    setTasks((ts) => [CRISIS_TASK, ...ts]);
    setSelectedId(CRISIS_INBOX.id);
    setFilter("all");
    setFocusIdx(0);
    addLog("system", "Incident detected: payment webhooks failing (38 unconfirmed orders). Escalated to urgent.");
    addLog("jarvis", "Drafted P1 incident + on-call page; held at approval gate.");
    document.getElementById("inbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [crisisInjected, addLog]);

  const approveAllLowRisk = useCallback(() => {
    const waiting = tasks.filter((t) => t.risk === "low" && (t.status === "needs_approval" || t.status === "queued"));
    if (!waiting.length) {
      addLog("system", "No low-risk work is waiting. Medium/high-risk tasks still need an explicit approval.");
      return;
    }
    waiting.forEach((t) => (t.status === "queued" ? runNow(t) : executeTask(t, null, "keyboard")));
    addLog("human", `Approved all low-risk (${waiting.length}). Higher-risk tasks left for review.`);
  }, [tasks, addLog, runNow, executeTask]);

  const toggleAutopilot = useCallback(() => {
    const turningOn = !autopilot;
    setAutopilot(turningOn);
    addLog("human", `Autopilot for low-risk tasks turned ${turningOn ? "on" : "off"}.`);
    // Autopilot only ever starts low-risk queued work; approvals still wait for a person.
    if (turningOn) tasks.filter((t) => t.status === "queued" && t.risk === "low").forEach(runNow);
  }, [autopilot, tasks, addLog, runNow]);

  const commands = useMemo<Command[]>(
    () => [
      { id: "crisis", label: "Simulate Incoming Crisis", hint: "injects an urgent payment incident into triage + task queue", run: injectCrisis },
      { id: "urgent", label: filter === "urgent" ? "Show All Messages" : "Filter Urgent Only", hint: "inbox triage filter", run: () => setFilter((f) => (f === "urgent" ? "all" : "urgent")) },
      { id: "lowrisk", label: "Approve All Low-Risk", hint: "runs low-risk work; medium/high still wait", run: approveAllLowRisk },
      { id: "blueprint", label: "Jump to Blueprint Generator", hint: "free 3-step architecture + ROI estimate", run: () => document.getElementById("blueprint")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
      ...(breakerActive ? [{ id: "recover", label: "Simulate HubSpot Latency Recovery", hint: "closes the circuit breaker, resumes CRM writes", run: simulateRecovery }] : []),
      { id: "autopilot", label: autopilot ? "Turn Autopilot Off" : "Turn Autopilot On", hint: "low-risk queued work only", run: toggleAutopilot },
      { id: "top", label: "Back to Overview", run: () => document.getElementById("top")?.scrollIntoView({ behavior: "smooth" }) },
    ],
    [injectCrisis, filter, approveAllLowRisk, breakerActive, simulateRecovery, autopilot, toggleAutopilot],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (paletteOpen || reviewTask || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const moveTo = (next: number) => {
        const tgt = focusList[next];
        if (!tgt) return next;
        const id = tgt.kind === "inbox" ? tgt.item.id : tgt.task.id;
        if (tgt.kind === "inbox") setSelectedId(id);
        document.getElementById(`focus-${tgt.kind}-${id}`)?.scrollIntoView({ block: "nearest" });
        return next;
      };
      if (k === "j" || k === "arrowdown") {
        e.preventDefault();
        setFocusIdx((i) => moveTo(Math.min(i + 1, focusList.length - 1)));
      } else if (k === "k" || k === "arrowup") {
        e.preventDefault();
        setFocusIdx((i) => moveTo(Math.max(i - 1, 0)));
      } else if (k === "a" && focused) {
        e.preventDefault();
        if (focused.kind === "task") executeTask(focused.task, null, "keyboard");
        else resolveMessage(focused.item);
      } else if (k === "r" && focused) {
        e.preventDefault();
        if (focused.kind === "task") reject(focused.task, "keyboard");
        else snoozeMessage(focused.item);
      } else if (k === "u") {
        runUndo();
      } else if (k === "escape") {
        setFocusIdx(-1);
        setUndo(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const focusedId = focused ? (focused.kind === "inbox" ? focused.item.id : focused.task.id) : null;
  const focusRing = (kind: FocusTarget["kind"], id: string) =>
    focused?.kind === kind && focusedId === id ? "ring-1 ring-inset ring-signal/60 bg-signal/[0.04]" : "";

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
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 rounded-full bg-ink-800 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-ink-600 transition hover:bg-ink-700 hover:text-white"
                title="Command palette"
              >
                <span>Commands</span>
                <kbd className="rounded border border-ink-600 px-1 font-mono text-[10px] text-slate-400">⌘K</kbd>
              </button>
              <button
                onClick={toggleAutopilot}
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
              {shownServices.map((s) => {
                const st = STATE_STYLE[s.state];
                const isBreaker = s.id === "hubspot" && breakerActive;
                return (
                  <div key={s.id} className={`rounded-xl border bg-ink-900 p-3 ${isBreaker ? "border-amber-500/40" : "border-ink-700"}`} title={isBreaker ? "Circuit breaker open: CRM writes paused" : undefined}>
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
                    <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span>{s.uptime}</span>
                      {isBreaker && (
                        <button onClick={simulateRecovery} className="text-amber-300/90 hover:text-amber-200" title="Simulate latency recovery">
                          breaker open
                        </button>
                      )}
                    </div>
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
                  {visible.map((m, i) => (
                    <li key={m.id} id={`focus-inbox-${m.id}`}>
                      <button
                        onClick={() => {
                          setSelectedId(m.id);
                          setFocusIdx(i);
                        }}
                        className={`block w-full px-4 py-3 text-left transition ${
                          selected?.id === m.id ? "bg-ink-800" : "hover:bg-ink-850"
                        } ${focusRing("inbox", m.id)}`}
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

                      {/* Agent reasoning trace */}
                      <button
                        onClick={() => setTraceOpen((o) => !o)}
                        aria-expanded={traceOpen}
                        className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200"
                      >
                        <span className={`inline-block transition-transform ${traceOpen ? "rotate-90" : ""}`}>▸</span>
                        {traceOpen ? "Hide" : "View"} Agent Reasoning Trace
                        <span className="font-mono text-[10px] text-slate-600">
                          {(selected.trace ?? defaultTrace(selected)).length} steps · {(selected.trace ?? defaultTrace(selected)).at(-1)?.t.toFixed(2)}s
                        </span>
                      </button>
                      {traceOpen && (
                        <ol className="mt-2 space-y-1.5 rounded-lg border border-ink-700 bg-ink-950 p-3">
                          {(selected.trace ?? defaultTrace(selected)).map((s, i, arr) => (
                            <li key={i} className="flex gap-3 text-[12px]">
                              <span className="w-12 shrink-0 font-mono tabular-nums text-signal">{s.t.toFixed(2)}s</span>
                              <span className={i === arr.length - 1 ? "text-amber-200" : "text-slate-300"}>
                                {s.step}
                                {i < arr.length - 1 && <span className="ml-1 text-slate-600">→</span>}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => resolveMessage(selected)}
                          className="rounded-md bg-signal px-3 py-1.5 text-xs font-semibold text-ink-950 hover:bg-signal-dim"
                        >
                          Do it
                        </button>
                        <button
                          onClick={() => snoozeMessage(selected)}
                          className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-ink-800"
                        >
                          Snooze 1h
                        </button>
                        <span className="ml-auto hidden font-mono text-[10px] text-slate-600 sm:inline">J/K · A · R · U</span>
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
            {breakerActive && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-2 text-xs text-amber-200">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 pulse-dot" />
                  <span className="font-semibold">Circuit Breaker Active:</span> HubSpot CRM writes paused until latency &lt; {BREAKER_THRESHOLD_MS} ms
                  <span className="font-mono text-amber-300/70">(now {hubspot?.latencyMs} ms)</span>
                </span>
                <button onClick={simulateRecovery} className="rounded border border-amber-400/40 px-2 py-0.5 text-[11px] font-medium text-amber-100 hover:bg-amber-500/20">
                  Simulate latency recovery
                </button>
              </div>
            )}
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
                <li
                  key={t.id}
                  id={`focus-task-${t.id}`}
                  onClick={() => {
                    const i = focusList.findIndex((f) => f.kind === "task" && f.task.id === t.id);
                    if (i >= 0) setFocusIdx(i);
                  }}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition ${focusRing("task", t.id)}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">{t.title}</span>
                      {breakerActive && /hubspot/i.test(t.tool) && t.status !== "done" && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30" title={`HubSpot CRM writes paused until latency < ${BREAKER_THRESHOLD_MS} ms`}>
                          breaker · writes paused
                        </span>
                      )}
                    </div>
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

          <div className="mt-6">
            <BlueprintCapture />
          </div>

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

      {/* Overlays: review modal, ⌘K palette, undo toast */}
      {reviewTask && (
        <ExecutionDiffModal
          task={reviewTask}
          breakerActive={breakerActive}
          onCancel={() => setReviewTask(null)}
          onConfirm={(draft) => {
            executeTask(reviewTask, draft, "review");
            setReviewTask(null);
          }}
          onSimulateRecovery={simulateRecovery}
        />
      )}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      {undo && (
        <div className="fixed bottom-4 right-4 z-40 w-[320px] overflow-hidden rounded-xl border border-ink-600 bg-ink-900 shadow-2xl ring-1 ring-white/5" role="status">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 truncate text-xs text-slate-300">Done: {undo.label}</span>
            <button onClick={runUndo} className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20">
              Undo <kbd className="ml-1 font-mono text-[10px] text-slate-400">U</kbd>
            </button>
          </div>
          <div className="h-0.5 w-full bg-ink-700">
            <div className="h-full bg-signal transition-[width] duration-100 ease-linear" style={{ width: `${(undoLeft / UNDO_MS) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
