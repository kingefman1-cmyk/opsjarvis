// All data in this file is fictional demo content for the OpsJarvis showcase.

export type ServiceState = "operational" | "degraded" | "down";

export type Service = {
  id: string;
  name: string;
  kind: string;
  state: ServiceState;
  latencyMs: number;
  jitter: number;
  uptime: string;
};

export const SERVICES: Service[] = [
  { id: "llm", name: "LLM provider", kind: "AI engine", state: "operational", latencyMs: 412, jitter: 38, uptime: "99.98%" },
  { id: "gmail", name: "Gmail", kind: "Email", state: "operational", latencyMs: 96, jitter: 12, uptime: "99.99%" },
  { id: "slack", name: "Slack", kind: "Chat", state: "operational", latencyMs: 74, jitter: 9, uptime: "99.97%" },
  { id: "telegram", name: "Telegram", kind: "Bot API", state: "operational", latencyMs: 88, jitter: 11, uptime: "99.99%" },
  { id: "hubspot", name: "HubSpot CRM", kind: "CRM", state: "degraded", latencyMs: 1180, jitter: 140, uptime: "99.21%" },
  { id: "stripe", name: "Stripe", kind: "Billing", state: "operational", latencyMs: 128, jitter: 15, uptime: "99.99%" },
  { id: "worker", name: "PM2 worker", kind: "Background jobs", state: "operational", latencyMs: 21, jitter: 3, uptime: "14d 6h up" },
];

export type Priority = "urgent" | "normal" | "low";

/** One line of the agent's reasoning trace: elapsed seconds since the message arrived + what the agent did. */
export type TraceStep = { t: number; step: string };

export type InboxItem = {
  id: string;
  source: "email" | "slack" | "telegram";
  from: string;
  channel: string;
  subject: string;
  preview: string;
  priority: Priority;
  category: string;
  summary: string;
  suggestion: string;
  minutesAgo: number;
  trace?: TraceStep[];
};

export const INBOX: InboxItem[] = [
  {
    id: "m1",
    source: "email",
    from: "Dana Whitfield",
    channel: "dana@northwind-supply.example",
    subject: "Invoice 4471 charged twice",
    preview: "Hi, we were billed twice for October. Can you refund the duplicate before Friday?",
    priority: "urgent",
    category: "Billing",
    summary: "Customer reports a duplicate charge on invoice 4471 and wants a refund by Friday.",
    suggestion: "Draft an apology, confirm the duplicate in Stripe, and queue a refund for approval.",
    minutesAgo: 4,
    trace: [
      { t: 0.18, step: "Sender verified: dana@northwind-supply.example matches HubSpot contact #2291" },
      { t: 0.44, step: "Duplicate charge matched in Stripe: ch_3Q…a1 and ch_3Q…b7, both $1,240.00 on invoice 4471" },
      { t: 0.61, step: "Policy check: refunds over $500 require a human approver" },
      { t: 0.79, step: "Held at human approval gate; apology draft prepared" },
    ],
  },
  {
    id: "m2",
    source: "slack",
    from: "Priya N.",
    channel: "#support-escalations",
    subject: "Checkout errors on mobile",
    preview: "Three customers in the last hour say the pay button does nothing on iOS Safari.",
    priority: "urgent",
    category: "Incident",
    summary: "Possible checkout outage on iOS Safari, three reports within one hour.",
    suggestion: "Open an incident ticket, page the on-call engineer, and post a holding reply.",
    minutesAgo: 11,
    trace: [
      { t: 0.12, step: "Channel verified: #support-escalations, poster is a support lead" },
      { t: 0.37, step: "Correlated 3 reports in 61 min; error rate on /checkout (iOS Safari) up 9×" },
      { t: 0.58, step: "Classified as Incident · urgent; drafted holding reply and incident ticket" },
      { t: 0.74, step: "Paging requires approval; held at gate" },
    ],
  },
  {
    id: "m7",
    source: "telegram",
    from: "Lena Hart",
    channel: "@lenahart · Hart & Rowe Studio",
    subject: "Can your bot send me a daily summary at 7am?",
    preview: "we're 6 people, half the day is lost reading threads. can OpsJarvis post a morning digest into our team group and ping me only on the urgent stuff?",
    priority: "normal",
    category: "Inbound lead",
    summary: "Prospect asks for a 7am Telegram digest to a team group plus urgent-only pings.",
    suggestion: "Reply with the Standard tier fit, propose a PM2-scheduled digest worker, and book a 15-minute call.",
    minutesAgo: 19,
    trace: [
      { t: 0.15, step: "New Telegram contact; no prior thread. Classified as Inbound lead" },
      { t: 0.41, step: "Scope matched: scheduled digest + urgent pings → Standard tier + PM2 worker" },
      { t: 0.66, step: "Reply drafted with pricing and a 15-minute call link; no write performed" },
    ],
  },
  {
    id: "m3",
    source: "email",
    from: "Marcus Bell",
    channel: "marcus@bellandco.example",
    subject: "Can we move Thursday's onboarding call?",
    preview: "Something came up on our side. Would Tuesday at 2pm work instead?",
    priority: "normal",
    category: "Scheduling",
    summary: "Client asks to move the onboarding call from Thursday to Tuesday 2pm.",
    suggestion: "Check the calendar, propose Tuesday 2pm, and update the CRM deal note.",
    minutesAgo: 27,
    trace: [
      { t: 0.14, step: "Sender verified: Bell & Co deal #8841 in HubSpot (stage: Proposal)" },
      { t: 0.39, step: "Calendar checked: Tuesday 14:00 is free for the account owner" },
      { t: 0.55, step: "Reply + CRM note drafted; stage change queued for approval" },
    ],
  },
  {
    id: "m4",
    source: "slack",
    from: "Tomás R.",
    channel: "#sales",
    subject: "Need the Q3 pricing sheet",
    preview: "Does anyone have the latest pricing PDF? Prospect is asking for it today.",
    priority: "normal",
    category: "Sales",
    summary: "Sales needs the current pricing sheet for a prospect today.",
    suggestion: "Reply with the link to the latest pricing sheet in the shared drive.",
    minutesAgo: 42,
  },
  {
    id: "m5",
    source: "email",
    from: "Lakeside Events",
    channel: "newsletter@lakeside-events.example",
    subject: "Your November venue guide",
    preview: "Ten new spaces for your next offsite, plus early-bird rates.",
    priority: "low",
    category: "Newsletter",
    summary: "Marketing newsletter, no action needed.",
    suggestion: "Archive and add the sender to the weekly digest.",
    minutesAgo: 58,
  },
  {
    id: "m6",
    source: "email",
    from: "Ines Okafor",
    channel: "ines@brightpath-dental.example",
    subject: "Renewal quote for 12 seats",
    preview: "We'd like to renew and add two seats. Could you send an updated quote?",
    priority: "normal",
    category: "Renewal",
    summary: "Existing customer wants to renew and expand from 10 to 12 seats.",
    suggestion: "Generate a 12-seat renewal quote and draft a reply for review.",
    minutesAgo: 73,
    trace: [
      { t: 0.16, step: "Sender verified: Brightpath Dental, active plan, 10 seats, renews in 23 days" },
      { t: 0.48, step: "Renewal pricing applied for 12 seats; quote PDF generated" },
      { t: 0.70, step: "Reply drafted; sending waits for approval" },
    ],
  },
];

