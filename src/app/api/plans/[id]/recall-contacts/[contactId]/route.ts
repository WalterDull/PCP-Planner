import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

async function getOwnedContact(planId: string, contactId: string, userId: string) {
  const owned = await getOwnedPlan(planId, userId);
  if (!owned) return null;
  return db.recallContact.findFirst({ where: { id: contactId, planId: owned.id } });
}

export async function PATCH(req: Request, { params }: { params: { id: string; contactId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await getOwnedContact(params.id, params.contactId, user.id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { role?: string; name?: string; phone?: string | null; email?: string | null; order?: number } = {};
  if (typeof body.role === "string") data.role = body.role;
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.phone === "string" || body.phone === null) data.phone = body.phone;
  if (typeof body.email === "string" || body.email === null) data.email = body.email;
  if (typeof body.order === "number") data.order = body.order;

  const updated = await db.recallContact.update({ where: { id: contact.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string; contactId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contact = await getOwnedContact(params.id, params.contactId, user.id);
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.recallContact.delete({ where: { id: contact.id } });
  return NextResponse.json({ ok: true });
}
