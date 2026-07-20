import { NextResponse } from "next/server";

// Deprecated — see
// /api/plans/[id]/products/[productId]/process-steps/[stepId]/hazards.
export async function POST() {
  return NextResponse.json({ error: "Deprecated route." }, { status: 410 });
}
