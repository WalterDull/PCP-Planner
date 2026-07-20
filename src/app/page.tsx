import Link from "next/link";

const steps = [
  { title: "Facility Profile", desc: "Tell us about your facility and regulatory scope (CFIA/SFCR or provincial)." },
  { title: "GMPs & Prerequisite Programs", desc: "Personnel, hygiene, attire, vendor qualification, sanitation, pest control, training, and more." },
  { title: "Products", desc: "Add every product you make — each gets its own process flow and hazard analysis." },
  { title: "Process Flow", desc: "Map out each step a product goes through, from receiving to shipping." },
  { title: "Hazard Analysis", desc: "Identify biological, chemical, physical, and radiological hazards at each step, per product." },
  { title: "CCP Determination", desc: "Run each hazard through a guided decision tree to find your critical control points." },
  { title: "Preventive Controls", desc: "Set critical limits, monitoring, corrective actions, and verification." },
  { title: "Recall Plan", desc: "Assign recall team roles and contacts, and track your annual mock recall." },
  { title: "SOPs", desc: "Generate allergen control and supplier-verification SOPs from your data." },
  { title: "Review & Export", desc: "Download a formatted, audit-ready Preventive Control Plan." },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          PCP Planner by FTC International — for Canadian food facility operators
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Build your Preventive Control Plan, one guided step at a time
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          A wizard that walks you through GMPs, hazard analysis, CCP determination, recall
          planning, and SOP drafting — aligned with CFIA and the Safe Food for Canadians
          Regulations (SFCR). Make more than one product? Add each one and get a separate
          process flow and hazard analysis for it. Save your progress, come back anytime, and
          export an audit-ready plan when you&apos;re done. Your data stays private to your
          account.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            Start your plan
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            See pricing
          </Link>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {i + 1}
            </div>
            <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-16 text-center text-xs text-slate-400">
        This tool assists with drafting a Preventive Control Plan and does not replace
        review by a qualified individual responsible for food safety at your facility
        before use, or by a food safety consultant/CFIA where applicable.
      </p>
    </main>
  );
}
