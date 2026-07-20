import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string; sopId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sop = await db.sop.findFirst({ where: { id: params.sopId, planId: owned.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { content?: string; title?: string; isCustom?: boolean } = {};
  if (typeof body.content === "string") {
    data.content = body.content;
    data.isCustom = true;
  }
  if (typeof body.title === "string") data.title = body.title;

  const updated = await db.sop.update({ where: { id: sop.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string; sopId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sop = await db.sop.findFirst({ where: { id: params.sopId, planId: owned.id } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.sop.delete({ where: { id: sop.id } });
  return NextResponse.json({ ok: true });
}
