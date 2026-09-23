"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Layers } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  passageDecisionLabel,
  type PassageDecision,
} from "@/app/utils/cursus-passage";

const BLUE = "#11224E";
const ORANGE = "#eb670e";
const SURFACE = "#F7F7F6";

const FIELD_LABEL = "text-sm font-semibold text-neutral-600 block mb-1.5";
const FIELD_INPUT =
  "w-full h-12 px-4 rounded-lg border border-black/[0.08] bg-white font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";

type Preview = {
  enrollment_id: string;
  status: string;
  passage_decision: PassageDecision | null;
  passage_reason: string | null;
  academic_year: string | null;
  proposed_academic_year: string;
  niveau_annee: number | null;
  seuil_passage: number | null;
  moyenne: number | null;
  suggestion: "admis" | "redouble" | "ajourne" | null;
  has_next_niveau: boolean;
  can_decide: boolean;
  can_reopen_ajourne: boolean;
  provisional_grades_count?: number;
  lmd?: { level: { totalCredits: number; acquiredCredits: number; pendingCount: number; failedCount: number }; debtCount: number; complete: boolean } | null;
  progression_semesters?: { admis: { id: string; nom: string | null; ordre: number }[]; redouble: { id: string; nom: string | null; ordre: number }[] } | null;
};

type Props = {
  enrollmentId: string;
  onDone: () => void;
};

