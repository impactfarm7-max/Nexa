"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Search, Loader2, X, CheckCircle2, Ban,
  Clock, Tag, Copy, Check, Link2, Bell, User, Mail,
  ArrowRight, Calendar, Award, AlertTriangle, Eye,
  Wallet, RefreshCw, Download, Phone, MapPin, FileText, Trash2, CalendarDays
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  buildCenterSignupUrl,
  type CenterSignupRef,
} from "@/app/utils/center-signup-link";
import { AFRICA_54, findAfricaCountry } from "@/app/data/africa-54";
import {
  addDays,
  catalogTotalFromMonthly,
  durationLabel,
  durationToDays,
  type TcfDurationUnit,
} from "@/app/utils/tcf-access";
import { downloadTcfDossierPdf } from "@/app/utils/centerPdfExport";
import { AmountInWords } from "@/app/components/AmountInWords";
import { fetchDocumentExportConfig, type DocumentExportConfig } from "@/app/utils/documentConfig";
import { sumNamedExtraFees } from "@/app/utils/short-pricing";
import { fetchUsableCoupons, type CouponListItem } from "@/app/utils/coupon.client";
import { ACTION_TONE } from "@/app/utils/action-tones";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "warning" | "info";
  action: "reject" | "revoke" | "pause" | "resume";
  studentId: string;
  requireReason?: boolean;
  reasonLabel?: string;
};

type TCFStudent = {
  student_id: string;
  prenom: string;
  nom: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  center_status: string | null;
  tag_status: string | null;
  access_pause_reason: string | null;
  pack_name: string | null;
  subscription_ends_at: string | null;
  ee_total: number; ee_used: number;
  exam_total: number; exam_used: number;
  eo_total: number; eo_used: number;
  enrollment_id: string | null;
  tuition_fee: number | null;
  duration_months: number | null;
  duration_value: number | null;
  duration_unit: string | null;
  enrolled_at: string | null;
  created_at: string;
  country: string | null;
  region: string | null;
  city: string | null;
  birth_date: string | null;
  catalog_tuition_fee: number | null;
  price_note: string | null;
  tuition_paid: number | null;
  financial_status: string | null;
  access_status: "pending" | "active" | "expired" | "inactive" | "paused";
};

function formatStudentDuration(s: TCFStudent): string {
  if (s.duration_value && s.duration_unit && ["day", "week", "month"].includes(s.duration_unit)) {
    return durationLabel(s.duration_value, s.duration_unit as TcfDurationUnit);
  }
  if (s.duration_months) return `${s.duration_months} mois`;
  return "";
}

function formatStudentLocation(s: TCFStudent): string | null {
  const parts = [s.city, s.region, s.country].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

// Dérive le statut effectif en tenant compte de tous les champs sources
// La vue peut ne pas mapper correctement si center_status est null
function effectiveStatus(s: TCFStudent): TCFStudent["access_status"] {
  const cs = s.center_status;
  const ts = s.tag_status;

  if (cs === "paused" || ts === "paused") return "paused";
  if (cs === "revoked" || ts === "revoque") return "inactive";

  // Étudiant en attente de validation (inscrit via lien centre)
  if (cs === "pending_center_approval" || ts === "pending_center_approval") return "pending";

  if (cs === "active" || ts === "normal" || ts === "actif" || !ts) {
    return s.access_status === "expired" ? "expired" : (s.access_status || "active");
  }

  return s.access_status || "active";
}

type TabKey = "pending" | "active" | "paused" | "all";

/** Séparateur milliers = espace (évite les "/" selon la locale Windows). */
function fmtFCFA(n: number) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const abs = Math.abs(v).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return neg ? `-${grouped}` : grouped;
}
function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type DraftInstallment = { id: string; amount: string; due_date: string };

function newDraftInstallment(amount: number, due_date: string): DraftInstallment {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    amount: amount > 0 ? String(amount) : "",
    due_date,
  };
}

function buildSplitInstallments(total: number, count: number): DraftInstallment[] {
  const safeCount = Math.max(1, Math.floor(count));
  const roundedTotal = Math.max(0, Math.round(total));
  const baseAmount = Math.floor(roundedTotal / safeCount);
  const remainder = roundedTotal - baseAmount * safeCount;

  return Array.from({ length: safeCount }, (_, idx) =>
    newDraftInstallment(
      baseAmount + (idx < remainder ? 1 : 0),
      addDaysISO(30 * idx),
    ),
  );
}

function computeAge(birthDate: string | null): string {
  if (!birthDate) return "—";
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age >= 0 ? `${age} ans` : "—";
}

function statusLabel(s: TCFStudent): string {
  const eff = effectiveStatus(s);
  const labels: Record<TCFStudent["access_status"], string> = {
    pending: "En attente",
    active: "Actif",
    expired: "Expiré",
    paused: "En pause",
    inactive: "Révoqué",
  };
  return labels[eff] || eff;
}

function financeStatusLabel(status: string | null): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    pending: "À encaisser",
    current: "En cours",
    paid: "Soldé",
    late: "En retard",
    exempt: "Exonéré",
  };
  return map[status] || status;
}

