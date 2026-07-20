import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_RETENTION_DAYS } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "One-time fee to unlock export of your Preventive Control Plan, with an optional membership add-on for extended cloud storage. No forced subscription.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center text-3xl font-bold text-slate-900">Simple, one-time pricing</h1>
      <p className="mt-2 text-center text-slate-600">
        Build and edit your plan for free. Pay once to unlock export — no forced subscription.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Plan Unlock</h2>
          <p className="mt-1 text-3xl font-bold text-slate-900">One-time fee</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>• Unlimited edits while you build your plan, for free</li>
            <li>• Unlock export (formatted .docx) for a single completed plan</li>
            <li>• Data stored for {DEFAULT_RETENTION_DAYS} days after unlock, or download anytime</li>
            <li>• Delete your data whenever you want from account settings</li>
          </ul>
        </div>

        <div className="rounded-lg border border-brand-200 bg-brand-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Extended Storage (optional)</h2>
          <p className="mt-1 text-3xl font-bold text-slate-900">Membership add-on</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>• Keeps all your plans stored indefinitely, past the {DEFAULT_RETENTION_DAYS}-day window</li>
            <li>• Sync and revisit plans across sessions and devices</li>
            <li>• Cancel anytime — your plans revert to the standard retention window</li>
            <li>• You can always download a copy before storage expires</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/dashboard"
          className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          Go to your dashboard
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Checkout is powered by Stripe. Card details are handled entirely by Stripe and never
        touch our servers.
      </p>
    </main>
  );
}
