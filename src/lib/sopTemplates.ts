import type { FacilityProfile, RecallContactData, MockRecallRecordData, ProductSummary } from "@/types";

export interface SopRenderContext {
  facility: FacilityProfile;
  /** All products on this plan — a facility-wide document like the Recall
   *  Plan lists them; product-specific detail (description, intended use,
   *  etc.) lives per product and isn't repeated here. */
  products?: ProductSummary[];
  recallContacts?: RecallContactData[];
  mockRecalls?: MockRecallRecordData[];
}

export type SopCategory = "gmp" | "food_safety" | "recall";

export interface SopTemplateDef {
  key: string;
  title: string;
  /** "gmp" = Good Manufacturing Practices / prerequisite program, shown in
   *  the GMP wizard step. "recall" = the recall plan document, shown on its
   *  own dedicated Recall wizard step (alongside the team/mock-recall
   *  data). "food_safety" = the remaining hazard-specific preventive
   *  control programs, shown in the SOPs wizard step. */
  category: SopCategory;
  /** Renders markdown-ish plain text with facility (and, for recall, team/
   *  mock-recall) data interpolated. */
  render: (ctx: SopRenderContext) => string;
}

function fallback(value: string | undefined | null, placeholder: string) {
  return value && value.trim().length > 0 ? value : placeholder;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-CA");
}

/** Lists product names for a facility-wide document, falling back to the
 * facility's general food-categories summary if no products are on file yet. */
function productListText(products: ProductSummary[] | undefined, facility: FacilityProfile): string {
  if (products && products.length > 0) return products.map((p) => p.name).join(", ");
  return fallback(facility.foodCategories, "[product categories]");
}

// --- GMP / Prerequisite Program templates --------------------------------

