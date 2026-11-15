import { NextResponse } from "next/server";
import { SERVICES } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

// Demo endpoint. In a real build each entry is a server-side health check
// that uses keys from .env.local; nothing secret reaches the browser.
export async function GET() {
  const now = Date.now();
  const services = SERVICES.map((s, i) => {
    const wobble = Math.round(Math.sin(now / 4000 + i * 1.7) * s.jitter);
    return { ...s, latencyMs: Math.max(20, s.latencyMs + wobble) };
  });
  return NextResponse.json({ checkedAt: new Date(now).toISOString(), services });
}
