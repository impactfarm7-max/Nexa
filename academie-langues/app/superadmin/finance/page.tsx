"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Info, Plus, Search, Wallet, X } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { FINANCE_METHODS, type FinanceMethod } from "@/app/data/financePayments";
import { downloadInvoicePdf, downloadReceiptPdf, type FinanceInvoicePayment } from "@/app/utils/financePdfExport";
import { nexaOfferLabel, type NexaOfferKey } from "@/app/data/nexaOffers";
import { useSuperadminCenters } from "../SuperadminCentersContext";

type Payment = {
  id: string;
  center_id: string;
  amount: number;
  method: FinanceMethod;
  period_label: string | null;
  paid_at: string;
  note: string | null;
  document_number: string;
  source: "manual" | "auto_mark_paid";
  created_at: string;
  centers: { name: string; city: string | null; center_type: string | null; nexa_offer: NexaOfferKey | null; plan_type: string | null } | null;
};

type Summary = {
  totalAllTime: number;
  totalPeriod: number;
  countPeriod: number;
  revenueAtRisk: number;
  monthlyRevenue: { key: string; year: number; month: number; total: number }[];
  periodDays: number;
};

type CenterOption = { id: string; name: string; city?: string | null };

const EMPTY_SUMMARY: Summary = {
  totalAllTime: 0,
  totalPeriod: 0,
  countPeriod: 0,
  revenueAtRisk: 0,
  monthlyRevenue: [],
  periodDays: 30,
};

