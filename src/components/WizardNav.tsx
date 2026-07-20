"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { slug: "facility", label: "1. Facility Profile" },
  { slug: "gmp", label: "2. GMPs & Prerequisites" },
  { slug: "products", label: "3. Products" },
  { slug: "process-flow", label: "4. Process Flow" },
  { slug: "hazard-analysis", label: "5. Hazard Analysis" },
  { slug: "ccp-determination", label: "6. CCP Determination" },
  { slug: "preventive-controls", label: "7. Preventive Controls" },
  { slug: "recall", label: "8. Recall Plan" },
  { slug: "sops", label: "9. SOPs" },
  { slug: "review-export", label: "10. Review & Export" },
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
