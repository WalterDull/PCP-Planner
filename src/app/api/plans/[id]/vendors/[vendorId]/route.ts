import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

async function getOwnedVendor(planId: string, vendorId: string, userId: string) {
  const owned = await getOwnedPlan(planId, userId);
  if (!owned) return null;
  return db.vendor.findFirst({ where: { id: vendorId, planId: owned.id } });
}

export async function PATCH(req: Request, { params }: { params: { id: string; vendorId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getOwnedVendor(params.id, params.vendorId, user.id);
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  const strFields = [
    "name",
    "materialsSupplied",
    "contactName",
    "phone",
    "email",
    "certification",
    "status",
    "guaranteeExpiry",
    "approvalDate",
    "notes",
  ];
  for (const f of strFields) {
    if (typeof body[f] === "string" || body[f] === null) data[f] = body[f];
  }
  if (typeof body.guaranteeOnFile === "boolean") data.guaranteeOnFile = body.guaranteeOnFile;
  if (typeof body.order === "number") data.order = body.order;

  const updated = await db.vendor.update({ where: { id: vendor.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string; vendorId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await getOwnedVendor(params.id, params.vendorId, user.id);
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.vendor.delete({ where: { id: vendor.id } });
  return NextResponse.json({ ok: true });
}
