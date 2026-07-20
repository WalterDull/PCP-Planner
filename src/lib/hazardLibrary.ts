/**
 * Starter hazard suggestions keyed by common process-step names, to give
 * first-time users a running start on hazard analysis. This is a seed list,
 * not a substitute for a facility-specific hazard analysis — the UI should
 * always let users edit, remove, or add hazards freely.
 *
 * The step names and hazard categories here follow the same structure CFIA
 * uses in its own Reference Database for Hazard Identification (RDHI) —
 * ingredients/incoming materials, processing steps, and establishment
 * layout (cross-contamination), each broken into biological/chemical/
 * physical hazards — so a user's list here lines up with what they'll find
 * if they cross-check against the RDHI directly (linked contextually from
 * the Hazard Analysis and CCP Determination wizard steps; see
 * CfiaResourceLinks). CFIA periodically updates the RDHI with new hazards,
 * so always treat this seed list as a starting point, not the final word —
 * the live tool is the authoritative source of truth.
 */

export type HazardTypeKey = "BIOLOGICAL" | "CHEMICAL" | "PHYSICAL" | "RADIOLOGICAL";

export interface HazardSuggestion {
  type: HazardTypeKey;
  description: string;
}

export const COMMON_STEP_NAMES = [
  "Receiving",
  "Storage (Refrigerated)",
  "Storage (Frozen)",
  "Storage (Dry)",
  "Washing/Rinsing",
  "Cutting/Slicing",
  "Mixing/Formulation",
  "Cooking/Thermal Processing",
  "Cooling",
  "Packaging",
  "Labeling",
  "Metal Detection/X-ray",
  "Sifting",
  "Dehydration/Drying",
  "Allergen Changeover/Rework",
  "Shipping",
] as const;

const LIBRARY: Record<string, HazardSuggestion[]> = {
  Receiving: [
    { type: "BIOLOGICAL", description: "Pathogen contamination from incoming raw materials" },
    { type: "CHEMICAL", description: "Undeclared allergens from mislabeled or cross-contaminated ingredients" },
    { type: "CHEMICAL", description: "Pesticide or veterinary drug residues exceeding limits" },
    { type: "PHYSICAL", description: "Foreign material (glass, metal, plastic) in incoming ingredients" },
  ],
  "Storage (Refrigerated)": [
    { type: "BIOLOGICAL", description: "Pathogen growth or toxin formation due to temperature abuse" },
  ],
  "Storage (Frozen)": [
    { type: "BIOLOGICAL", description: "Pathogen survival/growth from inadequate freezer temperature control" },
  ],
  "Storage (Dry)": [
    { type: "BIOLOGICAL", description: "Mold growth from moisture exposure" },
    { type: "PHYSICAL", description: "Pest contamination in dry storage" },
  ],
  "Washing/Rinsing": [
    { type: "BIOLOGICAL", description: "Cross-contamination from wash water or shared equipment" },
    { type: "CHEMICAL", description: "Sanitizer residue exceeding safe levels" },
  ],
  "Cutting/Slicing": [
    { type: "BIOLOGICAL", description: "Cross-contamination from equipment or personnel" },
    { type: "PHYSICAL", description: "Metal fragments from blades or worn equipment" },
  ],
  "Mixing/Formulation": [
    { type: "CHEMICAL", description: "Incorrect allergen or additive formulation" },
    { type: "CHEMICAL", description: "Over-use of a chemical preservative/additive" },
  ],
  "Cooking/Thermal Processing": [
    { type: "BIOLOGICAL", description: "Survival of pathogens due to insufficient time/temperature" },
  ],
  Cooling: [
    { type: "BIOLOGICAL", description: "Spore-forming pathogen growth (e.g., C. perfringens, B. cereus) from slow cooling" },
  ],
  Packaging: [
    { type: "BIOLOGICAL", description: "Post-process contamination from packaging materials or environment" },
    { type: "CHEMICAL", description: "Undeclared allergen from incorrect packaging/labeling match-up" },
  ],
  Labeling: [
    { type: "CHEMICAL", description: "Missing or incorrect allergen declaration on label" },
  ],
  "Metal Detection/X-ray": [
    { type: "PHYSICAL", description: "Metal or dense foreign material not detected due to equipment malfunction" },
  ],
  Sifting: [
    { type: "PHYSICAL", description: "Foreign material not removed due to torn or incorrect mesh size" },
  ],
  "Dehydration/Drying": [
    { type: "BIOLOGICAL", description: "Pathogen survival due to insufficient water activity (Aw) reduction" },
  ],
  "Allergen Changeover/Rework": [
    { type: "CHEMICAL", description: "Cross-contact with an undeclared allergen from inadequate changeover cleaning or rework handling" },
  ],
  Shipping: [
    { type: "BIOLOGICAL", description: "Temperature abuse during transport" },
  ],
};

export function suggestHazardsForStep(stepName: string): HazardSuggestion[] {
  return LIBRARY[stepName] ?? [];
}
