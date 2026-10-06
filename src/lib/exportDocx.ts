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
  Footer,
  PageNumber,
  AlignmentType,
  BookmarkStart,
  BookmarkEnd,
  type ParagraphChild,
  InternalHyperlink,
  PageBreak,
  LevelFormat,
  ShadingType,
  BorderStyle,
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
// Page size is set explicitly: docx-js defaults to A4, which is narrower
// than the 9360-DXA tables above, so tables ran past the right margin.
const PAGE_WIDTH_DXA = 12240; // 8.5"
const PAGE_HEIGHT_DXA = 15840; // 11"
const MARGIN_DXA = 1440; // 1"

function pctToDxa(pcts: number[]): number[] {
  return pcts.map((p) => Math.round((CONTENT_WIDTH_DXA * p) / 100));
}

function cell(text: string, opts: { bold?: boolean; widthDxa?: number; header?: boolean } = {}) {
  return new TableCell({
    width: opts.widthDxa ? { size: opts.widthDxa, type: WidthType.DXA } : undefined,
    shading: opts.header ? { type: ShadingType.CLEAR, color: "auto", fill: "E7EEF6" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ spacing: { after: 0 }, children: inlineRuns(text, { bold: opts.bold }) })],
  });
}

function headerRow(labels: string[], widthsDxa: number[]) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((l, i) => cell(l, { bold: true, header: true, widthDxa: widthsDxa[i] })),
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

// Splits `**bold**` markdown into real bold runs so asterisks never show up
// as literal text in the exported document.
function inlineRuns(text: string, base: { bold?: boolean } = {}): TextRun[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? new TextRun({ text: part.slice(2, -2), bold: true })
        : new TextRun({ text: part, bold: base.bold })
    );
}

function para(text: string): Paragraph {
  return new Paragraph({ children: inlineRuns(text) });
}

// Small gap after a table. Without a paragraph between them, two adjacent
// tables merge into one; it also keeps a heading from butting up against a
// table's bottom border.
function afterTable(): Paragraph {
  return new Paragraph({ text: "", spacing: { before: 0, after: 0 } });
}

type ContentsEntry = { level: 1 | 2; text: string; anchor: string };

// Collects the Heading 1 / Heading 2 entries as the body is built, so the
// Contents list on page 1 can be written out as plain, already-filled text.
//
// Why not a Word TOC field: a TOC field ships empty and relies on the
// application to rebuild it on open. Word does (after a prompt), but Pages,
// Google Docs and LibreOffice either leave it blank or rebuild it from every
// heading level with odd formatting. A static, hyperlinked list renders the
// same everywhere and is ordinary editable text.
class ContentsCollector {
  entries: ContentsEntry[] = [];
  private n = 0;

  heading(text: string, level: number): Paragraph {
    const heading = headingForLevel(level);
    if (level > 2) return new Paragraph({ heading, children: inlineRuns(text) });
    const clean = text.replace(/\*\*/g, "");
    const anchor = `section_${++this.n}`;
    this.entries.push({ level: level as 1 | 2, text: clean, anchor });
    // BookmarkStart/End with our own numeric id rather than docx's Bookmark
    // class, which gives every bookmark w:id="1" (invalid duplicate ids that
    // some readers reject or silently drop links for).
    return new Paragraph({
      heading,
      children: [
        new BookmarkStart(anchor, this.n) as unknown as ParagraphChild,
        new TextRun(clean),
        new BookmarkEnd(this.n) as unknown as ParagraphChild,
      ],
    });
  }

  render(): Paragraph[] {
    return this.entries.map(
      (e) =>
        new Paragraph({
          style: e.level === 1 ? "Contents1" : "Contents2",
          children: [
            new InternalHyperlink({
              anchor: e.anchor,
              children: [new TextRun({ text: e.text, bold: e.level === 1 })],
            }),
          ],
        })
    );
  }
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
// tables (| a | b |) into real, properly-sized docx tables, "- " lines into
// real bullets, and everything else into paragraphs/headings. `demote` pushes
// the document's own headings down N levels so, e.g., an SOP rendered inside
// the "GMPs" section becomes a Heading 2 sub-section (its title shows in the
// Contents) rather than a top-level Heading 1 competing with the main
// sections. Blank lines are dropped: spacing comes from the paragraph styles,
// not from empty paragraphs (which pile up into near-blank pages).
function markdownToBlocks(md: string, contents: ContentsCollector, demote = 0): (Paragraph | Table)[] {
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
      blocks.push(makeTable(widths, rows), afterTable());
      i = j;
      continue;
    }

    const bullet = line.match(/^(\s*)[-*] (.*)$/);
    const numbered = line.match(/^(\s*)(\d+)\. (.*)$/);

