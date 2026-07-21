"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { slug: "facility", label: "1. Facility Profile" },
  { slug: "gmp", label: "2. GMPs & Prerequisites" },
  { slug: "products", label: "3. Products" },
  { slug: "vendors", label: "4. Vendors / Suppliers" },
  { slug: "process-flow", label: "5. Process Flow" },
  { slug: "hazard-analysis", label: "6. Hazard Analysis" },
  { slug: "ccp-determination", label: "7. CCP Determination" },
  { slug: "preventive-controls", label: "8. Preventive Controls" },
  { slug: "recall", label: "9. Recall Plan" },
  { slug: "sops", label: "10. SOPs" },
  { slug: "review-export", label: "11. Review & Export" },
];

export default function WizardNav({ planId }: { planId: string }) {
  const pathname = usePathname();

  return (
    <nav className="w-full shrink-0 sm:w-56">
      <ul className="space-y-1">
        {STEPS.map((step) => {
          const href = `/plans/${planId}/${step.slug}`;
          const active = pathname === href;
          return (
            <li key={step.slug}>
              <Link
                href={href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  active ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {step.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/dashboard" className="mt-4 block text-xs text-slate-400 hover:text-slate-600">
        ← Back to dashboard
      </Link>
    </nav>
  );
}
