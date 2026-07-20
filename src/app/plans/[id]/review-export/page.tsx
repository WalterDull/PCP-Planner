"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Hazard {
  id: string;
  description: string;
  ccpStatus: string;
  requiresPreventiveControl: boolean;
}
interface ProcessStep {
  id: string;
  name: string;
  hazards: Hazard[];
}
interface Product {
  id: string;
  name: string;
  processSteps: ProcessStep[];
}
interface Plan {
  id: string;
  name: string;
  isPaid: boolean;
  products: Product[];
  sops: { id: string }[];
}

export default function ReviewExportPage({ params }: { params: { id: string } }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [devModeAvailable, setDevModeAvailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/plans/${params.id}`);
    setPlan(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function unlockViaStripe() {
    setUnlocking(true);
    setMessage(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "plan_unlock", planId: params.id }),
    });
    if (res.status === 501) {
      setDevModeAvailable(true);
      setMessage("Billing isn't configured in this environment yet.");
      setUnlocking(false);
      return;
    }
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setUnlocking(false);
  }

  async function unlockViaDev() {
    setUnlocking(true);
    await fetch("/api/billing/checkout-dev-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: params.id }),
    });
    await refresh();
    setUnlocking(false);
  }

  async function downloadDocx() {
    const res = await fetch(`/api/plans/${params.id}/export`);
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan?.name ?? "preventive-control-plan"}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !plan) return <p className="text-sm text-slate-500">Loading…</p>;

  const allSteps = plan.products.flatMap((p) => p.processSteps);
  const allHazards = allSteps.flatMap((s) => s.hazards);
  const ccpCount = allHazards.filter((h) => h.ccpStatus === "CCP" || h.ccpStatus === "PRW").length;
  const pendingControls = allHazards.filter(
    (h) => h.requiresPreventiveControl && h.ccpStatus === "NOT_EVALUATED"
  ).length;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 10: Review & Export</h1>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{plan.products.length}</p>
          <p className="text-xs text-slate-500">Products</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{allSteps.length}</p>
          <p className="text-xs text-slate-500">Process steps</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{ccpCount}</p>
          <p className="text-xs text-slate-500">Critical control points</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">{plan.sops.length}</p>
          <p className="text-xs text-slate-500">Docs drafted</p>
        </div>
      </div>

      {plan.products.length === 0 && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You haven&apos;t added any products yet. Go back to{" "}
          <Link href={`/plans/${params.id}/products`} className="font-medium underline">
            Products
          </Link>{" "}
          to add at least one before finalizing this plan.
        </p>
      )}

      {pendingControls > 0 && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {pendingControls} hazard(s) still need a CCP determination. Go back to{" "}
          <Link href={`/plans/${params.id}/ccp-determination`} className="font-medium underline">
            CCP Determination
          </Link>{" "}
          to finish.
        </p>
      )}

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Export your plan</h2>
        {plan.isPaid ? (
          <>
            <p className="mt-1 text-sm text-slate-600">This plan is unlocked. Download it as a formatted Word document.</p>
            <button
              onClick={downloadDocx}
              className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Download .docx
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">
              Unlock this plan with a one-time fee to download a formatted, audit-ready Word
              document.
            </p>
            <button
              onClick={unlockViaStripe}
              disabled={unlocking}
              className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {unlocking ? "Redirecting…" : "Unlock this plan"}
            </button>
            {devModeAvailable && (
              <button
                onClick={unlockViaDev}
                className="mt-3 ml-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                (Dev mode) Simulate unlock
              </button>
            )}
            {message && <p className="mt-2 text-sm text-slate-500">{message}</p>}
          </>
        )}
      </div>

      <div className="mt-8">
        <Link href={`/plans/${params.id}/sops`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
      </div>
    </div>
  );
}