    if (line.startsWith("# ")) {
      blocks.push(contents.heading(line.slice(2), 1 + demote));
    } else if (line.startsWith("## ")) {
      blocks.push(contents.heading(line.slice(3), 2 + demote));
    } else if (line.startsWith("### ")) {
      blocks.push(contents.heading(line.slice(4), 3 + demote));
    } else if (line.trim().length === 0) {
      // skip — see note above
    } else if (bullet) {
      blocks.push(
        new Paragraph({
          numbering: { reference: "bullets", level: bullet[1].length >= 2 ? 1 : 0 },
          spacing: { after: 60 },
          children: inlineRuns(bullet[2]),
        })
      );
    } else if (numbered) {
      // Kept as typed numbers (not auto-numbering) so each SOP's steps start
      // at 1 and stay exactly as written when edited in any word processor.
      const nested = numbered[1].length >= 2;
      blocks.push(
        new Paragraph({
          indent: { left: nested ? 1080 : 360, hanging: 360 },
          spacing: { after: 60 },
          children: inlineRuns(`${numbered[2]}.\t${numbered[3]}`),
        })
      );
    } else {
      blocks.push(para(line));
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

  const contents = new ContentsCollector();
  const children: (Paragraph | Table)[] = [];
  const heading = (text: string, level: number) => contents.heading(text, level);


  // --- 1. Facility Profile -------------------------------------------------
  children.push(
    heading("1. Facility Profile", 1),
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
  );

  // --- 2. Products -----------------------------------------------------------
  children.push(heading("2. Products", 1));
  if (products.length === 0) {
    children.push(new Paragraph({ text: "No products have been added to this plan yet." }));
  } else {
    for (const p of products) {
      children.push(heading(p.name, 2));
      children.push(new Paragraph({ text: `Product description: ${p.productDescription ?? ""}` }));
      children.push(new Paragraph({ text: `Intended use: ${p.intendedUse ?? ""}` }));
      children.push(new Paragraph({ text: `Intended consumer: ${p.intendedConsumer ?? ""}` }));
      children.push(new Paragraph({ text: `Packaging type: ${p.packagingType ?? ""}` }));
      children.push(new Paragraph({ text: `Shelf life & storage: ${p.shelfLifeAndStorage ?? ""}` }));
    }
  }

  // --- 3. Approved Suppliers ----------------------------------------------
  children.push(heading("3. Approved Suppliers", 1));
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
    children.push(makeTable(vendorWidths, rows), afterTable());
  }

  // --- 4. GMPs & Prerequisite Programs ------------------------------------
  children.push(heading("4. GMPs & Prerequisite Programs", 1));
  const gmpSops = plan.sops.filter((s) => getTemplate(s.templateKey)?.category === "gmp");
  if (gmpSops.length === 0) {
    children.push(new Paragraph({ text: "No GMP / prerequisite program documents have been generated yet." }));
  } else {
    for (const sop of gmpSops) {
      children.push(...markdownToBlocks(sop.content, contents, 1));
    }
  }

  // --- 5. Process Flow & Hazard Analysis (per product) --------------------
  children.push(heading("5. Process Flow & Hazard Analysis", 1));

  for (const product of products) {
    children.push(heading(product.name, 2));

    const steps = [...product.processSteps].sort((a, b) => a.order - b.order);
    if (steps.length === 0) {
      children.push(new Paragraph({ text: "No process steps recorded for this product." }));
      continue;
    }

    for (const step of steps) {
      children.push(
        new Paragraph({ keepNext: true, children: [new TextRun({ text: `Step ${step.order}: ${step.name}`, bold: true })] })
      );
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

      children.push(makeTable(hazardWidths, rows), afterTable());
    }
  }

  // --- 6. Preventive Controls Detail (per product) ------------------------
  children.push(heading("6. Preventive Controls Detail", 1));
  const anyCcps = products.some((p) => p.processSteps.some((s) => s.hazards.some((h) => h.ccpStatus === "CCP" || h.ccpStatus === "PRW")));
  if (!anyCcps) {
    children.push(new Paragraph({ text: "No critical control points or process preventive controls have been designated yet." }));
  } else {
    for (const product of products) {
      const ccpHazards = product.processSteps.flatMap((s) => s.hazards.filter((h) => h.ccpStatus === "CCP" || h.ccpStatus === "PRW"));
      if (ccpHazards.length === 0) continue;

      children.push(heading(product.name, 2));
      for (const h of ccpHazards) {
        children.push(heading(h.description, 3));
        children.push(new Paragraph({ text: `Status: ${h.ccpStatus}` }));
        children.push(new Paragraph({ text: `Critical limit: ${h.criticalLimit ?? "—"}` }));
        children.push(new Paragraph({ text: `Monitoring procedure: ${h.monitoringProcedure ?? "—"}` }));
        children.push(new Paragraph({ text: `Monitoring frequency: ${h.monitoringFrequency ?? "—"}` }));
        children.push(new Paragraph({ text: `Corrective action: ${h.correctionAction ?? "—"}` }));
        children.push(new Paragraph({ text: `Verification procedure: ${h.verificationProcedure ?? "—"}` }));
        children.push(new Paragraph({ text: `Recordkeeping: ${h.recordkeepingProcedure ?? "—"}` }));
        children.push(new Paragraph({ text: `Responsible party: ${h.responsibleParty ?? "—"}` }));
      }
    }
  }