const GMP_TEMPLATES: SopTemplateDef[] = [
  {
    key: "personnel_hygiene",
    title: "Personnel Health & Hygiene Policy",
    category: "gmp",
    render: ({ facility: f }) => `# Personnel Health & Hygiene Policy

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

## Purpose
Prevents contamination of food, food-contact surfaces, and packaging
materials by personnel, in line with CFIA prerequisite program
expectations for personnel hygiene.

## Health Reporting
Employees must report to their supervisor before starting work if they are
experiencing symptoms such as diarrhea, vomiting, fever, jaundice, a
diagnosed communicable illness, or an open/infected wound on exposed skin.
Affected employees are reassigned to non-food-contact duties or excluded
from the facility until cleared to return, per the corrective action below.

## Hand Hygiene
1. Hands are washed and sanitized before starting work, after breaks, after
   using the washroom, after handling waste or non-food items, and any time
   hands become contaminated.
2. Handwashing stations are stocked with soap, single-use towels (or an
   equivalent hand-drying method), and warm running water.
3. Gloves, where used, do not replace handwashing and are changed between
   tasks and whenever damaged or contaminated.

## Jewelry, Personal Items & Habits
Jewelry (except a plain wedding band, where permitted by facility policy),
false nails/nail polish, and personal items are not worn/brought into
production areas. Eating, drinking (other than from designated stations),
chewing gum, and smoking are prohibited in production areas.

## Monitoring
A supervisor performs a visual pre-shift hygiene check for all personnel and
visitors entering production areas, and documents exceptions.

## Corrective Action
Employees not meeting this policy are corrected before entering production
areas; employees reporting illness consistent with a foodborne pathogen are
excluded from food-contact duties until symptom-free for the period defined
by facility policy (consult current public health guidance).

## Recordkeeping
Pre-shift hygiene check records and illness-reporting records are retained
for [retention period] and reviewed by ${fallback(f.responsibleIndividual, "[Name / Title]")}.
`,
  },
  {
    key: "code_of_conduct",
    title: "Employee Code of Conduct (Food Safety)",
    category: "gmp",
    render: ({ facility: f }) => `# Employee Code of Conduct — Food Safety

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

## Purpose
Sets expectations for employee behaviour that protects food safety and
quality at ${fallback(f.facilityName, "[Facility Name]")}.

## Expectations
1. Follow all posted GMP, hygiene, and food safety procedures at all times.
2. Report food safety hazards, near-misses, and non-conformances to a
   supervisor immediately, without fear of reprisal.
3. Do not knowingly release non-conforming product.
4. Complete required food safety training before working unsupervised in
   production areas.
5. Follow facility policy on visitors, contractors, and personal items in
   production areas.
6. Cooperate fully with internal audits, CFIA inspections, and any
   third-party audits.

## Consequences of Non-Compliance
Violations are addressed through the facility's standard progressive
discipline process; deliberate food safety violations may result in
immediate corrective action up to and including termination, consistent
with employment policy.

## Acknowledgement
All employees acknowledge this code of conduct in writing upon hire and
upon any material revision. Signed acknowledgements are kept in each
employee's personnel file.
`,
  },
  {
    key: "dress_code",
    title: "Suitable Attire Policy (Dress Code)",
    category: "gmp",
    render: ({ facility: f }) => `# Suitable Attire Policy

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

## Purpose
Defines attire required in production areas to prevent physical and
biological contamination of ${fallback(f.foodCategories, "[product categories]")}.

## Required Attire in Production Areas
1. Clean uniform or outer garment, put on at the facility and not worn
   outside the plant (or covered when travelling to/from work).
2. Hairnet or hat covering all head hair; beard net for facial hair, where
   applicable.
3. Closed-toe, non-slip footwear designated for or dedicated to the
   production floor.
4. No exposed jewelry (per the Personnel Health & Hygiene Policy).
5. Gloves where required for the task, changed per the hygiene policy.

## Visitors & Contractors
Visitors and contractors entering production areas are provided with, and
must wear, the same protective attire (hairnet, outer garment, footwear
covers where applicable) before entry, and are briefed on basic hygiene
rules.

## Monitoring
A supervisor visually verifies attire compliance at the start of each shift
and for all visitors before they enter production areas.

## Corrective Action
Personnel or visitors not in compliant attire are corrected before entering
or continuing in production areas.

## Recordkeeping
Attire compliance checks are documented as part of the daily pre-operational
or GMP checklist and retained for [retention period].
`,
  },
  {
    key: "vendor_qualification",
    title: "Vendor & Supplier Qualification Program",
    category: "gmp",
    render: ({ facility: f }) => `# Vendor & Supplier Qualification Program

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

## Purpose
Ensures that vendors and suppliers of ingredients, packaging, and
food-contact services meet the food safety requirements of
${fallback(f.facilityName, "[Facility Name]")} before being approved for use.

## Qualification Process
1. New vendors submit relevant documentation (e.g., food safety
   certification/GFSI status, licence/registration numbers, specification
   sheets, allergen declarations, certificate of insurance where
   applicable) before first shipment.
2. Documentation is reviewed against this facility's requirements; vendors
   supplying a hazard this facility relies on them to control are subject to
   the additional verification activities in the Supply-Chain Program.
3. Approved vendors are added to the Approved Vendor List with the date of
   approval and the individual who approved them.

## Ongoing Requirements
Approved vendors must notify ${fallback(
      f.facilityName,
      "[Facility Name]"
    )} of any change in formulation, allergen status, sourcing, or food
safety certification status.

## Re-Evaluation
Vendors are re-evaluated at least annually, or immediately upon a
non-conformance, complaint trend, or certification lapse.

## Recordkeeping
The Approved Vendor List and supporting qualification documents are
maintained and reviewed by ${fallback(f.responsibleIndividual, "[Name / Title]")}.
`,
  },
  {
    key: "transportation_guarantee",
    title: "Transportation Letter of Guarantee",
    category: "gmp",
    render: ({ facility: f }) => `# Transportation Letter of Guarantee

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}
**Address:** ${fallback(f.address, "[Facility Address]")}

## Purpose
A template letter of guarantee to be issued to (or requested from) carriers
transporting ${fallback(f.foodCategories, "[product categories]")} on behalf of
${fallback(f.facilityName, "[Facility Name]")}, confirming food-safe
transportation practices.

---

To: [Carrier Name]
From: ${fallback(f.facilityName, "[Facility Name]")}
Date: [Date]

This letter confirms that [Carrier Name] agrees to transport product on
behalf of ${fallback(f.facilityName, "[Facility Name]")} under the following
conditions:

1. Trailers/containers used are clean, free of pests, and in good repair
   before loading.
2. Product requiring temperature control is maintained at
   [temperature range] throughout transport, and temperature is verified
   and recorded at loading and unloading.
3. Food product is not co-mingled with non-food or hazardous materials in a
   manner that could cause contamination.
4. Any incident affecting product integrity during transport (temperature
   excursion, contamination, accident) is reported to
   ${fallback(f.facilityName, "[Facility Name]")} immediately.
5. The carrier maintains records sufficient to demonstrate compliance with
   the above and provides them upon request.

Acknowledged by:

Carrier representative: ________________________  Date: ___________

${fallback(f.facilityName, "[Facility Name]")} representative: ________________________  Date: ___________

---

## Recordkeeping
Signed letters of guarantee are kept on file for each carrier used and
renewed/re-confirmed at least annually.
`,
  },
  {
    key: "sanitation",
    title: "Sanitation Standard Operating Procedure (SSOP)",
    category: "gmp",
    render: ({ facility: f, products }) => `# Sanitation Standard Operating Procedure

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}
**Address:** ${fallback(f.address, "[Facility Address]")}
**Responsible individual:** ${fallback(f.responsibleIndividual, "[Name / Title]")}

## Purpose
This SOP establishes the procedures for cleaning and sanitizing food-contact
surfaces, equipment, and the facility environment at ${fallback(
      f.facilityName,
      "[Facility Name]"
    )} to prevent contamination of ${fallback(f.foodCategories, "[product categories]")}.

## Scope
Applies to all food-contact surfaces, non-food-contact surfaces in production
areas, equipment, and utensils used in the production of ${productListText(products, f)}.

## Procedure
1. Pre-operational visual inspection of all food-contact surfaces.
2. Removal of gross soil (dry cleaning) before wet cleaning where applicable.
3. Application of an approved detergent, followed by a potable-water rinse.
4. Application of an approved sanitizer at the labeled concentration and
   contact time; verify concentration with a test strip or equivalent method.
5. Air-dry or single-use wipe of food-contact surfaces before resuming
   production.
6. Environmental monitoring of designated zones per the facility's
   environmental monitoring program, where applicable.

## Monitoring
Pre-operational sanitation checks are performed and documented before the
start of each production run by a trained employee.

## Corrective Action
If a surface fails pre-operational inspection or sanitizer verification,
production does not begin (or is halted) until re-cleaning and re-verification
are completed and documented.

## Verification
A supervisor or the responsible individual (${fallback(
      f.responsibleIndividual,
      "[Name / Title]"
    )}) reviews sanitation records at least weekly and reconciles them against
production schedules.

## Recordkeeping
Sanitation records are retained for at least [retention period consistent with
applicable regulations, typically 2 years] and are available for review upon
request, including by CFIA.
`,
  },
  {
    key: "pest_control",
    title: "Pest Control Program",
    category: "gmp",
    render: ({ facility: f }) => `# Pest Control Program

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}
**Address:** ${fallback(f.address, "[Facility Address]")}

## Purpose
Prevents pest activity from contaminating ${fallback(
      f.foodCategories,
      "[product categories]"
    )}, food-contact surfaces, or packaging at ${fallback(f.facilityName, "[Facility Name]")}.

## Program Elements
1. **Exterior:** Building perimeter kept clear of debris/vegetation
   overgrowth; doors, windows, and utility penetrations sealed against
   pest entry.
2. **Monitoring devices:** Insect light traps, rodent bait/snap stations,
   and pheromone traps are placed at facility entry points, receiving,
   storage, and production areas per a site pest-control map, and serviced
   by [in-house trained staff / licensed pest control provider — specify].
3. **Inspection frequency:** Devices are inspected at least [monthly /
   per contractor schedule], with findings logged.
4. **Chemical control:** Pesticides used, if any, are approved for use in
   food facilities, applied only in non-production areas or per label
   restrictions, and applications are logged.

## Monitoring
Pest activity trends (device catch counts, sightings, droppings) are
reviewed at each servicing visit and summarized [monthly/quarterly].

## Corrective Action
Evidence of pest activity in a production or storage area triggers an
investigation of nearby product for contamination, additional trapping/
treatment, and root-cause corrective action (e.g., sealing an entry point).

## Recordkeeping
Pest control service reports, device maps, and trend logs are retained for
[retention period] and reviewed by ${fallback(f.responsibleIndividual, "[Name / Title]")}.
`,
  },
  {
    key: "personnel_training",
    title: "Personnel Training Program",
    category: "gmp",
    render: ({ facility: f }) => `# Personnel Training Program

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

## Purpose
Ensures personnel at ${fallback(
      f.facilityName,
      "[Facility Name]"
    )} have the knowledge needed to perform their roles safely and in
compliance with this Preventive Control Plan and CFIA requirements.

## Training Requirements
1. **Orientation training** (before starting unsupervised work): GMPs,
   personnel hygiene, attire, allergen awareness, and role-specific food
   safety duties.
2. **Role-specific training:** Employees performing a preventive control
   (e.g., a CCP, allergen control point) are trained on the specific
   critical limits, monitoring procedure, and corrective action for that
   control before performing it unsupervised.
3. **Refresher training:** Conducted at least annually, or when a
   procedure changes, a non-conformance trend is identified, or an
   employee returns from extended leave.

## Monitoring
Completed training is logged with employee name, topic, trainer, and date.
Supervisors verify new employees are not assigned unsupervised
food-safety-critical duties before training is complete.

## Corrective Action
Employees found performing duties without required training are retrained
before resuming that duty; the training program is reviewed if gaps are
found to be systemic.

## Recordkeeping
Individual training records are kept in each employee's file and retained
for the duration of employment plus [retention period].
`,
  },
  {
    key: "corporate_structure",
    title: "Corporate Structure / Organizational Chart",
    category: "gmp",
    render: ({ facility: f }) => `# Corporate Structure

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

## Purpose
Documents the reporting structure and food-safety-relevant roles at
${fallback(f.facilityName, "[Facility Name]")}, so responsibility for this
Preventive Control Plan is clear.

## Organizational Chart
[Insert or describe your organizational chart here — e.g.:]

- Owner / General Manager
  - Responsible Individual for the Preventive Control Plan: ${fallback(
    f.responsibleIndividual,
    "[Name / Title]"
  )}
  - Production Supervisor(s)
  - Quality / Food Safety Lead
  - Sanitation Lead
  - Maintenance Lead
  - Shipping/Receiving Lead

## Roles & Responsibilities Summary
Detailed responsibilities for each food-safety-relevant role are documented
in that role's Job Description (see Job Descriptions).

## Review
This structure is reviewed and updated whenever there is a significant
personnel or organizational change, and at least annually.
`,
  },
  {
    key: "job_descriptions",
    title: "Job Descriptions (Food Safety Roles)",
    category: "gmp",
    render: ({ facility: f }) => `# Job Descriptions — Food Safety Roles

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

Below is a starting template — duplicate the block for each food-safety-relevant
role at your facility and fill in the specifics.

## [Role Title — e.g. "Production Supervisor"]
- **Reports to:** [Title]
- **Food safety responsibilities:**
  - [e.g. "Verify pre-operational sanitation checks before production
    start"]
  - [e.g. "Monitor and record CCP critical limits per the Preventive
    Control Plan"]
- **Required training/qualifications:** [e.g. GMP orientation, allergen
  awareness, CCP-specific monitoring training]
- **Authority:** [e.g. "Authorized to halt production if a critical limit
  is not met"]

## [Role Title — e.g. "Responsible Individual for the Preventive Control Plan"]
- **Name:** ${fallback(f.responsibleIndividual, "[Name]")}
- **Reports to:** [Title]
- **Food safety responsibilities:**
  - Develop, implement, and maintain this Preventive Control Plan
  - Review monitoring, verification, and corrective action records
  - Serve as primary contact for CFIA inspections related to this plan
- **Required training/qualifications:** [e.g. HACCP/PCP training,
  food safety training relevant to the facility's products]

## Recordkeeping
Current job descriptions for all food-safety-relevant roles are kept on
file and reviewed at least annually or upon role change.
`,
  },
];

