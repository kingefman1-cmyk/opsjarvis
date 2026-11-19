import { NextResponse } from "next/server";
import { alertFounder, blueprintHtml, generateBlueprint, isFreemail, isValidEmail, rateLimited, saveLead, sendEmail, type BlueprintLead } from "@/lib/leads/blueprint";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST { bottleneck, email, website? }  ->  { ok, blueprint, emailed }
 * Server-side only: validates, rate-limits, generates the 3-step blueprint via lib/llm.ts (primary provider -> Gemini -> Groq,
 * deterministic template when no key is configured), emails it via Resend when RESEND_API_KEY is set, stores the lead
 * (data/blueprint-leads.json where the filesystem is writable) and alerts the founder's Telegram Command Center.
 */
export async function POST(req: Request) {
  let body: { bottleneck?: string; email?: string; website?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true, blueprint: null }); // honeypot: bots fill hidden fields
  const bottleneck = String(body.bottleneck ?? "").replace(/\s+/g, " ").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (bottleneck.length < 12 || bottleneck.length > 400) return NextResponse.json({ ok: false, error: "Describe the bottleneck in one sentence (12–400 characters)." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "That email does not look valid." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(`ip:${ip}`, 5) || rateLimited(`email:${email}`, 2)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again in an hour or message us on Telegram." }, { status: 429 });
  }

  const { blueprint, engine } = await generateBlueprint(bottleneck);
  const lead: BlueprintLead & { engine: string } = {
    id: `bp${Date.now()}${Math.floor(Math.random() * 1e3)}`,
    email,
    bottleneck,
    blueprint,
    freemail: isFreemail(email),
    ip,
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 160),
    emailed: false,
    alerted: false,
    createdAt: new Date().toISOString(),
    engine,
  };

  const mail = await sendEmail(email, `Your AI architecture blueprint: ${blueprint.title}`, blueprintHtml(lead));
  lead.emailed = mail.ok;
  lead.alerted = await alertFounder(lead);
  const stored = saveLead(lead);
  // Operational breadcrumb only: no email address, no key material.
  console.log(`[blueprint] engine=${engine} tier=${blueprint.tier} emailed=${mail.ok}${mail.ok ? "" : ` (${mail.error})`} alerted=${lead.alerted} stored=${stored} telegram=${process.env.TELEGRAM_BOT_TOKEN ? "configured" : "missing"}/${process.env.TELEGRAM_CHAT_ID ? "chat-set" : "chat-missing"}`);

  return NextResponse.json({ ok: true, blueprint, emailed: mail.ok, emailNote: mail.ok ? undefined : "Email delivery is being set up; the blueprint is shown here and we will follow up personally." });
}
