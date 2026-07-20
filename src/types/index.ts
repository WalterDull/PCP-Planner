// Facility-wide profile — shared across every product on the plan. Per-product
// details (description, intended use/consumer, packaging, shelf life) live on
// the Product model instead, since a plan can cover multiple products.
export interface FacilityProfile {
  facilityName: string;
  address: string;
  // General summary of what's produced at this facility (e.g. "ready-to-eat
  // smoked fish, baked goods"). Product-specific detail lives per product.
  foodCategories: string;
  // "CFIA_SFCR": federally licensed under the Safe Food for Canadians
  // Regulations (interprovincial/international trade). "PROVINCIAL_MUNICIPAL":
  // intra-provincial only, regulated by a provincial/municipal authority
  // instead of CFIA. "OTHER": any other jurisdiction.
  regulatoryScope: "CFIA_SFCR" | "PROVINCIAL_MUNICIPAL" | "OTHER";
  // CFIA licence number, if federally licensed under the SFCR (blank otherwise).
  cfiaLicenseNumber: string;
  responsibleIndividual: string;
  responsibleIndividualContact: string;
}

export const EMPTY_FACILITY_PROFILE: FacilityProfile = {
  facilityName: "",
  address: "",
  foodCategories: "",
  regulatoryScope: "CFIA_SFCR",
  cfiaLicenseNumber: "",
  responsibleIndividual: "",
  responsibleIndividualContact: "",
};

/** Minimal product info passed into SOP template rendering (e.g. to list
 * product names in the Recall Plan). */
export interface ProductSummary {
  id: string;
  name: string;
}

export interface RecallContactData {
  id: string;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
  order: number;
}

export interface MockRecallRecordData {
  id: string;
  performedAt: string; // ISO date
  performedBy: string | null;
  percentTraced: string | null;
  resultsSummary: string | null;
}

export const SUGGESTED_RECALL_ROLES = [
  "Recall Coordinator",
  "Alternate Recall Coordinator",
  "Quality / Food Safety Lead",
  "Operations Lead",
  "Communications Lead",
  "Logistics / Distribution Lead",
  "Legal Counsel",
];
