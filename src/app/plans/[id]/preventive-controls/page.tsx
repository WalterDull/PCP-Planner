"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductSelector, { type ProductLite } from "@/components/ProductSelector";
import CfiaResourceLinks from "@/components/CfiaResourceLinks";

interface Hazard {
  id: string;
  type: string;
  description: string;
  ccpStatus: string;
  criticalLimit: string | null;
  monitoringProcedure: string | null;
  monitoringFrequency: string | null;
  correctionAction: string | null;
  verificationProcedure: string | null;
  recordkeepingProcedure: string | null;
  responsibleParty: string | null;
}

interface ProcessStep {
  id: string;
  order: number;
  name: string;
  hazards: Hazard[];
}

const CONTROL_FIELDS: { key: keyof Hazard; label: string; help: string }[] = [
  { key: "criticalLimit", label: "Critical limit", help: "The measurable value that must be met (e.g. \"internal temp ≥ 74°C for 15 seconds\")." },
  { key: "monitoringProcedure", label: "Monitoring procedure", help: "How and by whom the critical limit is checked." },
  { key: "monitoringFrequency", label: "Monitoring frequency", help: "e.g. \"every batch\", \"every 2 hours\"." },
  { key: "correctionAction", label: "Corrective action", help: "What happens if the critical limit is not met." },
  { key: "verificationProcedure", label: "Verification procedure", help: "How you confirm monitoring is happening correctly (e.g. supervisor review, calibration checks)." },
  { key: "recordkeepingProcedure", label: "Recordkeeping", help: "What records are kept and where." },
  { key: "responsibleParty", label: "Responsible party", help: "Who owns this control day-to-day." },
];

export default function PreventiveControlsPage({ params }: { params: { id: string } }) {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/plans/${params.id}/products`)
      .then((r) => r.json())
      .then((data: ProductLite[]) => {
        setProducts(data);
        if (data.length > 0) setSelectedProductId(data[0].id);
        else setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function refresh(productId: string) {
    setLoading(true);
    const res = await fetch(`/api/plans/${params.id}/products/${productId}/process-steps`);
    setSteps(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (selectedProductId) refresh(selectedProductId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  async function updateHazard(stepId: string, hazardId: string, data: Partial<Hazard>) {
    if (!selectedProductId) return;
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, hazards: s.hazards.map((h) => (h.id === hazardId ? { ...h, ...data } : h)) }
          : s
      )
    );
    await fetch(
      `/api/plans/${params.id}/products/${selectedProductId}/process-steps/${stepId}/hazards/${hazardId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
  }

  const controlSteps = steps
    .map((s) => ({ ...s, hazards: s.hazards.filter((h) => h.ccpStatus === "CCP" || h.ccpStatus === "PRW") }))
    .filter((s) => s.hazards.length > 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 8: Preventive Controls</h1>
      <p className="mt-1 text-sm text-slate-600">
        For every point your decision tree flagged as a CCP, define exactly how it&apos;s controlled
        day to day: the limit, how you check it, what you do if it fails, and who&apos;s responsible.
      </p>

      <CfiaResourceLinks context="preventive-controls" />

      <div className="mt-4">
        <ProductSelector
          planId={params.id}
          products={products}
          selectedProductId={selectedProductId}
          onSelect={setSelectedProductId}
        />
      </div>

      {selectedProductId && loading && <p className="text-sm text-slate-500">Loading…</p>}

      {selectedProductId && !loading && controlSteps.length === 0 && (
        <p className="text-sm text-slate-500">
          No critical control points yet for this product. Complete{" "}
          <Link href={`/plans/${params.id}/ccp-determination`} className="font-medium text-brand-600">
            CCP Determination
          </Link>{" "}
          first.
        </p>
      )}

      {selectedProductId && !loading && controlSteps.length > 0 && (
        <div className="space-y-6">
          {controlSteps.map((step) => (
            <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">{step.order}. {step.name}</h2>
              <div className="mt-3 space-y-4">
                {step.hazards.map((h) => (
                  <div key={h.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-800">
                      [{h.type}] {h.description}{" "}
                      <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                        {h.ccpStatus}
                      </span>
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {CONTROL_FIELDS.map((f) => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-slate-600">{f.label}</label>
                          <p className="text-[11px] text-slate-400">{f.help}</p>
                          <input
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                            value={(h[f.key] as string) ?? ""}
                            onChange={(e) => updateHazard(step.id, h.id, { [f.key]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/ccp-determination`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/recall`} className="text-sm font-medium text-brand-600">
          Next: Recall Plan →
        </Link>
      </div>
    </div>
  );
}
