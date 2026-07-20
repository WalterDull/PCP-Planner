import Link from "next/link";
import TemplateDocsEditor from "@/components/TemplateDocsEditor";

export default function GmpPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 2: GMPs & Prerequisite Programs</h1>
      <p className="mt-1 text-sm text-slate-600">
        Good Manufacturing Practices are the foundation every food facility needs before hazard
        analysis: personnel and hygiene, attire, vendor qualification, transportation, sanitation,
        pest control, training, and how your organization is structured. Generate each document
        from a template, then edit the text to match how your facility actually operates.
      </p>

      <div className="mt-6">
        <TemplateDocsEditor planId={params.id} category="gmp" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/facility`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/products`} className="text-sm font-medium text-brand-600">
          Next: Products →
        </Link>
      </div>
    </div>
  );
}
