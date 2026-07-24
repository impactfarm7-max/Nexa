"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Printer, Loader2, Download } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { fetchDocumentExportConfig, filterSignatures, type DocumentExportConfig } from "@/app/utils/documentConfig";
import { isGradeGroupPeriod, isGradeLeafPeriod } from "@/app/utils/gradePeriods";
import {
  averageGradesOnScale,
  isPrincipalGrade,
  normalizeScore,
  parseGradeWeights,
  weightedMean,
} from "@/app/utils/gradesCalc";
import { downloadBulletinNotesPdf } from "@/app/utils/centerPdfExport";
import {
  formatGradeList,
  observationFromScore20,
} from "@/app/utils/gradeObservations";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

type PeriodCol = {
  id: string;
  name: string;
  parent_name: string | null;
  type: string;
  sort_order: number;
  coefficient: number;
};

type RawGrade = {
  filiere_matiere_id: string;
  period_id: string | null;
  score: number;
  max_score: number | null;
  title: string | null;
};

type MatiereRow = {
  filiere_matiere_id: string;
  matiere_name: string;
  coefficient: number;
  max_score: number;
  grade_weights: Record<string, number> | null;
  scores: Record<string, number | null>;
  averages: Record<string, number | null>;
};

type Props = {
  enrollmentId: string;
  enrollmentLabel: string;
  niveauAnnee: number | null;
  /** Année académique inscription (ex. 2025-2026) — cursus */
  academicYear?: string | null;
  onClose: () => void;
};

