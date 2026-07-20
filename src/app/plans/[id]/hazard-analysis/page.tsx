"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { suggestHazardsForStep, type HazardTypeKey } from "@/lib/hazardLibrary";
import ProductSelector, { type ProductLite } from "@/components/ProductSelector";
import CfiaResourceLinks from "@/components/CfiaResourceLinks";

interface Hazard {
  id: string;
  type: HazardTypeKey;
  description: string;
  severity: string;
  likelihood: string;
  justification: string | null;
  requiresPreventiveControl: boolean;
}

interface ProcessStep {
  id: string;
  order: number;
  name: string;
  hazards: Hazard[];
}

const HAZARD_TYPES: HazardTypeKey[] = ["BIOLOGICAL", "CHEMICAL", "PHYSICAL", "RADIOLOGICAL"];
const SEVERITIES = ["LOW", "MODERATE", "HIGH", "SEVERE"];
const LIKELIHOODS = ["RARE", "POSSIBLE", "LIKELY", "ALMOST_CERTAIN"];

export default function HazardAnalysisPage({ params }: { params: { id: string } }) {
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

  async function addHazard(stepId: string, type: HazardTypeKey, description: string) {
    if (!selectedProductId) return;
    await fetch(`/api/plans/${params.id}/products/${selectedProductId}/process-steps/${stepId}/hazards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description }),
    });
    refresh(selectedProductId);
  }

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

  async function removeHazard(stepId: string, hazardId: string) {
    if (!selectedProductId) return;
    await fetch(`/api/plans/${params.id}/products/${selectedProductId}/process-steps/${stepId}/hazards/${hazardId}`, {
      method: "DELETE",
    });
    refresh(selectedProductId);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 5: Hazard Analysis</h1>
      <p className="mt-1 text-sm text-slate-600">
        For each process step, identify biological, chemical, physical, and radiological
        hazards that could reasonably occur. We&apos;ve suggested some common ones — remove
        any that don&apos;t apply and add anything specific to your process.
      </p>

      <CfiaResourceLinks context="hazard-analysis" />

      <div className="mt-4">
        <ProductSelector
          planId={params.id}
          products={products}
          selectedProductId={selectedProductId}
          onSelect={setSelectedProductId}
        />
      </div>

      {selectedProductId && loading && <p className="text-sm text-slate-500">Loading…</p>}

      {selectedProductId && !loading && steps.length === 0 && (
        <p className="text-sm text-slate-600">
          This product doesn&apos;t have a process flow yet.{" "}
          <Link href={`/plans/${params.id}/process-flow`} className="font-medium text-brand-600">
            Go back and add its process flow first
          </Link>
          .
        </p>
      )}

      {selectedProductId && !loading && steps.length > 0 && (
        <div className="space-y-6">
          {steps.map((step) => {
            const suggestions = suggestHazardsForStep(step.name).filter(
              (sugg) => !step.hazards.some((h) => h.description === sugg.description)
            );
            return (
              <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-slate-900">{step.order}. {step.name}</h2>

                <div className="mt-3 space-y-3">
                  {step.hazards.map((h) => (
                    <div key={h.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          value={h.type}
                          onChange={(e) => updateHazard(step.id, h.id, { type: e.target.value as HazardTypeKey })}
                        >
                          {HAZARD_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                          value={h.description}
                          onChange={(e) => updateHazard(step.id, h.id, { description: e.target.value })}
                        />
                        <button
                          onClick={() => removeHazard(step.id, h.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        <label className="flex items-center gap-1">
                          Severity
                          <select
                            className="rounded-md border border-slate-300 px-1 py-0.5"
                            value={h.severity}
                            onChange={(e) => updateHazard(step.id, h.id, { severity: e.target.value })}
                          >
                            {SEVERITIES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          Likelihood
                          <select
                            className="rounded-md border border-slate-300 px-1 py-0.5"
                            value={h.likelihood}
                            onChange={(e) => updateHazard(step.id, h.id, { likelihood: e.target.value })}
                          >
                            {LIKELIHOODS.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={h.requiresPreventiveControl}
                            onChange={(e) => updateHazard(step.id, h.id, { requiresPreventiveControl: e.target.checked })}
                          />
                          Requires a preventive control
                        </label>
                      </div>
                      <textarea
                        className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                        placeholder="Justification (why is this significant, or not?)"
                        rows={2}
                        value={h.justification ?? ""}
                        onChange={(e) => updateHazard(step.id, h.id, { justification: e.target.value })}
                      />
                    </div>
                  ))}
                </div>

                {suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500">Suggested hazards for this step:</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.description}
                          onClick={() => addHazard(step.id, s.type, s.description)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          + {s.description}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => addHazard(step.id, "BIOLOGICAL", "New hazard")}
                  className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  + Add custom hazard
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/process-flow`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/ccp-determination`} className="text-sm font-medium text-brand-600">
          Next: CCP Determination →
        </Link>
      </div>
    </div>
  );
}
