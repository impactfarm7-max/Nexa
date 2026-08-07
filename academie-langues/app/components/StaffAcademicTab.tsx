"use client";

import { useState, useEffect, useCallback, useMemo, type ElementType, type ReactNode } from "react";
import {
  GraduationCap, Loader2, CheckCircle2, Edit3, Save, Layers, ChevronRight, Lock, X, Users, Download,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  TCF_TEACHING_SUBJECTS,
  TCF_SUBJECT_KEYS,
  labelForTcfSubject,
} from "@/app/data/tcf-teaching-subjects";

const BLUE = "#11224E";
const ORANGE = "#eb670e";
const SURFACE = "#F7F7F6";

function AcademicSection({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon: ElementType;
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
      <div className="space-y-4 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6" style={{ backgroundColor: SURFACE }}>
        {children}
      </div>
    </section>
  );
}

type StaffLike = {
  id: string;
  prenom: string;
};

type MatiereItem = {
  id: string;
  name: string;
  filiere_id: string;
  filiere_name: string;
  niveau_id: string | null;
  niveau_key: string;
  niveau_label: string;
};

type ClasseItem = {
  id: string;
  nom: string;
  filiere_id: string;
  niveau_id: string | null;
  niveau_key: string;
  niveau_label: string;
};

type ProgrammeInfo = {
  id: string;
  name: string;
};

function niveauFromRow(m: {
  annee?: number | null;
  niveaux?: { id?: string; annee?: number | null; mois?: number | null; semaines?: number | null; jours?: number | null } | null;
}): { key: string; label: string; niveau_id: string | null } {
  if (m.niveaux?.annee != null) {
    return { key: `annee:${m.niveaux.annee}`, label: `Niveau ${m.niveaux.annee}`, niveau_id: m.niveaux.id || null };
  }
  if (m.annee != null && m.annee > 0) {
    return { key: `annee:${m.annee}`, label: `Niveau ${m.annee}`, niveau_id: m.niveaux?.id || null };
  }
  if (m.niveaux?.mois) return { key: `mois:${m.niveaux.mois}`, label: `${m.niveaux.mois} mois`, niveau_id: m.niveaux.id || null };
  if (m.niveaux?.semaines) return { key: `sem:${m.niveaux.semaines}`, label: `${m.niveaux.semaines} sem.`, niveau_id: m.niveaux.id || null };
  if (m.niveaux?.jours) return { key: `jours:${m.niveaux.jours}`, label: `${m.niveaux.jours} j`, niveau_id: m.niveaux.id || null };
  return { key: "tronc", label: "Programme (sans niveau)", niveau_id: m.niveaux?.id || null };
}

function levelDisplayLabel(label: string, en: boolean) {
  if (!en) return label;
  return label
    .replace(/^Niveau\s+/i, "Level ")
    .replace(/\s+mois$/i, " months")
    .replace(/\s+sem\.$/i, " weeks")
    .replace(/\s+j$/i, " days")
    .replace(/^Programme \(sans niveau\)$/i, "Program (no level)");
}

