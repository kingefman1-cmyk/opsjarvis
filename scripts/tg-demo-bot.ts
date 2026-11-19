/**
 * tg-demo-bot: the public OpsJarvis demo on Telegram.
 * Anyone can pick a scenario (or paste a message); the LLM triages it and shows Approve / Reject buttons
 * that only SIMULATE the action. 10 runs per user per day. Nothing here touches a real system.
 *
 *   npx tsx scripts/tg-demo-bot.ts            # long-polling
 *   npx tsx scripts/tg-demo-bot.ts --dry-run  # verifies the token + prints the welcome copy, no polling
 *
 * Needs TELEGRAM_BOT_TOKEN (from @BotFather) and one LLM key in .env.local. Live instance: https://t.me/OpsJarvisAI_bot
 */
import "../lib/env";
import { Bot, InlineKeyboard, type Context } from "grammy";
import { triage, demoAllowed, DEMO_LIMIT_PER_DAY, type Triage } from "../lib/tg/triage";

const DRY = process.argv.includes("--dry-run");
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEMO_URL = process.env.DEMO_URL ?? "https://opsjarvis.vercel.app";
const HIRE_URL = process.env.HIRE_URL ?? "https://www.fiverr.com/king12fx";

const log = (m: string) => console.log(`[tg-demo-bot ${new Date().toISOString()}] ${m}`);

const SCENARIOS: Record<string, { label: string; text: string; source: string }> = {
  stripe: {
    label: "Duplicate Stripe charge",
    source: "email from dana@northwind-supply.example",
    text: "Hi, we were billed twice for October (invoice 4471, $1,240). Can you refund the duplicate before Friday? Our finance team closes the books then.",
  },
  vip: {
    label: "Urgent VIP lead",
    source: "slack #sales",
    text: "Heads up: the COO of Brightpath Dental just replied to our proposal. They want a 12-seat plan and a call today before 4pm or they go with the other vendor.",
  },
  sched: {
    label: "Reschedule request",
    source: "telegram @marcus_bell",
    text: "Something came up on our side. Could we move Thursday's onboarding call to Tuesday at 2pm instead?",
  },
};

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
const dot: Record<Triage["priority"], string> = { urgent: "🔴", normal: "🔵", low: "⚪" };

function welcome() {
  return (
    `<b>OpsJarvis by Caelara Labs</b>\n\n` +
    `An AI-powered operations desk for small teams. It reads your inbox (email, Slack, Telegram), flags what is urgent, drafts the next step, and waits for a human to approve anything that writes to Stripe, HubSpot or a customer.\n\n` +
    `Try it: pick a scenario or paste any message your team might receive.\n\n` +
    `Live dashboard: ${DEMO_URL}\nWork with Caelara Labs: ${HIRE_URL}`
  );
}
function scenarioKeyboard() {
  const kb = new InlineKeyboard();
  Object.entries(SCENARIOS).forEach(([k, v]) => kb.text(v.label, `demo:${k}`).row());
  kb.text("Paste any sample message", "demo:paste");
  return kb;
}

async function runDemo(ctx: Context, text: string, source: string) {
  const uid = ctx.from?.id ?? 0;
  const lim = demoAllowed(uid);
  if (!lim.ok) {
    await ctx.reply(`You have used today's ${DEMO_LIMIT_PER_DAY} demo runs. The full dashboard is always open: ${DEMO_URL}`);
    return;
  }
  const thinking = await ctx.reply("Triaging…");
  const t = await triage(text, source);
  const kb = new InlineKeyboard().text(`Approve: ${t.action_label}`.slice(0, 60), `sim:approve`).text("Reject", `sim:reject`);
  await ctx.api.editMessageText(
    thinking.chat.id,
    thinking.message_id,
    `${dot[t.priority]} <b>${t.priority.toUpperCase()}</b> · ${esc(source)}\n\n<b>Summary:</b> ${esc(t.summary)}\n<b>Suggested next step:</b> ${esc(t.next_step)}\n<b>Tool:</b> ${esc(t.tool)}\n\n<i>Demo run ${lim.used}/${DEMO_LIMIT_PER_DAY}. Nothing here touches a real system.</i>`,
    { parse_mode: "HTML", reply_markup: kb }
  );
}

async function main() {
  if (!TOKEN) {
    log("TELEGRAM_BOT_TOKEN missing");
    if (DRY) {
      console.log(welcome());
      return;
    }
    process.exit(1);
  }
  const bot = new Bot(TOKEN);
  const me = await bot.api.getMe();
  log(`bot @${me.username} ok`);
  if (DRY) {
    console.log(welcome());
    return;
  }

  bot.command(["start", "demo"], async (ctx) => {
    await ctx.reply(welcome(), { parse_mode: "HTML", reply_markup: scenarioKeyboard(), link_preview_options: { is_disabled: true } });
  });
  bot.callbackQuery(/^demo:(\w+)$/, async (ctx) => {
    const k = ctx.match[1];
    await ctx.answerCallbackQuery();
    if (k === "paste") return ctx.reply("Paste any customer email, Slack message or Telegram text and I will triage it.");
    const s = SCENARIOS[k];
    if (s) await runDemo(ctx, s.text, s.source);
  });
  bot.callbackQuery(/^sim:(approve|reject)$/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: ctx.match[1] === "approve" ? "Simulated: action queued and logged." : "Simulated: rejected and logged." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(
      ctx.match[1] === "approve"
        ? `✅ Logged: <i>human approved · action executed by OpsJarvis (simulated)</i>\n\nIn a real build this is where Stripe / HubSpot / Gmail would be called server-side with your own keys.\n\nSee it live: ${DEMO_URL}`
        : `⛔ Logged: <i>human rejected · nothing executed</i>\n\nThat is the whole point: the model proposes, a person decides.\n\n${DEMO_URL}`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  });
  bot.on("message:text", async (ctx) => {
    await runDemo(ctx, ctx.message.text, `telegram @${ctx.from.username ?? ctx.from.first_name}`);
  });

  bot.catch((err) => log(`error: ${err.message}`));
  await bot.api.setMyCommands([
    { command: "start", description: "Try the OpsJarvis demo" },
    { command: "demo", description: "Pick a scenario to triage" },
  ]);
  log("polling…");
  await bot.start();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
