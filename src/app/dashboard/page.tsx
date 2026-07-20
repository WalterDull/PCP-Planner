import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasActiveStorageSubscription } from "@/lib/entitlements";
import SignOutButton from "@/components/SignOutButton";
import CfiaResourceLinks from "@/components/CfiaResourceLinks";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  const plans = await db.plan.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  const subscribed = hasActiveStorageSubscription(user);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your plans</h1>
          <p className="text-sm text-slate-600">Signed in as {user.email}</p>
        </div>
        <SignOutButton />
      </div>

      {!subscribed && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Plans on the standard tier are retained for a limited window unless unlocked with
          extended storage. See{" "}
          <Link href="/pricing" className="font-medium underline">
            pricing
          </Link>
          .
        </p>
      )}

      <div className="mt-6">
        <Link
          href="/plans/new"
          className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Preventive Control Plan
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {plans.length === 0 && <p className="text-sm text-slate-500">No plans yet. Create your first one above.</p>}
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/plans/${plan.id}/facility`} className="font-semibold text-slate-900 hover:text-brand-600">
                  {plan.name}
                </Link>
                <p className="text-xs text-slate-500">
                  Status: {plan.status} · {plan.isPaid ? "Unlocked" : "Not yet unlocked"} · Last updated{" "}
                  {plan.updatedAt.toLocaleDateString()}
                </p>
              </div>
              <Link href={`/plans/${plan.id}/facility`} className="text-sm font-medium text-brand-600">
                Continue →
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <CfiaResourceLinks context="general" />
    </main>
  );
}
