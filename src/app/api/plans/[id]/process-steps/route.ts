import { NextResponse } from "next/server";

// Deprecated: process steps are now scoped to a product (a Plan can have
// multiple products). Use /api/plans/[id]/products/[productId]/process-steps
// instead. This stub is kept only so the old file path doesn't leave a
// dangling reference to a removed Prisma field in the build; it can be
// deleted entirely.
export async function GET() {
  return NextResponse.json(
    { error: "Deprecated route. Use /api/plans/[id]/products/[productId]/process-steps instead." },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Deprecated route. Use /api/plans/[id]/products/[productId]/process-steps instead." },
    { status: 410 }
  );
}
