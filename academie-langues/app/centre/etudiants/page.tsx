"use client";

import { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef } from "react";
import {
  Users, Wallet, AlertTriangle, GraduationCap,
  Plus, X, Loader2, Edit3, Check, Download, FileText,
  Share2, Printer, Calendar, BookOpen,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { loadCenterBootstrap, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import { fetchCenterApi, clearCenterApiCache } from "@/app/utils/center-api-client";
import CenterContentSkeleton from "@/app/components/CenterContentSkeleton";
import CreateStudentModal from "@/app/components/centre/students/CreateStudentModal";
import StudentIdentityTab from "@/app/components/centre/students/StudentIdentityTab";
import StudentFinanceTab from "@/app/components/centre/students/StudentFinanceTab";
import PassageNiveauPanel from "@/app/components/centre/students/PassageNiveauPanel";
import BulletinDynamique from "@/app/components/BulletinDynamique";
import {
  passageDecisionLabelFr,
} from "@/app/utils/cursus-passage";
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
  SURFACE,
  PAGE_BG,
  AgentIaComingSoonButton,
} from "@/app/centre/center-page-ui";

// ─── types ───────────────────────────────────────────────────────────────────
type Enrollment = {
  id: string;
  filiere_id: string;
  filiere_name: string;
  filiere_name_raw: string;      // sans la partie "(X Mois)" pour le filtre
  niveau_id: string | null;
  niveau_annee: number | null;
  duration_label?: string | null;
  academic_year?: string | null;
  passage_decision?: string | null;
  passage_reason?: string | null;
  groupe_id: string | null;
  groupe_nom: string | null;
  tuition_fee: number;
  status: "draft" | "active" | "completed" | "cancelled";
  enrolled_at: string | null;
};

type StudentRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  birth_date: string | null;     // YYYY-MM-DD
  genre: string | null;
  center_status: "active" | "paused" | "revoked";
  enrollments: Enrollment[];
};

type FiliereMatiereRow = { id: string; matiere_name: string; formateurs: string[]; max_score: number; coefficient: number };
type GradeRow = { id: string; score: number; max_score: number; period_name: string | null; title: string | null; comment: string | null; created_at: string };
type Period    = { id: string; name: string };

type ExportStudentRow = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  filiere: string;
  statut: string;
};

type StatusFilter = "all" | "active" | "paused" | "revoked";

