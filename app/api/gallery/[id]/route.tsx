import { ImageResponse } from "next/og";
import { INBOX, SERVICES, TASKS, ACTIVITY } from "@/lib/demo-data";

export const runtime = "edge";

const C = {
  bg: "#07090d", panel: "#0b0e14", line: "#1e2532", sub: "#151a24", text: "#e6eaf2",
  mute: "#94a3b8", dim: "#64748b", signal: "#5eead4", green: "#34d399", amber: "#fbbf24",
  rose: "#fb7185", sky: "#7dd3fc", indigo: "#a5b4fc", fuchsia: "#f0abfc",
};
const prio: Record<string, [string, string]> = {
  urgent: ["rgba(244,63,94,0.15)", C.rose], normal: ["rgba(14,165,233,0.15)", C.sky], low: ["rgba(100,116,139,0.15)", "#cbd5e1"],
};
const stateColor: Record<string, string> = { operational: C.green, degraded: C.amber, down: C.rose };
const riskColor: Record<string, string> = { low: C.green, medium: C.amber, high: C.rose };

function Panel({ title, right, children, style }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>{title}</div>
        {right ?? <div />}
      </div>
      {children}
    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 220, background: C.panel, borderRight: `1px solid ${C.line}`, padding: "20px 16px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.4)" }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: C.signal }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>OpsJarvis</div>
          <div style={{ color: C.mute, fontSize: 11 }}>AI operations desk</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 28, gap: 4 }}>
        {["Overview", "Inbox triage", "Task queue", "Integrations", "Activity"].map((n) => (
          <div key={n} style={{ display: "flex", padding: "8px 12px", borderRadius: 6, fontSize: 14, background: n === active ? C.line : "transparent", color: n === active ? "#fff" : C.mute }}>{n}</div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", padding: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: "#10141c", fontSize: 11, color: C.mute, lineHeight: 1.5 }}>
        <div style={{ color: "#e2e8f0", fontWeight: 500, marginBottom: 4 }}>Keys stay server-side</div>
        <div style={{ display: "flex", flexWrap: "wrap" }}>API keys live in .env.local and are read only by server routes.</div>
      </div>
    </div>
  );
}

function Kpis() {
  const items = [["URGENT MESSAGES", "2", "6 in inbox"], ["AWAITING APPROVAL", "2", "human-in-the-loop"], ["TASKS COMPLETED", "38", "today"], ["INTEGRATIONS HEALTHY", "5/6", "live checks"]];
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {items.map(([l, v, h]) => (
        <div key={l} style={{ display: "flex", flexDirection: "column", flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
          <div style={{ color: C.mute, fontSize: 11, letterSpacing: 1 }}>{l}</div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 600, marginTop: 6 }}>{v}</div>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{h}</div>
        </div>
      ))}
    </div>
  );
}

