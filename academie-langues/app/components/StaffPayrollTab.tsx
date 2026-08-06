"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Loader2, Plus, Trash2, X, AlertTriangle,
  Download, Pencil, RotateCcw, CalendarDays, ClipboardList,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { downloadPayslipPdf } from "@/app/utils/centerPdfExport";
import { fetchDocumentExportConfig } from "@/app/utils/documentConfig";
import { AmountInWords } from "@/app/components/AmountInWords";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";
const SURFACE = "#F7F7F6";

type LineType = "prime" | "retenue" | "ajustement";

type PayrollLine = {
  id: string;
  type: LineType;
  amount: number;
  reason: string;
  created_at: string;
};

type PayrollPayment = {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string | null;
};

type Totals = {
  base: number;
  primes: number;
  retenues: number;
  brut: number;
  net: number;
  paid: number;
  reste: number;
};

type Period = {
  id: string;
  period_ym: string;
  base_salary_snapshot: number;
  status: "draft" | "validated" | "paid";
  notes: string | null;
};

function fmt(n: number, locale: "fr" | "en" = "fr") {
  return Math.round(n).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB");
}

function periodLabel(ym: string, locale: "fr" | "en" = "fr") {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" });
}

function currentYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validé",
  paid: "Payé",
};

const LINE_TITLE: Record<LineType, string> = {
  prime: "Prime",
  retenue: "Retenue",
  ajustement: "Ajustement",
};

const LINE_HINT: Record<LineType, string> = {
  prime: "Augmente le net à payer",
  retenue: "Diminue le net à payer",
  ajustement: "Complément positif sur le brut",
};

const METHOD_LABELS: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile money",
  virement: "Virement",
  cheque: "Chèque",
  autre: "Autre",
};

function PayrollSection({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] gap-5 sm:gap-8 py-8 border-b border-black/[0.06] first:pt-2 last:border-b-0">
      <div className="lg:sticky lg:top-4 self-start min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.06]"
            style={{ backgroundColor: SURFACE }}
          >
            <Icon size={18} style={{ color: BLUE }} />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: BLUE }}>
            {title}
          </h2>
        </div>
        <p className="text-sm text-neutral-500 mt-3 leading-relaxed font-medium">{description}</p>
        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="space-y-4 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6" style={{ backgroundColor: SURFACE }}>
        {children}
      </div>
    </section>
  );
}

type Props = {
  staff: {
    id: string;
    prenom: string;
    nom: string;
    base_salary: number;
    prime: number;
    job_title?: string | null;
  };
  centerId: string;
};

