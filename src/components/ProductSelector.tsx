"use client";

import Link from "next/link";

export interface ProductLite {
  id: string;
  name: string;
}

/** Tab strip used at the top of the per-product wizard steps (Process Flow,
 * Hazard Analysis, CCP Determination, Preventive Controls) to switch which
 * product's data is being shown. */
export default function ProductSelector({
  planId,
  products,
  selectedProductId,
  onSelect,
}: {
  planId: string;
  products: ProductLite[];
  selectedProductId: string | null;
  onSelect: (productId: string) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        You haven&apos;t added any products yet.{" "}
        <Link href={`/plans/${planId}/products`} className="font-medium underline">
          Add a product
        </Link>{" "}
        before working on process flow and hazard analysis.
      </p>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            p.id === selectedProductId ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
