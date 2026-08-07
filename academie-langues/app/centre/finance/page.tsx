"use client";

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import {
  Wallet, Search, Plus, X, Printer,
  Loader2, Filter, Download, Tag, Percent, Hash,
  ArrowDownCircle, CheckCircle2,
  Receipt, Users, AlertTriangle, Eye, MessageCircle, ArrowLeft, Clock, TrendingUp,
  Share2, FileText,
} from "lucide-react";
import CenterContentSkeleton from "@/app/components/CenterContentSkeleton";
import { supabase } from "@/app/utils/supabase";
import { loadCenterBootstrap, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import { fetchCenterApi, clearCenterApiCache } from "@/app/utils/center-api-client";
import { downloadJournalPdf, downloadStatementPdf } from "@/app/utils/centerPdfExport";
import type { DocumentExportConfig } from "@/app/utils/documentConfig";
import { buildDocumentFooterLines } from "@/app/utils/documentConfig";
import DocumentOfficialHeader from "@/app/components/centre/DocumentOfficialHeader";
import { AmountInWords } from "@/app/components/AmountInWords";
import { useI18n } from "@/app/i18n/I18nProvider";
import { localizeInstallmentLabel, localizePaymentMethod } from "@/app/utils/financeI18n";
import {
  CenterPageLayout,
  CenterPageHeader,
  OutlineHeaderButton,
  StatSep,
  ToolbarSelect,
  CenterPageBody,
  CenterDataTable,
  CenterTableRow,
  TableBtnPreview,
  TableBtnModify,
  TableActions,
  EmptyState,
  BLUE,
  ORANGE,
  SURFACE,
  PAGE_BG,
  AgentIaComingSoonButton,
  centerNotoSans,
} from "@/app/centre/center-page-ui";

// ============================================================
// TYPES
// ============================================================
type FinanceRow = {
  enrollment_id: string;
  student_id: string;
  prenom: string;
  nom: string;
  phone: string | null;
  center_status: string;
  filiere_name: string;
  niveau_annee: number | null;
  groupe_nom: string | null;
  tuition_fee: number;
  tuition_paid: number;
  reste_a_payer: number;
  enrollment_status: string;
  enrolled_at: string | null;
  next_due_date: string | null;
  next_due_amount: number | null;
  next_due_label: string | null;
  total_installments: number;
  paid_installments: number;
  late_installments: number;
  financial_status: string;
  aging_bucket: string;
  coupon_discount: number;
  discount_amount?: number;
  discount_reason?: string | null;
};

type PaymentRow = {
  id: string;
  enrollment_id: string;
  amount: number;
  payment_method: string;
  receipt_number: string | null;
  payment_date: string;
  notes: string | null;
  student_name: string;
  filiere_name: string;
  recorded_by_name?: string | null;
};

type Installment = {
  id: string;
  label: string;
  amount: number;
  due_date: string;
  status: string;
  paid_amount: number;
  original_due_date?: string | null;
  deferral_reason?: string | null;
};

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

const METHOD_OPTIONS = ["Mobile Money", "Espèces", "Virement", "Chèque", "Carte"];
type PrintFormat = "ticket" | "a4" | "a5";

const PRINT_FORMATS: Record<PrintFormat, {
  label: string;
  pageSize: string;
  pageMargin: string;
  width: string;
  padding: string;
  fontSize: string;
  amountSize: string;
  tableSize: string;
  logoSize: string;
}> = {
  ticket: {
    label: "Ticket 80mm",
    pageSize: "80mm auto",
    pageMargin: "2mm",
    width: "80mm",
    padding: "3mm",
    fontSize: "9px",
    amountSize: "16px",
    tableSize: "8px",
    logoSize: "28px",
  },
  a5: {
    label: "A5",
    pageSize: "A5 portrait",
    pageMargin: "8mm",
    width: "148mm",
    padding: "10mm",
    fontSize: "11px",
    amountSize: "22px",
    tableSize: "9px",
    logoSize: "40px",
  },
  a4: {
    label: "A4",
    pageSize: "A4 portrait",
    pageMargin: "10mm",
    width: "210mm",
    padding: "10mm 12mm",
    fontSize: "11px",
    amountSize: "22px",
    tableSize: "9px",
    logoSize: "44px",
  },
};

function docPreviewStyle(format: PrintFormat): React.CSSProperties {
  const cfg = PRINT_FORMATS[format];
  return {
    ...centerNotoSans.style,
    width: cfg.width,
    maxWidth: "100%",
    padding: cfg.padding,
    fontSize: cfg.fontSize,
    boxSizing: "border-box",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  };
}

function financeDocumentFooter(
  docConfig: DocumentExportConfig | null,
  locale: "fr" | "en",
  billingAgentName?: string | null,
) {
  return buildDocumentFooterLines({
    footerText: docConfig?.footerText,
    billingAgentName,
    locale,
  });
}

function profileDisplayName(profile?: { prenom?: string | null; nom?: string | null } | { prenom?: string | null; nom?: string | null }[] | null): string | null {
  const row = Array.isArray(profile) ? profile[0] : profile;
  if (!row) return null;
  const full = [row.prenom, row.nom].filter(Boolean).join(" ").trim();
  return full || row.prenom?.trim() || null;
}

/**
 * Résout les noms des agents ayant enregistré des paiements (recorded_by).
 * Requête séparée : student_payments.recorded_by n'a pas de FK vers profiles,
 * donc l'embed PostgREST échoue. On mappe les ids → nom via profiles.
 */
async function resolveRecordedByNames(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id, prenom, nom")
    .in("id", unique);
  const map: Record<string, string> = {};
  for (const p of data || []) {
    const name = profileDisplayName(p);
    if (name) map[p.id] = name;
  }
  return map;
}

type PaymentSuccess = {
  enrollmentId: string;
  amount: number;
  receiptNumber: string;
  studentName: string;
  resteApres: number;
};

/** Séparateur milliers = espace insécable (évite les "/" selon la locale Windows). */
function fmtFCFA(n: number) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const abs = Math.abs(v).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return neg ? `-${grouped}` : grouped;
}
function fmtDate(iso: string | null, locale = "fr") { return iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function fmtDateShort(iso: string | null, locale = "fr") { return iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short" }) : "—"; }

/** Extrait le code coupon depuis discount_reason (« Coupon RENTREE25 »). */
function couponCodeFromReason(reason?: string | null): string | null {
  if (!reason) return null;
  const m = reason.trim().match(/^Coupon\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function appliedDiscount(r: Pick<FinanceRow, "discount_amount" | "coupon_discount">): number {
  return Number(r.discount_amount) || Number(r.coupon_discount) || 0;
}

function openWhatsApp(text: string, phone?: string | null) {
  const encoded = encodeURIComponent(text);
  const digits = String(phone || "").replace(/\D/g, "");
  // WhatsApp Web évite le protocole whatsapp:// (erreur Windows si l'app desktop n'est pas installée)
  const url = digits
    ? `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

type FinanceExportLabels = {
  title: string; lastName: string; firstName: string; program: string; status: string;
  total: string; paid: string; balance: string; discount: string; coupon: string;
  nextInstallment: string; generatedOn: string; settled: string; late: string;
  exempt: string; inProgress: string;
};

function financeStatusLabel(st: string, labels: FinanceExportLabels) {
  return st === "paid" ? labels.settled
    : st === "late" ? labels.late
    : st === "exempt" ? labels.exempt
    : labels.inProgress;
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function downloadFinanceLedgerCsv(rows: FinanceRow[], labels: FinanceExportLabels) {
  const header = [labels.lastName, labels.firstName, labels.program, labels.status, labels.total, labels.paid, labels.balance, labels.discount, labels.coupon, labels.nextInstallment];
  const lines = [
    header,
    ...rows.map((r) => [
      r.nom,
      r.prenom,
      r.filiere_name,
      financeStatusLabel(r.financial_status, labels),
      String(Math.round(r.tuition_fee)),
      String(Math.round(r.tuition_paid)),
      String(Math.round(r.reste_a_payer)),
      String(Math.round(appliedDiscount(r))),
      couponCodeFromReason(r.discount_reason) || r.discount_reason || "",
      r.next_due_date || "",
    ]),
  ];
  const csv = lines
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finances-${toIsoDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildFinanceLedgerPdf(rows: FinanceRow[], caption: string, labels: FinanceExportLabels, locale: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const blue: [number, number, number] = [17, 34, 78];
  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(labels.title, 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(caption, 14, 22, { maxWidth: pageWidth - 28 });
  doc.text(`${labels.generatedOn} ${new Date().toLocaleString(locale === "en" ? "en-US" : "fr-FR")}`, 14, 28);
  autoTable(doc, {
    startY: 32,
    head: [[labels.lastName, labels.firstName, labels.program, labels.status, labels.total, labels.paid, labels.balance, labels.coupon]],
    body: rows.map((r) => [
      r.nom,
      r.prenom,
      r.filiere_name,
      financeStatusLabel(r.financial_status, labels),
      fmtFCFA(r.tuition_fee),
      fmtFCFA(r.tuition_paid),
      fmtFCFA(r.reste_a_payer),
      appliedDiscount(r) > 0
          ? `${couponCodeFromReason(r.discount_reason) || labels.discount} (−${fmtFCFA(appliedDiscount(r))})`
        : "—",
    ]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak", textColor: [40, 40, 40] },
    headStyles: { fillColor: blue, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    margin: { left: 14, right: 14 },
  });
  return doc;
}

async function downloadFinanceLedgerPdf(rows: FinanceRow[], caption: string, labels: FinanceExportLabels, locale: string) {
  const doc = await buildFinanceLedgerPdf(rows, caption, labels, locale);
  doc.save(`finances-${toIsoDate(new Date())}.pdf`);
}

async function silentDownloadFinanceLedgerPdf(rows: FinanceRow[], caption: string, labels: FinanceExportLabels, locale: string) {
  const doc = await buildFinanceLedgerPdf(rows, caption, labels, locale);
  const filename = `finances-${toIsoDate(new Date())}.pdf`;
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}

function FinanceKpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "red";
}) {
  const border =
    tone === "green" ? "border-emerald-500/70"
    : tone === "red" ? "border-red-500/70"
    : "border-[#11224E]/55";
  const valueCls =
    tone === "green" ? "text-emerald-700"
    : tone === "red" ? "text-red-600"
    : "";
  return (
    <div
      className={`rounded-xl border-2 ${border} bg-white px-3.5 py-3 min-w-0`}
      style={tone === "blue" ? { borderColor: "rgba(17,34,78,0.45)" } : undefined}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p
        className={`text-base sm:text-lg font-extrabold tracking-tight tabular-nums mt-1 truncate ${valueCls}`}
        style={tone === "blue" ? { color: BLUE } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

export default function CenterFinancePage() {
  const { t, locale } = useI18n();
  const paymentMethodLabel = (method: string) => {
    if (method === "Espèces") return t("centre", "collectionsMethodCash");
    if (method === "Virement") return t("centre", "collectionsMethodTransfer");
    if (method === "Carte") return t("centre", "collectionsMethodCard");
    if (method === "Chèque") return t("centre", "financeMethodCheck");
    return method;
  };
  const exportLabels: FinanceExportLabels = {
    title: t("centre", "managerFinances"), lastName: t("centre", "enrollmentLastName"), firstName: t("centre", "enrollmentFirstName"),
    program: t("centre", "enrollmentProgram"), status: t("centre", "settingsStatus"), total: t("centre", "enrollmentTotal"),
    paid: t("centre", "financePaid"), balance: t("centre", "summaryBalance"), discount: t("centre", "financeDiscount"),
    coupon: t("centre", "financeCoupon"), nextInstallment: t("centre", "financeNextInstallment"), generatedOn: t("centre", "financeGeneratedOn"),
    settled: t("centre", "recoveryStatusPaid"), late: t("centre", "financeLate"), exempt: t("centre", "financeExempt"), inProgress: t("centre", "financeInProgress"),
  };
  const [centerId, setCenterId] = useState("");
  const [shellLoading, setShellLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"ledger" | "overdue" | "journal" | "coupons">("ledger");
  const [records, setRecords] = useState<FinanceRow[]>([]);
  const [search, setSearch] = useState("");

  // Journal
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [shareBusy, setShareBusy] = useState(false);
  const [waPhoneOpen, setWaPhoneOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");

  // Paiement modal
  const [payModal, setPayModal] = useState<FinanceRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Mobile Money");
  const [payNotes, setPayNotes] = useState("");
  const [payInstallmentId, setPayInstallmentId] = useState("");
  const [payInstallments, setPayInstallments] = useState<Installment[]>([]);
  const [payError, setPayError] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>("a4");
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccess | null>(null);

  // Facture modal
  const [invoiceModal, setInvoiceModal] = useState<FinanceRow | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<PaymentRow[]>([]);
  const [invoiceInstallments, setInvoiceInstallments] = useState<Installment[]>([]);
  const [branding, setBranding] = useState<any>(null);
  const [docConfig, setDocConfig] = useState<DocumentExportConfig | null>(null);
  const [signatures, setSignatures] = useState<{ id: string; label: string; signatureUrl?: string | null }[]>([]);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponForm, setCouponForm] = useState({ code: "", type: "fixed" as "fixed" | "percentage", value: "", max_uses: "", expires_at: "" });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState("");

  // ============================================================
  // INIT
  // ============================================================
  useLayoutEffect(() => {
    const bootstrap = peekCenterBootstrap();
    if (!bootstrap) return;
    setCenterId(bootstrap.centerId);
    setShellLoading(false);
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setDataLoading(true);
      try {
        const data = await fetchCenterApi<{
          records: FinanceRow[];
          branding: Record<string, unknown> | null;
          docConfig: DocumentExportConfig;
          signatures: { id: string; label: string; signatureUrl?: string | null }[];
        }>("/api/center/finance-ledger", session.access_token);
        setBranding(data.branding);
        setDocConfig(data.docConfig);
        setSignatures((data.signatures || []).map((signature) => ({
          ...signature,
          label: locale === "en" && signature.label === "Signataire" ? "Signatory" : signature.label,
        })));
        setRecords(data.records || []);
      } finally {
        setDataLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const hadCache = Boolean(peekCenterBootstrap());
      const bootstrap = await loadCenterBootstrap();
      if (!bootstrap) {
        setShellLoading(false);
        setDataLoading(false);
        return;
      }
      setCenterId(bootstrap.centerId);
      setShellLoading(false);

      if (hadCache) return;

      setDataLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const data = await fetchCenterApi<{
          records: FinanceRow[];
          branding: Record<string, unknown> | null;
          docConfig: DocumentExportConfig;
          signatures: { id: string; label: string; signatureUrl?: string | null }[];
        }>("/api/center/finance-ledger", session.access_token);

        setBranding(data.branding);
        setDocConfig(data.docConfig);
        setSignatures((data.signatures || []).map((signature) => ({
          ...signature,
          label: locale === "en" && signature.label === "Signataire" ? "Signatory" : signature.label,
        })));
        setRecords(data.records || []);
      } finally {
        setDataLoading(false);
      }
    })();
  }, []);

  const loadRecords = async (cId: string): Promise<FinanceRow[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    clearCenterApiCache("/api/center/finance-ledger");
    const data = await fetchCenterApi<{ records: FinanceRow[] }>(
      "/api/center/finance-ledger",
      session.access_token,
      { force: true },
    );
    const rows = data.records || [];
    setRecords(rows);
    return rows;
  };

  // ============================================================
  // JOURNAL
  // ============================================================
  const loadJournal = useCallback(async () => {
    if (!centerId) return;
    setJournalLoading(true);
    let query = supabase
      .from("student_payments")
      .select("id, enrollment_id, amount, payment_method, receipt_number, payment_date, notes, enrollments!inner(student_id, filieres!inner(name), profiles:student_id(prenom, nom))")
      .eq("center_id", centerId)
      .order("payment_date", { ascending: false });

    if (dateFrom) query = query.gte("payment_date", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59);
      query = query.lte("payment_date", end.toISOString());
    }
    if (methodFilter !== "all") query = query.eq("payment_method", methodFilter);

    const { data } = await query.limit(500);
    setPayments((data || []).map((p: any) => ({
      id: p.id,
      enrollment_id: p.enrollment_id,
      amount: p.amount,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      payment_date: p.payment_date,
      notes: p.notes,
      student_name: `${p.enrollments?.profiles?.prenom || ""} ${p.enrollments?.profiles?.nom || ""}`.trim(),
      filiere_name: (p.enrollments?.filieres?.name || "—").toUpperCase(),
    })));
    setJournalLoading(false);
  }, [centerId, dateFrom, dateTo, methodFilter]);

  useEffect(() => { if (activeTab === "journal") loadJournal(); }, [activeTab, loadJournal]);

  // ============================================================
  // COUPONS
  // ============================================================
  const loadCoupons = useCallback(async () => {
    if (!centerId) return;
    setCouponsLoading(true);
    const { data } = await supabase.from("coupons").select("*").eq("center_id", centerId).order("created_at", { ascending: false });
    setCoupons((data || []) as Coupon[]);
    setCouponsLoading(false);
  }, [centerId]);

  useEffect(() => { if (activeTab === "coupons") loadCoupons(); }, [activeTab, loadCoupons]);

  const createCoupon = async () => {
    if (!couponForm.code.trim() || !couponForm.value.trim()) { setCouponError(t("centre", "financeCouponRequired")); return; }
    setCouponSaving(true); setCouponError("");
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("coupons").insert({
      center_id: centerId,
      code: couponForm.code.trim().toUpperCase(),
      type: couponForm.type,
      value: Number(couponForm.value),
      max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
      expires_at: couponForm.expires_at ? new Date(couponForm.expires_at).toISOString() : null,
      created_by: session?.user?.id || null,
    });
    if (error) setCouponError(t("centre", "financeCouponCreateError"));
    else { setCouponForm({ code: "", type: "fixed", value: "", max_uses: "", expires_at: "" }); await loadCoupons(); }
    setCouponSaving(false);
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: !active }).eq("id", id);
    await loadCoupons();
  };

  // ============================================================
  // PAIEMENT MODAL
  // ============================================================
  const openPayModal = async (row: FinanceRow) => {
    setPayModal(row); setPayAmount(""); setPayMethod("Mobile Money"); setPayNotes("");
    setPayError(""); setPayInstallmentId("");

    const { data } = await supabase
      .from("enrollment_installments")
      .select("id, label, amount, due_date, status, paid_amount")
      .eq("enrollment_id", row.enrollment_id)
      .neq("status", "paid")
      .order("position");
    setPayInstallments((data || []) as Installment[]);
    // Cascade par défaut (répartition auto) — pas de ciblage forcé sur la 1ʳᵉ échéance
    setPayInstallmentId("");
  };

  useEffect(() => {
    if (dataLoading || !records.length) return;
    const params = new URLSearchParams(window.location.search);
    const enrollmentId = params.get("enrollment");
    if (enrollmentId && params.get("pay") === "1") {
      const row = records.find((r) => r.enrollment_id === enrollmentId);
      if (row) {
        setActiveTab("ledger");
        void openPayModal(row);
        window.history.replaceState({}, "", "/centre/finance");
      }
    }
  }, [dataLoading, records]);

  const submitPayment = async () => {
    const num = parseInt(payAmount, 10);
    if (!num || num <= 0) { setPayError(t("centre", "financeInvalidAmount")); return; }
    if (!payModal) return;
    if (num > payModal.reste_a_payer) { setPayError(t("centre", "financeExceedsBalance", { balance: `${fmtFCFA(payModal.reste_a_payer)} F` })); return; }

    setPaySaving(true); setPayError("");
    const { data, error } = await supabase.rpc("record_payment", {
      p_enrollment_id: payModal.enrollment_id,
      p_center_id: centerId,
      p_amount: num,
      p_method: payMethod,
      p_installment_id: payInstallmentId || null,
      p_notes: payNotes.trim() || null,
    });

    if (error) { setPayError(t("centre", "financePaymentRecordError")); }
    else {
      const paymentId = data as string;
      const { data: paymentRow } = await supabase
        .from("student_payments")
        .select("receipt_number, amount, payment_method, payment_date, notes, recorded_by")
        .eq("id", paymentId)
        .single();

      const enrollmentId = payModal.enrollment_id;
      const studentName = `${payModal.prenom} ${payModal.nom}`;
      const resteApres = Math.max(0, payModal.reste_a_payer - num);
      setPayModal(null);
      await loadRecords(centerId);
      setPaymentSuccess({
        enrollmentId,
        amount: num,
        receiptNumber: paymentRow?.receipt_number || "—",
        studentName,
        resteApres,
      });
    }
    setPaySaving(false);
  };

  // ============================================================
  // FACTURE / RELEVÉ MODAL
  // ============================================================
  const openInvoice = async (row: FinanceRow) => {
    setInvoiceModal(row);
    const [{ data: pays }, { data: insts }] = await Promise.all([
      supabase.from("student_payments")
        .select("id, amount, payment_method, receipt_number, payment_date, notes, recorded_by")
        .eq("enrollment_id", row.enrollment_id)
        .order("payment_date"),
      supabase.from("enrollment_installments")
        .select("id, label, amount, due_date, status, paid_amount, original_due_date, deferral_reason")
        .eq("enrollment_id", row.enrollment_id)
        .order("position"),
    ]);
    const nameMap = await resolveRecordedByNames((pays || []).map((p) => p.recorded_by));
    setInvoicePayments((pays || []).map((p) => ({
      id: p.id,
      enrollment_id: row.enrollment_id,
      amount: p.amount,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      payment_date: p.payment_date,
      notes: p.notes,
      student_name: "",
      filiere_name: "",
      recorded_by_name: p.recorded_by ? nameMap[p.recorded_by] || null : null,
    })));
    setInvoiceInstallments((insts || []) as Installment[]);
  };

  // ============================================================
  // IMPRESSION / PARTAGE
  // ============================================================
  const printDocument = (format: PrintFormat, elementId: string) => {
    const cfg = PRINT_FORMATS[format];
    const isJournal = elementId === "journal-print-area";
    const printWidth = isJournal ? "100%" : cfg.width;
    document.getElementById("dynamic-print-page")?.remove();
    const style = document.createElement("style");
    style.id = "dynamic-print-page";
    style.textContent = `
      @page { size: ${cfg.pageSize}; margin: ${cfg.pageMargin}; }
      @media print {
        html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body * { visibility: hidden !important; }
        #${elementId}, #${elementId} * { visibility: visible !important; }
        #${elementId} {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: ${printWidth} !important;
          max-width: ${printWidth} !important;
          min-height: auto !important;
          height: auto !important;
          padding: ${cfg.padding} !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          font-family: ${centerNotoSans.style.fontFamily} !important;
          font-size: ${cfg.fontSize} !important;
          line-height: 1.35 !important;
          background: white !important;
          color: #11224E !important;
          overflow: visible !important;
          box-sizing: border-box !important;
        }
        #${elementId}, #${elementId} * {
          font-family: inherit !important;
        }
        #${elementId} .font-mono, #${elementId} .font-mono * {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        }
        #${elementId} .finance-doc-header {
          flex-wrap: wrap !important;
          gap: 8px !important;
        }
        #${elementId} .finance-doc-header-meta {
          max-width: 45% !important;
          min-width: 0 !important;
          word-break: break-word !important;
        }
        #${elementId} .finance-doc-amount { font-size: ${cfg.amountSize} !important; line-height: 1.2 !important; white-space: nowrap !important; overflow: visible !important; }
        #${elementId} table { font-size: ${cfg.tableSize} !important; width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; page-break-inside: auto !important; }
        #${elementId} tr { page-break-inside: avoid !important; page-break-after: auto !important; }
        #${elementId} thead { display: table-header-group !important; }
        #${elementId} tfoot { display: table-footer-group !important; }
        #${elementId} th, #${elementId} td {
          padding: ${format === "ticket" ? "2px 3px" : "4px 6px"} !important;
          overflow: visible !important;
          word-wrap: break-word !important;
          white-space: normal !important;
        }
        #${elementId} .finance-col-amount, #${elementId} td:last-child, #${elementId} th:last-child {
          white-space: nowrap !important;
          text-align: right !important;
          min-width: 3.5em !important;
        }
        #${elementId} .overflow-hidden, #${elementId} .overflow-x-auto { overflow: visible !important; }
        #${elementId} img { width: ${cfg.logoSize} !important; height: ${cfg.logoSize} !important; }
        #${elementId} .finance-doc-hide-ticket { display: ${format === "ticket" ? "none" : "table-row-group"} !important; }
        #${elementId} .finance-doc-compact { margin-bottom: ${format === "ticket" ? "8px" : "16px"} !important; page-break-inside: avoid !important; }
      }
    `;
    document.head.appendChild(style);
    document.body.dataset.printFormat = format;
    document.body.dataset.printTarget = elementId;
    window.print();
    delete document.body.dataset.printFormat;
    delete document.body.dataset.printTarget;
    document.getElementById("dynamic-print-page")?.remove();
  };

  const PrintToolbar = ({
    title,
    onBack,
    elementId,
    onDownloadPdf,
  }: {
    title: string;
    onBack: () => void;
    elementId: string;
    onDownloadPdf?: () => void;
  }) => (
    <div
      className="shrink-0 border-b border-black/[0.06] px-4 py-3 flex flex-wrap items-center justify-between gap-2 print:hidden z-10"
      style={{ backgroundColor: PAGE_BG }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] inline-flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeft size={14} /> {t("centre", "financeBack")}
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400 leading-none mb-0.5">{t("centre", "financePreview")}</p>
          <span className="text-sm font-extrabold tracking-tight truncate block" style={{ color: BLUE }}>{title}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={printFormat}
          onChange={(e) => setPrintFormat(e.target.value as PrintFormat)}
          className="h-8 px-2 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
        >
          {(Object.keys(PRINT_FORMATS) as PrintFormat[]).map((f) => (
            <option key={f} value={f}>{PRINT_FORMATS[f].label}</option>
          ))}
        </select>
        {onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] inline-flex items-center gap-1.5"
          >
            <Download size={13} style={{ color: ORANGE }} /> PDF
          </button>
        )}
        <button
          type="button"
          onClick={() => printDocument(printFormat, elementId)}
          className="h-8 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90"
          style={{ backgroundColor: BLUE }}
        >
          <Printer size={13} /> {t("centre", "financePrint")}
        </button>
      </div>
    </div>
  );

  const buildInvoiceWhatsAppText = (invoice: FinanceRow) => {
    const centerName = docConfig?.legalName || branding?.legal_name || t("centre", "financeYourCenter");
    const totalPaid = invoicePayments.reduce((s, p) => s + p.amount, 0);

    return [
      t("centre", "financeHello", { name: invoice.prenom || "" }).trim(),
      "",
      t("centre", "financeAccountSummaryMessage", { center: centerName }),
      "",
      `${t("centre", "navFormation")} : ${invoice.filiere_name}`,
      `${t("centre", "financeAmountAlreadyPaid")} : ${fmtFCFA(totalPaid)} FCFA`,
      `${t("centre", "financeRemainingBalance")} : ${fmtFCFA(invoice.reste_a_payer)} FCFA`,
      "",
      t("centre", "financeAvailableForQuestions"),
      "",
      t("centre", "financeRegards"),
      centerName,
    ].join("\n");
  };

  const downloadJournal = () => {
    void downloadJournalPdf(payments, dateFrom, dateTo, docConfig || undefined, locale);
  };

  const printJournal = () => {
    printDocument("a4", "journal-print-area");
  };

  const getInvoicePdfParams = () => {
    if (!invoiceModal) return null;
    return {
      config: docConfig || undefined,
      studentName: `${invoiceModal.prenom} ${invoiceModal.nom}`,
      filiereName: invoiceModal.filiere_name,
      resteAPayer: invoiceModal.reste_a_payer,
      installments: invoiceInstallments,
      payments: invoicePayments,
      signatures,
      stampUrl: (branding?.stamp_url as string | null) || null,
      locale,
    };
  };

  if (shellLoading) return null;

  if (dataLoading) {
    return (
      <CenterPageLayout header={<CenterPageHeader title={t("centre", "managerFinances")} />}>
        <CenterContentSkeleton variant="finance-body" />
      </CenterPageLayout>
    );
  }

  // ============================================================
  // KPIs
  // ============================================================
  const totalCA = records.reduce((s, r) => s + r.tuition_fee, 0);
  const totalEncaisse = records.reduce((s, r) => s + r.tuition_paid, 0);
  const totalImpayes = totalCA - totalEncaisse;
  const tauxRecouvrement = totalCA > 0 ? ((totalEncaisse / totalCA) * 100).toFixed(1) : "0";
  const lateCount = records.filter(r => r.financial_status === "late").length;
  const paidCount = records.filter(r => r.financial_status === "paid").length;
  const couponApplications = records
    .filter((r) => appliedDiscount(r) > 0)
    .map((r) => ({
      enrollment_id: r.enrollment_id,
      student: `${(r.prenom || "").toUpperCase()} ${(r.nom || "").toUpperCase()}`.trim(),
      filiere: r.filiere_name,
      amount: appliedDiscount(r),
      reason: r.discount_reason || t("centre", "financeDiscount"),
      code: couponCodeFromReason(r.discount_reason),
    }))
    .sort((a, b) => b.amount - a.amount);
  const totalCouponsApplied = couponApplications.reduce((s, r) => s + r.amount, 0);

  // Aging buckets
  const aging = {
    current: records.filter(r => r.aging_bucket === "current" && r.financial_status !== "paid" && r.financial_status !== "exempt"),
    d30: records.filter(r => r.aging_bucket === "30d"),
    d60: records.filter(r => r.aging_bucket === "60d"),
    d90: records.filter(r => r.aging_bucket === "90d_plus"),
  };
  const agingAmounts = {
    current: aging.current.reduce((s, r) => s + r.reste_a_payer, 0),
    d30: aging.d30.reduce((s, r) => s + r.reste_a_payer, 0),
    d60: aging.d60.reduce((s, r) => s + r.reste_a_payer, 0),
    d90: aging.d90.reduce((s, r) => s + r.reste_a_payer, 0),
  };

  // Journal totals
  const journalTotal = payments.reduce((s, p) => s + p.amount, 0);
  const journalByMethod = METHOD_OPTIONS.map(m => ({ method: m, total: payments.filter(p => p.payment_method === m).reduce((s, p) => s + p.amount, 0) })).filter(m => m.total > 0);

  const filtered = records.filter(r => `${r.prenom} ${r.nom}`.toLowerCase().includes(search.toLowerCase()));
  const overdueRows = records.filter((r) => r.financial_status === "late");
  const exportRows = activeTab === "overdue" ? overdueRows : filtered;
  const canExport = activeTab === "journal"
    ? payments.length > 0
    : activeTab === "coupons"
      ? coupons.length > 0 || couponApplications.length > 0
      : exportRows.length > 0;
  const exportCaption =
    activeTab === "overdue"
      ? `${t("centre", "financeUnpaid")} · ${t("centre", "financeRecordCount", { count: exportRows.length })}`
      : `${t("centre", "financeLedger")} · ${t("centre", "financeLineCount", { count: exportRows.length })}${search.trim() ? ` · ${t("centre", "financeSearchLabel")}: ${search.trim()}` : ""}`;

  const applyDatePreset = (preset: "today" | "7d" | "month" | "year") => {
    const now = new Date();
    const to = toIsoDate(now);
    if (preset === "today") {
      setDateFrom(to);
      setDateTo(to);
      return;
    }
    if (preset === "7d") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      setDateFrom(toIsoDate(from));
      setDateTo(to);
      return;
    }
    if (preset === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toIsoDate(from));
      setDateTo(to);
      return;
    }
    const from = new Date(now.getFullYear(), 0, 1);
    setDateFrom(toIsoDate(from));
    setDateTo(to);
  };

  const sendWhatsAppPdf = async () => {
    if (!canExport) return;
    setShareBusy(true);
    try {
      if (activeTab === "journal") {
        downloadJournal();
        openWhatsApp(
          t("centre", "financeJournalWhatsapp", { count: payments.length }),
          waPhone,
        );
      } else if (activeTab === "coupons") {
        openWhatsApp(t("centre", "financeCouponsWhatsapp", { count: coupons.length }), waPhone);
      } else {
        const filename = await silentDownloadFinanceLedgerPdf(exportRows, exportCaption, exportLabels, locale);
        openWhatsApp(
          t("centre", "financeListWhatsapp", { count: exportRows.length, filename }),
          waPhone,
        );
      }
      setWaPhoneOpen(false);
      setWaPhone("");
    } finally {
      setShareBusy(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={t("centre", "managerFinances")}
          actions={
            <>
              <FinanceShareMenu
                disabled={!canExport}
                busy={shareBusy}
                onCsv={() => {
                  if (!canExport) return;
                  if (activeTab === "coupons") return;
                  if (activeTab === "journal") {
                    const header = [t("centre", "reportsDate"), t("centre", "financeReceipt"), t("centre", "enrollmentLearner"), t("centre", "collectionsMethod"), t("centre", "collectionsAmount")];
                    const lines = [
                      header,
                      ...payments.map((p) => [
                        p.payment_date,
                        p.receipt_number || "",
                        p.student_name,
                        paymentMethodLabel(p.payment_method),
                        String(Math.round(p.amount)),
                      ]),
                    ];
                    const csv = lines
                      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
                      .join("\n");
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `journal-${toIsoDate(new Date())}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    return;
                  }
                  downloadFinanceLedgerCsv(exportRows, exportLabels);
                }}
                onPdf={async () => {
                  if (!canExport) return;
                  setShareBusy(true);
                  try {
                    if (activeTab === "journal") {
                      downloadJournal();
                    } else if (activeTab !== "coupons") {
                      await downloadFinanceLedgerPdf(exportRows, exportCaption, exportLabels, locale);
                    }
                  } finally {
                    setShareBusy(false);
                  }
                }}
                onWhatsAppPdf={() => {
                  if (!canExport) return;
                  setWaPhoneOpen(true);
                }}
              />
              <AgentIaComingSoonButton />
            </>
          }
        />
      }
    >
      <CenterPageBody>
        <div className="space-y-3 mb-1 print:hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <FinanceKpiCard label={t("centre", "recoveryCollected")} value={`${fmtFCFA(totalEncaisse)} F`} tone="green" />
            <FinanceKpiCard label={t("centre", "summaryOpenReceivables")} value={`${fmtFCFA(totalImpayes)} F`} tone="red" />
            <FinanceKpiCard label={t("centre", "summaryRecovery")} value={`${tauxRecouvrement} %`} tone="blue" />
            <FinanceKpiCard label={t("centre", "financeOverdue")} value={String(lateCount)} tone={lateCount > 0 ? "red" : "blue"} />
            <FinanceKpiCard label={locale === "en" ? t("centre", "summaryInvoicedRevenue") : "C.A."} value={`${fmtFCFA(totalCA)} F`} tone="blue" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative w-full sm:w-44 shrink-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("centre", "financeSearch")}
                className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-black/[0.08] text-[12px] font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10 placeholder:text-neutral-400"
                style={{ backgroundColor: SURFACE }}
              />
            </div>
            <ToolbarSelect
              label={t("centre", "financeView")}
              value={activeTab}
              onChange={(v) => setActiveTab(v as typeof activeTab)}
              minWidth="8.5rem"
              options={[
                { value: "ledger", label: t("centre", "financeLedger") },
                { value: "overdue", label: `${t("centre", "financeUnpaid")} (${lateCount})` },
                { value: "journal", label: t("centre", "collectionsJournalShort") },
                { value: "coupons", label: t("centre", "discountCenterCoupons") },
              ]}
            />
          </div>
        </div>

        {activeTab === "ledger" && (
          filtered.length === 0 ? (
            <EmptyState title={t("centre", "financeNoRecord")} hint={t("centre", "financeChangeSearch")} />
          ) : (
            <CenterDataTable
              columns={[t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "settingsStatus"), t("centre", "collectionsAmount"), t("centre", "financeCoupon"), t("centre", "financeActions")]}
              columnWidths={[undefined, "18%", "9%", "18%", "14%", "11.5rem"]}
            >
              {filtered.map((r, i) => {
                const isPaid = r.financial_status === "paid";
                const isLate = r.financial_status === "late";
                const statusLabel = isPaid ? t("centre", "recoveryStatusPaid") : isLate ? t("centre", "financeLate") : r.financial_status === "exempt" ? t("centre", "financeExempt") : t("centre", "financeInProgress");
                const discount = appliedDiscount(r);
                const couponCode = couponCodeFromReason(r.discount_reason);

                return (
                  <CenterTableRow key={r.enrollment_id} index={i}>
                    <td className="px-4 py-4 min-w-0">
                      <p className="text-[13px] font-semibold leading-snug truncate uppercase" style={{ color: BLUE }}>
                        {r.prenom} {r.nom}
                      </p>
                      {r.phone && <p className="text-[11px] text-neutral-400 font-medium mt-1 truncate">{r.phone}</p>}
                    </td>
                    <td className="px-4 py-4 min-w-0 align-top">
                      <p className="text-[12px] font-medium text-neutral-600 leading-snug truncate uppercase">{r.filiere_name}</p>
                    </td>
                    <td className="px-4 py-4 min-w-0 align-top">
                      <span className={`text-[12px] font-semibold ${isLate || (!isPaid && r.reste_a_payer > 0) ? "text-red-600" : "text-neutral-500"}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4 min-w-0 align-top">
                      <p className="text-[12px] font-medium text-neutral-700 tabular-nums leading-relaxed">
                        {fmtFCFA(r.tuition_paid)} / {fmtFCFA(r.tuition_fee)} F
                      </p>
                      {r.reste_a_payer > 0 && (
                        <p className="text-[11px] text-red-600 mt-1 tabular-nums">{t("centre", "summaryBalance")} {fmtFCFA(r.reste_a_payer)} F</p>
                      )}
                    </td>
                    <td className="px-4 py-4 min-w-0 align-top">
                      {discount > 0 ? (
                        <div>
                          <p className="text-[12px] font-semibold text-violet-700 tabular-nums">−{fmtFCFA(discount)} F</p>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500 mt-0.5 truncate">
                            {couponCode || r.discount_reason || t("centre", "financeDiscount")}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[12px] text-neutral-300">—</span>
                      )}
                    </td>
                    <TableActions>
                      <TableBtnPreview onClick={() => openInvoice(r)} label={t("centre", "financePreview")} />
                      {!isPaid && (
                        <TableBtnModify onClick={() => openPayModal(r)} label={t("centre", "financeCollect")} />
                      )}
                    </TableActions>
                  </CenterTableRow>
                );
              })}
            </CenterDataTable>
          )
        )}

          {activeTab === "overdue" && (
            <div className="space-y-4">
              <p className="text-sm font-medium" style={{ color: BLUE }}>
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold">{fmtFCFA(agingAmounts.current)} F</span>
                  <span>{t("centre", "financeCurrent")}</span>
                </span>
                <StatSep />
                <span className="font-semibold text-amber-700">{fmtFCFA(agingAmounts.d30)} F</span> {locale === "en" ? "30d" : "30j"}
                <StatSep />
                <span className="font-semibold text-red-600">{fmtFCFA(agingAmounts.d60)} F</span> {locale === "en" ? "60d" : "60j"}
                <StatSep />
                <span className="font-semibold text-red-600">{fmtFCFA(agingAmounts.d90)} F</span> {locale === "en" ? "90+d" : "90+j"}
              </p>

              {([
                { label: t("centre", "financeOverdue90"), list: aging.d90 },
                { label: t("centre", "financeOverdue60"), list: aging.d60 },
                { label: t("centre", "financeOverdue30"), list: aging.d30 },
                { label: t("centre", "financeCurrentInstallments"), list: aging.current },
              ]).filter(g => g.list.length > 0).map(({ label, list }) => (
                <section key={label}>
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <h3 className="text-sm font-medium text-neutral-900">{label}</h3>
                    <span className="text-xs text-neutral-400">{list.length}</span>
                  </div>
                  <CenterDataTable
                    columns={[t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "financeInstallment"), t("centre", "summaryBalance"), t("centre", "financeActions")]}
                    columnWidths={[undefined, "22%", "13%", "15%", "11.5rem"]}
                  >
                    {list.map((r, i) => (
                      <CenterTableRow key={r.enrollment_id} index={i}>
                        <td className="px-4 py-4 min-w-0">
                          <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: BLUE }}>{r.prenom} {r.nom}</p>
                        </td>
                        <td className="px-4 py-4 min-w-0 align-top">
                          <p className="text-[12px] text-neutral-600 leading-snug truncate uppercase">{r.filiere_name}</p>
                        </td>
                        <td className="px-4 py-4 text-[12px] text-neutral-600 tabular-nums align-top">
                          {r.next_due_date ? fmtDate(r.next_due_date, locale) : "—"}
                        </td>
                        <td className="px-4 py-4 text-[12px] font-semibold text-red-600 tabular-nums align-top">{fmtFCFA(r.reste_a_payer)} F</td>
                        <TableActions>
                          <TableBtnPreview onClick={() => openInvoice(r)} label={t("centre", "financePreview")} />
                          <TableBtnModify onClick={() => openPayModal(r)} label={t("centre", "financeCollect")} />
                        </TableActions>
                      </CenterTableRow>
                    ))}
                  </CenterDataTable>
                </section>
              ))}
              {lateCount === 0 && aging.current.length === 0 && (
                <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-12 text-center">
                  <CheckCircle2 size={36} className="text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">{t("centre", "financeNoUnpaid")}</p>
                </div>
              )}
            </div>
          )}

          {/* ══════════ JOURNAL ══════════ */}
          {activeTab === "journal" && (
            <div className="space-y-4" id="journal-print-area">
              <div className="print:hidden rounded-xl border border-black/[0.06] bg-white p-3 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["today", t("centre", "financeToday")],
                    ["7d", t("centre", "financeSevenDays")],
                    ["month", t("centre", "financeMonth")],
                    ["year", t("centre", "financeYear")],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyDatePreset(key)}
                      className="h-7 px-2.5 rounded-md border border-black/[0.08] text-[11px] font-semibold text-neutral-600 hover:bg-black/[0.03]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="shrink-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">{t("centre", "reportsFrom")}</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-black/[0.08] bg-white text-[12px] font-medium text-neutral-700 outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                    />
                  </div>
                  <div className="shrink-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">{t("centre", "reportsTo")}</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-black/[0.08] bg-white text-[12px] font-medium text-neutral-700 outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                    />
                  </div>
                  <div className="shrink-0">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">{t("centre", "collectionsMethod")}</label>
                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                      className="h-8 px-2 rounded-lg border border-black/[0.08] bg-white text-[12px] font-medium text-neutral-700 outline-none"
                    >
                      <option value="all">{t("centre", "financeAll")}</option>
                      {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={loadJournal}
                    className="h-8 px-3 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 shrink-0"
                    style={{ backgroundColor: BLUE }}
                  >
                    <Filter size={13} /> {t("centre", "financeFilter")}
                  </button>
                  <div className="flex-1 min-w-0" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={downloadJournal}
                      disabled={payments.length === 0}
                      className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-[12px] font-semibold text-neutral-700 inline-flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Download size={13} style={{ color: ORANGE }} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={printJournal}
                      disabled={payments.length === 0}
                      className="h-8 px-3 rounded-lg text-[12px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-40"
                      style={{ backgroundColor: BLUE }}
                    >
                      <Printer size={13} /> {t("centre", "financePrint")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden print:block mb-4">
                <h2 className="text-lg font-black" style={{ color: BLUE }}>{t("centre", "collectionsJournal")}</h2>
                <p className="text-xs text-neutral-500">{t("centre", "reportsPeriod")} : {dateFrom || "—"} → {dateTo || "—"} · {t("centre", "enrollmentTotal")} : {fmtFCFA(journalTotal)} FCFA</p>
              </div>

              {/* Totaux par mode */}
              {journalByMethod.length > 0 && (
                <div className="flex gap-3 flex-wrap print:hidden">
                  <div className="bg-white p-3 rounded-xl border flex items-center gap-2">
                    <p className="text-[9px] font-black uppercase text-neutral-400">Total</p>
                    <p className="text-sm font-black" style={{ color: BLUE }}>{fmtFCFA(journalTotal)} F</p>
                  </div>
                  {journalByMethod.map(m => (
                    <div key={m.method} className="bg-white p-3 rounded-xl border flex items-center gap-2">
                      <p className="text-[9px] font-black uppercase text-neutral-400">{localizePaymentMethod(m.method, locale)}</p>
                      <p className="text-sm font-black text-emerald-600">{fmtFCFA(m.total)} F</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Liste */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden overflow-x-auto finance-journal-table-wrap">
                <table className="w-full text-left text-sm min-w-[700px] finance-journal-table">
                  <thead className="bg-neutral-50 text-[9px] font-black uppercase tracking-widest text-neutral-400 border-b">
                    <tr>
                      <th className="p-4">{t("centre", "financeDateTime")}</th>
                      <th className="p-4">{t("centre", "financeReceiptNumber")}</th>
                      <th className="p-4">{t("centre", "enrollmentLearner")}</th>
                      <th className="p-4">{t("centre", "collectionsMethod")}</th>
                      <th className="p-4 text-right finance-col-amount">{t("centre", "collectionsAmount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs">
                    {journalLoading ? (
                      <tr><td colSpan={5} className="p-8 text-center"><Loader2 size={20} className="animate-spin mx-auto text-neutral-300" /></td></tr>
                    ) : payments.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-neutral-400 italic">{t("centre", "financeNoTransaction")}</td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id} className="hover:bg-neutral-50/50">
                        <td className="p-4 font-mono text-[11px] text-neutral-500">{new Date(p.payment_date).toLocaleString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="p-4 font-mono font-bold text-[11px]" style={{ color: BLUE }}>{p.receipt_number || "—"}</td>
                        <td className="p-4">
                          <p className="font-bold" style={{ color: BLUE }}>{p.student_name}</p>
                          <p className="text-[10px] text-neutral-400 uppercase">{p.filiere_name}</p>
                        </td>
                        <td className="p-4 text-neutral-500 font-medium">{paymentMethodLabel(p.payment_method)}</td>
                        <td className="p-4 text-right font-medium tabular-nums text-neutral-900 finance-col-amount">+{fmtFCFA(p.amount)} F</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════ COUPONS ══════════ */}
          {activeTab === "coupons" && (
            <div className="space-y-6 max-w-4xl">
              {/* Formulaire création */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 space-y-4">
                <h3 className="text-sm font-medium text-neutral-900 flex items-center gap-1.5"><Tag size={14} style={{ color: ORANGE }} /> {t("centre", "financeCreateCoupon")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Code *</label>
                    <input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder={t("centre", "financeCouponCodePlaceholder")} className="w-full h-10 px-3 rounded-lg border bg-neutral-50 text-xs font-black outline-none uppercase" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">{t("centre", "programType")}</label>
                    <select value={couponForm.type} onChange={e => setCouponForm(f => ({ ...f, type: e.target.value as "fixed" | "percentage" }))} className="w-full h-10 px-3 rounded-lg border bg-neutral-50 text-xs font-bold outline-none">
                      <option value="fixed">{t("centre", "financeFixedAmount")}</option>
                      <option value="percentage">{t("centre", "financePercentage")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">{t("centre", "summaryValue")} *</label>
                    <input type="number" value={couponForm.value} onChange={e => setCouponForm(f => ({ ...f, value: e.target.value }))} placeholder={`${locale === "en" ? "E.g." : "Ex."} ${couponForm.type === "percentage" ? "10" : "50000"}`} className="w-full h-10 px-3 rounded-lg border bg-neutral-50 text-xs font-bold outline-none" />
                    {couponForm.type === "fixed" && <AmountInWords amount={couponForm.value} />}
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">{t("centre", "financeMaxUses")}</label>
                    <input type="number" value={couponForm.max_uses} onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))} placeholder={t("centre", "financeUnlimited")} className="w-full h-10 px-3 rounded-lg border bg-neutral-50 text-xs font-bold outline-none" />
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">{t("centre", "discountExpiration")}</label>
                    <input type="date" value={couponForm.expires_at} onChange={e => setCouponForm(f => ({ ...f, expires_at: e.target.value }))} className="h-10 px-3 rounded-lg border bg-neutral-50 text-xs font-bold outline-none" />
                  </div>
                  <button onClick={createCoupon} disabled={couponSaving} className="h-9 px-4 rounded-full text-sm text-white inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-opacity" style={{ backgroundColor: BLUE }}>
                    {couponSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} {t("centre", "financeCreate")}
                  </button>
                </div>
                {couponError && <p className="text-xs font-bold text-red-500">{couponError}</p>}
              </div>

              {/* Liste coupons */}
              {couponsLoading ? (
                <div className="text-center py-8"><Loader2 size={20} className="animate-spin mx-auto text-neutral-300" /></div>
              ) : coupons.length === 0 ? (
                <p className="text-center py-8 text-sm text-neutral-400">{t("centre", "financeNoCoupon")}</p>
              ) : (
                <div className="space-y-2">
                  {coupons.map(c => (
                    <div key={c.id} className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4 ${!c.is_active ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-50 border border-orange-100">
                          {c.type === "percentage" ? <Percent size={16} className="text-orange-600" /> : <Hash size={16} className="text-orange-600" />}
                        </div>
                        <div>
                          <p className="font-black text-sm font-mono" style={{ color: BLUE }}>{c.code}</p>
                          <p className="text-[10px] text-neutral-400">
                            {c.type === "percentage" ? `${c.value}%` : `${fmtFCFA(c.value)} FCFA`}
                            {c.max_uses && ` · ${c.uses_count}/${c.max_uses} ${t("centre", "financeUsedPlural")}`}
                            {!c.max_uses && c.uses_count > 0 && ` · ${c.uses_count} ${t("centre", c.uses_count > 1 ? "financeUsedPlural" : "financeUsed")}`}
                            {c.expires_at && ` · ${t("centre", "financeExpires")} ${fmtDateShort(c.expires_at, locale)}`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => toggleCoupon(c.id, c.is_active)} className={`h-8 px-3 rounded-full border text-[11px] font-bold transition-colors ${c.is_active ? "text-neutral-700 border-neutral-200 hover:bg-neutral-50" : "text-white border-transparent hover:opacity-90"}`} style={!c.is_active ? { backgroundColor: BLUE } : undefined}>
                        {c.is_active ? t("centre", "financeDisable") : t("centre", "financeEnableAgain")}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Coupons appliqués aux étudiants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-neutral-900 flex items-center gap-1.5">
                    <Tag size={14} style={{ color: ORANGE }} /> {t("centre", "financeAppliedCoupons")}
                  </h3>
                  {couponApplications.length > 0 && (
                    <p className="text-xs font-semibold text-violet-700 tabular-nums">
                      {t("centre", "financeRecordCount", { count: couponApplications.length })} · −{fmtFCFA(totalCouponsApplied)} F
                    </p>
                  )}
                </div>
                {couponApplications.length === 0 ? (
                  <p className="text-center py-8 text-sm text-neutral-400 rounded-2xl border border-dashed border-neutral-200 bg-white">
                    {t("centre", "financeNoAppliedCoupon")}
                  </p>
                ) : (
                  <CenterDataTable
                    columns={[t("centre", "enrollmentLearner"), t("centre", "enrollmentProgram"), t("centre", "financeCoupon"), t("centre", "financeDiscount")]}
                    columnWidths={[undefined, "28%", "18%", "16%"]}
                  >
                    {couponApplications.map((app, i) => (
                      <CenterTableRow key={app.enrollment_id} index={i}>
                        <td className="px-4 py-3.5 min-w-0">
                          <p className="text-[13px] font-semibold truncate uppercase" style={{ color: BLUE }}>{app.student}</p>
                        </td>
                        <td className="px-4 py-3.5 min-w-0 align-top">
                          <p className="text-[12px] font-medium text-neutral-600 truncate uppercase">{app.filiere || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <p className="text-[12px] font-bold font-mono text-violet-700 uppercase">
                            {app.code || "—"}
                          </p>
                          {!app.code && app.reason && (
                            <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{app.reason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[12px] font-semibold text-violet-700 tabular-nums align-top">
                          −{fmtFCFA(app.amount)} F
                        </td>
                      </CenterTableRow>
                    ))}
                  </CenterDataTable>
                )}
              </div>
            </div>
          )}
      </CenterPageBody>

      {/* ══════════ MODAL PAIEMENT ══════════ */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-neutral-200 relative">
            <button onClick={() => setPayModal(null)} className="absolute top-4 right-4 h-9 w-9 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 inline-flex items-center justify-center"><X size={16} /></button>
            <h3 className="text-xl font-black tracking-tight mb-1" style={{ color: BLUE }}>{t("centre", "financeEnterPayment")}</h3>
            <p className="text-sm text-neutral-500 mb-1">{payModal.prenom} {payModal.nom}</p>
            <div className="inline-flex mt-2 mb-5 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50">
              <p className="text-xs font-medium text-neutral-700">{t("centre", "summaryBalance")} <span className="tabular-nums font-bold" style={{ color: BLUE }}>{fmtFCFA(payModal.reste_a_payer)}</span> FCFA</p>
            </div>

            <div className="space-y-4">
              {payInstallments.length > 0 && (
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">{t("centre", "financeTargetInstallment")}</label>
                  <select
                    value={payInstallmentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setPayInstallmentId(id);
                      setPayError("");
                      if (!id) return;
                      const inst = payInstallments.find((i) => i.id === id);
                      if (!inst) return;
                      const remaining = Math.max(0, inst.amount - (inst.paid_amount || 0));
                      if (remaining > 0) setPayAmount(String(remaining));
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/10"
                  >
                    <option value="">{t("centre", "financeAutomaticAllocation")}</option>
                    {payInstallments.map(inst => (
                      <option key={inst.id} value={inst.id}>{localizeInstallmentLabel(inst.label, locale)}{locale === "en" ? ": " : " — "}{fmtFCFA(Math.max(0, inst.amount - (inst.paid_amount || 0)))} F {t("centre", "financeRemainingLower")} ({t("centre", "financeDueLower")} {fmtDateShort(inst.due_date, locale)})</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-neutral-400 mt-1">
                    {t("centre", "financeCascadeHelp")}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-neutral-500 block mb-1">{t("centre", "financeAmountFcfa")} *</label>
                <div className="flex gap-2">
                  <input type="number" min={1} value={payAmount} onChange={e => { setPayAmount(e.target.value); setPayError(""); }} placeholder={`Max : ${fmtFCFA(payModal.reste_a_payer)}`} className="flex-1 h-11 px-3 rounded-xl border border-neutral-200 bg-white font-medium text-sm outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400" />
                  <button
                    type="button"
                    onClick={() => { setPayAmount(String(payModal.reste_a_payer)); setPayError(""); setPayInstallmentId(""); }}
                    className="h-11 px-3 rounded-full border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 shrink-0"
                  >
                    {t("centre", "financeBalance")}
                  </button>
                </div>
                <AmountInWords amount={payAmount} />
              </div>
              <div>
                <label className="text-xs text-neutral-500 block mb-1">{t("centre", "financePaymentMethod")}</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/10">
                  {METHOD_OPTIONS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-500 block mb-1">{t("centre", "financeOptionalNote")}</label>
                <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder={t("centre", "financeNotePlaceholder")} className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-neutral-900/10" />
              </div>
              {payError && <p className="text-sm text-neutral-800 bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2">{payError}</p>}
              <button onClick={submitPayment} disabled={paySaving} className="w-full h-11 rounded-full text-sm font-medium text-white disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" style={{ backgroundColor: BLUE }}>
                {paySaving ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />} {t("centre", "financeValidateOperation")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ POPUP PAIEMENT VALIDÉ ══════════ */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "financePaymentValidated")}</h3>
                <p className="mt-2 text-sm text-neutral-700 tabular-nums">
                  {fmtFCFA(paymentSuccess.amount)} FCFA {t("centre", "financeCollectedLower")}
                </p>
                <AmountInWords amount={paymentSuccess.amount} className="text-[11px] text-neutral-500 italic mt-1 leading-snug" />
                <p className="mt-1 text-xs font-mono text-neutral-500">
                  {locale === "en" ? "No." : "N°"} {paymentSuccess.receiptNumber}
                </p>
                {paymentSuccess.resteApres > 0 ? (
                  <>
                    <p className="mt-2 text-xs text-neutral-600">
                      {t("centre", "financeRemainingBalance")} : <span className="font-medium tabular-nums">{fmtFCFA(paymentSuccess.resteApres)} FCFA</span>
                    </p>
                    <AmountInWords amount={paymentSuccess.resteApres} className="text-[11px] text-neutral-500 italic mt-1 leading-snug" />
                  </>
                ) : (
                  <p className="mt-2 text-xs text-emerald-700 font-medium">{t("centre", "financeAccountSettled")}</p>
                )}
                <p className="mt-1 text-[11px] text-neutral-400">{paymentSuccess.studentName}</p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const enrollmentId = paymentSuccess.enrollmentId;
                    setPaymentSuccess(null);
                    const rows = await loadRecords(centerId);
                    const row = rows.find((r) => r.enrollment_id === enrollmentId);
                    if (row) await openInvoice(row);
                  }}
                  className="w-full h-11 rounded-full text-sm font-medium text-white inline-flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ backgroundColor: BLUE }}
                >
                  <Download size={14} /> {t("centre", "financeDownload")}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSuccess(null)}
                  className="w-full h-10 rounded-full text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  {t("centre", "periodClose")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL FACTURE / RELEVÉ ══════════ */}
      {invoiceModal && (
        <div className={`${centerNotoSans.className} fixed inset-0 z-50 flex flex-col text-[#11224E]`} style={{ backgroundColor: PAGE_BG }}>
          <PrintToolbar
            title={t("centre", "financeAccountStatement")}
            onBack={() => setInvoiceModal(null)}
            elementId="invoice-content"
            onDownloadPdf={() => {
              const params = getInvoicePdfParams();
              if (params) void downloadStatementPdf(params);
            }}
          />
          <div className="shrink-0 border-b border-black/[0.06] px-4 py-2 flex flex-wrap gap-2 print:hidden" style={{ backgroundColor: PAGE_BG }}>
            <button
              type="button"
              onClick={() => openWhatsApp(
                buildInvoiceWhatsAppText(invoiceModal),
                invoiceModal.phone
              )}
              className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] inline-flex items-center gap-1.5"
            >
              <MessageCircle size={13} style={{ color: ORANGE }} /> WhatsApp
            </button>
            <span className="text-[11px] font-medium text-neutral-400 self-center ml-auto">
              {t("centre", "financePreview")} {PRINT_FORMATS[printFormat].label} · {PRINT_FORMATS[printFormat].width}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-auto p-4 flex justify-center items-start min-h-0" style={{ backgroundColor: "#E8E6E3" }}>
          <div
            id="invoice-content"
            data-format={printFormat}
            className={`${centerNotoSans.className} bg-white shadow-xl transition-all duration-200 finance-print-doc shrink-0 border border-black/[0.06] rounded-xl`}
            style={docPreviewStyle(printFormat)}
          >

            {/* En-tête centre */}
            <DocumentOfficialHeader
              config={docConfig}
              fallbackName={branding?.legal_name || t("centre", "financeInstitution")}
              fallbackTitle={t("centre", "financeAccountStatement")}
              hideMeta={printFormat === "ticket"}
              logoSize={parseInt(PRINT_FORMATS[printFormat].logoSize, 10) || 44}
              className="finance-doc-compact finance-doc-header"
              metaClassName="finance-doc-header-meta"
              nameClassName={
                printFormat === "ticket" ? "text-[10px] font-extrabold tracking-tight"
                : printFormat === "a5" ? "text-[14px] font-extrabold tracking-tight"
                : "text-lg font-extrabold tracking-tight"
              }
              titleClassName={printFormat === "ticket" ? "text-[7px] font-bold uppercase tracking-wider" : "text-[10px] font-bold uppercase tracking-wider"}
              rightExtra={
                <p className="font-medium">{t("centre", "financeIssuedOn")} {new Date().toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")}</p>
              }
            />

            {/* Infos étudiant */}
            <div
              className="p-3.5 rounded-xl border border-black/[0.06] mb-4 flex justify-between gap-3 finance-doc-compact"
              style={{ backgroundColor: SURFACE }}
            >
              <div className="min-w-0">
                <p className="font-bold uppercase tracking-wider text-neutral-400" style={{ fontSize: printFormat === "ticket" ? "7px" : "9px" }}>{t("centre", "enrollmentLearner")}</p>
                <p className="font-extrabold tracking-tight" style={{ color: BLUE, fontSize: printFormat === "ticket" ? "10px" : "13px" }}>{invoiceModal.prenom} {invoiceModal.nom}</p>
                <p className="text-neutral-500 font-medium uppercase" style={{ fontSize: printFormat === "ticket" ? "8px" : "11px" }}>{invoiceModal.filiere_name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold uppercase tracking-wider text-neutral-400" style={{ fontSize: printFormat === "ticket" ? "7px" : "9px" }}>{t("centre", "financeBalance")}</p>
                <p className={`finance-doc-amount font-extrabold tracking-tight tabular-nums ${invoiceModal.reste_a_payer > 0 ? "text-red-600" : "text-emerald-600"}`} style={{ fontSize: PRINT_FORMATS[printFormat].amountSize }}>
                  {invoiceModal.reste_a_payer > 0 ? fmtFCFA(invoiceModal.reste_a_payer) + " F" : t("centre", "recoveryStatusPaid")}
                </p>
                {invoiceModal.reste_a_payer > 0 && (
                  <AmountInWords
                    amount={invoiceModal.reste_a_payer}
                    className="text-[10px] text-neutral-500 italic mt-1 leading-snug print:block font-medium"
                  />
                )}
              </div>
            </div>

            {(appliedDiscount(invoiceModal) > 0) && (
              <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-0.5">{t("centre", "financeCouponDiscount")}</p>
                <p className="text-xs font-semibold text-violet-800">
                  −{fmtFCFA(appliedDiscount(invoiceModal))} F
                  {invoiceModal.discount_reason ? `${locale === "en" ? ": " : " — "}${invoiceModal.discount_reason}` : ""}
                </p>
              </div>
            )}

            {/* Échéancier — masqué sur ticket */}
            {invoiceInstallments.length > 0 && printFormat !== "ticket" && (
              <div className="mb-4 finance-doc-compact finance-doc-hide-ticket">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">{t("centre", "financeSchedule")}</h4>
                <table className="w-full text-xs border border-black/[0.06] rounded-lg overflow-hidden table-fixed">
                  <thead className="text-[9px] font-bold uppercase tracking-wider text-neutral-400" style={{ backgroundColor: SURFACE }}>
                    <tr>
                      <th className="p-2.5 text-left">{t("centre", "financeInstallment")}</th>
                      <th className="p-2.5 text-center">{t("centre", "reportsDate")}</th>
                      <th className="p-2.5 text-right">{t("centre", "financeDue")}</th>
                      <th className="p-2.5 text-right">{t("centre", "financePaid")}</th>
                      <th className="p-2.5 text-center">{t("centre", "settingsStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {invoiceInstallments.map(inst => {
                      const deferred = Boolean(inst.original_due_date && inst.original_due_date !== inst.due_date);
                      return (
                      <tr key={inst.id} className={inst.status === "late" ? "bg-red-50/50" : ""}>
                        <td className="p-2.5 font-semibold" style={{ color: BLUE }}>
                          {localizeInstallmentLabel(inst.label, locale)}
                          {deferred && (
                            <span className="ml-1.5 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-50 text-sky-700">{t("centre", "financeDeferred")}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-medium text-neutral-500">
                          {fmtDateShort(inst.due_date, locale)}
                          {deferred && inst.original_due_date && (
                            <div className="text-[9px] text-neutral-400 line-through">{fmtDateShort(inst.original_due_date, locale)}</div>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-semibold tabular-nums finance-col-amount">{fmtFCFA(inst.amount)} F</td>
                        <td className="p-2.5 text-right font-semibold tabular-nums text-emerald-600 finance-col-amount">{fmtFCFA(inst.paid_amount)} F</td>
                        <td className="p-2.5 text-center">
                          <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${inst.status === "paid" ? "bg-emerald-50 text-emerald-700" : inst.status === "late" ? "bg-red-50 text-red-700" : inst.status === "partial" ? "bg-amber-50 text-amber-700" : "bg-neutral-50 text-neutral-400"}`}>{inst.status === "paid" ? t("centre", "recoveryStatusPaid") : inst.status === "late" ? t("centre", "financeLate") : inst.status === "partial" ? t("centre", "recoveryStatusPartial") : t("centre", "summaryPending")}</span>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            )}

            {/* Historique des paiements */}
            <h4 className="font-bold uppercase tracking-wider text-neutral-400 mb-2 finance-doc-compact" style={{ fontSize: printFormat === "ticket" ? "7px" : "10px" }}>{t("centre", "financeRecordedPayments")}</h4>
            <table className="w-full border border-black/[0.06] rounded-lg overflow-hidden mb-4 finance-doc-compact" style={{ fontSize: PRINT_FORMATS[printFormat].tableSize }}>
              <thead className="text-white font-bold uppercase tracking-wider" style={{ backgroundColor: BLUE, fontSize: printFormat === "ticket" ? "7px" : "8px" }}>
                <tr>
                  <th className="p-2 text-left">{t("centre", "reportsDate")}</th>
                  <th className="p-2">{t("centre", "financeReceiptNumber")}</th>
                  {printFormat !== "ticket" && <th className="p-2">{t("centre", "collectionsMethod")}</th>}
                  {printFormat !== "ticket" && <th className="p-2">{t("centre", "financeBy")}</th>}
                  <th className="p-2 text-right finance-col-amount">{t("centre", "collectionsAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {invoicePayments.length === 0 ? (
                  <tr><td colSpan={printFormat === "ticket" ? 3 : 5} className="p-3 text-center text-neutral-400 italic font-medium">{t("centre", "financeNoPayment")}</td></tr>
                ) : invoicePayments.map(p => (
                  <tr key={p.id}>
                    <td className="p-2 font-medium text-neutral-600">{printFormat === "ticket" ? fmtDateShort(p.payment_date, locale) : fmtDate(p.payment_date, locale)}</td>
                    <td className="p-2 font-mono font-semibold" style={{ color: BLUE }}>{p.receipt_number || "—"}</td>
                    {printFormat !== "ticket" && <td className="p-2 text-neutral-500 font-medium">{paymentMethodLabel(p.payment_method)}</td>}
                    {printFormat !== "ticket" && <td className="p-2 text-neutral-600 font-medium">{p.recorded_by_name || "—"}</td>}
                    <td className="p-2 text-right font-extrabold tabular-nums text-emerald-600 finance-col-amount">+{fmtFCFA(p.amount)} F</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: SURFACE }}>
                  <td colSpan={printFormat === "ticket" ? 2 : 4} className="p-2 text-right font-bold uppercase tracking-wider" style={{ color: BLUE, fontSize: printFormat === "ticket" ? "7px" : "10px" }}>{t("centre", "payrollTotalPaid")}</td>
                  <td className="p-2 text-right font-extrabold tabular-nums text-emerald-600 finance-col-amount">{fmtFCFA(invoicePayments.reduce((s, p) => s + p.amount, 0))} F</td>
                </tr>
                <tr>
                  <td colSpan={printFormat === "ticket" ? 2 : 4} className="p-2 text-right font-bold uppercase tracking-wider" style={{ color: BLUE, fontSize: printFormat === "ticket" ? "7px" : "10px" }}>{t("centre", "financeRemainingBalance")}</td>
                  <td className="p-2 text-right font-extrabold tabular-nums finance-doc-amount finance-col-amount" style={{ color: ORANGE, fontSize: PRINT_FORMATS[printFormat].amountSize }}>{fmtFCFA(invoiceModal.reste_a_payer)} F</td>
                </tr>
              </tfoot>
            </table>
            {invoiceModal.reste_a_payer > 0 && (
              <AmountInWords
                amount={invoiceModal.reste_a_payer}
                className="text-[10px] text-neutral-500 italic mt-1 leading-snug print:block font-medium"
              />
            )}

            {(signatures.length > 0 || branding?.stamp_url) && printFormat !== "ticket" && (
              <div className="relative flex flex-wrap justify-end items-end gap-8 mt-6 mb-2">
                {branding?.stamp_url && (
                  <img src={branding.stamp_url as string} alt={t("centre", "financeOfficialStamp")} className="absolute left-2 bottom-1 h-20 w-20 object-contain opacity-80 pointer-events-none" />
                )}
                {signatures.map((s) => (
                  <div key={s.id} className="text-center min-w-[120px]">
                    {s.signatureUrl ? (
                      <img src={s.signatureUrl} alt={t("centre", "financeSignature")} className="h-10 mx-auto mb-1 object-contain" />
                    ) : (
                      <div className="h-10 border-b border-neutral-300 mb-1" />
                    )}
                    <p className="font-semibold" style={{ color: BLUE, fontSize: "10px" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center pt-3 border-t border-black/[0.06] text-neutral-400 space-y-0.5 font-medium" style={{ fontSize: printFormat === "ticket" ? "7px" : "9px" }}>
              {financeDocumentFooter(docConfig, locale).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Print styles — journal (reçus / relevés via dynamic-print-page) */}
      <style jsx global>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }

          body[data-print-target="journal-print-area"] #journal-print-area,
          body[data-print-target="journal-print-area"] #journal-print-area * { visibility: visible; }
          body[data-print-target="journal-print-area"] #journal-print-area {
            position: absolute; left: 0; top: 0; width: 100%; max-width: 210mm;
            padding: 12mm; box-sizing: border-box; overflow: visible !important;
          }
          body[data-print-target="journal-print-area"] .finance-journal-table-wrap {
            overflow: visible !important;
          }
          body[data-print-target="journal-print-area"] .finance-journal-table {
            min-width: 0 !important;
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 9px !important;
          }
          body[data-print-target="journal-print-area"] .finance-journal-table th,
          body[data-print-target="journal-print-area"] .finance-journal-table td {
            padding: 4px 6px !important;
            overflow: visible !important;
            word-wrap: break-word !important;
            white-space: normal !important;
          }
          body[data-print-target="journal-print-area"] .finance-col-amount {
            white-space: nowrap !important;
            text-align: right !important;
            width: 16% !important;
          }
          body[data-print-target="journal-print-area"] .finance-journal-table tr {
            page-break-inside: avoid;
          }
          body[data-print-target="journal-print-area"] .finance-journal-table thead {
            display: table-header-group;
          }
        }
      `}</style>

      {waPhoneOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !shareBusy && setWaPhoneOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-black/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>WhatsApp (PDF)</h3>
              <button type="button" onClick={() => setWaPhoneOpen(false)} className="text-neutral-400 hover:text-neutral-700" aria-label={t("centre", "periodClose")}>
                <X size={18} />
              </button>
            </div>
            <p className="text-[12px] text-neutral-500 font-medium mb-3 leading-relaxed">
              {t("centre", "financeWhatsappHelp")}
            </p>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5">{t("centre", "financePhoneCountryCode")}</label>
            <input
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              placeholder={locale === "en" ? "e.g. 2376XXXXXXXX" : "ex. 2376XXXXXXXX"}
              inputMode="tel"
              className="w-full h-10 px-3 rounded-lg border border-black/[0.08] text-[13px] font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
              style={{ backgroundColor: SURFACE }}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setWaPhoneOpen(false)}
                disabled={shareBusy}
                className="flex-1 h-10 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-600"
              >
                {t("centre", "periodCancel")}
              </button>
              <button
                type="button"
                onClick={() => void sendWhatsAppPdf()}
                disabled={shareBusy || !waPhone.replace(/\D/g, "")}
                className="flex-1 h-10 rounded-lg text-xs font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {shareBusy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                {t("centre", "financeOpenWhatsapp")}
              </button>
            </div>
          </div>
        </div>
      )}
    </CenterPageLayout>
  );
}

function FinanceShareMenu({
  disabled,
  busy,
  onCsv,
  onPdf,
  onWhatsAppPdf,
}: {
  disabled?: boolean;
  busy?: boolean;
  onCsv: () => void;
  onPdf: () => void | Promise<void>;
  onWhatsAppPdf: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = async (fn: () => void | Promise<void>) => {
    setOpen(false);
    await fn();
  };

  return (
    <div ref={rootRef} className="relative print:hidden shrink-0">
      <OutlineHeaderButton
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} strokeWidth={2.25} />}
        <span className="hidden sm:inline">{t("centre", "share")}</span>
      </OutlineHeaderButton>
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-40 min-w-[11.5rem] rounded-lg border border-black/[0.08] bg-white shadow-lg overflow-hidden"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void run(onPdf)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03]"
          >
            <FileText size={14} className="text-neutral-400" /> PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void run(onCsv)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03]"
          >
            <Download size={14} className="text-neutral-400" /> CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void run(onWhatsAppPdf)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03] border-t border-black/[0.05]"
          >
            <Share2 size={14} className="text-neutral-400" /> WhatsApp (PDF)
          </button>
        </div>
      )}
    </div>
  );
}