function exportStudentsCSV(list: TCFStudent[], tabKey: string) {
  const header = [
    "Statut", "Prénom", "Nom", "Email", "Téléphone", "Pays", "Région", "Ville",
    "Date naissance", "Âge", "Inscrit le", "Validé le", "Fin accès", "Durée", "Pack",
    "Tarif FCFA", "Catalogue FCFA", "Payé FCFA", "Reste FCFA", "Statut finance", "Note tarif",
  ].join(";");
  const rows = list.map((s) => {
    const reste = Math.max(0, (s.tuition_fee || 0) - (s.tuition_paid || 0));
    return [
      statusLabel(s),
      s.prenom || "",
      s.nom || "",
      s.email || "",
      s.phone || "",
      s.country || "",
      s.region || "",
      s.city || "",
      s.birth_date || "",
      computeAge(s.birth_date),
      fmtDate(s.created_at),
      fmtDate(s.enrolled_at),
      fmtDate(s.subscription_ends_at),
      formatStudentDuration(s),
      s.pack_name || "ivoire",
      s.tuition_fee ?? "",
      s.catalog_tuition_fee ?? "",
      s.tuition_paid ?? 0,
      reste,
      financeStatusLabel(s.financial_status),
      s.price_note || "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
  });
  const csv = "\uFEFF" + ["sep=;", header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `etudiants_tcf_${tabKey}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatTcfActivationError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("prix") ||
    lower.includes("tuition") ||
    lower.includes("mensuel") ||
    lower.includes("parametres") ||
    lower.includes("paramètre")
  ) {
    return "Prix mensuel introuvable. Ouvrez Programme TCF, enregistrez le prix mensuel, puis réessayez.";
  }
  if (lower.includes("published") || lower.includes("publi")) {
    return "Le programme TCF doit être publié avant d'activer un étudiant. Ouvrez Programme TCF et publiez-le.";
  }
  return message;
}

async function loadTcfPricingDetails(centerId: string): Promise<{ monthlyPrice: number; extraFees: number }> {
  const { data: filiere } = await supabase
    .from("filieres")
    .select("default_tuition_fee, extra_fees")
    .eq("center_id", centerId)
    .eq("name", "TCF Canada")
    .maybeSingle();
  return {
    monthlyPrice: Number(filiere?.default_tuition_fee) || 0,
    extraFees: sumNamedExtraFees((filiere as any)?.extra_fees),
  };
}

export default function CenterTCFStudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerSignup, setCenterSignup] = useState<CenterSignupRef | null>(null);
  const [students, setStudents] = useState<TCFStudent[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [showCreate, setShowCreate] = useState(false);
  const [activateTarget, setActivateTarget] = useState<TCFStudent | null>(null);
  const [viewTarget, setViewTarget] = useState<TCFStudent | null>(null);
  const [centerName, setCenterName] = useState("");
  const [docConfig, setDocConfig] = useState<DocumentExportConfig | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string; tone: "error" | "success" } | null>(null);

  const loadStudents = useCallback(async (cId: string): Promise<TCFStudent[]> => {
    const { data: viewData } = await supabase
      .from("center_tcf_students")
      .select("*")
      .eq("center_id", cId)
      .order("created_at", { ascending: false });

    if (!viewData || viewData.length === 0) {
      setStudents([]);
      return [];
    }

    const ids = viewData.map((s: { student_id: string }) => s.student_id).filter(Boolean);
    type ProfileRow = {
      id: string;
      tag_status: string | null;
      center_status: string | null;
      access_pause_reason?: string | null;
      country: string | null;
      region: string | null;
      city: string | null;
      ville: string | null;
      birth_date: string | null;
    };

    let profilesData: ProfileRow[] | null = null;
    const { data: profilesWithReason, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, tag_status, center_status, access_pause_reason, country, region, city, ville, birth_date")
      .in("id", ids);

    if (!profilesErr) {
      profilesData = (profilesWithReason || []) as ProfileRow[];
    } else {
      const { data: profilesFallback } = await supabase
        .from("profiles")
        .select("id, tag_status, center_status, country, region, city, ville, birth_date")
        .in("id", ids);
      profilesData = (profilesFallback || []).map((p) => ({ ...p, access_pause_reason: null }));
    }

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

    const enrollmentIds = viewData
      .map((s: { enrollment_id?: string | null }) => s.enrollment_id)
      .filter(Boolean) as string[];

    let enrollmentMap = new Map<string, {
      duration_value: number | null;
      duration_unit: string | null;
      catalog_tuition_fee: number | null;
      price_note: string | null;
      tuition_fee: number | null;
      enrolled_at: string | null;
    }>();
    if (enrollmentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, duration_value, duration_unit, catalog_tuition_fee, price_note, tuition_fee, enrolled_at")
        .in("id", enrollmentIds);
      enrollmentMap = new Map(
        (enrollments || []).map((e: {
          id: string;
          duration_value: number | null;
          duration_unit: string | null;
          catalog_tuition_fee: number | null;
          price_note: string | null;
          tuition_fee: number | null;
          enrolled_at: string | null;
        }) => [e.id, e])
      );
    }

    let financeMap = new Map<string, { tuition_paid: number; financial_status: string; tuition_fee: number }>();
    if (enrollmentIds.length > 0) {
      const { data: financeRows } = await supabase
        .from("student_finance_summary")
        .select("enrollment_id, tuition_paid, financial_status, tuition_fee")
        .in("enrollment_id", enrollmentIds);
      financeMap = new Map(
        (financeRows || []).map((f: { enrollment_id: string; tuition_paid: number; financial_status: string; tuition_fee: number }) => [f.enrollment_id, f])
      );
    }

    const merged = viewData.map((s: Record<string, unknown> & { student_id: string; enrollment_id?: string | null; tuition_fee?: number | null; enrolled_at?: string | null }) => {
      const p = profileMap.get(s.student_id);
      const en = s.enrollment_id ? enrollmentMap.get(s.enrollment_id) : null;
      const fin = s.enrollment_id ? financeMap.get(s.enrollment_id) : null;
      return {
        ...s,
        tag_status: s.tag_status ?? p?.tag_status ?? null,
        center_status: s.center_status ?? p?.center_status ?? null,
        access_pause_reason: p?.access_pause_reason ?? null,
        country: p?.country ?? null,
        region: p?.region ?? null,
        city: p?.city ?? p?.ville ?? null,
        birth_date: p?.birth_date ?? null,
        duration_value: en?.duration_value ?? s.duration_value ?? null,
        duration_unit: en?.duration_unit ?? s.duration_unit ?? null,
        catalog_tuition_fee: en?.catalog_tuition_fee ?? null,
        price_note: en?.price_note ?? null,
        tuition_fee: en?.tuition_fee ?? fin?.tuition_fee ?? s.tuition_fee ?? null,
        tuition_paid: fin?.tuition_paid ?? null,
        financial_status: fin?.financial_status ?? null,
        enrolled_at: en?.enrolled_at ?? s.enrolled_at ?? null,
      };
    });

    const list = merged as TCFStudent[];
    setStudents(list);
    return list;
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
      if (!profile?.center_id) { setLoading(false); return; }
      setCenterId(profile.center_id);
      const [{ data: center }, exportConfig] = await Promise.all([
        supabase.from("centers").select("signup_slug, code, name").eq("id", profile.center_id).single(),
        fetchDocumentExportConfig(supabase, profile.center_id),
      ]);
      setCenterSignup(center ? { signup_slug: center.signup_slug, code: center.code } : null);
      setCenterName(exportConfig.legalName || center?.name || "");
      setDocConfig(exportConfig);
      await loadStudents(profile.center_id);
      setLoading(false);
    })();
  }, [loadStudents]);

  const pendingCount = students.filter(s => effectiveStatus(s) === "pending").length;
  const activeCount = students.filter(s => effectiveStatus(s) === "active").length;
  const pausedCount = students.filter(s => effectiveStatus(s) === "paused").length;
  const visibleStudents = students.filter(s => effectiveStatus(s) !== "inactive");

  const filtered = students.filter(s => {
    const eff = effectiveStatus(s);
    const matchSearch = `${s.prenom} ${s.nom} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "pending") return matchSearch && eff === "pending";
    if (activeTab === "active") return matchSearch && (eff === "active" || eff === "expired");
    if (activeTab === "paused") return matchSearch && eff === "paused";
    return matchSearch && eff !== "inactive";
  });

  const signupLink =
    typeof window !== "undefined"
      ? buildCenterSignupUrl(window.location.origin, centerSignup)
      : null;

  const copyLink = () => {
    const url = buildCenterSignupUrl(window.location.origin, centerSignup);
    if (!url) return;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const callAccessAPI = async (action: string, studentId: string, reason?: string) => {
    if (!centerId) return false;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/centre/etudiants-tcf", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ action, studentId, centerId, reason: reason || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFeedback({
        title: "Action impossible",
        message: json.error || `Erreur lors de l'action « ${action} ».`,
        tone: "error",
      });
      return false;
    }
    await loadStudents(centerId);
    return true;
  };

  const askConfirm = (dialog: ConfirmDialogState) => setConfirmDialog(dialog);

  const rejectStudent = (studentId: string) => {
    askConfirm({
      title: "Refuser la demande",
      message: "Refuser cette demande d'inscription ? Le compte sera supprimé du centre et l'email pourra être réutilisé plus tard.",
      confirmLabel: "Refuser",
      tone: "danger",
      action: "reject",
      studentId,
      requireReason: true,
      reasonLabel: "Motif du refus",
    });
  };

  const revokeAccess = (studentId: string) => {
    askConfirm({
      title: "Supprimer l'étudiant",
      message: "Supprimer cet étudiant du centre ? Il sera retiré des classes, de la communauté et des accès liés. Le motif sera affiché s'il tente de se reconnecter.",
      confirmLabel: "Supprimer",
      tone: "danger",
      action: "revoke",
      studentId,
      requireReason: true,
      reasonLabel: "Motif de la suppression",
    });
  };

  const pauseAccess = (studentId: string) => {
    askConfirm({
      title: "Mettre en pause",
      message: "Mettre en pause la formation ? Le temps restant sera conservé jusqu'à la reprise. Le motif apparaîtra dans son dossier.",
      confirmLabel: "Pause",
      tone: "warning",
      action: "pause",
      studentId,
      requireReason: true,
      reasonLabel: "Motif de la pause",
    });
  };

  const resumeAccess = (student: TCFStudent) => {
    if (effectiveStatus(student) === "paused") {
      askConfirm({
        title: "Reprendre la formation",
        message: "Reprendre la formation ? Le temps restant conservé sera réactivé immédiatement.",
        confirmLabel: "Reprendre",
        tone: "info",
        action: "resume",
        studentId: student.student_id,
      });
      return;
    }
    setActivateTarget(student);
  };

  const runConfirmedAction = async (reason?: string) => {
    if (!confirmDialog) return;
    if (confirmDialog.requireReason && !reason?.trim()) {
      setFeedback({
        title: "Motif requis",
        message: "Indiquez un motif avant de confirmer.",
        tone: "error",
      });
      return;
    }
    setConfirmBusy(true);
    const apiAction =
      confirmDialog.action === "reject" || confirmDialog.action === "revoke"
        ? "revoke"
        : confirmDialog.action;
    const ok = await callAccessAPI(apiAction, confirmDialog.studentId, reason?.trim());
    setConfirmBusy(false);
    if (ok) {
      setConfirmDialog(null);
      setFeedback({
        title: "Action réussie",
        message:
          confirmDialog.action === "pause"
            ? "La formation a été mise en pause."
            : confirmDialog.action === "resume"
              ? "La formation a repris."
              : confirmDialog.action === "reject"
                ? "La demande a été refusée et le compte a été retiré."
                : "L'étudiant a été supprimé du centre.",
        tone: "success",
      });
    }
  };

  if (loading) return <CenterPageLoading />;

  return (
    <div className="min-h-[100dvh] bg-white text-[#11224E] pb-24 overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🇨🇦</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">TCF Canada</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: BLUE }}>Étudiants TCF</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {signupLink && (
                <>
                  <a
                    href={signupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 max-w-[min(100%,20rem)] px-3 rounded-xl border bg-white text-xs font-bold flex items-center gap-1.5 hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
                    title={signupLink}
                  >
                    <Link2 size={14} className="shrink-0 text-orange-600" />
                    <span className="truncate underline decoration-orange-300 underline-offset-2" style={{ color: BLUE }}>
                      {signupLink}
                    </span>
                  </a>
                  <button
                    onClick={copyLink}
                    className={`h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${linkCopied ? "bg-emerald-500 text-white" : "border hover:bg-neutral-50"}`}
                  >
                    {linkCopied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
                  </button>
                </>
              )}
              <button onClick={() => setShowCreate(true)} className="h-10 px-5 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-sm flex items-center gap-2 hover:opacity-90" style={{ backgroundColor: ORANGE }}>
                <Plus size={14} /> Créer manuellement
              </button>
            </div>
          </div>
        </header>

        <div className="nexa-center-shell pt-6 space-y-6">
          {pendingCount > 0 && activeTab !== "pending" && (
            <button onClick={() => setActiveTab("pending")} className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between hover:bg-amber-100/50 transition-colors">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-amber-600" />
                <div className="text-left">
                  <p className="text-sm font-black text-amber-800">{pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente</p>
                  <p className="text-[10px] text-amber-600">Étudiants inscrits via votre lien.</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-amber-600" />
            </button>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border shadow-sm">
              <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total</p>
              <p className="text-2xl font-black" style={{ color: BLUE }}>{visibleStudents.length}</p>
            </div>
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200 shadow-sm">
              <p className={`text-[9px] font-black ${ACTION_TONE.positiveText} uppercase tracking-widest mb-1`}>Actifs</p>
              <p className={`text-2xl font-black ${ACTION_TONE.positiveText}`}>{activeCount}</p>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm ${pendingCount > 0 ? "bg-amber-50/50 border-amber-200" : "bg-white"}`}>
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">En attente</p>
              <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-sm overflow-x-auto max-w-full">
              {([
                { id: "pending" as const, label: "En attente", badge: pendingCount },
                { id: "active" as const, label: "Actifs", badge: activeCount },
                { id: "paused" as const, label: "Pause", badge: pausedCount },
                { id: "all" as const, label: "Tous", badge: visibleStudents.length },
              ]).map(({ id, label, badge }) => (
                <button key={id} onClick={() => setActiveTab(id)} className={`px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === id ? "text-white" : "text-neutral-400 hover:text-neutral-600"}`} style={activeTab === id ? { backgroundColor: BLUE } : {}}>
                  {label}
                  {badge > 0 && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/20" : "bg-neutral-100"}`}>{badge}</span>}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <div className="flex items-center h-10 rounded-xl bg-white px-3 border w-full max-w-xs shadow-sm">
                <Search className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full bg-transparent text-xs font-bold outline-none" />
              </div>
              <button
                onClick={() => exportStudentsCSV(filtered, activeTab)}
                disabled={filtered.length === 0}
                className="h-10 px-4 rounded-xl border bg-white text-xs font-black uppercase tracking-widest hover:bg-neutral-50 disabled:opacity-40 flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Download size={14} /> Exporter CSV
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border">
              <CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-neutral-400">
                {activeTab === "pending"
                  ? "Aucune demande en attente."
                  : activeTab === "paused"
                      ? "Aucun étudiant en pause."
                      : "Aucun étudiant trouvé."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(s => {
                const eff = effectiveStatus(s);
                return (
                <div key={s.student_id} className="bg-white border rounded-2xl p-5 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-xs shrink-0 overflow-hidden" style={{ backgroundColor: eff === "pending" ? "#FEF3C7" : eff === "paused" ? "#EFF6FF" : eff === "inactive" ? "#FEE2E2" : "#FFF7ED", color: eff === "pending" ? "#D97706" : eff === "paused" ? "#3B82F6" : eff === "inactive" ? "#DC2626" : ORANGE }}>
                      {s.avatar_url ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" /> : `${s.prenom?.[0] ?? "?"}${s.nom?.[0] ?? ""}`}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[13px] truncate" style={{ color: BLUE }}>{s.prenom} {s.nom}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{s.email}</p>
                      {formatStudentLocation(s) && (
                        <p className="text-[10px] text-neutral-500 truncate">{formatStudentLocation(s)}</p>
                      )}
                      {eff === "active" && s.subscription_ends_at && (
                        <p className={`text-[10px] ${ACTION_TONE.positiveText} font-bold mt-0.5`}>
                          Jusqu&apos;au {fmtDate(s.subscription_ends_at)}
                          {formatStudentDuration(s) ? ` · ${formatStudentDuration(s)}` : ""}
                          {s.tuition_fee ? ` · ${fmtFCFA(s.tuition_fee)} F` : ""}
                        </p>
                      )}
                      {eff === "expired" && <p className={`text-[10px] ${ACTION_TONE.negativeText} font-bold mt-0.5`}>Expiré le {fmtDate(s.subscription_ends_at)}</p>}
                      {eff === "pending" && <p className="text-[10px] text-amber-600 font-bold mt-0.5">Inscrit le {fmtDate(s.created_at)}</p>}
                      {eff === "paused" && (
                        <p className="text-[10px] text-blue-600 font-bold mt-0.5">
                          Formation en pause · temps restant conservé
                          {s.access_pause_reason ? ` · Motif : ${s.access_pause_reason}` : ""}
                        </p>
                      )}
                      {eff === "inactive" && <p className={`text-[10px] font-bold mt-0.5 ${ACTION_TONE.negativeText}`}>Accès révoqué</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {eff === "pending" && <span className={ACTION_TONE.warningPill}>En attente</span>}
                    {eff === "active" && <span className={ACTION_TONE.positivePill}>Actif</span>}
                    {eff === "expired" && <span className={ACTION_TONE.negativePill}>Expiré</span>}
                    {eff === "paused" && <span className="px-2 py-1 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">En pause</span>}
                    {eff === "inactive" && <span className={ACTION_TONE.negativePill}>Révoqué</span>}

                    {eff === "pending" && (
                      <>
                        <button onClick={() => setViewTarget(s)} className="h-9 px-3 rounded-xl text-[10px] font-black uppercase border hover:bg-neutral-50 flex items-center gap-1 transition-colors">
                          <Eye size={12} /> Voir
                        </button>
                        <button onClick={() => setActivateTarget(s)} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase text-white hover:opacity-90" style={{ backgroundColor: ORANGE }}>Valider</button>
                        <button onClick={() => rejectStudent(s.student_id)} className={ACTION_TONE.negativeOutline}>Refuser</button>
                      </>
                    )}
                    {eff === "active" && (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button onClick={() => setViewTarget(s)} className="h-9 px-3 rounded-xl text-[10px] font-black uppercase border hover:bg-neutral-50 flex items-center gap-1 transition-colors">
                          <Eye size={12} /> Voir
                        </button>
                        <button
                          onClick={() => pauseAccess(s.student_id)}
                          className="h-9 px-3 rounded-xl text-[10px] font-black uppercase border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                        >
                          <Clock size={12} /> Pause
                        </button>
                        <button
                          onClick={() => revokeAccess(s.student_id)}
                          className={`${ACTION_TONE.negativeOutline} h-9 px-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5`}
                        >
                          <Trash2 size={12} /> Supprimer
                        </button>
                      </div>
                    )}
                    {(eff === "expired" || eff === "paused" || eff === "inactive") && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewTarget(s)} className="h-9 px-3 rounded-xl text-[10px] font-black uppercase border hover:bg-neutral-50 flex items-center gap-1 transition-colors">
                          <Eye size={12} /> Voir
                        </button>
                        {(eff === "expired" || eff === "paused") && (
                          <button onClick={() => resumeAccess(s)} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase border hover:bg-neutral-50 flex items-center gap-1 transition-colors">
                            <RefreshCw size={12} /> {eff === "paused" ? "Reprendre" : "Renouveler"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

      {showCreate && centerId && (
        <CreateTCFManualModal centerId={centerId} onClose={() => setShowCreate(false)} onCreated={async (sid) => {
          setShowCreate(false);
          if (centerId) {
            const list = await loadStudents(centerId);
            const s = list.find(x => x.student_id === sid);
            if (s) setActivateTarget(s);
          }
        }} />
      )}

      {activateTarget && centerId && (
        <ActivateModal
          student={activateTarget}
          centerId={centerId}
          onClose={() => setActivateTarget(null)}
          onActivated={async (result) => {
            setActivateTarget(null);
            if (centerId) await loadStudents(centerId);
            if (result?.enrollmentId) {
              router.push(`/centre/finance?enrollment=${result.enrollmentId}&pay=1`);
            }
          }}
        />
      )}

      {viewTarget && (
        <StudentDossierModal student={viewTarget} docConfig={docConfig} onClose={() => setViewTarget(null)} />
      )}

      {confirmDialog && (
        <ActionConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          busy={confirmBusy}
          requireReason={confirmDialog.requireReason}
          reasonLabel={confirmDialog.reasonLabel}
          onCancel={() => { if (!confirmBusy) setConfirmDialog(null); }}
          onConfirm={(reason) => void runConfirmedAction(reason)}
        />
      )}

      {feedback && (
        <ActionFeedbackModal
          title={feedback.title}
          message={feedback.message}
          tone={feedback.tone}
          onClose={() => setFeedback(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL CRÉATION MANUELLE
// ============================================================
function CreateTCFManualModal({ centerId, onClose, onCreated }: { centerId: string; onClose: () => void; onCreated: (sid: string) => void }) {
  const { t } = useI18n();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("CI");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [seatLimitReached, setSeatLimitReached] = useState(false);
  const [creds, setCreds] = useState<{ email: string; password: string; studentId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedAfrica = findAfricaCountry(countryCode);
  const regions = selectedAfrica?.regions ?? [];

  const create = async () => {
    if (!prenom.trim() || !nom.trim() || !email.trim()) { setError("Prénom, nom et email requis."); return; }
    if (!selectedAfrica || !region.trim() || !city.trim()) { setError("Pays, région et ville requis."); return; }
    setSaving(true); setError(""); setSeatLimitReached(false);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/centre/etudiants-tcf", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({
        centerId,
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim(),
        phone: phone.trim() ? `${selectedAfrica.dial} ${phone.trim()}` : null,
        country: selectedAfrica.name,
        country_code: selectedAfrica.dial,
        region: region.trim(),
        city: city.trim(),
        birth_date: birthDate.trim() || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      if (json.code === "SEAT_LIMIT_REACHED") {
        setSeatLimitReached(true);
        setError(t("centre", "seatLimitMessage", { occupied: json.occupied, max: json.max, offer: json.offerName }));
        return;
      }
      setError(json.error || "Erreur.");
      return;
    }
    setCreds({ email: json.email, password: json.password, studentId: json.studentId });
  };

  const selectCls = "w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {!creds && <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200"><X size={16} /></button>}
        {!creds ? (
          <>
            <div className="flex items-center gap-2 mb-1"><User size={16} style={{ color: ORANGE }} /><span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Création manuelle</span></div>
            <h3 className="text-lg font-black mb-5" style={{ color: BLUE }}>Nouvel étudiant TCF</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Prénom *</label><input value={prenom} onChange={e => setPrenom(e.target.value)} className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" style={{ color: BLUE }} /></div>
                <div><label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Nom *</label><input value={nom} onChange={e => setNom(e.target.value)} className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" style={{ color: BLUE }} /></div>
              </div>
              <div><label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" style={{ color: BLUE }} /></div>
              <div>
                <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Pays *</label>
                <select value={countryCode} onChange={e => { setCountryCode(e.target.value); setRegion(""); }} className={selectCls} style={{ color: BLUE }}>
                  {AFRICA_54.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Téléphone</label>
                <div className="flex gap-1.5">
                  <div className="h-11 px-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center shrink-0">
                    <span className="text-xs font-black text-blue-700">{selectedAfrica?.dial || "+"}</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                    placeholder="Optionnel"
                    className="flex-1 h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500"
                    style={{ color: BLUE }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Région *</label>
                  {regions.length > 0 ? (
                    <select value={region} onChange={e => setRegion(e.target.value)} className={selectCls} style={{ color: BLUE }}>
                      <option value="">Choisir...</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <input value={region} onChange={e => setRegion(e.target.value)} placeholder="Région" className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none" style={{ color: BLUE }} />
                  )}
                </div>
                <div><label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Ville *</label><input value={city} onChange={e => setCity(e.target.value)} className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" style={{ color: BLUE }} /></div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Date de naissance</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none" style={{ color: BLUE }} />
                <p className="text-[9px] text-neutral-400 mt-1">Ce champ est optionnel et peut être complété plus tard sur le profil étudiant.</p>
              </div>
              {error && (
                <div className="bg-red-50 p-2 rounded-lg">
                  <p className="text-xs font-bold text-red-500">{error}</p>
                  {seatLimitReached && (
                    <button
                      type="button"
                      onClick={() => window.open(`https://wa.me/+237683375069?text=${encodeURIComponent(t("centre", "seatLimitContactMsg"))}`, "_blank")}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: ORANGE }}
                    >
                      {t("centre", "seatLimitContact")}
                    </button>
                  )}
                </div>
              )}
              <button onClick={create} disabled={saving} className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-wider text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: BLUE }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />} Créer le compte
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-black mb-1" style={{ color: BLUE }}>Compte créé !</h3>
            <p className="text-xs text-neutral-400 mb-4">Transmettez ces identifiants à {prenom}</p>
            <div className="bg-neutral-50 rounded-xl p-4 text-left space-y-2 border mb-5">
              <div><p className="text-[9px] font-black text-neutral-400 uppercase">Email</p><p className="text-xs font-bold font-mono" style={{ color: BLUE }}>{creds.email}</p></div>
              <div className="border-t pt-2"><p className="text-[9px] font-black text-neutral-400 uppercase">Mot de passe</p><p className="text-sm font-black font-mono tracking-wider" style={{ color: ORANGE }}>{creds.password}</p></div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => { navigator.clipboard.writeText(`Email : ${creds.email}\nMot de passe : ${creds.password}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`w-full h-11 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 ${copied ? "bg-emerald-500 text-white" : "bg-neutral-100 hover:bg-neutral-200"}`}>
                {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
              </button>
              <button onClick={() => onCreated(creds.studentId)} className="w-full h-11 rounded-xl text-xs font-black uppercase text-white hover:opacity-90" style={{ backgroundColor: ORANGE }}>Activer l'accès TCF →</button>
              <button onClick={onClose} className="text-xs text-neutral-400 font-bold hover:text-neutral-600 py-2">Activer plus tard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MODAL ACTIVATION (durée flexible + prix négocié + coupon)
// ============================================================
type DurationPreset = { key: string; value: number; unit: TcfDurationUnit; label: string; sub: string };

const DURATION_PRESETS: DurationPreset[] = [
  { key: "2w", value: 2, unit: "week", label: "2", sub: "sem." },
  { key: "1m", value: 1, unit: "month", label: "1", sub: "mois" },
  { key: "3m", value: 3, unit: "month", label: "3", sub: "mois" },
  { key: "6m", value: 6, unit: "month", label: "6", sub: "mois" },
];

function ActivateModal({ student, centerId, onClose, onActivated }: {
  student: TCFStudent; centerId: string; onClose: () => void;
  onActivated: (result?: { enrollmentId?: string }) => void;
}) {
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [extraFees, setExtraFees] = useState(0);
  const [priceLoading, setPriceLoading] = useState(true);
  const [presetKey, setPresetKey] = useState("3m");
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("2");
  const [customUnit, setCustomUnit] = useState<TcfDurationUnit>("week");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [useAgreedPrice, setUseAgreedPrice] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ discount: number; label: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<CouponListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [groupe, setGroupe] = useState("");
  const [groupes, setGroupes] = useState<{ id: string; nom: string; is_default_signup?: boolean }[]>([]);
  const [installments, setInstallments] = useState<DraftInstallment[]>([
    newDraftInstallment(0, todayISO()),
  ]);
  const [installmentsTouched, setInstallmentsTouched] = useState(false);

  const activePreset = DURATION_PRESETS.find(p => p.key === presetKey) ?? DURATION_PRESETS[2];
  const durationValue = customMode ? Math.max(1, Number(customValue) || 1) : activePreset.value;
  const durationUnit: TcfDurationUnit = customMode ? customUnit : activePreset.unit;
  const days = durationToDays(durationValue, durationUnit);
  const catalogTotal = catalogTotalFromMonthly(monthlyPrice, days) + extraFees;
  const parsedAgreed = useAgreedPrice && agreedPrice.trim() ? Number(agreedPrice.replace(/\s/g, "")) : null;
  const baseTotal =
    parsedAgreed != null && !Number.isNaN(parsedAgreed) && parsedAgreed >= 0
      ? parsedAgreed
      : catalogTotal;
  const discountAmount = couponApplied?.discount || 0;
  const finalTotal = Math.max(0, baseTotal - discountAmount);
  const canActivate = !priceLoading && (monthlyPrice > 0 || (useAgreedPrice && parsedAgreed != null && !Number.isNaN(parsedAgreed)));

  const installmentsSum = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const installmentsDelta = finalTotal - installmentsSum;
  const hasIncompleteInstallment = installments.some(
    (i) => (Number(i.amount) || 0) <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(i.due_date),
  );
  const installmentsValid =
    finalTotal <= 0
    || (installments.length > 0
      && installments.every((i) => (Number(i.amount) || 0) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(i.due_date))
      && installmentsDelta === 0);

  // Resynchronise le plan si le total change et que l'utilisateur n'a pas encore customisé
  useEffect(() => {
    if (installmentsTouched) return;
    setInstallments([newDraftInstallment(finalTotal, todayISO())]);
  }, [finalTotal, installmentsTouched]);

  useEffect(() => {
    (async () => {
      setPriceLoading(true);
      setError("");
      const details = await loadTcfPricingDetails(centerId);
      setMonthlyPrice(details.monthlyPrice);
      setExtraFees(details.extraFees);

      const { data: filiere } = await supabase
        .from("filieres")
        .select("id")
        .eq("center_id", centerId)
        .eq("name", "TCF Canada")
        .maybeSingle();
      if (filiere) {
        const { data } = await supabase
          .from("groupes")
          .select("id, nom, is_default_signup")
          .eq("filiere_id", filiere.id)
          .order("created_at");
        const list = data || [];
        setGroupes(list);
        const defaultGroupe = list.find(g => g.is_default_signup)?.id
          || (list.length === 1 ? list[0].id : "");
        setGroupe(defaultGroupe);
      }
      setPriceLoading(false);
    })();
  }, [centerId]);

  useEffect(() => {
    if (!centerId) return;
    void fetchUsableCoupons(supabase, centerId).then(setAvailableCoupons);
  }, [centerId]);

  useEffect(() => {
    setCouponError("");
    if (!couponCode.trim()) {
      setCouponApplied(null);
      return;
    }
    const coupon = availableCoupons.find((c) => c.code === couponCode);
    if (!coupon) {
      setCouponApplied(null);
      return;
    }
    const discount = coupon.type === "percentage"
      ? Math.round(baseTotal * Number(coupon.value) / 100)
      : Math.min(Number(coupon.value), baseTotal);
    setCouponApplied({
      discount,
      label: coupon.type === "percentage" ? `-${coupon.value}%` : `-${fmtFCFA(coupon.value)} F`,
    });
  }, [durationValue, durationUnit, baseTotal, useAgreedPrice, agreedPrice, couponCode, availableCoupons]);

  const applyCouponFromList = (code: string) => {
    setCouponCode(code);
    setCouponError("");
    setCouponApplied(null);
    if (!code.trim()) return;
    const coupon = availableCoupons.find((c) => c.code === code);
    if (!coupon) return;
    const discount = coupon.type === "percentage"
      ? Math.round(baseTotal * Number(coupon.value) / 100)
      : Math.min(Number(coupon.value), baseTotal);
    setCouponApplied({
      discount,
      label: coupon.type === "percentage" ? `-${coupon.value}%` : `-${fmtFCFA(coupon.value)} F`,
    });
  };

  const checkCoupon = async () => {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true); setCouponError(""); setCouponApplied(null);
    const { data: coupon } = await supabase.from("coupons").select("id, type, value, max_uses, uses_count, expires_at, is_active").eq("center_id", centerId).eq("code", couponCode.trim().toUpperCase()).single();
    if (!coupon || !coupon.is_active) { setCouponError("Coupon invalide."); setCheckingCoupon(false); return; }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      await supabase.from("coupons").update({ is_active: false }).eq("id", coupon.id);
      setCouponError("Coupon expiré."); setCheckingCoupon(false); return;
    }
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) { setCouponError("Coupon épuisé."); setCheckingCoupon(false); return; }
    const discount = coupon.type === "percentage" ? Math.round(baseTotal * coupon.value / 100) : Math.min(coupon.value, baseTotal);
    setCouponApplied({ discount, label: coupon.type === "percentage" ? `-${coupon.value}%` : `-${fmtFCFA(coupon.value)} F` });
    setCheckingCoupon(false);
  };

  const activate = async () => {
    if (priceLoading) return;
    if (!canActivate) {
      setError("Prix mensuel introuvable. Ouvrez Programme TCF, enregistrez le prix mensuel, ou saisissez un prix négocié.");
      return;
    }
    if (durationValue < 1) { setError("Durée invalide."); return; }
    if (groupes.length > 0 && !groupe) {
      setError("Choisissez une salle de classe pour cet étudiant.");
      return;
    }
    if (finalTotal > 0 && !installmentsValid) {
      setError(
        installmentsDelta !== 0
          ? `La somme des échéances (${fmtFCFA(installmentsSum)} F) doit égaler le total (${fmtFCFA(finalTotal)} F).`
          : "Vérifiez les montants et dates des échéances.",
      );
      return;
    }
    setSaving(true); setError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/centre/etudiants-tcf", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({
        action: "activate",
        studentId: student.student_id,
        centerId,
        durationValue,
        durationUnit,
        couponCode: couponCode.trim() || null,
        agreedPrice: useAgreedPrice && agreedPrice.trim() ? Number(agreedPrice.replace(/\s/g, "")) : null,
        groupeId: groupe || null,
        installments: finalTotal > 0
          ? installments.map((i, idx) => ({
              label: installments.length === 1
                ? undefined
                : idx === 0 ? "Acompte" : `Échéance ${idx + 1}`,
              amount: Number(i.amount) || 0,
              due_date: i.due_date,
            }))
          : [],
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(formatTcfActivationError(json.error || "Erreur d'activation."));
      return;
    }
    onActivated({ enrollmentId: json.enrollmentId });
  };

  const updateInstallment = (id: string, patch: Partial<DraftInstallment>) => {
    setInstallmentsTouched(true);
    setInstallments((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const addInstallment = () => {
    setInstallmentsTouched(true);
    setInstallments((prev) => buildSplitInstallments(finalTotal, prev.length + 1));
  };

  const removeInstallment = (id: string) => {
    setInstallmentsTouched(true);
    setInstallments((prev) => {
      if (prev.length <= 1) return prev;
      return buildSplitInstallments(finalTotal, prev.length - 1);
    });
  };

  const durationText = durationLabel(durationValue, durationUnit);
  const endsAtLabel = addDays(new Date(), days).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200"><X size={16} /></button>

        <div className="flex items-center gap-2 mb-1"><Award size={16} style={{ color: ORANGE }} /><span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{student.access_status === "expired" ? "Renouveler" : "Activer"}</span></div>
        <h3 className="text-lg font-black mb-1" style={{ color: BLUE }}>{student.prenom} {student.nom}</h3>
        <p className="text-xs text-neutral-400 mb-1">{student.email}</p>
        {formatStudentLocation(student) && (
          <p className="text-[10px] text-neutral-500 mb-5">{formatStudentLocation(student)}</p>
        )}
        {!formatStudentLocation(student) && <div className="mb-4" />}

        <div className="space-y-5">
          <div>
            <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-2">Durée d&apos;accès</label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_PRESETS.map(p => (
                <button key={p.key} onClick={() => { setPresetKey(p.key); setCustomMode(false); }} className={`p-3 rounded-xl border-2 text-center transition-all ${!customMode && presetKey === p.key ? "border-orange-400 bg-orange-50" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <p className="text-sm font-black" style={{ color: BLUE }}>{p.label}</p>
                  <p className="text-[9px] text-neutral-400 font-bold">{p.sub}</p>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button onClick={() => setCustomMode(true)} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border ${customMode ? "border-orange-400 bg-orange-50 text-orange-700" : "text-neutral-400"}`}>Personnalisé</button>
              {customMode && (
                <>
                  <input type="number" min={1} max={365} value={customValue} onChange={e => setCustomValue(e.target.value)} className="w-16 h-9 px-2 text-center rounded-lg border bg-neutral-50 text-xs font-black outline-none" style={{ color: BLUE }} />
                  <select value={customUnit} onChange={e => setCustomUnit(e.target.value as TcfDurationUnit)} className="h-9 px-2 rounded-lg border bg-neutral-50 text-xs font-bold outline-none" style={{ color: BLUE }}>
                    <option value="day">jour(s)</option>
                    <option value="week">semaine(s)</option>
                    <option value="month">mois</option>
                  </select>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-1.5 flex items-center gap-1"><Wallet size={10} /> Prix négocié</label>
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={useAgreedPrice} onChange={e => setUseAgreedPrice(e.target.checked)} className="rounded border-neutral-300" />
              <span className="text-[10px] font-bold text-neutral-600">Utiliser un montant convenu (remplace le tarif catalogue)</span>
            </label>
            {useAgreedPrice && (
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={agreedPrice}
                  onChange={e => setAgreedPrice(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Ex: 75000"
                  className="w-full h-10 px-3 pr-14 rounded-xl border bg-neutral-50 text-xs font-black outline-none"
                  style={{ color: BLUE }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400">FCFA</span>
              </div>
            )}
            {useAgreedPrice && <AmountInWords amount={agreedPrice} />}
            {monthlyPrice > 0 && (
              <p className="text-[9px] text-neutral-400 mt-1">
                Tarif catalogue : {fmtFCFA(catalogTotal)} F pour {durationText} ({fmtFCFA(monthlyPrice)} F / mois)
              </p>
            )}
          </div>

          {groupes.length > 0 && (
            <div>
              <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-1.5">
                Salle de classe {groupes.length > 1 ? "*" : ""}
              </label>
              {groupes.length === 1 ? (
                <div className="h-10 px-3 rounded-xl border bg-neutral-50 flex items-center text-xs font-bold" style={{ color: BLUE }}>
                  {groupes[0].nom}
                </div>
              ) : (
                <select value={groupe} onChange={e => setGroupe(e.target.value)} className="w-full h-10 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none" style={{ color: BLUE }}>
                  <option value="">Choisir une salle...</option>
                  {groupes.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.nom}{g.is_default_signup ? " (par défaut)" : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[9px] text-neutral-400 mt-1">
                L&apos;étudiant sera ajouté à la salle correspondante dans Communauté.
              </p>
            </div>
          )}

          <div>
            <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest block mb-1.5 flex items-center gap-1"><Tag size={10} /> Code promo</label>
            <div className="flex gap-2">
              <select
                value={couponCode}
                onChange={(e) => applyCouponFromList(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border bg-neutral-50 text-xs font-black uppercase outline-none"
                style={{ color: BLUE }}
              >
                <option value="">{availableCoupons.length ? "— Aucun —" : "Aucun coupon disponible"}</option>
                {availableCoupons.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} ({c.type === "percentage" ? `${c.value}%` : `${fmtFCFA(c.value)} F`})
                  </option>
                ))}
              </select>
              {couponCode && (
                <button onClick={checkCoupon} disabled={checkingCoupon} className="h-10 px-4 rounded-xl border text-xs font-bold hover:bg-neutral-50 disabled:opacity-40">
                  {checkingCoupon ? <Loader2 size={14} className="animate-spin" /> : "Vérifier"}
                </button>
              )}
            </div>
            {couponApplied && <p className={`text-[10px] font-bold mt-1 ${ACTION_TONE.positiveText}`}>✓ {couponApplied.label} ({fmtFCFA(couponApplied.discount)} FCFA)</p>}
            {couponError && <p className={`text-[10px] font-bold mt-1 ${ACTION_TONE.negativeText}`}>{couponError}</p>}
          </div>

          <div className="bg-neutral-50 border rounded-xl p-4 space-y-2">
            {priceLoading ? (
              <p className="text-xs text-neutral-400 font-bold animate-pulse">Chargement du tarif...</p>
            ) : !canActivate ? (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p>
                  Aucun prix mensuel enregistré. Allez dans{" "}
                  <a href="/centre/tcf/programme" className="font-black underline">Programme TCF</a>
                  , fixez le prix, ou cochez « prix négocié » ci-dessus.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">
                    {useAgreedPrice && parsedAgreed != null && !Number.isNaN(parsedAgreed)
                      ? `Prix négocié · ${durationText}`
                      : `Catalogue · ${durationText}`}
                  </span>
                  <span className="font-bold" style={{ color: BLUE }}>{fmtFCFA(baseTotal)} F</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600">Réduction {couponApplied.label}</span>
                    <span className="font-bold text-emerald-600">-{fmtFCFA(discountAmount)} F</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="font-black" style={{ color: BLUE }}>Total</span>
                  <span className="font-black text-lg" style={{ color: ORANGE }}>{fmtFCFA(finalTotal)} FCFA</span>
                </div>
                <AmountInWords amount={finalTotal} />
                <p className="text-[9px] text-neutral-400 text-right">Accès jusqu&apos;au {endsAtLabel}</p>
              </>
            )}
          </div>

          {canActivate && finalTotal > 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-[10px] font-black uppercase text-neutral-500 flex items-center gap-1.5">
                  <CalendarDays size={13} /> Échéances de paiement
                </h4>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border border-neutral-200 text-neutral-500 bg-white">
                  {installments.length} {installments.length > 1 ? "tranches" : "tranche"}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Définissez les montants et dates avant l&apos;encaissement en Finance (cascade ou totalité).
              </p>
              <div className="space-y-2 mb-3">
                {installments.map((inst, idx) => (
                  <div key={inst.id} className="flex gap-2 items-center">
                    <span className="text-[10px] font-black text-neutral-300 w-4 shrink-0">{idx + 1}.</span>
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Montant"
                        value={inst.amount}
                        onChange={(e) => updateInstallment(inst.id, { amount: e.target.value.replace(/[^0-9]/g, "") })}
                        className="w-full h-10 px-3 pr-12 rounded-lg border bg-white font-bold text-xs outline-none focus:border-neutral-400"
                        style={{ color: BLUE }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-neutral-400">FCFA</span>
                    </div>
                    <input
                      type="date"
                      value={inst.due_date}
                      onChange={(e) => updateInstallment(inst.id, { due_date: e.target.value })}
                      className="h-10 px-2 rounded-lg border bg-white text-[11px] font-bold outline-none w-[9.5rem] shrink-0"
                      style={{ color: BLUE }}
                    />
                    <button
                      type="button"
                      onClick={() => removeInstallment(inst.id)}
                      disabled={installments.length <= 1}
                      className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={addInstallment}
                  className="h-9 px-3 rounded-lg bg-white border border-dashed border-neutral-200 text-neutral-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-neutral-100"
                >
                  <Plus size={12} /> Ajouter une échéance
                </button>
                <p className={`text-[10px] font-bold ${!hasIncompleteInstallment && installmentsDelta === 0 ? "text-emerald-600" : "text-amber-700"}`}>
                  {hasIncompleteInstallment
                    ? "Complétez toutes les échéances"
                    : installmentsDelta === 0
                      ? `Somme OK · ${fmtFCFA(installmentsSum)} F`
                      : installmentsDelta > 0
                        ? `Reste à répartir : ${fmtFCFA(installmentsDelta)} F`
                        : `Excédent : ${fmtFCFA(-installmentsDelta)} F`}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg space-y-2">
              <p>{error}</p>
              {error.includes("Programme TCF") && (
                <a href="/centre/tcf/programme" className="inline-flex text-[11px] font-black uppercase text-orange-600 hover:underline">
                  Ouvrir Programme TCF →
                </a>
              )}
            </div>
          )}

          <button onClick={activate} disabled={saving || !canActivate || (finalTotal > 0 && !installmentsValid)} className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-wider text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 shadow-lg" style={{ backgroundColor: BLUE }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {saving ? "Activation..." : `Activer ${durationText} — ${fmtFCFA(finalTotal)} F`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL DOSSIER ÉTUDIANT
// ============================================================
function DossierField({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" | "neutral" }) {
  const color =
    tone === "positive" ? ACTION_TONE.positiveHex
    : tone === "negative" ? ACTION_TONE.negativeHex
    : BLUE;
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-neutral-100 last:border-0">
      <span className="text-[10px] font-black uppercase text-neutral-400 shrink-0">{label}</span>
      <span className="text-xs font-bold text-right break-words" style={{ color }}>{value || "—"}</span>
    </div>
  );
}

function StudentDossierModal({ student, docConfig, onClose }: { student: TCFStudent; docConfig: DocumentExportConfig | null; onClose: () => void }) {
  const eff = effectiveStatus(student);
  const reste = Math.max(0, (student.tuition_fee || 0) - (student.tuition_paid || 0));
  const hasOffer = Boolean(student.enrollment_id || student.enrolled_at);
  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadTcfDossierPdf(student, { config: docConfig || undefined, statusLabel: statusLabel(student) });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-neutral-100 rounded-lg hover:bg-neutral-200"><X size={16} /></button>

        <div className="flex items-center gap-2 mb-1">
          <FileText size={16} style={{ color: ORANGE }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Dossier étudiant</span>
        </div>
        <h3 className="text-lg font-black mb-1" style={{ color: BLUE }}>{student.prenom} {student.nom}</h3>
        <p className="text-xs text-neutral-400 mb-5">{statusLabel(student)}</p>

        <div className="space-y-5">
          <section className="bg-neutral-50 border rounded-xl p-4">
            <p className="text-[9px] font-black uppercase text-neutral-400 tracking-widest mb-2 flex items-center gap-1">
              <User size={10} /> Inscription
            </p>
            <DossierField label="Email" value={student.email} />
            <DossierField label="Téléphone" value={student.phone || "—"} />
            <DossierField label="Pays" value={student.country || "—"} />
            <DossierField label="Région" value={student.region || "—"} />
            <DossierField label="Ville" value={student.city || "—"} />
            <DossierField label="Date de naissance" value={student.birth_date ? fmtDate(student.birth_date) : "—"} />
            <DossierField label="Âge" value={computeAge(student.birth_date)} />
            <DossierField label="Inscrit le" value={fmtDate(student.created_at)} />
            {eff === "paused" && (
              <DossierField label="Motif de pause" value={student.access_pause_reason || "—"} />
            )}
          </section>

          {hasOffer && (
            <section className="bg-orange-50/40 border border-orange-100 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-orange-600 tracking-widest mb-2 flex items-center gap-1">
                <Award size={10} /> Offre validée
              </p>
              <DossierField label="Pack" value={student.pack_name || "ivoire"} />
              <DossierField label="Durée" value={formatStudentDuration(student) || "—"} />
              <DossierField label="Validé le" value={fmtDate(student.enrolled_at)} />
              <DossierField label="Accès jusqu'au" value={fmtDate(student.subscription_ends_at)} />
              <DossierField label="Tarif convenu" value={student.tuition_fee != null ? `${fmtFCFA(student.tuition_fee)} FCFA` : "—"} />
              {student.catalog_tuition_fee != null && (
                <DossierField label="Tarif catalogue" value={`${fmtFCFA(student.catalog_tuition_fee)} FCFA`} />
              )}
              {student.price_note && <DossierField label="Note tarif" value={student.price_note} />}
              <DossierField label="EE restants" value={`${student.ee_total - student.ee_used} / ${student.ee_total}`} />
              <DossierField label="EO restants" value={`${student.eo_total - student.eo_used} / ${student.eo_total}`} />
            </section>
          )}

          {hasOffer && (
            <section className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4">
              <p className="text-[9px] font-black uppercase text-emerald-700 tracking-widest mb-2 flex items-center gap-1">
                <Wallet size={10} /> Finance
              </p>
              <DossierField label="Payé" value={`${fmtFCFA(student.tuition_paid || 0)} FCFA`} tone="positive" />
              <DossierField label="Reste à payer" value={`${fmtFCFA(reste)} FCFA`} tone={reste > 0 ? "negative" : "positive"} />
              <DossierField label="Statut" value={financeStatusLabel(student.financial_status)} />
            </section>
          )}

          {!hasOffer && eff === "pending" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
              Dossier en attente de validation. Cliquez sur « Valider » pour définir l&apos;offre et envoyer le dossier en finance.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {hasOffer && student.enrollment_id && reste > 0 && (
              <a
                href={`/centre/finance?enrollment=${student.enrollment_id}&pay=1`}
                className="w-full h-11 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-2 hover:opacity-90"
                style={{ backgroundColor: ORANGE }}
              >
                <Wallet size={14} /> Encaisser en finance →
              </a>
            )}
            <button
              onClick={() => void downloadPdf()}
              disabled={pdfLoading}
              className="w-full h-11 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BLUE }}
            >
              {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Télécharger le dossier (PDF)
            </button>
            <button onClick={onClose} className="w-full h-10 text-xs font-bold text-neutral-400 hover:text-neutral-600">Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionConfirmModal({
  title,
  message,
  confirmLabel,
  tone,
  busy,
  requireReason,
  reasonLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "danger" | "warning" | "info";
  busy: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const icon =
    tone === "danger" ? <Ban size={22} className="text-red-500" /> :
    tone === "warning" ? <Clock size={22} className="text-blue-600" /> :
    <RefreshCw size={22} className="text-emerald-600" />;

  const iconBg =
    tone === "danger" ? "bg-red-50" :
    tone === "warning" ? "bg-blue-50" :
    "bg-emerald-50";

  const confirmStyle =
    tone === "danger" ? { backgroundColor: "#DC2626" } :
    tone === "warning" ? { backgroundColor: BLUE } :
    { backgroundColor: ORANGE };

  const canConfirm = !requireReason || reason.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
          {icon}
        </div>
        <h3 className="text-lg font-black mb-2" style={{ color: BLUE }}>{title}</h3>
        <p className="text-sm font-medium text-neutral-500 leading-relaxed mb-4">{message}</p>
        {requireReason && (
          <div className="mb-5">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-1.5 block">
              {reasonLabel || "Motif"} *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ex. : impayé, absence prolongée…"
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-medium outline-none focus:border-orange-400"
            />
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || !canConfirm}
            className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={confirmStyle}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {busy ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionFeedbackModal({
  title,
  message,
  tone,
  onClose,
}: {
  title: string;
  message: string;
  tone: "error" | "success";
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${tone === "error" ? "bg-red-50" : "bg-emerald-50"}`}>
          {tone === "error"
            ? <AlertTriangle size={22} className="text-red-500" />
            : <CheckCircle2 size={22} className="text-emerald-600" />}
        </div>
        <h3 className={`text-lg font-black mb-2 ${tone === "error" ? "text-red-600" : ""}`} style={tone === "success" ? { color: BLUE } : undefined}>
          {title}
        </h3>
        <p className="text-sm font-medium text-neutral-500 leading-relaxed mb-6">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider text-white hover:opacity-90"
          style={{ backgroundColor: tone === "error" ? "#DC2626" : BLUE }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