export default function BulletinDynamique({
  enrollmentId,
  enrollmentLabel,
  niveauAnnee,
  academicYear = null,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [docConfig, setDocConfig] = useState<DocumentExportConfig | null>(null);
  const [signatures, setSignatures] = useState<{ id: string; label: string }[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentClasse, setStudentClasse] = useState("");
  const [periods, setPeriods] = useState<PeriodCol[]>([]);
  const [matieres, setMatieres] = useState<MatiereRow[]>([]);
  const [rawGrades, setRawGrades] = useState<RawGrade[]>([]);
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>("all");
  const [pdfBusy, setPdfBusy] = useState(false);

  const isCursus = niveauAnnee != null;

  useEffect(() => {
    (async () => {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("student_id, groupe_id, filieres(center_id), profiles:student_id(prenom, nom), groupes:groupe_id(nom)")
        .eq("id", enrollmentId)
        .single();

      const centerId = (enr as any)?.filieres?.center_id;
      const prenom = (enr as any)?.profiles?.prenom || "";
      const nom = (enr as any)?.profiles?.nom || "";
      setStudentName(`${prenom} ${nom}`.trim());
      setStudentClasse((enr as any)?.groupes?.nom || "");

      if (!centerId) { setLoading(false); return; }

      const [exportConfig, { data: sigRows }] = await Promise.all([
        fetchDocumentExportConfig(supabase, centerId),
        supabase.from("bulletin_signatures").select("id, name, title, label").eq("center_id", centerId).order("display_order"),
      ]);
      setDocConfig(exportConfig);
      setSignatures(filterSignatures(sigRows || [], exportConfig.signatureIds));

      const { data: periodData } = await supabase.rpc("get_center_periods", { p_center_id: centerId });
      const activePeriods: PeriodCol[] = (periodData || [])
        .filter((p: any) => p.is_active)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          parent_name: p.parent_name,
          type: p.type,
          sort_order: p.sort_order ?? p.position ?? 0,
          coefficient: Number(p.coefficient) > 0 ? Number(p.coefficient) : 1,
        }))
        .sort((a: PeriodCol, b: PeriodCol) => a.sort_order - b.sort_order);
      setPeriods(activePeriods);

      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("filiere_id, niveau_id")
        .eq("id", enrollmentId)
        .single();

      let fmQuery = supabase
        .from("filiere_matieres")
        .select("id, coefficient, max_score, grade_weights, exam_disciplines(name)")
        .eq("filiere_id", enrollData?.filiere_id || "");
      if (enrollData?.niveau_id) fmQuery = fmQuery.eq("niveau_id", enrollData.niveau_id);
      let { data: fmData, error: fmErr } = await fmQuery;
      if (fmErr) {
        let fb = supabase
          .from("filiere_matieres")
          .select("id, coefficient, max_score, exam_disciplines(name)")
          .eq("filiere_id", enrollData?.filiere_id || "");
        if (enrollData?.niveau_id) fb = fb.eq("niveau_id", enrollData.niveau_id);
        fmData = (await fb).data as typeof fmData;
      }

      const matiereList: MatiereRow[] = (fmData || []).map((fm: any) => ({
        filiere_matiere_id: fm.id,
        matiere_name: fm.exam_disciplines?.name || "—",
        coefficient: Number(fm.coefficient) > 0 ? Number(fm.coefficient) : 1,
        max_score: Number(fm.max_score) > 0 ? Number(fm.max_score) : 20,
        grade_weights: parseGradeWeights(fm.grade_weights),
        scores: {},
        averages: {},
      }));

      let loadedRaw: RawGrade[] = [];
      if (matiereList.length > 0) {
        const fmIds = matiereList.map((m) => m.filiere_matiere_id);
        const { data: gradeRows } = await supabase
          .from("grades")
          .select("filiere_matiere_id, period_id, score, max_score, title")
          .eq("enrollment_id", enrollmentId)
          .in("filiere_matiere_id", fmIds);

        loadedRaw = (gradeRows || []).map((g: any) => ({
          filiere_matiere_id: g.filiere_matiere_id,
          period_id: g.period_id ?? null,
          score: Number(g.score),
          max_score: g.max_score != null ? Number(g.max_score) : null,
          title: g.title ?? null,
        }));
        setRawGrades(loadedRaw);

        const notesByKey: Record<string, { score: number; max_score: number | null; title: string | null }[]> = {};
        for (const g of loadedRaw) {
          const key = `${g.filiere_matiere_id}__${g.period_id}`;
          if (!notesByKey[key]) notesByKey[key] = [];
          notesByKey[key].push({ score: g.score, max_score: g.max_score, title: g.title });
        }

        for (const m of matiereList) {
          for (const p of activePeriods.filter((x) => isGradeLeafPeriod(x.type))) {
            const key = `${m.filiere_matiere_id}__${p.id}`;
            m.scores[p.id] = averageGradesOnScale(notesByKey[key] || [], m.max_score, m.grade_weights);
          }

          for (const agg of activePeriods.filter((x) => isGradeGroupPeriod(x.type))) {
            const children = activePeriods.filter(
              (x) => isGradeLeafPeriod(x.type) && x.parent_name === agg.name,
            );
            m.averages[agg.id] = weightedMean(
              children.map((c) => ({
                value: m.scores[c.id],
                weight: c.coefficient,
              })),
            );
          }
        }
      }

      matiereList.sort((a, b) => a.matiere_name.localeCompare(b.matiere_name));
      setMatieres(matiereList);
      setLoading(false);
    })();
  }, [enrollmentId]);

  const evalPeriods = useMemo(
    () => periods.filter((p) => isGradeLeafPeriod(p.type)),
    [periods],
  );
  const aggPeriods = useMemo(
    () => periods.filter((p) => isGradeGroupPeriod(p.type)),
    [periods],
  );

  const allParentGroups = useMemo(() => {
    const groups: { parent: string | null; children: PeriodCol[] }[] = [];
    for (const ep of evalPeriods) {
      if (!ep.parent_name) continue;
      const existing = groups.find((g) => g.parent === ep.parent_name);
      if (existing) existing.children.push(ep);
      else groups.push({ parent: ep.parent_name, children: [ep] });
    }
    return groups;
  }, [evalPeriods]);

  const allOrphans = useMemo(
    () => evalPeriods.filter((ep) => !ep.parent_name),
    [evalPeriods],
  );

  /** Filtre réel : all = tout ; sinon un groupe (trimestre/semestre) */
  const { leafPeriodsForAvg, filterLabel } = useMemo(() => {
    if (selectedPeriodFilter === "all") {
      return {
        leafPeriodsForAvg: evalPeriods,
        filterLabel: evalPeriods.length > 0 ? "Toutes les périodes" : "Notation",
      };
    }
    const agg = aggPeriods.find((p) => p.id === selectedPeriodFilter);
    if (!agg) {
      return {
        leafPeriodsForAvg: evalPeriods,
        filterLabel: "Toutes les périodes",
      };
    }
    const group = allParentGroups.find((g) => g.parent === agg.name);
    const children = group?.children || evalPeriods.filter(
      (x) => isGradeLeafPeriod(x.type) && x.parent_name === agg.name,
    );
    return {
      leafPeriodsForAvg: children,
      filterLabel: agg.name,
    };
  }, [selectedPeriodFilter, allParentGroups, evalPeriods, aggPeriods]);

  const leafIdSet = useMemo(
    () => new Set(leafPeriodsForAvg.map((p) => p.id)),
    [leafPeriodsForAvg],
  );

  const gradesForMatiereInFilter = (fmId: string) => {
    if (leafPeriodsForAvg.length === 0) {
      // Formation courte / sans périodes structurées : toutes les notes de la matière
      return rawGrades.filter((g) => g.filiere_matiere_id === fmId);
    }
    if (selectedPeriodFilter === "all") {
      return rawGrades.filter(
        (g) =>
          g.filiere_matiere_id === fmId
          && (g.period_id == null || leafIdSet.has(g.period_id)),
      );
    }
    return rawGrades.filter(
      (g) => g.filiere_matiere_id === fmId && g.period_id != null && leafIdSet.has(g.period_id),
    );
  };

  const matiereOverall = (m: MatiereRow): number | null => {
    if (leafPeriodsForAvg.length > 0) {
      const byPeriod = weightedMean(
        leafPeriodsForAvg.map((p) => ({
          value: m.scores[p.id],
          weight: p.coefficient,
        })),
      );
      if (byPeriod !== null) return byPeriod;
    }
    // Fallback : moyenne directe sur les notes brutes (ex. sans période)
    return averageGradesOnScale(
      gradesForMatiereInFilter(m.filiere_matiere_id),
      m.max_score,
      m.grade_weights,
    );
  };

  const tableRows = useMemo(() => {
    return matieres.map((m) => {
      const grades = gradesForMatiereInFilter(m.filiere_matiere_id);
      const principal = grades.filter((g) => isPrincipalGrade(g.title));
      const supl = grades.filter((g) => !isPrincipalGrade(g.title));
      const finale = matiereOverall(m);
      const finale20 =
        finale === null ? null : normalizeScore(finale, m.max_score, 20);
      return {
        id: m.filiere_matiere_id,
        matiereName: m.matiere_name,
        coeffLabel: `/${m.max_score} · ×${m.coefficient}`,
        principalText: formatGradeList(principal, { withTitle: false }),
        suplText: formatGradeList(supl, { withTitle: true }),
        finaleText: finale !== null ? finale.toFixed(1) : "—",
        finale20,
        observation: observationFromScore20(finale20),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matiereOverall / filter dérivés
  }, [matieres, rawGrades, leafPeriodsForAvg, selectedPeriodFilter, leafIdSet]);

  const moyenneGenerale = weightedMean(
    matieres.map((m) => {
      const raw = matiereOverall(m);
      if (raw === null) return { value: null as number | null, weight: m.coefficient };
      return {
        value: normalizeScore(raw, m.max_score, 20),
        weight: m.coefficient,
      };
    }),
  );

  const anneeLabel =
    academicYear?.trim()
    || (isCursus
      ? `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`
      : null);

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const labelParts = [enrollmentLabel];
      if (anneeLabel) labelParts.push(anneeLabel);
      if (selectedPeriodFilter !== "all") labelParts.push(filterLabel);

      await downloadBulletinNotesPdf({
        studentName,
        enrollmentLabel: labelParts.join(" · "),
        niveauLabel: niveauAnnee != null ? `Niveau ${niveauAnnee}` : null,
        classeLabel: studentClasse || null,
        moyenneGenerale: moyenneGenerale !== null ? moyenneGenerale.toFixed(2) : "—",
        columnHeaders: ["Notes principales", "Notes supl.", "Note finale", "Observation"],
        rows: tableRows.map((r) => ({
          matiereName: r.matiereName,
          coeffLabel: r.coeffLabel,
          cells: [r.principalText, r.suplText, r.finaleText, r.observation],
        })),
        config: docConfig || undefined,
        signatures,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  const showPeriodFilter = aggPeriods.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-white max-w-[960px] w-full p-6 sm:p-8 rounded-2xl shadow-2xl my-8 relative border border-black/[0.06]"
        id="bulletin-content"
      >
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-black/[0.06]">
          <div className="flex flex-wrap items-center gap-2">
            {anneeLabel && (
              <span className="h-10 inline-flex items-center px-3 rounded-lg border border-black/[0.08] bg-[#F7F7F6] text-xs font-semibold text-neutral-600">
                {anneeLabel}
              </span>
            )}
            {showPeriodFilter ? (
              <select
                value={selectedPeriodFilter}
                onChange={(e) => setSelectedPeriodFilter(e.target.value)}
                className="h-10 px-3 rounded-lg border border-black/[0.08] bg-white text-sm font-semibold outline-none focus:border-[#11224E]/40"
              >
                <option value="all">Toutes les périodes</option>
                {aggPeriods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-semibold text-neutral-500">
                {filterLabel}
              </span>
            )}
            {selectedPeriodFilter !== "all" && (
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ORANGE }}>
                Filtré · {filterLabel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={pdfBusy}
              className="h-10 px-4 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: BLUE }}
            >
              {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Télécharger
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 px-4 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5"
              style={{ backgroundColor: ORANGE }}
            >
              <Printer size={14} /> Imprimer
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-lg bg-neutral-100 hover:bg-neutral-200 inline-flex items-center justify-center text-neutral-500"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="flex justify-between items-start border-b-2 pb-5 mb-5"
          style={{ borderColor: docConfig?.accentColor || BLUE }}
        >
          <div className="flex items-center gap-3">
            {docConfig?.showLogo && docConfig.logoUrl && (
              <img src={docConfig.logoUrl} className="w-14 h-14 rounded-xl object-cover" alt="" />
            )}
            <div>
              <h1 className="font-extrabold text-xl tracking-tight" style={{ color: BLUE }}>
                {docConfig?.legalName || "Établissement"}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: docConfig?.accentColor || ORANGE }}>
                {docConfig?.title || "Bulletin de notes"}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-neutral-500 font-medium space-y-0.5">
            {docConfig?.showAddress && docConfig.address && <p>{docConfig.address}</p>}
            {docConfig?.showPhone && docConfig.phone && <p>{docConfig.phone}</p>}
            {docConfig?.showRccm && docConfig.rccmNumber && <p>RCCM : {docConfig.rccmNumber}</p>}
            {docConfig?.showNiu && docConfig.niuNumber && <p>NIU : {docConfig.niuNumber}</p>}
          </div>
        </div>

        <div className="bg-[#F7F7F6] p-4 rounded-xl border border-black/[0.06] mb-5 flex justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Apprenant</p>
            <p className="font-extrabold text-sm tracking-tight" style={{ color: BLUE }}>{studentName}</p>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {enrollmentLabel}
              {niveauAnnee != null ? ` — Niveau ${niveauAnnee}` : ""}
              {studentClasse ? ` — ${studentClasse}` : ""}
              {selectedPeriodFilter !== "all" ? ` — ${filterLabel}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              {anneeLabel ? "Année académique" : "Période"}
            </p>
            <p className="text-xs font-bold text-neutral-700">
              {anneeLabel || filterLabel}
            </p>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium">Moy. gén. sur /20</p>
          </div>
        </div>

        <div className="overflow-x-auto mb-5">
          <table className="w-full text-left text-xs border-collapse border border-neutral-200 min-w-[640px]">
            <thead>
              <tr className="text-white text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: BLUE }}>
                <th className="p-2.5 border border-neutral-300 text-left">Matière</th>
                <th className="p-2.5 border border-neutral-300 text-left">Notes principales</th>
                <th className="p-2.5 border border-neutral-300 text-left">Notes supl.</th>
                <th className="p-2.5 border border-neutral-300 text-center whitespace-nowrap">Note finale</th>
                <th className="p-2.5 border border-neutral-300 text-left">Observation</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50/80"}>
                  <td className="p-2.5 border border-neutral-200 font-bold align-top" style={{ color: BLUE }}>
                    {r.matiereName}
                    <span className="block text-[10px] font-semibold text-neutral-400 normal-case mt-0.5">
                      {r.coeffLabel}
                    </span>
                  </td>
                  <td className="p-2.5 border border-neutral-200 font-medium text-neutral-700 align-top">
                    {r.principalText}
                  </td>
                  <td className="p-2.5 border border-neutral-200 font-medium text-neutral-700 align-top">
                    {r.suplText}
                  </td>
                  <td className="p-2.5 border border-neutral-200 text-center font-extrabold text-sm align-top" style={{ color: BLUE }}>
                    {r.finaleText}
                  </td>
                  <td className="p-2.5 border border-neutral-200 font-semibold text-neutral-700 align-top">
                    {r.observation}
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center italic text-neutral-400 font-medium">
                    Aucune matière configurée.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-100">
                <td
                  className="p-3 border border-neutral-300 text-right text-[10px] font-bold uppercase tracking-wider text-neutral-600"
                  colSpan={3}
                >
                  Moyenne générale (/20)
                  {selectedPeriodFilter !== "all" ? ` · ${filterLabel}` : ""}
                  {anneeLabel ? ` · ${anneeLabel}` : ""}
                </td>
                <td className="p-3 border border-neutral-300 text-center text-lg font-extrabold" style={{ color: BLUE }}>
                  {moyenneGenerale !== null ? moyenneGenerale.toFixed(2) : "—"}
                </td>
                <td className="p-3 border border-neutral-300 font-semibold text-neutral-700">
                  {observationFromScore20(moyenneGenerale)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap justify-around gap-6 mt-12 pt-6 text-center border-t border-black/[0.06]">
          {signatures.map((s) => (
            <div key={s.id} className="w-44">
              <p className="font-bold text-[10px] uppercase tracking-wider" style={{ color: BLUE }}>{s.label}</p>
              <div className="h-14 border-b border-dashed border-neutral-300 my-1" />
            </div>
          ))}
          {signatures.length === 0 && (
            <p className="text-[10px] text-neutral-400 italic font-medium">
              Aucune signature configurée (Paramètres → Documents).
            </p>
          )}
        </div>
        {docConfig?.footerText && (
          <p className="text-center text-[9px] text-neutral-400 mt-6 pt-4 border-t border-black/[0.06]">
            {docConfig.footerText}
          </p>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          #bulletin-content {
            margin: 0; padding: 20px; border-radius: 0; box-shadow: none;
            max-width: 100%; width: 100%;
          }
          table { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
