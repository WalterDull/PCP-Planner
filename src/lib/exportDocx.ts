import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TableLayoutType,
  TextRun,
  TableOfContents,
  Footer,
  PageNumber,
  AlignmentType,
} from "docx";
import type { Plan, Product, ProcessStep, Hazard, Sop, RecallContact, MockRecallRecord, Vendor } from "@prisma/client";
import type { FacilityProfile } from "@/types";
import { getTemplate } from "@/lib/sopTemplates";

type PlanWithRelations = Plan & {
  products: (Product & { processSteps: (ProcessStep & { hazards: Hazard[] })[] })[];
  vendors: Vendor[];
  sops: Sop[];
  recallContacts: RecallContact[];
  mockRecallRecords: MockRecallRecord[];
};

const REGULATORY_SCOPE_LABEL: Record<string, string> = {
  CFIA_SFCR: "CFIA — federally licensed under the Safe Food for Canadians Regulations (SFCR)",
  PROVINCIAL_MUNICIPAL: "Provincial/municipal only (intra-provincial sales)",
  OTHER: "Other",
};

// Usable content width on a US-Letter page with 1" margins, in DXA
// (twentieths of a point; 1440 DXA = 1 inch). Column widths are specified in
// absolute DXA with a FIXED table layout — this is what stops Word from
// collapsing columns to one character wide, which happens when cell widths
// are omitted or given only as percentages under an auto layout.
const CONTENT_WIDTH_DXA = 9360;

function pctToDxa(pcts: number[]): number[] {
  return pcts.map((p) => Math.round((CONTENT_WIDTH_DXA * p) / 100));
}

function cell(text: string, opts: { bold?: boolean; widthDxa?: number } = {}) {
  return new TableCell({
    width: opts.widthDxa ? { size: opts.widthDxa, type: WidthType.DXA } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function headerRow(labels: string[], widthsDxa: number[]) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => cell(l, { bold: true, widthDxa: widthsDxa[i] })),
  });
}

function dataRow(values: string[], widthsDxa: number[]) {
  return new TableRow({
    children: values.map((v, i) => cell(v, { widthDxa: widthsDxa[i] })),
  });
}

function makeTable(widthsDxa: number[], rows: TableRow[]): Table {
  return new Table({
    rows,
    columnWidths: widthsDxa,
    layout: TableLayoutType.FIXED,
    width: { size: widthsDxa.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  });
}

const HEADING_BY_LEVEL = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

function headingForLevel(level: number) {
  return HEADING_BY_LEVEL[Math.min(Math.max(level, 1), 6) - 1];
}

// A top-level (numbered) plan section. Heading 1 so it appears in the index;
// starts on a fresh page so the document reads as distinct sections.
function sectionHeading(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, pageBreakBefore: true });
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|");
}

function isSeparatorRow(line: string): boolean {
  const t = line.trim();
  return /^\|?[\s:|-]*-[\s:|-]*$/.test(t) && t.includes("-");
}

function parseCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

// Renders a template's markdown-ish text into docx blocks, turning pipe
// tables (| a | b |) into real, properly-sized docx tables and everything
// else into paragraphs/headings. `demote` pushes the document's own headings
// down N levels so, e.g., an SOP rendered inside the "GMPs" section becomes a
// Heading 2 sub-section (its title shows in the index) rather than a top-level
// Heading 1 competing with the main sections.
function markdownToBlocks(md: string, demote = 0): (Paragraph | Table)[] {
  const lines = md.split("\n");
  const blocks: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isTableRow(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const header = parseCells(line);
      const bodyLines: string[] = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]) && !isSeparatorRow(lines[j])) {
        bodyLines.push(lines[j]);
        j++;
      }
      const ncols = header.length;
      const widths = pctToDxa(Array.from({ length: ncols }, () => 100 / ncols));
      const rows = [
        headerRow(header, widths),
        ...bodyLines.map((bl) => {
          const cells = parseCells(bl);
          while (cells.length < ncols) cells.push("");
          return dataRow(cells.slice(0, ncols), widths);
        }),
      ];
      blocks.push(makeTable(widths, rows));
      i = j;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(new Paragraph({ text: line.replace("# ", ""), heading: headingForLevel(1 + demote) }));
    } else if (line.startsWith("## ")) {
      blocks.push(new Paragraph({ text: line.replace("## ", ""), heading: headingForLevel(2 + demote) }));
    } else if (line.startsWith("### ")) {
      blocks.push(new Paragraph({ text: line.replace("### ", ""), heading: headingForLevel(3 + demote) }));
    } else if (line.trim().length === 0) {
      blocks.push(new Paragraph({ text: "" }));
    } else {
      blocks.push(new Paragraph({ text: line }));
    }
    i++;
  }

  return blocks;
}

