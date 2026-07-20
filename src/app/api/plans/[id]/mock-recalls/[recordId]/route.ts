import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: { id: string; recordId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const record = await db.mockRecallRecord.findFirst({ where: { id: params.recordId, planId: owned.id } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.mockRecallRecord.delete({ where: { id: record.id } });
  return NextResponse.json({ ok: true });
}
