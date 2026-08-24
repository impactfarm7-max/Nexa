"use client";

import { FormEvent, Suspense, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { supabase } from "@/app/utils/supabase";
import { fmtFCFA } from "@/app/utils/reports-export";
import ReportsShell from "../components/ReportsShell";
import ReportKpiGrid from "../components/ReportKpiGrid";
import { useReportPage } from "../hooks/useReportPage";

type ProfitabilityReport = {
  totals: { collections: number; payroll: number; expenses: number; profit: number };
  rows: { campusId: string; campusName: string; collections: number; payroll: number; expenses: number; profit: number; marginPercent: number }[];
  expenses: { id: string; campus_id: string; campusName: string; expense_date: string; category: string; label: string; amount: number; notes: string | null }[];
  warnings: { unassignedCollections: number; unassignedPayroll: number };
};

const categories = ["loyer", "electricite", "internet", "materiel", "transport", "entretien", "marketing", "autre"];

function ProfitabilityContent() {
  const { loading, error, report, campuses, centerType, from, to, campusId, setFilter, setPeriodRange, periodLabel, reload } = useReportPage<ProfitabilityReport>("rentabilite-campus");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [form, setForm] = useState({ campus_id: "", expense_date: new Date().toISOString().slice(0, 10), category: "loyer", label: "", amount: "", notes: "" });

  async function authenticatedFetch(url: string, init: RequestInit) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session expirée.");
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...(init.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Action impossible.");
  }

  async function addExpense(event: FormEvent) {
    event.preventDefault(); setSaving(true); setActionError("");
    try {
      await authenticatedFetch("/api/center/reports/rentabilite-campus", { method: "POST", body: JSON.stringify(form) });
      setForm((current) => ({ ...current, label: "", amount: "", notes: "" }));
      await reload();
    } catch (e) { setActionError(e instanceof Error ? e.message : "Action impossible."); }
    finally { setSaving(false); }
  }

  async function removeExpense(id: string) {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    setActionError("");
    try { await authenticatedFetch(`/api/center/reports/rentabilite-campus?id=${encodeURIComponent(id)}`, { method: "DELETE" }); await reload(); }
    catch (e) { setActionError(e instanceof Error ? e.message : "Action impossible."); }
  }

  if (loading && !report) return <CenterPageLoading />;
  return (
    <ReportsShell activeSlug="rentabilite-campus" centerType={centerType} title="Rentabilité par campus" periodLabel={periodLabel} dateFrom={from} dateTo={to} onPeriodChange={setPeriodRange} campusId={campusId} filiereId="" campuses={campuses} filieres={[]} onFilter={setFilter}>
      {(error || actionError) && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || actionError}</div>}
      {loading && <div className="flex items-center gap-2 text-sm text-neutral-400"><Loader2 size={16} className="animate-spin" /> Actualisation…</div>}
      {report && <>
        <ReportKpiGrid items={[
          { label: "Encaissements", value: fmtFCFA(report.totals.collections), sub: periodLabel },
          { label: "Masse salariale", value: fmtFCFA(report.totals.payroll) },
          { label: "Autres dépenses", value: fmtFCFA(report.totals.expenses) },
          { label: "Bénéfice net", value: fmtFCFA(report.totals.profit) },
        ]} />
        {(report.warnings.unassignedCollections > 0 || report.warnings.unassignedPayroll > 0) && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Certaines données ne sont pas affectées à un campus : encaissements {fmtFCFA(report.warnings.unassignedCollections)}, masse salariale {fmtFCFA(report.warnings.unassignedPayroll)}.</div>}
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[760px] text-sm"><thead className="bg-neutral-50 text-left text-neutral-500"><tr>{["Campus", "Encaissements", "Masse salariale", "Dépenses", "Bénéfice net", "Marge"].map((x) => <th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody>{report.rows.map((row) => <tr key={row.campusId} className="border-t border-neutral-100"><td className="px-4 py-3 font-semibold">{row.campusName}</td><td className="px-4 py-3">{fmtFCFA(row.collections)}</td><td className="px-4 py-3">{fmtFCFA(row.payroll)}</td><td className="px-4 py-3">{fmtFCFA(row.expenses)}</td><td className={`px-4 py-3 font-bold ${row.profit < 0 ? "text-red-600" : "text-emerald-700"}`}>{fmtFCFA(row.profit)}</td><td className="px-4 py-3">{row.marginPercent.toFixed(1)} %</td></tr>)}</tbody></table>
        </div>
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h2 className="text-lg font-bold text-[#0E255B]">Ajouter une dépense de campus</h2>
          <p className="mt-1 text-sm text-neutral-500">Loyer, électricité, Internet, matériel et autres charges d’exploitation.</p>
          <form onSubmit={addExpense} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <select required value={form.campus_id} onChange={(e) => setForm({ ...form, campus_id: e.target.value })} className="h-11 rounded-xl border border-neutral-200 px-3"><option value="">Choisir un campus</option>{campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <input required type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="h-11 rounded-xl border border-neutral-200 px-3" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 rounded-xl border border-neutral-200 px-3">{categories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select>
            <input required placeholder="Libellé" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="h-11 rounded-xl border border-neutral-200 px-3" />
            <input required min="1" type="number" placeholder="Montant FCFA" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-11 rounded-xl border border-neutral-200 px-3" />
            <input placeholder="Note facultative" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-11 rounded-xl border border-neutral-200 px-3 lg:col-span-2" />
            <button disabled={saving} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0E255B] px-4 font-semibold text-white disabled:opacity-50"><Plus size={17} /> {saving ? "Enregistrement…" : "Ajouter"}</button>
          </form>
        </section>
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="border-b border-neutral-100 px-5 py-4"><h2 className="font-bold text-[#0E255B]">Dépenses de la période</h2></div>{report.expenses.length === 0 ? <p className="p-5 text-sm text-neutral-500">Aucune dépense enregistrée.</p> : <div className="divide-y divide-neutral-100">{report.expenses.map((expense) => <div key={expense.id} className="flex items-center gap-3 px-5 py-3"><div className="min-w-0 flex-1"><p className="font-semibold text-neutral-800">{expense.label}</p><p className="text-xs text-neutral-500">{expense.campusName} · {expense.expense_date} · {expense.category}</p></div><span className="font-bold">{fmtFCFA(expense.amount)}</span><button onClick={() => void removeExpense(expense.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Supprimer"><Trash2 size={17} /></button></div>)}</div>}</section>
      </>}
    </ReportsShell>
  );
}

export default function ProfitabilityPage() { return <Suspense fallback={<CenterPageLoading />}><ProfitabilityContent /></Suspense>; }