function formatFcfa(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`;
}

function formatShortDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function methodLabel(method: FinanceMethod, t: ReturnType<typeof useI18n>["t"]) {
  const key = {
    virement: "financeMethodVirement",
    mobile_money: "financeMethodMobileMoney",
    especes: "financeMethodEspeces",
    autre: "financeMethodAutre",
  }[method] as
    | "financeMethodVirement"
    | "financeMethodMobileMoney"
    | "financeMethodEspeces"
    | "financeMethodAutre";
  return t("superadmin", key);
}

function formatAmountDigits(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function RecordPaymentModal({
  onClose,
  onRecorded,
  initialCenterId,
  initialAmount,
  initialPeriodLabel,
}: {
  onClose: () => void;
  onRecorded: () => void;
  initialCenterId?: string;
  initialAmount?: string;
  initialPeriodLabel?: string;
}) {
  const { t, locale } = useI18n();
  const feedback = useActionFeedback();
  const { centers } = useSuperadminCenters<CenterOption>();
  const [search, setSearch] = useState(() => centers.find((c) => c.id === initialCenterId)?.name || "");
  const [centerId, setCenterId] = useState(initialCenterId || "");
  const [amount, setAmount] = useState(initialAmount || "");
  const [method, setMethod] = useState<FinanceMethod>("mobile_money");
  const [periodLabel, setPeriodLabel] = useState(initialPeriodLabel || "");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (initialCenterId && !search) {
      const c = centers.find((x) => x.id === initialCenterId);
      if (c) setSearch(c.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centers, initialCenterId]);

  const filteredCenters = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q ? centers.filter((c) => c.name.toLowerCase().includes(q)) : centers;
    return rows.slice(0, 8);
  }, [centers, search]);

  const selectedCenter = centers.find((c) => c.id === centerId) || null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!centerId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError(t("superadmin", "financeModalError"));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const json = await superadminFetch<{ payment: Payment }>("/api/superadmin/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          center_id: centerId,
          amount: Math.trunc(parsedAmount),
          method,
          period_label: periodLabel.trim() || null,
          paid_at: new Date(paidAt).toISOString(),
          note: note.trim() || null,
        }),
      });
      feedback.show(
        {
          status: "success",
          title: t("superadmin", "financeModalSuccess"),
          message: t("superadmin", "financeModalSuccessMsg").replace("{number}", json.payment.document_number),
        },
        2200,
      );
      onRecorded();
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("superadmin", "financeModalError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-white">{t("superadmin", "financeModalTitle")}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalCenter")}</label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCenterId("");
                }}
                placeholder={t("superadmin", "financeModalCenterSearch")}
                className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/10">
              {filteredCenters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCenterId(c.id);
                    setSearch(c.name);
                  }}
                  className={`block w-full border-b border-white/5 px-3 py-2 text-left text-xs font-bold last:border-0 ${
                    centerId === c.id ? "bg-orange-500/15 text-orange-300" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {c.name}
                  {c.city ? <span className="ml-1.5 text-[10px] font-medium text-slate-500">{c.city}</span> : null}
                </button>
              ))}
            </div>
            {selectedCenter && <p className="mt-1.5 text-[11px] font-bold text-orange-300">{selectedCenter.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalAmount")}</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatAmountDigits(amount)}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalMethod")}</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as FinanceMethod)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              >
                {FINANCE_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel(m, t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalDate")}</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalPeriod")}</label>
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder={locale === "en" ? "e.g. August 2026" : "ex. Août 2026"}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeModalNote")}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>

          {submitError && <p className="text-xs font-bold text-red-400">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black text-white disabled:opacity-50"
          >
            {submitting ? t("superadmin", "financeModalSubmitting") : t("superadmin", "financeModalSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}

type UnpaidCenter = {
  id: string;
  name: string;
  city?: string | null;
  billing_status?: string | null;
  derived_status?: string;
  subscription_amount?: number | null;
  renewal_at?: string | null;
};

export default function SuperadminFinancePage() {
  return (
    <Suspense fallback={null}>
      <SuperadminFinancePageContent />
    </Suspense>
  );
}

function SuperadminFinancePageContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const { centers } = useSuperadminCenters<UnpaidCenter>();
  const [days, setDays] = useState(30);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ centerId: string; amount: string; period: string } | null>(null);

  useEffect(() => {
    if (searchParams.get("openPayment")) {
      setPrefill({
        centerId: searchParams.get("centerId") || "",
        amount: searchParams.get("amount") || "",
        period: searchParams.get("period") || "",
      });
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [paymentsJson, summaryJson] = await Promise.all([
        superadminFetch<{ payments: Payment[] }>(`/api/superadmin/finance/payments?days=${days}`),
        superadminFetch<Summary>(`/api/superadmin/finance/summary?days=${days}`),
      ]);
      setPayments(paymentsJson.payments || []);
      setSummary({ ...EMPTY_SUMMARY, ...summaryJson });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("superadmin", "financeLoadError"));
    } finally {
      setLoading(false);
    }
  }, [days, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const growthMax = Math.max(1, ...summary.monthlyRevenue.map((m) => m.total));

  const unpaidCenters = useMemo(
    () =>
      centers
        .filter(
          (c) =>
            c.billing_status === "unpaid" ||
            c.billing_status === "grace" ||
            c.derived_status === "subscription_expired",
        )
        .sort((a, b) => (Number(b.subscription_amount) || 0) - (Number(a.subscription_amount) || 0)),
    [centers],
  );

  const toInvoicePayment = (p: Payment): FinanceInvoicePayment => ({
    document_number: p.document_number,
    amount: p.amount,
    method: p.method,
    period_label: p.period_label,
    paid_at: p.paid_at,
    note: p.note,
    center: {
      name: p.centers?.name || "—",
      city: p.centers?.city || null,
      offerLabel: p.centers?.nexa_offer ? nexaOfferLabel(p.centers.nexa_offer, locale === "en" ? "en" : "fr") : "NEXA",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{t("superadmin", "financeTitle")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "financeSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[30, 90, 365].map((period) => (
            <button
              key={period}
              onClick={() => setDays(period)}
              className={`rounded-lg px-3 py-2 text-xs font-black ${
                days === period ? "bg-orange-500 text-white" : "border border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              {period}j
            </button>
          ))}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-white"
          >
            <Plus className="h-4 w-4" />
            {t("superadmin", "financeRecordPayment")}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-orange-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-300">
            {t("superadmin", "financeHowItWorksTitle")}
          </h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{t("superadmin", "financeHowItWorksIntro")}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t("superadmin", "financeHowItWorksRecord")}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t("superadmin", "financeHowItWorksUnpaid")}</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-orange-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeTotalAllTime")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : formatFcfa(summary.totalAllTime, locale)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-emerald-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financePeriodTotal")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : formatFcfa(summary.totalPeriod, locale)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-red-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financeAtRisk")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : formatFcfa(summary.revenueAtRisk, locale)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-sky-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{t("superadmin", "financePaymentsCount")}</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : summary.countPeriod}</p>
            </div>
          </div>

          {unpaidCenters.length > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
              <h3 className="font-black text-white">{t("superadmin", "financeUnpaidTitle")}</h3>
              <p className="text-xs text-slate-500">{t("superadmin", "financeUnpaidSubtitle")}</p>
              <ul className="mt-4 space-y-2">
                {unpaidCenters.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/superadmin/centres?focus=${c.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm hover:border-orange-400/40"
                    >
                      <span className="min-w-0 truncate font-bold text-slate-200">{c.name}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                            c.derived_status === "subscription_expired"
                              ? "border-orange-500/30 text-orange-300"
                              : c.billing_status === "unpaid"
                                ? "border-red-500/30 text-red-300"
                                : "border-amber-500/30 text-amber-300"
                          }`}
                        >
                          {c.derived_status === "subscription_expired"
                            ? t("superadmin", "centresDerivedStatus_subscription_expired")
                            : c.billing_status === "unpaid"
                              ? t("superadmin", "billingStatusUnpaid")
                              : t("superadmin", "billingStatusGrace")}
                        </span>
                        {c.subscription_amount != null && (
                          <span className="font-black text-white">{formatFcfa(c.subscription_amount, locale)}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <h3 className="font-black text-white">{t("superadmin", "financeChartTitle")}</h3>
            <p className="text-xs text-slate-500">{t("superadmin", "financeChartSubtitle")}</p>
            <div className="mt-6 flex h-40 items-end gap-2">
              {summary.monthlyRevenue.map((m, index) => {
                const monthLabel = new Date(m.year, m.month, 1).toLocaleDateString(
                  locale === "en" ? "en-GB" : "fr-FR",
                  { month: "long", year: "numeric" },
                );

                return (
                  <div
                    key={m.key}
                    className="group flex flex-1 flex-col items-center gap-1.5 outline-none"
                    tabIndex={0}
                    aria-label={`${monthLabel} : ${formatFcfa(m.total, locale)}`}
                  >
                    <div className="relative flex h-28 w-full items-end">
                      <div
                        className="relative w-full rounded-t bg-orange-500/80 transition-all duration-150 group-hover:bg-orange-400 group-focus:bg-orange-400"
                        style={{ height: `${loading ? 0 : Math.max(m.total > 0 ? 6 : 2, (m.total / growthMax) * 100)}%` }}
                      >
                        <div className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#151b28] px-3 py-2 text-left shadow-xl group-hover:block group-focus:block ${index === 0 ? "left-0" : index === summary.monthlyRevenue.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{monthLabel}</p>
                          <p className="mt-0.5 text-sm font-black text-white">{formatFcfa(m.total, locale)}</p>
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase text-slate-500">
                      {new Date(m.year, m.month, 1).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <h3 className="mb-4 font-black text-white">{t("superadmin", "financeHistoryTitle")}</h3>
            {loading ? (
              <p className="text-sm text-slate-500">…</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-slate-500">{t("superadmin", "financeEmpty")}</p>
            ) : (
              <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="py-3 pr-4">{t("superadmin", "financeColCenter")}</th>
                      <th className="py-3 pr-4">{t("superadmin", "financeColDate")}</th>
                      <th className="py-3 pr-4">{t("superadmin", "financeColMethod")}</th>
                      <th className="py-3 pr-4">{t("superadmin", "financeColDocument")}</th>
                      <th className="py-3 pr-4 text-right">{t("superadmin", "financeColAmount")}</th>
                      <th className="py-3 text-right">{t("superadmin", "financeColActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07]">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-4 font-bold text-slate-200">{p.centers?.name || "—"}</td>
                        <td className="py-3 pr-4 text-slate-400">{formatShortDate(p.paid_at, locale)}</td>
                        <td className="py-3 pr-4 text-slate-400">{methodLabel(p.method, t)}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-500">{p.document_number}</td>
                        <td className="py-3 pr-4 text-right font-black text-white">{formatFcfa(p.amount, locale)}</td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => void downloadInvoicePdf(toInvoicePayment(p), locale === "en" ? "en" : "fr")}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-orange-400/40"
                            >
                              <Download className="h-3 w-3" />
                              {t("superadmin", "financeDownloadInvoice")}
                            </button>
                            <button
                              onClick={() => void downloadReceiptPdf(toInvoicePayment(p), locale === "en" ? "en" : "fr")}
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-orange-400/40"
                            >
                              <Download className="h-3 w-3" />
                              {t("superadmin", "financeDownloadReceipt")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modalOpen && (
        <RecordPaymentModal
          onClose={() => {
            setModalOpen(false);
            setPrefill(null);
          }}
          onRecorded={() => void load()}
          initialCenterId={prefill?.centerId}
          initialAmount={prefill?.amount}
          initialPeriodLabel={prefill?.period}
        />
      )}
    </div>
  );
}
