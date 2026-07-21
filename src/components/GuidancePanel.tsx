import type { ReactNode } from "react";

/**
 * Collapsible guidance block. Uses native <details>/<summary> so it works
 * without client-side state and stays accessible/keyboard-navigable.
 */
export default function GuidancePanel({
  title,
  children,
  tone = "neutral",
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "info" | "warning";
  defaultOpen?: boolean;
}) {
  const toneStyles = {
    neutral: "border-slate-200 bg-slate-50",
    info: "border-brand-100 bg-brand-50",
    warning: "border-amber-200 bg-amber-50",
  }[tone];

  return (
    <details open={defaultOpen} className={`rounded-lg border ${toneStyles} px-4 py-3`}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 marker:content-none">
        <span className="mr-1 text-brand-600">?</span>
        {title}
      </summary>
      <div className="mt-2 space-y-2 text-sm text-slate-700">{children}</div>
    </details>
  );
}
