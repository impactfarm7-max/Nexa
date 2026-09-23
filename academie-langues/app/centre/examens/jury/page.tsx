"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckSquare, Loader2, Layers, Scale } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  BLUE,
  SURFACE,
  ORANGE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
  CenterSelect,
} from "../../center-page-ui";
import { passageDecisionLabel, type PassageDecision } from "@/app/utils/cursus-passage";

type Filiere = { id: string; name: string; type: string };
type Niveau = { id: string; annee: number | null; nom: string | null };
type Groupe = { id: string; nom: string; niveau_id: string | null; filiere_id: string };

type JuryRow = {
  enrollment_id: string;
  student_name: string;
  matricule: string | null;
  status: string | null;
  academic_status: string | null;
  academic_readonly: boolean;
  passage_decision: string | null;
  moyenne: number | null;
  suggestion: "admis" | "redouble" | "ajourne" | null;
  lmd: { acquiredCredits: number; totalCredits: number; failedCount: number; debtCount: number } | null;
  provisional_grades_count: number;
  can_decide: boolean;
  proposed_academic_year: string;
};

export default function JuryPage() {
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState<string | null>(null);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [filiereId, setFiliereId] = useState("");
  const [niveauId, setNiveauId] = useState("");
  const [groupeId, setGroupeId] = useState("");
  const [rows, setRows] = useState<JuryRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).maybeSingle();
      if (!profile?.center_id) { setLoading(false); return; }
      const [{ data: center }, { data: fils }] = await Promise.all([
        supabase.from("centers").select("center_type").eq("id", profile.center_id).maybeSingle(),
        supabase.from("filieres").select("id, name, type").eq("center_id", profile.center_id).eq("type", "cursus").order("name"),
      ]);
      setCenterType(center?.center_type ?? null);
      setFilieres((fils || []) as Filiere[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setNiveauId("");
    setGroupeId("");
    setRows([]);
    setSelected(new Set());
    if (!filiereId) { setNiveaux([]); setGroupes([]); return; }
    (async () => {
      const [{ data: nivs }, { data: grps }] = await Promise.all([
        supabase.from("niveaux").select("id, annee, nom").eq("filiere_id", filiereId).order("annee"),
        supabase.from("groupes").select("id, nom, niveau_id, filiere_id").eq("filiere_id", filiereId).order("nom"),
      ]);
      setNiveaux((nivs || []) as Niveau[]);
      setGroupes((grps || []) as Groupe[]);
    })();
  }, [filiereId]);

  const groupesFiltered = useMemo(() => {
    if (!niveauId) return groupes;
    return groupes.filter((g) => g.niveau_id === niveauId || !g.niveau_id);
  }, [groupes, niveauId]);

  useEffect(() => {
    setGroupeId("");
    setRows([]);
    setSelected(new Set());
  }, [niveauId]);

  const loadJury = useCallback(async () => {
    if (!groupeId) return;
    setListLoading(true);
    setError("");
    setDoneMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch(
        `/api/centre/passage-niveau?groupe_id=${encodeURIComponent(groupeId)}`,
        { headers: { Authorization: `Bearer ${session.access_token}`, "x-nexa-locale": locale } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (locale === "en" ? "Unable to load jury list." : "Impossible de charger le jury."));
      setRows(data.rows || []);
      setSelected(new Set());
      const firstYear = (data.rows || []).find((r: JuryRow) => r.can_decide)?.proposed_academic_year;
      if (firstYear) setAcademicYear(firstYear);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, [groupeId, locale, t]);

  useEffect(() => {
    if (groupeId) void loadJury();
    else { setRows([]); setSelected(new Set()); }
  }, [groupeId, loadJury]);

  const decidable = rows.filter((r) => r.can_decide);
  const selectedDecidable = decidable.filter((r) => selected.has(r.enrollment_id));

  const toggleAll = () => {
    if (selectedDecidable.length === decidable.length && decidable.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(decidable.map((r) => r.enrollment_id)));
    }
  };

  const applyDecision = async (decision: PassageDecision) => {
    const targets = selectedDecidable.length > 0 ? selectedDecidable : [];
    if (!targets.length) {
      setError(locale === "en" ? "Select at least one eligible student." : "Sélectionnez au moins un apprenant éligible.");
      return;
    }
    if ((decision === "redouble" || decision === "ajourne") && reason.trim().length < 3) {
      setError(t("centre", "passageReasonMinimum"));
      return;
    }
    const label =
      decision === "admis"
        ? (locale === "en" ? "admit" : "admettre")
        : decision === "redouble"
          ? (locale === "en" ? "repeat" : "faire redoubler")
          : (locale === "en" ? "defer" : "ajourner");
    if (!window.confirm(
      locale === "en"
        ? `Confirm: ${label} ${targets.length} student(s)?`
        : `Confirmer : ${label} ${targets.length} apprenant(s) ?`,
    )) return;

    setBusy(true);
    setError("");
    setDoneMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError(t("centre", "passageSessionExpired"));
      setBusy(false);
      return;
    }

    let ok = 0;
    const errors: string[] = [];
    for (const row of targets) {
      const res = await fetch("/api/centre/passage-niveau", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-nexa-locale": locale,
        },
        body: JSON.stringify({
          enrollment_id: row.enrollment_id,
          decision,
          reason: reason.trim() || undefined,
          academic_year: academicYear.trim() || row.proposed_academic_year || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) ok += 1;
      else errors.push(`${row.student_name}: ${data.error || res.status}`);
    }

    setBusy(false);
    if (ok) setDoneMsg(locale === "en" ? `${ok} decision(s) applied.` : `${ok} décision(s) enregistrée(s).`);
    if (errors.length) setError(errors.slice(0, 5).join(" · "));
    await loadJury();
  };

  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  if (centerType !== "universite") {
    return (
      <CenterPageLayout header={<CenterPageHeader title={locale === "en" ? "Jury" : "Jury"} />}>
        <CenterPageBody>
          <p className="text-sm font-semibold text-neutral-500">
            {locale === "en" ? "Jury is available for universities only." : "Le jury est réservé aux universités."}
          </p>
          <Link href="/centre/examens/examensuniversels" className="mt-4 inline-flex text-sm font-bold" style={{ color: BLUE }}>
            ← {locale === "en" ? "Back" : "Retour"}
          </Link>
        </CenterPageBody>
      </CenterPageLayout>
    );
  }

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={locale === "en" ? "Level progression jury" : "Jury de passage"}
          actions={
            <Link
              href="/centre/examens/examensuniversels"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/[0.08] bg-white"
            >
              <ArrowLeft size={14} />
            </Link>
          }
        />
      }
    >
      <CenterPageBody>
        <p className="text-sm text-neutral-500 font-medium -mt-1 mb-4">
          {locale === "en"
            ? "Select a class, review suggestions, then admit / repeat / defer immediately."
            : "Choisissez une promo, consultez les suggestions, puis admettez / redoublez / ajournez immédiatement."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <CenterSelect
            value={filiereId}
            onChange={setFiliereId}
            label={locale === "en" ? "Program" : "Programme"}
            placeholder={locale === "en" ? "Choose…" : "Choisir…"}
            options={[
              { value: "", label: locale === "en" ? "Choose…" : "Choisir…" },
              ...filieres.map((f) => ({ value: f.id, label: f.name })),
            ]}
          />
          <CenterSelect
            value={niveauId}
            onChange={setNiveauId}
            label={locale === "en" ? "Level" : "Niveau"}
            disabled={!filiereId}
            placeholder={locale === "en" ? "All" : "Tous"}
            options={[
              { value: "", label: locale === "en" ? "All" : "Tous" },
              ...niveaux.map((n) => ({
                value: n.id,
                label: n.nom?.trim() || (n.annee != null ? `${locale === "en" ? "Year" : "Année"} ${n.annee}` : n.id),
              })),
            ]}
          />
          <CenterSelect
            value={groupeId}
            onChange={setGroupeId}
            label={locale === "en" ? "Class" : "Promotion"}
            disabled={!filiereId}
            placeholder={locale === "en" ? "Choose…" : "Choisir…"}
            options={[
              { value: "", label: locale === "en" ? "Choose…" : "Choisir…" },
              ...groupesFiltered.map((g) => ({ value: g.id, label: g.nom })),
            ]}
          />
        </div>

        {groupeId && (
          <div className="rounded-xl border border-black/[0.06] bg-white p-4 sm:p-5 space-y-4 mb-5" style={{ backgroundColor: SURFACE }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{t("centre", "passageAcademicYear")}</label>
                <input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-black/[0.08] bg-white font-semibold text-sm"
                  placeholder="2026-2027"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-600 block mb-1.5">{t("centre", "passageReasonRequired")}</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-black/[0.08] bg-white font-semibold text-sm"
                  placeholder={t("centre", "passageReasonPlaceholder")}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || selectedDecidable.length === 0}
                onClick={() => void applyDecision("admis")}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: "#059669" }}
              >
                {t("centre", "passageAdmitNext")} ({selectedDecidable.length})
              </button>
              <button
                type="button"
                disabled={busy || selectedDecidable.length === 0}
                onClick={() => void applyDecision("redouble")}
                className="h-10 px-4 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: ORANGE }}
              >
                {t("centre", "passageRepeat")} ({selectedDecidable.length})
              </button>
              <button
                type="button"
                disabled={busy || selectedDecidable.length === 0}
                onClick={() => void applyDecision("ajourne")}
                className="h-10 px-4 rounded-lg text-sm font-semibold border border-black/[0.08] bg-white disabled:opacity-40"
              >
                {t("centre", "passageDefer")} ({selectedDecidable.length})
              </button>
            </div>
          </div>
        )}

        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400 font-medium py-10">
            <Loader2 size={16} className="animate-spin" /> {locale === "en" ? "Loading…" : "Chargement…"}
          </div>
        ) : !groupeId ? (
          <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white px-4 py-12 text-center">
            <Scale className="mx-auto mb-3 opacity-30" size={28} />
            <p className="text-sm font-semibold text-neutral-500">
              {locale === "en" ? "Pick a class to open the jury board." : "Choisissez une promotion pour ouvrir le jury."}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm font-semibold text-neutral-500 py-8">
            {locale === "en" ? "No enrollments in this class." : "Aucune inscription dans cette promo."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/[0.06] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-left text-[11px] uppercase tracking-wider text-neutral-400">
                  <th className="p-3 w-10">
                    <button type="button" onClick={toggleAll} className="p-1 rounded hover:bg-black/[0.04]" title="Select">
                      <CheckSquare size={16} style={{ color: BLUE }} />
                    </button>
                  </th>
                  <th className="p-3">{locale === "en" ? "Student" : "Apprenant"}</th>
                  <th className="p-3">{locale === "en" ? "Credits / Avg" : "Crédits / Moy."}</th>
                  <th className="p-3">{locale === "en" ? "Suggestion" : "Suggestion"}</th>
                  <th className="p-3">{locale === "en" ? "Status" : "Statut"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const checked = selected.has(r.enrollment_id);
                  return (
                    <tr key={r.enrollment_id} className="border-b border-black/[0.04] last:border-0">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          disabled={!r.can_decide || busy}
                          checked={checked}
                          onChange={() => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(r.enrollment_id)) next.delete(r.enrollment_id);
                              else next.add(r.enrollment_id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <p className="font-bold" style={{ color: BLUE }}>{r.student_name || "—"}</p>
                        <p className="text-[11px] font-semibold text-neutral-400">{r.matricule || "—"}</p>
                      </td>
                      <td className="p-3 font-semibold text-neutral-700">
                        {r.lmd
                          ? `${r.lmd.acquiredCredits}/${r.lmd.totalCredits}`
                          : r.moyenne != null
                            ? r.moyenne.toFixed(2)
                            : "—"}
                        {r.provisional_grades_count > 0 && (
                          <span className="block text-[11px] text-amber-700 font-medium">
                            {r.provisional_grades_count} {locale === "en" ? "provisional" : "provisoire(s)"}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold">
                        {r.suggestion
                          ? passageDecisionLabel(r.suggestion, locale === "en" ? "en" : "fr")
                          : "—"}
                      </td>
                      <td className="p-3">
                        {r.passage_decision ? (
                          <span className="text-xs font-bold text-emerald-700">
                            {passageDecisionLabel(r.passage_decision, locale === "en" ? "en" : "fr")}
                          </span>
                        ) : r.academic_readonly ? (
                          <span className="text-xs font-bold text-neutral-400">
                            {locale === "en" ? "Read-only" : "Lecture seule"}
                          </span>
                        ) : r.can_decide ? (
                          <span className="text-xs font-bold text-neutral-500 inline-flex items-center gap-1">
                            <Layers size={12} /> {locale === "en" ? "Pending" : "En attente"}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-700">
                            {locale === "en" ? "Blocked" : "Bloqué"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {doneMsg && (
          <p className="mt-4 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {doneMsg}
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {busy && (
          <p className="mt-3 text-sm text-neutral-400 font-medium flex items-center gap-1.5">
            <Loader2 size={14} className="animate-spin" /> {t("centre", "passageSaving")}
          </p>
        )}
      </CenterPageBody>
    </CenterPageLayout>
  );
}
