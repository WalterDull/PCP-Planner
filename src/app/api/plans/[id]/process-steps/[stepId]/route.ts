import { NextResponse } from "next/server";

// Deprecated — see /api/plans/[id]/products/[productId]/process-steps/[stepId].
export async function PATCH() {
  return NextResponse.json({ error: "Deprecated route." }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Deprecated route." }, { status: 410 });
}
