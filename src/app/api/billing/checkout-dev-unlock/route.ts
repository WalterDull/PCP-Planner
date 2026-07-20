import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";
import { STRIPE_ENABLED } from "@/lib/stripe";

/**
 * DEVELOPMENT-ONLY convenience route that simulates a successful purchase
 * without talking to Stripe, so the full wizard → unlock → export flow can
 * be tested locally before billing credentials exist.
 *
 * This route refuses to run once STRIPE_SECRET_KEY is set (i.e. in any
 * environment configured for real billing) — remove it entirely before
 * shipping to production if you want extra safety.
 */
export async function POST(req: Request) {
  if (STRIPE_ENABLED || process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev unlock is disabled once billing is configured." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = await getOwnedPlan(body.planId, user.id);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const updated = await db.plan.update({
    where: { id: plan.id },
    data: { isPaid: true, paidAt: new Date() },
  });

  return NextResponse.json(updated);
}
