"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COMMON_STEP_NAMES } from "@/lib/hazardLibrary";
import ProductSelector, { type ProductLite } from "@/components/ProductSelector";

interface ProcessStep {
  id: string;
  order: number;
  name: string;
  description: string | null;
}

export default function ProcessFlowPage({ params }: { params: { id: string } }) {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

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

  async function addStep(name: string) {
    if (!name.trim() || !selectedProductId) return;
    await fetch(`/api/plans/${params.id}/products/${selectedProductId}/process-steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setNewName("");
    refresh(selectedProductId);
  }

  async function updateStep(id: string, data: Partial<ProcessStep>) {
    if (!selectedProductId) return;
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    await fetch(`/api/plans/${params.id}/products/${selectedProductId}/process-steps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function removeStep(id: string) {
    if (!selectedProductId) return;
    await fetch(`/api/plans/${params.id}/products/${selectedProductId}/process-steps/${id}`, { method: "DELETE" });
    refresh(selectedProductId);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 4: Process Flow</h1>
      <p className="mt-1 text-sm text-slate-600">
        List every step this product goes through, in order, from receiving raw materials to
        shipping the finished product. You&apos;ll analyze hazards for each step next. Each
        product gets its own process flow.
      </p>

      <div className="mt-4">
        <ProductSelector
          planId={params.id}
          products={products}
          selectedProductId={selectedProductId}
          onSelect={setSelectedProductId}
        />
      </div>

      {selectedProductId && loading && <p className="text-sm text-slate-500">Loading…</p>}

      {selectedProductId && !loading && (
        <>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={step.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="mt-2 text-sm font-semibold text-slate-400">{i + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
                      value={step.name}
                      onChange={(e) => updateStep(step.id, { name: e.target.value })}
                    />
                    <textarea
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      placeholder="Optional: describe what happens at this step"
                      rows={2}
                      value={step.description ?? ""}
                      onChange={(e) => updateStep(step.id, { description: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={() => removeStep(step.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {steps.length === 0 && (
              <p className="text-sm text-slate-500">No process steps yet — add your first one below.</p>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700">Add a step</label>
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. Receiving, Cooking, Packaging"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStep(newName)}
              />
              <button
                onClick={() => addStep(newName)}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Add
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMMON_STEP_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => addStep(name)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/products`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/hazard-analysis`} className="text-sm font-medium text-brand-600">
          Next: Hazard Analysis →
        </Link>
      </div>
    </div>
  );
}
