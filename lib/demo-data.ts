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
  { id: "claude", name: "Claude API", kind: "AI engine", state: "operational", latencyMs: 412, jitter: 38, uptime: "99.98%" },
  { id: "gmail", name: "Gmail", kind: "Email", state: "operational", latencyMs: 96, jitter: 12, uptime: "99.99%" },
  { id: "slack", name: "Slack", kind: "Chat", state: "operational", latencyMs: 74, jitter: 9, uptime: "99.97%" },
  { id: "telegram", name: "Telegram", kind: "Bot API", state: "operational", latencyMs: 88, jitter: 11, uptime: "99.99%" },
  { id: "hubspot", name: "HubSpot CRM", kind: "CRM", state: "degraded", latencyMs: 1180, jitter: 140, uptime: "99.21%" },
  { id: "stripe", name: "Stripe", kind: "Billing", state: "operational", latencyMs: 128, jitter: 15, uptime: "99.99%" },
  { id: "worker", name: "PM2 worker", kind: "Background jobs", state: "operational", latencyMs: 21, jitter: 3, uptime: "14d 6h up" },
];

export type Priority = "urgent" | "normal" | "low";

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
  },
];

export type TaskStatus = "needs_approval" | "queued" | "running" | "done";

export type Task = {
  id: string;
  title: string;
  detail: string;
  tool: string;
  risk: "low" | "medium" | "high";
  status: TaskStatus;
  steps: string[];
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
  },
  {
    id: "t2",
    title: "Update CRM deal stage for Bell & Co",
    detail: "Move to Onboarding, log the new call date",
    tool: "HubSpot CRM",
    risk: "medium",
    status: "needs_approval",
    steps: ["Set deal stage to Onboarding", "Write call note", "Notify account owner"],
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
    steps: ["Query yesterday's payments", "Summarise with Claude", "Post to Slack"],
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