// ─── helper ──────────────────────────────────────────────────────────────────
function fmtBirth(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}/${m}/${d}`;
}
function calcAge(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const age  = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return isNaN(age) || age < 0 ? "" : `${age} ans`;
}

function statusLabelFr(st: StudentRow["center_status"]) {
  return st === "active" ? "Actif" : st === "paused" ? "Suspendu" : "Révoqué";
}

function toStudentExportRows(list: StudentRow[]): ExportStudentRow[] {
  return list.map((s) => ({
    nom: s.nom,
    prenom: s.prenom,
    email: s.email || "",
    telephone: s.phone || "",
    filiere: s.enrollments[0]?.filiere_name_raw || "",
    statut: statusLabelFr(s.center_status),
  }));
}

function studentsFilterCaption(
  search: string,
  filiereName: string | null,
  statusFilter: StatusFilter,
  count: number,
) {
  const statusPart =
    statusFilter === "all" ? "Tous statuts"
    : statusFilter === "active" ? "Actifs"
    : statusFilter === "paused" ? "Suspendus"
    : "Révoqués";
  const parts = [
    filiereName ? `Filière: ${filiereName}` : "Toutes filières",
    statusPart,
  ];
  const q = search.trim();
  if (q) parts.push(`Recherche: ${q}`);
  parts.push(`${count} ligne${count > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

function studentsCsvFilename() {
  return `apprenants-${new Date().toISOString().slice(0, 10)}.csv`;
}
function studentsPdfFilename() {
  return `apprenants-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function downloadStudentsCsv(rows: ExportStudentRow[]) {
  const header = ["Nom", "Prénom", "Email", "Téléphone", "Filière", "Statut"];
  const lines = [
    header,
    ...rows.map((r) => [r.nom, r.prenom, r.email, r.telephone, r.filiere, r.statut]),
  ];
  const csv = lines
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = studentsCsvFilename();
  a.click();
  URL.revokeObjectURL(url);
}

async function buildStudentsPdfDoc(rows: ExportStudentRow[], filterCaption: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const blue: [number, number, number] = [17, 34, 78];

  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Apprenants", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Filtre: ${filterCaption}`, 14, 25, { maxWidth: pageWidth - 28 });
  doc.text(`Genere le ${new Date().toLocaleString("fr-FR")}`, 14, 31);

  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(14, 35, pageWidth - 14, 35);

  autoTable(doc, {
    startY: 40,
    head: [["Nom", "Prenom", "Email", "Telephone", "Filiere", "Statut"]],
    body: rows.map((r) => [r.nom, r.prenom, r.email, r.telephone, r.filiere, r.statut]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak", textColor: [40, 40, 40] },
    headStyles: { fillColor: blue, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    margin: { left: 14, right: 14 },
  });

  return doc;
}

async function downloadStudentsPdf(rows: ExportStudentRow[], filterCaption: string) {
  const doc = await buildStudentsPdfDoc(rows, filterCaption);
  doc.save(studentsPdfFilename());
}

async function silentDownloadStudentsPdf(rows: ExportStudentRow[], filterCaption: string) {
  const doc = await buildStudentsPdfDoc(rows, filterCaption);
  const filename = studentsPdfFilename();
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
export default function CenterStudentsPage() {
  const [students,           setStudents]           = useState<StudentRow[]>([]);
  const [shellLoading,       setShellLoading]       = useState(true);
  const [dataLoading,        setDataLoading]        = useState(true);
  const [search,             setSearch]             = useState("");
  const [centerId,           setCenterId]           = useState<string | null>(null);
  const [userId,             setUserId]             = useState<string | null>(null);
  const [filiereFilter,      setFiliereFilter]      = useState<string | null>(null);
  const [statusFilter,       setStatusFilter]       = useState<StatusFilter>("all");
  const [selectedStudentId,  setSelectedStudentId]  = useState<string | null>(null);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [activeTab,          setActiveTab]          = useState<"identity" | "grades" | "finance">("identity");
  const [showCreateModal,    setShowCreateModal]    = useState(false);
  const [viewingStudent,     setViewingStudent]     = useState<StudentRow | null>(null);
  const [activating,         setActivating]         = useState(false);
  const [shareBusy,          setShareBusy]          = useState(false);
  const [waPhoneOpen,        setWaPhoneOpen]        = useState(false);
  const [waPhone,            setWaPhone]            = useState("");
  const [identityEditTrigger, setIdentityEditTrigger] = useState(0);

  const selectedStudent   = students.find((s) => s.id === selectedStudentId) ?? null;
  const selectedEnrollment = selectedStudent?.enrollments.find((e) => e.id === selectedEnrollmentId) ?? null;

  // ── load ─────────────────────────────────────────────────────────────────
  const loadStudents = useCallback(async (cId: string, options?: { silent?: boolean; force?: boolean }) => {
    if (!options?.silent) setDataLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStudents([]);
        return;
      }

      const data = await fetchCenterApi<{ students: StudentRow[] }>(
        "/api/center/enrollments-list",
        session.access_token,
        options?.force ? { force: true } : undefined,
      );
      setStudents(data.students || []);
    } catch (err) {
      console.error("loadStudents:", err);
      setStudents([]);
    } finally {
      if (!options?.silent) setDataLoading(false);
    }
  }, []);

  useLayoutEffect(() => {
    const bootstrap = peekCenterBootstrap();
    if (!bootstrap) return;
    setUserId(bootstrap.userId);
    setCenterId(bootstrap.centerId);
    setShellLoading(false);
    void loadStudents(bootstrap.centerId);
  }, [loadStudents]);

  useEffect(() => {
    (async () => {
      const hadCache = Boolean(peekCenterBootstrap());
      const bootstrap = await loadCenterBootstrap();
      if (!bootstrap) {
        setShellLoading(false);
        setDataLoading(false);
        return;
      }
      setUserId(bootstrap.userId);
      setCenterId(bootstrap.centerId);
      setShellLoading(false);
      if (!hadCache) void loadStudents(bootstrap.centerId);
    })();
  }, [loadStudents]);

  // ── stats ─────────────────────────────────────────────────────────────────
  const filiereStats = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    students.forEach((s) => {
      const seen = new Set<string>();
      s.enrollments.forEach((e) => {
        if (!seen.has(e.filiere_id)) {
          seen.add(e.filiere_id);
          if (!map[e.filiere_id]) map[e.filiere_id] = { name: e.filiere_name_raw, count: 0 };
          map[e.filiere_id].count++;
        }
      });
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [students]);

  const rosterStats = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.center_status === "active").length,
    paused: students.filter((s) => s.center_status === "paused").length,
    filieres: filiereStats.length,
  }), [students, filiereStats]);

  // ── actions ───────────────────────────────────────────────────────────────
  const selectStudent = (s: StudentRow) => {
    setSelectedStudentId(s.id);
    setSelectedEnrollmentId(s.enrollments[0]?.id ?? null);
    setActiveTab("identity");
  };

  const toggleStatus = async (id: string, st: "active" | "paused" | "revoked") => {
    await supabase.from("profiles").update({ center_status: st }).eq("id", id);
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, center_status: st } : s)));
  };

  const activateEnrollment = async (enrollmentId: string) => {
    if (!centerId) return;
    setActivating(true);
    const { error } = await supabase.from("enrollments").update({ status: "active" }).eq("id", enrollmentId);
    if (error) alert("Erreur : " + error.message);
    else await loadStudents(centerId, { silent: true, force: true });
    clearCenterApiCache("/api/center/enrollments-list");
    setActivating(false);
  };

  const revokeStudent = async (studentId: string) => {
    if (!confirm("Révoquer cet apprenant ? Il n'aura plus accès au centre.")) return;
    await toggleStatus(studentId, "revoked");
  };

  const handleAvatarUpdated = (url: string) => {
    setStudents((prev) => prev.map((s) => (s.id === selectedStudentId ? { ...s, avatar_url: url } : s)));
  };

  if (shellLoading) return null;

  if (dataLoading) {
    return (
      <CenterPageLayout
        header={
          <CenterPageHeader
            title="Apprenants"
            actions={
              <>
                <OutlineHeaderButton disabled>
                  <Share2 size={15} /> Partager
                </OutlineHeaderButton>
                <AgentIaComingSoonButton />
                <OutlineHeaderButton disabled>
                  <Plus size={15} strokeWidth={2.25} /> Créer
                </OutlineHeaderButton>
              </>
            }
          />
        }
      >
        <CenterContentSkeleton variant="students-panel" />
      </CenterPageLayout>
    );
  }

  const filtered = students.filter((s) => {
    const matchSearch   = !search || `${s.prenom} ${s.nom} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    const matchFiliere  = !filiereFilter || s.enrollments.some((e) => e.filiere_id === filiereFilter);
    const matchStatus   = statusFilter === "all" || s.center_status === statusFilter;
    return matchSearch && matchFiliere && matchStatus;
  });

  const exportRows = toStudentExportRows(filtered);
  const canExport = exportRows.length > 0;
  const filiereFilterName = filiereFilter
    ? (filiereStats.find(([id]) => id === filiereFilter)?.[1].name ?? null)
    : null;
  const filterCaption = studentsFilterCaption(search, filiereFilterName, statusFilter, exportRows.length);

  const sendWhatsAppPdf = async () => {
    if (!canExport) return;
    setShareBusy(true);
    try {
      const filename = await silentDownloadStudentsPdf(exportRows, filterCaption);
      openWhatsApp(
        `Liste des apprenants Nexa (${exportRows.length}). PDF pret a joindre: ${filename}`,
        waPhone,
      );
      setWaPhoneOpen(false);
      setWaPhone("");
    } finally {
      setShareBusy(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <CenterPageLayout
      header={
        selectedStudent ? (
          <header
            className="shrink-0 min-h-[68px] border-b border-black/[0.06] z-30"
            style={{ backgroundColor: PAGE_BG }}
          >
            <div className="nexa-center-shell h-full min-h-[68px] py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackButton
                  onClick={() => {
                    setSelectedStudentId(null);
                    setSelectedEnrollmentId(null);
                  }}
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400 leading-none mb-1">
                    Modifier le dossier
                  </p>
                  <h1
                    className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight truncate"
                    style={{ color: BLUE }}
                  >
                    {selectedStudent.prenom} {selectedStudent.nom}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap justify-end">
                {([
                  { key: "identity" as const, label: "Dossier",  icon: Users,          disabled: false },
                  { key: "finance"  as const, label: "Finance",  icon: Wallet,         disabled: !selectedEnrollment || selectedEnrollment.status === "draft" },
                  { key: "grades"   as const, label: "Notes",    icon: GraduationCap,  disabled: !selectedEnrollment || selectedEnrollment.status === "draft" },
                ]).map(({ key, label, icon: Icon, disabled }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    disabled={disabled}
                    className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors disabled:opacity-30 ${
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

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("identity");
                    setIdentityEditTrigger((n) => n + 1);
                  }}
                  className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors"
                >
                  <Edit3 size={12} /> Modifier
                </button>
                <button
                  type="button"
                  onClick={() => toggleStatus(
                    selectedStudent.id,
                    selectedStudent.center_status === "active" ? "paused" : "active",
                  )}
                  className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 hover:bg-black/[0.03] transition-colors"
                >
                  {selectedStudent.center_status === "active" ? "Suspendre" : "Réactiver"}
                </button>
                {selectedStudent.center_status !== "revoked" && (
                  <button
                    type="button"
                    onClick={() => void revokeStudent(selectedStudent.id)}
                    className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 hover:bg-black/[0.03] transition-colors"
                  >
                    Révoqué
                  </button>
                )}
              </div>
            </div>
          </header>
        ) : (
          <CenterPageHeader
            title="Apprenants"
            actions={
              <>
                <ApprenantsShareMenu
                  disabled={!canExport}
                  busy={shareBusy}
                  onCsv={() => {
                    if (!canExport) return;
                    downloadStudentsCsv(exportRows);
                  }}
                  onPdf={async () => {
                    if (!canExport) return;
                    setShareBusy(true);
                    try {
                      await downloadStudentsPdf(exportRows, filterCaption);
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
                <OutlineHeaderButton onClick={() => setShowCreateModal(true)}>
                  <Plus size={15} strokeWidth={2.25} />
                  <span className="hidden sm:inline">Créer un apprenant</span>
                  <span className="sm:hidden">Créer</span>
                </OutlineHeaderButton>
              </>
            }
          />
        )
      }
    >
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedStudent ? (
            <CenterPageBody>
              <CenterToolbar
                stats={
                  <span
                    className="inline-flex flex-wrap items-center rounded-lg border border-black/[0.06] px-3 py-1.5"
                    style={{ backgroundColor: SURFACE }}
                  >
                    <span className="font-bold">{rosterStats.total}</span> inscrit{rosterStats.total > 1 ? "s" : ""}
                    <StatSep />
                    <span className="font-semibold">{rosterStats.active} actif{rosterStats.active > 1 ? "s" : ""}</span>
                    <StatSep />
                    <span className="font-semibold text-amber-700">{rosterStats.paused} suspendu{rosterStats.paused > 1 ? "s" : ""}</span>
                    <StatSep />
                    <span className="font-semibold">{rosterStats.filieres} filière{rosterStats.filieres > 1 ? "s" : ""}</span>
                  </span>
                }
              >
                <ToolbarSearch value={search} onChange={setSearch} placeholder="Rechercher…" />
                <ToolbarSelect
                  label="Filtrer par statut"
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as StatusFilter)}
                  minWidth="7.5rem"
                  options={[
                    { value: "all", label: "Tous statuts" },
                    { value: "active", label: "Actifs" },
                    { value: "paused", label: "Suspendus" },
                    { value: "revoked", label: "Révoqués" },
                  ]}
                />
                <ToolbarSelect
                  label="Filtrer par filière"
                  value={filiereFilter ?? "all"}
                  onChange={(v) => setFiliereFilter(v === "all" ? null : v)}
                  minWidth="10rem"
                  options={[
                    { value: "all", label: "Toutes filières" },
                    ...filiereStats.map(([id, { name, count }]) => ({
                      value: id,
                      label: `${name} (${count})`,
                    })),
                  ]}
                />
              </CenterToolbar>

              {filtered.length === 0 ? (
                <EmptyState
                  title="Aucun apprenant trouvé"
                  hint="Modifiez la recherche ou les filtres."
                  action={
                    <OutlineHeaderButton
                      className="mt-5 mx-auto"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setFiliereFilter(null);
                      }}
                    >
                      Réinitialiser les filtres
                    </OutlineHeaderButton>
                  }
                />
              ) : (
                <CenterDataTable
                  columns={["Nom", "Filière", "Statut", "Inscription", "Actions"]}
                  columnWidths={[undefined, "18%", "14%", "16%", "10.75rem"]}
                >
                  {filtered.map((s, i) => {
                    const primaryEnr = s.enrollments[0];
                    const hasDraft = s.enrollments.some((e) => e.status === "draft");
                    const statusLabel =
                      s.center_status === "active" || !s.center_status ? "Actif"
                      : s.center_status === "paused" ? "Suspendu"
                      : "Révoqué";
                    const enrStatus = hasDraft ? "Brouillon" : primaryEnr?.status === "active" ? "Active" : primaryEnr ? "Inscrit" : "—";

                    return (
                      <CenterTableRow key={s.id} index={i}>
                        <td className="px-4 py-3.5 min-w-0 print:break-inside-avoid">
                          <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: BLUE }}>
                            {s.prenom} {s.nom}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate">{s.email || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] font-medium text-neutral-600">
                          {primaryEnr?.filiere_name_raw || "—"}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`text-[12px] font-semibold ${
                            hasDraft || (s.center_status && s.center_status !== "active") ? "text-red-600" : "text-neutral-600"
                          }`}>
                            {hasDraft ? "Brouillon" : statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[12px] font-medium text-neutral-700">
                          {enrStatus}
                        </td>
                        <TableActions>
                          <span className="print:hidden inline-flex items-center gap-1">
                            <TableBtnPreview onClick={() => setViewingStudent(s)} />
                            <TableBtnModify onClick={() => selectStudent(s)} />
                          </span>
                        </TableActions>
                      </CenterTableRow>
                    );
                  })}
                </CenterDataTable>
              )}
            </CenterPageBody>
          ) : (
            /* ══ DOSSIER — contenu (actions dans la sticky bar) ══ */
            <div className="nexa-center-shell pt-4 sm:pt-6 pb-8" style={{ backgroundColor: PAGE_BG }}>
              {(selectedStudent.enrollments.length > 1 || selectedEnrollment?.status === "draft") && (
                <div className="mb-4 space-y-3">
                  {selectedStudent.enrollments.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStudent.enrollments.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelectedEnrollmentId(e.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            selectedEnrollmentId === e.id
                              ? "border-transparent text-white"
                              : "border-black/[0.08] bg-white text-neutral-600 hover:bg-black/[0.03]"
                          }`}
                          style={selectedEnrollmentId === e.id ? { backgroundColor: BLUE } : undefined}
                        >
                          {e.filiere_name_raw}{e.status === "draft" ? " (Brouillon)" : ""}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedEnrollment?.status === "draft" && (
                    <div className="bg-white border border-black/[0.08] rounded-lg p-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertTriangle className="text-neutral-500 shrink-0 mt-0.5" size={15} />
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">Inscription en attente</p>
                          <p className="text-xs text-neutral-500 mt-0.5">Activez le dossier pour débloquer la scolarité.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => activateEnrollment(selectedEnrollment.id)}
                        disabled={activating}
                        className="h-9 px-4 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-1.5 shrink-0 hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: BLUE }}
                      >
                        {activating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Valider
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mx-auto max-w-5xl">
                {activeTab === "identity" && (
                  <StudentIdentityTab
                    studentId={selectedStudent.id}
                    enrollmentId={selectedEnrollment?.id}
                    studentName={`${selectedStudent.prenom} ${selectedStudent.nom}`}
                    studentEmail={selectedStudent.email}
                    studentPhone={selectedStudent.phone}
                    avatarUrl={selectedStudent.avatar_url}
                    enrollmentInfo={selectedEnrollment ? {
                      filiere_id: selectedEnrollment.filiere_id,
                      filiere_name: selectedEnrollment.filiere_name,
                      niveau_id: selectedEnrollment.niveau_id,
                      niveau_annee: selectedEnrollment.niveau_annee,
                      duration_label: selectedEnrollment.duration_label ?? null,
                      academic_year: selectedEnrollment.academic_year ?? null,
                      passage_decision: selectedEnrollment.passage_decision ?? null,
                      passage_reason: selectedEnrollment.passage_reason ?? null,
                      groupe_id: selectedEnrollment.groupe_id,
                      groupe_nom:   selectedEnrollment.groupe_nom,
                      enrolled_at:  selectedEnrollment.enrolled_at,
                      status:       selectedEnrollment.status,
                    } : null}
                    centerId={centerId!}
                    onAvatarUpdated={handleAvatarUpdated}
                    onEnrollmentUpdated={() => loadStudents(centerId!, { force: true })}
                    editTrigger={identityEditTrigger}
                  />
                )}
                {activeTab === "finance" && selectedEnrollment && (
                  <StudentFinanceTab
                    enrollmentId={selectedEnrollment.id}
                    tuitionFee={selectedEnrollment.tuition_fee}
                    centerId={centerId!}
                    studentName={`${selectedStudent.prenom} ${selectedStudent.nom}`}
                    filiereName={selectedEnrollment.filiere_name_raw || selectedEnrollment.filiere_name}
                    onPaid={() => loadStudents(centerId!)}
                  />
                )}
                {activeTab === "grades" && selectedEnrollment && (
                  <GradesTab
                    enrollment={selectedEnrollment}
                    userId={userId!}
                    onPassageDone={() => loadStudents(centerId!, { force: true })}
                  />
                )}
              </div>
            </div>
          )}
        </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateStudentModal
          centerId={centerId!}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => { setShowCreateModal(false); await loadStudents(centerId!, { force: true }); }}
        />
      )}
      {viewingStudent && (
        <StudentViewModal
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
          onOpenDossier={() => {
            const s = viewingStudent;
            setViewingStudent(null);
            selectStudent(s);
          }}
        />
      )}
      {waPhoneOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !shareBusy && setWaPhoneOpen(false)}>
          <div
            className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-black/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>WhatsApp (PDF)</h3>
              <button type="button" onClick={() => setWaPhoneOpen(false)} className="text-neutral-400 hover:text-neutral-700" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <p className="text-[12px] text-neutral-500 font-medium mb-3 leading-relaxed">
              Le PDF de la liste filtrée est préparé dans l&apos;app, puis WhatsApp s&apos;ouvre pour ce numéro. Joignez ensuite le fichier téléchargé.
            </p>
            <label className="block text-sm font-semibold text-neutral-600 mb-1.5">Numéro (indicatif pays)</label>
            <input
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              placeholder="ex. 2376XXXXXXXX"
              inputMode="tel"
              className="w-full h-12 px-4 rounded-lg border border-black/[0.08] bg-white text-base font-semibold outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
              style={{ backgroundColor: SURFACE }}
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setWaPhoneOpen(false)}
                disabled={shareBusy}
                className="flex-1 h-10 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void sendWhatsAppPdf()}
                disabled={shareBusy || !waPhone.replace(/\D/g, "")}
                className="flex-1 h-10 rounded-lg text-xs font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {shareBusy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                Ouvrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </CenterPageLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// APERÇU (lecture seule — modèle Programmes)