  // --- 7. Recall Plan ------------------------------------------------------
  children.push(heading("7. Recall Plan", 1));

  children.push(heading("Recall Team", 2));
  if (plan.recallContacts.length === 0) {
    children.push(new Paragraph({ text: "No recall team members have been assigned yet." }));
  } else {
    const contactWidths = pctToDxa([25, 25, 20, 30]);
    const rows = [
      headerRow(["Role", "Name", "Phone", "Email"], contactWidths),
      ...plan.recallContacts.map((c) => dataRow([c.role, c.name, c.phone ?? "—", c.email ?? "—"], contactWidths)),
    ];
    children.push(makeTable(contactWidths, rows), afterTable());
  }

  children.push(heading("Mock Recall Log (Annual)", 2));
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
    children.push(makeTable(mockWidths, rows), afterTable());
  }

  const recallSop = plan.sops.find((s) => s.templateKey === "recall");
  if (recallSop) {
    children.push(...markdownToBlocks(recallSop.content, contents, 1));
  }

  // --- 8. Food Safety SOPs -------------------------------------------------
  children.push(heading("8. Food Safety SOPs", 1));
  const foodSafetySops = plan.sops.filter((s) => getTemplate(s.templateKey)?.category === "food_safety");
  if (foodSafetySops.length === 0) {
    children.push(new Paragraph({ text: "No additional food safety SOPs have been generated yet." }));
  } else {
    for (const sop of foodSafetySops) {
      children.push(...markdownToBlocks(sop.content, contents, 1));
    }
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      text:
        "This document was drafted with the assistance of PCP Planner and should be reviewed and signed off by the individual(s) responsible for food safety at your facility before use.",
    })
  );

  // --- Title page + Contents (built last so it can list every heading) -----
  const frontMatter: Paragraph[] = [
    new Paragraph({ text: "Preventive Control Plan", heading: HeadingLevel.TITLE }),
    new Paragraph({ style: "PlanSubtitle", text: plan.name }),
    new Paragraph({ style: "ContentsLabel", text: "Contents" }),
    ...contents.render(),
    // One ordinary page break (not "page break before" baked into every
    // heading) so the plan body starts on page 2. It's a normal character:
    // deleting it in Word or Pages removes it.
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const doc = new Document({
    creator: "PCP Planner",
    title: `Preventive Control Plan — ${plan.name}`,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { after: 120, line: 264 } },
        },
        title: {
          run: { font: "Calibri", size: 52, bold: true, color: "1F4D78" },
          paragraph: { spacing: { after: 80 } },
        },
        // Explicit outline levels + keep-with-next: headings never strand at
        // the bottom of a page, and Pages/Word both recognise them as
        // headings for their own navigation and table-of-contents tools.
        heading1: {
          run: { font: "Calibri", size: 32, bold: true, color: "2E74B5" },
          paragraph: {
            spacing: { before: 480, after: 160 },
            keepNext: true,
            keepLines: true,
            outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E74B5", space: 4 } },
          },
        },
        heading2: {
          run: { font: "Calibri", size: 26, bold: true, color: "2E74B5" },
          paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, keepLines: true, outlineLevel: 1 },
        },
        heading3: {
          run: { font: "Calibri", size: 24, bold: true, color: "1F4D78" },
          paragraph: { spacing: { before: 240, after: 80 }, keepNext: true, keepLines: true, outlineLevel: 2 },
        },
        heading4: {
          run: { font: "Calibri", size: 22, bold: true, italics: true, color: "1F4D78" },
          paragraph: { spacing: { before: 200, after: 60 }, keepNext: true, keepLines: true, outlineLevel: 3 },
        },
      },
      paragraphStyles: [
        {
          id: "PlanSubtitle",
          name: "Plan Subtitle",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 32, color: "2E74B5" },
          paragraph: { spacing: { after: 480 } },
        },
        {
          id: "ContentsLabel",
          name: "Contents Heading",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 28, bold: true, color: "1F4D78" },
          paragraph: { spacing: { before: 240, after: 160 } },
        },
        {
          id: "Contents1",
          name: "Contents 1",
          basedOn: "Normal",
          next: "Normal",
          run: { color: "1F1F1F" },
          paragraph: { spacing: { before: 120, after: 20 }, keepNext: true },
        },
        {
          id: "Contents2",
          name: "Contents 2",
          basedOn: "Normal",
          next: "Normal",
          run: { color: "404040", size: 20 },
          paragraph: { indent: { left: 360 }, spacing: { after: 20 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "\u25E6",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
            margin: { top: MARGIN_DXA, right: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", size: 18, color: "808080" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" }),
                  new TextRun({ text: " of ", size: 18, color: "808080" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "808080" }),
                ],
              }),
            ],
          }),
        },
        children: [...frontMatter, ...children],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
