import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const records = await db.mockRecallRecord.findMany({
    where: { planId: owned.id },
    orderBy: { performedAt: "desc" },
  });
  return NextResponse.json(records);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const performedAtRaw = typeof body.performedAt === "string" ? body.performedAt : null;
  const performedAt = performedAtRaw ? new Date(performedAtRaw) : new Date();
  if (Number.isNaN(performedAt.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const record = await db.mockRecallRecord.create({
    data: {
      planId: owned.id,
      performedAt,
      performedBy: typeof body.performedBy === "string" ? body.performedBy.trim() : undefined,
      percentTraced: typeof body.percentTraced === "string" ? body.percentTraced.trim() : undefined,
      resultsSummary: typeof body.resultsSummary === "string" ? body.resultsSummary.trim() : undefined,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
