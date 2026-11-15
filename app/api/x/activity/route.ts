import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Activity log of approved/rejected actions (extension point). Empty in the open-core build. */
export async function GET() {
  return NextResponse.json({ enabled: false, items: [] });
}
