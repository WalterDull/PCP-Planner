import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contacts = await db.recallContact.findMany({ where: { planId: owned.id }, orderBy: { order: "asc" } });
  return NextResponse.json(contacts);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "Recall Team Member";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const email = typeof body.email === "string" ? body.email.trim() : undefined;

  const count = await db.recallContact.count({ where: { planId: owned.id } });

  const contact = await db.recallContact.create({
    data: { planId: owned.id, role, name, phone, email, order: count },
  });

  return NextResponse.json(contact, { status: 201 });
}
