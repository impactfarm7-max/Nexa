"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ArrowLeft, Save, Loader2, CheckCircle2,
  Users, Calendar, AlertTriangle, Plus, Trash2, Search, GitBranch, Pencil, Lock, Download,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import BulletinDynamique from "@/app/components/BulletinDynamique";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import { isGradeLeafPeriod } from "@/app/utils/gradePeriods";
import {
  PRINCIPAL_WEIGHT_KEY,
  averageGradesOnScale,
  hasCustomGradeWeights,
  isPrincipalGrade,
  parseGradeWeights,
  simpleMean,
  scoreTone,
  scoreToneClasses,
  scoreToneTextClass,
} from "@/app/utils/gradesCalc";
import { downloadClassGradeSheetPdf } from "@/app/utils/centerPdfExport";
import { fetchDocumentExportConfig, filterSignatures } from "@/app/utils/documentConfig";
import { useI18n } from "@/app/i18n/I18nProvider";

import {
  BLUE,
  ORANGE,
  PAGE_BG,
  SURFACE,
  centerNotoSans,
} from "@/app/centre/center-page-ui";

type FiliereOption = {
  id: string;
  name: string;
  type: "cursus" | "formation_courte" | null;
  student_count: number;
};
type NiveauOption = { id: string; annee: number | null; mois: number | null; nom: string | null };
type GroupeOption = { id: string; nom: string; niveau_id: string | null; filiere_id: string | null };

type TeachingSubject = {
  filiere_matiere_id: string;
  discipline_id: string | null;
  discipline_name: string;
  filiere_name: string;
  niveau_annee: number | null;
  niveau_id: string | null;
  filiere_id: string;
  coefficient: number;
  max_score: number;
  grade_weights: Record<string, number> | null;
};

type PeriodOption = {
  id: string;
  name: string;
  parent_name: string | null;
  type: string;
};

/** Colonne de note supl. — intitulé en en-tête (comme Note principale) */
type SuplColumn = {
  colKey: string;
  title: string;
};

type ExtraCell = {
  colKey: string;
  id: string | null;
  score: string;
  dirty: boolean;
  deleted: boolean;
};

type StudentGradeRow = {
  enrollment_id: string;
  student_id: string;
  prenom: string;
  nom: string;
  existing_grade_id: string | null;
  existing_score: number | null;
  new_score: string;
  dirty: boolean;
  extras: ExtraCell[];
};

function newLocalKey() {
  return `x-${Math.random().toString(36).slice(2, 9)}`;
}

function mapSubject(fm: any, filiereMatiereId?: string): TeachingSubject {
  return {
    filiere_matiere_id: filiereMatiereId || fm.id,
    discipline_id: fm?.discipline_id || fm?.exam_disciplines?.id || null,
    discipline_name: fm?.exam_disciplines?.name || "—",
    filiere_name: fm?.filieres?.name || "—",
    niveau_annee: fm?.niveaux?.annee || fm?.annee || null,
    niveau_id: fm?.niveau_id || null,
    filiere_id: fm?.filiere_id || "",
    coefficient: Number(fm?.coefficient) > 0 ? Number(fm.coefficient) : 1,
    max_score: Number(fm?.max_score) > 0 ? Number(fm.max_score) : 20,
    grade_weights: parseGradeWeights(fm?.grade_weights),
  };
}

/** Nombre de disciplines distinctes (pas une ligne par niveau). */
function countUniqueMatieres(subjects: TeachingSubject[], filiereId: string): number {
  const keys = new Set<string>();
  for (const s of subjects) {
    if (s.filiere_id !== filiereId) continue;
    keys.add(s.discipline_id || s.discipline_name);
  }
  return keys.size;
}

function FilterPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-colors ${
        active
          ? "bg-[#11224E] border-[#11224E] text-white"
          : "bg-white border-black/[0.08] text-neutral-600 hover:bg-black/[0.03]"
      }`}
    >
      {children}
    </button>
  );
}

function ProgrammeTypeBadge({ type }: { type: "cursus" | "formation_courte" | null }) {
  const { t } = useI18n();
  if (type === "cursus") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-[#11224E]/15 bg-[#11224E]/[0.06] text-[#11224E]">
        {t("centre", "programsCourse")}
      </span>
    );
  }
  if (type === "formation_courte") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-orange-200 bg-orange-50 text-orange-700">
        {t("centre", "programsShortCourse")}
      </span>
    );
  }
  return null;
}

function normalizeFiliereType(raw: string | null | undefined): "cursus" | "formation_courte" | null {
  if (raw === "cursus" || raw === "formation_courte") return raw;
  return null;
}

function rowAverage(
  row: StudentGradeRow,
  suplColumns: SuplColumn[],
  weights: Record<string, number> | null,
): number | null {
  const grades: { score: number; title: string | null }[] = [];
  const principal = parseFloat(row.new_score);
  if (!isNaN(principal) && row.new_score.trim() !== "") {
    grades.push({ score: principal, title: null });
  }
  const titleByCol = new Map(suplColumns.map((c) => [c.colKey, c.title.trim()]));
  for (const ex of row.extras) {
    if (ex.deleted) continue;
    const s = parseFloat(ex.score);
    if (!isNaN(s) && ex.score.trim() !== "") {
      grades.push({ score: s, title: titleByCol.get(ex.colKey) || null });
    }
  }
  return averageGradesOnScale(grades, 20, weights);
}

function initials(nom: string, prenom: string) {
  const a = (nom || "").trim().charAt(0);
  const b = (prenom || "").trim().charAt(0);
  return `${a}${b}`.toUpperCase() || "?";
}

function scoreFieldClass(scoreStr: string, bareme: number, dirty: boolean, locked: boolean) {
  if (locked) {
    return "w-20 h-9 text-center rounded-xl border text-sm font-black border-neutral-200 bg-neutral-100 text-neutral-500 cursor-not-allowed";
  }
  const n = parseFloat(scoreStr);
  const tone = scoreStr.trim() === "" || isNaN(n) ? "empty" as const : scoreTone(n, bareme);
  return `w-20 h-9 text-center rounded-xl border text-sm font-black outline-none focus:border-blue-500 ${scoreToneClasses(tone, dirty)}`;
}

export default function GradeBookPage() {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [allSubjects, setAllSubjects] = useState<TeachingSubject[]>([]);
  const [filieres, setFilieres] = useState<FiliereOption[]>([]);
  const [niveaux, setNiveaux] = useState<NiveauOption[]>([]);
  const [allGroupes, setAllGroupes] = useState<GroupeOption[]>([]);
  const [groupes, setGroupes] = useState<GroupeOption[]>([]);

  const [selectedFiliereId, setSelectedFiliereId] = useState("");
  const [selectedNiveauId, setSelectedNiveauId] = useState("");
  const [selectedGroupeId, setSelectedGroupeId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [studentRows, setStudentRows] = useState<StudentGradeRow[]>([]);
  const [suplColumns, setSuplColumns] = useState<SuplColumn[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editMaxScore, setEditMaxScore] = useState("20");
  const [editCoefficient, setEditCoefficient] = useState("1");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaLocked, setMetaLocked] = useState(true);
  const [notesLocked, setNotesLocked] = useState(true);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [formulaMode, setFormulaMode] = useState<"simple" | "weighted">("simple");
  const [formulaDraft, setFormulaDraft] = useState<Record<string, string>>({});
  const [savingFormula, setSavingFormula] = useState(false);
  const [exportingClass, setExportingClass] = useState(false);
  const [bulletinEnrollment, setBulletinEnrollment] = useState<{
    id: string;
    label: string;
    niveauAnnee: number | null;
  } | null>(null);
  const [trainerGroupeIds, setTrainerGroupeIds] = useState<string[] | null>(null);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const subjectPickerRef = useRef<HTMLDivElement>(null);

  const canEditMeta = userRole !== "trainer";
  const selectedFiliere = filieres.find((f) => f.id === selectedFiliereId) || null;
  const selectedSubject = allSubjects.find((s) => s.filiere_matiere_id === selectedSubjectId) || null;
  const bareme = selectedSubject?.max_score || 20;
  const subjectWeights = selectedSubject?.grade_weights ?? null;

  const formulaHint = useMemo(() => {
    if (!hasCustomGradeWeights(subjectWeights)) {
      return t("centre", "notesSimpleAverage");
    }
    const parts: string[] = [];
    if (subjectWeights![PRINCIPAL_WEIGHT_KEY]) {
      parts.push(`${t("centre", "gradesMainGrade")} (${subjectWeights![PRINCIPAL_WEIGHT_KEY]} %)`);
    }
    for (const [k, v] of Object.entries(subjectWeights!)) {
      if (k === PRINCIPAL_WEIGHT_KEY) continue;
      parts.push(`${k} (${v} %)`);
    }
    if (parts.length === 0) return t("centre", "notesSimpleAverage");
    return `${t("centre", "notesAverage")} = ${parts.join(" + ")}`;
  }, [subjectWeights, t]);

  const formulaKeys = useMemo(() => {
    const keys: { key: string; label: string }[] = [
      { key: PRINCIPAL_WEIGHT_KEY, label: t("centre", "gradesMainGrade") },
    ];
    const seen = new Set<string>([PRINCIPAL_WEIGHT_KEY]);
    for (const col of suplColumns) {
      const t = col.title.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      keys.push({ key: t, label: t });
    }
    if (subjectWeights) {
      for (const k of Object.keys(subjectWeights)) {
        if (seen.has(k)) continue;
        seen.add(k);
        keys.push({
          key: k,
          label: k === PRINCIPAL_WEIGHT_KEY ? t("centre", "gradesMainGrade") : k,
        });
      }
    }
    return keys;
  }, [suplColumns, subjectWeights, t]);

  const openFormulaEditor = () => {
    const custom = hasCustomGradeWeights(subjectWeights);
    setFormulaMode(custom ? "weighted" : "simple");
    const draft: Record<string, string> = {};
    for (const { key } of formulaKeys) {
      draft[key] = custom && subjectWeights![key] != null
        ? String(subjectWeights![key])
        : "";
    }
    if (!custom && formulaKeys.length > 0) {
      const equal = Math.round((100 / formulaKeys.length) * 100) / 100;
      for (const { key } of formulaKeys) draft[key] = String(equal);
    }
    setFormulaDraft(draft);
    setFormulaOpen(true);
  };

  const subjectsForContext = useMemo(() => {
    if (!selectedFiliereId) return [];
    return allSubjects.filter((s) => {
      if (s.filiere_id !== selectedFiliereId) return false;
      if (selectedNiveauId && s.niveau_id && s.niveau_id !== selectedNiveauId) return false;
      return true;
    });
  }, [allSubjects, selectedFiliereId, selectedNiveauId]);

  const filteredSubjectsForPicker = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return subjectsForContext;
    return subjectsForContext.filter((s) =>
      s.discipline_name.toLowerCase().includes(q)
    );
  }, [subjectsForContext, subjectQuery]);

  useEffect(() => {
    if (!subjectMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!subjectPickerRef.current?.contains(e.target as Node)) {
        setSubjectMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [subjectMenuOpen]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, role")
        .eq("id", session.user.id)
        .single();

      const cId = profile?.center_id || null;
      const role = profile?.role || null;
      setUserRole(role);
      if (!cId) { setLoading(false); return; }

      const { data: center } = await supabase
        .from("centers")
        .select("center_type")
        .eq("id", cId)
        .maybeSingle();
      setCenterType(center?.center_type ?? null);

      if (isTcfCanadaCenter(center?.center_type)) {
        setLoading(false);
        return;
      }

      const { data: periodData } = await supabase.rpc("get_center_periods", { p_center_id: cId });
      setPeriods(
        (periodData || [])
          .filter((p: { type: string; is_active?: boolean }) => p.is_active && isGradeLeafPeriod(p.type))
          .map((p: { id: string; name: string; parent_name: string | null; type: string }) => ({
            id: p.id,
            name: p.name,
            parent_name: p.parent_name,
            type: p.type,
          })),
      );

      const fmSelectBase = `
        id, filiere_id, niveau_id, annee, discipline_id, coefficient, max_score,
        exam_disciplines(id, name),
        filieres(name, center_id, type),
        niveaux(annee)
      `;
      const fmSelectWithWeights = `
        id, filiere_id, niveau_id, annee, discipline_id, coefficient, max_score, grade_weights,
        exam_disciplines(id, name),
        filieres(name, center_id, type),
        niveaux(annee)
      `;

      let subjects: TeachingSubject[] = [];
      if (role === "trainer") {
        const [{ data: mfData, error: mfErr }, { data: fgData }] = await Promise.all([
          supabase
            .from("matiere_formateurs")
            .select(`filiere_matiere_id, filiere_matieres(${fmSelectWithWeights})`)
            .eq("formateur_id", session.user.id),
          supabase
            .from("formateur_groupes")
            .select("groupe_id")
            .eq("formateur_id", session.user.id),
        ]);
        let rows = mfData as any[] | null;
        if (mfErr) {
          const fb = await supabase
            .from("matiere_formateurs")
            .select(`filiere_matiere_id, filiere_matieres(${fmSelectBase})`)
            .eq("formateur_id", session.user.id);
          rows = fb.data as any[] | null;
        }
        subjects = (rows || [])
          .filter((mf: any) => mf.filiere_matieres)
          .map((mf: any) => mapSubject(mf.filiere_matieres, mf.filiere_matiere_id));
        const gids = (fgData || []).map((r: { groupe_id: string }) => r.groupe_id);
        setTrainerGroupeIds(gids.length > 0 ? gids : null);
      } else {
        const { data: fmData, error: fmErr } = await supabase
          .from("filiere_matieres")
          .select(fmSelectWithWeights)
          .eq("filieres.center_id", cId);
        let rows = fmData as any[] | null;
        if (fmErr) {
          const fb = await supabase
            .from("filiere_matieres")
            .select(fmSelectBase)
            .eq("filieres.center_id", cId);
          rows = fb.data as any[] | null;
        }
        subjects = (rows || [])
          .filter((fm: any) => fm.filieres?.center_id === cId)
          .map((fm: any) => mapSubject(fm));
        setTrainerGroupeIds(null);
      }
      setAllSubjects(subjects);

      const filiereMap = new Map<string, { name: string; type: "cursus" | "formation_courte" | null }>();
      for (const s of subjects) {
        if (!s.filiere_id) continue;
        const existing = filiereMap.get(s.filiere_id);
        if (!existing) {
          filiereMap.set(s.filiere_id, { name: s.filiere_name, type: null });
        }
      }

      const filiereIds = [...filiereMap.keys()];
      if (role !== "trainer") {
        const { data: filRows } = await supabase
          .from("filieres")
          .select("id, name, type")
          .eq("center_id", cId)
          .order("name");
        for (const f of filRows || []) {
          filiereMap.set(f.id, {
            name: f.name,
            type: normalizeFiliereType(f.type),
          });
        }
      } else if (filiereIds.length > 0) {
        const { data: filRows } = await supabase
          .from("filieres")
          .select("id, name, type")
          .in("id", filiereIds);
        for (const f of filRows || []) {
          filiereMap.set(f.id, {
            name: f.name,
            type: normalizeFiliereType(f.type),
          });
        }
      }

      setFilieres(
        [...filiereMap.entries()]
          .map(([id, meta]) => ({ id, name: meta.name, type: meta.type, student_count: 0 }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );

      const idsForCount = [...filiereMap.keys()];
      if (idsForCount.length > 0) {
        // Même logique que Programmes : count exact par filiere (tous statuts d'inscription)
        const countEntries = await Promise.all(
          idsForCount.map(async (fid) => {
            const { count, error } = await supabase
              .from("enrollments")
              .select("id", { count: "exact", head: true })
              .eq("filiere_id", fid);
            if (error) {
              console.warn("[carnet] count enrollments", fid, error.message);
              return [fid, 0] as const;
            }
            return [fid, count || 0] as const;
          }),
        );
        const counts = new Map(countEntries);
        setFilieres((prev) =>
          prev.map((f) => ({ ...f, student_count: counts.get(f.id) || 0 }))
        );
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedFiliereId) {
      setNiveaux([]);
      setAllGroupes([]);
      setGroupes([]);
      return;
    }
    (async () => {
      const [{ data: nivRows }, { data: byFiliere }, { data: byNiveau }] = await Promise.all([
        supabase.from("niveaux").select("id, annee, mois, nom").eq("filiere_id", selectedFiliereId).order("annee"),
        supabase.from("groupes").select("id, nom, niveau_id, filiere_id").eq("filiere_id", selectedFiliereId),
        supabase.from("niveaux").select("id").eq("filiere_id", selectedFiliereId),
      ]);

      // Formateur : uniquement les niveaux où il a une matière assignée
      let nivs = nivRows || [];
      if (userRole === "trainer") {
        const allowedNiv = new Set(
          allSubjects
            .filter((s) => s.filiere_id === selectedFiliereId && s.niveau_id)
            .map((s) => s.niveau_id as string),
        );
        if (allowedNiv.size > 0) {
          nivs = nivs.filter((n) => allowedNiv.has(n.id));
        }
      }
      setNiveaux(nivs);

      const niveauIds = (byNiveau || []).map((n: { id: string }) => n.id);
      let niveauGroupes: GroupeOption[] = [];
      if (niveauIds.length > 0) {
        const { data: gNiv } = await supabase
          .from("groupes")
          .select("id, nom, niveau_id, filiere_id")
          .in("niveau_id", niveauIds);
        niveauGroupes = gNiv || [];
      }
      const byId = new Map<string, GroupeOption>();
      for (const g of [...(byFiliere || []), ...niveauGroupes]) byId.set(g.id, g);
      let merged = [...byId.values()].sort((a, b) => a.nom.localeCompare(b.nom));

      // Formateur : si formateur_groupes renseigné → intersection ; sinon niveaux assignés
      if (userRole === "trainer") {
        if (trainerGroupeIds && trainerGroupeIds.length > 0) {
          const allowed = new Set(trainerGroupeIds);
          merged = merged.filter((g) => allowed.has(g.id));
        } else {
          const allowedNiv = new Set(
            allSubjects
              .filter((s) => s.filiere_id === selectedFiliereId && s.niveau_id)
              .map((s) => s.niveau_id as string),
          );
          if (allowedNiv.size > 0) {
            merged = merged.filter((g) => !g.niveau_id || allowedNiv.has(g.niveau_id));
          }
        }
      }

      setAllGroupes(merged);
    })();
  }, [selectedFiliereId, userRole, allSubjects, trainerGroupeIds]);

  useEffect(() => {
    if (!selectedFiliereId) { setGroupes([]); return; }
    if (!selectedNiveauId) {
      if (niveaux.length === 0) setGroupes(allGroupes);
      else setGroupes([]);
      return;
    }
    const hasNiveauLinks = allGroupes.some((g) => g.niveau_id);
    const next = hasNiveauLinks
      ? allGroupes.filter((g) => g.niveau_id === selectedNiveauId)
      : allGroupes.filter(
          (g) => g.niveau_id === selectedNiveauId || (!g.niveau_id && g.filiere_id === selectedFiliereId),
        );
    setGroupes(next);
  }, [selectedNiveauId, allGroupes, selectedFiliereId, niveaux.length]);

  useEffect(() => {
    if (!selectedSubject) return;
    setEditMaxScore(String(selectedSubject.max_score));
    setEditCoefficient(String(selectedSubject.coefficient));
    setMetaLocked(true);
  }, [selectedSubject]);

  useEffect(() => {
    if (subjectsForContext.length === 0) {
      setSelectedSubjectId("");
      return;
    }
    if (!subjectsForContext.some((s) => s.filiere_matiere_id === selectedSubjectId)) {
      setSelectedSubjectId(subjectsForContext[0].filiere_matiere_id);
    }
  }, [subjectsForContext, selectedSubjectId]);

  const contextReady =
    !!selectedFiliereId
    && (niveaux.length === 0 || !!selectedNiveauId)
    && !!selectedGroupeId
    && !!selectedSubjectId
    && !!selectedPeriodId;

  const loadGrid = useCallback(async () => {
    if (!selectedSubject || !selectedPeriodId || !selectedGroupeId) return;
    setGridLoading(true);
    setError("");
    setSaveSuccess(false);

    let enrollQuery = supabase
      .from("enrollments")
      .select("id, student_id, profiles:student_id(prenom, nom)")
      .eq("filiere_id", selectedSubject.filiere_id)
      .eq("groupe_id", selectedGroupeId)
      .eq("status", "active");

    if (selectedSubject.niveau_id) {
      enrollQuery = enrollQuery.eq("niveau_id", selectedSubject.niveau_id);
    } else if (selectedNiveauId) {
      enrollQuery = enrollQuery.eq("niveau_id", selectedNiveauId);
    }

    const { data: enrollments } = await enrollQuery;

    if (!enrollments || enrollments.length === 0) {
      setStudentRows([]);
      setSuplColumns([]);
      setNotesLocked(false);
      setGridLoading(false);
      return;
    }

    const enrollmentIds = enrollments.map((e: { id: string }) => e.id);
    const { data: existingGrades } = await supabase
      .from("grades")
      .select("id, enrollment_id, score, title, max_score")
      .eq("filiere_matiere_id", selectedSubject.filiere_matiere_id)
      .eq("period_id", selectedPeriodId)
      .in("enrollment_id", enrollmentIds);

    const principalByEnroll = new Map<string, { id: string; score: number }>();
    const titleOrder: string[] = [];
    const titleToCol = new Map<string, string>();
    const suplByEnroll = new Map<string, Map<string, { id: string; score: number }>>();

    for (const g of existingGrades || []) {
      if (isPrincipalGrade(g.title)) {
        if (!principalByEnroll.has(g.enrollment_id)) {
          principalByEnroll.set(g.enrollment_id, { id: g.id, score: g.score });
        } else {
          const noteTitle = t("centre", "gradesMainGrade");
          if (!titleToCol.has(noteTitle)) {
            const colKey = newLocalKey();
            titleToCol.set(noteTitle, colKey);
            titleOrder.push(noteTitle);
          }
          const colKey = titleToCol.get(noteTitle)!;
          if (!suplByEnroll.has(g.enrollment_id)) suplByEnroll.set(g.enrollment_id, new Map());
          suplByEnroll.get(g.enrollment_id)!.set(colKey, { id: g.id, score: g.score });
        }
      } else {
        const t = String(g.title).trim();
        if (!titleToCol.has(t)) {
          const colKey = newLocalKey();
          titleToCol.set(t, colKey);
          titleOrder.push(t);
        }
        const colKey = titleToCol.get(t)!;
        if (!suplByEnroll.has(g.enrollment_id)) suplByEnroll.set(g.enrollment_id, new Map());
        suplByEnroll.get(g.enrollment_id)!.set(colKey, { id: g.id, score: g.score });
      }
    }

    const columns: SuplColumn[] = titleOrder.map((title) => ({
      colKey: titleToCol.get(title)!,
      title,
    }));
    setSuplColumns(columns);

    const rows: StudentGradeRow[] = enrollments.map((e: any) => {
      const grade = principalByEnroll.get(e.id);
      const cellMap = suplByEnroll.get(e.id);
      return {
        enrollment_id: e.id,
        student_id: e.student_id,
        prenom: e.profiles?.prenom || "",
        nom: e.profiles?.nom || "",
        existing_grade_id: grade?.id || null,
        existing_score: grade?.score ?? null,
        new_score: grade?.score?.toString() || "",
        dirty: false,
        extras: columns.map((col) => {
          const cell = cellMap?.get(col.colKey);
          return {
            colKey: col.colKey,
            id: cell?.id || null,
            score: cell ? String(cell.score) : "",
            dirty: false,
            deleted: false,
          };
        }),
      };
    });

    rows.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
    setStudentRows(rows);
    const hasSaved =
      (existingGrades || []).length > 0 ||
      rows.some((r) => r.existing_grade_id || r.extras.some((ex) => ex.id));
    setNotesLocked(hasSaved);
    setGridLoading(false);
  }, [selectedSubject, selectedPeriodId, selectedGroupeId, selectedNiveauId]);

  useEffect(() => {
    if (contextReady) loadGrid();
    else {
      setStudentRows([]);
      setSuplColumns([]);
    }
  }, [contextReady, loadGrid]);

  const updatePrincipal = (enrollmentId: string, value: string) => {
    if (notesLocked) return;
    setStudentRows((prev) => prev.map((r) => {
      if (r.enrollment_id !== enrollmentId) return r;
      return {
        ...r,
        new_score: value,
        dirty: value !== (r.existing_score?.toString() || ""),
      };
    }));
    setSaveSuccess(false);
  };

  const updateExtraScore = (enrollmentId: string, colKey: string, score: string) => {
    if (notesLocked) return;
    setStudentRows((prev) => prev.map((r) => {
      if (r.enrollment_id !== enrollmentId) return r;
      return {
        ...r,
        extras: r.extras.map((ex) =>
          ex.colKey === colKey ? { ...ex, score, dirty: true, deleted: false } : ex,
        ),
      };
    }));
    setSaveSuccess(false);
  };

  const updateColumnTitle = (colKey: string, title: string) => {
    if (notesLocked) return;
    setSuplColumns((prev) => prev.map((c) => (c.colKey === colKey ? { ...c, title } : c)));
    setStudentRows((prev) => prev.map((r) => ({
      ...r,
      extras: r.extras.map((ex) =>
        ex.colKey === colKey ? { ...ex, dirty: true } : ex,
      ),
    })));
    setSaveSuccess(false);
  };

  const addSuplColumn = () => {
    if (notesLocked) return;
    const colKey = newLocalKey();
    setSuplColumns((prev) => [...prev, { colKey, title: "" }]);
    setStudentRows((prev) => prev.map((r) => ({
      ...r,
      extras: [...r.extras, { colKey, id: null, score: "", dirty: false, deleted: false }],
    })));
    setSaveSuccess(false);
  };

  const removeSuplColumn = (colKey: string) => {
    if (notesLocked) return;
    setSuplColumns((prev) => prev.filter((c) => c.colKey !== colKey));
    setStudentRows((prev) => prev.map((r) => ({
      ...r,
      extras: r.extras
        .map((ex) => {
          if (ex.colKey !== colKey) return ex;
          if (ex.id) return { ...ex, deleted: true, dirty: true };
          return null;
        })
        .filter((ex): ex is ExtraCell => ex !== null),
    })));
    setSaveSuccess(false);
  };

  const saveSubjectMeta = async () => {
    if (!selectedSubject || !canEditMeta) return;
    const max = parseFloat(editMaxScore);
    const coeff = parseFloat(editCoefficient);
    if (isNaN(max) || max <= 0 || isNaN(coeff) || coeff <= 0) {
      setError(t("centre", "notesScaleCoeffPositive"));
      return;
    }
    setSavingMeta(true);
    setError("");
    const { error: upErr } = await supabase
      .from("filiere_matieres")
      .update({ max_score: max, coefficient: coeff })
      .eq("id", selectedSubject.filiere_matiere_id);
    setSavingMeta(false);
    if (upErr) { setError(upErr.message); return; }
    setAllSubjects((prev) => prev.map((s) =>
      s.filiere_matiere_id === selectedSubject.filiere_matiere_id
        ? { ...s, max_score: max, coefficient: coeff }
        : s,
    ));
    setMetaLocked(true);
  };

  const saveAll = async () => {
    if (!userId || !selectedSubject || !selectedPeriodId) return;
    const hasWork = studentRows.some((r) => r.dirty || r.extras.some((ex) => ex.dirty || ex.deleted));
    if (!hasWork) return;

    setSaving(true);
    setError("");
    const maxScore = selectedSubject.max_score > 0 ? selectedSubject.max_score : 20;
    const titleByCol = new Map(suplColumns.map((c) => [c.colKey, c.title.trim()]));

    try {
      // Clone pour mise à jour locale après succès (sans reload)
      const nextRows: StudentGradeRow[] = studentRows.map((r) => ({
        ...r,
        extras: r.extras.map((ex) => ({ ...ex })),
      }));

      for (let i = 0; i < nextRows.length; i++) {
        const row = nextRows[i];

        if (row.dirty && row.new_score.trim() !== "") {
          const score = parseFloat(row.new_score);
          if (isNaN(score) || score < 0) continue;
          if (score > maxScore) {
            throw new Error(`${row.nom} ${row.prenom} : ${t("centre", "notesScoreAboveScale", { scale: String(maxScore) })}`);
          }
          if (row.existing_grade_id) {
            const { error: upErr } = await supabase
              .from("grades")
              .update({ score, max_score: maxScore, title: null })
              .eq("id", row.existing_grade_id);
            if (upErr) throw new Error(`${row.nom} ${row.prenom} : ${upErr.message}`);
            row.existing_score = score;
            row.dirty = false;
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from("grades")
              .insert({
                enrollment_id: row.enrollment_id,
                filiere_matiere_id: selectedSubject.filiere_matiere_id,
                period_id: selectedPeriodId,
                formateur_id: userId,
                score,
                max_score: maxScore,
                title: null,
              })
              .select("id")
              .single();
            if (insErr || !inserted) throw new Error(`${row.nom} ${row.prenom} : ${insErr?.message || "insert"}`);
            row.existing_grade_id = inserted.id;
            row.existing_score = score;
            row.dirty = false;
          }
        }

        const keptExtras: ExtraCell[] = [];
        for (const ex of row.extras) {
          if (ex.deleted && ex.id) {
            const { error: delErr } = await supabase.from("grades").delete().eq("id", ex.id);
            if (delErr) throw new Error(`${row.nom} ${row.prenom} : ${delErr.message}`);
            continue;
          }
          if (ex.deleted) continue;

          if (!ex.dirty) {
            keptExtras.push(ex);
            continue;
          }

          const title = titleByCol.get(ex.colKey) || "";
          const score = parseFloat(ex.score);
          const hasScore = ex.score.trim() !== "" && !isNaN(score);

          // Colonne vide partout → ignorer
          if (!hasScore && !ex.id) {
            keptExtras.push({ ...ex, dirty: false });
            continue;
          }

          if (!title) {
            throw new Error(t("centre", "notesExtraColumnTitleRequired"));
          }
          if (!hasScore) {
            keptExtras.push({ ...ex, dirty: false });
            continue;
          }
          if (score < 0 || score > maxScore) {
            throw new Error(`${row.nom} ${row.prenom} (${title}) : ${t("centre", "gradesAboveScale", { scale: String(maxScore) })}`);
          }

          if (ex.id) {
            const { error: upErr } = await supabase
              .from("grades")
              .update({ title, score, max_score: maxScore })
              .eq("id", ex.id);
            if (upErr) throw new Error(`${row.nom} ${row.prenom} : ${upErr.message}`);
            keptExtras.push({ ...ex, dirty: false });
          } else {
            const { data: inserted, error: insErr } = await supabase
              .from("grades")
              .insert({
                enrollment_id: row.enrollment_id,
                filiere_matiere_id: selectedSubject.filiere_matiere_id,
                period_id: selectedPeriodId,
                formateur_id: userId,
                score,
                max_score: maxScore,
                title,
              })
              .select("id")
              .single();
            if (insErr || !inserted) throw new Error(`${row.nom} ${row.prenom} : ${insErr?.message || "insert"}`);
            keptExtras.push({ ...ex, id: inserted.id, dirty: false });
          }
        }
        row.extras = keptExtras;
      }

      setStudentRows(nextRows);
      setSaveSuccess(true);
      setNotesLocked(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "notesSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const setFormulaWeight = (key: string, raw: string) => {
    const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
    if (cleaned === "" || cleaned === ".") {
      setFormulaDraft((prev) => ({ ...prev, [key]: cleaned }));
      return;
    }
    let n = parseFloat(cleaned);
    if (!Number.isFinite(n) || n < 0) n = 0;
    const others = formulaKeys.reduce((acc, row) => {
      if (row.key === key) return acc;
      return acc + (parseFloat(formulaDraft[row.key] || "0") || 0);
    }, 0);
    const maxAllowed = Math.max(0, Math.round((100 - others) * 100) / 100);
    if (n > maxAllowed) n = maxAllowed;
    setFormulaDraft((prev) => ({ ...prev, [key]: String(n) }));
  };

  const formulaSum = useMemo(() => {
    return formulaKeys.reduce((acc, { key }) => {
      const n = parseFloat(formulaDraft[key] || "");
      return acc + (Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);
  }, [formulaKeys, formulaDraft]);

  const formulaSumOk = Math.abs(formulaSum - 100) <= 0.05;
  const formulaCanSave =
    formulaMode === "simple" ||
    (formulaMode === "weighted" &&
      formulaSumOk &&
      formulaKeys.every(({ key }) => {
        const n = parseFloat(formulaDraft[key] || "");
        return Number.isFinite(n) && n > 0;
      }));

  const saveFormula = async () => {
    if (!selectedSubject || !canEditMeta) return;
    if (formulaMode === "weighted" && !formulaCanSave) {
      setError(
        formulaSumOk
          ? t("centre", "notesEachColumnWeightPositive")
          : t("centre", "notesSumMustBe100", { sum: formulaSum.toFixed(1) }),
      );
      return;
    }
    setSavingFormula(true);
    setError("");
    try {
      let payload: Record<string, number> | null = null;
      if (formulaMode === "weighted") {
        const map: Record<string, number> = {};
        for (const { key } of formulaKeys) {
          map[key] = parseFloat(formulaDraft[key] || "0");
        }
        payload = map;
      }
      const { error: upErr } = await supabase
        .from("filiere_matieres")
        .update({ grade_weights: payload })
        .eq("id", selectedSubject.filiere_matiere_id);
      if (upErr) {
        if (/grade_weights/i.test(upErr.message)) {
          throw new Error(t("centre", "notesGradeWeightsColumnMissing"));
        }
        throw new Error(upErr.message);
      }
      setAllSubjects((prev) => prev.map((s) =>
        s.filiere_matiere_id === selectedSubject.filiere_matiere_id
          ? { ...s, grade_weights: payload }
          : s,
      ));
      setFormulaOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "notesFormulaError"));
    } finally {
      setSavingFormula(false);
    }
  };

  const dirtyCount = studentRows.reduce((n, r) => {
    let c = r.dirty && r.new_score.trim() !== "" ? 1 : 0;
    c += r.extras.filter((ex) => ex.dirty || ex.deleted).length;
    return n + c;
  }, 0);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return studentRows;
    return studentRows.filter((r) => `${r.nom} ${r.prenom}`.toLowerCase().includes(q));
  }, [studentRows, search]);

  const classAvg = useMemo(() => {
    const avgs = studentRows
      .map((r) => rowAverage(r, suplColumns, subjectWeights))
      .filter((v): v is number => v !== null);
    return simpleMean(avgs);
  }, [studentRows, suplColumns, subjectWeights]);

  const filledCount = useMemo(
    () => studentRows.filter((r) => rowAverage(r, suplColumns, subjectWeights) !== null).length,
    [studentRows, suplColumns, subjectWeights],
  );

  const completionPct = studentRows.length > 0
    ? Math.round((filledCount / studentRows.length) * 100)
    : 0;

  const selectedGroupe = groupes.find((g) => g.id === selectedGroupeId) || null;
  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || null;
  const selectedNiveau = niveaux.find((n) => n.id === selectedNiveauId) || null;

  const exportClassPdf = async () => {
    if (!selectedSubject || !selectedGroupe || studentRows.length === 0) return;
    setExportingClass(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const profile = session
        ? (await supabase.from("profiles").select("center_id").eq("id", session.user.id).single()).data
        : null;
      const centerId = profile?.center_id;
      let config = undefined as Awaited<ReturnType<typeof fetchDocumentExportConfig>> | undefined;
      let signatures: { id: string; label: string }[] = [];
      if (centerId) {
        config = await fetchDocumentExportConfig(supabase, centerId);
        const { data: sigRows } = await supabase
          .from("bulletin_signatures")
          .select("id, name, title, label")
          .eq("center_id", centerId)
          .order("display_order");
        signatures = filterSignatures(sigRows || [], config.signatureIds);
      }

      const ranked = [...studentRows]
        .map((r) => ({ row: r, avg: rowAverage(r, suplColumns, subjectWeights) }))
        .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

      const rankMap = new Map<string, string>();
      let rank = 0;
      let prevAvg: number | null = null;
      ranked.forEach((item, idx) => {
        if (item.avg === null) {
          rankMap.set(item.row.enrollment_id, "—");
          return;
        }
        if (prevAvg === null || item.avg !== prevAvg) rank = idx + 1;
        prevAvg = item.avg;
        rankMap.set(item.row.enrollment_id, String(rank));
      });

      const visibleCols = suplColumns.filter((c) => c.title.trim());
      await downloadClassGradeSheetPdf({
        filiereName: selectedFiliere?.name || "",
        niveauLabel: selectedNiveau
          ? (selectedNiveau.nom?.trim() || (selectedNiveau.annee != null ? t("centre", "notesLevelNumber", { number: selectedNiveau.annee }) : null))
          : (selectedSubject.niveau_annee != null ? t("centre", "notesLevelNumber", { number: selectedSubject.niveau_annee }) : null),
        classeName: selectedGroupe.nom,
        matiereName: selectedSubject.discipline_name,
        periodLabel: selectedPeriod
          ? (selectedPeriod.parent_name ? `${selectedPeriod.parent_name} → ${selectedPeriod.name}` : selectedPeriod.name)
          : t("centre", "reportsPeriod"),
        bareme,
        coefficient: selectedSubject.coefficient,
        classAverage: classAvg !== null ? classAvg.toFixed(2) : "—",
        suplTitles: visibleCols.map((c) => c.title.trim()),
        rows: studentRows.map((r) => {
          const moy = rowAverage(r, suplColumns, subjectWeights);
          return {
            studentName: `${r.nom} ${r.prenom}`.trim(),
            principal: r.new_score.trim() || "—",
            suplScores: visibleCols.map((col) => {
              const cell = r.extras.find((ex) => ex.colKey === col.colKey && !ex.deleted);
              return cell?.score?.trim() || "—";
            }),
            average: moy !== null ? moy.toFixed(2) : "—",
            rank: rankMap.get(r.enrollment_id) || "—",
          };
        }),
        config,
        signatures,
        locale,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "notesPdfExportImpossible"));
    } finally {
      setExportingClass(false);
    }
  };

  const gridTemplate = useMemo(() => {
    const supl = suplColumns.map(() => "6.5rem").join(" ");
    return `minmax(0,1.6fr) 7rem ${supl ? `${supl} ` : ""}5.5rem 2.5rem`;
  }, [suplColumns]);

  const resetToFilieres = () => {
    setSelectedFiliereId("");
    setSelectedNiveauId("");
    setSelectedGroupeId("");
    setSelectedSubjectId("");
    setSelectedPeriodId("");
    setStudentRows([]);
    setSuplColumns([]);
    setSearch("");
    setSubjectQuery("");
    setSubjectMenuOpen(false);
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  if (isTcfCanadaCenter(centerType)) {
    return (
      <div className={`${centerNotoSans.className} min-h-[100dvh] flex items-center justify-center p-12 text-center`} style={{ backgroundColor: PAGE_BG }}>
        <div>
          <p className="text-sm font-semibold text-neutral-500">
            {t("centre", "notesTcfUnavailable")}
          </p>
          <a href="/centre/examens/examensuniversels" className="mt-4 inline-block text-xs font-bold uppercase tracking-wider hover:underline" style={{ color: ORANGE }}>
            {t("centre", "notesBackToExams")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`${centerNotoSans.className} min-h-[100dvh] flex flex-col h-screen overflow-hidden text-[#11224E]`} style={{ backgroundColor: PAGE_BG }}>
      <header className="shrink-0 border-b border-black/[0.06] z-30" style={{ backgroundColor: PAGE_BG }}>
        <div className="nexa-center-shell h-[68px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedFiliereId ? (
              <button
                type="button"
                onClick={resetToFilieres}
                className="h-9 w-9 rounded-lg border border-black/[0.08] bg-white hover:bg-black/[0.03] text-neutral-500 transition-colors shrink-0 inline-flex items-center justify-center"
                aria-label={t("centre", "notesBackToPrograms")}
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <a
                href="/centre/examens/examensuniversels"
                className="h-9 w-9 rounded-lg border border-black/[0.08] bg-white hover:bg-black/[0.03] text-neutral-500 transition-colors shrink-0 inline-flex items-center justify-center"
                aria-label={t("centre", "financeBack")}
              >
                <ArrowLeft size={16} />
              </a>
            )}
            <div className="min-w-0 flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate" style={{ color: BLUE }}>
                {selectedFiliere ? selectedFiliere.name : t("centre", "notesChooseProgram")}
              </h1>
              {selectedFiliere && <ProgrammeTypeBadge type={selectedFiliere.type} />}
            </div>
          </div>

          {contextReady && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {saveSuccess && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-600">
                  <CheckCircle2 size={12} /> {t("centre", "notesSavedLocked")}
                </span>
              )}
              {dirtyCount > 0 && !notesLocked && (
                <span className="text-[10px] font-semibold text-neutral-500">{t("centre", "notesModifiedCount", { count: String(dirtyCount) })}</span>
              )}
              <button
                type="button"
                onClick={exportClassPdf}
                disabled={exportingClass || studentRows.length === 0}
                className="h-8 px-3 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white text-neutral-700 flex items-center gap-1.5 disabled:opacity-40 hover:bg-black/[0.03]"
              >
                {exportingClass ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {t("centre", "notesExport")}
              </button>
              <button
                onClick={saveAll}
                disabled={saving || dirtyCount === 0 || notesLocked}
                className="h-8 px-3.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ORANGE }}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {t("centre", "identitySave")}
              </button>
            </div>
          )}
        </div>

        {selectedFiliereId && (
          <div className="nexa-center-shell pb-2.5 flex items-center gap-2 flex-wrap">
            {niveaux.length > 0 && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{t("centre", "planningLevel")}</span>
                {niveaux.map((n) => (
                  <FilterPill
                    key={n.id}
                    active={selectedNiveauId === n.id}
                    onClick={() => {
                      setSelectedNiveauId(n.id);
                      setSelectedGroupeId("");
                      setSelectedSubjectId("");
                      setSelectedPeriodId("");
                      setStudentRows([]);
                      setSuplColumns([]);
                      setSubjectQuery("");
                      setSubjectMenuOpen(false);
                    }}
                  >
                    {n.nom?.trim() || (n.annee != null ? t("centre", "notesLevelAbbrNumber", { number: n.annee }) : n.mois != null ? t("centre", "notesMonthsAbbr", { count: n.mois }) : t("centre", "planningLevel"))}
                  </FilterPill>
                ))}
              </div>
            )}

            {(selectedNiveauId || niveaux.length === 0) && (
              <>
                {niveaux.length > 0 && <span className="w-px h-4 bg-black/[0.08] shrink-0" />}
                <div className="flex gap-1 flex-wrap items-center">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{t("centre", "identityClass")}</span>
                  {groupes.length === 0 ? (
                    <span className="text-[10px] text-neutral-400 italic">{t("centre", "notesNoClass")}</span>
                  ) : (
                    groupes.map((g) => (
                      <FilterPill
                        key={g.id}
                        active={selectedGroupeId === g.id}
                        onClick={() => {
                          setSelectedGroupeId(g.id);
                          setSelectedSubjectId("");
                          setStudentRows([]);
                          setSuplColumns([]);
                          setSubjectQuery("");
                          setSubjectMenuOpen(false);
                        }}
                      >
                        {g.nom}
                      </FilterPill>
                    ))
                  )}
                </div>
              </>
            )}

            {selectedGroupeId && (
              <>
                <span className="w-px h-4 bg-black/[0.08] shrink-0" />
                <div className="relative min-w-[200px] max-w-xs flex-1" ref={subjectPickerRef}>
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    {t("centre", "planningSubject")}
                  </span>
                  {subjectsForContext.length === 0 ? (
                    <span className="text-[10px] text-neutral-400 italic">{t("centre", "notesNoSubject")}</span>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSubjectMenuOpen((o) => !o)}
                        className="w-full h-8 px-2.5 rounded-lg border border-black/[0.08] bg-white text-left text-xs font-semibold text-[#11224E] flex items-center justify-between gap-2 hover:border-[#11224E]/30"
                      >
                        <span className="truncate">
                          {selectedSubject?.discipline_name || t("centre", "notesSearchSubjectPlaceholder")}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 shrink-0 tabular-nums">
                          {subjectsForContext.length}
                        </span>
                      </button>
                      {subjectMenuOpen && (
                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 rounded-xl border border-black/[0.08] bg-white shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-black/[0.06]">
                            <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-black/[0.06]" style={{ backgroundColor: SURFACE }}>
                              <Search size={13} className="text-neutral-400 shrink-0" />
                              <input
                                autoFocus
                                value={subjectQuery}
                                onChange={(e) => setSubjectQuery(e.target.value)}
                                placeholder={t("centre", "notesFilterSubjectsPlaceholder")}
                                className="flex-1 bg-transparent text-xs outline-none font-medium"
                              />
                            </div>
                          </div>
                          <ul className="max-h-52 overflow-y-auto py-1">
                            {filteredSubjectsForPicker.length === 0 ? (
                              <li className="px-3 py-2.5 text-xs text-neutral-400">{t("centre", "notesNoSubjectFound")}</li>
                            ) : (
                              filteredSubjectsForPicker.map((s) => {
                                const active = selectedSubjectId === s.filiere_matiere_id;
                                return (
                                  <li key={s.filiere_matiere_id}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSubjectId(s.filiere_matiere_id);
                                        setStudentRows([]);
                                        setSuplColumns([]);
                                        setSubjectQuery("");
                                        setSubjectMenuOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                                        active
                                          ? "bg-[#11224E]/[0.06] text-[#11224E]"
                                          : "text-neutral-700 hover:bg-black/[0.03]"
                                      }`}
                                    >
                                      {s.discipline_name}
                                    </button>
                                  </li>
                                );
                              })
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedGroupeId && selectedSubjectId && (
              <>
                <span className="w-px h-4 bg-black/[0.08] shrink-0" />
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-neutral-400" />
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-700 outline-none focus:border-[#11224E]/40"
                  >
                    <option value="">{t("centre", "notesPeriodEllipsis")}</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.parent_name ? `${p.parent_name} → ` : ""}{p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        {!contextReady && (
          <div className="nexa-center-shell py-6 sm:py-8">
            <p className="text-sm text-neutral-500 font-medium mb-5">
              {selectedFiliereId
                ? t("centre", "notesProgramSelectedHelp")
                : t("centre", "notesSelectProgramHelp")}
            </p>
            {filieres.length === 0 ? (
              <div className="text-center py-16 text-neutral-400">
                <GitBranch size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-wider">{t("centre", "notesNoProgramSubject")}</p>
                {userRole === "trainer" && (
                  <p className="text-[11px] text-neutral-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    {t("centre", "notesNoSubjectAssigned")}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 max-w-4xl">
                {filieres.map((f) => {
                  const count = countUniqueMatieres(allSubjects, f.id);
                  const selected = selectedFiliereId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFiliereId(f.id);
                        setSelectedNiveauId("");
                        setSelectedGroupeId("");
                        setSelectedSubjectId("");
                        setSelectedPeriodId("");
                        setStudentRows([]);
                        setSuplColumns([]);
                        setSubjectQuery("");
                        setSubjectMenuOpen(false);
                      }}
                      className={`text-left rounded-xl border p-5 transition-all ${
                        selected
                          ? "border-[#eb670e]/50 shadow-[0_0_0_1px_rgba(235,103,14,0.12)]"
                          : "border-black/[0.08] hover:border-black/[0.16]"
                      }`}
                      style={{ backgroundColor: selected ? "#FFF5EE" : "#fff" }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <ProgrammeTypeBadge type={f.type} />
                        {selected && (
                          <span className="w-5 h-5 rounded-full border-2 border-[#eb670e]/70 bg-[#eb670e] flex items-center justify-center shrink-0">
                            <CheckCircle2 size={12} className="text-white" />
                          </span>
                        )}
                      </div>
                      <p className="text-base font-extrabold tracking-tight mb-2" style={{ color: BLUE }}>{f.name}</p>
                      <p className="text-[11px] font-semibold text-neutral-500 tabular-nums">
                        {t("centre", count === 1 ? "notesSubjectCountOne" : "notesSubjectCountMany", { count })}
                      </p>
                      <p className="text-[11px] font-semibold text-neutral-600 tabular-nums mt-0.5">
                        {t("centre", f.student_count === 1 ? "notesLearnerCountOne" : "notesLearnerCountMany", { count: f.student_count })}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedFiliereId && !selectedGroupeId && filieres.length > 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-neutral-400">
                <Users size={32} className="mb-2.5 opacity-40" />
                <p className="text-xs font-semibold uppercase tracking-wider">
                  {niveaux.length > 0 && !selectedNiveauId
                    ? t("centre", "notesChooseLevelThenClass")
                    : t("centre", "planningChooseClass")}
                </p>
              </div>
            )}

            {selectedFiliereId && selectedGroupeId && !selectedPeriodId && (
              <div className="flex flex-col items-center justify-center py-14 text-neutral-400">
                <Calendar size={32} className="mb-2.5 opacity-40" />
                <p className="text-xs font-semibold uppercase tracking-wider">
                  {subjectsForContext.length === 0
                    ? t("centre", "notesNoSubjectForLevel")
                    : t("centre", "notesChooseSubjectAndPeriod")}
                </p>
              </div>
            )}
          </div>
        )}

        {contextReady && (
          <div className="nexa-center-shell py-4 sm:py-5 max-w-6xl w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 h-9 bg-white rounded-lg border border-black/[0.08] px-3 focus-within:border-[#11224E]/40 focus-within:ring-2 focus-within:ring-[#11224E]/10 transition-colors min-w-[200px] flex-1 max-w-sm">
                <Search size={14} className="text-neutral-400 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("centre", "notesSearchStudentPlaceholder")}
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[10px]">
                <div className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white flex items-center gap-2 font-semibold text-neutral-600">
                  <Users size={12} className="text-neutral-400" />
                  {filledCount}/{studentRows.length} {t("centre", "notesGraded")}
                  <span className="text-neutral-300">·</span>
                  <span style={{ color: BLUE }}>{completionPct}%</span>
                </div>
                {notesLocked ? (
                  <button
                    type="button"
                    onClick={() => { setNotesLocked(false); setSaveSuccess(false); }}
                    className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-black/[0.03] flex items-center gap-1.5"
                  >
                    <Lock size={11} /> {t("centre", "planningEdit")}
                  </button>
                ) : (
                  <span className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                    <Pencil size={11} /> {t("centre", "notesEditing")}
                  </span>
                )}
                {canEditMeta && (
                  <button
                    type="button"
                    onClick={openFormulaEditor}
                    className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-black/[0.03]"
                  >
                    {t("centre", "notesFormula")}
                  </button>
                )}
                {canEditMeta ? (
                  metaLocked ? (
                    <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-black/[0.08] bg-white">
                      <Lock size={11} className="text-neutral-400" />
                      <span className="font-bold text-neutral-600">/{bareme}</span>
                      <span className="text-neutral-300">·</span>
                      <span className="font-bold text-neutral-600">×{selectedSubject?.coefficient ?? 1}</span>
                      <button
                        type="button"
                        onClick={() => setMetaLocked(false)}
                        className="ml-1 h-6 px-2 rounded-md bg-neutral-100 text-[10px] font-bold uppercase text-neutral-600 hover:bg-neutral-200 flex items-center gap-1"
                      >
                        <Pencil size={10} /> {t("centre", "notesScale")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-neutral-400 font-bold">{t("centre", "notesScale")}</span>
                      <input
                        type="number"
                        min={1}
                        value={editMaxScore}
                        onChange={(e) => setEditMaxScore(e.target.value)}
                        className="w-14 h-8 px-2 rounded-full border bg-white text-xs font-black text-center outline-none"
                      />
                      <span className="text-neutral-400 font-bold">{t("centre", "notesCoeff")}</span>
                      <input
                        type="number"
                        min={0.25}
                        step={0.25}
                        value={editCoefficient}
                        onChange={(e) => setEditCoefficient(e.target.value)}
                        className="w-14 h-8 px-2 rounded-full border bg-white text-xs font-black text-center outline-none"
                      />
                      <button
                        type="button"
                        onClick={saveSubjectMeta}
                        disabled={savingMeta}
                        className="h-8 px-3 rounded-full text-[10px] font-black uppercase text-white disabled:opacity-40"
                        style={{ backgroundColor: ORANGE }}
                      >
                        {savingMeta ? <Loader2 size={12} className="animate-spin" /> : t("centre", "studentsValidate")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMaxScore(String(selectedSubject?.max_score || 20));
                          setEditCoefficient(String(selectedSubject?.coefficient || 1));
                          setMetaLocked(true);
                        }}
                        className="h-8 px-3 rounded-full border border-neutral-200 text-[10px] font-black uppercase text-neutral-500"
                      >
                        {t("centre", "identityCancel")}
                      </button>
                    </div>
                  )
                ) : (
                  <span className="font-bold text-neutral-500">/{bareme} · ×{selectedSubject?.coefficient ?? 1}</span>
                )}
                {classAvg !== null && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span className={`font-black ${scoreToneTextClass(scoreTone(classAvg, bareme))}`}>
                      {t("centre", "notesClassAverage", { avg: classAvg.toFixed(2), scale: bareme })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {formulaOpen && canEditMeta && (
              <div className="mb-3 p-3 bg-white border border-neutral-200 rounded-xl shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="text-[11px] font-black truncate" style={{ color: BLUE }}>
                    {t("centre", "notesFormulaTitle", { name: selectedSubject?.discipline_name || "" })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormulaOpen(false)}
                    className="shrink-0 text-[9px] font-black uppercase text-neutral-400 hover:text-neutral-600"
                  >
                    {t("centre", "bulletinClose")}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormulaMode("simple")}
                    className={`h-7 px-2.5 rounded-full text-[9px] font-black uppercase border ${
                      formulaMode === "simple"
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-200"
                    }`}
                  >
                    {t("centre", "notesFormulaSimple")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormulaMode("weighted")}
                    className={`h-7 px-2.5 rounded-full text-[9px] font-black uppercase border ${
                      formulaMode === "weighted"
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-200"
                    }`}
                  >
                    {t("centre", "notesWeighted")}
                  </button>
                  {formulaMode === "weighted" && (
                    <span
                      className={`ml-auto text-[10px] font-black ${
                        formulaSumOk ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {formulaSum.toFixed(formulaSum % 1 === 0 ? 0 : 1)}/100
                      {!formulaSumOk && formulaSum < 100
                        ? ` · ${t("centre", "notesRemaining", { amount: (100 - formulaSum).toFixed(1) })}`
                        : !formulaSumOk
                          ? ` · +${(formulaSum - 100).toFixed(1)}`
                          : ""}
                    </span>
                  )}
                </div>
                {formulaMode === "weighted" && (
                  <div className="flex flex-wrap gap-1.5">
                    {formulaKeys.map(({ key, label }) => (
                      <div
                        key={key}
                        className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-neutral-200 bg-neutral-50 pl-2 pr-1"
                      >
                        <span className="text-[10px] font-bold text-neutral-600 max-w-[7rem] truncate">
                          {label}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formulaDraft[key] ?? ""}
                          onChange={(e) => setFormulaWeight(key, e.target.value)}
                          className="w-12 h-6 px-1 rounded border border-neutral-200 bg-white text-center text-[11px] font-black outline-none focus:border-orange-400"
                          aria-label={`${t("centre", "notesWeightOf")} ${label}`}
                        />
                        <span className="text-[9px] font-black text-neutral-400 pr-1">%</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={saveFormula}
                    disabled={savingFormula || !formulaCanSave}
                    className="h-8 px-3 rounded-full text-[9px] font-black uppercase text-white disabled:opacity-40"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {savingFormula ? <Loader2 size={11} className="animate-spin inline" /> : t("centre", "accountSave")}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            {gridLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={24} className="animate-spin text-neutral-300" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                <Users size={36} className="mb-3 opacity-40" />
                <p className="text-xs font-semibold uppercase tracking-wider">
                  {studentRows.length === 0
                    ? t("centre", "notesNoStudentInClass")
                    : t("centre", "notesNoSearchResult")}
                </p>
                {studentRows.length === 0 && (
                  <p className="text-[11px] text-neutral-400 mt-2 max-w-sm text-center">
                    {t("centre", "notesCheckActiveEnrollments")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {notesLocked && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-4 py-2.5">
                    <p className="text-xs font-medium text-neutral-500 inline-flex items-center gap-1.5">
                      <Lock size={13} className="text-neutral-400" />
                      {t("centre", "notesLockedClickEdit")}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setNotesLocked(false); setSaveSuccess(false); }}
                      className="h-8 px-3 rounded-lg border border-black/[0.08] bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-black/[0.03] flex items-center gap-1.5"
                    >
                      <Pencil size={11} /> {t("centre", "planningEdit")}
                    </button>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addSuplColumn}
                    disabled={notesLocked}
                    className="h-8 px-3 rounded-lg border border-dashed border-black/[0.12] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-black/[0.02] bg-white disabled:opacity-40 disabled:pointer-events-none text-neutral-600"
                  >
                    <Plus size={13} /> {t("centre", "notesAddExtraGrade")}
                  </button>
                </div>
              <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden shadow-sm max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-auto">
                <div className="min-w-[640px]">
                  <div
                    className="grid gap-2 px-4 py-2.5 border-b border-black/[0.06] items-end sticky top-0 z-10"
                    style={{ gridTemplateColumns: gridTemplate, backgroundColor: SURFACE }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 pb-1.5">{t("centre", "notesStudent")}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 text-center pb-1.5">
                      {t("centre", "gradesMainGrade")}
                    </span>
                    {suplColumns.map((col) => (
                      <div key={col.colKey} className="flex items-center gap-0.5 w-full">
                        <input
                          value={col.title}
                          onChange={(e) => updateColumnTitle(col.colKey, e.target.value)}
                          placeholder={t("centre", "gradesLabel")}
                          readOnly={notesLocked}
                          className={`w-full h-8 px-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide text-center outline-none focus:border-orange-400 ${
                            notesLocked
                              ? "border-black/[0.06] bg-neutral-100 text-neutral-500 cursor-not-allowed"
                              : col.title.trim()
                                ? "border-black/[0.08] bg-white text-neutral-700"
                                : "border-black/[0.08] bg-white"
                          }`}
                        />
                        {!notesLocked && (
                          <button
                            type="button"
                            onClick={() => removeSuplColumn(col.colKey)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 shrink-0"
                            title={t("centre", "notesDeleteColumn")}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 text-center pb-1.5">
                      {t("centre", "notesAverage")}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 text-center pb-1.5" title={t("centre", "notesPdfTranscript")}>
                      {t("centre", "notesPdfColumn")}
                    </span>
                  </div>

                  <div className="divide-y divide-black/[0.04]">
                    {filteredRows.map((row) => {
                      const moy = rowAverage(row, suplColumns, subjectWeights);
                      const moyTone = moy !== null ? scoreTone(moy, bareme) : "empty";
                      const isDirty = row.dirty || row.extras.some((e) => e.dirty || e.deleted);
                      return (
                        <div
                          key={row.enrollment_id}
                          className={`grid gap-2 px-4 py-2.5 items-center transition-colors ${
                            isDirty ? "bg-amber-50/50" : "hover:bg-black/[0.015]"
                          }`}
                          style={{ gridTemplateColumns: gridTemplate }}
                        >
                          <div className="min-w-0 flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: BLUE }}
                            >
                              {initials(row.nom, row.prenom)}
                            </div>
                            <p className="text-sm font-semibold truncate" style={{ color: BLUE }}>
                              {row.nom} {row.prenom}
                            </p>
                          </div>

                          <div className="flex justify-center">
                            <input
                              type="number"
                              min={0}
                              max={bareme}
                              step={0.25}
                              value={row.new_score}
                              onChange={(e) => updatePrincipal(row.enrollment_id, e.target.value)}
                              placeholder="—"
                              readOnly={notesLocked}
                              className={scoreFieldClass(row.new_score, bareme, row.dirty, notesLocked)}
                            />
                          </div>

                          {suplColumns.map((col) => {
                            const cell = row.extras.find((ex) => ex.colKey === col.colKey && !ex.deleted);
                            return (
                              <div key={col.colKey} className="flex justify-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={bareme}
                                  step={0.25}
                                  value={cell?.score || ""}
                                  onChange={(e) => updateExtraScore(row.enrollment_id, col.colKey, e.target.value)}
                                  placeholder="—"
                                  readOnly={notesLocked}
                                  className={scoreFieldClass(cell?.score || "", bareme, !!cell?.dirty, notesLocked)}
                                />
                              </div>
                            );
                          })}

                          <div className="text-center">
                            <span className={`text-sm font-black ${scoreToneTextClass(moyTone)}`}>
                              {moy !== null ? moy.toFixed(2) : "—"}
                            </span>
                            <span className="block text-[9px] text-neutral-400 font-bold">/{bareme}</span>
                          </div>

                          <div className="flex justify-center">
                            <button
                              type="button"
                              title={t("centre", "notesDownloadTranscript")}
                              onClick={() => setBulletinEnrollment({
                                id: row.enrollment_id,
                                label: selectedFiliere?.name || "",
                                niveauAnnee: selectedSubject?.niveau_annee ?? null,
                              })}
                              className="w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              </div>
            )}

            {filteredRows.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-[10px] font-bold text-neutral-400 max-w-xl leading-snug">
                  {t("centre", filteredRows.length === 1 ? "notesStudentCountOne" : "notesStudentCountMany", { count: filteredRows.length })}
                  {" — "}
                  {formulaHint}
                </p>
                <button
                  onClick={saveAll}
                  disabled={saving || dirtyCount === 0 || notesLocked}
                  className="h-9 px-4 rounded-full text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 disabled:opacity-40"
                  style={{ backgroundColor: BLUE }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {t("centre", "accountSave")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {bulletinEnrollment && (
        <BulletinDynamique
          enrollmentId={bulletinEnrollment.id}
          enrollmentLabel={bulletinEnrollment.label}
          niveauAnnee={bulletinEnrollment.niveauAnnee}
          onClose={() => setBulletinEnrollment(null)}
        />
      )}
    </div>
  );
}
