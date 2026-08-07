"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Users, ShieldCheck, Plus, X, Loader2, CheckCircle2,
  AlertTriangle, Wallet, GitBranch, MessageSquare, Settings2, UserCog,
  MapPin, Edit3, Save, Download, GraduationCap, Share2, FileText,
  Trash2, Camera, CreditCard, Globe, ChevronDown, ChevronRight, Search, ArrowLeft,
  Calendar, ClipboardList, BarChart3, BookOpen, Video, Copy, Check, Eye,
} from "lucide-react";
import { printElementClean } from "@/app/utils/print-clean";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { loadCenterBootstrap, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import StaffAcademicTab from "@/app/components/StaffAcademicTab";
import StaffPayrollTab from "@/app/components/StaffPayrollTab";
import DocumentOfficialHeader from "@/app/components/centre/DocumentOfficialHeader";
import { fetchDocumentExportConfig, type DocumentExportConfig } from "@/app/utils/documentConfig";
import { useI18n } from "@/app/i18n/I18nProvider";
import { centre as centreMessages } from "@/app/i18n/messages/centre";
import { ACTION_TONE } from "@/app/utils/action-tones";
import { localizeCountryName } from "@/app/utils/countryI18n";
import { AFRICA_54, findAfricaCountry } from "@/app/data/africa-54";
import {
  TCF_TEACHING_SUBJECTS,
  labelForTcfSubject,
  filterModulePermissions,
  ensureTcfCommunautePermission,
  ensureDefaultLivesPermission,
  TRAINER_DEFAULT_MODULE_PERMISSIONS,
} from "@/app/data/tcf-teaching-subjects";
import {
  CenterPageLayout,
  CenterPageHeader,
  OutlineHeaderButton,
  BackButton,
  CenterToolbar,
  StatSep,
  ToolbarSearch,
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
  PAGE_BG,
  SURFACE,
  AgentIaComingSoonButton,
} from "@/app/centre/center-page-ui";

// ─── types ──────────────────────────────────────────────────────────────────
type StaffRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  phone: string | null;
  role: string;
  job_title: string | null;
  center_status: string;
  campuses: string[];
  campusIds: string[];
  permissions: string[];
  tcfSubjects: string[];
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  neighborhood: string | null;
  base_salary: number;
  prime: number;
  work_schedule: string | null; // stores weekly hours as plain number string
  avatar_url: string | null;
  seniority_years: number;
  id_type: string | null;
  id_number: string | null;
  genre: string | null;
  birth_date: string | null;
};

function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

type Campus = { id: string; name: string };

// ─── constants ───────────────────────────────────────────────────────────────
const STAFF_CATEGORIES = {
  administratif: {
    label: "Personnel administratif",
    roles: [
      { value: "campus_manager", label: "Directeur de campus", description: "Droits complets sur le campus assigné." },
      { value: "staff", label: "Agent administratif", description: "Accès restreint par module." },
    ],
  },
  academique: {
    label: "Personnel académique",
    roles: [
      { value: "trainer", label: "Formateur / Enseignant", description: "Enseigne dans un ou plusieurs campus." },
    ],
  },
};

/** Modules alignés sidebar / STAFF_PERMISSION_ROUTES — distincts des habilitations Académique. */
const PERMISSION_OPTIONS: { key: string; label: string; icon: React.ElementType; hint?: string }[] = [
  { key: "filieres",   label: "Programmes / Filières", icon: GitBranch },
  { key: "cours",      label: "Cours & devoirs",       icon: BookOpen },
  { key: "planning",   label: "Planning horaire",      icon: Calendar, hint: "Inclut aussi les sessions live selon le type de centre" },
  { key: "examens",    label: "Examens / Notes",        icon: ClipboardList },
  { key: "etudiants",  label: "Étudiants",             icon: Users },
  { key: "staff",      label: "Gestion du personnel",  icon: UserCog },
  { key: "finance",    label: "Finance",               icon: Wallet },
  { key: "rapports",   label: "Rapports",              icon: BarChart3 },
  { key: "communaute", label: "Communauté",            icon: MessageSquare },
  { key: "lives",      label: "Sessions Live",         icon: Video },
  { key: "parametres", label: "Paramètres",            icon: Settings2 },
];

const PERMISSION_GROUPS: { id: string; label: string; keys: string[] }[] = [
  { id: "pedagogie", label: "Pédagogie", keys: ["filieres", "cours", "planning", "examens", "lives"] },
  { id: "effectifs", label: "Effectifs", keys: ["etudiants", "staff"] },
  { id: "pilotage",  label: "Pilotage",  keys: ["finance", "rapports", "communaute", "parametres"] },
];

const ROLE_LABELS: Record<string, string> = {
  campus_manager: "Directeur de campus",
  trainer:        "Formateur",
  staff:          "Agent administratif",
};

const ID_TYPE_LABELS: Record<string, string> = {
  cni:         "Carte nationale d'identité",
  passeport:   "Passeport",
  carte_sejour:"Carte de séjour",
  autre:       "Autre document",
};
const idTypeDisplayLabel = (type: string, en: boolean) => en
  ? ({ cni: "National identity card", passeport: "Passport", carte_sejour: "Residence permit", autre: "Other document" }[type] || type)
  : (ID_TYPE_LABELS[type] || type);
const roleDisplayLabel = (role: string, en: boolean) => en
  ? ({ campus_manager: "Campus manager", trainer: "Trainer", staff: "Administrative officer" }[role] || role)
  : (ROLE_LABELS[role] || role);

function genderDisplayLabel(value: string | null | undefined, en: boolean) {
  if (!value || !en) return value || "—";
  if (value === "Homme") return "Male";
  if (value === "Femme") return "Female";
  if (value === "Autre") return "Other";
  return value;
}

const PERMISSION_EN: Record<string, string> = {
  filieres: "Programs",
  cours: "Courses and assignments",
  planning: "Schedule",
  examens: "Exams and grades",
  etudiants: "Students",
  staff: "Staff management",
  finance: "Finance",
  rapports: "Reports",
  communaute: "Community",
  lives: "Live sessions",
  parametres: "Settings",
};
const PERMISSION_GROUP_EN: Record<string, string> = {
  pedagogie: "Academics",
  effectifs: "People",
  pilotage: "Management",
};
const permissionLabel = (key: string, fallback: string, en: boolean) => {
  if (key === "communaute") return centreMessages[en ? "en" : "fr"].navCommunaute;
  return en ? (PERMISSION_EN[key] || fallback) : fallback;
};
const permissionGroupLabel = (id: string, fallback: string, en: boolean) => en ? (PERMISSION_GROUP_EN[id] || fallback) : fallback;

const ADMIN_ROLES    = ["campus_manager", "staff"];
const ACADEMIC_ROLES = ["trainer"];

type ExportStaffRow = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  type: string;
  role: string;
  statut: string;
};

function toStaffExportRows(list: StaffRow[], locale: "fr" | "en"): ExportStaffRow[] {
  const en = locale === "en";
  return list.map((s) => ({
    nom: s.nom,
    prenom: s.prenom,
    email: s.email || "",
    telephone: s.phone || "",
    type: ACADEMIC_ROLES.includes(s.role) ? (en ? "Academic" : "Académique") : (en ? "Administrative" : "Administratif"),
    role: s.job_title || roleDisplayLabel(s.role, en),
    statut: s.center_status === "active" ? (en ? "Active" : "Actif") : (en ? "Suspended" : "Suspendu"),
  }));
}

