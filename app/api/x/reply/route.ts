import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The ONLY code path that would turn a queued draft into a real write (post, refund, CRM update).
 * body: { id: string, action: "approve" | "reject" | "regenerate", draft?: string }
 * The open-core build keeps this switched off: no connector is wired, so nothing can be executed.
 * Production builds enable it only on a locally-run instance (never on a public deployment) and
 * every action still requires a human click.
 */
export async function POST() {
  return NextResponse.json({ error: "Approval execution is disabled in this build. Wire a connector in lib/connectors/ and enable it per deployment." }, { status: 403 });
}