function Status() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 500 }}>Live API status</div>
      <div style={{ display: "flex", gap: 12 }}>
        {SERVICES.map((s) => (
          <div key={s.id} style={{ display: "flex", flexDirection: "column", flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{s.name}</div>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: stateColor[s.state] }} />
            </div>
            <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{s.kind}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ color: stateColor[s.state], fontSize: 12, fontWeight: 500 }}>{s.state[0].toUpperCase() + s.state.slice(1)}</div>
              <div style={{ color: C.mute, fontSize: 11 }}>{`${s.latencyMs} ms`}</div>
            </div>
            <div style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>{s.uptime}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Inbox({ rows, tall }: { rows: number; tall?: boolean }) {
  const sel = INBOX[0];
  return (
    <Panel title="Inbox triage" style={{ flex: 3 }} right={
      <div style={{ display: "flex", gap: 4, fontSize: 12 }}>
        {["All", "Urgent", "Normal", "Low"].map((f, i) => <div key={f} style={{ display: "flex", padding: "4px 10px", borderRadius: 6, background: i === 0 ? "#2a3344" : "transparent", color: i === 0 ? "#fff" : C.mute }}>{f}</div>)}
      </div>}>
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, borderRight: `1px solid ${C.line}` }}>
          {INBOX.slice(0, rows).map((m, i) => (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", padding: "12px 16px", flexShrink: 0, borderBottom: `1px solid ${C.line}`, background: i === 0 ? "#151a24" : "transparent" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.mute }}>
                  <div style={{ display: "flex", padding: "2px 6px", borderRadius: 4, fontSize: 10, background: m.source === "email" ? "rgba(99,102,241,0.15)" : "rgba(217,70,239,0.15)", color: m.source === "email" ? C.indigo : C.fuchsia }}>{m.source.toUpperCase()}</div>
                  <div>{m.from}</div>
                </div>
                <div style={{ fontSize: 10, color: C.dim }}>{`${m.minutesAgo}m`}</div>
              </div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 500, marginTop: 4 }}>{m.subject}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <div style={{ display: "flex", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 500, background: prio[m.priority][0], color: prio[m.priority][1], border: `1px solid ${prio[m.priority][1]}55` }}>{m.priority.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{m.category}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: C.dim }}>{sel.channel}</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginTop: 4 }}>{sel.subject}</div>
          <div style={{ display: "flex", marginTop: 8, padding: 12, borderRadius: 10, background: "#10141c", color: "#cbd5e1", fontSize: 14, lineHeight: 1.5 }}>{sel.preview}</div>
          <div style={{ color: C.signal, fontSize: 11, letterSpacing: 1, marginTop: 12 }}>SUMMARY</div>
          <div style={{ color: "#cbd5e1", fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>{sel.summary}</div>
          <div style={{ color: C.signal, fontSize: 11, letterSpacing: 1, marginTop: 12 }}>SUGGESTED NEXT STEP</div>
          <div style={{ color: "#cbd5e1", fontSize: 14, marginTop: 4, lineHeight: 1.45 }}>{sel.suggestion}</div>
          {tall && (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <div style={{ display: "flex", padding: "6px 12px", borderRadius: 6, background: C.signal, color: C.bg, fontSize: 12, fontWeight: 600 }}>Do it</div>
              <div style={{ display: "flex", padding: "6px 12px", borderRadius: 6, border: `1px solid #2a3344`, color: "#cbd5e1", fontSize: 12 }}>Snooze 1h</div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Activity({ rows }: { rows: number }) {
  const col: Record<string, string> = { jarvis: C.signal, human: C.sky, system: C.amber };
  return (
    <Panel title="Activity log" style={{ flex: 2 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        {ACTIVITY.slice(0, rows).map((e) => (
          <div key={e.id} style={{ display: "flex", gap: 12, fontSize: 14, flexShrink: 0 }}>
            <div style={{ display: "flex", width: 40, fontSize: 11, color: C.dim }}>{e.time}</div>
            <div style={{ display: "flex", width: 56, fontSize: 10, letterSpacing: 1, color: col[e.actor] }}>{e.actor.toUpperCase()}</div>
            <div style={{ display: "flex", flex: 1, color: "#cbd5e1", lineHeight: 1.4 }}>{e.text}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Tasks({ approvedFirst }: { approvedFirst?: boolean }) {
  return (
    <Panel title="Task queue" right={<div style={{ fontSize: 12, color: C.dim }}>High-risk steps always wait for a person</div>}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {TASKS.map((t, i) => {
          const status = approvedFirst && i === 0 ? "running" : t.status;
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < TASKS.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{t.title}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.dim, marginTop: 2 }}>
                  <div>{t.detail}</div><div>{t.tool}</div><div style={{ color: riskColor[t.risk] }}>{`${t.risk} risk`}</div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {t.steps.map((s, j) => <div key={s} style={{ display: "flex", padding: "2px 6px", borderRadius: 4, background: "#151a24", fontSize: 10, color: C.mute }}>{`${j + 1}. ${s}`}</div>)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {status === "needs_approval" && (<>
                  <div style={{ display: "flex", padding: "6px 12px", borderRadius: 6, background: C.signal, color: C.bg, fontSize: 12, fontWeight: 600 }}>Approve</div>
                  <div style={{ display: "flex", padding: "6px 12px", borderRadius: 6, border: "1px solid #2a3344", color: "#cbd5e1", fontSize: 12 }}>Reject</div>
                </>)}
                {status === "queued" && <div style={{ display: "flex", padding: "6px 12px", borderRadius: 6, border: "1px solid #2a3344", color: "#cbd5e1", fontSize: 12 }}>Run now</div>}
                {status === "running" && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "rgba(14,165,233,0.1)", color: C.sky, fontSize: 12 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: C.sky }} />Running</div>}
                {status === "done" && <div style={{ display: "flex", padding: "6px 12px", borderRadius: 6, background: "rgba(16,185,129,0.1)", color: C.green, fontSize: 12 }}>Done</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 600 }}>Good morning. Here is your desk.</div>
        <div style={{ color: C.mute, fontSize: 14, marginTop: 2 }}>Demo workspace with sample data. Nothing here sends real messages.</div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", padding: "4px 12px", borderRadius: 999, border: "1px solid #2a3344", color: C.mute, fontSize: 11 }}>Status checked 09:41</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, background: "#151a24", border: "1px solid #2a3344", color: "#cbd5e1", fontSize: 12, fontWeight: 500 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: "#64748b" }} />Autopilot off</div>
      </div>
    </div>
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let main: any;
  if (id === "2") {
    main = (<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Header />
      <div style={{ display: "flex", gap: 20, height: 640 }}><Inbox rows={5} tall /><Activity rows={8} /></div>
    </div>);
  } else if (id === "3") {
    main = (<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Header />
      <Kpis />
      <Tasks approvedFirst />
    </div>);
  } else {
    main = (<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Header />
      <Kpis />
      <Status />
      <div style={{ display: "flex", gap: 20, height: 372 }}><Inbox rows={3} /><Activity rows={5} /></div>
    </div>);
  }
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg, color: C.text, fontFamily: "sans-serif", overflow: "hidden" }}>
        <Sidebar active={id === "2" ? "Inbox triage" : id === "3" ? "Task queue" : "Overview"} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 28px" }}>{main}</div>
      </div>
    ),
    { width: 1280, height: 769, headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } }
  );
}