function staffFilterCaption(
  search: string,
  filter: "all" | "administratif" | "academique",
  count: number,
  locale: "fr" | "en",
) {
  const en = locale === "en";
  const cat =
    filter === "all" ? (en ? "All categories" : "Toutes catégories")
    : filter === "academique" ? (en ? "Academic" : "Académique")
    : (en ? "Administrative" : "Administratif");
  const parts = [cat];
  const q = search.trim();
  if (q) parts.push(`${en ? "Search" : "Recherche"}: ${q}`);
  parts.push(en ? `${count} row${count === 1 ? "" : "s"}` : `${count} ligne${count > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

function staffCsvFilename() {
  return `staff-${new Date().toISOString().slice(0, 10)}.csv`;
}
function staffPdfFilename() {
  return `staff-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function downloadStaffCsv(rows: ExportStaffRow[], locale: "fr" | "en") {
  const header = locale === "en"
    ? ["Last name", "First name", "Email", "Phone", "Type", "Role", "Status"]
    : ["Nom", "Prénom", "Email", "Téléphone", "Type", "Rôle", "Statut"];
  const lines = [
    header,
    ...rows.map((r) => [r.nom, r.prenom, r.email, r.telephone, r.type, r.role, r.statut]),
  ];
  const csv = lines
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = staffCsvFilename();
  a.click();
  URL.revokeObjectURL(url);
}

async function buildStaffPdfDoc(rows: ExportStaffRow[], filterCaption: string, locale: "fr" | "en") {
  const en = locale === "en";
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const blue: [number, number, number] = [17, 34, 78];

  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Staff", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`${en ? "Filter" : "Filtre"}: ${filterCaption}`, 14, 25, { maxWidth: pageWidth - 28 });
  doc.text(`${en ? "Generated on" : "Généré le"} ${new Date().toLocaleString(en ? "en-GB" : "fr-FR")}`, 14, 31);

  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(14, 35, pageWidth - 14, 35);

  autoTable(doc, {
    startY: 40,
    head: [en ? ["Last name", "First name", "Email", "Phone", "Type", "Role", "Status"] : ["Nom", "Prénom", "Email", "Téléphone", "Type", "Rôle", "Statut"]],
    body: rows.map((r) => [r.nom, r.prenom, r.email, r.telephone, r.type, r.role, r.statut]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak", textColor: [40, 40, 40] },
    headStyles: { fillColor: blue, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    margin: { left: 14, right: 14 },
  });

  return doc;
}

async function downloadStaffPdf(rows: ExportStaffRow[], filterCaption: string, locale: "fr" | "en") {
  const doc = await buildStaffPdfDoc(rows, filterCaption, locale);
  doc.save(staffPdfFilename());
}

async function silentDownloadStaffPdf(rows: ExportStaffRow[], filterCaption: string, locale: "fr" | "en") {
  const doc = await buildStaffPdfDoc(rows, filterCaption, locale);
  const filename = staffPdfFilename();
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

function openWhatsApp(text: string, phone?: string) {
  const encoded = encodeURIComponent(text);
  const digits = String(phone || "").replace(/\D/g, "");
  const url = digits
    ? `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════════════════
export default function CenterStaffPage() {
  const { locale } = useI18n();
  const en = locale === "en";
  const [staffList,       setStaffList]       = useState<StaffRow[]>([]);
  const [campuses,        setCampuses]        = useState<Campus[]>([]);
  const [centerId,        setCenterId]        = useState<string | null>(null);
  const [centerType,      setCenterType]      = useState<string>("generic");
  const [loading,         setLoading]         = useState(true);
  const [showCreate,      setShowCreate]      = useState(false);
  const [filter,          setFilter]          = useState<"all" | "administratif" | "academique">("all");
  const [search,          setSearch]          = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [activeTab,       setActiveTab]       = useState<"rh" | "access" | "academic" | "payroll">("rh");
  const [rhEditing,       setRhEditing]       = useState(false);
  const [showPrint,       setShowPrint]       = useState(false);
  const [viewingStaff,    setViewingStaff]    = useState<StaffRow | null>(null);
  const [shareBusy,       setShareBusy]       = useState(false);
  const [waPhoneOpen,     setWaPhoneOpen]     = useState(false);
  const [waPhone,         setWaPhone]         = useState("");

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const bootstrap = peekCenterBootstrap();
    let cId = bootstrap?.centerId ?? null;

    if (!cId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .single();
      cId = profile?.center_id ?? null;
    }

    setCenterId(cId);
    if (!cId) { setLoading(false); return; }

    const baseStaffSelect =
      "id, prenom, nom, email, phone, role, center_status, job_title, country, city, neighborhood, base_salary, work_schedule, avatar_url, seniority_years";
    const midStaffSelect =
      `${baseStaffSelect}, country_code, region, prime, id_type, id_number`;
    const fullStaffSelect =
      `${midStaffSelect}, genre, birth_date`;

    const [{ data: campusRows }, staffQuery, { data: centerRow }] = await Promise.all([
      supabase.from("campuses").select("id, name").eq("center_id", cId),
      supabase
        .from("profiles")
        .select(fullStaffSelect)
        .eq("center_id", cId)
        .in("role", ["campus_manager", "trainer", "staff"]),
      supabase.from("centers").select("center_type").eq("id", cId).single(),
    ]);

    // fullStaffSelect peut échouer si colonnes RH / identité absentes — fallback progressif
    let staffRows: Array<Record<string, unknown>> | null =
      (staffQuery.data as Array<Record<string, unknown>> | null) ?? null;
    if (staffQuery.error) {
      const mid = await supabase
        .from("profiles")
        .select(midStaffSelect)
        .eq("center_id", cId)
        .in("role", ["campus_manager", "trainer", "staff"]);
      if (!mid.error) {
        staffRows = (mid.data as Array<Record<string, unknown>> | null) ?? null;
      } else {
        const { data: fallbackRows } = await supabase
          .from("profiles")
          .select(baseStaffSelect)
          .eq("center_id", cId)
          .in("role", ["campus_manager", "trainer", "staff"]);
        staffRows = (fallbackRows as Array<Record<string, unknown>> | null) ?? null;
      }
    }

    setCenterType(centerRow?.center_type || "generic");
    setCampuses(campusRows ?? []);
    const ids = (staffRows ?? []).map((s: any) => s.id);

    let campusMap: Record<string, { names: string[]; ids: string[] }> = {};
    let permMap:   Record<string, string[]> = {};
    let tcfMap:    Record<string, string[]> = {};

    if (ids.length > 0) {
      // Accès modules/campus via API (service role) — le select client est souvent bloqué par RLS
      const [accessRes, { data: tcfLinks }] = await Promise.all([
        fetch("/api/staff", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        supabase.from("staff_tcf_subjects").select("profile_id, subject_key").in("profile_id", ids),
      ]);

      if (accessRes.ok) {
        const accessJson = await accessRes.json().catch(() => ({}));
        const access = (accessJson.access || {}) as Record<
          string,
          { permissions?: string[]; campus_ids?: string[] }
        >;
        const campusNameById = Object.fromEntries((campusRows ?? []).map((c) => [c.id, c.name]));
        for (const id of ids) {
          const row = access[id];
          if (!row) continue;
          const campusIds = row.campus_ids || [];
          campusMap[id] = {
            ids: campusIds,
            names: campusIds.map((cid) => campusNameById[cid] ?? "—"),
          };
          permMap[id] = filterModulePermissions(row.permissions || []);
        }
      } else {
        // Fallback client si l’API échoue
        const [{ data: campusLinks }, { data: permLinks }] = await Promise.all([
          supabase.from("staff_campus_access").select("profile_id, campus_id, campuses(name)").in("profile_id", ids),
          supabase.from("staff_permissions").select("profile_id, permission").in("profile_id", ids),
        ]);
        for (const link of campusLinks ?? []) {
          const key = (link as any).profile_id;
          if (!campusMap[key]) campusMap[key] = { names: [], ids: [] };
          campusMap[key].names.push((link as any).campuses?.name ?? "—");
          campusMap[key].ids.push((link as any).campus_id);
        }
        for (const link of permLinks ?? []) {
          const key = (link as any).profile_id;
          if (!permMap[key]) permMap[key] = [];
          permMap[key].push(link.permission);
        }
      }

      for (const link of tcfLinks ?? []) {
        const key = (link as any).profile_id;
        if (!tcfMap[key]) tcfMap[key] = [];
        tcfMap[key].push((link as any).subject_key);
      }
    }

    setStaffList((staffRows ?? []).map((s: any) => ({
      ...s,
      base_salary:     Number(s.base_salary)    || 0,
      prime:           Number(s.prime)           || 0,  // colonne optionnelle
      seniority_years: Number(s.seniority_years) || 0,
      country_code:    s.country_code  ?? null,          // colonne optionnelle
      region:          s.region        ?? null,          // colonne optionnelle
      id_type:         s.id_type       ?? null,          // colonne optionnelle
      id_number:       s.id_number     ?? null,          // colonne optionnelle
      genre:           s.genre         ?? null,
      birth_date:      s.birth_date    ?? null,
      campuses:  campusMap[s.id]?.names ?? [],
      campusIds: campusMap[s.id]?.ids   ?? [],
      permissions: (() => {
        let perms = filterModulePermissions(permMap[s.id] ?? []);
        if (s.role === "trainer" && perms.length === 0) {
          perms = [...TRAINER_DEFAULT_MODULE_PERMISSIONS];
        }
        return ensureDefaultLivesPermission(
          ensureTcfCommunautePermission(perms, centerRow?.center_type),
        );
      })(),
      tcfSubjects: tcfMap[s.id] ?? [],
    })));
    setLoading(false);
  }, []);

  useLayoutEffect(() => {
    const bootstrap = peekCenterBootstrap();
    if (!bootstrap) return;
    setCenterId(bootstrap.centerId);
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hadCache = Boolean(peekCenterBootstrap());
      const bootstrap = await loadCenterBootstrap();
      if (cancelled) return;
      if (!bootstrap) {
        setLoading(false);
        return;
      }
      setCenterId(bootstrap.centerId);
      if (!hadCache) void load();
    })();
    return () => { cancelled = true; };
  }, [load]);

  const selectStaff = (id: string) => {
    setSelectedStaffId(id);
    setActiveTab("rh");
    setRhEditing(false);
    setShowPrint(false);
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "paused" : "active";
    await supabase.from("profiles").update({ center_status: next }).eq("id", id);
    setStaffList((prev) => prev.map((s) => s.id === id ? { ...s, center_status: next } : s));
  };

  const deleteStaff = async (id: string) => {
    if (!window.confirm(en ? "Permanently delete this staff member?" : "Supprimer définitivement ce membre du staff ?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    setSelectedStaffId(null);
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) ?? null;

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  const matchSearch = (s: StaffRow) =>
    !search || `${s.prenom} ${s.nom}`.toLowerCase().includes(search.toLowerCase());

  const filtered = staffList.filter((s) => {
    const matchFilter =
      filter === "all" ||
      (filter === "administratif" && ADMIN_ROLES.includes(s.role)) ||
      (filter === "academique"    && ACADEMIC_ROLES.includes(s.role));
    return matchFilter && matchSearch(s);
  });

  const adminStaff = filtered.filter((s) => ADMIN_ROLES.includes(s.role));
  const academicStaff = filtered.filter((s) => ACADEMIC_ROLES.includes(s.role));
  const listStaff = filter === "administratif" ? adminStaff : filter === "academique" ? academicStaff : filtered;

  const activeCount = staffList.filter((s) => s.center_status === "active").length;
  const pausedCount = staffList.filter((s) => s.center_status === "paused").length;
  const exportRows = toStaffExportRows(listStaff, locale);
  const canExport = exportRows.length > 0;
  const filterCaption = staffFilterCaption(search, filter, exportRows.length, locale);

  const sendWhatsAppPdf = async () => {
    if (!canExport) return;
    setShareBusy(true);
    try {
      const filename = await silentDownloadStaffPdf(exportRows, filterCaption, locale);
      openWhatsApp(
        en ? `Nexa staff list (${exportRows.length}). PDF ready to attach: ${filename}` : `Liste du staff Nexa (${exportRows.length}). PDF prêt à joindre : ${filename}`,
        waPhone,
      );
      setWaPhoneOpen(false);
      setWaPhone("");
    } finally {
      setShareBusy(false);
    }
  };

  const openStaff = (id: string) => {
    setSelectedStaffId(id);
    setActiveTab("rh");
    setRhEditing(false);
  };

  const editStaff = (id: string) => {
    setSelectedStaffId(id);
    setActiveTab("rh");
    setRhEditing(true);
  };

  // ── render : liste RH ───────────────────────────────────────────────────────
  if (!selectedStaffId) {
    return (
      <CenterPageLayout
        header={
          <CenterPageHeader
            title={en ? "Staff" : "Personnel"}
            actions={
              <>
                <StaffShareMenu
                  disabled={!canExport}
                  busy={shareBusy}
                  onCsv={() => {
                    if (!canExport) return;
                    downloadStaffCsv(exportRows, locale);
                  }}
                  onPdf={async () => {
                    if (!canExport) return;
                    setShareBusy(true);
                    try {
                      await downloadStaffPdf(exportRows, filterCaption, locale);
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
                <OutlineHeaderButton className="print:hidden" onClick={() => setShowCreate(true)}>
                  <Plus size={15} strokeWidth={2.25} />
                  <span className="hidden sm:inline">{en ? "Create member" : "Créer membre"}</span>
                  <span className="sm:hidden">{en ? "Create" : "Créer"}</span>
                </OutlineHeaderButton>
              </>
            }
          />
        }
      >
        <CenterPageBody>
          <CenterToolbar
            stats={
              <span
                className="inline-flex flex-wrap items-center rounded-lg border border-black/[0.06] px-3 py-1.5"
                style={{ backgroundColor: SURFACE }}
              >
                <span className="inline-flex items-center gap-1">
                  <span className="font-bold">{staffList.length}</span>
                  <span>{en ? `staff member${staffList.length !== 1 ? "s" : ""}` : `collaborateur${staffList.length > 1 ? "s" : ""}`}</span>
                </span>
                <StatSep />
                <span className={ACTION_TONE.positiveStat}>{activeCount} {en ? "active" : `actif${activeCount > 1 ? "s" : ""}`}</span>
                <StatSep />
                <span className={ACTION_TONE.negativeStat}>{pausedCount} {en ? "suspended" : `suspendu${pausedCount > 1 ? "s" : ""}`}</span>
              </span>
            }
          >
            <ToolbarSearch value={search} onChange={setSearch} placeholder={en ? "Search…" : "Rechercher…"} />
            <ToolbarSelect
              label={en ? "Filter by category" : "Filtrer par catégorie"}
              value={filter}
              onChange={(v) => setFilter(v as typeof filter)}
              minWidth="9rem"
              options={[
                { value: "all", label: en ? "All categories" : "Toutes catégories" },
                { value: "academique", label: en ? "Academic" : "Académique" },
                { value: "administratif", label: en ? "Administrative" : "Administratif" },
              ]}
            />
          </CenterToolbar>

          {listStaff.length === 0 ? (
            <EmptyState title={en ? "No staff member found" : "Aucun collaborateur trouvé"} hint={en ? "Change your search or filters." : "Modifiez la recherche ou les filtres."} />
          ) : (
            <CenterDataTable columns={[en ? "Name" : "Nom", en ? "Type" : "Type", en ? "Status" : "Statut", en ? "Role" : "Rôle", en ? "Actions" : "Actions"]}>
              {listStaff.map((s, i) => {
                const isAcademic = ACADEMIC_ROLES.includes(s.role);
                return (
                  <CenterTableRow key={s.id} index={i}>
                    <td className="px-4 py-3.5 min-w-0">
                      <p className="text-[14px] font-semibold leading-snug truncate" style={{ color: BLUE }}>
                        {s.prenom} {s.nom}
                      </p>
                      <p className="text-[12px] text-neutral-400 font-medium mt-0.5 truncate">{s.email}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-[13px] font-medium text-neutral-600">
                      {isAcademic ? (en ? "Academic" : "Académique") : (en ? "Administrative" : "Administratif")}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`text-[13px] font-semibold ${s.center_status === "active" ? ACTION_TONE.positiveText : ACTION_TONE.negativeText}`}>
                        {s.center_status === "active" ? (en ? "Active" : "Actif") : (en ? "Suspended" : "Suspendu")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-[13px] font-medium text-neutral-700">
                      {s.job_title || roleDisplayLabel(s.role, en)}
                    </td>
                    <TableActions>
                      <TableBtnPreview onClick={() => setViewingStaff(s)} label={en ? "Preview" : "Aperçu"} />
                      <TableBtnModify onClick={() => editStaff(s.id)} label={en ? "Edit" : "Modifier"} />
                    </TableActions>
                  </CenterTableRow>
                );
              })}
            </CenterDataTable>
          )}
        </CenterPageBody>

        {showCreate && (
          <CreateStaffModal
            centerId={centerId!}
            isTCF={centerType === "tcf_canada"}
            campuses={campuses}
            staffList={staffList}
            onClose={() => setShowCreate(false)}
            onCreated={async () => { setShowCreate(false); await load(); }}
          />
        )}
        {viewingStaff && (
          <StaffViewModal
            staff={viewingStaff}
            onClose={() => setViewingStaff(null)}
            onOpenDossier={() => {
              const id = viewingStaff.id;
              setViewingStaff(null);
              openStaff(id);
            }}
          />
        )}
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
                <button type="button" onClick={() => setWaPhoneOpen(false)} className="text-neutral-400 hover:text-neutral-700" aria-label={en ? "Close" : "Fermer"}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-[12px] text-neutral-500 font-medium mb-3 leading-relaxed">
                {en ? "The PDF for the filtered list is prepared in the app, then WhatsApp opens for this number. Attach the downloaded file." : "Le PDF de la liste filtrée est préparé dans l’app, puis WhatsApp s’ouvre pour ce numéro. Joignez ensuite le fichier téléchargé."}
              </p>
              <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5">{en ? "Number (country code)" : "Numéro (indicatif pays)"}</label>
              <input
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder={en ? "e.g. 2376XXXXXXXX" : "ex. 2376XXXXXXXX"}
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
                  {en ? "Cancel" : "Annuler"}
                </button>
                <button
                  type="button"
                  onClick={() => void sendWhatsAppPdf()}
                  disabled={shareBusy || !waPhone.replace(/\D/g, "")}
                  className="flex-1 h-10 rounded-lg text-xs font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: BLUE }}
                >
                  {shareBusy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                  {en ? "Open WhatsApp" : "Ouvrir WhatsApp"}
                </button>
              </div>
            </div>
          </div>
        )}
      </CenterPageLayout>
    );
  }

  // ── render : dossier collaborateur ────────────────────────────────────────
  const staffTabs = ([
    { key: "rh" as const, label: en ? "Record" : "Dossier", icon: UserCog, show: true },
    { key: "access" as const, label: en ? "Access" : "Accès", icon: ShieldCheck, show: true },
    { key: "academic" as const, label: en ? "Academic" : "Académique", icon: GraduationCap, show: selectedStaff?.role === "trainer" },
    { key: "payroll" as const, label: en ? "Payroll" : "Paie", icon: Wallet, show: true },
  ]).filter((t) => t.show);

  return (
    <CenterPageLayout
      header={
        selectedStaff ? (
          <header
            className="shrink-0 min-h-[68px] border-b border-black/[0.06] z-30"
            style={{ backgroundColor: PAGE_BG }}
          >
            <div className="nexa-center-shell h-full min-h-[68px] py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackButton
                  onClick={() => {
                    setSelectedStaffId(null);
                    setRhEditing(false);
                  }}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400 leading-none mb-1">
                    {en ? "Edit record" : "Modifier le dossier"}
                  </p>
                  <h1
                    className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight truncate"
                    style={{ color: BLUE }}
                  >
                    {selectedStaff.prenom} {selectedStaff.nom}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap justify-end">
                {staffTabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                      activeTab === key
                        ? "text-white border-transparent"
                        : "bg-white text-neutral-600 border-black/[0.08] hover:bg-black/[0.03]"
                    }`}
                    style={activeTab === key ? { backgroundColor: BLUE } : undefined}
                  >
                    <Icon size={13} style={{ color: activeTab === key ? "#fff" : ORANGE }} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </header>
        ) : (
          <CenterPageHeader title={en ? "Staff member" : "Collaborateur"} backButton={<BackButton onClick={() => setSelectedStaffId(null)} />} />
        )
      }
    >
      <div className="flex-1 flex flex-col min-h-0">
        {!selectedStaff ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-neutral-300">
            <Users size={40} strokeWidth={1.5} />
            <p className="text-xs font-bold uppercase tracking-wider">{en ? "Select a member" : "Sélectionnez un membre"}</p>
          </div>
        ) : (
          <div className="nexa-center-shell pt-4 sm:pt-6 pb-8" style={{ backgroundColor: PAGE_BG }}>
            <div className="mx-auto max-w-5xl">
              {activeTab === "rh" && (
                <StaffRHTab
                  key={selectedStaff.id}
                  staff={selectedStaff}
                  isTCF={centerType === "tcf_canada"}
                  editing={rhEditing}
                  onEditingChange={setRhEditing}
                  onUpdate={load}
                  onExport={() => setShowPrint(true)}
                />
              )}
              {activeTab === "access" && (
                <StaffAccessTab
                  key={selectedStaff.id}
                  staff={selectedStaff}
                  campuses={campuses}
                  staffList={staffList}
                  isTCF={centerType === "tcf_canada"}
                  onUpdate={load}
                  onAccessSaved={(staffId, next) => {
                    setStaffList((prev) =>
                      prev.map((s) =>
                        s.id === staffId
                          ? {
                              ...s,
                              permissions: next.permissions,
                              campusIds: next.campusIds,
                              campuses: next.campusNames,
                            }
                          : s,
                      ),
                    );
                  }}
                />
              )}
              {activeTab === "academic" && selectedStaff.role === "trainer" && (
                <StaffAcademicTab
                  key={selectedStaff.id}
                  staff={selectedStaff}
                  centerId={centerId!}
                  isTCF={centerType === "tcf_canada"}
                  tcfSubjects={selectedStaff.tcfSubjects}
                  onUpdate={load}
                />
              )}
              {activeTab === "payroll" && centerId && (
                <StaffPayrollTab
                  key={`payroll-${selectedStaff.id}`}
                  staff={selectedStaff}
                  centerId={centerId}
                />
              )}

              <div className="mt-6 pt-4 border-t border-black/[0.06] flex flex-wrap gap-2 justify-end">
                {!rhEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("rh");
                      setRhEditing(true);
                    }}
                    className="h-10 px-4 rounded-lg border border-black/[0.08] bg-white inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:bg-black/[0.03]"
                  >
                    <Edit3 size={14} /> {en ? "Edit" : "Modifier"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void toggleStatus(selectedStaff.id, selectedStaff.center_status)}
                  className={selectedStaff.center_status === "active" ? ACTION_TONE.negativeOutlineMd : ACTION_TONE.positiveBtnMd}
                >
                  {selectedStaff.center_status === "active" ? (en ? "Suspend" : "Suspendre") : (en ? "Reactivate" : "Réactiver")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateStaffModal
          centerId={centerId!}
          isTCF={centerType === "tcf_canada"}
          campuses={campuses}
          staffList={staffList}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}

      {showPrint && selectedStaff && centerId && (
        <StaffPrintModal
          staff={selectedStaff}
          centerId={centerId}
          isTCF={centerType === "tcf_canada"}
          weeklyHours={parseInt(selectedStaff.work_schedule || "0") || 40}
          onClose={() => setShowPrint(false)}
        />
      )}
    </CenterPageLayout>
  );
}

// ── Liste : section + carte ─────────────────────────────────────────────────
function StaffSection({
  title,
  count,
  emptyLabel,
  icon,
  accent,
  children,
}: {
  title: string;
  count: number;
  emptyLabel: string;
  icon: ReactNode;
  accent: "admin" | "academic";
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="h-9 w-9 rounded-xl border border-neutral-100 bg-neutral-50 flex items-center justify-center shrink-0 [&>svg]:text-[#eb670e]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium tracking-tight" style={{ color: BLUE }}>{title}</h2>
        </div>
        <span
          className="text-[11px] font-bold tabular-nums px-2.5 py-1 rounded-full text-white min-w-[1.75rem] text-center"
          style={{ backgroundColor: ORANGE }}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-neutral-300 bg-white/80 text-neutral-400 gap-2">
          <Users size={24} strokeWidth={1.5} />
          <p className="text-sm font-medium text-neutral-500">{emptyLabel}</p>
          <p className="text-[10px] text-neutral-400">{locale === "en" ? "Use Create member to create a profile" : "Utilisez « Créer membre » pour créer un profil"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {children}
        </div>
      )}
    </section>
  );
}

