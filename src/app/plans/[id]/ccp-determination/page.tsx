"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QUESTION_TEXT, QUESTION_ORDER, evaluateDecisionTree, type DecisionTreeAnswers } from "@/lib/ccpDecisionTree";
import ProductSelector, { type ProductLite } from "@/components/ProductSelector";
import CfiaResourceLinks from "@/components/CfiaResourceLinks";

interface Hazard {
  id: string;
  type: string;
  description: string;
  requiresPreventiveControl: boolean;
  ccpStatus: string;
  ccpQ1DoControlMeasuresExist: boolean | null;
  ccpQ2IsStepSpecificallyToControl: boolean | null;
  ccpQ3CouldContaminationExceedLimit: boolean | null;
  ccpQ4WillLaterStepEliminate: boolean | null;
}

interface ProcessStep {
  id: string;
  order: number;
  name: string;
  hazards: Hazard[];
}

const FIELD_MAP: Record<keyof DecisionTreeAnswers, keyof Hazard> = {
  q1DoControlMeasuresExist: "ccpQ1DoControlMeasuresExist",
  q2IsStepSpecificallyToControl: "ccpQ2IsStepSpecificallyToControl",
  q3CouldContaminationExceedLimit: "ccpQ3CouldContaminationExceedLimit",
  q4WillLaterStepEliminate: "ccpQ4WillLaterStepEliminate",
};

const STATUS_STYLES: Record<string, string> = {
  NOT_EVALUATED: "bg-slate-100 text-slate-600",
  NOT_A_CCP: "bg-slate-200 text-slate-700",
  CCP: "bg-red-100 text-red-800",
  PRW: "bg-amber-100 text-amber-800",
};

export default function CcpDeterminationPage({ params }: { params: { id: string } }) {
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

  async function answer(stepId: string, hazardId: string, question: keyof DecisionTreeAnswers, value: boolean) {
    if (!selectedProductId) return;
    const field = FIELD_MAP[question];
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, hazards: s.hazards.map((h) => (h.id === hazardId ? { ...h, [field]: value } : h)) }
          : s
      )
    );
    const res = await fetch(
      `/api/plans/${params.id}/products/${selectedProductId}/process-steps/${stepId}/hazards/${hazardId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      }
    );
    const updated = await res.json();
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, hazards: s.hazards.map((h) => (h.id === hazardId ? updated : h)) } : s))
    );
  }

  const relevantSteps = steps
    .map((s) => ({ ...s, hazards: s.hazards.filter((h) => h.requiresPreventiveControl) }))
    .filter((s) => s.hazards.length > 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 6: CCP Determination</h1>
      <p className="mt-1 text-sm text-slate-600">
        For each hazard you flagged as requiring a preventive control, answer the questions below
        in order. This is the standard Codex/CFIA four-question decision tree — answer honestly
        based on your actual process, not what you wish were true.
      </p>

      <CfiaResourceLinks context="ccp-determination" />

      <div className="mt-4">
        <ProductSelector
          planId={params.id}
          products={products}
          selectedProductId={selectedProductId}
          onSelect={setSelectedProductId}
        />
      </div>

      {selectedProductId && loading && <p className="text-sm text-slate-500">Loading…</p>}

      {selectedProductId && !loading && relevantSteps.length === 0 && (
        <p className="text-sm text-slate-500">
          No hazards are marked as requiring a preventive control for this product yet. Go back to{" "}
          <Link href={`/plans/${params.id}/hazard-analysis`} className="font-medium text-brand-600">
            Hazard Analysis
          </Link>{" "}
          and check the box for any hazard that needs one.
        </p>
      )}

      {selectedProductId && !loading && relevantSteps.length > 0 && (
        <div className="space-y-6">
          {relevantSteps.map((step) => (
            <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">{step.order}. {step.name}</h2>
              <div className="mt-3 space-y-4">
                {step.hazards.map((h) => {
                  const answers: DecisionTreeAnswers = {
                    q1DoControlMeasuresExist: h.ccpQ1DoControlMeasuresExist,
                    q2IsStepSpecificallyToControl: h.ccpQ2IsStepSpecificallyToControl,
                    q3CouldContaminationExceedLimit: h.ccpQ3CouldContaminationExceedLimit,
                    q4WillLaterStepEliminate: h.ccpQ4WillLaterStepEliminate,
                  };
                  const result = evaluateDecisionTree(answers);
                  return (
                    <div key={h.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">
                          [{h.type}] {h.description}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[h.ccpStatus]}`}>
                          {h.ccpStatus.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {QUESTION_ORDER.map((q, i) => {
                          const alreadyAnswered = answers[q] !== null;
                          const isNext = result.nextQuestion === q;
                          if (!alreadyAnswered && !isNext) return null; // don't show future questions yet
                          return (
                            <div key={q} className={isNext ? "" : "opacity-60"}>
                              <p className="text-sm text-slate-700">
                                Q{i + 1}. {QUESTION_TEXT[q].short}
                              </p>
                              <p className="text-xs text-slate-500">{QUESTION_TEXT[q].help}</p>
                              <div className="mt-1 flex gap-2">
                                <button
                                  className={`rounded-md border px-3 py-1 text-xs font-medium ${
                                    answers[q] === true ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
                                  }`}
                                  onClick={() => answer(step.id, h.id, q, true)}
                                >
                                  Yes
                                </button>
                                <button
                                  className={`rounded-md border px-3 py-1 text-xs font-medium ${
                                    answers[q] === false ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300"
                                  }`}
                                  onClick={() => answer(step.id, h.id, q, false)}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {result.reason && (
                        <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-slate-700">{result.reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/hazard-analysis`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/preventive-controls`} className="text-sm font-medium text-brand-600">
          Next: Preventive Controls →
        </Link>
      </div>
    </div>
  );
}