export default function StaffPayrollTab({ staff, centerId }: Props) {
  const { locale, t } = useI18n();
  const statusLabel = (status: string) => t("centre", status === "draft" ? "staffPayrollDraft" : status === "validated" ? "staffPayrollValidated" : status === "paid" ? "staffPayrollPaid" : status);
  const lineTitle = (type: LineType) => t("centre", type === "prime" ? "staffPayrollBonus" : type === "retenue" ? "staffPayrollDeduction" : "staffPayrollAdjustment");
  const lineHint = (type: LineType) => t("centre", type === "prime" ? "staffPayrollBonusHint" : type === "retenue" ? "staffPayrollDeductionHint" : "staffPayrollAdjustmentHint");
  const methodLabel = (method: string) => t("centre", method === "especes" ? "staffPayrollCash" : method === "mobile_money" ? "staffPayrollMobileMoney" : method === "virement" ? "staffPayrollTransfer" : method === "cheque" ? "staffPayrollCheck" : method === "autre" ? "staffPayrollOther" : method);
  const [periodYm, setPeriodYm] = useState(currentYm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [missingTable, setMissingTable] = useState(false);
  const [journalYear, setJournalYear] = useState(() => String(new Date().getFullYear()));

  const [contract, setContract] = useState({ base_salary: staff.base_salary, prime: staff.prime });
  const [period, setPeriod] = useState<Period | null>(null);
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [payments, setPayments] = useState<PayrollPayment[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [history, setHistory] = useState<{ id: string; period_ym: string; status: string }[]>([]);
  const [baseEdit, setBaseEdit] = useState("");

  const [lineOpen, setLineOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineType, setLineType] = useState<LineType>("prime");
  const [lineAmount, setLineAmount] = useState("");
  const [lineReason, setLineReason] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [editingPayId, setEditingPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("especes");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState("");

  const applyBundle = (json: {
    period?: Period | null;
    lines?: PayrollLine[];
    payments?: PayrollPayment[];
    totals?: Totals | null;
  }) => {
    if (json.period) {
      setPeriod(json.period as Period);
      setBaseEdit(String(Math.round(Number(json.period.base_salary_snapshot) || 0)));
    }
    if (json.lines) setLines(json.lines);
    if (json.payments) setPayments(json.payments);
    if (json.totals) setTotals(json.totals);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMissingTable(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch(
        `/api/center/staff-payroll?staff_id=${encodeURIComponent(staff.id)}&period=${encodeURIComponent(periodYm)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 503 || json.code === "MISSING_TABLE") {
        setMissingTable(true);
        setPeriod(null);
        setLines([]);
        setPayments([]);
        setTotals(null);
        return;
      }
      if (!res.ok) throw new Error(json.error || t("centre", "staffPayrollLoadError"));
      setContract(json.contract || { base_salary: staff.base_salary, prime: staff.prime });
      applyBundle(json);
      setHistory(json.history || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "staffPayrollError"));
    } finally {
      setLoading(false);
    }
  }, [staff.id, staff.base_salary, staff.prime, periodYm, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch("/api/center/staff-payroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 503 || json.code === "MISSING_TABLE") {
        setMissingTable(true);
        throw new Error(json.error || t("centre", "staffPayrollTablesMissing"));
      }
      if (!res.ok) throw new Error(json.error || t("centre", "staffPayrollActionError"));
      applyBundle(json);
      const histRes = await fetch(
        `/api/center/staff-payroll?staff_id=${encodeURIComponent(staff.id)}&period=${encodeURIComponent(periodYm)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const histJson = await histRes.json().catch(() => ({}));
      if (histRes.ok) {
        applyBundle(histJson);
        setHistory(histJson.history || []);
        if (histJson.contract) setContract(histJson.contract);
      }
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "staffPayrollError"));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openNewLine = (type: LineType) => {
    setEditingLineId(null);
    setLineType(type);
    setLineAmount("");
    setLineReason("");
    setLineOpen(true);
  };

  const openEditLine = (l: PayrollLine) => {
    setEditingLineId(l.id);
    setLineType(l.type);
    setLineAmount(String(Math.round(Number(l.amount))));
    setLineReason(l.reason);
    setLineOpen(true);
  };

  const submitLine = async () => {
    if (!period) return;
    if (!lineReason.trim()) {
      setError(t("centre", "staffPayrollReasonRequired"));
      return;
    }
    const ok = editingLineId
      ? await post({
          action: "update_line",
          line_id: editingLineId,
          type: lineType,
          amount: Number(lineAmount),
          reason: lineReason.trim(),
        })
      : await post({
          action: "add_line",
          period_id: period.id,
          type: lineType,
          amount: Number(lineAmount),
          reason: lineReason.trim(),
        });
    if (ok) {
      setLineOpen(false);
      setEditingLineId(null);
      setLineAmount("");
      setLineReason("");
    }
  };

  const openNewPay = () => {
    setEditingPayId(null);
    setPayAmount(totals ? String(totals.reste || totals.net || "") : "");
    setPayMethod("especes");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNotes("");
    setPayOpen(true);
  };

  const openEditPay = (p: PayrollPayment) => {
    setEditingPayId(p.id);
    setPayAmount(String(Math.round(Number(p.amount))));
    setPayMethod(p.payment_method || "especes");
    setPayDate(p.payment_date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    setPayNotes(p.notes || "");
    setPayOpen(true);
  };

  const submitPay = async () => {
    if (!period) return;
    const ok = editingPayId
      ? await post({
          action: "update_payment",
          payment_id: editingPayId,
          amount: Number(payAmount),
          payment_method: payMethod,
          payment_date: payDate,
          notes: payNotes.trim() || undefined,
        })
      : await post({
          action: "record_payment",
          period_id: period.id,
          amount: Number(payAmount),
          payment_method: payMethod,
          payment_date: payDate,
          notes: payNotes.trim() || undefined,
        });
    if (ok) {
      setPayOpen(false);
      setEditingPayId(null);
      setPayAmount("");
      setPayNotes("");
    }
  };

  const handleDownload = async () => {
    if (!totals || !period) return;
    setDownloading(true);
    try {
      const config = await fetchDocumentExportConfig(supabase, centerId).catch(() => undefined);
      await downloadPayslipPdf({
        staffName: `${staff.prenom} ${staff.nom}`,
        jobTitle: staff.job_title,
        periodYm,
        periodLabel: periodLabel(periodYm, locale),
        statusLabel: statusLabel(period.status),
        base: totals.base,
        primes: totals.primes,
        retenues: totals.retenues,
        brut: totals.brut,
        net: totals.net,
        paid: totals.paid,
        reste: totals.reste,
        lines,
        payments: payments.map((p) => ({
          ...p,
          payment_method: methodLabel(p.payment_method),
        })),
        config,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "staffPayrollDownloadError"));
    } finally {
      setDownloading(false);
    }
  };

  const yearOptions = useMemo(() => {
    const years = new Set(history.map((h) => h.period_ym.slice(0, 4)));
    years.add(String(new Date().getFullYear()));
    years.add(periodYm.slice(0, 4));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [history, periodYm]);

  const yearJournal = useMemo(() => {
    return history
      .filter((h) => h.period_ym.startsWith(journalYear))
      .slice()
      .sort((a, b) => b.period_ym.localeCompare(a.period_ym));
  }, [history, journalYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400 gap-2 text-sm font-medium">
        <Loader2 size={16} className="animate-spin" /> {t("centre", "staffPayrollLoading")}
      </div>
    );
  }

  if (missingTable) {
    return (
      <div className="max-w-lg mx-auto mt-10 rounded-xl border border-black/[0.06] bg-white p-6 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: BLUE }}>
          <AlertTriangle size={16} className="text-neutral-500" /> {t("centre", "staffPayrollSetupRequired")}
        </div>
        <p className="text-sm text-neutral-500 leading-relaxed font-medium">
          {t("centre", "staffPayrollSetupHelp", { file: "supabase-staff-payroll.sql" })}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <PayrollSection
        icon={CalendarDays}
        title={t("centre", "staffPayrollYearJournal")}
        description={t("centre", "staffPayrollYearJournalHelp")}
        actions={
          <select
            value={journalYear}
            onChange={(e) => setJournalYear(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 outline-none"
            aria-label={t("centre", "staffPayrollYear")}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      >
        {yearJournal.length === 0 ? (
          <p className="text-sm text-neutral-400 font-medium">
            {t("centre", "staffPayrollNoPeriodYear", { year: journalYear })}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/[0.06] bg-white">
            <table className="w-full text-left min-w-[28rem]">
              <thead>
                <tr className="border-b border-black/[0.06] bg-black/[0.015]">
                  <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Période</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Statut</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 w-[1%] whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {yearJournal.map((h) => {
                  const active = h.period_ym === periodYm;
                  return (
                    <tr key={h.id} className="border-b border-black/[0.04] last:border-0">
                      <td className="px-3.5 py-3">
                        <p className="text-sm font-semibold capitalize" style={{ color: BLUE }}>
                          {periodLabel(h.period_ym, locale)}
                        </p>
                        <p className="text-xs text-neutral-400 font-medium mt-0.5">{h.period_ym}</p>
                      </td>
                      <td className="px-3.5 py-3 text-sm font-medium text-neutral-600">
                        {statusLabel(h.status)}
                      </td>
                      <td className="px-3.5 py-3">
                        <button
                          type="button"
                          onClick={() => setPeriodYm(h.period_ym)}
                          className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center border transition-colors ${
                            active
                              ? "text-white border-transparent"
                              : "bg-white text-neutral-600 border-black/[0.08] hover:bg-black/[0.03]"
                          }`}
                          style={active ? { backgroundColor: BLUE } : undefined}
                        >
                          {active ? "Ouvert" : "Ouvrir"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PayrollSection>

      <PayrollSection
        icon={ClipboardList}
        title="Enregistrer"
        description={`Saisie du mois sélectionné — primes, retenues, versements et validation.`}
        actions={
          <>
            <input
              type="month"
              value={periodYm}
              onChange={(e) => setPeriodYm(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 outline-none"
            />
            <button
              type="button"
              onClick={handleDownload}
              disabled={!totals || downloading}
              className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              PDF
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-extrabold tracking-tight capitalize" style={{ color: BLUE }}>
              {periodLabel(periodYm, locale)}
            </p>
            <p className="text-sm text-neutral-500 font-medium mt-0.5">
              {staff.prenom} {staff.nom}
              {period ? ` · ${statusLabel(period.status)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {period?.status === "draft" && (
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: BLUE }}
                onClick={() => void post({ action: "set_status", period_id: period.id, status: "validated" })}
              >
                Valider
              </button>
            )}
            {period && period.status !== "draft" && (
              <button
                type="button"
                className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 inline-flex items-center gap-1.5"
                onClick={() => void post({ action: "reopen", period_id: period.id })}
              >
                <RotateCcw size={12} /> Rouvrir
              </button>
            )}
          </div>
        </div>

        {totals && (
          <div className="rounded-lg border border-black/[0.06] bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Net à payer</p>
                <p className="text-2xl font-extrabold tracking-tight tabular-nums mt-1" style={{ color: BLUE }}>
                  {fmt(totals.net, locale)}
                  <span className="text-sm text-neutral-400 ml-1.5 font-semibold">XAF</span>
                </p>
              </div>
              <div className="text-right text-sm text-neutral-500 font-medium space-y-0.5">
                <p>Versé <span className="text-neutral-800 tabular-nums font-semibold">{fmt(totals.paid, locale)}</span></p>
                <p>
                  Reste{" "}
                  <span className={`tabular-nums font-semibold ${totals.reste > 0 ? "text-neutral-900" : "text-neutral-500"}`}>
                    {totals.reste > 0 ? fmt(totals.reste, locale) : t("centre", "financeAccountSettled")}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Base</p>
                <p className="tabular-nums font-semibold mt-0.5" style={{ color: BLUE }}>{fmt(totals.base, locale)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Primes</p>
                <p className="tabular-nums font-semibold mt-0.5" style={{ color: BLUE }}>+{fmt(totals.primes, locale)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Retenues</p>
                <p className="tabular-nums font-semibold mt-0.5" style={{ color: BLUE }}>−{fmt(totals.retenues, locale)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openNewLine("prime")}
            className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-black/[0.03]"
          >
            <Plus size={14} /> Prime
          </button>
          <button
            type="button"
            onClick={() => openNewLine("retenue")}
            className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-black/[0.03]"
          >
            <Plus size={14} /> Retenue
          </button>
          <button
            type="button"
            onClick={() => openNewLine("ajustement")}
            className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-black/[0.03]"
          >
            <Plus size={14} /> Ajustement
          </button>
          <button
            type="button"
            onClick={openNewPay}
            className="h-9 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5"
            style={{ backgroundColor: BLUE }}
          >
            <Plus size={14} /> Versement
          </button>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Mouvements du mois</p>
            <span className="text-xs text-neutral-400 font-medium">{lines.length}</span>
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white overflow-hidden">
            {lines.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400 font-medium">
                Aucun mouvement ce mois.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.04]">
                {lines.map((l) => (
                  <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                        <span>{lineTitle(l.type)}</span>
                        <span>·</span>
                        <span>{new Date(l.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: BLUE }}>{l.reason}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm tabular-nums font-semibold mr-1" style={{ color: BLUE }}>
                        {l.type === "retenue" ? "−" : "+"}{fmt(Number(l.amount), locale)}
                      </span>
                      <button type="button" onClick={() => openEditLine(l)} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.04]" title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button type="button" disabled={saving} onClick={() => post({ action: "delete_line", line_id: l.id })} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.04]" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Versements</p>
            <button type="button" onClick={openNewPay} className="text-xs font-semibold" style={{ color: BLUE }}>
              Ajouter
            </button>
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white overflow-hidden">
            {payments.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400 font-medium">Aucun versement.</p>
            ) : (
              <ul className="divide-y divide-black/[0.04]">
                {payments.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: BLUE }}>
                        {new Date(p.payment_date).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="text-xs text-neutral-400 font-medium mt-0.5">
                        {methodLabel(p.payment_method)}
                        {p.notes ? ` · ${p.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm tabular-nums font-semibold mr-1" style={{ color: BLUE }}>+{fmt(Number(p.amount), locale)}</span>
                      <button type="button" onClick={() => openEditPay(p)} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.04]">
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                          if (window.confirm("Supprimer ce versement ?")) {
                            void post({ action: "delete_payment", payment_id: p.id });
                          }
                        }}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.04]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.06] bg-white p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Contrat & base du mois</p>
          <div className="flex flex-wrap gap-4 text-sm text-neutral-600 font-medium">
            <span>Salaire contrat <strong className="font-semibold" style={{ color: BLUE }}>{fmt(contract.base_salary, locale)}</strong></span>
            <span>Prime contrat <strong className="font-semibold" style={{ color: BLUE }}>{contract.prime > 0 ? fmt(contract.prime, locale) : "—"}</strong></span>
          </div>
          {contract.prime > 0 && period ? (
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={lines.some(
                  (l) =>
                    l.type === "prime" &&
                    /prime\s*contrat/i.test(l.reason || "") &&
                    Math.round(Number(l.amount) || 0) === Math.round(Number(contract.prime) || 0),
                )}
                disabled={
                  saving ||
                  lines.some(
                    (l) =>
                      l.type === "prime" &&
                      /prime\s*contrat/i.test(l.reason || "") &&
                      Math.round(Number(l.amount) || 0) === Math.round(Number(contract.prime) || 0),
                  )
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    void post({
                      action: "include_contract_prime",
                      period_id: period.id,
                    });
                  }
                }}
              />
              Inclure la prime contrat ({fmt(contract.prime, locale)})
            </label>
          ) : null}
          {period && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs font-semibold text-neutral-500 block mb-1">Base figée ce mois</label>
                <input
                  type="number"
                  value={baseEdit}
                  placeholder={String(Math.round(Number(contract.base_salary) || 0))}
                  onChange={(e) => setBaseEdit(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                />
                <AmountInWords amount={baseEdit} />
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  post({
                    action: "update_base_snapshot",
                    period_id: period.id,
                    base_salary_snapshot: Number(baseEdit) || 0,
                  })
                }
                className="h-10 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 hover:bg-black/[0.03]"
              >
                Appliquer
              </button>
            </div>
          )}
          <p className="text-xs text-neutral-400 font-medium">
            Le dossier n&apos;est pas modifié. Les primes et retenues sont enregistrées dans le journal du mois.
          </p>
        </div>
      </PayrollSection>

      {/* Modal ligne */}
      {lineOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLineOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 space-y-4 border border-black/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>
                  {editingLineId ? `Modifier · ${lineTitle(lineType)}` : lineTitle(lineType)}
                </h3>
                <p className="text-sm text-neutral-500 mt-0.5 font-medium">{lineHint(lineType)}</p>
              </div>
              <button type="button" onClick={() => setLineOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">Montant (XAF)</label>
              <input
                type="number"
                autoFocus
                value={lineAmount}
                onChange={(e) => setLineAmount(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                placeholder="0"
              />
              <AmountInWords amount={lineAmount} />
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">Motif</label>
              <textarea
                rows={3}
                value={lineReason}
                onChange={(e) => setLineReason(e.target.value)}
                placeholder={
                  lineType === "retenue"
                    ? "Ex. avance, absence…"
                    : lineType === "prime"
                      ? "Ex. assiduité, résultats…"
                      : "Ex. rappel, correction…"
                }
                className="w-full p-3 rounded-lg border border-black/[0.08] text-sm font-medium outline-none resize-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLineOpen(false)}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-neutral-600 bg-neutral-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitLine}
                disabled={saving || !lineAmount || !lineReason.trim()}
                className="h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal paiement */}
      {payOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPayOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 space-y-4 border border-black/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>
                  {editingPayId ? "Corriger le versement" : "Versement"}
                </h3>
                {totals && !editingPayId && (
                  <p className="text-sm text-neutral-500 mt-0.5 font-medium">Reste {fmt(totals.reste, locale)} XAF</p>
                )}
              </div>
              <button type="button" onClick={() => setPayOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">Montant</label>
              <input
                type="number"
                autoFocus
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
              />
              <AmountInWords amount={payAmount} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-neutral-600 block mb-1.5">Mode</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none bg-white"
                >
                  {["especes", "mobile_money", "virement", "cheque", "autre"].map((k) => (
                    <option key={k} value={k}>{methodLabel(k)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-600 block mb-1.5">Date</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">Note</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none"
                placeholder="Optionnel"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-neutral-600 bg-neutral-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitPay}
                disabled={saving || !payAmount}
                className="h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingPayId ? "Enregistrer" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