// ════════════════════════════════════════════════════════════════════════════
function StudentViewModal({
  student,
  onClose,
  onOpenDossier,
}: {
  student: StudentRow;
  onClose: () => void;
  onOpenDossier: () => void;
}) {
  const primary = student.enrollments[0];
  const statusLabel =
    student.center_status === "active" ? "Actif"
    : student.center_status === "paused" ? "Suspendu"
    : "Révoqué";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-6 md:p-7 max-w-2xl w-full shadow-2xl relative my-8 border border-black/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-black" aria-label="Fermer">
          <X size={20} />
        </button>
        <h3 className="text-lg font-black mb-5" style={{ color: BLUE }}>Aperçu de l&apos;apprenant</h3>

        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="shrink-0">
              {student.avatar_url ? (
                <img
                  src={student.avatar_url}
                  alt={`${student.prenom} ${student.nom}`}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover ring-2 ring-white shadow-md border border-black/[0.06]"
                />
              ) : (
                <div
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md"
                  style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1a3568 100%)` }}
                >
                  {student.prenom?.[0] ?? "?"}{student.nom?.[0] ?? ""}
                </div>
              )}
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h4 className="text-2xl font-black tracking-tight" style={{ color: BLUE }}>
                {student.prenom} {student.nom}
              </h4>
              <p className="text-sm text-neutral-500 mt-1 font-medium">{statusLabel}</p>
              <p className="text-sm text-neutral-500 mt-2 font-medium truncate">{student.email || "—"}</p>
              {student.phone && (
                <p className="text-sm text-neutral-500 font-medium">{student.phone}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <PreviewInfoBox
              icon={Calendar}
              label="Âge"
              value={student.birth_date ? `${calcAge(student.birth_date)} · ${fmtBirth(student.birth_date)}` : "—"}
            />
            <PreviewInfoBox
              icon={Users}
              label="Genre"
              value={
                student.genre === "Homme" ? "Garçon / Homme"
                : student.genre === "Femme" ? "Fille / Femme"
                : student.genre === "Autre" ? "Autre"
                : "—"
              }
            />
            <PreviewInfoBox
              icon={Users}
              label="Classe"
              value={primary?.groupe_nom || "—"}
            />
          </div>

          {primary && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
                <BookOpen size={12} /> Programme
              </p>
              <div className="rounded-2xl border border-neutral-200 p-4 space-y-2">
                <p className="text-sm font-bold text-neutral-800">{primary.filiere_name_raw}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 font-medium">
                  {primary.niveau_annee != null && <span>Niveau {primary.niveau_annee}</span>}
                  {primary.duration_label && <span>{primary.duration_label}</span>}
                  {primary.academic_year && <span>{primary.academic_year}</span>}
                  {primary.passage_decision && (
                    <span>Passage : {passageDecisionLabelFr(primary.passage_decision)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-xs font-semibold bg-neutral-100 text-neutral-600"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={onOpenDossier}
              className="flex-1 h-11 rounded-xl text-xs font-black uppercase text-white inline-flex items-center justify-center gap-1.5"
              style={{ backgroundColor: BLUE }}
            >
              <Edit3 size={14} /> Ouvrir le dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewInfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
        <Icon size={10} /> {label}
      </p>
      <p className="font-black text-sm mt-1 truncate" style={{ color: BLUE }}>{value}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AVATAR
// ════════════════════════════════════════════════════════════════════════════
function StudentAvatar({ s, selected = false, size = "md" }: { s: StudentRow; selected?: boolean; size?: "sm" | "md" | "lg" }) {
  const dim    = size === "sm" ? "w-10 h-10 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";
  const radius = size === "lg" ? "rounded-2xl" : "rounded-xl";
  if (s.avatar_url) {
    return (
      <img
        src={s.avatar_url}
        alt=""
        className={`${dim} ${radius} object-cover shrink-0 ring-2 ring-white shadow-sm`}
      />
    );
  }
  return (
    <div
      className={`${dim} ${radius} flex items-center justify-center font-black shrink-0 text-white shadow-sm ring-2 ring-white`}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${ORANGE} 0%, #c95508 100%)`
          : `linear-gradient(135deg, ${BLUE} 0%, #1a3568 100%)`,
      }}
    >
      {s.prenom?.[0] ?? "?"}{s.nom?.[0] ?? ""}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PARTAGER (liste filtrée)
