"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GuidancePanel from "@/components/GuidancePanel";
import { VENDOR_STATUSES, type VendorData } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

export default function VendorsPage({ params }: { params: { id: string } }) {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  async function refresh() {
    const res = await fetch(`/api/plans/${params.id}/vendors`);
    setVendors(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function addVendor() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch(`/api/plans/${params.id}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const created = (await res.json()) as VendorData;
    setNewName("");
    setExpanded(created.id);
    refresh();
  }

  async function updateVendor(id: string, data: Partial<VendorData>) {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
    await fetch(`/api/plans/${params.id}/vendors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function removeVendor(id: string) {
    await fetch(`/api/plans/${params.id}/vendors/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 4: Vendors / Approved Suppliers</h1>
      <p className="mt-1 text-sm text-slate-600">
        List every supplier of ingredients, packaging, or food-contact materials. Add as many as
        you use — including more than one approved vendor for the same material, so a single
        supplier problem doesn&apos;t stop production. These feed the Approved Supplier List in your
        vendor-qualification and supplier-verification SOPs and your exported plan.
      </p>

      <div className="mt-4">
        <GuidancePanel title="What makes a vendor 'approved', and why keep backups" tone="info">
          <p>
            A vendor is approved once you&apos;ve reviewed its food safety documentation (e.g. GFSI
            certification, licence, specifications, allergen declarations) and hold a letter of
            guarantee. Set a vendor to <strong>Pending</strong> while you&apos;re still qualifying
            it, and <strong>Suspended</strong> if it has an unresolved non-conformance.
          </p>
          <p>
            Qualifying a second (or third) vendor for a critical ingredient <em>before</em> you need
            it is a resilience measure: single-source supply is a common vulnerability, and a
            qualified backup lets you switch without an unplanned production stop or an
            un-vetted supplier.
          </p>
        </GuidancePanel>
      </div>

      <div className="mt-6 space-y-3">
        {vendors.length === 0 && (
          <p className="text-sm text-slate-500">No vendors added yet — add your first supplier below.</p>
        )}
        {vendors.map((v) => {
          const isOpen = expanded === v.id;
          return (
            <div key={v.id} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 p-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                  className="flex-1 text-left"
                >
                  <span className="font-semibold text-slate-900">{v.name || "(unnamed vendor)"}</span>
                  {v.materialsSupplied && (
                    <span className="ml-2 text-xs text-slate-500">— {v.materialsSupplied}</span>
                  )}
                </button>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[v.status] ?? ""}`}>
                  {v.status}
                </span>
                <button onClick={() => setExpanded(isOpen ? null : v.id)} className="text-xs font-medium text-brand-600">
                  {isOpen ? "Close" : "Edit"}
                </button>
                <button onClick={() => removeVendor(v.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>

              {isOpen && (
                <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-600">
                    Vendor name
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={v.name}
                      onChange={(e) => updateVendor(v.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Status
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={v.status}
                      onChange={(e) => updateVendor(v.id, { status: e.target.value })}
                    >
                      {VENDOR_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                    Materials / ingredients supplied
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      placeholder="e.g. wheat flour, sea salt, corrugated cartons"
                      value={v.materialsSupplied ?? ""}
                      onChange={(e) => updateVendor(v.id, { materialsSupplied: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Contact name
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={v.contactName ?? ""}
                      onChange={(e) => updateVendor(v.id, { contactName: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Certification (GFSI, etc.)
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      placeholder="e.g. SQF, BRCGS, none"
                      value={v.certification ?? ""}
                      onChange={(e) => updateVendor(v.id, { certification: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Phone
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={v.phone ?? ""}
                      onChange={(e) => updateVendor(v.id, { phone: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Email
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={v.email ?? ""}
                      onChange={(e) => updateVendor(v.id, { email: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Approval date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={v.approvalDate ?? ""}
                      onChange={(e) => updateVendor(v.id, { approvalDate: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Letter of guarantee expiry
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={v.guaranteeExpiry ?? ""}
                      onChange={(e) => updateVendor(v.id, { guaranteeExpiry: e.target.value })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={v.guaranteeOnFile}
                      onChange={(e) => updateVendor(v.id, { guaranteeOnFile: e.target.checked })}
                    />
                    Signed letter of guarantee on file
                  </label>
                  <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                    Notes
                    <textarea
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      rows={2}
                      value={v.notes ?? ""}
                      onChange={(e) => updateVendor(v.id, { notes: e.target.value })}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="New vendor name — e.g. Prairie Mills Ltd."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addVendor()}
        />
        <button
          onClick={addVendor}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add vendor
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/products`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/process-flow`} className="text-sm font-medium text-brand-600">
          Next: Process Flow →
        </Link>
      </div>
    </div>
  );
}
