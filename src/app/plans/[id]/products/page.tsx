"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  productDescription: string | null;
  intendedUse: string | null;
  intendedConsumer: string | null;
  packagingType: string | null;
  shelfLifeAndStorage: string | null;
}

const DETAIL_FIELDS: { key: keyof Product; label: string; help: string; textarea?: boolean }[] = [
  {
    key: "productDescription",
    label: "Product description",
    help: "Ingredients, form, processing method.",
    textarea: true,
  },
  { key: "intendedUse", label: "Intended use", help: "e.g. ready-to-eat, requires cooking." },
  {
    key: "intendedConsumer",
    label: "Intended consumer",
    help: "General public, or a specific vulnerable population?",
  },
  { key: "packagingType", label: "Packaging type", help: "e.g. vacuum-sealed, modified atmosphere." },
  { key: "shelfLifeAndStorage", label: "Shelf life & storage", help: "Expected shelf life and required storage temperature.", textarea: true },
];

export default function ProductsPage({ params }: { params: { id: string } }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/plans/${params.id}/products`);
    const data = await res.json();
    setProducts(data);
    setLoading(false);
    return data as Product[];
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function addProduct() {
    if (!newName.trim()) return;
    const res = await fetch(`/api/plans/${params.id}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const created = await res.json();
    setNewName("");
    await refresh();
    setExpanded(created.id);
  }

  async function updateProduct(id: string, data: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    await fetch(`/api/plans/${params.id}/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function removeProduct(id: string) {
    if (!confirm("Remove this product? Its process flow and hazard analysis will be deleted too.")) return;
    await fetch(`/api/plans/${params.id}/products/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 3: Products</h1>
      <p className="mt-1 text-sm text-slate-600">
        Most facilities make more than one product. Add each product you need a hazard analysis
        for — you&apos;ll build a separate process flow, hazard analysis, CCP determination, and
        preventive controls for each one on the next few steps. GMPs, recall, and the facility
        profile are shared across all products.
      </p>

      <div className="mt-6 space-y-3">
        {products.map((p) => {
          const isExpanded = expanded === p.id;
          return (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <input
                  className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
                  value={p.name}
                  onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                />
                <button
                  onClick={() => setExpanded(isExpanded ? null : p.id)}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {isExpanded ? "Hide details" : "Edit details"}
                </button>
                <button onClick={() => removeProduct(p.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  {DETAIL_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600">{f.label}</label>
                      <p className="text-[11px] text-slate-400">{f.help}</p>
                      {f.textarea ? (
                        <textarea
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          rows={2}
                          value={(p[f.key] as string) ?? ""}
                          onChange={(e) => updateProduct(p.id, { [f.key]: e.target.value })}
                        />
                      ) : (
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                          value={(p[f.key] as string) ?? ""}
                          onChange={(e) => updateProduct(p.id, { [f.key]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {products.length === 0 && <p className="text-sm text-slate-500">No products yet — add your first one below.</p>}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700">Add a product</label>
        <div className="mt-1 flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Smoked Salmon 200g, Chicken Pot Pie"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProduct()}
          />
          <button
            onClick={addProduct}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Add
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/gmp`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/process-flow`} className="text-sm font-medium text-brand-600">
          Next: Process Flow →
        </Link>
      </div>
    </div>
  );
}