// ════════════════════════════════════════════════════════════════════════════
function ApprenantsShareMenu({
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
        <span className="hidden sm:inline">Partager</span>
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

// ════════════════════════════════════════════════════════════════════════════
// ONGLET NOTES
// ════════════════════════════════════════════════════════════════════════════
function GradesTab({
  enrollment,
  userId,
  onPassageDone,
}: {
  enrollment: Enrollment;
  userId: string;
  onPassageDone?: () => void;
}) {
  const [matieres,       setMatieres]       = useState<FiliereMatiereRow[]>([]);
  const [gradesByMatiere, setGradesByMatiere] = useState<Record<string, GradeRow[]>>({});
  const [periods,        setPeriods]        = useState<Period[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [addingFor,      setAddingFor]      = useState<string | null>(null);
  const [score,          setScore]          = useState("");
  const [title,          setTitle]          = useState("");
  const [periodId,       setPeriodId]       = useState("");
  const [comment,        setComment]        = useState("");
  const [error,          setError]          = useState("");
  const [showBulletin,   setShowBulletin]   = useState(false);

  const FIELD_LABEL = "text-sm font-semibold text-neutral-600 block mb-1.5";
  const FIELD_INPUT =
    "w-full h-11 px-3 rounded-lg border border-black/[0.08] bg-white font-semibold text-sm outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";

  const load = useCallback(async () => {
    setLoading(true);
    const { data: fmRows } = await supabase
      .from("filiere_matieres")
      .select("id, coefficient, max_score, exam_disciplines(name), matiere_formateurs(profiles(prenom))")
      .eq("filiere_id", enrollment.filiere_id)
      .eq("niveau_id", enrollment.niveau_id);

    const list: FiliereMatiereRow[] = (fmRows ?? []).map((m: any) => ({
      id: m.id,
      matiere_name: m.exam_disciplines?.name || "—",
      formateurs: (m.matiere_formateurs ?? []).map((mf: any) => mf.profiles?.prenom).filter(Boolean),
      max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
      coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
    }));
    setMatieres(list);

    if (list.length > 0) {
      const { data: gradeRows } = await supabase
        .from("grades")
        .select("id, filiere_matiere_id, score, max_score, title, comment, created_at, grade_periods(name)")
        .eq("enrollment_id", enrollment.id);
      const grouped: Record<string, GradeRow[]> = {};
      for (const g of gradeRows ?? []) {
        const key = (g as any).filiere_matiere_id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          id: g.id,
          score: g.score,
          max_score: g.max_score,
          title: (g as any).title ?? null,
          period_name: (g as any).grade_periods?.name ?? null,
          comment: g.comment,
          created_at: g.created_at,
        });
      }
      setGradesByMatiere(grouped);
    }
    const { data: periodRows } = await supabase.from("grade_periods").select("id, name").order("starts_at", { ascending: false });
    setPeriods(periodRows ?? []);
    setLoading(false);
  }, [enrollment]);

  useEffect(() => { load(); }, [load]);

  const submitGrade = async (filiereMatiereId: string) => {
    setError("");
    const matiere = matieres.find((m) => m.id === filiereMatiereId);
    const bareme = matiere?.max_score || 20;
    const num = parseFloat(score);
    if (isNaN(num) || num < 0) return setError("Note invalide.");
    if (num > bareme) return setError(`Note supérieure au barème /${bareme}.`);
    const titleTrim = title.trim();
    const { error: insErr } = await supabase.from("grades").insert({
      enrollment_id: enrollment.id,
      filiere_matiere_id: filiereMatiereId,
      period_id: periodId || null,
      formateur_id: userId,
      score: num,
      max_score: bareme,
      title: titleTrim || null,
      comment: comment.trim() || null,
    });
    if (insErr) return setError(insErr.message.includes("policy") ? "Vous n'êtes pas habilité à noter cette matière." : insErr.message);
    setAddingFor(null); setScore(""); setComment(""); setPeriodId(""); setTitle("");
    await load();
  };

  if (loading) return <p className="text-sm text-neutral-400 p-8">Chargement des notes…</p>;

  return (
    <div className="w-full">
      {enrollment.niveau_annee != null && (
        <PassageNiveauPanel
          enrollmentId={enrollment.id}
          onDone={() => { onPassageDone?.(); }}
        />
      )}

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] gap-5 sm:gap-8 py-8 border-b border-black/[0.06] first:pt-2 last:border-b-0">
        <div className="lg:sticky lg:top-4 self-start min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.06]"
              style={{ backgroundColor: SURFACE }}
            >
              <GraduationCap size={18} style={{ color: BLUE }} />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: BLUE }}>
              Notes & bulletin
            </h2>
          </div>
          <p className="text-sm text-neutral-500 mt-3 leading-relaxed font-medium">
            Saisie des notes par matière. Le bulletin s&apos;adapte aux périodes du centre
            {enrollment.academic_year ? ` · ${enrollment.academic_year}` : ""}.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowBulletin(true)}
              className="h-9 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90"
              style={{ backgroundColor: BLUE }}
            >
              <Printer size={12} /> Bulletin
            </button>
          </div>
        </div>

        <div className="space-y-4 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6" style={{ backgroundColor: SURFACE }}>
          {matieres.length === 0 && (
            <p className="text-sm text-neutral-400 font-medium italic py-4">
              Aucune matière configurée pour ce niveau.
            </p>
          )}

          {matieres.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-black/[0.06] bg-white p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold tracking-tight" style={{ color: BLUE }}>
                    {m.matiere_name}
                  </p>
                  <p className="text-xs text-neutral-500 font-medium mt-0.5">
                    /{m.max_score} · ×{m.coefficient}
                    {m.formateurs.length > 0 ? ` · ${m.formateurs.join(", ")}` : " · Aucun formateur"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddingFor(addingFor === m.id ? null : m.id)}
                  className="h-9 w-9 rounded-lg border border-black/[0.08] inline-flex items-center justify-center hover:bg-black/[0.03] shrink-0"
                  style={{ color: ORANGE }}
                  aria-label="Ajouter une note"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="divide-y divide-black/[0.05]">
                {(gradesByMatiere[m.id] ?? []).map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-neutral-600 font-medium min-w-0">
                      {g.period_name || "Sans période"}
                      {g.title ? ` · ${g.title}` : " · Note principale"}
                      {g.comment ? ` · ${g.comment}` : ""}
                    </span>
                    <span className="font-extrabold text-emerald-700 shrink-0">
                      {g.score}/{g.max_score}
                    </span>
                  </div>
                ))}
              </div>
              {!gradesByMatiere[m.id]?.length && (
                <p className="text-xs text-neutral-400 font-medium italic py-1">Aucune note.</p>
              )}

              {addingFor === m.id && (
                <div className="mt-4 pt-4 border-t border-black/[0.06] space-y-3">
                  <div>
                    <label className={FIELD_LABEL}>Intitulé</label>
                    <input
                      placeholder="Vide = note principale · ex. Devoir 1"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className={FIELD_INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={FIELD_LABEL}>Note /{m.max_score}</label>
                      <input
                        type="number"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Période</label>
                      <select
                        value={periodId}
                        onChange={(e) => setPeriodId(e.target.value)}
                        className={FIELD_INPUT}
                      >
                        <option value="">Sans période</option>
                        {periods.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={FIELD_LABEL}>Appréciation (optionnel)</label>
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className={FIELD_INPUT}
                    />
                  </div>
                  {error && (
                    <p className="text-sm font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void submitGrade(m.id)}
                    className="h-10 px-4 rounded-lg text-sm font-semibold text-white hover:opacity-90"
                    style={{ backgroundColor: ORANGE }}
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {showBulletin && (
        <BulletinDynamique
          enrollmentId={enrollment.id}
          enrollmentLabel={enrollment.filiere_name_raw || enrollment.filiere_name}
          niveauAnnee={enrollment.niveau_annee}
          academicYear={enrollment.academic_year ?? null}
          onClose={() => setShowBulletin(false)}
        />
      )}
    </div>
  );
}
