import Link from "next/link";
import TemplateDocsEditor from "@/components/TemplateDocsEditor";

export default function SopsPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 10: Food Safety SOPs</h1>
      <p className="mt-1 text-sm text-slate-600">
        Generate hazard-specific SOPs from templates, pre-filled with your facility profile. Edit
        the text directly below to match your actual practices — these are starting drafts, not
        final documents. (Sanitation and other prerequisite programs live in the GMPs step.)
      </p>

      <div className="mt-6">
        <TemplateDocsEditor planId={params.id} category="food_safety" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/recall`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/review-export`} className="text-sm font-medium text-brand-600">
          Next: Review & Export →
        </Link>
      </div>
    </div>
  );
}
