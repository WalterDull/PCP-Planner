"use client";

import { useEffect, useState } from "react";

interface Sop {
  id: string;
  templateKey: string;
  title: string;
  content: string;
  isCustom: boolean;
}

interface TemplateInfo {
  key: string;
  title: string;
  category: "gmp" | "food_safety" | "recall";
}

/** Shared editor used by the GMP step, the Recall step, and the SOPs step —
 * they're the same generate/edit-template-document mechanic, filtered to a
 * different template category. */
export default function TemplateDocsEditor({
  planId,
  category,
}: {
  planId: string;
  category: "gmp" | "food_safety" | "recall";
}) {
  const [allSops, setAllSops] = useState<Sop[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/plans/${planId}/sops`);
    const data = await res.json();
    setAllSops(data.sops);
    setTemplates(data.availableTemplates);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  async function generate(templateKey: string) {
    setGenerating(templateKey);
    await fetch(`/api/plans/${planId}/sops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateKey }),
    });
    await refresh();
    setGenerating(null);
  }

  async function updateContent(sopId: string, content: string) {
    setAllSops((prev) => prev.map((s) => (s.id === sopId ? { ...s, content } : s)));
    await fetch(`/api/plans/${planId}/sops/${sopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  const categoryTemplates = templates.filter((t) => t.category === category);
  const categoryKeys = new Set(categoryTemplates.map((t) => t.key));
  const sops = allSops.filter((s) => categoryKeys.has(s.templateKey));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categoryTemplates.map((t) => {
          const exists = sops.some((s) => s.templateKey === t.key);
          return (
            <button
              key={t.key}
              onClick={() => generate(t.key)}
              disabled={generating === t.key}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {generating === t.key ? "Generating…" : exists ? `Regenerate: ${t.title}` : `Generate: ${t.title}`}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-6">
        {sops.map((sop) => (
          <div key={sop.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">{sop.title}</h2>
            <textarea
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              rows={14}
              value={sop.content}
              onChange={(e) => updateContent(sop.id, e.target.value)}
            />
          </div>
        ))}
        {sops.length === 0 && (
          <p className="text-sm text-slate-500">No documents generated yet — pick a template above.</p>
        )}
      </div>
    </div>
  );
}
