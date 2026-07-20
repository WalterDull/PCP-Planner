import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedProduct } from "@/lib/session";
import { db } from "@/lib/db";

const EDITABLE_FIELDS = [
  "name",
  "productDescription",
  "intendedUse",
  "intendedConsumer",
  "packagingType",
  "shelfLifeAndStorage",
  "order",
] as const;

export async function PATCH(req: Request, { params }: { params: { id: string; productId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await getOwnedProduct(params.id, params.productId, user.id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }

  const updated = await db.product.update({ where: { id: product.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string; productId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await getOwnedProduct(params.id, params.productId, user.id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.product.delete({ where: { id: product.id } });
  return NextResponse.json({ ok: true });
}
