import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TextRun,
} from "docx";
import type { Plan, Product, ProcessStep, Hazard, Sop, RecallContact, MockRecallRecord } from "@prisma/client";
import type { FacilityProfile } from "@/types";
import { getTemplate } from "@/lib/sopTemplates";

type PlanWithRelations = Plan & {
  products: (Product & { processSteps: (ProcessStep & { hazards: Hazard[] })[] })[];
  sops: Sop[];
  recallContacts: RecallContact[];
  mockRecallRecords: MockRecallRecord[];
};

const REGULATORY_SCOPE_LABEL: Record<string, string> = {
  CFIA_SFCR: "CFIA — federally licensed under the Safe Food for Canadians Regulations (SFCR)",
  PROVINCIAL_MUNICIPAL: "Provincial/municipal only (intra-provincial sales)",
  OTHER: "Other",
};

function cell(text: string, opts: { bold?: boolean; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function headerRow(labels: string[], widths: number[]) {
  return new TableRow({
    children: labels.map((l, i) => cell(l, { bold: true, width: widths[i] })),
  });
}

function markdownToParagraphs(md: string): Paragraph[] {
  return md
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) {
        return new Paragraph({ text: line.replace("# ", ""), heading: HeadingLevel.HEADING_1 });
      }
      if (line.startsWith("## ")) {
        return new Paragraph({ text: line.replace("## ", ""), heading: HeadingLevel.HEADING_2 });
      }
      if (line.trim().length === 0) {
        return new Paragraph({ text: "" });
      }
      return new Paragraph({ text: line });
    });
}

