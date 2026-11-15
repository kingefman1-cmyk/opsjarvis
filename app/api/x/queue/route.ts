import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Human-approval queue (extension point).
 * The open-core build ships with no outbound connectors, so the queue is empty and `enabled` is false.
 * In a production build this returns drafted actions (replies, refunds, CRM updates) waiting for a person.
 */
export async function GET() {
  return NextResponse.json({ enabled: false, items: [] });
}