export type TaskStatus = "needs_approval" | "queued" | "running" | "done";

/** The simulated outbound call a task would make, shown in the execution diff before anyone confirms. */
export type TaskPayload = { method: "POST" | "PATCH" | "PUT"; endpoint: string; body: Record<string, string | number | boolean> };
/** The customer-facing message a task would send, editable in the modal before execution. */
export type TaskDraft = { kind: "email" | "slack"; to: string; subject?: string; body: string };

export type Task = {
  id: string;
  title: string;
  detail: string;
  tool: string;
  risk: "low" | "medium" | "high";
  status: TaskStatus;
  steps: string[];
  payload?: TaskPayload;
  before?: Record<string, string>;
  after?: Record<string, string>;
  draft?: TaskDraft;
};

export const TASKS: Task[] = [
  {
    id: "t1",
    title: "Refund duplicate charge on invoice 4471",
    detail: "Northwind Supply, $1,240.00",
    tool: "Stripe",
    risk: "high",
    status: "needs_approval",
    steps: ["Match both charges to invoice 4471", "Create refund for the second charge", "Email receipt to customer"],
    payload: { method: "POST", endpoint: "/v1/refunds", body: { charge: "ch_3Q…b7", amount: 124000, currency: "usd", reason: "duplicate", invoice: "4471" } },
    before: { "Invoice 4471": "paid twice · $2,480.00 captured", "Refunds": "none", "Customer status": "waiting since 09:37" },
    after: { "Invoice 4471": "paid once · $1,240.00 captured", "Refunds": "re_… $1,240.00 (duplicate)", "Customer status": "receipt emailed" },
    draft: {
      kind: "email",
      to: "dana@northwind-supply.example",
      subject: "Re: Invoice 4471 charged twice — refund issued",
      body: "Hi Dana,\n\nYou're right, invoice 4471 was charged twice on our side. I've refunded the duplicate $1,240.00 to the original card; it should show within 5–10 business days depending on your bank.\n\nSorry for the hassle, and thank you for flagging it so quickly.\n\nBest,\nNorthwind account team",
    },
  },
  {
    id: "t2",
    title: "Update CRM deal stage for Bell & Co",
    detail: "Move to Onboarding, log the new call date",
    tool: "HubSpot CRM",
    risk: "medium",
    status: "needs_approval",
    steps: ["Set deal stage to Onboarding", "Write call note", "Notify account owner"],
    payload: { method: "PATCH", endpoint: "/crm/v3/objects/deals/8841", body: { dealstage: "onboarding", next_call: "2026-11-18T14:00:00-05:00", note: "Call moved from Thu to Tue 2pm at client's request" } },
    before: { "Deal stage": "Proposal", "Next call": "Thu 11:00", "Owner notified": "no" },
    after: { "Deal stage": "Onboarding", "Next call": "Tue 14:00", "Owner notified": "yes · #sales" },
    draft: {
      kind: "slack",
      to: "#sales",
      body: "Bell & Co moved to *Onboarding*. Kickoff call rescheduled to Tue 2:00pm at Marcus's request — calendar invite updated, deal note added. cc @account-owner",
    },
  },
  {
    id: "t3",
    title: "Build 12-seat renewal quote",
    detail: "Brightpath Dental",
    tool: "HubSpot CRM",
    risk: "low",
    status: "running",
    steps: ["Pull current plan and seat count", "Apply renewal pricing", "Attach PDF to deal"],
  },
  {
    id: "t4",
    title: "Daily revenue summary to #leadership",
    detail: "Scheduled 08:00 every weekday",
    tool: "PM2 worker",
    risk: "low",
    status: "queued",
    steps: ["Query yesterday's payments", "Summarise with AI", "Post to Slack"],
  },
  {
    id: "t5",
    title: "Archive 14 newsletters and build digest",
    detail: "Inbox cleanup",
    tool: "Gmail",
    risk: "low",
    status: "done",
    steps: ["Label as newsletter", "Archive", "Add to Friday digest"],
  },
];

