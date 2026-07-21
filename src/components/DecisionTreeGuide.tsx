import GuidancePanel from "@/components/GuidancePanel";
import { DECISION_TREE_PRINCIPLES, QUESTION_TEXT, QUESTION_ORDER } from "@/lib/ccpDecisionTree";

/**
 * The "how does this actually work" explainer for the CCP determination step.
 * Collapsed by default so it doesn't overwhelm the working area, but sitting
 * right where the user gets stuck.
 */
export default function DecisionTreeGuide() {
  return (
    <div className="mt-4 space-y-3">
      <GuidancePanel title="How the CCP decision tree works (read this first)" tone="info">
        <p>
          A <strong>Critical Control Point (CCP)</strong> is a step where a control measure is
          essential to prevent, eliminate, or reduce a significant hazard to an acceptable level —
          and where you can set a measurable limit and monitor it.
        </p>
        <p>
          You answer up to four questions <em>per hazard, per step</em>. The tree stops as soon as
          it can reach an answer, so you often won&apos;t see all four. Here is the whole logic:
        </p>
        <div className="rounded-md bg-white p-3 text-xs leading-relaxed text-slate-700">
          <p>
            <strong>Q1. Does any control measure exist</strong> (here or later)?
            <br />
            &nbsp;&nbsp;→ <strong>No</strong> = not a CCP as-is. If control here is necessary for
            safety, you must change the process/product.
            <br />
            &nbsp;&nbsp;→ <strong>Yes</strong> = go to Q2.
          </p>
          <p className="mt-2">
            <strong>Q2. Is this step designed specifically to control it?</strong>
            <br />
            &nbsp;&nbsp;→ <strong>Yes</strong> = <span className="font-semibold text-red-700">CCP</span>. Done.
            <br />
            &nbsp;&nbsp;→ <strong>No</strong> (including &quot;not applicable&quot; for incoming
            materials) = go to Q3.
          </p>
          <p className="mt-2">
            <strong>Q3. Could contamination reach an unacceptable level here</strong> if the control
            failed?
            <br />
            &nbsp;&nbsp;→ <strong>No</strong> = not a CCP at this step. Done.
            <br />
            &nbsp;&nbsp;→ <strong>Yes</strong> = go to Q4.
          </p>
          <p className="mt-2">
            <strong>Q4. Will a later step eliminate or reduce it?</strong>
            <br />
            &nbsp;&nbsp;→ <strong>Yes</strong> = not a CCP here — that later step should be the CCP.
            <br />
            &nbsp;&nbsp;→ <strong>No</strong> = <span className="font-semibold text-red-700">CCP</span>. Done.
          </p>
        </div>
        <p className="text-xs text-slate-600">
          Only hazards you flagged as needing a preventive control on the Hazard Analysis step
          appear here — the tree is for significant hazards, not every hazard you listed.
        </p>
      </GuidancePanel>

      <GuidancePanel title="Principles that resolve most judgment calls" tone="neutral">
        <ul className="list-disc space-y-2 pl-5">
          {DECISION_TREE_PRINCIPLES.map((p) => (
            <li key={p.title}>
              <span className="font-semibold text-slate-800">{p.title}.</span> {p.body}
            </li>
          ))}
        </ul>
      </GuidancePanel>

      <GuidancePanel title="What each question really means, with examples" tone="neutral">
        <div className="space-y-4">
          {QUESTION_ORDER.map((q, i) => {
            const g = QUESTION_TEXT[q];
            return (
              <div key={q} className="rounded-md bg-white p-3">
                <p className="text-sm font-semibold text-slate-800">
                  Q{i + 1}. {g.short}
                </p>
                <p className="mt-1 text-xs italic text-slate-600">In plain terms: {g.plain}</p>
                <p className="mt-2 text-xs text-slate-700">{g.howToDecide}</p>
                <p className="mt-2 text-xs text-green-800">
                  <strong>Example of Yes:</strong> {g.yesExample}
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  <strong>Example of No:</strong> {g.noExample}
                </p>
                <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                  <strong>Watch out:</strong> {g.watchOut}
                </p>
                <p className="mt-1 text-xs text-slate-500">{g.consequence}</p>
              </div>
            );
          })}
        </div>
      </GuidancePanel>
    </div>
  );
}
