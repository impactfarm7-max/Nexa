"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Clock, BookOpen, Trash2, X, Loader2, AlertTriangle, Layers, Tag,
  MapPin, CheckCircle2, PartyPopper, Share2, FileText, Download, Filter, ChevronDown, Check,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  BLUE,
  ORANGE,
  SURFACE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
  CenterToolbar,
  StatSep,
  ToolbarSearch,
  CenterDataTable,
  CenterTableRow,
  TableBtnPreview,
  TableBtnModify,
  TableActions,
  EmptyState,
  OutlineHeaderButton,
  AgentIaComingSoonButton,
} from "../center-page-ui";
import { fetchDocumentExportConfig, type DocumentExportConfig } from "@/app/utils/documentConfig";
import { useI18n } from "@/app/i18n/I18nProvider";
import { ACTION_TONE } from "@/app/utils/action-tones";

const fcfa = (n: number | null | undefined, locale: "fr" | "en" = "fr") => (Number(n) || 0).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB") + " FCFA";

/** Affichage seul (UI / PDF / CSV) — la valeur en base reste inchangée. */
function displayProgrammeName(name: string | null | undefined) {
  return (name || "").toLocaleUpperCase("fr-FR");
}

type ProgrammeCard = {
  id: string;
  name: string;
  description: string | null;
  type: "cursus" | "formation_courte";
  mode: string | null;
  created_at: string;
  nb_niveaux: number | null;
  duree_valeur: number | null;
  duree_unite: string | null;
  status: "draft" | "published";
  default_tuition_fee: number | null;
  pricing_mode: "mensuel" | "forfaitaire" | null;
  matieres_count: number;
  matiere_names: string[];
  campus_names: string[];
};

type StatusFilter = "all" | "published" | "draft";
type TypeFilter = "all" | "cursus" | "formation_courte";

const MODE_LABEL: Record<string, string> = {
  presentiel: "Présentiel",
  en_ligne: "En ligne",
  hybride: "Hybride",
};

function structureLabel(p: ProgrammeCard, locale: "fr" | "en" = "fr", t?: (namespace: "centre", key: string, params?: Record<string, string | number>) => string) {
  if (p.type === "cursus") {
    const count = p.nb_niveaux || 1;
    return t ? t("centre", count > 1 ? "programsLevelMany" : "programsLevelOne", { count }) : `${count} niveau${count > 1 ? "x" : ""}`;
  }
  const unit = locale === "en"
    ? ({ jours: "days", semaines: "weeks", mois: "months", jour: "day", semaine: "week", month: "months" }[p.duree_unite || ""] || p.duree_unite || "")
    : (p.duree_unite || "");
  return `${p.duree_valeur || 0} ${unit}`.trim();
}

function priceLabel(p: ProgrammeCard, locale: "fr" | "en" = "fr", t?: (namespace: "centre", key: string, params?: Record<string, string | number>) => string) {
  const amount = fcfa(p.default_tuition_fee, locale);
  if (p.type !== "formation_courte") return amount;
  if (p.pricing_mode === "mensuel") return t ? t("centre", "programsPerMonth", { amount }) : `${amount} / mois`;
  return amount;
}

type ExportRow = { nom: string; type: string; statut: string; prix: string; structure: string };

