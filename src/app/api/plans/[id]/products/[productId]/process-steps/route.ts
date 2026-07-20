import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedProduct } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string; productId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await getOwnedProduct(params.id, params.productId, user.id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const steps = await db.processStep.findMany({
    where: { productId: product.id },
    include: { hazards: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(steps);
}

export async function POST(req: Request, { params }: { params: { id: string; productId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const product = await getOwnedProduct(params.id, params.productId, user.id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "New Step";
  const description = typeof body.description === "string" ? body.description : undefined;

  const count = await db.processStep.count({ where: { productId: product.id } });

  const step = await db.processStep.create({
    data: { productId: product.id, name, description, order: count + 1 },
  });

  return NextResponse.json(step, { status: 201 });
}
