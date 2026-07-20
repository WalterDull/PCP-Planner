"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EMPTY_FACILITY_PROFILE, type FacilityProfile } from "@/types";

const FIELDS: { key: keyof FacilityProfile; label: string; help: string; textarea?: boolean }[] = [
  { key: "facilityName", label: "Facility name", help: "Legal or operating name of the facility making this product." },
  { key: "address", label: "Facility address", help: "Physical address where production occurs." },
  {
    key: "foodCategories",
    label: "Food product categories (general summary)",
    help: "A general summary of what this facility produces, e.g. \"ready-to-eat smoked fish, baked goods\". You'll list and describe each individual product on the Products step.",
  },
  {
    key: "cfiaLicenseNumber",
    label: "CFIA licence number",
    help: "If your facility is federally licensed under the Safe Food for Canadians Regulations (SFCR), enter it here. Leave blank if not yet licensed or not applicable.",
  },
  {
    key: "responsibleIndividual",
    label: "Responsible individual",
    help: "Name and title of the person responsible for developing and maintaining this Preventive Control Plan.",
  },
  { key: "responsibleIndividualContact", label: "Responsible individual — contact info", help: "Email or phone for the responsible individual." },
];

export default function FacilityProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<FacilityProfile>(EMPTY_FACILITY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    fetch(`/api/plans/${params.id}`)
      .then((r) => r.json())
      .then((plan) => {
        if (plan.facilityProfile) setProfile({ ...EMPTY_FACILITY_PROFILE, ...plan.facilityProfile });
        setLoading(false);
      });
  }, [params.id]);

  async function save() {
    setSaving(true);
    await fetch(`/api/plans/${params.id}/facility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSavedAt(new Date());
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 1: Facility Profile</h1>
      <p className="mt-1 text-sm text-slate-600">
        This information appears at the top of your plan and is used to auto-fill your GMPs and SOPs
        later. You can leave fields blank and come back anytime — nothing here is final.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700">Regulatory scope</label>
          <p className="text-xs text-slate-500">
            This determines which health authority this plan is written for.
          </p>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={profile.regulatoryScope}
            onChange={(e) => setProfile({ ...profile, regulatoryScope: e.target.value as FacilityProfile["regulatoryScope"] })}
          >
            <option value="CFIA_SFCR">
              CFIA — federally licensed under the Safe Food for Canadians Regulations (SFCR)
            </option>
            <option value="PROVINCIAL_MUNICIPAL">Provincial/municipal only (intra-provincial sales, not CFIA-licensed)</option>
            <option value="OTHER">Other / not sure yet</option>
          </select>
        </div>

        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-700">{f.label}</label>
            <p className="text-xs text-slate-500">{f.help}</p>
            {f.textarea ? (
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                value={profile[f.key] as string}
                onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
              />
            ) : (
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={profile[f.key] as string}
                onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedAt && <span className="text-xs text-slate-400">Saved {savedAt.toLocaleTimeString()}</span>}
        <Link href={`/plans/${params.id}/gmp`} className="text-sm font-medium text-brand-600">
          Next: GMPs & Prerequisite Programs →
        </Link>
      </div>
    </div>
  );
}
