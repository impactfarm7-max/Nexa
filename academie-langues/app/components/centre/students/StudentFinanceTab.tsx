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

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtFCFA(n: number) {
  return Math.round(n).toLocaleString("fr-FR");
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

export default function StudentFinanceTab({
  enrollmentId,
  tuitionFee,
  centerId,
  studentName,
  filiereName,
  onPaid,
}: Props) {
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
      if (!res.ok) throw new Error(json.error || "Chargement impossible.");

      const s = json.summary || {};
      setSummary({
        tuition_fee: Number(s.tuition_fee ?? tuitionFee) || 0,
        tuition_paid: Number(s.tuition_paid) || 0,
        reste_a_payer: Number(s.reste_a_payer ?? Math.max(0, Number(s.tuition_fee ?? tuitionFee) - Number(s.tuition_paid || 0))) || 0,
        financial_status: s.financial_status ?? null,
        discount_amount: Number(s.discount_amount) || 0,
        discount_reason: s.discount_reason ?? null,
      });
      setInstallments((json.installments || []).map((i: Installment) => ({
        ...i,
        amount: Number(i.amount) || 0,
        paid_amount: Number(i.paid_amount) || 0,
      })));
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
      setInstallments((instRows || []) as Installment[]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, tuitionFee]);

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
        studentName: studentName.trim() || "Apprenant",
        filiereName: filiereName.trim() || "Programme",
        resteAPayer: remaining,
        installments: installments.map((i) => ({
          label: i.label || "Échéance",
          due_date: i.due_date || "",
          amount: i.amount,
          paid_amount: Number(i.paid_amount) || 0,
          status: i.status || "pending",
        })),
        payments: payments.map((p) => ({
          payment_date: p.payment_date || "",
          receipt_number: p.receipt_number,
          payment_method: p.payment_method || "Paiement",
          amount: p.amount,
          recorded_by_name: p.recorded_by_name,
        })),
        config: config
          ? { ...config, title: config.title?.trim() || "Dossier financier" }
          : { title: "Dossier financier" },
      });
    } catch (e: unknown) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Téléchargement impossible.");
    } finally {
      setPdfBusy(false);
    }
  };

  const submitCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponError("Saisissez un code coupon.");
      return;
    }
    setCouponApplying(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
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
      if (!res.ok) throw new Error(json.error || "Coupon inapplicable.");
      setCouponCode("");
      setCouponSuccess(`Réduction de ${fmtFCFA(Number(json.discount_amount) || 0)} FCFA appliquée.`);
      await load();
      onPaid();
    } catch (e: unknown) {
      setCouponError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setCouponApplying(false);
    }
  };

  const submitDefer = async () => {
    if (!deferTarget) return;
    setDeferSaving(true); setDeferError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
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
      if (!res.ok) throw new Error(json.error || "Report impossible.");
      setDeferTarget(null);
      setDeferDate("");
      setDeferReason("");
      await load();
      onPaid();
    } catch (e: unknown) {
      setDeferError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setDeferSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-neutral-400 p-8">Chargement du dossier financier…</p>;

  return (
    <div className="w-full">
      <FinanceSection
        icon={Wallet}
        title="Situation financière"
        description="Coût du programme, versements et solde restant."
        actions={
          <>
            {!isPaid && (
              <button
                type="button"
                onClick={goToFinanceEncaisser}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ORANGE }}
              >
                <ArrowDownCircle size={12} /> Encaisser
              </button>
            )}
            <button
              type="button"
              onClick={() => void downloadDossierFinance()}
              disabled={pdfBusy}
              className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Télécharger
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Lock size={14} className="text-neutral-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Coût programme</p>
            </div>
            <p className="text-xl font-extrabold tracking-tight" style={{ color: BLUE }}>{fmtFCFA(fee)}</p>
            <p className="text-xs font-medium text-neutral-400 mt-0.5">FCFA</p>
            {(summary?.discount_amount || 0) > 0 && (
              <p className="text-xs font-semibold text-amber-700 mt-1.5">
                Réduction : −{fmtFCFA(summary!.discount_amount)} F
              </p>
            )}
          </div>
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowDownCircle size={14} className="text-emerald-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Versé</p>
            </div>
            <p className="text-xl font-extrabold tracking-tight text-emerald-700">{fmtFCFA(paid)}</p>
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
                {isPaid ? "Soldé" : "Reste à payer"}
              </p>
            </div>
            <p className={`text-xl font-extrabold tracking-tight ${isPaid ? "text-emerald-700" : "text-red-600"}`}>
              {fmtFCFA(remaining)}
            </p>
            <p className="text-xs font-medium text-neutral-400 mt-0.5">FCFA</p>
          </div>
        </div>

        {fee > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-neutral-600">Progression</span>
              <span className="text-sm font-bold" style={{ color: isPaid ? "#059669" : ORANGE }}>
                {progressPct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2.5 bg-white border border-black/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, backgroundColor: isPaid ? "#059669" : ORANGE }}
              />
            </div>
          </div>
        )}

        {summary && (summary.discount_amount || 0) > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Réduction appliquée</p>
            <p className="text-sm font-semibold text-amber-900">
              −{fmtFCFA(summary.discount_amount)} FCFA
              {summary.discount_reason ? ` — ${summary.discount_reason}` : ""}
            </p>
          </div>
        )}

        {!isPaid && remaining > 0 && (
          <div className="rounded-xl border border-black/[0.06] bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-neutral-600 flex items-center gap-1.5">
              <Tag size={14} style={{ color: ORANGE }} /> Appliquer un coupon
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError("");
                  setCouponSuccess("");
                }}
                placeholder="CODE COUPON"
                className={`${FIELD_INPUT} flex-1 uppercase`}
              />
              <button
                type="button"
                onClick={submitCoupon}
                disabled={couponApplying || !couponCode.trim()}
                className="h-12 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                style={{ backgroundColor: BLUE }}
              >
                {couponApplying ? <Loader2 size={14} className="animate-spin" /> : null}
                Appliquer
              </button>
            </div>
            {couponError && <p className="text-sm font-semibold text-red-500">{couponError}</p>}
            {couponSuccess && <p className="text-sm font-semibold text-emerald-600">{couponSuccess}</p>}
          </div>
        )}
      </FinanceSection>

      <FinanceSection
        icon={CalendarClock}
        title="Échéancier"
        description="Échéances, montants dus et reports éventuels."
      >
        {installments.length === 0 ? (
          <p className="text-sm text-neutral-400 font-medium italic">Aucune échéance enregistrée.</p>
        ) : (
          <div className="divide-y divide-black/[0.06] -mx-1">
            {installments.map((inst) => {
              const sold = inst.status === "paid" || (inst.paid_amount || 0) >= inst.amount;
              const deferred = !!inst.original_due_date && inst.original_due_date !== inst.due_date;
              return (
                <div key={inst.id} className="py-3.5 px-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: BLUE }}>{inst.label || "Échéance"}</p>
                      {deferred && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          Reporté
                        </span>
                      )}
                      {sold && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Soldé
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 font-medium mt-0.5">
                      Échéance : {fmtDate(inst.due_date)}
                      {deferred && inst.original_due_date && (
                        <span className="text-neutral-400"> · init. {fmtDate(inst.original_due_date)}</span>
                      )}
                    </p>
                    {inst.deferral_reason && (
                      <p className="text-xs text-blue-600 font-medium mt-0.5">Motif : {inst.deferral_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-extrabold" style={{ color: BLUE }}>{fmtFCFA(inst.amount)} F</p>
                    {!sold && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeferTarget(inst);
                          setDeferDate("");
                          setDeferReason("");
                          setDeferError("");
                        }}
                        className="h-8 px-2.5 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03]"
                      >
                        Report
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
        title="Historique des paiements"
        description="Versements enregistrés sur cette inscription."
      >
        {payments.length === 0 ? (
          <p className="text-sm text-neutral-400 font-medium italic">Aucun paiement enregistré.</p>
        ) : (
          <div className="divide-y divide-black/[0.06] -mx-1">
            {payments.map((p) => (
              <div key={p.id} className="py-3.5 px-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <ArrowDownCircle size={14} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: BLUE }}>{p.payment_method || "Paiement"}</p>
                    <p className="text-xs text-neutral-500 font-medium">
                      {fmtDate(p.payment_date)}
                      {p.recorded_by_name && ` · par ${p.recorded_by_name}`}
                      {p.receipt_number && ` · ${p.receipt_number}`}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-extrabold text-emerald-700 shrink-0">+{fmtFCFA(p.amount)} F</p>
              </div>
            ))}
          </div>
        )}
      </FinanceSection>

      {events.length > 0 && (
        <FinanceSection
          icon={Tag}
          title="Journal"
          description="Reports d’échéance et réductions appliquées."
        >
          <div className="divide-y divide-black/[0.06] -mx-1">
            {events.map((ev) => (
              <div key={ev.id} className="py-3.5 px-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {ev.type === "deferral" ? "Report" : ev.type === "discount" ? "Réduction" : ev.type}
                  {" · "}{fmtDate(ev.created_at)}
                  {ev.created_by_name && ` · ${ev.created_by_name}`}
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: BLUE }}>
                  {ev.type === "discount" && ev.amount != null ? `−${fmtFCFA(Number(ev.amount))} F — ` : ""}
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
                Report — {deferTarget.label || "Échéance"}
              </h3>
              <button
                type="button"
                onClick={() => setDeferTarget(null)}
                className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-neutral-500 font-medium">Date actuelle : {fmtDate(deferTarget.due_date)}</p>
            <div>
              <label className={FIELD_LABEL}>Nouvelle date</label>
              <input
                type="date"
                value={deferDate}
                onChange={(e) => setDeferDate(e.target.value)}
                className={FIELD_INPUT}
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Motif</label>
              <textarea
                rows={3}
                value={deferReason}
                onChange={(e) => setDeferReason(e.target.value)}
                placeholder="Ex. moratoire demandé par la famille…"
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
              Valider le report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