export async function buildPlanDocx(plan: PlanWithRelations): Promise<Buffer> {
  // facilityProfile is stored as a serialized JSON string (SQLite has no
  // native Json column type).
  const facility: Partial<FacilityProfile> = plan.facilityProfile ? JSON.parse(plan.facilityProfile) : {};
  const products = [...plan.products].sort((a, b) => a.order - b.order);

  const children: (Paragraph | Table | TableOfContents)[] = [];

  // --- Title page + index --------------------------------------------------
  children.push(
    new Paragraph({ text: "Preventive Control Plan", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: plan.name, heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: "" }),
    // "Contents" is a plain bold label (not a heading) so it doesn't list
    // itself in the index below.
    new Paragraph({ children: [new TextRun({ text: "Contents", bold: true, size: 28 })] }),
    // Real Word table-of-contents field: lists Heading 1 (main sections) and
    // Heading 2 (each product, GMP, and SOP) with page numbers and clickable
    // links. Populates when the document opens (updateFields is set below).
    new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" })
  );

  // --- 1. Facility Profile -------------------------------------------------
  children.push(
    sectionHeading("1. Facility Profile"),
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
  children.push(sectionHeading("2. Products"));
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

  // --- 3. Approved Suppliers ----------------------------------------------
  children.push(sectionHeading("3. Approved Suppliers"));
  const vendors = [...plan.vendors].sort((a, b) => a.order - b.order);
  if (vendors.length === 0) {
    children.push(new Paragraph({ text: "No vendors/suppliers have been added to this plan yet." }));
  } else {
    const vendorWidths = pctToDxa([20, 26, 12, 14, 14, 14]);
    const rows = [
      headerRow(["Vendor", "Materials supplied", "Status", "Certification", "Guarantee", "Contact"], vendorWidths),
      ...vendors.map((v) =>
        dataRow(
          [
            v.name,
            v.materialsSupplied ?? "—",
            v.status,
            v.certification ?? "—",
            v.guaranteeOnFile ? `Yes${v.guaranteeExpiry ? ` (exp. ${v.guaranteeExpiry})` : ""}` : "No",
            [v.contactName, v.phone, v.email].filter(Boolean).join(", ") || "—",
          ],
          vendorWidths
        )
      ),
    ];
    children.push(makeTable(vendorWidths, rows));
  }
  children.push(new Paragraph({ text: "" }));

  // --- 4. GMPs & Prerequisite Programs ------------------------------------
  children.push(sectionHeading("4. GMPs & Prerequisite Programs"));
  const gmpSops = plan.sops.filter((s) => getTemplate(s.templateKey)?.category === "gmp");
  if (gmpSops.length === 0) {
    children.push(new Paragraph({ text: "No GMP / prerequisite program documents have been generated yet." }));
  } else {
    for (const sop of gmpSops) {
      children.push(...markdownToBlocks(sop.content, 1));
      children.push(new Paragraph({ text: "" }));
    }
  }

  // --- 5. Process Flow & Hazard Analysis (per product) --------------------
  children.push(sectionHeading("5. Process Flow & Hazard Analysis"));

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

      const hazardWidths = pctToDxa([12, 26, 8, 12, 20, 22]);
      const rows = [
        headerRow(
          ["Hazard type", "Description", "Sig.?", "CCP status", "Critical limit", "Monitoring"],
          hazardWidths
        ),
        ...step.hazards.map((h) =>
          dataRow(
            [
              h.type,
              h.description,
              h.requiresPreventiveControl ? "Yes" : "No",
              h.ccpStatus,
              h.criticalLimit ?? "—",
              h.monitoringProcedure ?? "—",
            ],
            hazardWidths
          )
        ),
      ];

      children.push(makeTable(hazardWidths, rows));
      children.push(new Paragraph({ text: "" }));
    }
  }

  // --- 6. Preventive Controls Detail (per product) ------------------------
  children.push(sectionHeading("6. Preventive Controls Detail"));
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

  // --- 7. Recall Plan ------------------------------------------------------
  children.push(sectionHeading("7. Recall Plan"));

  children.push(new Paragraph({ text: "Recall Team", heading: HeadingLevel.HEADING_2 }));
  if (plan.recallContacts.length === 0) {
    children.push(new Paragraph({ text: "No recall team members have been assigned yet." }));
  } else {
    const contactWidths = pctToDxa([25, 25, 20, 30]);
    const rows = [
      headerRow(["Role", "Name", "Phone", "Email"], contactWidths),
      ...plan.recallContacts.map((c) => dataRow([c.role, c.name, c.phone ?? "—", c.email ?? "—"], contactWidths)),
    ];
    children.push(makeTable(contactWidths, rows));
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
    const mockWidths = pctToDxa([15, 20, 15, 50]);
    const rows = [
      headerRow(["Date", "Performed by", "% traced", "Results summary"], mockWidths),
      ...[...plan.mockRecallRecords]
        .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
        .map((r) =>
          dataRow(
            [
              r.performedAt.toLocaleDateString("en-CA"),
              r.performedBy ?? "—",
              r.percentTraced ?? "—",
              r.resultsSummary ?? "—",
            ],
            mockWidths
          )
        ),
    ];
    children.push(makeTable(mockWidths, rows));
  }
  children.push(new Paragraph({ text: "" }));

  const recallSop = plan.sops.find((s) => s.templateKey === "recall");
  if (recallSop) {
    children.push(...markdownToBlocks(recallSop.content, 1));
    children.push(new Paragraph({ text: "" }));
  }

  // --- 8. Food Safety SOPs -------------------------------------------------
  children.push(sectionHeading("8. Food Safety SOPs"));
  const foodSafetySops = plan.sops.filter((s) => getTemplate(s.templateKey)?.category === "food_safety");
  if (foodSafetySops.length === 0) {
    children.push(new Paragraph({ text: "No additional food safety SOPs have been generated yet." }));
  } else {
    for (const sop of foodSafetySops) {
      children.push(...markdownToBlocks(sop.content, 1));
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
    // Tells Word to update fields (the table of contents) when the document is
    // opened, so the index shows the right page numbers without the reader
    // having to right-click and "Update field".
    features: { updateFields: true },
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun("Page "),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun(" of "),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
