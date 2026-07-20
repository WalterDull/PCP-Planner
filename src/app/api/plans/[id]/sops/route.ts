import { NextResponse } from "next/server";
import { getCurrentUser, getOwnedPlan } from "@/lib/session";
import { db } from "@/lib/db";
import { SOP_TEMPLATES, getTemplate } from "@/lib/sopTemplates";
import type { FacilityProfile } from "@/types";
import { EMPTY_FACILITY_PROFILE } from "@/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sops = await db.sop.findMany({ where: { planId: owned.id } });
  return NextResponse.json({
    sops,
    availableTemplates: SOP_TEMPLATES.map((t) => ({ key: t.key, title: t.title, category: t.category })),
  });
}

// Generates (or regenerates) one SOP from a template, using the plan's
// current facility profile (and, for the recall template, its recall team
// and mock recall history) to fill in the blanks.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedPlan(params.id, user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const template = getTemplate(body.templateKey);
  if (!template) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  // facilityProfile is stored as a serialized JSON string (SQLite has no
  // native Json column type).
  const parsedProfile: Partial<FacilityProfile> = owned.facilityProfile ? JSON.parse(owned.facilityProfile) : {};
  const facility = { ...EMPTY_FACILITY_PROFILE, ...parsedProfile };

  // Only the recall template needs the recall team/mock-recall history, but
  // fetching them (and the product list) is cheap and keeps this route simple.
  const [products, recallContacts, mockRecallRecords] = await Promise.all([
    db.product.findMany({ where: { planId: owned.id }, orderBy: { order: "asc" } }),
    template.key === "recall"
      ? db.recallContact.findMany({ where: { planId: owned.id }, orderBy: { order: "asc" } })
      : Promise.resolve([]),
    template.key === "recall" ? db.mockRecallRecord.findMany({ where: { planId: owned.id } }) : Promise.resolve([]),
  ]);

  const content = template.render({
    facility,
    products: products.map((p) => ({ id: p.id, name: p.name })),
    recallContacts: recallContacts.map((c) => ({
      id: c.id,
      role: c.role,
      name: c.name,
      phone: c.phone,
      email: c.email,
      order: c.order,
    })),
    mockRecalls: mockRecallRecords.map((r) => ({
      id: r.id,
      performedAt: r.performedAt.toISOString(),
      performedBy: r.performedBy,
      percentTraced: r.percentTraced,
      resultsSummary: r.resultsSummary,
    })),
  });

  const existing = await db.sop.findFirst({ where: { planId: owned.id, templateKey: template.key } });
  const sop = existing
    ? await db.sop.update({ where: { id: existing.id }, data: { content, title: template.title } })
    : await db.sop.create({
        data: { planId: owned.id, templateKey: template.key, title: template.title, content },
      });

  return NextResponse.json(sop, { status: existing ? 200 : 201 });
}
