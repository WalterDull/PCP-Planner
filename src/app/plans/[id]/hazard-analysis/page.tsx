"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { suggestHazardsForStep, type HazardTypeKey } from "@/lib/hazardLibrary";
import ProductSelector, { type ProductLite } from "@/components/ProductSelector";
import CfiaResourceLinks from "@/components/CfiaResourceLinks";
import GuidancePanel from "@/components/GuidancePanel";

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
        For each process step, identify biological, chemical, physical, and radiological hazards
        that could reasonably occur, then judge which ones are significant. We&apos;ve suggested
        some common ones — remove any that don&apos;t apply and add anything specific to your
        process.
      </p>

      <div className="mt-4 space-y-3">
        <GuidancePanel title="How to decide whether a hazard is significant" tone="info">
          <p>
            CFIA asks two things of every hazard you list: is it{" "}
            <strong>reasonably likely to occur</strong>, and{" "}
            <strong>how severely</strong> could it affect someone who eats the food? A hazard is
            significant when the combination of those two warrants a control.
          </p>
          <p>
            Base likelihood on real evidence — your facility&apos;s complaint and recall history,
            deviation records, environmental results, supplier issues, scientific literature, and
            industry data — not on optimism. Base severity on the health impact: how serious the
            illness or injury is, and whether vulnerable groups (infants, elderly, immunocompromised)
            consume the product.
          </p>
          <p className="rounded bg-white px-2 py-1.5 text-xs text-slate-700">
            <strong>Record your reasoning either way.</strong> The justification box matters as much
            for hazards you rule out as for the ones you keep. CFIA expects you to be able to explain
            why a hazard is <em>not</em> significant, not just why it is.
          </p>
        </GuidancePanel>

        <GuidancePanel title="When to check “Requires a preventive control” (this decides what goes to the decision tree)" tone="warning">
          <p>
            This checkbox is the gate into the next step. Only hazards you check here get run
            through the CCP decision tree. Getting it right here saves a lot of confusion later.
          </p>
          <p>
            <strong>Check it</strong> when the hazard is significant and needs a specific preventive
            control that you will define, measure, and monitor — for example pathogen survival at a
            cook step, or metal fragments at a detection step.
          </p>
          <p>
            <strong>Leave it unchecked</strong> when the hazard is adequately controlled by a
            prerequisite program or SOP — sanitation, personal hygiene, pest control, allergen
            segregation, supplier guarantees, preventive maintenance. In that case, name the
            controlling SOP in the justification box. The hazard is still controlled and still
            documented; it&apos;s just controlled by that program rather than by a CCP.
          </p>
          <p className="rounded bg-white px-2 py-1.5 text-xs text-slate-700">
            <strong>The SOP question, specifically:</strong> if an SOP is what reduces the hazard,
            the processing step itself was <em>not</em> designed to control it — the step merely
            relies on the SOP. That hazard normally belongs in a prerequisite program, not the
            decision tree. If you do send it to the tree anyway, the correct answer to Q2
            (&ldquo;is this step specifically designed to eliminate the hazard?&rdquo;) is{" "}
            <strong>No</strong>, because the step isn&apos;t doing the controlling.
          </p>
          <p className="text-xs text-slate-600">
            Designating unnecessary CCPs is a real problem, not a safe default — CFIA warns that it
            diverts effort away from the points that genuinely keep food safe.
          </p>
        </GuidancePanel>

        <GuidancePanel title="What the severity and likelihood levels mean" tone="neutral">
          <p className="text-xs">
            <strong>Severity</strong> — how bad the health outcome could be:
          </p>
          <ul className="list-disc pl-5 text-xs">
            <li>
              <strong>Low</strong> — unlikely to cause illness or injury; mild, self-limiting at worst.
            </li>
            <li>
              <strong>Moderate</strong> — could cause illness or injury requiring some care; typically
              short-lived.
            </li>
            <li>
              <strong>High</strong> — could cause serious illness or injury, possibly requiring
              hospitalization.
            </li>
            <li>
              <strong>Severe</strong> — could be life-threatening or cause lasting harm (e.g. botulism,
              anaphylaxis from an undeclared allergen, E. coli O157:H7 in a ready-to-eat food).
            </li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Likelihood</strong> — how realistically it could happen in <em>your</em> operation:
          </p>
          <ul className="list-disc pl-5 text-xs">
            <li>
              <strong>Rare</strong> — no history and no plausible route in your process.
            </li>
            <li>
              <strong>Possible</strong> — plausible; has occurred in similar operations.
            </li>
            <li>
              <strong>Likely</strong> — known to occur in this type of process or product.
            </li>
            <li>
              <strong>Almost certain</strong> — expected without a control (e.g. pathogens on incoming
              raw poultry).
            </li>
          </ul>
          <p className="mt-2 rounded bg-white px-2 py-1.5 text-xs text-slate-700">
            A severe hazard that is only possible often still warrants a control — severity carries
            more weight than likelihood when the outcome could be life-threatening. When you can&apos;t
            decide, CFIA&apos;s rule is to assume the worst case until you have evidence otherwise.
          </p>
        </GuidancePanel>
      </div>

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
                <h2 className="font-semibold text-slate-900">
                  {step.order}. {step.name}
                </h2>

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
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
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
                        <label
                          className="flex items-center gap-1"
                          title="Check only if this hazard needs its own preventive control evaluated through the CCP decision tree. If an SOP or prerequisite program already controls it, leave this unchecked and name that SOP in the justification."
                        >
                          <input
                            type="checkbox"
                            checked={h.requiresPreventiveControl}
                            onChange={(e) =>
                              updateHazard(step.id, h.id, { requiresPreventiveControl: e.target.checked })
                            }
                          />
                          Requires a preventive control
                          <span className="text-slate-400">(sends to decision tree)</span>
                        </label>
                      </div>
                      <textarea
                        className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                        placeholder="Justification — why is this significant, or not? If a prerequisite program or SOP controls it, name that SOP here."
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
