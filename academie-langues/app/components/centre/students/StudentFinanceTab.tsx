"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Lock, Loader2, TrendingDown, CheckCircle2,
  Clock, ArrowDownCircle, CalendarClock, X, Tag, Download, Wallet,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { downloadStatementPdf } from "@/app/utils/centerPdfExport";
import { fetchDocumentExportConfig } from "@/app/utils/documentConfig";
import { useI18n } from "@/app/i18n/I18nProvider";
import { ACTION_TONE } from "@/app/utils/action-tones";
import { localizeInstallmentLabel, localizePaymentMethod } from "@/app/utils/financeI18n";
import { fetchUsableCoupons, type CouponListItem } from "@/app/utils/coupon.client";

const BLUE = "#11224E";
const ORANGE = "#eb670e";
const SURFACE = "#F7F7F6";

const FIELD_LABEL = "text-sm font-semibold text-neutral-600 block mb-1.5";
const FIELD_INPUT =
  "w-full h-12 px-4 rounded-lg border border-black/[0.08] bg-white font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";

type Summary = {
  tuition_fee: number;
  tuition_paid: number;
  reste_a_payer: number;
  financial_status: string | null;
  discount_amount: number;
  discount_reason: string | null;
};

type Installment = {
  id: string;
  label: string | null;
  amount: number;
  due_date: string | null;
  status: string | null;
  paid_amount: number | null;
  position: number | null;
  original_due_date: string | null;
  deferral_reason: string | null;
  deferred_at: string | null;
};

type Payment = {
  id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  receipt_number: string | null;
  notes: string | null;
  recorded_by_name: string | null;
};

type FinanceEvent = {
  id: string;
  type: string;
  amount: number | null;
  payload: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
  created_by_name: string | null;
};

type Props = {
  enrollmentId: string;
  tuitionFee: number;
  centerId: string;
  studentName: string;
  filiereName: string;
  onPaid: () => void;
};

function fmtDate(iso: string | null | undefined, locale: "fr" | "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtFCFA(n: number, locale: "fr" | "en") {
  return Math.round(n).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB");
}

function FinanceSection({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
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
      <div className="space-y-5 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6" style={{ backgroundColor: SURFACE }}>
        {children}
      </div>
    </section>
  );
}

function dedupeInstallments(list: Installment[]): Installment[] {
  if (!list || list.length <= 1) return list;

  const map = new Map<string, Installment>();

  for (const inst of list) {
    const dStr = inst.due_date ? inst.due_date.slice(0, 10) : "nodate";
    const amt = Math.round(Number(inst.amount) || 0);

    const key = (inst.position && inst.position > 0)
      ? `pos_${inst.position}`
      : `date_${dStr}_amt_${amt}`;

    if (!map.has(key)) {
      map.set(key, inst);
    } else {
      const existing = map.get(key)!;
      const existingPaid = existing.status === "paid" || (existing.paid_amount || 0) >= existing.amount;
      const currentPaid = inst.status === "paid" || (inst.paid_amount || 0) >= inst.amount;

      if (!existingPaid && currentPaid) {
        map.set(key, inst);
      } else {
        const isGeneric = (lbl?: string | null) =>
          !lbl || /^échéance \d+$/i.test(lbl.trim()) || /^echeance \d+$/i.test(lbl.trim()) || lbl.trim().toLowerCase() === "échéance";
        if (isGeneric(existing.label) && !isGeneric(inst.label)) {
          map.set(key, inst);
        }
      }
    }
  }

  const result = Array.from(map.values());
  const finalMap = new Map<string, Installment>();
  for (const inst of result) {
    const dStr = inst.due_date ? inst.due_date.slice(0, 10) : "nodate";
    const amt = Math.round(Number(inst.amount) || 0);
    const key = `date_${dStr}_amt_${amt}`;
    if (!finalMap.has(key)) {
      finalMap.set(key, inst);
    } else {
      const existing = finalMap.get(key)!;
      const isGeneric = (lbl?: string | null) =>
        !lbl || /^échéance \d+$/i.test(lbl.trim()) || /^echeance \d+$/i.test(lbl.trim()) || lbl.trim().toLowerCase() === "échéance";
      if (isGeneric(existing.label) && !isGeneric(inst.label)) {
        finalMap.set(key, inst);
      }
    }
  }

  return Array.from(finalMap.values()).sort((a, b) => {
    if (a.position != null && b.position != null) return a.position - b.position;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    return 0;
  });
}