export async function buildPlanDocx(plan: PlanWithRelations): Promise<Buffer> {
  // facilityProfile is stored as a serialized JSON string (SQLite has no
  // native Json column type).
  const facility: Partial<FacilityProfile> = plan.facilityProfile ? JSON.parse(plan.facilityProfile) : {};
  const products = [...plan.products].sort((a, b) => a.order - b.order);

  const children: (Paragraph | Table)[] = [];

  // --- 1. Facility Profile -------------------------------------------------
  children.push(
    new Paragraph({ text: "Preventive Control Plan", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: plan.name, heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "1. Facility Profile", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Facility name: ${facility.facilityName ?? ""}` }),
    new Paragraph({ text: `Address: ${facility.address ?? ""}` }),
    new Paragraph({ text: `Food categories: ${facility.foodCategories ?? ""}` }),
    new Paragraph({
      text: `Regulatory scope: ${REGULATORY_SCOPE_LABEL[facility.regulatoryScope ?? ""] ?? facility.regulatoryScope ?? ""}`,
    }),
    new Paragraph({ text: `CFIA licence number: ${facility.cfiaLicenseNumber ?? ""}` }),
    new Paragraph({
      text: `Responsible individual: ${facility.responsibleIndividual ?? ""} (${facility.responsibleIndividualContact ?? ""})`,
    }),
    new Paragraph({ text: "" })
  );

  // --- 2. Products -----------------------------------------------------------
  children.push(new Paragraph({ text: "2. Products", heading: HeadingLevel.HEADING_1 }));
  if (products.length === 0) {
    children.push(new Paragraph({ text: "No products have been added to this plan yet." }));
  } else {
    for (const p of products) {
      children.push(new Paragraph({ text: p.name, heading: HeadingLevel.HEADING_2 }));
      children.push(new Paragraph({ text: `Product description: ${p.productDescription ?? ""}` }));
      children.push(new Paragraph({ text: `Intended use: ${p.intendedUse ?? ""}` }));
      children.push(new Paragraph({ text: `Intended consumer: ${p.intendedConsumer ?? ""}` }));
      children.push(new Paragraph({ text: `Packaging type: ${p.packagingType ?? ""}` }));
      children.push(new Paragraph({ text: `Shelf life & storage: ${p.shelfLifeAndStorage ?? ""}` }));
      children.push(new Paragraph({ text: "" }));
    }
  }

  // --- 3. GMPs & Prerequisite Programs ------------------------------------
  children.push(new Paragraph({ text: "3. GMPs & Prerequisite Programs", heading: HeadingLevel.HEADING_1 }));
  const gmpSops = plan.sops.filter((s) => getTemplate(s.templateKey)?.category === "gmp");
  if (gmpSops.length === 0) {
    children.push(new Paragraph({ text: "No GMP / prerequisite program documents have been generated yet." }));
  } else {
    for (const sop of gmpSops) {
      children.push(...markdownToParagraphs(sop.content));
      children.push(new Paragraph({ text: "" }));
    }
  }

  // --- 4. Process Flow & Hazard Analysis (per product) --------------------
  children.push(new Paragraph({ text: "4. Process Flow & Hazard Analysis", heading: HeadingLevel.HEADING_1 }));

  for (const product of products) {
    children.push(new Paragraph({ text: product.name, heading: HeadingLevel.HEADING_2 }));

    const steps = [...product.processSteps].sort((a, b) => a.order - b.order);
    if (steps.length === 0) {
      children.push(new Paragraph({ text: "No process steps recorded for this product." }));
      continue;
    }

    for (const step of steps) {
      children.push(new Paragraph({ text: `Step ${step.order}: ${step.name}` }));
      if (step.description) children.push(new Paragraph({ text: step.description }));

      if (step.hazards.length === 0) {
        children.push(new Paragraph({ text: "No hazards recorded for this step." }));
        continue;
      }

      const rows = [
        headerRow(
          ["Hazard type", "Description", "Sig.?", "CCP status", "Critical limit", "Monitoring"],
          [12, 26, 8, 12, 20, 22]
        ),
        ...step.hazards.map(
          (h) =>
            new TableRow({
              children: [
                cell(h.type),
                cell(h.description),
                cell(h.requiresPreventiveControl ? "Yes" : "No"),
                cell(h.ccpStatus),
                cell(h.criticalLimit ?? "—"),
                cell(h.monitoringProcedure ?? "—"),
              ],
            })
        ),
      ];

      children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(new Paragraph({ text: "" }));
    }
  }

  // --- 5. Preventive Controls Detail (per product) ------------------------
  children.push(new Paragraph({ text: "5. Preventive Controls Detail", heading: HeadingLevel.HEADING_1 }));
  const anyCcps = products.some((p) => p.processSteps.some((s) => s.hazards.some((h) => h.ccpStatus === "CCP" || h.ccpStatus === "PRW")));
  if (!anyCcps) {
    children.push(new Paragraph({ text: "No critical control points or process preventive controls have been designated yet." }));
  } else {
    for (const product of products) {
      const ccpHazards = product.processSteps.flatMap((s) => s.hazards.filter((h) => h.ccpStatus === "CCP" || h.ccpStatus === "PRW"));
      if (ccpHazards.length === 0) continue;

      children.push(new Paragraph({ text: product.name, heading: HeadingLevel.HEADING_2 }));
      for (const h of ccpHazards) {
        children.push(new Paragraph({ text: h.description, heading: HeadingLevel.HEADING_3 }));
        children.push(new Paragraph({ text: `Status: ${h.ccpStatus}` }));
        children.push(new Paragraph({ text: `Critical limit: ${h.criticalLimit ?? "—"}` }));
        children.push(new Paragraph({ text: `Monitoring procedure: ${h.monitoringProcedure ?? "—"}` }));
        children.push(new Paragraph({ text: `Monitoring frequency: ${h.monitoringFrequency ?? "—"}` }));
        children.push(new Paragraph({ text: `Corrective action: ${h.correctionAction ?? "—"}` }));
        children.push(new Paragraph({ text: `Verification procedure: ${h.verificationProcedure ?? "—"}` }));
        children.push(new Paragraph({ text: `Recordkeeping: ${h.recordkeepingProcedure ?? "—"}` }));
        children.push(new Paragraph({ text: `Responsible party: ${h.responsibleParty ?? "—"}` }));
        children.push(new Paragraph({ text: "" }));
      }
    }
  }

  // --- 6. Recall Plan ------------------------------------------------------
  children.push(new Paragraph({ text: "6. Recall Plan", heading: HeadingLevel.HEADING_1 }));

  children.push(new Paragraph({ text: "Recall Team", heading: HeadingLevel.HEADING_2 }));
  if (plan.recallContacts.length === 0) {
    children.push(new Paragraph({ text: "No recall team members have been assigned yet." }));
  } else {
    const rows = [
      headerRow(["Role", "Name", "Phone", "Email"], [25, 25, 20, 30]),
      ...plan.recallContacts.map(
        (c) =>
          new TableRow({
            children: [cell(c.role), cell(c.name), cell(c.phone ?? "—"), cell(c.email ?? "—")],
          })
      ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }
  children.push(new Paragraph({ text: "" }));

  children.push(new Paragraph({ text: "Mock Recall Log (Annual)", heading: HeadingLevel.HEADING_2 }));
  if (plan.mockRecallRecords.length === 0) {
    children.push(
      new Paragraph({
        text: "No mock recall is on file yet. CFIA expects one to be performed and documented at least annually.",
      })
    );
  } else {
    const rows = [
      headerRow(["Date", "Performed by", "% traced", "Results summary"], [15, 20, 15, 50]),
      ...[...plan.mockRecallRecords]
        .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
        .map(
          (r) =>
            new TableRow({
              children: [
                cell(r.performedAt.toLocaleDateString("en-CA")),
                cell(r.performedBy ?? "—"),
                cell(r.percentTraced ?? "—"),
                cell(r.resultsSummary ?? "—"),
              ],
            })
        ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }
  children.push(new Paragraph({ text: "" }));

  const recallSop = plan.sops.find((s) => s.templateKey === "recall");
  if (recallSop) {
    children.push(...markdownToParagraphs(recallSop.content));
    children.push(new Paragraph({ text: "" }));
  }

  // --- 7. Food Safety SOPs -------------------------------------------------
  children.push(new Paragraph({ text: "7. Food Safety SOPs", heading: HeadingLevel.HEADING_1 }));
  const foodSafetySops = plan.sops.filter((s) => getTemplate(s.templateKey)?.category === "food_safety");
  if (foodSafetySops.length === 0) {
    children.push(new Paragraph({ text: "No additional food safety SOPs have been generated yet." }));
  } else {
    for (const sop of foodSafetySops) {
      children.push(...markdownToParagraphs(sop.content));
      children.push(new Paragraph({ text: "" }));
    }
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      text:
        "This document was drafted with the assistance of PCP Planner and should be reviewed and signed off by the individual(s) responsible for food safety at your facility before use.",
    })
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
