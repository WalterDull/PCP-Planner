"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TemplateDocsEditor from "@/components/TemplateDocsEditor";
import { SUGGESTED_RECALL_ROLES } from "@/types";

interface RecallContact {
  id: string;
  role: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface MockRecallRecord {
  id: string;
  performedAt: string;
  performedBy: string | null;
  percentTraced: string | null;
  resultsSummary: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function RecallPage({ params }: { params: { id: string } }) {
  const [contacts, setContacts] = useState<RecallContact[]>([]);
  const [records, setRecords] = useState<MockRecallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [newRole, setNewRole] = useState(SUGGESTED_RECALL_ROLES[0]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [mrDate, setMrDate] = useState(todayIso());
  const [mrBy, setMrBy] = useState("");
  const [mrPercent, setMrPercent] = useState("");
  const [mrSummary, setMrSummary] = useState("");

  async function refresh() {
    const [contactsRes, recordsRes] = await Promise.all([
      fetch(`/api/plans/${params.id}/recall-contacts`),
      fetch(`/api/plans/${params.id}/mock-recalls`),
    ]);
    setContacts(await contactsRes.json());
    setRecords(await recordsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function addContact() {
    if (!newName.trim()) return;
    await fetch(`/api/plans/${params.id}/recall-contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole, name: newName, phone: newPhone, email: newEmail }),
    });
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    refresh();
  }

  async function updateContact(id: string, data: Partial<RecallContact>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    await fetch(`/api/plans/${params.id}/recall-contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function removeContact(id: string) {
    await fetch(`/api/plans/${params.id}/recall-contacts/${id}`, { method: "DELETE" });
    refresh();
  }

  async function addMockRecall() {
    await fetch(`/api/plans/${params.id}/mock-recalls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        performedAt: mrDate,
        performedBy: mrBy,
        percentTraced: mrPercent,
        resultsSummary: mrSummary,
      }),
    });
    setMrBy("");
    setMrPercent("");
    setMrSummary("");
    refresh();
  }

  async function removeMockRecall(id: string) {
    await fetch(`/api/plans/${params.id}/mock-recalls/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  const sortedRecords = [...records].sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  const latest = sortedRecords[0];
  let dueMessage: { text: string; overdue: boolean } | null = null;
  if (!latest) {
    dueMessage = { text: "No mock recall on file yet. CFIA expects one to be performed and documented at least annually.", overdue: true };
  } else {
    const nextDue = new Date(latest.performedAt);
    nextDue.setFullYear(nextDue.getFullYear() + 1);
    const overdue = nextDue.getTime() < Date.now();
    dueMessage = {
      text: overdue
        ? `Overdue: last mock recall was ${new Date(latest.performedAt).toLocaleDateString("en-CA")}. A new one is due.`
        : `Next mock recall due by ${nextDue.toLocaleDateString("en-CA")}.`,
      overdue,
    };
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Step 8: Recall Plan</h1>
      <p className="mt-1 text-sm text-slate-600">
        Assign roles and contact information for the people who would carry out a recall, and log
        your mock recalls — CFIA expects a mock recall to be performed and documented at least
        annually.
      </p>

      <h2 className="mt-6 font-semibold text-slate-900">Recall Team</h2>
      <div className="mt-2 space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-3">
            <input
              className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={c.role}
              onChange={(e) => updateContact(c.id, { role: e.target.value })}
            />
            <input
              className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm"
              placeholder="Name"
              value={c.name}
              onChange={(e) => updateContact(c.id, { name: e.target.value })}
            />
            <input
              className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm"
              placeholder="Phone"
              value={c.phone ?? ""}
              onChange={(e) => updateContact(c.id, { phone: e.target.value })}
            />
            <input
              className="w-52 rounded-md border border-slate-300 px-2 py-1 text-sm"
              placeholder="Email"
              value={c.email ?? ""}
              onChange={(e) => updateContact(c.id, { email: e.target.value })}
            />
            <button onClick={() => removeContact(c.id)} className="ml-auto text-xs font-medium text-red-500 hover:text-red-700">
              Remove
            </button>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-sm text-slate-500">No recall team members added yet.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-slate-300 p-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Role</label>
          <select
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          >
            {SUGGESTED_RECALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="">Custom…</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Name</label>
          <input className="mt-1 w-40 rounded-md border border-slate-300 px-2 py-1 text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Phone</label>
          <input className="mt-1 w-32 rounded-md border border-slate-300 px-2 py-1 text-sm" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Email</label>
          <input className="mt-1 w-48 rounded-md border border-slate-300 px-2 py-1 text-sm" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </div>
        <button onClick={addContact} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          + Add
        </button>
      </div>

      <h2 className="mt-8 font-semibold text-slate-900">Mock Recall Log</h2>
      <p
        className={`mt-1 rounded-md px-3 py-2 text-sm ${
          dueMessage?.overdue ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"
        }`}
      >
        {dueMessage?.text}
      </p>

      <div className="mt-3 space-y-2">
        {sortedRecords.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
            <span className="font-medium">{new Date(r.performedAt).toLocaleDateString("en-CA")}</span>
            <span className="text-slate-500">{r.performedBy ?? "—"}</span>
            <span className="text-slate-500">{r.percentTraced ?? "—"}</span>
            <span className="flex-1 text-slate-500">{r.resultsSummary ?? ""}</span>
            <button onClick={() => removeMockRecall(r.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
              Remove
            </button>
          </div>
        ))}
        {sortedRecords.length === 0 && <p className="text-sm text-slate-500">No mock recalls logged yet.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-slate-300 p-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Date performed</label>
          <input
            type="date"
            className="mt-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={mrDate}
            onChange={(e) => setMrDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Performed by</label>
          <input className="mt-1 w-40 rounded-md border border-slate-300 px-2 py-1 text-sm" value={mrBy} onChange={(e) => setMrBy(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">% traced</label>
          <input className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1 text-sm" placeholder="e.g. 98%" value={mrPercent} onChange={(e) => setMrPercent(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600">Results summary</label>
          <input className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm" value={mrSummary} onChange={(e) => setMrSummary(e.target.value)} />
        </div>
        <button onClick={addMockRecall} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          + Log mock recall
        </button>
      </div>

      <h2 className="mt-8 font-semibold text-slate-900">Recall Plan Document</h2>
      <p className="mt-1 text-sm text-slate-600">
        Generate the written Recall Plan — it pulls in the team and mock recall history above
        automatically. Regenerate any time after changing the team or logging a new mock recall.
      </p>
      <div className="mt-3">
        <TemplateDocsEditor planId={params.id} category="recall" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Link href={`/plans/${params.id}/preventive-controls`} className="text-sm font-medium text-slate-500">
          ← Back
        </Link>
        <Link href={`/plans/${params.id}/sops`} className="text-sm font-medium text-brand-600">
          Next: SOPs →
        </Link>
      </div>
    </div>
  );
}