/** Montants PDF/CSV : espaces ASCII uniquement (fr-FR / NNBSP → barres dans Helvetica jsPDF). */
function fcfaExport(n: number | null | undefined) {
  const v = Math.round(Number(n) || 0);
  const grouped = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${v < 0 ? "-" : ""}${grouped} FCFA`;
}

function priceLabelExport(p: ProgrammeCard, locale: "fr" | "en") {
  const amount = fcfaExport(p.default_tuition_fee);
  if (p.type !== "formation_courte") return amount;
  if (p.pricing_mode === "mensuel") return `${amount} / ${locale === "en" ? "month" : "mois"}`;
  return amount;
}

function toExportRows(list: ProgrammeCard[], locale: "fr" | "en"): ExportRow[] {
  return list.map((p) => ({
    nom: displayProgrammeName(p.name),
    type: p.type === "cursus" ? (locale === "en" ? "Curriculum" : "Cursus") : (locale === "en" ? "Short course" : "Formation courte"),
    statut: p.status === "published" ? (locale === "en" ? "Published" : "Publié") : (locale === "en" ? "Draft" : "Brouillon"),
    prix: priceLabelExport(p, locale),
    structure: structureLabel(p, locale),
  }));
}

function programmesFilterCaption(
  statusFilter: StatusFilter,
  typeFilter: TypeFilter,
  query: string,
  count: number,
  locale: "fr" | "en",
) {
  const isEn = locale === "en";
  const status =
    statusFilter === "all" ? (isEn ? "All programs" : "Tous programmes")
    : statusFilter === "published" ? (isEn ? "Published" : "Publiés")
    : (isEn ? "Drafts" : "Brouillons");
  const type =
    typeFilter === "all" ? (isEn ? "All types" : "Tous types")
    : typeFilter === "cursus" ? (isEn ? "Curriculum" : "Cursus")
    : (isEn ? "Short courses" : "Formations courtes");
  const parts = [status, type];
  const q = query.trim();
  if (q) parts.push(`${isEn ? "Search" : "Recherche"}: ${q}`);
  parts.push(isEn ? `${count} row${count === 1 ? "" : "s"}` : `${count} ligne${count > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

function programmesCsvFilename(locale: "fr" | "en") {
  const d = new Date().toISOString().slice(0, 10);
  return `${locale === "en" ? "programs" : "programmes"}-${d}.csv`;
}

function programmesPdfFilename(locale: "fr" | "en") {
  const d = new Date().toISOString().slice(0, 10);
  return `${locale === "en" ? "programs" : "programmes"}-${d}.pdf`;
}

function downloadProgrammesCsv(rows: ExportRow[], locale: "fr" | "en") {
  const header = locale === "en" ? ["Name", "Type", "Status", "Price", "Structure"] : ["Nom", "Type", "Statut", "Prix", "Structure"];
  const lines = [
    header,
    ...rows.map((r) => [r.nom, r.type, r.statut, r.prix, r.structure]),
  ];
  const csv = lines
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = programmesCsvFilename(locale);
  a.click();
  URL.revokeObjectURL(url);
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    return await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function buildProgrammesPdfDoc(rows: ExportRow[], filterCaption: string, locale: "fr" | "en") {
  const isEn = locale === "en";
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  let cfg: DocumentExportConfig | undefined;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .single();
      if (profile?.center_id) {
        cfg = await fetchDocumentExportConfig(supabase, profile.center_id, { documentType: "filieres" });
      }
    }
  } catch (e) {
    console.warn("[buildProgrammesPdfDoc] fetchDocumentExportConfig error:", e);
  }

  const blueRgb: [number, number, number] = cfg?.blueRgb || [17, 34, 78];
  const accentRgb: [number, number, number] = cfg?.accentRgb || [235, 103, 14];

  let headerX = 14;
  if (cfg?.showLogo && cfg?.logoUrl) {
    const dataUrl = await loadImageDataUrl(cfg.logoUrl);
    if (dataUrl) {
      const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(dataUrl, format, 14, 12, 14, 14);
      headerX = 32;
    }
  }

  doc.setTextColor(...blueRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(cfg?.legalName || (isEn ? "EDUCATION CENTER" : "CENTRE D'ENSEIGNEMENT"), headerX, 18);

  doc.setTextColor(...accentRgb);
  doc.setFontSize(9);
  doc.text((cfg?.title || (isEn ? "PROGRAM LIST" : "LISTE DES PROGRAMMES")).toUpperCase(), headerX, 24);

  const metaLines: string[] = [];
  if (cfg?.showAddress && cfg?.address) metaLines.push(cfg.address);
  if (cfg?.showPhone && cfg?.phone) metaLines.push(`${isEn ? "Phone" : "Tél"} : ${cfg.phone}`);
  if (cfg?.showRccm && cfg?.rccmNumber) metaLines.push(`RCCM : ${cfg.rccmNumber}`);
  if (cfg?.showNiu && cfg?.niuNumber) metaLines.push(`NIU : ${cfg.niuNumber}`);
  metaLines.push(`${isEn ? "Generated on" : "Généré le"} ${new Date().toLocaleString(isEn ? "en-GB" : "fr-FR")}`);

  let metaY = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  for (const line of metaLines) {
    doc.text(line, pageWidth - 14, metaY, { align: "right" });
    metaY += 4;
  }

  const ruleY = Math.max(30, metaY + 2);
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.6);
  doc.line(14, ruleY, pageWidth - 14, ruleY);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${isEn ? "Filters" : "Filtres"} : ${filterCaption}`, 14, ruleY + 6, { maxWidth: pageWidth - 28 });

  autoTable(doc, {
    startY: ruleY + 10,
    head: [isEn ? ["Name", "Type", "Status", "Price", "Structure"] : ["Nom", "Type", "Statut", "Prix", "Structure"]],
    body: rows.map((r) => [r.nom, r.type, r.statut, r.prix, r.structure]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, overflow: "linebreak", textColor: [40, 40, 40] },
    headStyles: { fillColor: blueRgb, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    margin: { left: 14, right: 14 },
  });

  if (cfg?.footerText) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(cfg.footerText, 14, pageHeight - 10, { maxWidth: 180 });
  }

  return doc;
}

async function downloadProgrammesPdf(rows: ExportRow[], filterCaption: string, locale: "fr" | "en") {
  const doc = await buildProgrammesPdfDoc(rows, filterCaption, locale);
  doc.save(programmesPdfFilename(locale));
}

/** Téléchargement discret (sans focus UI) puis retourne le nom de fichier. */
async function silentDownloadProgrammesPdf(rows: ExportRow[], filterCaption: string, locale: "fr" | "en") {
  const doc = await buildProgrammesPdfDoc(rows, filterCaption, locale);
  const filename = programmesPdfFilename(locale);
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

export default function CenterFilieresPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [programmes, setProgrammes] = useState<ProgrammeCard[]>([]);
  const [viewing, setViewing] = useState<ProgrammeCard | null>(null);
  const [deleting, setDeleting] = useState<ProgrammeCard | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<ProgrammeCard | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [shareBusy, setShareBusy] = useState(false);
  const [waPhoneOpen, setWaPhoneOpen] = useState(false);
  const [waPhone, setWaPhone] = useState("");

  const loadProgrammes = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
    if (!profile?.center_id) { setLoading(false); return; }

    const { data: rows, error } = await supabase
      .from("filieres")
      .select(`
        id, name, description, type, mode, created_at, nb_niveaux, duree_valeur, duree_unite, status, default_tuition_fee, pricing_mode,
        filiere_matieres(id, exam_disciplines(name)),
        filiere_campus(campus_id, campuses(name))
      `)
      .eq("center_id", profile.center_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("filieres:", error.message);
      // Fallback sans jointures si le schéma relationnel bloque
      const { data: simple } = await supabase
        .from("filieres")
        .select(`id, name, description, type, mode, created_at, nb_niveaux, duree_valeur, duree_unite, status, default_tuition_fee, pricing_mode, filiere_matieres(id)`)
        .eq("center_id", profile.center_id)
        .order("created_at", { ascending: false });
      setProgrammes((simple || []).map((f: any) => mapRow(f)));
    } else {
      setProgrammes((rows || []).map((f: any) => mapRow(f)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProgrammes(); }, [loadProgrammes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programmes.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        p.name,
        p.description || "",
        ...p.matiere_names,
        ...p.campus_names,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [programmes, query, statusFilter, typeFilter]);

  const counts = useMemo(() => ({
    total: programmes.length,
    published: programmes.filter((p) => p.status === "published").length,
    draft: programmes.filter((p) => p.status === "draft").length,
    cursus: programmes.filter((p) => p.type === "cursus").length,
    courte: programmes.filter((p) => p.type === "formation_courte").length,
    matieres: new Set(programmes.flatMap((p) => p.matiere_names)).size,
  }), [programmes]);

  const togglePublish = async (prog: ProgrammeCard) => {
    const next = prog.status === "published" ? "draft" : "published";
    if (next === "published" && !prog.default_tuition_fee) {
      if (!window.confirm(t("centre", "programsNoPriceConfirm"))) return;
    }
    setProgrammes((prev) => prev.map((p) => (p.id === prog.id ? { ...p, status: next } : p)));
    const { error } = await supabase.from("filieres").update({ status: next }).eq("id", prog.id);
    if (error) {
      setProgrammes((prev) => prev.map((p) => (p.id === prog.id ? { ...p, status: prog.status } : p)));
      alert(t("centre", "programsStatusError", { message: error.message }));
      return;
    }
    if (next === "published") {
      setPublishSuccess({ ...prog, status: "published" });
    }
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  const exportRows = toExportRows(filtered, locale);
  const canExport = exportRows.length > 0;
  const filterCaption = programmesFilterCaption(statusFilter, typeFilter, query, exportRows.length, locale);

  const sendWhatsAppPdf = async () => {
    if (!canExport) return;
    setShareBusy(true);
    try {
      const filename = await silentDownloadProgrammesPdf(exportRows, filterCaption, locale);
      openWhatsApp(
        t("centre", "programsWhatsAppMessage", { count: exportRows.length, filename }),
        waPhone,
      );
      setWaPhoneOpen(false);
      setWaPhone("");
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={t("centre", "programsTitle")}
          actions={
            <>
              <ProgrammesShareMenu
                disabled={!canExport}
                busy={shareBusy}
                onCsv={() => {
                  if (!canExport) return;
                  downloadProgrammesCsv(exportRows, locale);
                }}
                onPdf={async () => {
                  if (!canExport) return;
                  setShareBusy(true);
                  try {
                    await downloadProgrammesPdf(exportRows, filterCaption, locale);
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
              <OutlineHeaderButton className="print:hidden" onClick={() => router.push("/centre/filieres/nouveau")}>
                <Plus size={15} strokeWidth={2.25} />
                <span className="hidden sm:inline">{t("centre", "programsCreate")}</span>
                <span className="sm:hidden">{t("centre", "programsCreateShort")}</span>
              </OutlineHeaderButton>
            </>
          }
        />
      }
    >
      <CenterPageBody>
        {programmes.length > 0 && (
          <CenterToolbar
            stats={
              <span
                className="inline-flex flex-wrap items-center rounded-lg border border-black/[0.06] px-3 py-1.5"
                style={{ backgroundColor: SURFACE }}
              >
                <span className="font-bold">{t("centre", counts.total > 1 ? "programsCountMany" : "programsCountOne", { count: counts.total })}</span>
                <StatSep />
                <span className={ACTION_TONE.positiveStat}>{t("centre", counts.published > 1 ? "programsPublishedMany" : "programsPublishedOne", { count: counts.published })}</span>
                <StatSep />
                <span className={ACTION_TONE.negativeStat}>{t("centre", counts.draft > 1 ? "programsDraftMany" : "programsDraftOne", { count: counts.draft })}</span>
                <StatSep />
                <span className="font-semibold">{t("centre", counts.matieres > 1 ? "programsSubjectMany" : "programsSubjectOne", { count: counts.matieres })}</span>
              </span>
            }
          >
            <ToolbarSearch value={query} onChange={setQuery} placeholder={locale === "en" ? "Search…" : "Rechercher…"} />
            <ProgrammesFilterMenu
              statusFilter={statusFilter}
              typeFilter={typeFilter}
              onStatusChange={setStatusFilter}
              onTypeChange={setTypeFilter}
              onReset={() => { setStatusFilter("all"); setTypeFilter("all"); }}
            />
          </CenterToolbar>
        )}

        {programmes.length === 0 ? (
          <EmptyState
            title={t("centre", "programsNone")}
            hint={t("centre", "programsNoneHelp")}
            action={
              <OutlineHeaderButton onClick={() => router.push("/centre/filieres/nouveau")}>
                {t("centre", "programsCreate")}
              </OutlineHeaderButton>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t("centre", "programsNoResult")}
            hint={t("centre", "programsChangeSearch")}
            action={
              <OutlineHeaderButton onClick={() => { setQuery(""); setStatusFilter("all"); setTypeFilter("all"); }}>
                {t("centre", "programsReset")}
              </OutlineHeaderButton>
            }
          />
        ) : (
          <CenterDataTable
            columns={[t("centre", "programsName"), t("centre", "programsType"), t("centre", "programsStatus"), t("centre", "programsPrice"), t("centre", "programsActions")]}
            columnWidths={[undefined, "14%", "13%", "15%", "18.5rem"]}
            minWidth="900px"
          >
            {filtered.map((prog, i) => (
              <CenterTableRow key={prog.id} index={i}>
                <td className="px-4 py-3.5 min-w-0 print:break-inside-avoid">
                  <p className="text-[13px] font-semibold leading-snug truncate uppercase" style={{ color: BLUE }}>
                    {displayProgrammeName(prog.name)}
                  </p>
                  <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate">
                    {structureLabel(prog, locale, t)}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-[12px] font-medium text-neutral-600">
                  {prog.type === "cursus" ? t("centre", "programsCourse") : t("centre", "programsShortCourse")}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={prog.status} />
                </td>
                <td className="px-4 py-3.5 text-[12px] font-medium text-neutral-700 tabular-nums">
                  {priceLabel(prog, locale, t)}
                </td>
                <TableActions>
                  <span className="print:hidden flex w-full items-center justify-center gap-2 whitespace-nowrap">
                    <PublishToggleSwitch
                      published={prog.status === "published"}
                      onChange={() => togglePublish(prog)}
                    />
                    <TableBtnPreview onClick={() => setViewing(prog)} label={locale === "en" ? "Preview" : "Aperçu"} />
                    <TableBtnModify onClick={() => router.push(`/centre/filieres/nouveau?edit=${prog.id}`)} label={locale === "en" ? "Edit" : "Modifier"} />
                    <button
                      type="button"
                      onClick={() => setDeleting(prog)}
                      className="h-7 w-7 rounded-md border border-black/[0.08] text-neutral-400 flex items-center justify-center hover:text-red-600 hover:border-red-200 transition-colors shrink-0"
                      aria-label={t("centre", "programsDelete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </TableActions>
              </CenterTableRow>
            ))}
          </CenterDataTable>
        )}
      </CenterPageBody>

      {viewing && (
        <ViewModal
          prog={viewing}
          onClose={() => setViewing(null)}
          onTogglePublish={() => {
            const target = viewing;
            togglePublish(target);
            setViewing((prev) =>
              prev ? { ...prev, status: prev.status === "published" ? "draft" : "published" } : null
            );
          }}
        />
      )}
      {deleting && <DeleteModal prog={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); loadProgrammes(); }} />}
      {publishSuccess && (
        <PublishSuccessModal
          prog={publishSuccess}
          onClose={() => setPublishSuccess(null)}
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
              <button type="button" onClick={() => setWaPhoneOpen(false)} className="text-neutral-400 hover:text-neutral-700" aria-label={t("centre", "programsClose")}>
                <X size={18} />
              </button>
            </div>
            <p className="text-[12px] text-neutral-500 font-medium mb-3 leading-relaxed">
              {t("centre", "financeWhatsappHelp")}
            </p>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5">{t("centre", "programsPhoneCountry")}</label>
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
                {t("centre", "identityCancel")}
              </button>
              <button
                type="button"
                onClick={() => void sendWhatsAppPdf()}
                disabled={shareBusy || !waPhone.replace(/\D/g, "")}
                className="flex-1 h-10 rounded-lg text-xs font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: BLUE }}
              >
                {shareBusy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                {t("centre", "programsOpenWhatsApp")}
              </button>
            </div>
          </div>
        </div>
      )}
    </CenterPageLayout>
  );
}

function ProgrammesFilterMenu({
  statusFilter,
  typeFilter,
  onStatusChange,
  onTypeChange,
  onReset,
}: {
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  onStatusChange: (v: StatusFilter) => void;
  onTypeChange: (v: TypeFilter) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeCount =
    (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  const summary =
    activeCount === 0
      ? t("centre", "programsFilters")
      : [
          statusFilter === "published" ? t("centre", "programsPublished") : statusFilter === "draft" ? t("centre", "programsDrafts") : null,
          typeFilter === "cursus" ? t("centre", "programsCourse") : typeFilter === "formation_courte" ? t("centre", "programsShortCoursesAbbr") : null,
        ]
          .filter(Boolean)
          .join(" · ");

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

  const statusOpts: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t("centre", "programsAllStatuses") },
    { value: "published", label: t("centre", "programsPublished") },
    { value: "draft", label: t("centre", "programsDrafts") },
  ];
  const typeOpts: { value: TypeFilter; label: string }[] = [
    { value: "all", label: t("centre", "programsAllTypes") },
    { value: "cursus", label: t("centre", "programsCourse") },
    { value: "formation_courte", label: t("centre", "programsShortCourses") },
  ];

  return (
    <div ref={rootRef} className="relative shrink-0 z-30">
      <button
        type="button"
        aria-label={t("centre", "programsFilterAria")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-3 rounded-lg border border-black/[0.08] text-[12px] font-semibold outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10 inline-flex items-center gap-1.5 transition-colors duration-200 max-w-[14rem] cursor-pointer"
        style={{
          backgroundColor: SURFACE,
          color: activeCount > 0 ? BLUE : undefined,
          borderColor: activeCount > 0 ? `${BLUE}55` : undefined,
        }}
      >
        <Filter size={14} className="shrink-0 text-neutral-400" style={activeCount > 0 ? { color: BLUE } : undefined} />
        <span className="truncate text-neutral-700" style={activeCount > 0 ? { color: BLUE } : undefined}>
          {summary}
        </span>
        {activeCount > 0 && (
          <span
            className="shrink-0 h-4 min-w-[1rem] px-1 rounded-md text-[10px] font-bold text-white inline-flex items-center justify-center"
            style={{ backgroundColor: BLUE }}
          >
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-[16.5rem] rounded-lg border border-black/[0.08] bg-white shadow-xl overflow-hidden"
          role="menu"
        >
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "programsStatus")}</p>
          </div>
          {statusOpts.map((o) => {
            const active = statusFilter === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(o.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold hover:bg-black/[0.04] transition-colors cursor-pointer ${
                  active ? "text-[#11224E] bg-blue-50/50" : "text-neutral-700"
                }`}
              >
                <span className="w-4 shrink-0 flex justify-center">
                  {active ? <Check size={13} strokeWidth={2.5} /> : null}
                </span>
                {o.label}
              </button>
            );
          })}

          <div className="mx-3 border-t border-black/[0.06]" />

          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "programsType")}</p>
          </div>
          {typeOpts.map((o) => {
            const active = typeFilter === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={(e) => {
                  e.stopPropagation();
                  onTypeChange(o.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold hover:bg-black/[0.04] transition-colors cursor-pointer ${
                  active ? "text-[#11224E] bg-blue-50/50" : "text-neutral-700"
                }`}
              >
                <span className="w-4 shrink-0 flex justify-center">
                  {active ? <Check size={13} strokeWidth={2.5} /> : null}
                </span>
                {o.label}
              </button>
            );
          })}

          {activeCount > 0 && (
            <>
              <div className="mx-3 border-t border-black/[0.06]" />
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                  setOpen(false);
                }}
                className="w-full px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-500 hover:bg-black/[0.04] hover:text-neutral-800 transition-colors cursor-pointer"
              >
                {t("centre", "programsResetFilters")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProgrammesShareMenu({
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
        <span className="hidden sm:inline">{t("centre", "programsShare")}</span>
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

function mapRow(f: any): ProgrammeCard {
  const matRows = f.filiere_matieres || [];
  const names = Array.from(
    new Set(
      matRows
        .map((m: any) => m.exam_disciplines?.name)
        .filter((n: unknown): n is string => typeof n === "string" && n.trim().length > 0),
    ),
  ) as string[];
  const campuses = Array.from(
    new Set(
      (f.filiere_campus || [])
        .map((c: any) => c.campuses?.name)
        .filter((n: unknown): n is string => typeof n === "string" && n.trim().length > 0),
    ),
  ) as string[];

  return {
    id: f.id,
    name: f.name,
    description: f.description,
    type: f.type,
    mode: f.mode || null,
    created_at: f.created_at,
    nb_niveaux: f.nb_niveaux,
    duree_valeur: f.duree_valeur,
    duree_unite: f.duree_unite,
    status: f.status,
    default_tuition_fee: f.default_tuition_fee,
    pricing_mode: f.pricing_mode === "mensuel" || f.pricing_mode === "forfaitaire" ? f.pricing_mode : null,
    matieres_count: matRows.length || 0,
    matiere_names: names,
    campus_names: campuses,
  };
}

function TypeBadge({ type }: { type: "cursus" | "formation_courte" }) {
  const { t } = useI18n();
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-600 border border-black/[0.08] bg-neutral-50">
      {type === "cursus" ? t("centre", "programsCourse") : t("centre", "programsShortCourse")}
    </span>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  const { t } = useI18n();
  return status === "published" ? (
    <span className={ACTION_TONE.positivePill}>
      {t("centre", "programsPublishedStatus")}
    </span>
  ) : (
    <span className={ACTION_TONE.negativePill}>
      {t("centre", "programsDraftStatus")}
    </span>
  );
}

function PublishToggleSwitch({
  published,
  onChange,
  disabled,
}: {
  published: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={published}
      onClick={onChange}
      disabled={disabled}
      title={t("centre", published ? "programsPublishedToggle" : "programsDraftToggle")}
      className="inline-flex items-center gap-1.5 group outline-none cursor-pointer disabled:opacity-50 select-none shrink-0 w-[6.5rem] text-left"
    >
      <div
        className={`w-9 h-5 shrink-0 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
          published ? "bg-emerald-600" : "bg-neutral-300 group-hover:bg-neutral-400"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
            published ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      <span className={`text-[11.5px] font-bold inline-block w-[3.6rem] truncate ${published ? ACTION_TONE.positiveText : ACTION_TONE.negativeText}`}>
        {t("centre", published ? "programsPublishedStatus" : "programsDraftStatus")}
      </span>
    </button>
  );
}

// ===========================================================================
type FeeRow = { label: string; montant: number };
type InstallmentRow = { montant: number; jours: number };
type ParsedPlan = { fees: FeeRow[]; installments: InstallmentRow[] };
type NiveauRow = {
  id: string;
  annee: number;
  nom: string | null;
  tuition_fee: number | null;
  fees: FeeRow[];
  installments: InstallmentRow[];
};

function parsePlanPreview(plan: unknown): ParsedPlan {
  if (Array.isArray(plan)) {
    return {
      fees: [],
      installments: plan
        .map((p: { montant?: number; jours?: number }) => ({
          montant: Number(p?.montant) || 0,
          jours: Math.max(0, Math.floor(Number(p?.jours) || 0)),
        }))
        .filter((p) => p.montant > 0),
    };
  }
  if (plan && typeof plan === "object") {
    const obj = plan as {
      fees?: { label?: string; montant?: number }[];
      installments?: { montant?: number; jours?: number }[];
    };
    return {
      fees: (obj.fees || [])
        .map((f) => ({ label: (f.label || "").trim(), montant: Number(f.montant) || 0 }))
        .filter((f) => f.label && f.montant > 0),
      installments: (obj.installments || [])
        .map((p) => ({
          montant: Number(p?.montant) || 0,
          jours: Math.max(0, Math.floor(Number(p?.jours) || 0)),
        }))
        .filter((p) => p.montant > 0),
    };
  }
  return { fees: [], installments: [] };
}

function FeesPreviewList({ fees }: { fees: FeeRow[] }) {
  const { locale, t } = useI18n();
  if (fees.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400">{t("centre", "programsExtraFees")}</p>
      {fees.map((f) => (
        <div key={`${f.label}-${f.montant}`} className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-neutral-500">{f.label}</span>
          <span className="font-bold text-neutral-700">{fcfa(f.montant, locale)}</span>
        </div>
      ))}
    </div>
  );
}

function InstallmentsPreviewList({ installments }: { installments: InstallmentRow[] }) {
  const { locale, t } = useI18n();
  if (installments.length === 0) return null;
  return (
    <div className="mt-2.5 space-y-1">
      <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400">{t("centre", "programsSchedule")}</p>
      {installments.map((inst, idx) => (
        <div key={`${idx}-${inst.montant}-${inst.jours}`} className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-neutral-500">
            {t("centre", "programsInstallment", { count: idx + 1 })}
            {inst.jours > 0
              ? `${locale === "en" ? ": " : " — "}${t("centre", "programsDayOffset", { count: inst.jours })}`
              : `${locale === "en" ? ": " : " — "}${t("centre", "programsUponEnrollment")}`}
          </span>
          <span className="font-bold text-neutral-700">{fcfa(inst.montant, locale)}</span>
        </div>
      ))}
    </div>
  );
}

function ViewModal({ prog, onClose, onTogglePublish }: { prog: ProgrammeCard; onClose: () => void; onTogglePublish?: () => void }) {
  const { locale, t } = useI18n();
  const [niveaux, setNiveaux] = useState<NiveauRow[]>([]);
  const [filiereFees, setFiliereFees] = useState<FeeRow[]>([]);
  const [filiereInstallments, setFiliereInstallments] = useState<InstallmentRow[]>([]);
  const [cursusFeeMode, setCursusFeeMode] = useState<"uniforme" | "par_niveau" | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      const { data: filiere } = await supabase
        .from("filieres")
        .select("payment_plan, cursus_fee_mode")
        .eq("id", prog.id)
        .maybeSingle();
      if (cancelled) return;
      const plan = parsePlanPreview(filiere?.payment_plan);
      setFiliereFees(plan.fees);
      setFiliereInstallments(plan.installments);
      const mode = filiere?.cursus_fee_mode === "uniforme" || filiere?.cursus_fee_mode === "par_niveau"
        ? filiere.cursus_fee_mode
        : (prog.type === "cursus" ? "par_niveau" : null);
      setCursusFeeMode(mode);

      if (prog.type === "cursus") {
        const { data } = await supabase
          .from("niveaux")
          .select("id, annee, nom, tuition_fee, payment_plan")
          .eq("filiere_id", prog.id)
          .order("annee");
        if (cancelled) return;
        setNiveaux(
          (data || []).map((n: {
            id: string;
            annee: number;
            nom: string | null;
            tuition_fee: number | null;
            payment_plan: unknown;
          }) => {
            const parsed = parsePlanPreview(n.payment_plan);
            return {
              id: n.id,
              annee: n.annee,
              nom: n.nom,
              tuition_fee: n.tuition_fee,
              fees: parsed.fees,
              installments: parsed.installments,
            };
          }),
        );
      } else {
        setNiveaux([]);
      }
      if (!cancelled) setLoadingDetail(false);
    })();
    return () => { cancelled = true; };
  }, [prog]);

  const isUniforme = prog.type === "cursus" && cursusFeeMode === "uniforme";
  const showFilierePlan =
    prog.type === "formation_courte" || isUniforme;
  const filiereExtrasTotal = filiereFees.reduce((a, f) => a + f.montant, 0);
  const displayPrice = showFilierePlan && filiereExtrasTotal > 0
    ? fcfa((Number(prog.default_tuition_fee) || 0) + filiereExtrasTotal, locale)
    : priceLabel(prog, locale, t);

  return (
    <Shell onClose={onClose} title={t("centre", "programsPreview")} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={prog.status} />
            <TypeBadge type={prog.type} />
            {prog.type === "formation_courte" && prog.pricing_mode && (
              <span className="text-[10px] font-bold uppercase text-neutral-400">
                {prog.pricing_mode === "mensuel" ? t("centre", "programsMonthlyRate") : t("centre", "programsFlatRate")}
              </span>
            )}
            {isUniforme && (
              <span className="text-[10px] font-bold uppercase text-neutral-400">{t("centre", "programsUniformRate")}</span>
            )}
            {prog.type === "cursus" && cursusFeeMode === "par_niveau" && (
              <span className="text-[10px] font-bold uppercase text-neutral-400">{t("centre", "programsRatePerLevel")}</span>
            )}
            {prog.mode && MODE_LABEL[prog.mode] && (
              <span className="text-[10px] font-bold uppercase text-neutral-400">{t("centre", prog.mode === "presentiel" ? "programsInPerson" : prog.mode === "en_ligne" ? "programsOnline" : "programsHybrid")}</span>
            )}
          </div>
          {onTogglePublish && (
            <PublishToggleSwitch
              published={prog.status === "published"}
              onChange={onTogglePublish}
            />
          )}
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tight uppercase" style={{ color: BLUE }}>{displayProgrammeName(prog.name)}</h3>
          <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{prog.description || t("centre", "programsNoDescription")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InfoBox
            icon={Tag}
            label={
              prog.type === "formation_courte" && prog.pricing_mode === "mensuel"
                ? (filiereExtrasTotal > 0 ? t("centre", "programsCatalogTotalMonth") : t("centre", "programsPriceMonth"))
                : (filiereExtrasTotal > 0 && showFilierePlan ? t("centre", "programsTotalProgram") : t("centre", "programsProgramPrice"))
            }
            value={displayPrice}
          />
          <InfoBox icon={Clock} label={t("centre", "programsStructure")} value={structureLabel(prog, locale, t)} />
        </div>
        {prog.campus_names.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
              <MapPin size={12} /> Campus
            </p>
            <p className="text-sm font-bold text-neutral-700">{prog.campus_names.join(" · ")}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
            <BookOpen size={12} /> {t("centre", "programsSubjectsCount", { count: prog.matiere_names.length || prog.matieres_count })}
          </p>
          {prog.matiere_names.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {prog.matiere_names.map((name) => (
                <span key={name} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-50 border border-neutral-200 text-neutral-700">
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 font-medium">{t("centre", "programsNoSubject")}</p>
          )}
        </div>

        {loadingDetail ? (
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium py-2">
            <Loader2 size={14} className="animate-spin" /> {t("centre", "programsPricingLoading")}
          </div>
        ) : (
          <>
            {showFilierePlan && (filiereFees.length > 0 || filiereInstallments.length > 0) && (
              <div className="border border-neutral-200 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2.5 flex items-center gap-1.5">
                  <Tag size={12} /> {t("centre", "programsPricing")}
                </p>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-neutral-700">
                    {prog.type === "formation_courte" && prog.pricing_mode === "mensuel"
                      ? t("centre", "programsPriceMonth")
                      : t("centre", "programsTrainingPrice")}
                  </span>
                  <span className="font-black text-neutral-700">{fcfa(prog.default_tuition_fee, locale)}</span>
                </div>
                <FeesPreviewList fees={filiereFees} />
                {filiereFees.length > 0 && (
                  <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-neutral-100">
                    <span className="font-black text-neutral-800">{t("centre", "programsTotal")}</span>
                    <span className="font-black" style={{ color: BLUE }}>
                      {fcfa((Number(prog.default_tuition_fee) || 0) + filiereExtrasTotal, locale)}
                    </span>
                  </div>
                )}
                <InstallmentsPreviewList installments={filiereInstallments} />
              </div>
            )}

            {prog.type === "cursus" && !isUniforme && niveaux.length > 0 && (
              <div className="border border-neutral-200 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2.5 flex items-center gap-1.5">
                  <Layers size={12} /> {t("centre", "programsLevelsSchedules")}
                </p>
                <div className="space-y-3">
                  {niveaux.map((n) => {
                    const base = n.tuition_fee != null ? Number(n.tuition_fee) : (Number(prog.default_tuition_fee) || 0);
                    const extras = n.fees.reduce((a, f) => a + f.montant, 0);
                    return (
                      <div key={n.id} className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-neutral-700">{n.nom || t("centre", "programsLevel", { year: n.annee })}</span>
                          <span className="font-black text-neutral-700">
                            {extras > 0 ? fcfa(base + extras, locale) : fcfa(base, locale)}
                          </span>
                        </div>
                        {n.tuition_fee != null && extras > 0 && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {t("centre", "programsTrainingFeesBreakdown", { base: fcfa(base, locale), fees: fcfa(extras, locale) })}
                          </p>
                        )}
                        <FeesPreviewList fees={n.fees} />
                        <InstallmentsPreviewList installments={n.installments} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {prog.type === "cursus" && isUniforme && niveaux.length > 0 && (
              <div className="border border-neutral-200 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2.5 flex items-center gap-1.5">
                  <Layers size={12} /> {t("centre", "programsLevels")}
                </p>
                <div className="space-y-1.5">
                  {niveaux.map((n) => (
                    <div key={n.id} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-neutral-700">{n.nom || t("centre", "programsLevel", { year: n.annee })}</span>
                      <span className="font-medium text-neutral-400">{t("centre", "programsUniformRateLower")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
        <Icon size={10} /> {label}
      </p>
      <p className="font-black text-sm mt-1" style={{ color: BLUE }}>{value}</p>
    </div>
  );
}

function PublishSuccessModal({ prog, onClose }: { prog: ProgrammeCard; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-7 sm:p-8 max-w-md w-full shadow-2xl relative text-center border border-emerald-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute top-5 right-5 text-neutral-400 hover:text-black">
          <X size={20} />
        </button>
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center">
              <PartyPopper size={14} style={{ color: ORANGE }} />
            </span>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">{t("centre", "programsCongrats")}</p>
        <h3 className="text-xl font-black tracking-tight mb-2" style={{ color: BLUE }}>
          {t("centre", "programsPublishedSuccess")}
        </h3>
        <p className="text-sm font-bold text-neutral-700 mb-1">« {displayProgrammeName(prog.name)} »</p>
        <p className="text-[12px] text-neutral-500 font-medium leading-relaxed mb-6">
          {t("centre", "programsPublishedHelp")}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider text-white"
          style={{ backgroundColor: BLUE }}
        >
          {t("centre", "programsContinue")}
        </button>
      </div>
    </div>
  );
}

function DeleteModal({ prog, onClose, onDeleted }: { prog: ProgrammeCard; onClose: () => void; onDeleted: () => void }) {
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);
  const [enrollCount, setEnrollCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("filiere_id", prog.id);
      setEnrollCount(count || 0);
      setChecking(false);
    })();
  }, [prog]);

  const confirmDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("filieres").delete().eq("id", prog.id);
    setDeleting(false);
    if (error) { setError(t("centre", "programsDeleteImpossible")); return; }
    onDeleted();
  };

  return (
    <Shell onClose={onClose} title={t("centre", "programsDeleteTitle")}>
      {checking ? (
        <p className="text-sm text-neutral-400">{t("centre", "programsChecking")}</p>
      ) : enrollCount > 0 ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle size={20} className={`${ACTION_TONE.dangerIcon} shrink-0 mt-0.5`} />
            <div>
              <p className={`text-sm font-black ${ACTION_TONE.negativeText}`}>{t("centre", "programsDeleteImpossible")}</p>
              <p className={`text-xs ${ACTION_TONE.negativeText} mt-1`}>
                {t("centre", enrollCount > 1 ? "programsEnrolledMany" : "programsEnrolledOne", { count: enrollCount })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-full h-11 rounded-xl text-xs font-black uppercase bg-neutral-100">{t("centre", "programsClose")}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              {t("centre", "programsDeleteWarning", { name: displayProgrammeName(prog.name) })}
            </p>
          </div>
          {error && <p className={ACTION_TONE.errorText}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl text-xs font-black uppercase bg-neutral-100">{t("centre", "identityCancel")}</button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className={`${ACTION_TONE.negativeBtnMd} flex-1 h-11 rounded-xl text-xs font-black uppercase`}
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} {t("centre", "programsDelete")}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-white rounded-3xl p-6 md:p-7 ${wide ? "max-w-2xl" : "max-w-lg"} w-full shadow-2xl relative my-8`}>
        {title && (
          <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 hover:text-black">
            <X size={20} />
          </button>
        )}
        {title && (
          <h3 className="text-lg font-black mb-5" style={{ color: BLUE }}>{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}