export type LogEntry = { id: string; time: string; actor: "jarvis" | "human" | "system"; text: string };

export const ACTIVITY: LogEntry[] = [
  { id: "l1", time: "09:41", actor: "jarvis", text: "Classified 7 new messages: 2 urgent, 4 normal, 1 low." },
  { id: "l2", time: "09:40", actor: "system", text: "HubSpot CRM latency above 1,000 ms. Marked degraded." },
  { id: "l3", time: "09:38", actor: "jarvis", text: "Started renewal quote for Brightpath Dental." },
  { id: "l4", time: "09:31", actor: "human", text: "Approved: reschedule reply to Marcus Bell." },
  { id: "l5", time: "09:30", actor: "jarvis", text: "Drafted reschedule reply and held it for approval." },
  { id: "l6", time: "09:12", actor: "jarvis", text: "Archived 14 newsletters and updated the Friday digest." },
  { id: "l7", time: "08:00", actor: "system", text: "PM2 worker ran the daily revenue summary in 6.2 s." },
];

/** Injected by the "Simulate Incoming Crisis" command: one urgent incident message plus the task it spawns. */
export const CRISIS_INBOX: InboxItem = {
  id: "m-crisis",
  source: "slack",
  from: "Payments monitor",
  channel: "#incidents",
  subject: "Payment webhooks failing: 38 orders unconfirmed",
  preview: "Stripe webhook deliveries returning 502 for 9 minutes. 38 paid orders have no confirmation email and are stuck in 'pending'.",
  priority: "urgent",
  category: "Incident",
  summary: "Webhook endpoint is down; paid orders are not being confirmed, and customers are starting to write in.",
  suggestion: "Open a P1 incident, page on-call, pause the order-reminder emails, and queue a replay of the 38 webhook events once the endpoint is back.",
  minutesAgo: 0,
  trace: [
    { t: 0.09, step: "Source verified: monitor bot in #incidents (allow-listed)" },
    { t: 0.31, step: "Stripe events API: 38 checkout.session.completed events with delivery status failed" },
    { t: 0.52, step: "Blast radius: $4,912 in paid orders without confirmation; 3 customer emails already in inbox" },
    { t: 0.68, step: "Runbook matched: INC-PAY-02 (webhook outage). Paging + replay require approval" },
    { t: 0.83, step: "Held at human approval gate" },
  ],
};

export const CRISIS_TASK: Task = {
  id: "t-crisis",
  title: "Open P1 incident and page on-call for payment webhooks",
  detail: "38 unconfirmed orders · runbook INC-PAY-02",
  tool: "Slack",
  risk: "high",
  status: "needs_approval",
  steps: ["Create incident channel #inc-payment-webhooks", "Page on-call engineer", "Pause order-reminder emails", "Replay 38 failed webhook events"],
  payload: { method: "POST", endpoint: "/api/incidents", body: { severity: "P1", title: "Payment webhooks failing", runbook: "INC-PAY-02", page: "oncall-payments", replay_events: 38 } },
  before: { "Incident": "none open", "On-call": "not paged", "Order reminders": "sending", "Failed webhooks": "38 pending" },
  after: { "Incident": "INC-2211 · P1 open", "On-call": "paged (ack pending)", "Order reminders": "paused", "Failed webhooks": "replay queued" },
  draft: {
    kind: "slack",
    to: "#incidents",
    body: ":rotating_light: *P1 opened: payment webhooks failing* (INC-2211)\nSince 09:48 Stripe webhook deliveries return 502; 38 paid orders unconfirmed. On-call paged. Order-reminder emails paused so nobody gets a 'payment missing' notice. Replay of the 38 events is queued and will run once the endpoint is healthy.\nUpdates every 15 min in this thread.",
  },
};
