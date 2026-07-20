"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPlanPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Could not create plan");
      }
      const plan = await res.json();
      router.push(`/plans/${plan.id}/facility`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Name your plan</h1>
      <p className="mt-1 text-sm text-slate-600">
        You can rename this later. A good name usually references the product or product line.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="e.g. Smoked Salmon — Preventive Control Plan"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create plan & start wizard"}
        </button>
      </form>
    </main>
  );
}