export default function StaffAcademicTab({
  staff,
  centerId,
  isTCF,
  tcfSubjects: initialTcfSubjects,
  onUpdate,
}: {
  staff: StaffLike;
  centerId: string;
  isTCF: boolean;
  tcfSubjects: string[];
  onUpdate?: () => void;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [allMatieresList, setAllMatieresList] = useState<MatiereItem[]>([]);
  const [allClassesList, setAllClassesList] = useState<ClasseItem[]>([]);
  const [savedAssignedIds, setSavedAssignedIds] = useState<string[]>([]);
  const [savedGroupeIds, setSavedGroupeIds] = useState<string[]>([]);
  const [tcfSubjects, setTcfSubjects] = useState<string[]>([]);
  const [savedTcfSubjects, setSavedTcfSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTcf, setSavingTcf] = useState(false);
  const [editingTcf, setEditingTcf] = useState(false);

  const [activeFiliereId, setActiveFiliereId] = useState<string | null>(null);
  const [selectedNiveaux, setSelectedNiveaux] = useState<string[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [draftGroupeIds, setDraftGroupeIds] = useState<string[]>([]);
  const [savingCard, setSavingCard] = useState(false);
  const [cardError, setCardError] = useState("");
  const [filterNiveau, setFilterNiveau] = useState<string>("all");
  const [downloadingAffectations, setDownloadingAffectations] = useState(false);

  const loadAcademicData = useCallback(async () => {
    setLoading(true);
    setActiveFiliereId(null);
    setSelectedNiveaux([]);
    setDraftIds([]);
    setDraftGroupeIds([]);
    setCardError("");
    setEditingTcf(false);
    try {
      if (isTCF) {
        const { data: tcfRows, error: tcfErr } = await supabase
          .from("staff_tcf_subjects")
          .select("subject_key")
          .eq("profile_id", staff.id);

        if (tcfErr) throw tcfErr;
        const keys = (tcfRows || []).map((r) => r.subject_key);
        setTcfSubjects(keys);
        setSavedTcfSubjects(keys);
        setLoading(false);
        return;
      }

      const { data: fmData, error: fmErr } = await supabase
        .from("filiere_matieres")
        .select(`
          id,
          annee,
          niveau_id,
          filieres (id, name, center_id),
          niveaux (id, annee, mois, semaines, jours),
          exam_disciplines (name)
        `);

      if (fmErr) throw fmErr;

      const centerMatieres: MatiereItem[] = (fmData || [])
        .filter((m: any) => m.filieres?.center_id === centerId)
        .map((m: any) => {
          const niv = niveauFromRow(m);
          return {
            id: m.id,
            name: m.exam_disciplines?.name || (en ? "Unnamed subject" : "Matière sans nom"),
            filiere_id: m.filieres?.id || "",
            filiere_name: m.filieres?.name || (en ? "Program" : "Programme"),
            niveau_id: m.niveau_id || niv.niveau_id,
            niveau_key: niv.key,
            niveau_label: niv.label,
          };
        })
        .filter((m: MatiereItem) => !!m.filiere_id);

      setAllMatieresList(centerMatieres);

      const filiereIds = Array.from(new Set(centerMatieres.map((m) => m.filiere_id)));
      let classes: ClasseItem[] = [];
      if (filiereIds.length > 0) {
        const { data: nivRows } = await supabase
          .from("niveaux")
          .select("id, annee, filiere_id")
          .in("filiere_id", filiereIds);
        const nivById: Record<string, { annee: number; filiere_id: string }> = {};
        for (const n of nivRows || []) {
          nivById[n.id] = { annee: n.annee, filiere_id: n.filiere_id };
        }
        const nivIds = Object.keys(nivById);
        const orParts: string[] = [`filiere_id.in.(${filiereIds.join(",")})`];
        if (nivIds.length) orParts.push(`niveau_id.in.(${nivIds.join(",")})`);
        const { data: grpRows } = await supabase
          .from("groupes")
          .select("id, nom, niveau_id, filiere_id")
          .or(orParts.join(","));

        classes = (grpRows || []).map((g: any) => {
          const filiere_id = g.filiere_id || (g.niveau_id ? nivById[g.niveau_id]?.filiere_id : "") || "";
          if (g.niveau_id && nivById[g.niveau_id]) {
            const annee = nivById[g.niveau_id].annee;
            return {
              id: g.id,
              nom: g.nom || (en ? "Class" : "Classe"),
              filiere_id,
              niveau_id: g.niveau_id as string,
              niveau_key: `annee:${annee}`,
              niveau_label: `Niveau ${annee}`,
            };
          }
          return {
            id: g.id,
            nom: g.nom || (en ? "Class" : "Classe"),
            filiere_id: g.filiere_id || filiere_id,
            niveau_id: null,
            niveau_key: "tronc",
            niveau_label: "Programme (sans niveau)",
          };
        }).filter((c: ClasseItem) => !!c.filiere_id && filiereIds.includes(c.filiere_id));
      }
      setAllClassesList(classes);

      const { data: assignedData } = await supabase
        .from("matiere_formateurs")
        .select("filiere_matiere_id")
        .eq("formateur_id", staff.id);
      setSavedAssignedIds((assignedData || []).map((a) => a.filiere_matiere_id));

      const { data: grpAssigned, error: grpErr } = await supabase
        .from("formateur_groupes")
        .select("groupe_id")
        .eq("formateur_id", staff.id);
      if (grpErr) {
        // Table pas encore créée : on continue sans classes persistées
        console.warn("formateur_groupes:", grpErr.message);
        setSavedGroupeIds([]);
      } else {
        setSavedGroupeIds((grpAssigned || []).map((r) => r.groupe_id));
      }
    } catch (e) {
      console.error("Erreur chargement académique:", e);
    } finally {
      setLoading(false);
    }
  }, [centerId, staff.id, isTCF, initialTcfSubjects, en]);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  const programmes = useMemo((): ProgrammeInfo[] => {
    const map = new Map<string, ProgrammeInfo>();
    for (const m of allMatieresList) {
      if (!map.has(m.filiere_id)) map.set(m.filiere_id, { id: m.filiere_id, name: m.filiere_name });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [allMatieresList]);

  const matieresOfProgramme = useCallback(
    (filiereId: string) => allMatieresList.filter((m) => m.filiere_id === filiereId),
    [allMatieresList],
  );

  const classesOfProgramme = useCallback(
    (filiereId: string) => allClassesList.filter((c) => c.filiere_id === filiereId),
    [allClassesList],
  );

  const niveauxOfProgramme = useCallback(
    (filiereId: string) => {
      const map = new Map<string, { key: string; label: string; count: number }>();
      for (const m of matieresOfProgramme(filiereId)) {
        const cur = map.get(m.niveau_key);
        if (cur) cur.count += 1;
        else map.set(m.niveau_key, { key: m.niveau_key, label: m.niveau_label, count: 1 });
      }
      // Inclure niveaux qui n'ont que des classes (sans matière) — rare mais utile
      for (const c of classesOfProgramme(filiereId)) {
        if (!map.has(c.niveau_key)) {
          map.set(c.niveau_key, { key: c.niveau_key, label: c.niveau_label, count: 0 });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "fr"));
    },
    [matieresOfProgramme, classesOfProgramme],
  );

  const frozenByProgramme = useMemo(() => {
    const assigned = allMatieresList.filter((m) => savedAssignedIds.includes(m.id));
    const byProg = new Map<
      string,
      { name: string; niveaux: Map<string, { matieres: MatiereItem[]; classes: ClasseItem[] }> }
    >();
    for (const m of assigned) {
      let prog = byProg.get(m.filiere_id);
      if (!prog) {
        prog = { name: m.filiere_name, niveaux: new Map() };
        byProg.set(m.filiere_id, prog);
      }
      const bucket = prog.niveaux.get(m.niveau_label) || { matieres: [], classes: [] };
      bucket.matieres.push(m);
      prog.niveaux.set(m.niveau_label, bucket);
    }
    for (const c of allClassesList.filter((x) => savedGroupeIds.includes(x.id))) {
      let prog = byProg.get(c.filiere_id);
      if (!prog) {
        const name = programmes.find((p) => p.id === c.filiere_id)?.name || (en ? "Program" : "Programme");
        prog = { name, niveaux: new Map() };
        byProg.set(c.filiere_id, prog);
      }
      const bucket = prog.niveaux.get(c.niveau_label) || { matieres: [], classes: [] };
      if (!bucket.classes.some((x) => x.id === c.id)) bucket.classes.push(c);
      prog.niveaux.set(c.niveau_label, bucket);
    }
    return Array.from(byProg.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      niveaux: Array.from(v.niveaux.entries())
        .map(([label, data]) => ({
          label,
          matieres: data.matieres.sort((a, b) => a.name.localeCompare(b.name, "fr")),
          classes: data.classes.sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "fr")),
      count: assigned.filter((m) => m.filiere_id === id).length,
    }));
  }, [allMatieresList, allClassesList, savedAssignedIds, savedGroupeIds, programmes, en]);

  const assignedProgrammeIds = useMemo(
    () => new Set(frozenByProgramme.map((p) => p.id)),
    [frozenByProgramme],
  );
  const unassignedProgrammes = useMemo(
    () => programmes.filter((p) => !assignedProgrammeIds.has(p.id)),
    [programmes, assignedProgrammeIds],
  );

  /** Lignes tableau Affectations : 1 ligne = 1 niveau d’un programme déjà affecté */
  const affectationRows = useMemo(() => {
    const rows: Array<{
      key: string;
      progId: string;
      progName: string;
      showProgramme: boolean;
      niveauCount: number;
      niveauLabel: string;
      matieresLabel: string;
      classesLabel: string;
    }> = [];
    for (const prog of frozenByProgramme) {
      const niveaux = prog.niveaux.length > 0
        ? prog.niveaux
        : [{ label: "—", matieres: [] as MatiereItem[], classes: [] as ClasseItem[] }];
      niveaux.forEach((n, idx) => {
        rows.push({
          key: `${prog.id}:${n.label}:${idx}`,
          progId: prog.id,
          progName: prog.name,
          showProgramme: idx === 0,
          niveauCount: niveaux.length,
          niveauLabel: n.label,
          matieresLabel: n.matieres.map((m) => m.name).join(", ") || "—",
          classesLabel: n.classes.map((c) => c.nom).join(", ") || "—",
        });
      });
    }
    return rows;
  }, [frozenByProgramme]);

  const niveauFilterOptions = useMemo(() => {
    const set = new Set(
      affectationRows.map((r) => r.niveauLabel).filter((l) => l && l !== "—"),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [affectationRows]);

  /** Affectations filtrées (affichage) — recalcule rowspan par programme */
  const displayAffectationRows = useMemo(() => {
    const filtered =
      filterNiveau === "all"
        ? affectationRows
        : affectationRows.filter((r) => r.niveauLabel === filterNiveau);
    const groups = new Map<string, typeof filtered>();
    for (const r of filtered) {
      const list = groups.get(r.progId) || [];
      list.push(r);
      groups.set(r.progId, list);
    }
    const out: typeof affectationRows = [];
    for (const rows of groups.values()) {
      rows.forEach((r, idx) => {
        out.push({
          ...r,
          showProgramme: idx === 0,
          niveauCount: rows.length,
        });
      });
    }
    return out;
  }, [affectationRows, filterNiveau]);

  const downloadAffectations = async () => {
    if (displayAffectationRows.length === 0) return;
    setDownloadingAffectations(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const blue: [number, number, number] = [17, 34, 78];
      doc.setTextColor(...blue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`${en ? "Assignments" : "Affectations"}: ${staff.prenom}`, 14, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const filtre = filterNiveau === "all"
        ? (en ? "All levels" : "Tous niveaux")
        : `${en ? "Level" : "Niveau"}: ${levelDisplayLabel(filterNiveau, en)}`;
      doc.text(filtre, 14, 25);
      doc.text(`${en ? "Generated on" : "Généré le"} ${new Date().toLocaleString(en ? "en-GB" : "fr-FR")}`, 14, 31);
      doc.setDrawColor(...blue);
      doc.setLineWidth(0.4);
      doc.line(14, 35, pageWidth - 14, 35);
      autoTable(doc, {
        startY: 40,
        head: [[en ? "Program" : "Programme", en ? "Level" : "Niveau", en ? "Assigned subject" : "Matière assignée", en ? "Class" : "Classe"]],
        body: displayAffectationRows.map((r) => [
          r.progName,
          levelDisplayLabel(r.niveauLabel, en),
          r.matieresLabel,
          r.classesLabel,
        ]),
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2, overflow: "linebreak", textColor: [40, 40, 40] },
        headStyles: { fillColor: blue, textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [250, 250, 248] },
        margin: { left: 14, right: 14 },
      });
      const d = new Date().toISOString().slice(0, 10);
      doc.save(`${en ? "assignments" : "affectations"}-${staff.prenom.toLowerCase()}-${d}.pdf`);
    } finally {
      setDownloadingAffectations(false);
    }
  };

  const visibleMatieres = useMemo(() => {
    if (!activeFiliereId || selectedNiveaux.length === 0) return [] as MatiereItem[];
    return matieresOfProgramme(activeFiliereId)
      .filter((m) => selectedNiveaux.includes(m.niveau_key))
      .sort((a, b) => a.name.localeCompare(b.name, "fr") || a.niveau_label.localeCompare(b.niveau_label, "fr"));
  }, [activeFiliereId, selectedNiveaux, matieresOfProgramme]);

  const visibleClasses = useMemo(() => {
    if (!activeFiliereId || selectedNiveaux.length === 0) return [] as ClasseItem[];
    return classesOfProgramme(activeFiliereId)
      .filter((c) => selectedNiveaux.includes(c.niveau_key))
      .sort((a, b) => a.niveau_label.localeCompare(b.niveau_label, "fr") || a.nom.localeCompare(b.nom, "fr"));
  }, [activeFiliereId, selectedNiveaux, classesOfProgramme]);

  /** Niveaux sélectionnés qui ont plus d'une classe. */
  const niveauxWithMultipleClasses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of visibleClasses) {
      counts.set(c.niveau_key, (counts.get(c.niveau_key) || 0) + 1);
    }
    return Array.from(counts.entries()).filter(([, n]) => n > 1).map(([k]) => k);
  }, [visibleClasses]);

  const openProgrammeCard = (filiereId: string) => {
    const ofProg = matieresOfProgramme(filiereId);
    const already = ofProg.filter((m) => savedAssignedIds.includes(m.id)).map((m) => m.id);
    const niveauxWithAssigned = Array.from(
      new Set(ofProg.filter((m) => already.includes(m.id)).map((m) => m.niveau_key)),
    );
    const ofClasses = classesOfProgramme(filiereId);
    const alreadyGroupes = ofClasses.filter((c) => savedGroupeIds.includes(c.id)).map((c) => c.id);
    const niveauxFromClasses = Array.from(
      new Set(ofClasses.filter((c) => alreadyGroupes.includes(c.id)).map((c) => c.niveau_key)),
    );
    setActiveFiliereId(filiereId);
    setSelectedNiveaux(Array.from(new Set([...niveauxWithAssigned, ...niveauxFromClasses])));
    setDraftIds(already);
    setDraftGroupeIds(alreadyGroupes);
    setCardError("");
  };

  const closeProgrammeCard = () => {
    setActiveFiliereId(null);
    setSelectedNiveaux([]);
    setDraftIds([]);
    setDraftGroupeIds([]);
    setCardError("");
  };

  const toggleNiveau = (key: string) => {
    setSelectedNiveaux((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (!next.includes(key) && activeFiliereId) {
        const idsOnNiveau = new Set(
          matieresOfProgramme(activeFiliereId).filter((m) => m.niveau_key === key).map((m) => m.id),
        );
        setDraftIds((d) => d.filter((id) => !idsOnNiveau.has(id)));
        const gOnNiveau = new Set(
          classesOfProgramme(activeFiliereId).filter((c) => c.niveau_key === key).map((c) => c.id),
        );
        setDraftGroupeIds((d) => d.filter((id) => !gOnNiveau.has(id)));
      }
      return next;
    });
  };

  const toggleDraftMatiere = (matiereId: string) => {
    setDraftIds((prev) =>
      prev.includes(matiereId) ? prev.filter((id) => id !== matiereId) : [...prev, matiereId],
    );
  };

  const toggleDraftGroupe = (groupeId: string) => {
    setDraftGroupeIds((prev) =>
      prev.includes(groupeId) ? prev.filter((id) => id !== groupeId) : [...prev, groupeId],
    );
  };

  const validateProgrammeCard = async () => {
    if (!activeFiliereId) return;
    setSavingCard(true);
    setCardError("");
    try {
      // Si un niveau a plusieurs classes, exiger au moins une classe cochée pour ce niveau
      // (uniquement si des matières sont aussi choisies sur ce niveau, ou si des classes sont proposées)
      for (const nivKey of niveauxWithMultipleClasses) {
        const hasMatiereOnNiv = visibleMatieres.some(
          (m) => m.niveau_key === nivKey && draftIds.includes(m.id),
        );
        const classesOnNiv = visibleClasses.filter((c) => c.niveau_key === nivKey);
        const picked = classesOnNiv.filter((c) => draftGroupeIds.includes(c.id));
        if (hasMatiereOnNiv && picked.length === 0) {
          const label = classesOnNiv[0]?.niveau_label
            ? levelDisplayLabel(classesOnNiv[0].niveau_label, en)
            : (en ? "this level" : "ce niveau");
          throw new Error(en ? `Select at least one class for ${label}.` : `Sélectionnez au moins une classe pour ${label}.`);
        }
      }

      const ofProg = matieresOfProgramme(activeFiliereId);
      const progIds = new Set(ofProg.map((m) => m.id));
      const previously = savedAssignedIds.filter((id) => progIds.has(id));
      const desired = draftIds.filter((id) => progIds.has(id));

      const toAdd = desired.filter((id) => !previously.includes(id));
      const toRemove = previously.filter((id) => !desired.includes(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("matiere_formateurs")
          .delete()
          .eq("formateur_id", staff.id)
          .in("filiere_matiere_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from("matiere_formateurs").insert(
          toAdd.map((filiere_matiere_id) => ({ formateur_id: staff.id, filiere_matiere_id })),
        );
        if (error) throw error;
      }

      // Sync classes du programme (table additive formateur_groupes)
      const ofClasses = classesOfProgramme(activeFiliereId);
      const progGroupeIds = new Set(ofClasses.map((c) => c.id));
      const previouslyG = savedGroupeIds.filter((id) => progGroupeIds.has(id));
      let desiredG = draftGroupeIds.filter((id) => progGroupeIds.has(id));
      // Auto-inclure la classe unique d'un niveau si matière choisie et une seule classe
      for (const nivKey of selectedNiveaux) {
        const classesOnNiv = ofClasses.filter((c) => c.niveau_key === nivKey);
        const hasMatiere = ofProg.some((m) => m.niveau_key === nivKey && desired.includes(m.id));
        if (hasMatiere && classesOnNiv.length === 1 && !desiredG.includes(classesOnNiv[0].id)) {
          desiredG = [...desiredG, classesOnNiv[0].id];
        }
      }

      const gAdd = desiredG.filter((id) => !previouslyG.includes(id));
      const gRemove = previouslyG.filter((id) => !desiredG.includes(id));

      if (gRemove.length > 0 || gAdd.length > 0) {
        if (gRemove.length > 0) {
          const { error } = await supabase
            .from("formateur_groupes")
            .delete()
            .eq("formateur_id", staff.id)
            .in("groupe_id", gRemove);
          if (error) {
            if (error.message?.includes("formateur_groupes") || error.code === "42P01") {
              throw new Error(en ? "The trainer_groups table is missing. Run supabase-formateur-groupes.sql in Supabase." : "Table formateur_groupes absente. Exécutez supabase-formateur-groupes.sql dans Supabase.");
            }
            throw error;
          }
        }
        if (gAdd.length > 0) {
          const { error } = await supabase.from("formateur_groupes").insert(
            gAdd.map((groupe_id) => ({ formateur_id: staff.id, groupe_id })),
          );
          if (error) {
            if (error.message?.includes("formateur_groupes") || error.code === "42P01") {
              throw new Error(en ? "The trainer_groups table is missing. Run supabase-formateur-groupes.sql in Supabase." : "Table formateur_groupes absente. Exécutez supabase-formateur-groupes.sql dans Supabase.");
            }
            throw error;
          }
        }
      }

      setSavedAssignedIds((prev) => {
        const withoutProg = prev.filter((id) => !progIds.has(id));
        return [...withoutProg, ...desired];
      });
      setSavedGroupeIds((prev) => {
        const withoutProg = prev.filter((id) => !progGroupeIds.has(id));
        return [...withoutProg, ...desiredG];
      });
      closeProgrammeCard();
      onUpdate?.();
    } catch (e: any) {
      setCardError(e.message || (en ? "Unable to save." : "Enregistrement impossible."));
    } finally {
      setSavingCard(false);
    }
  };

  const toggleTcfSubject = (key: string) => {
    if (!editingTcf) return;
    setTcfSubjects((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const saveTcfSubjects = async () => {
    setSavingTcf(true);
    const validKeys = tcfSubjects.filter((k) => TCF_SUBJECT_KEYS.has(k));
    await supabase.from("staff_tcf_subjects").delete().eq("profile_id", staff.id);
    if (validKeys.length > 0) {
      await supabase.from("staff_tcf_subjects").insert(
        validKeys.map((subject_key) => ({ profile_id: staff.id, subject_key })),
      );
    }
    setSavedTcfSubjects(validKeys);
    setSavingTcf(false);
    setEditingTcf(false);
    onUpdate?.();
  };

  const cancelTcfEdit = () => {
    setTcfSubjects(savedTcfSubjects);
    setEditingTcf(false);
  };

  if (loading) {
    return (
      <div className="p-8 text-neutral-400 text-sm font-medium animate-pulse">
        {en ? "Loading assignments..." : "Chargement des habilitations…"}
      </div>
    );
  }

  if (isTCF) {
    return (
      <div className="w-full">
        <AcademicSection
          icon={GraduationCap}
          title="Matières TCF"
          description={`Disciplines que ${staff.prenom} peut enseigner.`}
          actions={
            !editingTcf ? (
              <button
                type="button"
                onClick={() => setEditingTcf(true)}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5"
                style={{ backgroundColor: ORANGE }}
              >
                <Edit3 size={12} /> Modifier
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={cancelTcfEdit}
                  className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveTcfSubjects}
                  disabled={savingTcf || tcfSubjects.length === 0}
                  className="h-8 px-3 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-40"
                  style={{ backgroundColor: BLUE }}
                >
                  {savingTcf ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Enregistrer
                </button>
              </>
            )
          }
        >
          {!editingTcf ? (
            savedTcfSubjects.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-black/[0.06] bg-white">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black/[0.06] text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      <th className="px-3 py-2.5">Matière</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedTcfSubjects.map((key) => (
                      <tr key={key} className="border-b border-black/[0.04] last:border-0">
                        <td className="px-3 py-2.5 text-sm font-semibold" style={{ color: BLUE }}>
                          {labelForTcfSubject(key)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 font-medium">Aucune matière assignée.</p>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TCF_TEACHING_SUBJECTS.map((s) => {
                const checked = tcfSubjects.includes(s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleTcfSubject(s.key)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-lg border text-left text-sm font-semibold transition-colors ${
                      checked
                        ? "border-[#eb670e]/40 bg-[#FFF4EE] text-[#9a4a12]"
                        : "border-black/[0.06] bg-white text-neutral-600 hover:bg-black/[0.02]"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                        checked ? "bg-[#eb670e] border-[#eb670e] text-white" : "border-neutral-300 bg-white"
                      }`}
                    >
                      {checked ? <CheckCircle2 size={12} /> : null}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </AcademicSection>
      </div>
    );
  }

  const activeProg = programmes.find((p) => p.id === activeFiliereId);
  const activeNiveaux = activeFiliereId ? niveauxOfProgramme(activeFiliereId) : [];
  const draftMatiereCount = draftIds.filter((id) => visibleMatieres.some((m) => m.id === id)).length;
  const allVisibleSelected =
    visibleMatieres.length > 0 && visibleMatieres.every((m) => draftIds.includes(m.id));

  const selectAllVisibleMatieres = () => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      for (const m of visibleMatieres) next.add(m.id);
      return Array.from(next);
    });
  };

  const clearVisibleMatieres = () => {
    const visible = new Set(visibleMatieres.map((m) => m.id));
    setDraftIds((prev) => prev.filter((id) => !visible.has(id)));
  };

  return (
    <div className="w-full">
      {!activeFiliereId && (
        <>
          <AcademicSection
            icon={Lock}
            title={en ? "Assignments" : "Affectations"}
            description={en ? `Approved assignments for ${staff.prenom}: program, level, subjects, and classes.` : `Ce qui est déjà validé pour ${staff.prenom} : programme, niveau, matières et classes.`}
            actions={
              <>
                {niveauFilterOptions.length > 0 && (
                  <select
                    value={filterNiveau}
                    onChange={(e) => setFilterNiveau(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 outline-none"
                    aria-label={en ? "Filter by level" : "Filtrer par niveau"}
                  >
                    <option value="all">{en ? "All levels" : "Tous les niveaux"}</option>
                    {niveauFilterOptions.map((n) => (
                      <option key={n} value={n}>{levelDisplayLabel(n, en)}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => void downloadAffectations()}
                  disabled={displayAffectationRows.length === 0 || downloadingAffectations}
                  className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  {downloadingAffectations ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {en ? "Download" : "Télécharger"}
                </button>
              </>
            }
          >
            {affectationRows.length === 0 ? (
              <p className="text-sm text-neutral-400 font-medium">
                {en ? "No assignment yet. Assign a program below." : "Aucune affectation pour l'instant. Attribuez un programme ci-dessous."}
              </p>
            ) : displayAffectationRows.length === 0 ? (
              <p className="text-sm text-neutral-400 font-medium">
                {en ? "No assignment for this level. Change the filter." : "Aucune affectation pour ce niveau. Changez le filtre."}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-black/[0.06] bg-white">
                <table className="w-full text-left min-w-[36rem]">
                  <thead>
                    <tr className="border-b border-black/[0.06] bg-black/[0.015]">
                      <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        {en ? "Program" : "Programme"}
                      </th>
                      <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        {en ? "Levels" : "Niveaux"}
                      </th>
                      <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        {en ? "Assigned subject" : "Matière assignée"}
                      </th>
                      <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                        {en ? "Class" : "Classe"}
                      </th>
                      <th className="px-3.5 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 w-[1%] whitespace-nowrap">
                        {en ? "Action" : "Action"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayAffectationRows.map((row) => (
                      <tr
                        key={row.key}
                        className="border-b border-black/[0.04] last:border-0 align-top"
                      >
                        {row.showProgramme ? (
                          <td
                            className="px-3.5 py-3"
                            rowSpan={row.niveauCount}
                          >
                            <p className="text-sm font-semibold leading-snug" style={{ color: BLUE }}>
                              {row.progName}
                            </p>
                          </td>
                        ) : null}
                        <td className="px-3.5 py-3 text-sm font-medium text-neutral-700 whitespace-nowrap">
                          {levelDisplayLabel(row.niveauLabel, en)}
                        </td>
                        <td className="px-3.5 py-3 text-sm font-medium text-neutral-700 leading-snug">
                          {row.matieresLabel}
                        </td>
                        <td className="px-3.5 py-3 text-sm font-medium text-neutral-600 leading-snug">
                          {row.classesLabel === "—" ? (
                            <span className="text-neutral-400">—</span>
                          ) : (
                            <span className="inline-flex items-start gap-1">
                              <Users size={12} className="mt-0.5 shrink-0 text-neutral-400" />
                              {row.classesLabel}
                            </span>
                          )}
                        </td>
                        {row.showProgramme ? (
                          <td className="px-3.5 py-3" rowSpan={row.niveauCount}>
                            <button
                              type="button"
                              onClick={() => openProgrammeCard(row.progId)}
                              className="h-8 px-2.5 rounded-lg border border-black/[0.08] text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Edit3 size={12} /> {en ? "Edit" : "Modifier"}
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AcademicSection>

          <AcademicSection
            icon={GraduationCap}
            title={en ? "Assign" : "Attribuer"}
            description={en ? "Center programs not yet assigned to this trainer." : "Programmes du centre pas encore affectés à ce formateur."}
          >
            {programmes.length === 0 ? (
              <p className="text-sm text-neutral-400 font-medium">
                {en ? "No academic program has been created in this center." : "Aucun programme pédagogique créé dans ce centre."}
              </p>
            ) : unassignedProgrammes.length === 0 ? (
              <p className="text-sm text-neutral-500 font-medium">
                {en ? <>All programs already have an assignment. Use <span className="font-semibold">Edit</span> in the table above to adjust them.</> : <>Tous les programmes ont déjà une affectation. Utilisez <span className="font-semibold">Modifier</span> dans le tableau ci-dessus pour ajuster.</>}
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-black/[0.06] bg-white divide-y divide-black/[0.04]">
                {unassignedProgrammes.map((p) => {
                  const matiereCount = matieresOfProgramme(p.id).length;
                  const niveauCount = niveauxOfProgramme(p.id).length;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openProgrammeCard(p.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-black/[0.02] transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: BLUE }}>{p.name}</p>
                        <p className="text-xs text-neutral-400 font-medium mt-0.5">
                          {niveauCount} {en ? `level${niveauCount > 1 ? "s" : ""}` : niveauCount > 1 ? "niveaux" : "niveau"}
                          {matiereCount > 0 ? ` · ${matiereCount} ${en ? `subject${matiereCount > 1 ? "s" : ""} available` : `matière${matiereCount > 1 ? "s" : ""} disponibles`}` : ""}
                          {en ? " · not assigned" : " · non affecté"}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold shrink-0" style={{ color: ORANGE }}>
                        {en ? "Assign" : "Attribuer"} <ChevronRight size={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </AcademicSection>
        </>
      )}

      {activeFiliereId && activeProg && (
        <AcademicSection
          icon={Layers}
          title={activeProg.name}
          description={en ? "1. Levels · 2. Subjects · 3. Classes · 4. Confirm" : "1. Niveaux · 2. Matières · 3. Classes · 4. Valider"}
          actions={
            <button
              type="button"
              onClick={closeProgrammeCard}
              disabled={savingCard}
              className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <X size={13} /> {en ? "Close" : "Fermer"}
            </button>
          }
        >
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{en ? "1. Levels" : "1. Niveaux"}</p>
                <p className="text-xs text-neutral-400 font-medium">
                  {selectedNiveaux.length} {en ? "selected" : `sélectionné${selectedNiveaux.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeNiveaux.map((n) => {
                  const on = selectedNiveaux.includes(n.key);
                  return (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => toggleNiveau(n.key)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        on ? "text-white border-transparent" : "bg-white border-black/[0.08] text-neutral-600"
                      }`}
                      style={on ? { backgroundColor: BLUE } : undefined}
                    >
                      {levelDisplayLabel(n.label, en)}
                      <span className="opacity-70 ml-1">({n.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{en ? "2. Subjects" : "2. Matières"}</p>
                {selectedNiveaux.length > 0 && visibleMatieres.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 font-medium">
                      {draftMatiereCount}/{visibleMatieres.length}
                    </span>
                    <button
                      type="button"
                      onClick={allVisibleSelected ? clearVisibleMatieres : selectAllVisibleMatieres}
                      className="text-xs font-semibold"
                      style={{ color: ORANGE }}
                    >
                      {allVisibleSelected ? (en ? "Clear all" : "Tout décocher") : (en ? "Select all" : "Tout cocher")}
                    </button>
                  </div>
                )}
              </div>
              {selectedNiveaux.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-1">
                  {en ? "Select at least one level." : "Sélectionnez au moins un niveau."}
                </p>
              ) : visibleMatieres.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-1">
                  {en ? "No subjects for these levels." : "Aucune matière sur ces niveaux."}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-black/[0.06] bg-white divide-y divide-black/[0.04]">
                  {visibleMatieres.map((m) => {
                    const checked = draftIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleDraftMatiere(m.id)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${
                          checked ? "bg-[#FFF4EE]" : "hover:bg-black/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                              checked ? "bg-[#eb670e] border-[#eb670e] text-white" : "border-neutral-300 bg-white"
                            }`}
                          >
                            {checked ? <CheckCircle2 size={12} /> : null}
                          </span>
                          <span className={`text-sm truncate ${checked ? "font-semibold text-[#11224E]" : "font-medium text-neutral-700"}`}>
                            {m.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400 shrink-0">
                          {levelDisplayLabel(m.niveau_label, en)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                {en ? "3. Classes" : "3. Classes"}
              </p>
              {selectedNiveaux.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-1">{en ? "Choose a level first." : "Choisissez d'abord un niveau."}</p>
              ) : visibleClasses.length === 0 ? (
                <p className="text-sm text-neutral-400 font-medium py-1">
                  {en ? "No classes for these levels. There is nothing to select." : "Aucune classe sur ces niveaux. Rien à sélectionner."}
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-500 font-medium">
                    {en ? "When a level has several classes, select the classes taught by this trainer." : "Si un niveau a plusieurs classes, cochez celles où le formateur intervient."}
                  </p>
                  {selectedNiveaux.map((nivKey) => {
                    const classesOnNiv = visibleClasses.filter((c) => c.niveau_key === nivKey);
                    if (classesOnNiv.length === 0) return null;
                    const label = classesOnNiv[0].niveau_label;
                    const multi = classesOnNiv.length > 1;
                    return (
                      <div key={nivKey}>
                        <p className="text-[11px] font-semibold text-neutral-500 mb-1.5">
                          {levelDisplayLabel(label, en)}
                          {multi ? (en ? ". Several classes" : ". Plusieurs classes") : (en ? ". 1 class" : ". 1 classe")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {classesOnNiv.map((c) => {
                            const checked = draftGroupeIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleDraftGroupe(c.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                                  checked
                                    ? "text-white border-transparent"
                                    : "bg-white border-black/[0.08] text-neutral-600"
                                }`}
                                style={checked ? { backgroundColor: BLUE } : undefined}
                              >
                                <Users size={11} /> {c.nom}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cardError && (
              <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {cardError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={closeProgrammeCard}
                disabled={savingCard}
                className="flex-1 h-11 rounded-lg border border-black/[0.08] bg-white text-sm font-semibold text-neutral-600 disabled:opacity-50"
              >
                {en ? "Cancel" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={validateProgrammeCard}
                disabled={savingCard}
                className="flex-1 h-11 rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: BLUE }}
              >
                {savingCard ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                {en ? "Confirm assignment" : "Valider l'affectation"}
              </button>
            </div>
          </div>
        </AcademicSection>
      )}
    </div>
  );
}
