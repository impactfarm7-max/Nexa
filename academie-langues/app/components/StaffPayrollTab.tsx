"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Loader2, Plus, Trash2, X, AlertTriangle, Eye, ArrowLeft,
  Download, Pencil, RotateCcw, CalendarDays, ClipboardList, ChevronLeft,
  ChevronRight, Check, WalletCards,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { fetchDocumentExportConfig, type DocumentExportConfig } from "@/app/utils/documentConfig";
import { AmountInWords } from "@/app/components/AmountInWords";
import { useI18n } from "@/app/i18n/I18nProvider";
import { ACTION_TONE } from "@/app/utils/action-tones";
import { ActionConfirmModal } from "@/app/components/centre/ActionConfirmModal";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import DocumentOfficialHeader from "@/app/components/centre/DocumentOfficialHeader";
import { printElementClean } from "@/app/utils/print-clean";
import { CenterSelect } from "@/app/centre/center-page-ui";

const BLUE = "#11224E";
const SURFACE = "#F7F7F6";
const ORANGE = "#eb670e";

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

function shiftMonth(ym: string, amount: number) {
  const [year, month] = ym.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function PayrollSection({
  icon: Icon,
  title,
  description,
  actions,
  className = "",
  children,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`py-6 border-b border-black/[0.06] first:pt-2 last:border-b-0 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
        <div className="min-w-0">
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
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="space-y-4 w-full min-w-0 rounded-2xl border border-black/[0.06] p-4 sm:p-6" style={{ backgroundColor: SURFACE }}>
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
  onEditContract?: () => void;
};

type ConfirmKind =
  | { kind: "pay" }
  | { kind: "validate" }
  | { kind: "reopen" }
  | { kind: "deleteLine"; id: string }
  | { kind: "deletePay"; id: string }
  | { kind: "applyBase" }
  | { kind: "includePrime" };

export default function StaffPayrollTab({ staff, centerId, onEditContract }: Props) {
  const { locale, t } = useI18n();
  const feedback = useActionFeedback();
  const statusLabel = (status: string) => t("centre", status === "draft" ? "staffPayrollDraft" : status === "validated" ? "staffPayrollValidated" : status === "paid" ? "staffPayrollPaid" : status);
  const lineTitle = (type: LineType) => t("centre", type === "prime" ? "staffPayrollBonus" : type === "retenue" ? "staffPayrollDeduction" : "staffPayrollAdjustment");
  const lineHint = (type: LineType) => t("centre", type === "prime" ? "staffPayrollBonusHint" : type === "retenue" ? "staffPayrollDeductionHint" : "staffPayrollAdjustmentHint");
  const methodLabel = (method: string) => t("centre", method === "especes" ? "staffPayrollCash" : method === "mobile_money" ? "staffPayrollMobileMoney" : method === "virement" ? "staffPayrollTransfer" : method === "cheque" ? "staffPayrollCheck" : method === "autre" ? "staffPayrollOther" : method);
  const [periodYm, setPeriodYm] = useState(currentYm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [pendingPeriodYm, setPendingPeriodYm] = useState(periodYm);

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
      if (!res.ok) throw new Error(locale === "en" ? t("centre", "staffPayrollLoadError") : (json.error || t("centre", "staffPayrollLoadError")));
      setContract(json.contract || { base_salary: staff.base_salary, prime: staff.prime });
      applyBundle(json);
      setHistory(json.history || []);
    } catch (e: unknown) {
      setError(locale === "en" ? t("centre", "staffPayrollError") : (e instanceof Error ? e.message : t("centre", "staffPayrollError")));
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
        throw new Error(locale === "en" ? t("centre", "staffPayrollTablesMissing") : (json.error || t("centre", "staffPayrollTablesMissing")));
      }
      if (!res.ok) throw new Error(locale === "en" ? t("centre", "staffPayrollActionError") : (json.error || t("centre", "staffPayrollActionError")));
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
    } catch (e: unknown) {
      const message = locale === "en" ? t("centre", "staffPayrollError") : (e instanceof Error ? e.message : t("centre", "staffPayrollError"));
      setError(message);
      throw e instanceof Error ? e : new Error(message);
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
    const result = await feedback.run(async () => {
      if (editingLineId) {
        await post({
          action: "update_line",
          line_id: editingLineId,
          type: lineType,
          amount: Number(lineAmount),
          reason: lineReason.trim(),
        });
      } else {
        await post({
          action: "add_line",
          period_id: period.id,
          type: lineType,
          amount: Number(lineAmount),
          reason: lineReason.trim(),
        });
      }
    }, { successTitle: t("centre", "staffPayrollSavedOk") });
    if (!result.ok) return;
    setLineOpen(false);
    setEditingLineId(null);
    setLineAmount("");
    setLineReason("");
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
    const result = await feedback.run(async () => {
      if (editingPayId) {
        await post({
          action: "update_payment",
          payment_id: editingPayId,
          amount: Number(payAmount),
          payment_method: payMethod,
          payment_date: payDate,
          notes: payNotes.trim() || undefined,
        });
      } else {
        await post({
          action: "record_payment",
          period_id: period.id,
          amount: Number(payAmount),
          payment_method: payMethod,
          payment_date: payDate,
          notes: payNotes.trim() || undefined,
        });
      }
    }, { successTitle: t("centre", "staffPayrollPaidOk") });
    if (!result.ok) return;
    setPayOpen(false);
    setEditingPayId(null);
    setPayAmount("");
    setPayNotes("");
  };

  const runConfirmed = async () => {
    if (!confirm || !period) return;
    setConfirmBusy(true);
    const pending = confirm;
    setConfirm(null);
    const successTitle =
      pending.kind === "pay" ? t("centre", "staffPayrollPaidOk")
      : pending.kind === "validate" ? t("centre", "staffPayrollValidatedOk")
      : pending.kind === "reopen" ? t("centre", "staffPayrollReopenedOk")
      : t("centre", "staffPayrollSavedOk");
    await feedback.run(async () => {
      if (pending.kind === "pay") {
        const amount = Math.round(Number(totals?.reste || totals?.net || 0));
        if (amount <= 0) {
          await post({ action: "set_status", period_id: period.id, status: "paid" });
        } else {
          await post({
            action: "record_payment",
            period_id: period.id,
            amount,
            payment_method: "especes",
            payment_date: new Date().toISOString().slice(0, 10),
          });
        }
      } else if (pending.kind === "validate") {
        await post({ action: "set_status", period_id: period.id, status: "validated" });
      } else if (pending.kind === "reopen") {
        await post({ action: "reopen", period_id: period.id });
      } else if (pending.kind === "deleteLine") {
        await post({ action: "delete_line", line_id: pending.id });
      } else if (pending.kind === "deletePay") {
        await post({ action: "delete_payment", payment_id: pending.id });
      } else if (pending.kind === "applyBase") {
        await post({
          action: "update_base_snapshot",
          period_id: period.id,
          base_salary_snapshot: Number(baseEdit) || 0,
        });
      } else if (pending.kind === "includePrime") {
        await post({ action: "include_contract_prime", period_id: period.id });
      }
    }, { successTitle });
    setConfirmBusy(false);
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
    <div className="w-full flex flex-col">
      <PayrollSection
        className="order-2"
        icon={CalendarDays}
        title={t("centre", "staffPayrollYearJournal")}
        description={locale === "en" ? "Review previous payslips and reopen a period when needed." : "Retrouvez les anciens bulletins et rouvrez une période si nécessaire."}
        actions={
          <CenterSelect
            size="sm"
            align="end"
            label={t("centre", "staffPayrollYear")}
            value={journalYear}
            onChange={setJournalYear}
            options={yearOptions.map((y) => ({ value: y, label: y }))}
            className="w-[6.5rem]"
          />
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
                  <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{locale === "en" ? "Period" : "Période"}</th>
                  <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{locale === "en" ? "Status" : "Statut"}</th>
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
                      <td className="px-3.5 py-3">
                        <span className={
                          h.status === "paid" ? ACTION_TONE.positivePill
                          : h.status === "validated" ? ACTION_TONE.warningPill
                          : ACTION_TONE.neutralPill
                        }>
                          {statusLabel(h.status)}
                        </span>
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
                          {active ? (locale === "en" ? "Open" : "Ouvert") : (locale === "en" ? "Open" : "Ouvrir")}
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
        className="order-1"
        icon={ClipboardList}
        title={locale === "en" ? "Monthly payroll" : "Paie du mois"}
        description={locale === "en" ? "Prepare the amount, approve the payslip, then record the payment." : "Préparez le montant, validez le bulletin, puis enregistrez le paiement."}
        actions={
          <>
            {periodYm !== currentYm() && (
              <button type="button" onClick={() => setPeriodYm(currentYm())} className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold" style={{ color: BLUE }}>
                {locale === "en" ? "Current month" : "Mois actuel"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!totals || !period}
              className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              <Eye size={12} /> {t("centre", "staffPayrollPreview")}
            </button>
          </>
        }
      >
        <div className="rounded-xl border border-black/[0.06] bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 text-center mb-2">{locale === "en" ? "Current pay period" : "Période de paie affichée"}</p>
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setPeriodYm(shiftMonth(periodYm, -1))} className="w-10 h-10 rounded-lg grid place-items-center text-neutral-500 hover:bg-neutral-100" aria-label={locale === "en" ? "Previous month" : "Mois précédent"}><ChevronLeft size={19} /></button>
            <div className="text-center min-w-0 flex-1 py-1">
              <span className="block text-lg font-extrabold capitalize" style={{ color: BLUE }}>{periodLabel(periodYm, locale)}</span>
              <button type="button" onClick={() => { setPendingPeriodYm(periodYm); setPeriodPickerOpen(true); }} className="mt-1.5 h-8 px-3 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: BLUE }}>
                <CalendarDays size={13} className="inline mr-1.5 -mt-0.5" />{locale === "en" ? "Choose period" : "Choisir la période"}
              </button>
            </div>
            <button type="button" onClick={() => setPeriodYm(shiftMonth(periodYm, 1))} className="w-10 h-10 rounded-lg grid place-items-center text-neutral-500 hover:bg-neutral-100" aria-label={locale === "en" ? "Next month" : "Mois suivant"}><ChevronRight size={19} /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-base font-extrabold tracking-tight capitalize" style={{ color: BLUE }}>
              {periodLabel(periodYm, locale)}
            </p>
            <p className="text-sm text-neutral-500 font-medium mt-0.5">
              {staff.prenom} {staff.nom}
              {period ? (
                <>
                  {" · "}
                  <span className={
                    period.status === "paid" ? ACTION_TONE.positiveText
                    : period.status === "validated" ? ACTION_TONE.warningText
                    : "text-neutral-600"
                  }>
                    {statusLabel(period.status)}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {period?.status === "draft" && (
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: BLUE }}
                onClick={() => setConfirm({ kind: "validate" })}
              >
                {locale === "en" ? "Approve" : "Valider"}
              </button>
            )}
            {period && period.status !== "draft" && (
              <button
                type="button"
                className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 inline-flex items-center gap-1.5"
                onClick={() => setConfirm({ kind: "reopen" })}
              >
                <RotateCcw size={12} /> {locale === "en" ? "Reopen" : "Rouvrir"}
              </button>
            )}
          </div>
        </div>

        {period && (
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-white border border-black/[0.06] p-1.5" aria-label={locale === "en" ? "Payroll progress" : "Progression de la paie"}>
            {[
              { label: locale === "en" ? "1. Prepare" : "1. Préparer", done: period.status !== "draft", active: period.status === "draft" },
              { label: locale === "en" ? "2. Approve" : "2. Valider", done: period.status === "paid", active: period.status === "validated" },
              { label: locale === "en" ? "3. Pay" : "3. Payer", done: period.status === "paid", active: period.status === "paid" },
            ].map((step) => (
              <div key={step.label} className={`min-h-9 rounded-lg px-2 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-center ${step.active ? "bg-[#11224E] text-white" : step.done ? "bg-emerald-50 text-emerald-700" : "text-neutral-400"}`}>
                {step.done && <Check size={12} strokeWidth={3} />} {step.label}
              </div>
            ))}
          </div>
        )}

        {totals && (
          <div className="rounded-lg border border-black/[0.06] bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "staffPayrollNetPay")}</p>
                <p className={`text-2xl font-extrabold tracking-tight tabular-nums mt-1 ${totals.reste > 0 ? ACTION_TONE.negativeText : ACTION_TONE.positiveText}`}>
                  {fmt(totals.net, locale)}
                  <span className="text-sm text-neutral-400 ml-1.5 font-semibold">XAF</span>
                </p>
              </div>
              <div className="text-right text-sm text-neutral-500 font-medium space-y-0.5">
                <p>{t("centre", "staffPayrollPaidLabel")} <span className={`${ACTION_TONE.positiveText} tabular-nums font-semibold`}>{fmt(totals.paid, locale)}</span></p>
                <p>
                  {t("centre", "staffPayrollBalance")}{" "}
                  <span className={`tabular-nums font-semibold ${totals.reste > 0 ? ACTION_TONE.negativeText : ACTION_TONE.positiveText}`}>
                    {totals.reste > 0 ? fmt(totals.reste, locale) : t("centre", "financeAccountSettled")}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Base</p>
                <p className={`tabular-nums font-semibold mt-0.5 ${ACTION_TONE.positiveText}`}>{fmt(totals.base, locale)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{locale === "en" ? "Bonuses" : "Primes"}</p>
                <p className={`tabular-nums font-semibold mt-0.5 ${ACTION_TONE.positiveText}`}>+{fmt(totals.primes, locale)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{locale === "en" ? "Deductions" : "Retenues"}</p>
                <p className={`tabular-nums font-semibold mt-0.5 ${ACTION_TONE.negativeText}`}>−{fmt(totals.retenues, locale)}</p>
              </div>
            </div>
          </div>
        )}

        {period?.status === "draft" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openNewLine("prime")}
            className="h-9 px-3 rounded-lg border border-emerald-200 bg-white text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5 hover:bg-emerald-50"
          >
            <Plus size={14} /> {locale === "en" ? "Bonus" : "Prime"}
          </button>
          <button
            type="button"
            onClick={() => openNewLine("retenue")}
            className="h-9 px-3 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-600 inline-flex items-center gap-1.5 hover:bg-red-50"
          >
            <Plus size={14} /> {locale === "en" ? "Deduction" : "Retenue"}
          </button>
          <button
            type="button"
            onClick={() => openNewLine("ajustement")}
            className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-black/[0.03]"
          >
            <Plus size={14} /> {locale === "en" ? "Adjustment" : "Ajustement"}
          </button>
        </div>
        )}

        {period?.status === "validated" && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-900">{locale === "en" ? "Payslip approved" : "Bulletin validé"}</p>
              <p className="text-xs text-emerald-700 mt-0.5">{locale === "en" ? "The amount is locked. Record the payment to close this month." : "Le montant est verrouillé. Enregistrez le paiement pour clôturer ce mois."}</p>
            </div>
            <button type="button" onClick={openNewPay} disabled={!totals} className={`${ACTION_TONE.positiveBtnMd} shrink-0`}>
              <WalletCards size={14} /> {locale === "en" ? "Record payment" : "Enregistrer le paiement"}
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{locale === "en" ? "Monthly entries" : "Mouvements du mois"}</p>
            <span className="text-xs text-neutral-400 font-medium">{lines.length}</span>
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white overflow-hidden">
            {lines.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400 font-medium">
                {locale === "en" ? "No entries this month." : "Aucun mouvement ce mois."}
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.04]">
                {lines.map((l) => (
                  <li key={l.id} className="px-4 py-3 flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                        <span>{lineTitle(l.type)}</span>
                        <span>·</span>
                        <span>{new Date(l.created_at).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}</span>
                      </div>
                      <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: BLUE }}>{l.reason}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm tabular-nums font-semibold mr-1 ${l.type === "retenue" ? ACTION_TONE.negativeText : ACTION_TONE.positiveText}`}>
                        {l.type === "retenue" ? "−" : "+"}{fmt(Number(l.amount), locale)}
                      </span>
                      {period?.status === "draft" && (
                        <>
                      <button type="button" onClick={() => openEditLine(l)} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.04]" title={locale === "en" ? "Edit" : "Modifier"}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" disabled={saving} onClick={() => setConfirm({ kind: "deleteLine", id: l.id })} className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50" title={locale === "en" ? "Delete" : "Supprimer"}>
                        <Trash2 size={14} />
                      </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{locale === "en" ? "Payment history" : "Historique des versements"}</p>
            {period?.status === "validated" && (
            <button type="button" onClick={openNewPay} className="text-xs font-semibold" style={{ color: BLUE }}>
              {locale === "en" ? "Add" : "Ajouter"}
            </button>
            )}
          </div>
          <div className="rounded-lg border border-black/[0.06] bg-white overflow-hidden">
            {payments.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400 font-medium">{locale === "en" ? "No payments." : "Aucun versement."}</p>
            ) : (
              <ul className="divide-y divide-black/[0.04]">
                {payments.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: BLUE }}>
                        {new Date(p.payment_date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}
                      </p>
                      <p className="text-xs text-neutral-400 font-medium mt-0.5">
                        {methodLabel(p.payment_method)}
                        {p.notes ? ` · ${p.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm tabular-nums font-semibold mr-1 ${ACTION_TONE.positiveText}`}>+{fmt(Number(p.amount), locale)}</span>
                      {period?.status === "validated" && (
                        <>
                      <button type="button" onClick={() => openEditPay(p)} className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-black/[0.04]">
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setConfirm({ kind: "deletePay", id: p.id })}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-black/[0.06] bg-white p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {locale === "en" ? "Contract (reference, fixed)" : "Contrat (référence, fixe)"}
              </p>
              {onEditContract && (
                <button type="button" onClick={onEditContract} className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-50" style={{ color: BLUE }}>
                  <Pencil size={12} /> {locale === "en" ? "Edit contract" : "Modifier le contrat"}
                </button>
              )}
            </div>
            <div className="rounded-lg bg-black/[0.02] border border-black/[0.05] px-3.5 py-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-neutral-600 font-medium">
              <span>{locale === "en" ? "Base salary" : "Salaire de base"} <strong className={`font-semibold ${ACTION_TONE.positiveText}`}>{fmt(contract.base_salary, locale)}</strong></span>
              <span>{locale === "en" ? "Fixed bonus" : "Prime fixe"} <strong className={`font-semibold ${ACTION_TONE.positiveText}`}>{contract.prime > 0 ? fmt(contract.prime, locale) : "—"}</strong></span>
            </div>
            {contract.prime > 0 && period ? (
              <label className="flex items-start gap-2 text-sm font-medium text-neutral-700 mt-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={lines.some(
                    (l) =>
                      l.type === "prime" &&
                      /prime\s*contrat/i.test(l.reason || "") &&
                      Math.round(Number(l.amount) || 0) === Math.round(Number(contract.prime) || 0),
                  )}
                  disabled={
                    saving ||
                    period.status !== "draft" ||
                    lines.some(
                      (l) =>
                        l.type === "prime" &&
                        /prime\s*contrat/i.test(l.reason || "") &&
                        Math.round(Number(l.amount) || 0) === Math.round(Number(contract.prime) || 0),
                    )
                  }
                  onChange={(e) => {
                    if (e.target.checked) setConfirm({ kind: "includePrime" });
                  }}
                />
                <span>
                  {locale === "en" ? "Pay this contract bonus this month" : "Verser cette prime de contrat ce mois-ci"} ({fmt(contract.prime, locale)})
                  <span className="block text-xs text-neutral-400 font-normal mt-0.5">
                    {locale === "en" ? "Adds it once to \"Monthly entries\" below." : "L'ajoute une fois dans « Mouvements du mois » ci-dessous."}
                  </span>
                </span>
              </label>
            ) : null}
          </div>

          {period && (
            <div className="pt-3 border-t border-black/[0.06]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                {locale === "en" ? "Base salary paid this month" : "Salaire de base versé ce mois-ci"}
              </p>
              <p className="text-xs text-neutral-400 font-medium mb-2">
                {locale === "en"
                  ? "Same as the contract by default. Change it only if this month is different (mid-month hire, raise, unpaid leave…), then click Apply."
                  : "Identique au contrat par défaut. Changez-le seulement si ce mois est différent (embauche en cours de mois, augmentation, congé sans solde…), puis cliquez sur Appliquer."}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  value={baseEdit}
                  placeholder={String(Math.round(Number(contract.base_salary) || 0))}
                  onChange={(e) => setBaseEdit(e.target.value)}
                  className="flex-1 min-w-[140px] h-10 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                />
                <button
                  type="button"
                  disabled={saving || period.status !== "draft" || Math.round(Number(baseEdit) || 0) === Math.round(Number(period.base_salary_snapshot) || 0)}
                  onClick={() => setConfirm({ kind: "applyBase" })}
                  className="h-10 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 hover:bg-black/[0.03] disabled:opacity-40 shrink-0"
                >
                  {locale === "en" ? "Apply" : "Appliquer"}
                </button>
              </div>
              <AmountInWords amount={baseEdit} />
            </div>
          )}
          <p className="text-xs text-neutral-400 font-medium">
            {locale === "en" ? "The staff record is unchanged. Bonuses and deductions are saved in the monthly journal." : "Le dossier n'est pas modifié. Les primes et retenues sont enregistrées dans le journal du mois."}
          </p>
        </div>
      </PayrollSection>

      {/* Modal ligne */}
      {periodPickerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPeriodPickerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 sm:p-6 border border-black/[0.06]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>{locale === "en" ? "Choose pay period" : "Choisir la période de paie"}</h3>
                <p className="text-sm text-neutral-500 mt-1">{locale === "en" ? "Select the month you want to prepare or review." : "Sélectionnez le mois à préparer ou à consulter."}</p>
              </div>
              <button type="button" onClick={() => setPeriodPickerOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500"><X size={18} /></button>
            </div>
            <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{locale === "en" ? "Month and year" : "Mois et année"}</label>
            <input type="month" autoFocus value={pendingPeriodYm} onChange={(e) => setPendingPeriodYm(e.target.value)} className="w-full h-12 px-3 rounded-lg border-2 text-base font-semibold outline-none" style={{ borderColor: BLUE }} />
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setPeriodPickerOpen(false)} className="h-10 px-4 rounded-lg text-sm font-semibold text-neutral-600 bg-neutral-100">{locale === "en" ? "Cancel" : "Annuler"}</button>
              <button type="button" disabled={!pendingPeriodYm} onClick={() => { setPeriodYm(pendingPeriodYm); setPeriodPickerOpen(false); }} className="h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: BLUE }}>{locale === "en" ? "Show period" : "Afficher la période"}</button>
            </div>
          </div>
        </div>
      )}

      {lineOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLineOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 space-y-4 border border-black/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>
                  {editingLineId ? `${locale === "en" ? "Edit" : "Modifier"} · ${lineTitle(lineType)}` : lineTitle(lineType)}
                </h3>
                <p className="text-sm text-neutral-500 mt-0.5 font-medium">{lineHint(lineType)}</p>
              </div>
              <button type="button" onClick={() => setLineOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{locale === "en" ? "Amount (XAF)" : "Montant (XAF)"}</label>
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
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{locale === "en" ? "Reason" : "Motif"}</label>
              <textarea
                rows={3}
                value={lineReason}
                onChange={(e) => setLineReason(e.target.value)}
                placeholder={
                  lineType === "retenue"
                    ? (locale === "en" ? "Example: advance, absence..." : "Ex. avance, absence…")
                    : lineType === "prime"
                      ? (locale === "en" ? "Example: attendance, results..." : "Ex. assiduité, résultats…")
                      : (locale === "en" ? "Example: adjustment, correction..." : "Ex. rappel, correction…")
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
                {locale === "en" ? "Cancel" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={submitLine}
                disabled={saving || !lineAmount || !lineReason.trim()}
                className="h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {locale === "en" ? "Save" : "Enregistrer"}
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
                  {editingPayId ? (locale === "en" ? "Edit payment" : "Corriger le versement") : (locale === "en" ? "Payment" : "Versement")}
                </h3>
                {totals && !editingPayId && (
                  <p className="text-sm text-neutral-500 mt-0.5 font-medium">{locale === "en" ? "Balance" : "Reste"} {fmt(totals.reste, locale)} XAF</p>
                )}
              </div>
              <button type="button" onClick={() => setPayOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{locale === "en" ? "Amount" : "Montant"}</label>
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
                <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{locale === "en" ? "Method" : "Mode"}</label>
                <CenterSelect
                  value={payMethod}
                  onChange={setPayMethod}
                  options={["especes", "mobile_money", "virement", "cheque", "autre"].map((k) => ({
                    value: k,
                    label: methodLabel(k),
                  }))}
                />
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
              <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{locale === "en" ? "Note" : "Note"}</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-black/[0.08] text-sm font-semibold outline-none"
                placeholder={locale === "en" ? "Optional" : "Optionnel"}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-neutral-600 bg-neutral-100"
              >
                {locale === "en" ? "Cancel" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={submitPay}
                disabled={saving || !payAmount}
                className="h-10 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingPayId ? (locale === "en" ? "Save" : "Enregistrer") : (locale === "en" ? "Confirm" : "Confirmer")}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ActionConfirmModal
          title={
            confirm.kind === "pay" ? t("centre", "staffPayrollPay")
            : confirm.kind === "validate" ? (locale === "en" ? "Approve" : "Valider")
            : confirm.kind === "reopen" ? (locale === "en" ? "Reopen" : "Rouvrir")
            : confirm.kind === "deleteLine" || confirm.kind === "deletePay" ? (locale === "en" ? "Delete" : "Supprimer")
            : confirm.kind === "includePrime" ? (locale === "en" ? "Bonus" : "Prime")
            : (locale === "en" ? "Apply" : "Appliquer")
          }
          message={
            confirm.kind === "pay" ? t("centre", "staffPayrollPayConfirm", {
              amount: fmt(totals?.reste || totals?.net || 0, locale),
              name: `${staff.prenom} ${staff.nom}`,
            })
            : confirm.kind === "validate" ? t("centre", "staffPayrollValidateConfirm")
            : confirm.kind === "reopen" ? t("centre", "staffPayrollReopenConfirm")
            : confirm.kind === "deleteLine" ? t("centre", "staffPayrollDeleteLineConfirm")
            : confirm.kind === "deletePay" ? t("centre", "staffPayrollDeletePayConfirm")
            : confirm.kind === "includePrime" ? t("centre", "staffPayrollIncludePrimeConfirm", { amount: fmt(contract.prime, locale) })
            : t("centre", "staffPayrollApplyBaseConfirm")
          }
          confirmLabel={
            confirm.kind === "pay" ? t("centre", "staffPayrollPay")
            : confirm.kind === "validate" ? (locale === "en" ? "Approve" : "Valider")
            : confirm.kind === "reopen" ? (locale === "en" ? "Reopen" : "Rouvrir")
            : confirm.kind === "deleteLine" || confirm.kind === "deletePay" ? (locale === "en" ? "Delete" : "Supprimer")
            : (locale === "en" ? "Confirm" : "Confirmer")
          }
          cancelLabel={locale === "en" ? "Cancel" : "Annuler"}
          tone={confirm.kind === "pay" || confirm.kind === "validate" || confirm.kind === "includePrime" ? "positive" : confirm.kind === "reopen" ? "warning" : "danger"}
          busy={confirmBusy}
          onConfirm={() => void runConfirmed()}
          onCancel={() => { if (!confirmBusy) setConfirm(null); }}
        />
      )}

      {previewOpen && totals && period && (
        <PayslipPreviewModal
          staffName={`${staff.prenom} ${staff.nom}`}
          jobTitle={staff.job_title}
          centerId={centerId}
          periodYm={periodYm}
          periodLabelText={periodLabel(periodYm, locale)}
          statusText={statusLabel(period.status)}
          totals={totals}
          lines={lines}
          payments={payments}
          lineTitle={lineTitle}
          methodLabel={methodLabel}
          locale={locale}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function PayslipPreviewModal({
  staffName,
  jobTitle,
  centerId,
  periodYm,
  periodLabelText,
  statusText,
  totals,
  lines,
  payments,
  lineTitle,
  methodLabel,
  locale,
  onClose,
}: {
  staffName: string;
  jobTitle?: string | null;
  centerId: string;
  periodYm: string;
  periodLabelText: string;
  statusText: string;
  totals: Totals;
  lines: PayrollLine[];
  payments: PayrollPayment[];
  lineTitle: (type: LineType) => string;
  methodLabel: (method: string) => string;
  locale: "fr" | "en";
  onClose: () => void;
}) {
  const { t } = useI18n();
  const en = locale === "en";
  const [docConfig, setDocConfig] = useState<DocumentExportConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await fetchDocumentExportConfig(supabase, centerId).catch(() => null);
      if (!cancelled) setDocConfig(cfg);
    })();
    return () => { cancelled = true; };
  }, [centerId]);

  const row = (label: string, value: string, tone?: "pos" | "neg") => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-black/[0.05] last:border-0">
      <span className="text-sm font-medium text-neutral-600">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${tone === "neg" ? ACTION_TONE.negativeText : tone === "pos" ? ACTION_TONE.positiveText : "text-neutral-900"}`}>
        {value}
      </span>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col">
      <div className="print:hidden shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-neutral-200 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50"
        >
          <ArrowLeft size={15} /> {en ? "Back" : "Retour"}
        </button>
        <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400 hidden sm:block">
          {t("centre", "staffPayrollPreview")}
        </p>
        <button
          type="button"
          onClick={() => printElementClean("staff-payslip-preview")}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-[11px] font-black uppercase text-white"
          style={{ backgroundColor: ORANGE }}
        >
          <Download size={14} />
          {en ? "Download" : "Télécharger"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-black/75 p-4 md:p-8 print:bg-white print:p-0 print:overflow-visible">
        <div
          id="staff-payslip-preview"
          className="bg-white max-w-[680px] w-full mx-auto p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:max-w-none"
        >
          <DocumentOfficialHeader
            config={docConfig}
            fallbackTitle={t("centre", "staffPayrollPayslipTitle")}
            rightExtra={
              <p>{en ? "Issue date" : "Date d'édition"} : {new Date().toLocaleDateString(en ? "en-GB" : "fr-FR")}</p>
            }
          />
          <h2 className="text-xl sm:text-2xl font-black uppercase" style={{ color: BLUE }}>{staffName}</h2>
          {jobTitle ? <p className="text-xs font-bold mt-1" style={{ color: docConfig?.accentColor || ORANGE }}>{jobTitle}</p> : null}
          <p className="text-[11px] text-neutral-500 mt-1.5 font-medium capitalize">
            {periodLabelText} ({periodYm}) · {statusText}
          </p>

          <div className="mt-6 rounded-xl border border-black/[0.06] px-4">
            {row(en ? "Base salary" : "Salaire de base", `${fmt(totals.base, locale)} XAF`, "pos")}
            {row(en ? "Bonuses / adjustments" : "Primes / ajustements", `+${fmt(totals.primes, locale)} XAF`, "pos")}
            {row(en ? "Deductions" : "Retenues", `−${fmt(totals.retenues, locale)} XAF`, "neg")}
            {row(en ? "Gross pay" : "Brut", `${fmt(totals.brut, locale)} XAF`, "pos")}
            {row(t("centre", "staffPayrollNetPay"), `${fmt(totals.net, locale)} XAF`, totals.reste > 0 ? "neg" : "pos")}
            {row(t("centre", "staffPayrollPaidLabel"), `${fmt(totals.paid, locale)} XAF`, "pos")}
            {row(t("centre", "staffPayrollBalance"), totals.reste > 0 ? `${fmt(totals.reste, locale)} XAF` : t("centre", "financeAccountSettled"), totals.reste > 0 ? "neg" : "pos")}
          </div>

          {lines.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">{en ? "Monthly entries" : "Mouvements du mois"}</p>
              <div className="rounded-xl border border-black/[0.06] divide-y divide-black/[0.05]">
                {lines.map((l) => (
                  <div key={l.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-400 font-medium">{lineTitle(l.type)}</p>
                      <p className="text-sm font-semibold truncate" style={{ color: BLUE }}>{l.reason}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${l.type === "retenue" ? ACTION_TONE.negativeText : ACTION_TONE.positiveText}`}>
                      {l.type === "retenue" ? "−" : "+"}{fmt(Number(l.amount), locale)} XAF
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">{en ? "Payment history" : "Historique des versements"}</p>
              <div className="rounded-xl border border-black/[0.06] divide-y divide-black/[0.05]">
                {payments.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: BLUE }}>
                        {new Date(p.payment_date).toLocaleDateString(en ? "en-GB" : "fr-FR")}
                      </p>
                      <p className="text-xs text-neutral-400 font-medium">{methodLabel(p.payment_method)}{p.notes ? ` · ${p.notes}` : ""}</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${ACTION_TONE.positiveText}`}>+{fmt(Number(p.amount), locale)} XAF</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
