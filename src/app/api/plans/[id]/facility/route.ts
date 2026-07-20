import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const facilityProfile = await req.json().catch(() => null);
  if (!facilityProfile || typeof facilityProfile !== "object") {
    return NextResponse.json({ error: "Invalid facility profile" }, { status: 400 });
  }

  // SQLite has no native Json column type, so facilityProfile is stored as
  // a serialized JSON string and parsed back on the way out.
  const updated = await db.plan.update({
    where: { id: owned.id },
    data: { facilityProfile: JSON.stringify(facilityProfile) },
  });

  return NextResponse.json({ ...updated, facilityProfile });
}
