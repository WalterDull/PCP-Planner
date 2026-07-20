// Contextual links out to CFIA's own official hazard analysis tools and
// guidance. These are government resources with no public API to pull data
// from programmatically, so "integrating" them means putting the right
// tool one click away at the point in the wizard where it's useful, rather
// than reimplementing (and risking silently going stale relative to) CFIA's
// own content. CFIA updates the RDHI periodically — always defer to the
// live tool over anything hard-coded in this app.
export type CfiaResourceContext = "hazard-analysis" | "ccp-determination" | "preventive-controls" | "general";

interface CfiaLink {
  label: string;
  href: string;
  description: string;
}

const LINKS: Record<CfiaResourceContext, CfiaLink[]> = {
  "hazard-analysis": [
    {
      label: "Reference Database for Hazard Identification (RDHI)",
      href: "https://active.inspection.gc.ca/rdhi-bdrid/english/rdhi-bdrid/introe.aspx?i=1",
      description:
        "CFIA's own tool: select your ingredients, processing steps, and establishment layout to generate a hazard summary specific to your operation.",
    },
    {
      label: "Conducting a hazard analysis (CFIA guidance)",
      href: "https://inspection.canada.ca/en/preventive-controls/hazard-analysis",
      description: "The step-by-step guidance this wizard step is modelled on — identifying, evaluating, and justifying each hazard.",
    },
  ],
  "ccp-determination": [
    {
      label: "Determining critical control points and their critical limits",
      href: "https://inspection.canada.ca/en/food-safety-industry/preventive-control-plans/critical-control-points",
      description: "CFIA's guidance on the same four-question decision tree used in this step, plus how to set critical limits once a CCP is identified.",
    },
  ],
  "preventive-controls": [
    {
      label: "Evidence showing a control measure is effective",
      href: "https://inspection.canada.ca/en/food-safety-industry/preventive-control-plans/control-measure-effective",
      description: "How CFIA expects you to validate that a critical limit actually controls the hazard.",
    },
    {
      label: "Monitoring procedures",
      href: "https://inspection.canada.ca/en/food-safety-industry/preventive-control-plans/monitoring-procedures",
      description: "Guidance on setting monitoring frequency and method for a CCP.",
    },
    {
      label: "Corrective action procedures",
      href: "https://inspection.canada.ca/en/food-safety-industry/preventive-control-plans/corrective-action-procedures",
      description: "Guidance on documenting what happens when a critical limit isn't met.",
    },
  ],
  general: [
    {
      label: "Preventive control plan templates for domestic food businesses",
      href: "https://inspection.canada.ca/en/preventive-controls/preventive-control-plans/domestic-food-businesses",
      description: "CFIA's official PCP templates, including the process flow diagram and control measure template this app's wizard is aligned with.",
    },
    {
      label: "Step-by-step guide: Preparing a preventive control plan",
      href: "https://inspection.canada.ca/en/food-safety-industry/preventive-control-plans/guide",
      description: "CFIA's overall guide to putting a PCP together, for reference alongside this wizard.",
    },
  ],
};

export default function CfiaResourceLinks({ context }: { context: CfiaResourceContext }) {
  const links = LINKS[context];
  if (!links || links.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CFIA resources for this step</p>
      <ul className="mt-2 space-y-2">
        {links.map((link) => (
          <li key={link.href} className="text-sm">
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              {link.label} ↗
            </a>
            <p className="text-xs text-slate-500">{link.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