// --- Food-safety (hazard-specific) templates ------------------------------

const FOOD_SAFETY_TEMPLATES: SopTemplateDef[] = [
  {
    key: "recall",
    title: "Recall Plan",
    category: "recall",
    render: ({ facility: f, products, recallContacts, mockRecalls }) => {
      const contacts = recallContacts ?? [];
      const teamSection =
        contacts.length > 0
          ? contacts
              .map(
                (c) =>
                  `- **${fallback(c.role, "Team member")}:** ${fallback(c.name, "[Name]")}${
                    c.phone ? ` — ${c.phone}` : ""
                  }${c.email ? ` — ${c.email}` : ""}`
              )
              .join("\n")
          : `- Recall coordinator: ${fallback(
              f.responsibleIndividual,
              "[Name / Title]"
            )}\n- Alternates and cross-functional contacts: [add recall team members on the Recall Plan step]`;

      const sortedMockRecalls = [...(mockRecalls ?? [])].sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      );
      const latestMockRecall = sortedMockRecalls[0];
      const mockRecallSection = latestMockRecall
        ? `Most recent mock recall: **${formatDate(latestMockRecall.performedAt)}**, performed by ${fallback(
            latestMockRecall.performedBy,
            "[Name]"
          )}, tracing ${fallback(latestMockRecall.percentTraced, "[% traced]")}. ${fallback(
            latestMockRecall.resultsSummary,
            ""
          )}`.trim()
        : "No mock recall is on file yet — one should be conducted and logged on the Recall Plan step before this plan is finalized.";

      const mockRecallHistory =
        sortedMockRecalls.length > 0
          ? sortedMockRecalls
              .map(
                (r) =>
                  `- ${formatDate(r.performedAt)} — performed by ${fallback(r.performedBy, "[Name]")}, traced ${fallback(
                    r.percentTraced,
                    "[% traced]"
                  )}${r.resultsSummary ? ` — ${r.resultsSummary}` : ""}`
              )
              .join("\n")
          : "- No mock recalls logged yet.";

      return `# Recall Plan

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}
**Responsible individual:** ${fallback(f.responsibleIndividual, "[Name / Title]")} — ${fallback(
        f.responsibleIndividualContact,
        "[Contact Info]"
      )}
**CFIA licence number (if applicable):** ${fallback(f.cfiaLicenseNumber, "[Licence Number]")}

## Purpose
Establishes procedures to promptly and effectively remove affected product
(${productListText(products, f)}) from the market if it is found to present a
risk to consumers, consistent with CFIA recall requirements under the Safe
Food for Canadians Regulations.

## Recall Team
${teamSection}

## Trigger Criteria
A recall is initiated when the facility becomes aware that distributed product
may be adulterated or misbranded in a way that presents a health risk (e.g.,
positive pathogen test, undeclared allergen, foreign material complaint
pattern, supplier notification of contaminated ingredient).

## Procedure
1. Convene the recall team immediately upon identifying a potential issue.
2. Use lot codes and distribution records to identify all affected product
   and its location in the supply chain.
3. Notify direct customers/distributors within [target timeframe, e.g., 24
   hours] with lot numbers, reason, and instructions.
4. Notify the Canadian Food Inspection Agency (CFIA) as required, using the
   facility's CFIA licence number where applicable.
5. Issue a public notice if warranted, in coordination with CFIA.
6. Track returned/destroyed product and reconcile against distribution
   records to confirm effectiveness.

## Mock Recalls
A mock recall is performed at least **annually** to verify traceability
records allow the facility to account for all affected product within a
reasonable timeframe (commonly one business day).

${mockRecallSection}

### Mock Recall History
${mockRecallHistory}

## Recordkeeping
Distribution and lot-coding records sufficient to conduct a recall are
maintained for [retention period] and reviewed for completeness quarterly.
`;
    },
  },
  {
    key: "allergen_control",
    title: "Allergen Control Preventive Control Plan",
    category: "food_safety",
    render: ({ facility: f, products }) => `# Allergen Control Plan

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}
**Product(s):** ${productListText(products, f)}

Note: allergen sources vary by product — see each product's description
(Products step) for its specific ingredients when completing the list below.

## Purpose
Prevents undeclared allergens in finished product through control of
ingredient receiving, storage, formulation, changeovers/cleaning, and
labeling, consistent with the priority food allergens, gluten, and added
sulphites CFIA requires to be declared.

## Known Allergens Present at This Facility
[List each priority allergen present in any raw material, e.g., milk, eggs,
fish, crustaceans, shellfish, tree nuts, peanuts, sesame seeds, wheat/gluten,
soy, mustard, sulphites.]

## Controls
1. **Receiving:** Verify supplier ingredient specifications/labels match
   allergen declarations on file before acceptance.
2. **Storage:** Store allergen-containing ingredients in designated,
   clearly labeled areas to prevent cross-contact; segregate from
   allergen-free ingredients where feasible.
3. **Scheduling/Changeovers:** Sequence production to run allergen-free
   products before allergen-containing products where practical; perform a
   validated allergen cleanout between changeovers.
4. **Labeling:** Verify the correct bilingual (English/French, where
   required) label matching the actual formulation is applied to every
   production run before release; reconcile label lot with formulation lot.
5. **Rework:** Only use rework that shares the same allergen profile as the
   product it's added to, and document the addition.

## Monitoring
Label/formulation reconciliation is checked and documented at the start of
each production run. Allergen cleanout effectiveness is verified per the
facility's cleaning verification method (e.g., ATP swab or allergen-specific
test) before allergen-free production resumes.

## Corrective Action
If a label/formulation mismatch is found, affected product is placed on hold
pending investigation and, if necessary, relabeled or subjected to the recall
plan.

## Verification
${fallback(f.responsibleIndividual, "[Name / Title]")} reviews allergen control
records at least monthly.
`,
  },
  {
    key: "supplier_verification",
    title: "Supply-Chain (Supplier Verification) Program",
    category: "food_safety",
    render: ({ facility: f }) => `# Supply-Chain Program

**Facility:** ${fallback(f.facilityName, "[Facility Name]")}

## Purpose
Ensures raw materials and ingredients received by ${fallback(
      f.facilityName,
      "[Facility Name]"
    )} are adequately controlled for hazards that this facility relies on its
suppliers to control (i.e., hazards not otherwise controlled at this
facility). Works together with the Vendor & Supplier Qualification Program.

## Approved Supplier List
Only ingredients from approved suppliers are accepted. A supplier is added to
the approved list after:
1. Reviewing the supplier's relevant food safety documentation (e.g., HACCP/
   Preventive Control Plan summary, GFSI certification, or equivalent).
2. Confirming the supplier's control of the hazard(s) this facility is relying
   on them to manage.

## Verification Activities
Depending on hazard severity and supplier risk, verification may include:
- Annual or more frequent onsite audits
- Review of certificates of analysis (CoA) with each lot or periodically
- Sampling and testing of incoming lots
- Review of the supplier's relevant food safety certification

## Ongoing Monitoring
Supplier performance (non-conformances, complaint trends, audit results) is
reviewed at least annually, or sooner if an issue arises, to determine whether
continued approval is warranted.

## Corrective Action
Lots received from a supplier with an active non-conformance are placed on
hold pending investigation. Suppliers failing to resolve non-conformances may
be removed from the approved list.

## Recordkeeping
Supplier approval documentation, verification records, and CoAs are retained
for [retention period] and reviewed by ${fallback(
      f.responsibleIndividual,
      "[Name / Title]"
    )}.
`,
  },
];

export const SOP_TEMPLATES: SopTemplateDef[] = [...GMP_TEMPLATES, ...FOOD_SAFETY_TEMPLATES];

export function getTemplate(key: string): SopTemplateDef | undefined {
  return SOP_TEMPLATES.find((t) => t.key === key);
}

export function getTemplatesByCategory(category: SopCategory): SopTemplateDef[] {
  return SOP_TEMPLATES.filter((t) => t.category === category);
}
