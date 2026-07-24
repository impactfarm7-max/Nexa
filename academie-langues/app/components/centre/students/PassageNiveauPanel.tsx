"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Layers } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import {
  passageDecisionLabelFr,
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
  suggestion: "admis" | "redouble" | null;
  has_next_niveau: boolean;
  can_decide: boolean;
  can_reopen_ajourne: boolean;
};

type Props = {
  enrollmentId: string;
  onDone: () => void;
};

export default function PassageNiveauPanel({ enrollmentId, onDone }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [reason, setReason] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
      const res = await fetch(
        `/api/centre/passage-niveau?enrollment_id=${encodeURIComponent(enrollmentId)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chargement impossible.");
      setPreview(data);
      setAcademicYear(data.proposed_academic_year || "");
      setReason("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (decision: PassageDecision) => {
    if (!preview?.can_decide) return;
    if (decision === "admis" && !preview.has_next_niveau) {
      setError("Aucun niveau suivant configuré pour ce programme.");
      return;
    }
    if ((decision === "redouble" || decision === "ajourne") && reason.trim().length < 3) {
      setError("Indiquez un motif (3 caractères minimum).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
      const res = await fetch("/api/centre/passage-niveau", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          decision,
          reason: reason.trim() || undefined,
          academic_year: academicYear.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de la décision.");
      setDoneMsg(
        decision === "admis"
          ? "Étudiant admis au niveau suivant."
          : decision === "redouble"
            ? "Redoublement enregistré."
            : "Ajournement enregistré.",
      );
      await load();
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
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
      if (!session) throw new Error("Session expirée.");
      const res = await fetch("/api/centre/passage-niveau", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          action: "reopen",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible d'annuler l'ajournement.");
      setDoneMsg("Ajournement annulé — vous pouvez reprendre une décision.");
      await load();
      onDone();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
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
            Décision de fin de niveau
          </h2>
        </div>
        <div
          className="rounded-xl border border-black/[0.06] p-5 sm:p-6 flex items-center gap-2 text-sm text-neutral-400 font-medium"
          style={{ backgroundColor: SURFACE }}
        >
          <Loader2 size={14} className="animate-spin" /> Chargement…
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
            Décision de fin de niveau
          </h2>
        </div>
        <p className="text-sm text-neutral-500 mt-3 leading-relaxed font-medium">
          Admettre, redoubler ou ajourner selon la moyenne et le seuil du niveau
          {preview.niveau_annee != null ? ` ${preview.niveau_annee}` : ""}.
        </p>
      </div>

      <div
        className="space-y-5 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6"
        style={{ backgroundColor: SURFACE }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Moyenne /20</p>
            <p className="text-xl font-extrabold tracking-tight mt-1" style={{ color: BLUE }}>
              {preview.moyenne != null ? preview.moyenne.toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-black/[0.06] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Seuil de passage</p>
            <p className="text-xl font-extrabold tracking-tight mt-1" style={{ color: BLUE }}>
              {preview.seuil_passage != null ? preview.seuil_passage : "Non défini"}
            </p>
          </div>
        </div>

        {preview.suggestion && preview.can_decide && (
          <p className="text-sm font-medium text-neutral-600">
            Suggestion :{" "}
            <span
              className="font-bold"
              style={{ color: preview.suggestion === "admis" ? "#059669" : ORANGE }}
            >
              {preview.suggestion === "admis" ? "Admis" : "Redoublement"}
            </span>
          </p>
        )}

        {preview.passage_decision && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-emerald-900">
              Décision : {passageDecisionLabelFr(preview.passage_decision)}
            </p>
            {preview.passage_reason && (
              <p className="text-sm font-medium text-emerald-800">Motif : {preview.passage_reason}</p>
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
            Modifier / annuler l&apos;ajournement
          </button>
        )}

        {preview.can_decide && (
          <>
            <div>
              <label className={FIELD_LABEL}>Année scolaire (nouvelle inscription)</label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className={FIELD_INPUT}
                placeholder="2026-2027"
              />
            </div>
            <div>
              <label className={FIELD_LABEL}>Motif (obligatoire pour Redouble / Ajourne)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full p-4 rounded-lg border border-black/[0.08] bg-white font-medium text-sm outline-none resize-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                placeholder="Ex. moyenne insuffisante, absences, examen rattrapage…"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !preview.has_next_niveau}
                onClick={() => void decide("admis")}
                className="flex-1 min-w-[6.5rem] h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#059669" }}
              >
                Admis N+1
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void decide("redouble")}
                className="flex-1 min-w-[6.5rem] h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ORANGE }}
              >
                Redouble
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void decide("ajourne")}
                className="flex-1 min-w-[6.5rem] h-11 rounded-lg text-sm font-semibold bg-white border border-black/[0.08] text-neutral-700 hover:bg-black/[0.03] disabled:opacity-40 transition-colors"
              >
                Ajourne
              </button>
            </div>
            {!preview.has_next_niveau && (
              <p className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Créez le niveau suivant dans le programme pour pouvoir admettre.
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
            <Loader2 size={14} className="animate-spin" /> Enregistrement…
          </p>
        )}
      </div>
    </section>
  );
}
