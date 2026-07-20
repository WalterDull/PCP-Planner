import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedProduct } from "@/lib/session";
import { db } from "@/lib/db";

async function getOwnedStep(planId: string, productId: string, stepId: string, userId: string) {
  const product = await getOwnedProduct(planId, productId, userId);
  if (!product) return null;
  return db.processStep.findFirst({ where: { id: stepId, productId: product.id } });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; productId: string; stepId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const step = await getOwnedStep(params.id, params.productId, params.stepId, user.id);
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; description?: string; order?: number } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.description === "string") data.description = body.description;
  if (typeof body.order === "number") data.order = body.order;

  const updated = await db.processStep.update({ where: { id: step.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; productId: string; stepId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const step = await getOwnedStep(params.id, params.productId, params.stepId, user.id);
  if (!step) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.processStep.delete({ where: { id: step.id } });
  return NextResponse.json({ ok: true });
}