export default function PassageNiveauPanel({ enrollmentId, onDone }: Props) {
  const { locale, t } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [reason, setReason] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [targetSemesters, setTargetSemesters] = useState({ admis: "", redouble: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch(
        `/api/centre/passage-niveau?enrollment_id=${encodeURIComponent(enrollmentId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "x-nexa-locale": locale,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("centre", "passageLoadError"));
      setPreview(data);
      setAcademicYear(data.proposed_academic_year || "");
      setReason("");
      setTargetSemesters({ admis: "", redouble: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "passageError"));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, locale, t]);

  useEffect(() => { load(); }, [load]);

  const decide = async (decision: PassageDecision) => {
    if (!preview?.can_decide) return;
    if (decision !== "ajourne" && preview.progression_semesters?.[decision].length && !targetSemesters[decision]) {
      setError(locale === "en" ? "Select the target semester for this decision." : "Choisissez le semestre cible pour cette décision.");
      return;
    }
    if (decision === "admis" && !preview.has_next_niveau) {
      setError(t("centre", "passageNoNextLevel"));
      return;
    }
    if ((decision === "redouble" || decision === "ajourne") && reason.trim().length < 3) {
      setError(t("centre", "passageReasonMinimum"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch("/api/centre/passage-niveau", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-nexa-locale": locale,
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          decision,
          reason: reason.trim() || undefined,
          academic_year: academicYear.trim() || undefined,
          semestre_id: decision === "ajourne" ? null : targetSemesters[decision] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("centre", "passageDecisionError"));
      setDoneMsg(
        decision === "admis"
          ? t("centre", "passageAdmittedSuccess")
          : decision === "redouble"
            ? t("centre", "passageRepeatedSuccess")
            : t("centre", "passageDeferredSuccess"),
      );
      await load();
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "passageError"));
    } finally {
      setSaving(false);
    }
  };

  const reopenAjourne = async () => {
    if (!preview?.can_reopen_ajourne) return;
    setSaving(true);
    setError("");
    setDoneMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch("/api/centre/passage-niveau", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "x-nexa-locale": locale,
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          action: "reopen",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("centre", "passageCancelDeferredError"));
      setDoneMsg(t("centre", "passageDeferredCancelled"));
      await load();
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("centre", "passageError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] gap-5 sm:gap-8 py-8 border-b border-black/[0.06] first:pt-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.06]"
            style={{ backgroundColor: SURFACE }}
          >
            <Layers size={18} style={{ color: BLUE }} />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: BLUE }}>
            {t("centre", "passageTitle")}
          </h2>
        </div>
        <div
          className="rounded-xl border border-black/[0.06] p-5 sm:p-6 flex items-center gap-2 text-sm text-neutral-400 font-medium"
          style={{ backgroundColor: SURFACE }}
        >
          <Loader2 size={14} className="animate-spin" /> {t("centre", "passageLoading")}
        </div>
      </section>
    );
  }

  if (!preview) {
    return error ? (
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] gap-5 sm:gap-8 py-8 border-b border-black/[0.06] first:pt-2">
        <div />
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      </section>
    ) : null;
  }

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] gap-5 sm:gap-8 py-8 border-b border-black/[0.06] first:pt-2">
      <div className="lg:sticky lg:top-4 self-start min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.06]"
            style={{ backgroundColor: SURFACE }}
          >
            <Layers size={18} style={{ color: BLUE }} />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: BLUE }}>
            {t("centre", "passageTitle")}
          </h2>
        </div>
        <p className="text-sm text-neutral-500 mt-3 leading-relaxed font-medium">
          {preview.lmd ? (locale === "en" ? "A proposal based on this level's UE credits. The final decision is yours." : "Une proposition fondée sur les crédits des UE du niveau. Vous confirmez la décision finale.") : t("centre", "passageDescription", { level: preview.niveau_annee != null ? ` ${preview.niveau_annee}` : "" })}
        </p>
      </div>

      <div
        className="space-y-5 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6"
        style={{ backgroundColor: SURFACE }}
      >
        {preview.lmd ? <div className="rounded-xl border border-black/[0.06] bg-white p-4 space-y-2">
          <p className="font-bold">{locale === "en" ? "Level credits" : "Crédits du niveau"} : {preview.lmd.level.acquiredCredits}/{preview.lmd.level.totalCredits}</p>
          <p className="text-sm">{preview.lmd.level.pendingCount} {locale === "en" ? "UE awaiting assessment" : "UE à évaluer"} · {preview.lmd.level.failedCount} {locale === "en" ? "failed UE" : "UE non validées"}</p>
          {preview.lmd.complete && <p className="text-sm text-emerald-700">{locale === "en" ? "All program UE validated. Review the diploma below." : "Toutes les UE du parcours sont validées. Examinez la délivrance du diplôme ci-dessous."}</p>}
        </div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "passageAverage")}</p>
            <p className="text-xl font-extrabold tracking-tight mt-1" style={{ color: BLUE }}>
              {preview.moyenne != null ? preview.moyenne.toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t("centre", "passageThreshold")}</p>
            <p className="text-xl font-extrabold tracking-tight mt-1" style={{ color: BLUE }}>
              {preview.seuil_passage != null ? preview.seuil_passage : t("centre", "passageUndefined")}
            </p>
          </div>
        </div>}

        {preview.suggestion && (
          <p className="text-sm font-medium text-neutral-600">
            {t("centre", "passageSuggestion")}{" "}
            <span
              className="font-bold"
              style={{
                color:
                  preview.suggestion === "admis"
                    ? "#059669"
                    : preview.suggestion === "ajourne"
                      ? BLUE
                      : ORANGE,
              }}
            >
              {preview.suggestion === "admis"
                ? t("centre", "studentsPassed")
                : preview.suggestion === "ajourne"
                  ? t("centre", "passageDefer")
                  : t("centre", "studentsRepeats")}
            </span>
          </p>
        )}

        {(preview.provisional_grades_count ?? 0) > 0 && !preview.passage_decision && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {locale === "en"
              ? `${preview.provisional_grades_count} provisional grade(s). Validate the session in Exams → Grades before deciding progression.`
              : `${preview.provisional_grades_count} note(s) provisoire(s). Validez la session dans Examens → Notes avant de décider le passage.`}
          </div>
        )}

        {preview.passage_decision && (
          <div className={`rounded-xl border px-4 py-3 space-y-2 ${
            preview.passage_decision === "ajourne"
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}>
            <p className={`text-sm font-semibold ${
              preview.passage_decision === "ajourne" ? "text-amber-900" : "text-emerald-900"
            }`}>
              {t("centre", "passageDecision")} {passageDecisionLabel(preview.passage_decision, locale)}
            </p>
            {preview.passage_reason && (
              <p className={`text-sm font-medium ${
                preview.passage_decision === "ajourne" ? "text-amber-800" : "text-emerald-800"
              }`}>{t("centre", "passageReason")} {preview.passage_reason}</p>
            )}
            {preview.passage_decision === "ajourne" && preview.lmd && (preview.lmd.debtCount > 0 || preview.lmd.level.failedCount > 0) && (
              <p className="text-sm font-medium text-amber-900">
                {locale === "en"
                  ? "Next step: enter retake (Rattrapage) grades on failed UE in the LMD section below, then cancel deferral when ready."
                  : "Suite : saisissez les notes de rattrapage sur les UE en échec (section LMD ci-dessous), puis annulez l'ajournement quand c'est prêt."}
              </p>
            )}
          </div>
        )}

        {preview.can_reopen_ajourne && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void reopenAjourne()}
            className="w-full h-11 rounded-lg text-sm font-semibold border border-black/[0.08] bg-white text-neutral-700 hover:bg-black/[0.03] disabled:opacity-40 transition-colors"
          >
            {t("centre", "passageEditDeferred")}
          </button>
        )}

        {preview.can_decide && (
          <>
            <div>
              <label className={FIELD_LABEL}>{t("centre", "passageAcademicYear")}</label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className={FIELD_INPUT}
                placeholder="2026-2027"
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>{t("centre", "passageReasonRequired")}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full p-4 rounded-lg border border-black/[0.08] bg-white font-medium text-sm outline-none resize-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                placeholder={t("centre", "passageReasonPlaceholder")}
              />
            </div>
            {preview.progression_semesters && (["admis", "redouble"] as const).map(decision => preview.progression_semesters![decision].length > 0 && <label key={decision} className={FIELD_LABEL}>
              {decision === "admis" ? (locale === "en" ? "Semester if admitted" : "Semestre en cas d'admission") : (locale === "en" ? "Semester if repeating" : "Semestre en cas de redoublement")}
              <select className={FIELD_INPUT} value={targetSemesters[decision]} disabled={saving} onChange={e => setTargetSemesters({ ...targetSemesters, [decision]: e.target.value })}>
                <option value="">{locale === "en" ? "Select" : "Choisir"}</option>
                {preview.progression_semesters![decision].sort((a,b) => a.ordre-b.ordre).map(s => <option key={s.id} value={s.id}>{s.nom || `${locale === "en" ? "Semester" : "Semestre"} ${s.ordre}`}</option>)}
              </select>
            </label>)}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !preview.has_next_niveau}
                onClick={() => void decide("admis")}
                className="flex-1 min-w-[6.5rem] h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#059669" }}
              >
                {t("centre", "passageAdmitNext")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void decide("redouble")}
                className="flex-1 min-w-[6.5rem] h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ORANGE }}
              >
                {t("centre", "passageRepeat")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void decide("ajourne")}
                className="flex-1 min-w-[6.5rem] h-11 rounded-lg text-sm font-semibold bg-white border border-black/[0.08] text-neutral-700 hover:bg-black/[0.03] disabled:opacity-40 transition-colors"
              >
                {t("centre", "passageDefer")}
              </button>
            </div>
            {!preview.has_next_niveau && (
              <p className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                {t("centre", "passageCreateNextLevel")}
              </p>
            )}
          </>
        )}

        {doneMsg && (
          <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {doneMsg}
          </p>
        )}
        {error && (
          <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        {saving && (
          <p className="text-sm text-neutral-400 font-medium flex items-center gap-1.5">
            <Loader2 size={14} className="animate-spin" /> {t("centre", "passageSaving")}
          </p>
        )}
      </div>
    </section>
  );
}
