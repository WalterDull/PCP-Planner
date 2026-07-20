import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await db.plan.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      products: {
        include: { processSteps: { include: { hazards: true }, orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      sops: true,
    },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // facilityProfile is stored as a serialized JSON string (SQLite has no
  // native Json column type) — parse it back into an object for the client.
  return NextResponse.json({
    ...plan,
    facilityProfile: plan.facilityProfile ? JSON.parse(plan.facilityProfile) : null,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; status?: "DRAFT" | "HAZARD_ANALYSIS_COMPLETE" | "CCP_COMPLETE" | "FINALIZED" } = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.status === "string") data.status = body.status;

  const updated = await db.plan.update({ where: { id: owned.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.plan.delete({ where: { id: owned.id } });
  return NextResponse.json({ ok: true });
}
