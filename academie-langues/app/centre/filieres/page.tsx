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

const fcfa = (n: number | null | undefined) => (Number(n) || 0).toLocaleString("fr-FR") + " FCFA";

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

function structureLabel(p: ProgrammeCard) {
  if (p.type === "cursus") return `${p.nb_niveaux || 1} niveau${(p.nb_niveaux || 1) > 1 ? "x" : ""}`;
  return `${p.duree_valeur || 0} ${p.duree_unite || ""}`.trim();
}

function priceLabel(p: ProgrammeCard) {
  const amount = fcfa(p.default_tuition_fee);
  if (p.type !== "formation_courte") return amount;
  if (p.pricing_mode === "mensuel") return `${amount} / mois`;
  return amount;
}

type ExportRow = { nom: string; type: string; statut: string; prix: string; structure: string };

/** Montants PDF/CSV : espaces ASCII uniquement (fr-FR / NNBSP → barres dans Helvetica jsPDF). */
function fcfaExport(n: number | null | undefined) {
  const v = Math.round(Number(n) || 0);
  const grouped = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${v < 0 ? "-" : ""}${grouped} FCFA`;
}

function priceLabelExport(p: ProgrammeCard) {
  const amount = fcfaExport(p.default_tuition_fee);
  if (p.type !== "formation_courte") return amount;
  if (p.pricing_mode === "mensuel") return `${amount} / mois`;
  return amount;
}

function toExportRows(list: ProgrammeCard[]): ExportRow[] {
  return list.map((p) => ({
    nom: displayProgrammeName(p.name),
    type: p.type === "cursus" ? "Cursus" : "Formation courte",
    statut: p.status === "published" ? "Publié" : "Brouillon",
    prix: priceLabelExport(p),
    structure: structureLabel(p),
  }));
}

function programmesFilterCaption(
  statusFilter: StatusFilter,
  typeFilter: TypeFilter,
  query: string,
  count: number,
) {
  const status =
    statusFilter === "all" ? "Tous programmes"
    : statusFilter === "published" ? "Publiés"
    : "Brouillons";
  const type =
    typeFilter === "all" ? "Tous types"
    : typeFilter === "cursus" ? "Cursus"
    : "Formations courtes";
  const parts = [status, type];
  const q = query.trim();
  if (q) parts.push(`Recherche: ${q}`);
  parts.push(`${count} ligne${count > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

function programmesCsvFilename() {
  const d = new Date().toISOString().slice(0, 10);
  return `programmes-${d}.csv`;
}

function programmesPdfFilename() {
  const d = new Date().toISOString().slice(0, 10);
  return `programmes-${d}.pdf`;
}

function downloadProgrammesCsv(rows: ExportRow[]) {
  const header = ["Nom", "Type", "Statut", "Prix", "Structure"];
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
  a.download = programmesCsvFilename();
  a.click();
  URL.revokeObjectURL(url);
}

async function buildProgrammesPdfDoc(rows: ExportRow[], filterCaption: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const blue: [number, number, number] = [17, 34, 78];

  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Programmes", 14, 18);

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
    head: [["Nom", "Type", "Statut", "Prix", "Structure"]],
    body: rows.map((r) => [r.nom, r.type, r.statut, r.prix, r.structure]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak", textColor: [40, 40, 40] },
    headStyles: { fillColor: blue, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    margin: { left: 14, right: 14 },
  });

  return doc;
}

async function downloadProgrammesPdf(rows: ExportRow[], filterCaption: string) {
  const doc = await buildProgrammesPdfDoc(rows, filterCaption);
  doc.save(programmesPdfFilename());
}

/** Téléchargement discret (sans focus UI) puis retourne le nom de fichier. */
async function silentDownloadProgrammesPdf(rows: ExportRow[], filterCaption: string) {
  const doc = await buildProgrammesPdfDoc(rows, filterCaption);
  const filename = programmesPdfFilename();
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
      if (!window.confirm("Ce programme n'a pas de prix défini. Le publier quand même ?")) return;
    }
    setProgrammes((prev) => prev.map((p) => (p.id === prog.id ? { ...p, status: next } : p)));
    const { error } = await supabase.from("filieres").update({ status: next }).eq("id", prog.id);
    if (error) {
      setProgrammes((prev) => prev.map((p) => (p.id === prog.id ? { ...p, status: prog.status } : p)));
      alert("Changement de statut impossible : " + error.message);
      return;
    }
    if (next === "published") {
      setPublishSuccess({ ...prog, status: "published" });
    }
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  const exportRows = toExportRows(filtered);
  const canExport = exportRows.length > 0;
  const filterCaption = programmesFilterCaption(statusFilter, typeFilter, query, exportRows.length);

  const sendWhatsAppPdf = async () => {
    if (!canExport) return;
    setShareBusy(true);
    try {
      const filename = await silentDownloadProgrammesPdf(exportRows, filterCaption);
      openWhatsApp(
        `Liste des programmes Nexa (${exportRows.length}). PDF pret a joindre: ${filename}`,
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
          title="Programmes"
          actions={
            <>
              <ProgrammesShareMenu
                disabled={!canExport}
                busy={shareBusy}
                onCsv={() => {
                  if (!canExport) return;
                  downloadProgrammesCsv(exportRows);
                }}
                onPdf={async () => {
                  if (!canExport) return;
                  setShareBusy(true);
                  try {
                    await downloadProgrammesPdf(exportRows, filterCaption);
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
                <span className="hidden sm:inline">Créer un programme</span>
                <span className="sm:hidden">Créer</span>
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
                <span className="font-bold">{counts.total}</span> programme{counts.total > 1 ? "s" : ""}
                <StatSep />
                <span className="font-semibold">{counts.published} publié{counts.published > 1 ? "s" : ""}</span>
                <StatSep />
                <span className="font-semibold text-red-600">{counts.draft} brouillon{counts.draft > 1 ? "s" : ""}</span>
                <StatSep />
                <span className="font-semibold">{counts.matieres} matière{counts.matieres > 1 ? "s" : ""} distincte{counts.matieres > 1 ? "s" : ""}</span>
              </span>
            }
          >
            <ToolbarSearch value={query} onChange={setQuery} />
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
            title="Aucun programme pour le moment"
            hint="Créez votre première filière — cursus ou formation courte — pour structurer l'offre du centre."
            action={
              <OutlineHeaderButton onClick={() => router.push("/centre/filieres/nouveau")}>
                Créer un programme
              </OutlineHeaderButton>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Aucun résultat"
            hint="Modifiez la recherche ou les filtres."
            action={
              <OutlineHeaderButton onClick={() => { setQuery(""); setStatusFilter("all"); setTypeFilter("all"); }}>
                Réinitialiser
              </OutlineHeaderButton>
            }
          />
        ) : (
          <CenterDataTable
            columns={["Nom", "Type", "Statut", "Prix", "Actions"]}
            columnWidths={[undefined, "16%", "12%", "18%", "10.75rem"]}
          >
            {filtered.map((prog, i) => (
              <CenterTableRow key={prog.id} index={i}>
                <td className="px-4 py-3.5 min-w-0 print:break-inside-avoid">
                  <p className="text-[13px] font-semibold leading-snug truncate uppercase" style={{ color: BLUE }}>
                    {displayProgrammeName(prog.name)}
                  </p>
                  <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate">
                    {structureLabel(prog)}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-[12px] font-medium text-neutral-600">
                  {prog.type === "cursus" ? "Cursus" : "Formation courte"}
                </td>
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => togglePublish(prog)}
                    title={prog.status === "published" ? "Repasser en brouillon" : "Publier"}
                    className={`text-[12px] font-semibold print:pointer-events-none ${
                      prog.status === "published" ? "text-neutral-600" : "text-red-600"
                    }`}
                  >
                    {prog.status === "published" ? "Publié" : "Brouillon"}
                  </button>
                </td>
                <td className="px-4 py-3.5 text-[12px] font-medium text-neutral-700 tabular-nums">
                  {priceLabel(prog)}
                </td>
                <TableActions>
                  <span className="print:hidden inline-flex items-center gap-1">
                    <TableBtnPreview onClick={() => setViewing(prog)} />
                    <TableBtnModify onClick={() => router.push(`/centre/filieres/nouveau?edit=${prog.id}`)} />
                    <button
                      type="button"
                      onClick={() => setDeleting(prog)}
                      className="h-7 w-7 rounded-md border border-black/[0.08] text-neutral-400 flex items-center justify-center hover:text-red-600 hover:border-red-200 transition-colors"
                      aria-label="Supprimer"
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

      {viewing && <ViewModal prog={viewing} onClose={() => setViewing(null)} />}
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
              <button type="button" onClick={() => setWaPhoneOpen(false)} className="text-neutral-400 hover:text-neutral-700" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <p className="text-[12px] text-neutral-500 font-medium mb-3 leading-relaxed">
              Le PDF de la liste filtrée est préparé dans l&apos;app, puis WhatsApp s&apos;ouvre pour ce numéro. Joignez ensuite le fichier téléchargé.
            </p>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5">Numéro (indicatif pays)</label>
            <input
              value={waPhone}
              onChange={(e) => setWaPhone(e.target.value)}
              placeholder="ex. 2376XXXXXXXX"
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeCount =
    (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  const summary =
    activeCount === 0
      ? "Filtres"
      : [
          statusFilter === "published" ? "Publiés" : statusFilter === "draft" ? "Brouillons" : null,
          typeFilter === "cursus" ? "Cursus" : typeFilter === "formation_courte" ? "Form. courtes" : null,
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
    { value: "all", label: "Tous statuts" },
    { value: "published", label: "Publiés" },
    { value: "draft", label: "Brouillons" },
  ];
  const typeOpts: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "Tous types" },
    { value: "cursus", label: "Cursus" },
    { value: "formation_courte", label: "Formations courtes" },
  ];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Filtrer les programmes"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-3 rounded-lg border border-black/[0.08] text-[12px] font-semibold outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10 inline-flex items-center gap-1.5 transition-colors duration-200 max-w-[14rem]"
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
          className="absolute right-0 top-full mt-1.5 z-40 w-[16.5rem] rounded-lg border border-black/[0.08] bg-white shadow-lg overflow-hidden"
          role="menu"
        >
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Statut</p>
          </div>
          {statusOpts.map((o) => {
            const active = statusFilter === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => onStatusChange(o.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold hover:bg-black/[0.03] ${
                  active ? "text-[#11224E]" : "text-neutral-700"
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Type</p>
          </div>
          {typeOpts.map((o) => {
            const active = typeFilter === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => onTypeChange(o.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold hover:bg-black/[0.03] ${
                  active ? "text-[#11224E]" : "text-neutral-700"
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
                onClick={() => { onReset(); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-500 hover:bg-black/[0.03] hover:text-neutral-800"
              >
                Réinitialiser les filtres
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
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-600 border border-black/[0.08] bg-neutral-50">
      {type === "cursus" ? "Cursus" : "Formation courte"}
    </span>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-600 border border-black/[0.08] bg-neutral-50">
      Publié
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-red-600 border border-red-200 bg-red-50">
      Brouillon
    </span>
  );
}

// ===========================================================================
type NiveauRow = { id: string; annee: number; nom: string | null; tuition_fee: number | null };

function ViewModal({ prog, onClose }: { prog: ProgrammeCard; onClose: () => void }) {
  const [niveaux, setNiveaux] = useState<NiveauRow[]>([]);
  useEffect(() => {
    if (prog.type !== "cursus") return;
    (async () => {
      const { data } = await supabase.from("niveaux").select("id, annee, nom, tuition_fee").eq("filiere_id", prog.id).order("annee");
      setNiveaux(data || []);
    })();
  }, [prog]);

  return (
    <Shell onClose={onClose} title="Aperçu du programme" wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={prog.status} />
          <TypeBadge type={prog.type} />
          {prog.type === "formation_courte" && prog.pricing_mode && (
            <span className="text-[10px] font-bold uppercase text-neutral-400">
              {prog.pricing_mode === "mensuel" ? "Tarif mensuel" : "Tarif forfaitaire"}
            </span>
          )}
          {prog.mode && MODE_LABEL[prog.mode] && (
            <span className="text-[10px] font-bold uppercase text-neutral-400">{MODE_LABEL[prog.mode]}</span>
          )}
        </div>
        <div>
          <h3 className="text-2xl font-black tracking-tight uppercase" style={{ color: BLUE }}>{displayProgrammeName(prog.name)}</h3>
          <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">{prog.description || "Aucune description."}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InfoBox
            icon={Tag}
            label={prog.type === "formation_courte" && prog.pricing_mode === "mensuel" ? "Prix / mois" : "Prix du programme"}
            value={priceLabel(prog)}
          />
          <InfoBox icon={Clock} label="Structure" value={structureLabel(prog)} />
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
            <BookOpen size={12} /> Matières ({prog.matiere_names.length || prog.matieres_count})
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
            <p className="text-xs text-neutral-400 font-medium">Aucune matière renseignée.</p>
          )}
        </div>
        {prog.type === "cursus" && niveaux.length > 0 && (
          <div className="border border-neutral-200 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2.5 flex items-center gap-1.5">
              <Layers size={12} /> Niveaux
            </p>
            <div className="space-y-1.5">
              {niveaux.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-700">{n.nom || `Niveau ${n.annee}`}</span>
                  <span className="font-black text-neutral-700">
                    {n.tuition_fee != null ? fcfa(n.tuition_fee) : fcfa(prog.default_tuition_fee)}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Félicitations</p>
        <h3 className="text-xl font-black tracking-tight mb-2" style={{ color: BLUE }}>
          Votre programme a été publié
        </h3>
        <p className="text-sm font-bold text-neutral-700 mb-1">« {displayProgrammeName(prog.name)} »</p>
        <p className="text-[12px] text-neutral-500 font-medium leading-relaxed mb-6">
          Il peut désormais accueillir des inscriptions. Vous pouvez le repasser en brouillon à tout moment via le statut.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider text-white"
          style={{ backgroundColor: BLUE }}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

function DeleteModal({ prog, onClose, onDeleted }: { prog: ProgrammeCard; onClose: () => void; onDeleted: () => void }) {
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
    if (error) { setError(error.message); return; }
    onDeleted();
  };

  return (
    <Shell onClose={onClose} title="Supprimer le programme">
      {checking ? (
        <p className="text-sm text-neutral-400">Vérification...</p>
      ) : enrollCount > 0 ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-red-700">Suppression impossible</p>
              <p className="text-xs text-red-600 mt-1">
                {enrollCount} étudiant{enrollCount > 1 ? "s sont inscrits" : " est inscrit"}. Impossible de supprimer tant qu&apos;ils y sont rattachés.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-full h-11 rounded-xl text-xs font-black uppercase bg-neutral-100">Fermer</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Supprimer <b>« {displayProgrammeName(prog.name)} »</b> et ses niveaux, classes et matières. Action définitive.
            </p>
          </div>
          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl text-xs font-black uppercase bg-neutral-100">Annuler</button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 h-11 rounded-xl text-xs font-black uppercase text-white bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Supprimer
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