export default function StudentFinanceTab({
  enrollmentId,
  tuitionFee,
  centerId,
  studentName,
  filiereName,
  onPaid,
}: Props) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<FinanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [deferTarget, setDeferTarget] = useState<Installment | null>(null);
  const [deferDate, setDeferDate] = useState("");
  const [deferReason, setDeferReason] = useState("");
  const [deferSaving, setDeferSaving] = useState(false);
  const [deferError, setDeferError] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState<CouponListItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (centerId) {
        setAvailableCoupons(await fetchUsableCoupons(supabase, centerId));
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const res = await fetch(
        `/api/center/finance-actions?enrollment_id=${encodeURIComponent(enrollmentId)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(locale === "en" ? t("centre", "studentFinanceLoadError") : (json.error || t("centre", "studentFinanceLoadError")));

      const s = json.summary || {};
      setSummary({
        tuition_fee: Number(s.tuition_fee ?? tuitionFee) || 0,
        tuition_paid: Number(s.tuition_paid) || 0,
        reste_a_payer: Number(s.reste_a_payer ?? Math.max(0, Number(s.tuition_fee ?? tuitionFee) - Number(s.tuition_paid || 0))) || 0,
        financial_status: s.financial_status ?? null,
        discount_amount: Number(s.discount_amount) || 0,
        discount_reason: s.discount_reason ?? null,
      });
      setInstallments(
        dedupeInstallments(
          (json.installments || []).map((i: Installment) => ({
            ...i,
            amount: Number(i.amount) || 0,
            paid_amount: Number(i.paid_amount) || 0,
          }))
        )
      );
      setPayments(json.payments || []);
      setEvents(json.events || []);
    } catch (e: unknown) {
      console.error(e);
      // Fallback minimal si API / colonnes absentes
      const [{ data: payRows }, { data: instRows }] = await Promise.all([
        supabase
          .from("student_payments")
          .select("id, amount, payment_method, payment_date, receipt_number, notes, recorded_by")
          .eq("enrollment_id", enrollmentId)
          .order("payment_date", { ascending: false }),
        supabase
          .from("enrollment_installments")
          .select("id, label, amount, due_date, status, paid_amount, position, original_due_date, deferral_reason, deferred_at")
          .eq("enrollment_id", enrollmentId)
          .order("position"),
      ]);
      const paidAmt = (payRows || []).reduce((s, p) => s + Number(p.amount), 0);
      setSummary({
        tuition_fee: tuitionFee,
        tuition_paid: paidAmt,
        reste_a_payer: Math.max(0, tuitionFee - paidAmt),
        financial_status: null,
        discount_amount: 0,
        discount_reason: null,
      });
      setPayments(
        (payRows || []).map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          payment_method: p.payment_method,
          payment_date: p.payment_date,
          receipt_number: p.receipt_number,
          notes: p.notes,
          recorded_by_name: null,
        })),
      );
      setInstallments(dedupeInstallments((instRows || []) as Installment[]));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [centerId, enrollmentId, tuitionFee, t]);

  useEffect(() => { load(); }, [load]);

  const fee = summary?.tuition_fee ?? tuitionFee;
  const paid = summary?.tuition_paid ?? 0;
  const remaining = summary?.reste_a_payer ?? Math.max(0, fee - paid);
  const isPaid = remaining <= 0 && fee > 0;
  const progressPct = fee > 0 ? Math.min(100, (paid / fee) * 100) : 0;

  const goToFinanceEncaisser = () => {
    router.push(`/centre/finance?enrollment=${encodeURIComponent(enrollmentId)}&pay=1`);
  };

  const downloadDossierFinance = async () => {
    setPdfBusy(true);
    try {
      const config = await fetchDocumentExportConfig(supabase, centerId).catch(() => undefined);
      await downloadStatementPdf({
        studentName: studentName.trim() || t("centre", "studentFinanceLearner"),
        filiereName: filiereName.trim() || t("centre", "studentFinanceProgram"),
        resteAPayer: remaining,
        installments: installments.map((i) => ({
          label: localizeInstallmentLabel(i.label, locale) || t("centre", "studentFinanceInstallment"),
          due_date: i.due_date || "",
          amount: i.amount,
          paid_amount: Number(i.paid_amount) || 0,
          status: i.status || "pending",
        })),
        payments: payments.map((p) => ({
          payment_date: p.payment_date || "",
          receipt_number: p.receipt_number,
          payment_method: localizePaymentMethod(p.payment_method, locale) || t("centre", "studentFinancePayment"),
          amount: p.amount,
          recorded_by_name: p.recorded_by_name,
        })),
        config: config
          ? { ...config, title: config.title?.trim() || t("centre", "studentFinanceRecordTitle") }
          : { title: t("centre", "studentFinanceRecordTitle") },
        locale,
      });
    } catch (e: unknown) {
      console.error(e);
      alert(locale === "en" ? t("centre", "studentFinanceDownloadError") : (e instanceof Error ? e.message : t("centre", "studentFinanceDownloadError")));
    } finally {
      setPdfBusy(false);
    }
  };

  const submitCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponError(t("centre", "studentFinanceEnterCoupon"));
      return;
    }
    setCouponApplying(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch("/api/center/finance-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "apply_coupon",
          enrollment_id: enrollmentId,
          code,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(locale === "en" ? t("centre", "studentFinanceCouponInvalid") : (json.error || t("centre", "studentFinanceCouponInvalid")));
      setCouponCode("");
      setCouponSuccess(t("centre", "studentFinanceCouponSuccess", { amount: fmtFCFA(Number(json.discount_amount) || 0, locale) }));
      await load();
      onPaid();
    } catch (e: unknown) {
      setCouponError(locale === "en" ? t("centre", "passageError") : (e instanceof Error ? e.message : t("centre", "passageError")));
    } finally {
      setCouponApplying(false);
    }
  };

  const submitDefer = async () => {
    if (!deferTarget) return;
    setDeferSaving(true); setDeferError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch("/api/center/finance-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "defer",
          installment_id: deferTarget.id,
          new_due_date: deferDate,
          reason: deferReason.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(locale === "en" ? t("centre", "studentFinanceDeferralError") : (json.error || t("centre", "studentFinanceDeferralError")));
      setDeferTarget(null);
      setDeferDate("");
      setDeferReason("");
      await load();
      onPaid();
    } catch (e: unknown) {
      setDeferError(locale === "en" ? t("centre", "passageError") : (e instanceof Error ? e.message : t("centre", "passageError")));
    } finally {
      setDeferSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-neutral-400 p-8">{t("centre", "studentFinanceLoading")}</p>;

  return (
    <div className="w-full">
      <FinanceSection
        icon={Wallet}
        title={t("centre", "studentFinanceSituation")}
        description={t("centre", "studentFinanceSituationHelp")}
        actions={
          <>
            {!isPaid && (
              <button
                type="button"
                onClick={goToFinanceEncaisser}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ORANGE }}
              >
                <ArrowDownCircle size={12} /> {t("centre", "studentFinanceCollect")}
              </button>
            )}
            <button
              type="button"
              onClick={() => void downloadDossierFinance()}
              disabled={pdfBusy}
              className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {t("centre", "studentFinanceDownload")}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Lock size={14} className="text-neutral-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "studentFinanceProgramCost")}</p>
            </div>
            <p className="text-xl font-extrabold tracking-tight" style={{ color: BLUE }}>{fmtFCFA(fee, locale)}</p>
            <p className="text-xs font-medium text-neutral-400 mt-0.5">FCFA</p>
            {(summary?.discount_amount || 0) > 0 && (
              <p className="text-xs font-semibold text-amber-700 mt-1.5">
                {t("centre", "studentFinanceDiscount")} −{fmtFCFA(summary!.discount_amount, locale)} F
              </p>
            )}
          </div>
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowDownCircle size={14} className="text-emerald-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "studentFinancePaid")}</p>
            </div>
            <p className="text-xl font-extrabold tracking-tight text-emerald-700">{fmtFCFA(paid, locale)}</p>
            <p className="text-xs font-medium text-neutral-400 mt-0.5">FCFA</p>
          </div>
          <div className={`rounded-xl border p-4 ${
            isPaid ? "bg-emerald-50 border-emerald-200"
            : remaining > 0 ? "bg-red-50 border-red-200"
            : "bg-white border-black/[0.06]"
          }`}>
            <div className="flex items-center gap-1.5 mb-2">
              {isPaid
                ? <CheckCircle2 size={14} className="text-emerald-600" />
                : <TrendingDown size={14} className="text-red-500" />}
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                {isPaid ? t("centre", "studentFinanceSettled") : t("centre", "studentFinanceRemaining")}
              </p>
            </div>
            <p className={`text-xl font-extrabold tracking-tight ${isPaid ? "text-emerald-700" : "text-red-600"}`}>
              {fmtFCFA(remaining, locale)}
            </p>
            <p className="text-xs font-medium text-neutral-400 mt-0.5">FCFA</p>
          </div>
        </div>

        {fee > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-neutral-600">{t("centre", "studentFinanceProgress")}</span>
              <span className={`text-sm font-bold ${isPaid ? ACTION_TONE.positiveText : ACTION_TONE.negativeText}`}>
                {progressPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2.5 bg-white border border-black/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: isPaid ? ACTION_TONE.positiveHex : ACTION_TONE.negativeHex }}
              />
            </div>
          </div>
        )}

        {summary && (summary.discount_amount || 0) > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">{t("centre", "studentFinanceDiscountApplied")}</p>
            <p className="text-sm font-semibold text-amber-900">
              −{fmtFCFA(summary.discount_amount, locale)} FCFA
              {summary.discount_reason ? `${locale === "en" ? ": " : " — "}${summary.discount_reason}` : ""}
            </p>
          </div>
        )}

        {!isPaid && remaining > 0 && (
          <div className="rounded-xl border border-black/[0.06] bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-neutral-600 flex items-center gap-1.5">
              <Tag size={14} style={{ color: ORANGE }} /> {t("centre", "studentFinanceApplyCouponTitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponError("");
                  setCouponSuccess("");
                }}
                className={`${FIELD_INPUT} flex-1 uppercase text-sm`}
              >
                <option value="">
                  {availableCoupons.length
                    ? t("centre", "studentFinanceSelectCoupon")
                    : t("centre", "financeNoCouponAvailable")}
                </option>
                {availableCoupons.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} ({c.type === "percentage" ? `${c.value}%` : `${fmtFCFA(c.value, locale)} FCFA`})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={submitCoupon}
                disabled={couponApplying || !couponCode.trim()}
                className={`${ACTION_TONE.positiveBtnMd} shrink-0`}
              >
                {couponApplying ? <Loader2 size={14} className="animate-spin" /> : null}
                {t("centre", "studentFinanceApply")}
              </button>
            </div>
            {couponError && <p className={`text-sm font-semibold ${ACTION_TONE.negativeText}`}>{couponError}</p>}
            {couponSuccess && <p className={`text-sm font-semibold ${ACTION_TONE.positiveText}`}>{couponSuccess}</p>}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        icon={CalendarClock}
        title={t("centre", "studentFinanceSchedule")}
        description={t("centre", "studentFinanceScheduleHelp")}
      >
        {installments.length === 0 ? (
          <p className="text-sm text-neutral-400 font-medium italic">{t("centre", "studentFinanceNoInstallment")}</p>
        ) : (
          <div className="divide-y divide-black/[0.06] -mx-1">
            {installments.map((inst) => {
              const sold = inst.status === "paid" || (inst.paid_amount || 0) >= inst.amount;
              const deferred = !!inst.original_due_date && inst.original_due_date !== inst.due_date;
              return (
                <div key={inst.id} className="py-3 px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-neutral-800">
                        {localizeInstallmentLabel(inst.label, locale) || (inst.position ? `${t("centre", "studentFinanceInstallment")} ${inst.position}` : t("centre", "studentFinanceInstallment"))}
                      </p>
                      <span className="text-xs font-semibold text-neutral-500">
                        {locale === "en" ? ": " : " — "}{fmtDate(inst.due_date, locale)}
                      </span>
                      {deferred && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {t("centre", "studentFinanceDeferred")} {inst.original_due_date ? `(${t("centre", "studentFinanceInitial")} ${fmtDate(inst.original_due_date, locale)})` : ""}
                        </span>
                      )}
                      {sold && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {t("centre", "studentFinanceSettled")}
                        </span>
                      )}
                    </div>
                    {inst.deferral_reason && (
                      <p className="text-xs text-blue-600 font-medium mt-0.5">{t("centre", "studentFinanceReason")} {inst.deferral_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-extrabold" style={{ color: BLUE }}>{fmtFCFA(inst.amount, locale)} FCFA</p>
                    {!sold && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeferTarget(inst);
                          setDeferDate("");
                          setDeferReason("");
                          setDeferError("");
                        }}
                        className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors"
                      >
                        {t("centre", "studentFinanceDefer")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        icon={Clock}
        title={t("centre", "studentFinancePaymentHistory")}
        description={t("centre", "studentFinancePaymentHistoryHelp")}
      >
        {payments.length === 0 ? (
          <p className="text-sm text-neutral-400 font-medium italic">{t("centre", "studentFinanceNoPayment")}</p>
        ) : (
          <div className="divide-y divide-black/[0.06] -mx-1">
            {payments.map((p) => (
              <div key={p.id} className="py-3.5 px-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <ArrowDownCircle size={14} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: BLUE }}>{localizePaymentMethod(p.payment_method, locale) || t("centre", "studentFinancePayment")}</p>
                    <p className="text-xs text-neutral-500 font-medium">
                      {fmtDate(p.payment_date, locale)}
                      {p.recorded_by_name && ` · ${t("centre", "studentFinanceBy")} ${p.recorded_by_name}`}
                      {p.receipt_number && ` · ${p.receipt_number}`}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-extrabold text-emerald-700 shrink-0">+{fmtFCFA(p.amount, locale)} F</p>
              </div>
            ))}
          </div>
        )}
      </FinanceSection>

      {events.length > 0 && (
        <FinanceSection
          icon={Tag}
          title={t("centre", "studentFinanceJournal")}
          description={t("centre", "studentFinanceJournalHelp")}
        >
          <div className="divide-y divide-black/[0.06] -mx-1">
            {events.map((ev) => (
              <div key={ev.id} className="py-3.5 px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {ev.type === "deferral"
                    ? t("centre", "studentFinanceDefer")
                    : ev.type === "discount"
                      ? t("centre", "financeDiscount")
                      : ev.type === "payment_note"
                        ? t("centre", "studentFinancePaymentNote")
                        : ev.type}
                  {" · "}{fmtDate(ev.created_at, locale)}
                  {ev.created_by_name && ` · ${ev.created_by_name}`}
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: BLUE }}>
                  {ev.type === "discount" && ev.amount != null ? `−${fmtFCFA(Number(ev.amount), locale)} F${locale === "en" ? ": " : " — "}` : ""}
                  {ev.reason || "—"}
                </p>
              </div>
            ))}
          </div>
        </FinanceSection>
      )}

      {deferTarget && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-xl border border-black/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>
                {t("centre", "studentFinanceDefer")}{locale === "en" ? ": " : " — "}{localizeInstallmentLabel(deferTarget.label, locale) || t("centre", "studentFinanceInstallment")}
              </h3>
              <button
                type="button"
                onClick={() => setDeferTarget(null)}
                className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500"
                aria-label={t("centre", "studentFinanceClose")}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-neutral-500 font-medium">{t("centre", "studentFinanceCurrentDate")} {fmtDate(deferTarget.due_date, locale)}</p>
            <div>
              <label className={FIELD_LABEL}>{t("centre", "studentFinanceNewDate")}</label>
              <input
                type="date"
                value={deferDate}
                onChange={(e) => setDeferDate(e.target.value)}
                className={FIELD_INPUT}
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>{t("centre", "studentFinanceReasonLabel")}</label>
              <textarea
                rows={3}
                value={deferReason}
                onChange={(e) => setDeferReason(e.target.value)}
                placeholder={t("centre", "studentFinanceReasonPlaceholder")}
                className="w-full p-4 rounded-lg border border-black/[0.08] bg-white font-medium text-sm outline-none resize-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
              />
            </div>
            {deferError && (
              <p className="text-sm font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">{deferError}</p>
            )}
            <button
              type="button"
              onClick={submitDefer}
              disabled={deferSaving || !deferDate || !deferReason.trim()}
              className="w-full h-12 rounded-lg text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: BLUE }}
            >
              {deferSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              {t("centre", "studentFinanceValidateDeferral")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
