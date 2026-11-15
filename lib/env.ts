// Loads .env.local first (project secrets), then .env as fallback.
// Next.js does this natively for the web app; the standalone scripts
// (tg-bot, x-scout, x-post) need it done explicitly.
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
for (const name of [".env.local", ".env"]) {
  const p = resolve(root, name);
  if (existsSync(p)) config({ path: p, override: false });
}