function StaffCard({ staff, onSelect }: { staff: StaffRow; onSelect: () => void }) {
  const { locale } = useI18n();
  const isAcademic = staff.role === "trainer";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full text-left bg-white rounded-2xl border border-neutral-200 p-4 hover:border-neutral-300 hover:bg-neutral-50/80 transition-colors"
    >
      <div className="flex items-start gap-3">
        <StaffAvatar staff={staff} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-black text-sm truncate" style={{ color: BLUE }}>
              {staff.prenom} {staff.nom}
            </p>
            <ChevronRight size={16} className="text-neutral-300 shrink-0 mt-0.5 group-hover:text-orange-500 transition-colors" />
          </div>
          <p className="text-[11px] font-semibold text-neutral-500 truncate mt-0.5">
            {staff.job_title || roleDisplayLabel(staff.role, locale === "en")}
          </p>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span
              className={staff.center_status === "active" ? ACTION_TONE.positivePill : ACTION_TONE.negativePill}
            >
              {staff.center_status === "active" ? (locale === "en" ? "Active" : "Actif") : (locale === "en" ? "Suspended" : "Suspendu")}
            </span>
            <span
              className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border"
              style={
                isAcademic
                  ? { backgroundColor: `${BLUE}08`, color: BLUE, borderColor: `${BLUE}20` }
                  : { backgroundColor: `${ORANGE}08`, color: ORANGE, borderColor: `${ORANGE}25` }
              }
            >
              {isAcademic ? (locale === "en" ? "Academic" : "Académique") : (locale === "en" ? "Administrative" : "Admin")}
            </span>
            {staff.campuses?.[0] && (
              <span className="text-[9px] font-bold text-neutral-400 truncate inline-flex items-center gap-1">
                <MapPin size={10} /> {staff.campuses[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AVATAR
// ════════════════════════════════════════════════════════════════════════════
function StaffAvatar({ staff, size = "md", selected = false }: { staff: StaffRow; size?: "sm" | "md" | "lg"; selected?: boolean }) {
  const dim    = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-20 h-20 text-2xl" : "w-11 h-11 text-sm";
  const radius = size === "lg" ? "rounded-2xl" : "rounded-xl";
  if (staff.avatar_url) {
    return (
      <img
        src={staff.avatar_url}
        alt=""
        className={`${dim} ${radius} object-cover shrink-0 ring-2 ring-white shadow-sm border border-black/[0.06]`}
      />
    );
  }
  return (
    <div
      className={`${dim} ${radius} flex items-center justify-center font-extrabold shrink-0 text-white shadow-sm ring-2 ring-white`}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${ORANGE} 0%, #c95508 100%)`
          : staff.role === "trainer"
            ? `linear-gradient(135deg, ${BLUE} 0%, #1a3568 100%)`
            : `linear-gradient(135deg, ${ORANGE} 0%, #c95508 100%)`,
      }}
    >
      {staff.prenom[0]}{staff.nom[0]}
    </div>
  );
}

function StaffDossierSection({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon: React.ElementType;
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
      <div className="space-y-5 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6" style={{ backgroundColor: SURFACE }}>
        {children}
      </div>
    </section>
  );
}

function StaffShareMenu({
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
  const { locale } = useI18n();
  const en = locale === "en";
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
        <span className="hidden sm:inline">{en ? "Share" : "Partager"}</span>
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

function StaffViewModal({
  staff,
  onClose,
  onOpenDossier,
}: {
  staff: StaffRow;
  onClose: () => void;
  onOpenDossier: () => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const statusLabel = staff.center_status === "active" ? (en ? "Active" : "Actif") : (en ? "Suspended" : "Suspendu");
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-6 md:p-7 max-w-2xl w-full shadow-2xl relative my-8 border border-black/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-black" aria-label={en ? "Close" : "Fermer"}>
          <X size={20} />
        </button>
        <h3 className="text-lg font-extrabold tracking-tight mb-5" style={{ color: BLUE }}>{en ? "Staff member preview" : "Aperçu du collaborateur"}</h3>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <StaffAvatar staff={staff} size="lg" />
          <div className="min-w-0 text-center sm:text-left">
            <h4 className="text-2xl font-extrabold tracking-tight" style={{ color: BLUE }}>
              {staff.prenom} {staff.nom}
            </h4>
            <p className="text-sm text-neutral-500 mt-1 font-medium">{statusLabel}</p>
            <p className="text-sm text-neutral-500 mt-2 font-medium truncate">{staff.email}</p>
            {staff.phone && <p className="text-sm text-neutral-500 font-medium">{staff.phone}</p>}
            {(staff.genre || staff.birth_date) && (
              <p className="text-sm text-neutral-500 font-medium mt-1">
                {[genderDisplayLabel(staff.genre, en), (() => {
                  const age = ageFromBirthDate(staff.birth_date);
                  return age != null ? `${age} ${en ? "years old" : "ans"}` : null;
                })()].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="text-sm font-semibold mt-3" style={{ color: BLUE }}>
              {staff.job_title || roleDisplayLabel(staff.role, en)}
            </p>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {ACADEMIC_ROLES.includes(staff.role) ? (en ? "Academic" : "Académique") : (en ? "Administrative" : "Administratif")}
              {staff.campuses?.[0] ? ` · ${staff.campuses[0]}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-6">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl text-xs font-semibold bg-neutral-100 text-neutral-600">
            {en ? "Close" : "Fermer"}
          </button>
          <button
            type="button"
            onClick={onOpenDossier}
            className="flex-1 h-11 rounded-xl text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
            style={{ backgroundColor: BLUE }}
          >
            <Edit3 size={14} /> {en ? "Open record" : "Ouvrir le dossier"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ONGLET RH — Vue / Édition / Impression
// ════════════════════════════════════════════════════════════════════════════
function StaffRHTab({
  staff,
  isTCF,
  editing,
  onEditingChange,
  onUpdate,
  onExport,
}: {
  staff: StaffRow;
  isTCF: boolean;
  editing: boolean;
  onEditingChange: (v: boolean) => void;
  onUpdate: () => void;
  onExport?: () => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const staffCountryRef = AFRICA_54.find((country) => country.name === staff.country || country.dial === staff.country_code);
  const staffCountryLabel = staff.country
    ? localizeCountryName(staffCountryRef?.code || "", staff.country, locale)
    : "—";
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [showId,     setShowId]     = useState(!!staff.id_type);
  const [selCode,    setSelCode]    = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const weeklyHours = parseInt(staff.work_schedule || "0") || 40;

  const [form, setForm] = useState<{
    prenom: string;
    nom: string;
    phone: string;
    job_title: string;
    base_salary: number | null;
    prime: number | null;
    weekly_hours: number | null;
    seniority_years: number | null;
    country: string;
    country_code: string;
    region: string;
    city: string;
    neighborhood: string;
    id_type: string;
    id_number: string;
    genre: string;
    birth_date: string;
  }>({
    prenom:          staff.prenom,
    nom:             staff.nom,
    phone:           staff.phone    || "",
    job_title:       staff.job_title || "",
    base_salary:     staff.base_salary,
    prime:           staff.prime,
    weekly_hours:    weeklyHours,
    seniority_years: staff.seniority_years,
    country:         staff.country       || "",
    country_code:    staff.country_code  || "",
    region:          staff.region        || "",
    city:            staff.city          || "",
    neighborhood:    staff.neighborhood  || "",
    id_type:         staff.id_type       || "",
    id_number:       staff.id_number     || "",
    genre:           staff.genre         || "",
    birth_date:      staff.birth_date    || "",
  });

  useEffect(() => {
    onEditingChange(false);
    setShowId(!!staff.id_type);
    setForm({
      prenom:          staff.prenom,
      nom:             staff.nom,
      phone:           staff.phone    || "",
      job_title:       staff.job_title || "",
      base_salary:     staff.base_salary,
      prime:           staff.prime,
      weekly_hours:    parseInt(staff.work_schedule || "0") || 40,
      seniority_years: staff.seniority_years,
      country:         staff.country       || "",
      country_code:    staff.country_code  || "",
      region:          staff.region        || "",
      city:            staff.city          || "",
      neighborhood:    staff.neighborhood  || "",
      id_type:         staff.id_type       || "",
      id_number:       staff.id_number     || "",
      genre:           staff.genre         || "",
      birth_date:      staff.birth_date    || "",
    });
  }, [staff.id, staff.prenom, staff.nom, staff.phone, staff.job_title, staff.base_salary, staff.prime, staff.work_schedule, staff.seniority_years, staff.country, staff.country_code, staff.region, staff.city, staff.neighborhood, staff.id_type, staff.id_number, staff.genre, staff.birth_date, onEditingChange]);

  // En mode édition : chiffres en filigrane (placeholder), champs vides pour saisie libre
  useEffect(() => {
    if (!editing) return;
    setForm((prev) => ({
      ...prev,
      base_salary: null,
      prime: null,
      weekly_hours: null,
      seniority_years: null,
    }));
  }, [editing]);

  useEffect(() => {
    let code = "";
    if (staff.country) {
      const match = AFRICA_54.find((c) => c.name === staff.country || c.code === staff.country_code);
      if (match) {
        code = match.code;
        setSelCode(match.code);
      }
    }
    const dial = staff.country_code || findAfricaCountry(code)?.dial || "";
    if (staff.phone && dial && staff.phone.startsWith(dial)) {
      setPhoneLocal(staff.phone.slice(dial.length).trim());
    } else {
      setPhoneLocal(staff.phone || "");
    }
  }, [staff.id, staff.country, staff.country_code, staff.phone]);

  const handleCountryChange = (code: string) => {
    setSelCode(code);
    const c = findAfricaCountry(code);
    if (c) {
      setForm((f) => ({ ...f, country: c.name, country_code: c.dial, region: "" }));
      if (!phoneLocal.trim()) setPhoneLocal("");
    }
  };

  const selectedAfrica = findAfricaCountry(selCode);
  const regions = selectedAfrica?.regions ?? [];

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(en ? "Maximum 2 MB." : "Maximum 2 Mo."); return; }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(en ? "Session expired." : "Session expirée.");

      const body = new FormData();
      body.append("file", file);
      body.append("profile_id", staff.id);

      const res = await fetch("/api/staff/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(en ? "Upload failed." : (data.error || "Upload échoué."));
      onUpdate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (en ? "Unknown error." : "Erreur inconnue.");
      alert((en ? "Error" : "Erreur") + " : " + message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Colonnes garanties dans profiles
    const dial = form.country_code || selectedAfrica?.dial || "";
    const fullPhone = phoneLocal.trim() ? `${dial} ${phoneLocal.trim()}`.trim() : null;
    const baseUpdate: Record<string, unknown> = {
      prenom:          form.prenom,
      nom:             form.nom,
      phone:           fullPhone,
      job_title:       form.job_title    || null,
      base_salary:     form.base_salary ?? staff.base_salary,
      work_schedule:   String(form.weekly_hours ?? weeklyHours),
      seniority_years: form.seniority_years ?? staff.seniority_years,
      country:         form.country      || null,
      city:            form.city         || null,
      neighborhood:    form.neighborhood || null,
    };
    // Colonnes optionnelles — ignorées si elles n'existent pas encore en DB
    const optionalUpdate: Record<string, unknown> = {
      prime:        form.prime ?? staff.prime ?? null,
      country_code: form.country_code   || null,
      region:       form.region         || null,
      id_type:      form.id_type        || null,
      id_number:    form.id_number      || null,
      genre:        form.genre          || null,
      birth_date:   form.birth_date     || null,
    };

    // Tentative avec les champs optionnels, fallback sans si erreur
    const { error } = await supabase.from("profiles").update({ ...baseUpdate, ...optionalUpdate }).eq("id", staff.id);
    if (error) {
      const { error: fallbackErr } = await supabase.from("profiles").update(baseUpdate).eq("id", staff.id);
      if (fallbackErr) {
        alert(en ? "Unable to save the changes." : `Erreur lors de la sauvegarde : ${fallbackErr.message}`);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onEditingChange(false);
    onUpdate();
  };

  const f = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // ── VIEW MODE ──────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="w-full">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

        <StaffDossierSection
          icon={UserCog}
          title={en ? "General information" : "Informations générales"}
          description={en ? "Photo, contact details, and staff member role." : "Photo, coordonnées et fonction du collaborateur."}
          actions={
            onExport ? (
              <button
                type="button"
                onClick={onExport}
                className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors"
              >
                <Download size={12} /> {en ? "Download" : "Télécharger"}
              </button>
            ) : undefined
          }
        >
          <div
            className="rounded-xl border border-black/[0.06] bg-white p-4 flex items-center gap-4 cursor-pointer hover:border-[#eb670e]/40 transition-colors"
            onClick={() => fileRef.current?.click()}
            title={en ? "Click to change the photo" : "Cliquer pour changer la photo"}
          >
            <div className="relative shrink-0">
              {staff.avatar_url ? (
                <img src={staff.avatar_url} alt="Photo" className="w-16 h-16 rounded-xl object-cover border border-black/[0.06]" />
              ) : (
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-extrabold text-white" style={{ backgroundColor: ORANGE }}>
                  {staff.prenom[0]}{staff.nom[0]}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-sm">
                {uploading ? <Loader2 size={12} className="animate-spin text-orange-500" /> : <Camera size={12} style={{ color: ORANGE }} />}
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-base tracking-tight truncate" style={{ color: BLUE }}>{staff.prenom} {staff.nom}</p>
              <p className="text-sm text-neutral-500 font-medium truncate">{staff.email}</p>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">{staff.phone || (en ? "Phone not provided" : "Tél. non renseigné")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoField label={en ? "Gender" : "Genre"} value={genderDisplayLabel(staff.genre, en)} />
            <InfoField
              label={en ? "Age" : "Âge"}
              value={(() => {
                const age = ageFromBirthDate(staff.birth_date);
                return age != null ? `${age} ${en ? "years" : "ans"}` : "—";
              })()}
            />
            <InfoField label={en ? "Job title" : "Intitulé de poste"} value={staff.job_title || "—"} />
            <InfoField label={en ? "Seniority" : "Ancienneté"} value={`${staff.seniority_years} ${en ? "year(s)" : "an(s)"}`} />
            <InfoField label={en ? "Base salary" : "Salaire de base"} value={staff.base_salary ? `${staff.base_salary.toLocaleString(en ? "en-US" : "fr-FR")} XAF` : "—"} />
            <InfoField label={en ? "Bonus" : "Prime / Bonus"} value={staff.prime > 0 ? `${staff.prime.toLocaleString(en ? "en-US" : "fr-FR")} XAF` : "—"} />
            <InfoField label={en ? "Weekly hours" : "Volume horaire"} value={`${weeklyHours} ${en ? "hours/week" : "h/semaine"}`} />
          </div>

          {isTCF && staff.role === "trainer" && (
            <div className="rounded-xl border border-black/[0.06] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Matières TCF</p>
              <p className="text-sm font-semibold" style={{ color: BLUE }}>
                {staff.tcfSubjects.length > 0
                  ? staff.tcfSubjects.map((k) => labelForTcfSubject(k)).join(" · ")
                  : "Aucune matière assignée"}
              </p>
            </div>
          )}
        </StaffDossierSection>

        <StaffDossierSection
          icon={Globe}
          title={en ? "Location" : "Localisation"}
          description={en ? "Country, region, city, and neighborhood." : "Pays, région, ville et quartier."}
        >
          <div className="grid grid-cols-2 gap-3">
            <InfoField label={en ? "Country" : "Pays"} value={staff.country ? `${staff.country_code ? `(${staff.country_code}) ` : ""}${staffCountryLabel}` : "—"} />
            <InfoField label={en ? "Region" : "Région"} value={staff.region || "—"} />
            <InfoField label={en ? "City" : "Ville"} value={staff.city || "—"} />
            <InfoField label={en ? "Neighborhood" : "Quartier"} value={staff.neighborhood || "—"} />
          </div>
        </StaffDossierSection>

        <StaffDossierSection
          icon={CreditCard}
          title={en ? "Identity document" : "Pièce d'identité"}
          description={en ? "Identity document type and number." : "Type et numéro du document d'identité."}
        >
          <button
            type="button"
            onClick={() => setShowId(!showId)}
            className="w-full flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-4 py-3 hover:bg-black/[0.02] transition-colors"
          >
            <span className="text-sm font-semibold text-neutral-600 flex items-center gap-1.5">
              <CreditCard size={14} /> {en ? "Document" : "Document"}
            </span>
            <div className="flex items-center gap-2">
              {!staff.id_type && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                  {en ? "Not provided" : "Non renseigné"}
                </span>
              )}
              {showId ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
            </div>
          </button>
          {showId && (
            <div className="rounded-xl border border-black/[0.06] bg-white p-4">
              {staff.id_type ? (
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-neutral-500 font-medium">Type : </span>
                    <span className="font-semibold" style={{ color: BLUE }}>{idTypeDisplayLabel(staff.id_type, en)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 font-medium">{en ? "No." : "N°"} : </span>
                    <span className="font-semibold font-mono" style={{ color: BLUE }}>{staff.id_number || "—"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-400 italic font-medium">
                  {en ? "Click Edit to add an identity document." : "Cliquez sur « Modifier » pour ajouter une pièce d’identité."}
                </p>
              )}
            </div>
          )}
        </StaffDossierSection>
      </div>
    );
  }

  // ── EDIT MODE ─────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-2 mb-2">
        <button
          type="button"
          onClick={() => onEditingChange(false)}
          className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03]"
        >
          {en ? "Cancel" : "Annuler"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
          style={{ backgroundColor: ORANGE }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {en ? "Save" : "Enregistrer"}
        </button>
      </div>

      <StaffDossierSection icon={UserCog} title={en ? "Identity & contact" : "Identité & contact"} description={en ? "Staff member contact details." : "Coordonnées du collaborateur."}>
        <div className="grid grid-cols-2 gap-3">
          <FField label={en ? "First name" : "Prénom"}><TInput value={form.prenom} onChange={(v) => f("prenom", v)} /></FField>
          <FField label={en ? "Last name" : "Nom"}><TInput value={form.nom} onChange={(v) => f("nom", v)} /></FField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FField label={en ? "Gender" : "Genre"}>
            <select value={form.genre} onChange={(e) => f("genre", e.target.value)} className={selectCls}>
              <option value="">{en ? "Choose…" : "Choisir…"}</option>
              <option value="Homme">{en ? "Male" : "Garçon / Homme"}</option>
              <option value="Femme">{en ? "Female" : "Fille / Femme"}</option>
              <option value="Autre">{en ? "Other" : "Autre"}</option>
            </select>
          </FField>
          <FField label={en ? "Date of birth" : "Date de naissance"}>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => f("birth_date", e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className={inputCls}
            />
          </FField>
        </div>
        <FField label={en ? "Email (sign-in ID)" : "Email (identifiant de connexion)"}>
          <input disabled value={staff.email} className="w-full h-12 px-4 rounded-lg border border-black/[0.08] bg-neutral-100 font-semibold text-base text-neutral-400 outline-none cursor-not-allowed" />
        </FField>
        <FField label={en ? "Phone" : "Téléphone"}>
          <div className="flex gap-2">
            <input
              value={form.country_code || selectedAfrica?.dial || ""}
              readOnly
              placeholder="+237"
              className="w-24 h-12 px-3 bg-neutral-100 rounded-lg border border-black/[0.08] text-sm font-semibold text-neutral-500 outline-none"
            />
            <input
              type="tel"
              value={phoneLocal}
              onChange={(e) => setPhoneLocal(e.target.value)}
              placeholder={en ? "Number" : "Numéro"}
              className={`flex-1 ${inputCls}`}
            />
          </div>
        </FField>
      </StaffDossierSection>

      <StaffDossierSection icon={ClipboardList} title={en ? "Contract and role" : "Contrat & fonction"} description={en ? "Position, compensation, and weekly hours." : "Poste, rémunération et volume horaire."}>
        <FField label={en ? "Exact job title" : "Intitulé exact du poste"}>
          <TInput value={form.job_title} onChange={(v) => f("job_title", v)} placeholder={en ? "Example: Senior Accountant" : "Ex: Chef Comptable Senior"} />
        </FField>
        <div className="grid grid-cols-2 gap-3">
          <FField label={en ? "Base salary (XAF)" : "Salaire de base (XAF)"}>
            <NumInput
              value={form.base_salary}
              onChange={(v) => f("base_salary", v)}
              placeholder={String(staff.base_salary || 0)}
            />
          </FField>
          <FField label={en ? "Bonus (XAF)" : "Prime / Bonus (XAF)"}>
            <NumInput
              value={form.prime}
              onChange={(v) => f("prime", v)}
              placeholder={String(staff.prime || 0)}
            />
          </FField>
          <FField label={en ? "Weekly hours" : "Volume horaire (h/semaine)"}>
            <NumInput
              value={form.weekly_hours}
              onChange={(v) => f("weekly_hours", v)}
              min={1}
              max={80}
              placeholder={String(weeklyHours)}
            />
          </FField>
          <FField label={en ? "Seniority (years)" : "Ancienneté (années)"}>
            <NumInput
              value={form.seniority_years}
              onChange={(v) => f("seniority_years", v)}
              placeholder={String(staff.seniority_years || 0)}
            />
          </FField>
        </div>
      </StaffDossierSection>

      <StaffDossierSection icon={Globe} title={en ? "Location" : "Localisation"} description={en ? "Administrative address." : "Adresse administrative."}>
        <div className="grid grid-cols-2 gap-3">
          <FField label={en ? "Country" : "Pays"}>
            <select value={selCode} onChange={(e) => handleCountryChange(e.target.value)} className={selectCls}>
              <option value="">{en ? "Select..." : "Sélectionner..."}</option>
              {AFRICA_54.map((c) => <option key={c.code} value={c.code}>{c.flag} {localizeCountryName(c.code, c.name, en ? "en" : "fr")} ({c.dial})</option>)}
            </select>
          </FField>
          <FField label={en ? "Region" : "Région"}>
            {regions.length > 0 ? (
              <select value={form.region} onChange={(e) => f("region", e.target.value)} className={selectCls}>
                <option value="">{en ? "Select..." : "Sélectionner..."}</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <TInput value={form.region} onChange={(v) => f("region", v)} placeholder={en ? "Region" : "Région"} />
            )}
          </FField>
          <FField label={en ? "City" : "Ville"}><TInput value={form.city} onChange={(v) => f("city", v)} placeholder="Douala" /></FField>
          <FField label={en ? "Neighborhood" : "Quartier"}><TInput value={form.neighborhood} onChange={(v) => f("neighborhood", v)} placeholder="Bonapriso" /></FField>
        </div>
      </StaffDossierSection>

      <StaffDossierSection icon={CreditCard} title={en ? "Identity document" : "Pièce d'identité"} description={en ? "Official document." : "Document officiel."}>
        <div className="grid grid-cols-2 gap-3">
          <FField label={en ? "Document type" : "Type de document"}>
            <select value={form.id_type} onChange={(e) => f("id_type", e.target.value)} className={selectCls}>
              <option value="">{en ? "Select..." : "Sélectionner..."}</option>
              {Object.entries(ID_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{idTypeDisplayLabel(k, en) || v}</option>)}
            </select>
          </FField>
          <FField label={en ? "Number" : "Numéro"}>
            <TInput value={form.id_number} onChange={(v) => f("id_number", v)} placeholder={en ? "Document number" : "Numéro du document"} />
          </FField>
        </div>
      </StaffDossierSection>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ONGLET ACCÈS
// ════════════════════════════════════════════════════════════════════════════
function PermissionsChecklist({
  selected,
  onToggle,
  isTCF,
  compact,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  isTCF: boolean;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  return (
    <div className={`space-y-4 ${compact ? "mt-1" : "mt-1"}`}>
      {PERMISSION_GROUPS.map((group) => {
        const opts = PERMISSION_OPTIONS.filter((o) => group.keys.includes(o.key));
        return (
          <div key={group.id}>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">{permissionGroupLabel(group.id, group.label, en)}</p>
            <div className={compact ? "grid grid-cols-1 sm:grid-cols-2 gap-1.5" : "space-y-1.5"}>
              {opts.map((opt) => {
                const Icon = opt.icon;
                const checked = selected.includes(opt.key);
                const locked = opt.key === "lives" || (isTCF && opt.key === "communaute");
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onToggle(opt.key)}
                    disabled={locked}
                    title={en && opt.key === "planning" ? "Also includes live sessions depending on the center type" : opt.hint}
                    className={`w-full flex items-center gap-2 px-3 ${compact ? "h-9" : "h-10"} rounded-lg border text-xs font-semibold transition-colors text-left ${
                      checked
                        ? "border-[#eb670e]/40 bg-[#FFF5EE] text-[#c95508]"
                        : "border-black/[0.08] bg-white text-neutral-600 hover:bg-black/[0.03]"
                    } ${locked ? "opacity-80 cursor-default" : ""}`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="min-w-0">
                      {permissionLabel(opt.key, opt.label, en)}{opt.key === "lives" ? (en ? " (default)" : " (par défaut)") : locked ? " (inclus TCF)" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaffAccessTab({
  staff,
  campuses,
  staffList,
  isTCF,
  onUpdate,
  onAccessSaved,
}: {
  staff: StaffRow;
  campuses: Campus[];
  staffList: StaffRow[];
  isTCF: boolean;
  onUpdate: () => void;
  onAccessSaved: (staffId: string, next: { permissions: string[]; campusIds: string[]; campusNames: string[] }) => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const isManager = staff.role === "campus_manager";
  const [editing,     setEditing]     = useState(false);
  const [selCampuses, setSelCampuses] = useState<string[]>(staff.campusIds);
  const [selPerms,    setSelPerms]    = useState<string[]>(ensureDefaultLivesPermission(staff.permissions));
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setSaveError(null);
    setSelCampuses(staff.campusIds);
    setSelPerms(ensureDefaultLivesPermission(staff.permissions));
  }, [staff.id, staff.campusIds, staff.permissions]);

  const toggleCampus = (id: string) =>
    setSelCampuses((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);
  const togglePerm = (key: string) => {
    if (key === "lives") return;
    if (isTCF && key === "communaute") return;
    setSelPerms((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(en ? "Session expired." : "Session expirée.");

      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          profile_id: staff.id,
          campus_ids: selCampuses,
          permissions: selPerms,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(en ? "Unable to save." : (json.error || "Enregistrement impossible."));

      const nextPerms = Array.isArray(json.permissions)
        ? filterModulePermissions(json.permissions.map(String))
        : selPerms;
      const nextCampusIds = Array.isArray(json.campus_ids)
        ? json.campus_ids.map(String)
        : selCampuses;
      const campusNameById = Object.fromEntries(campuses.map((c) => [c.id, c.name]));
      const nextCampusNames = nextCampusIds.map((id: string) => campusNameById[id] ?? "—");

      onAccessSaved(staff.id, {
        permissions: nextPerms,
        campusIds: nextCampusIds,
        campusNames: nextCampusNames,
      });
      setSelPerms(nextPerms);
      setSelCampuses(nextCampusIds);
      setEditing(false);
      onUpdate();
    } catch (e: any) {
      setSaveError(en ? "Error while saving." : (e.message || "Erreur lors de la sauvegarde."));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelCampuses(staff.campusIds);
    setSelPerms(ensureDefaultLivesPermission(staff.permissions));
    setSaveError(null);
    setEditing(false);
  };

  const campusNames = campuses.filter((c) => staff.campusIds.includes(c.id)).map((c) => c.name);
  const permLabels  = PERMISSION_OPTIONS.filter((o) => staff.permissions.includes(o.key));

  return (
    <div className="w-full">
      <StaffDossierSection
        icon={ShieldCheck}
        title={en ? "Platform access" : "Accès plateforme"}
        description={en ? "Assigned campuses and modules available in the menu." : "Campus assignés et modules autorisés dans le menu."}
        actions={
          !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:bg-black/[0.03]"
            >
              <Edit3 size={12} /> {en ? "Edit" : "Modifier"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03]"
              >
                {en ? "Cancel" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {en ? "Save" : "Enregistrer"}
              </button>
            </>
          )
        }
      >
        {saveError && (
          <p className="text-sm font-semibold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{saveError}</p>
        )}

        {isManager && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
            <ShieldCheck className="text-blue-700 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-extrabold text-sm text-blue-900">{en ? "Campus manager. Full access" : "Directeur de campus. Accès complet"}</p>
              <p className="text-sm text-blue-700 font-medium mt-0.5">{en ? "Administrative rights for assigned campuses." : "Droits d'administration sur les campus assignés."}</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-neutral-600 mb-2">{en ? "Assigned campuses" : "Campus assignés"}</p>
          {!editing ? (
            <div className="flex flex-wrap gap-2">
              {campusNames.length > 0 ? campusNames.map((name) => (
                <span key={name} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white text-neutral-700">
                  <MapPin size={12} /> {name}
                </span>
              )) : (
                <p className="text-sm text-neutral-400 italic font-medium">{en ? "No campus assigned." : "Aucun campus assigné."}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {campuses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCampus(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold border transition-colors ${
                    selCampuses.includes(c.id)
                      ? "bg-[#11224E]/[0.06] border-[#11224E]/30 text-[#11224E]"
                      : "bg-white border-black/[0.08] text-neutral-500 hover:bg-black/[0.03]"
                  }`}
                >
                  <MapPin size={12} /> {c.name}
                </button>
              ))}
              {campuses.length === 0 && <p className="text-sm text-neutral-400 italic font-medium">{en ? "No campus created." : "Aucun campus créé."}</p>}
            </div>
          )}
        </div>

        {!isManager && (
          <div>
            <p className="text-sm font-semibold text-neutral-600 mb-1">{en ? "Allowed modules" : "Modules autorisés"}</p>
            <p className="text-xs text-neutral-400 font-medium mb-3">
              {en ? "Menu access rights, separate from academic subjects." : "Droits d'écran (menu), distincts des matières académiques."}
            </p>
            {!editing ? (
              <div className="space-y-3">
                {permLabels.length > 0 ? (
                  PERMISSION_GROUPS.map((group) => {
                    const items = permLabels.filter((o) => group.keys.includes(o.key));
                    if (items.length === 0) return null;
                    return (
                      <div key={group.id}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">{permissionGroupLabel(group.id, group.label, en)}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <span key={opt.key} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white text-neutral-700">
                                <Icon size={13} /> {permissionLabel(opt.key, opt.label, en)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-neutral-400 italic font-medium">{en ? "No module assigned." : "Aucun module attribué."}</p>
                )}
              </div>
            ) : (
              <PermissionsChecklist
                selected={selPerms}
                onToggle={togglePerm}
                isTCF={isTCF}
              />
            )}
          </div>
        )}
      </StaffDossierSection>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FICHE RH IMPRIMABLE (RH + Accès + Académique)
// ════════════════════════════════════════════════════════════════════════════

type PrintNiveauBlock = {
  label: string;
  classes: string[];
  matieres: string[];
};

type PrintProgrammeBlock = {
  id: string;
  name: string;
  niveaux: PrintNiveauBlock[];
};

function niveauLabelFromPrintRow(m: {
  annee?: number | null;
  niveaux?: {
    nom?: string | null;
    annee?: number | null;
    mois?: number | null;
    semaines?: number | null;
    jours?: number | null;
  } | null;
}, en = false): string {
  if (m.niveaux?.nom?.trim()) return m.niveaux.nom.trim();
  if (m.niveaux?.annee != null) return `${en ? "Level" : "Niveau"} ${m.niveaux.annee}`;
  if (m.annee != null && m.annee > 0) return `${en ? "Level" : "Niveau"} ${m.annee}`;
  if (m.niveaux?.mois) return `${m.niveaux.mois} ${en ? "months" : "mois"}`;
  if (m.niveaux?.semaines) return `${m.niveaux.semaines} ${en ? "weeks" : "sem."}`;
  if (m.niveaux?.jours) return `${m.niveaux.jours} ${en ? "days" : "j"}`;
  return en ? "Program (no level)" : "Programme (sans niveau)";
}

function StaffPrintModal({
  staff,
  centerId,
  isTCF,
  weeklyHours,
  onClose,
}: {
  staff: StaffRow;
  centerId: string;
  isTCF: boolean;
  weeklyHours: number;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [mounted, setMounted] = useState(false);
  const [loadingAcademic, setLoadingAcademic] = useState(staff.role === "trainer");
  const [programmes, setProgrammes] = useState<PrintProgrammeBlock[]>([]);
  const [docConfig, setDocConfig] = useState<DocumentExportConfig | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await fetchDocumentExportConfig(supabase, centerId);
      if (!cancelled) setDocConfig(cfg);
    })();
    return () => { cancelled = true; };
  }, [centerId]);

  useEffect(() => {
    if (staff.role !== "trainer") {
      setLoadingAcademic(false);
      setProgrammes([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoadingAcademic(true);
      try {
        if (isTCF) {
          if (!cancelled) {
            setProgrammes(
              staff.tcfSubjects.length > 0
                ? [{
                    id: "tcf",
                    name: "Préparation TCF Canada",
                    niveaux: [{
                      label: "Compétences enseignées",
                      classes: [],
                      matieres: staff.tcfSubjects.map((k) => labelForTcfSubject(k)),
                    }],
                  }]
                : [],
            );
          }
          return;
        }

        const { data: assignedRows, error: assignedErr } = await supabase
          .from("matiere_formateurs")
          .select(`
            filiere_matiere_id,
            filiere_matieres (
              id,
              niveau_id,
              annee,
              filieres (id, name, center_id),
              niveaux (id, nom, annee, mois, semaines, jours),
              exam_disciplines (name)
            )
          `)
          .eq("formateur_id", staff.id);

        if (assignedErr) throw assignedErr;

        const rows = (assignedRows || [])
          .map((row: any) => row.filiere_matieres)
          .filter((m: any) => m && m.filieres?.center_id === centerId);

        const niveauIds = Array.from(
          new Set(rows.map((m: any) => m.niveau_id || m.niveaux?.id).filter(Boolean)),
        ) as string[];
        const filiereIds = Array.from(
          new Set(rows.map((m: any) => m.filieres?.id).filter(Boolean)),
        ) as string[];

        const classesByNiveau: Record<string, string[]> = {};
        const classesByFiliere: Record<string, string[]> = {};

        if (niveauIds.length > 0) {
          const { data: grpByNiv } = await supabase
            .from("groupes")
            .select("id, nom, niveau_id")
            .in("niveau_id", niveauIds);
          for (const g of grpByNiv || []) {
            const key = (g as any).niveau_id as string;
            if (!classesByNiveau[key]) classesByNiveau[key] = [];
            classesByNiveau[key].push((g as any).nom || "—");
          }
        }

        if (filiereIds.length > 0) {
          const { data: grpByFil } = await supabase
            .from("groupes")
            .select("id, nom, filiere_id, niveau_id")
            .in("filiere_id", filiereIds)
            .is("niveau_id", null);
          for (const g of grpByFil || []) {
            const key = (g as any).filiere_id as string;
            if (!classesByFiliere[key]) classesByFiliere[key] = [];
            classesByFiliere[key].push((g as any).nom || "—");
          }
        }

        const byProg = new Map<
          string,
          { name: string; niveaux: Map<string, { classes: Set<string>; matieres: Set<string> }> }
        >();

        for (const m of rows) {
          const filiereId = m.filieres?.id as string;
          const filiereName = (m.filieres?.name as string) || (en ? "Program" : "Programme");
          const niveauId = (m.niveau_id || m.niveaux?.id || null) as string | null;
          const nivLabel = niveauLabelFromPrintRow(m, en);
          const matiereName = m.exam_disciplines?.name || (en ? "Subject" : "Matière");

          let prog = byProg.get(filiereId);
          if (!prog) {
            prog = { name: filiereName, niveaux: new Map() };
            byProg.set(filiereId, prog);
          }

          let niv = prog.niveaux.get(nivLabel);
          if (!niv) {
            const classNames = niveauId
              ? (classesByNiveau[niveauId] || [])
              : (classesByFiliere[filiereId] || []);
            niv = { classes: new Set(classNames), matieres: new Set() };
            prog.niveaux.set(nivLabel, niv);
          }
          niv.matieres.add(matiereName);
        }

        const built: PrintProgrammeBlock[] = Array.from(byProg.entries())
          .map(([id, v]) => ({
            id,
            name: v.name,
            niveaux: Array.from(v.niveaux.entries())
              .map(([label, data]) => ({
                label,
                classes: Array.from(data.classes).sort((a, b) => a.localeCompare(b, "fr")),
                matieres: Array.from(data.matieres).sort((a, b) => a.localeCompare(b, "fr")),
              }))
              .sort((a, b) => a.label.localeCompare(b.label, "fr")),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "fr"));

        if (!cancelled) setProgrammes(built);
      } catch (e) {
        console.error("Erreur chargement académique fiche RH:", e);
        if (!cancelled) setProgrammes([]);
      } finally {
        if (!cancelled) setLoadingAcademic(false);
      }
    })();

    return () => { cancelled = true; };
  }, [staff.id, staff.role, staff.tcfSubjects, centerId, isTCF, en]);

  if (!mounted) return null;

  const isManager = staff.role === "campus_manager";
  const permLabels = PERMISSION_OPTIONS.filter((o) => staff.permissions.includes(o.key));
  const isTrainer = staff.role === "trainer";
  const staffCountryRef = AFRICA_54.find((country) => country.name === staff.country || country.dial === staff.country_code);
  const staffCountryLabel = staff.country
    ? localizeCountryName(staffCountryRef?.code || "", staff.country, en ? "en" : "fr")
    : "—";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col">
      <div className="print:hidden shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-neutral-200 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft size={15} /> {en ? "Back" : "Retour"}
        </button>
        <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400 hidden sm:block">
          {en ? "Record preview" : "Aperçu du dossier"}
        </p>
        <button
          type="button"
          onClick={() => printElementClean("staff-print-content")}
          disabled={loadingAcademic}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-[11px] font-black uppercase text-white disabled:opacity-50"
          style={{ backgroundColor: ORANGE }}
        >
          {loadingAcademic ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {en ? "Download" : "Télécharger"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-black/75 p-4 md:p-8 print:bg-white print:p-0 print:overflow-visible">
        <div className="bg-white max-w-[680px] w-full mx-auto p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:max-w-none" id="staff-print-content">
          <DocumentOfficialHeader
            config={docConfig}
            fallbackTitle={en ? "Staff Record. Human Resources" : "Fiche de Personnel. Ressources Humaines"}
            rightExtra={
              <p>{en ? "Issue date" : "Date d'édition"} : {new Date().toLocaleDateString(en ? "en-GB" : "fr-FR")}</p>
            }
          />

          {/* Identité collaborateur */}
          <div className="mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-black uppercase" style={{ color: BLUE }}>
              {staff.prenom} {staff.nom}
            </h2>
            <p className="text-xs font-bold mt-1" style={{ color: docConfig?.accentColor || ORANGE }}>
              {staff.job_title || roleDisplayLabel(staff.role, en)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-500">
              <span>{staff.email}</span>
              <span className={`font-bold ${staff.center_status === "active" ? ACTION_TONE.positiveText : ACTION_TONE.negativeText}`}>
                {staff.center_status === "active" ? (en ? "Active" : "Actif") : (en ? "Suspended" : "Suspendu")}
              </span>
            </div>
          </div>

          {/* Photo + identité */}
          <div className="flex gap-5 mb-6">
            <div className="w-28 h-36 rounded-xl border-2 border-neutral-200 overflow-hidden bg-neutral-50 flex items-center justify-center shrink-0">
              {staff.avatar_url ? (
                <img src={staff.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <p className="text-3xl font-black" style={{ color: BLUE }}>{staff.prenom[0]}{staff.nom[0]}</p>
                  <p className="text-[8px] text-neutral-400 mt-1">PHOTO</p>
                </div>
              )}
            </div>
            <div className="flex-1">
              <PSection title={en ? "Personal information" : "Informations personnelles"}>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                  <PField label={en ? "Phone" : "Téléphone"} value={staff.phone || "—"} />
                  <PField label={en ? "Country" : "Pays"} value={staff.country ? `${staff.country_code ? `(${staff.country_code}) ` : ""}${staffCountryLabel}` : "—"} />
                  <PField label={en ? "Region" : "Région"} value={staff.region || "—"} />
                  <PField label={en ? "City" : "Ville"} value={staff.city || "—"} />
                  <PField label={en ? "Neighborhood" : "Quartier"} value={staff.neighborhood || "—"} />
                </div>
              </PSection>
            </div>
          </div>

          {/* Contrat */}
          <div className="mb-5">
            <PSection title={en ? "Contract and compensation" : "Contrat & Rémunération"}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                <PField label={en ? "Role" : "Rôle"} value={roleDisplayLabel(staff.role, en)} />
                <PField label={en ? "Job title" : "Intitulé"} value={staff.job_title || "—"} />
                <PField label={en ? "Seniority" : "Ancienneté"} value={`${staff.seniority_years} ${en ? "year(s)" : "an(s)"}`} />
                <PField label={en ? "Weekly hours" : "Volume horaire"} value={`${weeklyHours} ${en ? "hours/week" : "h/semaine"}`} />
                <PField label={en ? "Base salary" : "Salaire de base"} value={staff.base_salary ? `${staff.base_salary.toLocaleString(en ? "en-US" : "fr-FR")} XAF` : "—"} />
                <PField label={en ? "Bonus" : "Prime / Bonus"} value={staff.prime ? `${staff.prime.toLocaleString(en ? "en-US" : "fr-FR")} XAF` : "—"} />
              </div>
            </PSection>
          </div>

          {/* ID doc */}
          {staff.id_type && (
            <div className="mb-5">
              <PSection title={en ? "Identity document" : "Pièce d'identité"}>
                <div className="grid grid-cols-2 gap-x-8">
                  <PField label="Type" value={idTypeDisplayLabel(staff.id_type, en)} />
                  <PField label={en ? "Number" : "Numéro"} value={staff.id_number || "—"} />
                </div>
              </PSection>
            </div>
          )}

          {/* Accès */}
          <div className="mb-5">
            <PSection title={en ? "Platform access" : "Accès plateforme"}>
              <div className="space-y-3">
                <div>
                  <p className="text-[8px] font-bold uppercase text-neutral-400 tracking-wider mb-1">{en ? "Assigned campuses" : "Campus assignés"}</p>
                  <p className="text-xs font-semibold" style={{ color: BLUE }}>
                    {staff.campuses.length > 0 ? staff.campuses.join(" · ") : (en ? "No campus assigned" : "Aucun campus assigné")}
                  </p>
                </div>
                {isManager ? (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BLUE }}>
                      {en ? "Campus manager. Full access" : "Directeur de campus. Accès complet"}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {en ? "Administrative rights for assigned campuses." : "Droits d'administration sur les campus assignés."}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[8px] font-bold uppercase text-neutral-400 tracking-wider mb-1.5">{en ? "Allowed modules" : "Modules autorisés"}</p>
                    {permLabels.length > 0 ? (
                      <div className="space-y-2">
                        {PERMISSION_GROUPS.map((group) => {
                          const items = permLabels.filter((o) => group.keys.includes(o.key));
                          if (items.length === 0) return null;
                          return (
                            <div key={group.id}>
                              <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">{permissionGroupLabel(group.id, group.label, en)}</p>
                              <p className="text-xs font-semibold" style={{ color: BLUE }}>
                                {items.map((o) => permissionLabel(o.key, o.label, en)).join(" · ")}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">{en ? "No module assigned." : "Aucun module attribué."}</p>
                    )}
                  </div>
                )}
              </div>
            </PSection>
          </div>

          {/* Académique — formateurs uniquement */}
          {isTrainer && (
            <div className="mb-5">
              <PSection title={en ? "Academic assignment" : "Affectation académique"}>
                {loadingAcademic ? (
                  <p className="text-xs text-neutral-400 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> {en ? "Loading assignments..." : "Chargement des affectations…"}
                  </p>
                ) : programmes.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">{en ? "No academic assignment." : "Aucune affectation académique."}</p>
                ) : (
                  <div className="space-y-3">
                    {programmes.map((prog) => (
                      <div key={prog.id} className="border border-neutral-200 rounded-xl overflow-hidden">
                        <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200">
                          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BLUE }}>
                            {prog.name}
                          </p>
                        </div>
                        <div className="px-3 py-2 space-y-2.5">
                          {prog.niveaux.map((niv) => (
                            <div key={`${prog.id}-${niv.label}`}>
                              <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                                {niv.label}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                {niv.classes.length > 0 && (
                                  <div>
                                    <p className="text-[8px] font-bold uppercase text-neutral-400">Classes</p>
                                    <p className="text-[11px] font-semibold" style={{ color: BLUE }}>
                                      {niv.classes.join(" · ")}
                                    </p>
                                  </div>
                                )}
                                <div className={niv.classes.length > 0 ? "" : "sm:col-span-2"}>
                                  <p className="text-[8px] font-bold uppercase text-neutral-400">
                                    {isTCF ? "Compétences" : (en ? "Subjects" : "Matières")}
                                  </p>
                                  <p className="text-[11px] font-semibold" style={{ color: BLUE }}>
                                    {niv.matieres.length > 0 ? niv.matieres.join(" · ") : "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PSection>
            </div>
          )}

          {/* Signatures */}
          <div className="flex justify-between items-end mt-12">
            <div className="w-48 text-center">
              <p className="text-[9px] font-black uppercase mb-1" style={{ color: BLUE }}>{en ? "Staff member" : "Le Salarié"}</p>
              <div className="h-14 border-b border-dashed border-neutral-300" />
              <p className="text-[9px] text-neutral-400 mt-1">Signature</p>
            </div>
            <div className="w-48 text-center">
              <p className="text-[9px] font-black uppercase mb-1" style={{ color: BLUE }}>{en ? "Management" : "La Direction"}</p>
              <div className="h-14 border-b border-dashed border-neutral-300" />
              <p className="text-[9px] text-neutral-400 mt-1">{en ? "Stamp and signature" : "Cachet & Signature"}</p>
            </div>
          </div>
          <div className="mt-6 text-right text-[10px] text-neutral-400">
            {en ? "Issued at" : "Fait à"} __________________, {en ? "on" : "le"} {new Date().toLocaleDateString(en ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          #staff-print-content {
            margin: 0 !important;
            padding: 24px !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MATIÈRES TCF — sélection à la création
// ════════════════════════════════════════════════════════════════════════════
function TcfSubjectsPicker({ selected, onChange }: { selected: string[]; onChange: (keys: string[]) => void }) {
  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
        Matières enseignées <span className="text-orange-500">*</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TCF_TEACHING_SUBJECTS.map((s) => {
          const on = selected.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-bold transition-colors ${
                on ? "border-orange-300 bg-orange-50 text-orange-800" : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${on ? "bg-orange-500 border-orange-500 text-white" : "border-neutral-300 bg-white"}`}>
                {on ? "✓" : ""}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-neutral-400 mt-1.5">Cochez une ou plusieurs matières TCF.</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODALE DE CRÉATION
// ════════════════════════════════════════════════════════════════════════════
function CreateStaffModal({ centerId, isTCF, campuses, staffList, onClose, onCreated }: {
  centerId: string; isTCF: boolean; campuses: Campus[]; staffList: StaffRow[]; onClose: () => void; onCreated: () => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [step,     setStep]     = useState(1);
  const [prenom,   setPrenom]   = useState("");
  const [nom,      setNom]      = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [genre,    setGenre]    = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selCountry,  setSelCountry]  = useState("");
  const [phonePrefix, setPhonePrefix] = useState("");
  const [region,      setRegion]      = useState("");
  const [city,        setCity]        = useState("");

  const [category,   setCategory]   = useState<"administratif" | "academique" | null>(null);
  const [role,       setRole]       = useState("");
  const [jobTitle,   setJobTitle]   = useState("");
  const [selTcfSubjects, setSelTcfSubjects] = useState<string[]>([]);

  const [selCampuses, setSelCampuses] = useState<string[]>([]);
  const [selPerms,    setSelPerms]    = useState<string[]>(
    ensureDefaultLivesPermission(isTCF ? ["communaute"] : []),
  );

  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState("");
  const [result,           setResult]           = useState<{ emailSent: boolean; emailQueued?: boolean; temporaryPassword?: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ campusId: string; campusName: string; managerName: string } | null>(null);
  const [copiedKind,       setCopiedKind]       = useState<"pwd" | "all" | null>(null);

  const selectedCountry = findAfricaCountry(selCountry);
  const regions = selectedCountry?.regions ?? [];

  const handleCountrySelect = (code: string) => {
    setSelCountry(code);
    setRegion("");
    const c = findAfricaCountry(code);
    if (c) setPhonePrefix(c.dial);
  };

  const needsPermissions = role === "staff";
  const needsTcfSubjects = isTCF && role === "trainer";
  const genreOk = genre === "Homme" || genre === "Femme" || genre === "Autre";
  const birthOk = /^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim());
  const canStep2 = Boolean(prenom.trim() && nom.trim() && email.trim() && genreOk && birthOk);
  const canStep3 = role && jobTitle.trim() && (!needsTcfSubjects || selTcfSubjects.length > 0);
  const canSubmit = canStep3 && (!needsPermissions || selPerms.length > 0);

  const toggleCampus = (id: string) => {
    if (role === "campus_manager" && !selCampuses.includes(id)) {
      const existing = staffList.find((s) => s.role === "campus_manager" && s.campusIds.includes(id));
      if (existing) {
        setDuplicateWarning({ campusId: id, campusName: campuses.find((c) => c.id === id)?.name ?? id, managerName: `${existing.prenom} ${existing.nom}` });
        return;
      }
    }
    setSelCampuses((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);
  };

  const handleSubmit = async () => {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(en ? "Session expired." : "Session expirée.");
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          prenom: prenom.trim(), nom: nom.trim(), email: email.trim(),
          phone: phone.trim() ? `${phonePrefix} ${phone.trim()}`.trim() : null,
          role, job_title: jobTitle.trim(),
          genre: genre.trim(),
          birth_date: birthDate.trim(),
          country: selectedCountry?.name || null,
          country_code: phonePrefix || null,
          region: region.trim() || null,
          city: city.trim() || null,
          campus_ids: selCampuses,
          permissions: needsPermissions ? selPerms : [],
          tcf_subjects: needsTcfSubjects ? selTcfSubjects : [],
          locale: isTCF ? "fr" : (en ? "en" : "fr"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(en ? "Error while creating the profile." : (data.error || "Erreur lors de la création."));
      // Afficher le popup immédiatement, même si l'email part en arrière-plan
      setResult({
        emailSent: Boolean(data.emailSent),
        emailQueued: Boolean(data.emailQueued),
        temporaryPassword: data.temporaryPassword,
      });
    } catch (e: any) {
      setError(en ? "Error while creating the profile." : (e.message || "Erreur lors de la création."));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const fullName = `${prenom.trim()} ${nom.trim()}`.trim();
    const roleLabel = jobTitle.trim() || roleDisplayLabel(role, en) || (en ? "Staff member" : "Collaborateur");
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login?lang=${en ? "en" : "fr"}` : `/login?lang=${en ? "en" : "fr"}`;
    const accessLines = [
      `${en ? "Hello" : "Bonjour"} ${prenom.trim()},`,
      "",
      en ? `Your ${roleLabel.toLowerCase()} account has been created.` : `Votre compte ${roleLabel.toLowerCase()} a été créé.`,
      "",
      `${en ? "Name" : "Nom"} : ${fullName}`,
      `Email : ${email.trim()}`,
      result.temporaryPassword ? `${en ? "Temporary password" : "Mot de passe temporaire"} : ${result.temporaryPassword}` : null,
      `${en ? "Sign-in link" : "Lien de connexion"} : ${loginUrl}`,
      "",
      en ? "Keep these credentials private." : "Conservez ces identifiants et ne les partagez pas.",
    ].filter((line): line is string => line !== null);
    const accessText = accessLines.join("\n");

    const handleCopyText = async (text: string, kind: "pwd" | "all") => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 2000);
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl text-center border border-black/[0.06]">
          <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="text-xl font-extrabold tracking-tight" style={{ color: BLUE }}>{en ? "Profile created" : "Profil créé"}</h3>
          <p className="text-sm text-neutral-500 mt-1 font-medium">{roleLabel}</p>

          <div className="mt-4 space-y-2 text-left">
            <div className="rounded-xl border border-black/[0.06] bg-[#F7F7F6] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{en ? "Name" : "Nom"}</p>
              <p className="text-sm font-extrabold mt-0.5" style={{ color: BLUE }}>{fullName}</p>
            </div>
            <div className="rounded-xl border border-black/[0.06] bg-[#F7F7F6] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email</p>
              <p className="text-sm font-semibold mt-0.5 break-all select-all">{email.trim()}</p>
            </div>
          </div>

          {result.emailSent ? (
            <p className="text-sm text-emerald-700 font-bold mt-4">{en ? `An email was also sent to ${email.trim()}.` : `Un email a aussi été envoyé à ${email.trim()}.`}</p>
          ) : result.emailQueued ? (
            <p className="text-sm text-blue-700 font-bold mt-4">
              {en ? "The email is being sent. Keep the password below as well." : "Email en cours d'envoi. Conservez aussi le mot de passe ci-dessous."}
            </p>
          ) : (
            <p className="text-sm text-amber-700 font-bold mt-4 flex items-center justify-center gap-1.5">
              <AlertTriangle size={13} /> {en ? "Email not sent. Share these credentials manually." : "Email non envoyé. Communiquez ces accès manuellement."}
            </p>
          )}

          {result.temporaryPassword ? (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
              <p className="text-xs font-bold text-amber-700">{en ? "Temporary password" : "Mot de passe temporaire"}</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="flex-1 font-mono font-black text-sm bg-white border rounded-lg p-2 select-all break-all">
                  {result.temporaryPassword}
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopyText(result.temporaryPassword || "", "pwd")}
                  className="shrink-0 h-10 px-3 rounded-lg border border-amber-300 bg-white text-[10px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-50"
                >
                  {copiedKind === "pwd" ? "OK" : "MDP"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-amber-700/80 font-medium">
                {en ? "Paste only the password in the sign-in field, not the full message." : "Collez uniquement le mot de passe dans le champ connexion, pas tout le message."}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCopyText(accessText, "all")}
            className="w-full mt-4 h-11 rounded-xl text-xs font-black uppercase tracking-widest inline-flex items-center justify-center gap-2 border-2 transition-colors"
            style={{ borderColor: BLUE, color: BLUE }}
          >
            {copiedKind === "all" ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            {copiedKind === "all" ? (en ? "Copied!" : "Copié !") : (en ? "Copy full message" : "Tout copier (message)")}
          </button>

          <button
            type="button"
            onClick={onCreated}
            className="w-full mt-3 h-11 rounded-xl text-xs font-black uppercase text-white"
            style={{ backgroundColor: BLUE }}
          >
            {en ? "Done" : "Terminé"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto border border-black/[0.06]">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={en ? "Close" : "Fermer"}
        >
          <X size={18} />
        </button>
        <h3 className="text-xl font-extrabold tracking-tight mb-1.5" style={{ color: BLUE }}>{en ? "Create a staff member" : "Créer un membre"}</h3>
        {saving && (
          <p className="mb-3 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            {en ? "Creating profile... Do not close this window." : "Création en cours… ne fermez pas cette fenêtre."}
          </p>
        )}

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= n ? "bg-orange-500" : "bg-neutral-200"}`} />
          ))}
        </div>

        {/* ─ ÉTAPE 1 : Identité + Pays ─ */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <TInput value={prenom} onChange={setPrenom} placeholder={en ? "First name" : "Prénom"} />
              <TInput value={nom} onChange={setNom} placeholder={en ? "Last name" : "Nom"} />
            </div>
            <TInput type="email" value={email} onChange={setEmail} placeholder={en ? "Email address" : "Adresse email"} />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">{en ? "Gender" : "Genre"} *</p>
                <select value={genre} onChange={(e) => setGenre(e.target.value)} className={selectCls}>
                  <option value="">{en ? "Choose..." : "Choisir…"}</option>
                  <option value="Homme">{en ? "Male" : "Garçon / Homme"}</option>
                  <option value="Femme">{en ? "Female" : "Fille / Femme"}</option>
                  <option value="Autre">{en ? "Other" : "Autre"}</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">{en ? "Date of birth" : "Date de naissance"} *</p>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1"><Globe size={11} /> {en ? "Country" : "Pays"}</p>
              <select value={selCountry} onChange={(e) => handleCountrySelect(e.target.value)} className={selectCls}>
                <option value="">{en ? "Select a country..." : "Sélectionner un pays..."}</option>
                {AFRICA_54.map((c) => <option key={c.code} value={c.code}>{c.flag} {localizeCountryName(c.code, c.name, en ? "en" : "fr")} ({c.dial})</option>)}
              </select>
            </div>

            {regions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5"><MapPin size={11} className="inline mr-1" />{en ? "Region" : "Région"}</p>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectCls}>
                  <option value="">{en ? "Select..." : "Sélectionner..."}</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            <TInput value={city} onChange={setCity} placeholder={en ? "City (example: Douala, Dakar...)" : "Ville (ex: Douala, Dakar...)"} />

            <div className="flex gap-2">
              <input value={phonePrefix} readOnly placeholder="+237" className="w-24 h-10 px-3 bg-neutral-100 rounded-xl border text-xs font-bold text-neutral-500 outline-none" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={en ? "Phone number" : "Numéro de téléphone"} className={`flex-1 ${inputCls}`} />
            </div>

            <button onClick={() => setStep(2)} disabled={!canStep2} className="w-full h-11 mt-1 rounded-xl text-xs font-semibold text-white disabled:opacity-40" style={{ backgroundColor: BLUE }}>
              {en ? "Next" : "Suivant"}
            </button>
          </div>
        )}

        {/* ─ ÉTAPE 2 : Rôle ─ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(STAFF_CATEGORIES) as [string, typeof STAFF_CATEGORIES.administratif][]).map(([key, cat]) => (
                <button key={key} onClick={() => { setCategory(key as "administratif" | "academique"); setRole(""); }} className={`p-4 rounded-2xl border-2 text-left transition-colors ${category === key ? "border-orange-400 bg-orange-50" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <p className="font-black text-sm" style={{ color: BLUE }}>{en ? (key === "administratif" ? "Administrative staff" : "Academic staff") : cat.label}</p>
                </button>
              ))}
            </div>

            {category && (
              <div className="space-y-2">
                {STAFF_CATEGORIES[category].roles.map((r) => (
                  <button key={r.value} onClick={() => { setRole(r.value); if (r.value !== "trainer") setSelTcfSubjects([]); }} className={`w-full p-3.5 rounded-xl border-2 text-left transition-colors ${role === r.value ? "border-orange-400 bg-orange-50" : "border-neutral-200 hover:border-neutral-300"}`}>
                    <p className="font-black text-sm" style={{ color: BLUE }}>{en ? (r.value === "campus_manager" ? "Campus manager" : r.value === "staff" ? "Administrative officer" : r.value === "trainer" ? "Trainer" : "Academic coordinator") : r.label}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{en ? (r.value === "campus_manager" ? "Full rights for the assigned campus." : r.value === "staff" ? "Access restricted by module." : r.value === "trainer" ? "Teaching and academic assignments." : "Academic coordination and supervision.") : r.description}</p>
                  </button>
                ))}
              </div>
            )}

            {role && (
              <div className="pt-3 border-t border-neutral-100 space-y-3">
                <p className="text-[10px] font-black uppercase text-neutral-400 mb-1.5">{en ? "Exact job title" : "Intitulé exact du poste"}</p>
                <TInput value={jobTitle} onChange={setJobTitle} placeholder={en ? "Example: Academic Manager, English Teacher..." : "Ex: Responsable Pédagogique, Prof. d'Anglais..."} />

                {needsTcfSubjects && (
                  <TcfSubjectsPicker
                    selected={selTcfSubjects}
                    onChange={setSelTcfSubjects}
                  />
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="h-11 px-4 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600">{en ? "Back" : "Retour"}</button>
              <button onClick={() => setStep(3)} disabled={!canStep3} className="flex-1 h-11 rounded-xl text-xs font-black uppercase text-white disabled:opacity-40" style={{ backgroundColor: BLUE }}>{en ? "Next" : "Suivant"}</button>
            </div>
          </div>
        )}

        {/* ─ ÉTAPE 3 : Campus + Permissions ─ */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{en ? "Assigned campuses" : "Campus assignés"}</p>
                <span className="text-[9px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-black uppercase">{en ? "Optional" : "Optionnel"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {campuses.map((c) => (
                  <button key={c.id} onClick={() => toggleCampus(c.id)} className={`flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold border transition-colors ${selCampuses.includes(c.id) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"}`}>
                    <MapPin size={11} /> {c.name}
                  </button>
                ))}
                {campuses.length === 0 && <p className="text-xs text-neutral-400 italic">{en ? "No campus created." : "Aucun campus créé."}</p>}
              </div>
            </div>

            {needsPermissions && (
              <div className="border-t border-neutral-100 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{en ? "Allowed modules" : "Modules autorisés"} <span className="text-orange-500">*</span></p>
                <p className="text-[10px] text-neutral-400 mb-2">{en ? "Menu access rights, not academic subjects." : "Droits d'écran, pas les matières (onglet Académique)."}</p>
                <PermissionsChecklist
                  selected={selPerms}
                  onToggle={(key) => {
                    if (key === "lives") return;
                    if (isTCF && key === "communaute") return;
                    setSelPerms((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);
                  }}
                  isTCF={isTCF}
                  compact
                />
              </div>
            )}

            {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="h-11 px-4 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600">{en ? "Back" : "Retour"}</button>
              <button onClick={handleSubmit} disabled={!canSubmit || saving} className="flex-1 h-11 rounded-xl text-xs font-black uppercase text-white flex items-center justify-center gap-2 disabled:opacity-40" style={{ backgroundColor: ORANGE }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {en ? "Create profile" : "Créer le profil"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ALERTE DIRECTEUR EN DOUBLE ───────────────────────────── */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-sm" style={{ color: BLUE }}>{en ? "Manager already assigned" : "Directeur déjà présent"}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {en ? <><strong>{duplicateWarning.campusName}</strong> already has a manager: <strong>{duplicateWarning.managerName}</strong>.<br />What would you like to do?</> : <><strong>{duplicateWarning.campusName}</strong> a déjà un directeur : <strong>{duplicateWarning.managerName}</strong>.<br />Que souhaitez-vous faire ?</>}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setSelCampuses((p) => [...p, duplicateWarning.campusId]); setDuplicateWarning(null); }}
                className="h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black uppercase hover:bg-amber-100 transition-colors"
              >
                {en ? "Add anyway" : "Ajouter quand même"}
              </button>
              <button onClick={() => setDuplicateWarning(null)} className="h-10 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-bold hover:bg-neutral-200 transition-colors">
                {en ? "Cancel" : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ════════════════════════════════════════════════════════════════════════════
const inputCls   = "w-full h-12 px-4 bg-white rounded-lg border border-black/[0.08] font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10 transition-colors";
const selectCls  = `${inputCls} cursor-pointer`;

function TInput({ value, onChange, placeholder = "", type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />;
}
function NumInput({
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value === null || Number.isNaN(value) ? "" : value}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") onChange(null);
        else onChange(Number(raw));
      }}
      min={min}
      max={max}
      className={inputCls}
    />
  );
}
function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm font-semibold text-neutral-600 block mb-1.5">{label}</label>{children}</div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-black/[0.06]" />
    </div>
  );
}
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">{title}</p>
      {children}
    </div>
  );
}
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="text-sm font-semibold mt-1" style={{ color: BLUE }}>{value}</p>
    </div>
  );
}
function PSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: BLUE }}>{title}</h3>
        <div className="flex-1 h-px bg-black/[0.06]" />
      </div>
      {children}
    </div>
  );
}
function PField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: BLUE }}>{value}</p>
    </div>
  );
}
