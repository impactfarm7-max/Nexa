"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, Clock, RotateCcw, List, ChevronDown, ChevronUp, Award, Target } from "lucide-react";
import { catalogueSeriesCE } from "@/app/data/comprehension_ecrite/index";
import { supabase } from "@/app/utils/supabase";
import { logClientActivity } from "@/app/utils/client-activity";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const OPTION_LABELS = ["A", "B", "C", "D"];

type QuestionDetail = {
  userAnswer: number | null;
  correctAnswer: number;
  points: number;
  niveau: string;
};

type SavedDetail = {
  detail: QuestionDetail[];
  timeSpent: number;
  answeredCount: number;
};

const NCLC: Record<string, string> = {
  A1: "NCLC 4", A2: "NCLC 5-6", B1: "NCLC 7",
  B2: "NCLC 9", C1: "NCLC 10", C2: "NCLC 10+",
};

const PERF: Record<string, { label: string; msg: string; color: string }> = {
  C2: { label: "Excellent", msg: "Excellent travail ! Vous maîtrisez parfaitement cette série.", color: "text-orange-600" },
  C1: { label: "Très bien", msg: "Beau travail ! Encore un effort pour atteindre l'excellence.", color: "text-orange-500" },
  B2: { label: "Bien", msg: "Bon niveau ! Continuez à pratiquer pour viser le C1.", color: "text-amber-600" },
  B1: { label: "Passable", msg: "Des bases solides, mais des lacunes à combler. Réessayez !", color: "text-amber-500" },
  A2: { label: "Insuffisant", msg: "Des progrès sont nécessaires. Repassez les séries précédentes.", color: "text-red-500" },
  A1: { label: "Très insuffisant", msg: "Reprenez les fondamentaux. Courage, chaque essai compte !", color: "text-red-600" },
};

const LEVEL_COLOR: Record<string, string> = {
  A1: "bg-teal-100 text-teal-700",
  A2: "bg-teal-200 text-teal-800",
  B1: "bg-blue-100 text-blue-700",
  B2: "bg-indigo-100 text-indigo-700",
  C1: "bg-purple-100 text-purple-700",
  C2: "bg-orange-100 text-orange-700",
};

function formatTime(s: number) {
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m} min ${sec} sec` : `${m} min`;
}

export default function ResultatEcritPage() {
  const router = useRouter();
  const params = useParams();
  const serieId = Number(params.id);

  const [data, setData] = useState<SavedDetail | null>(null);
  const [globalResult, setGlobalResult] = useState<{ score: number; total: number; level: string } | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const questions = catalogueSeriesCE.find((s) => s.id === serieId)?.questions ?? [];

  useEffect(() => {
    // Détail des questions : localStorage uniquement (données locales à l'appareil)
    logClientActivity("Resultat comprehension ecrite consulte", `Serie ${serieId}`, { serie_id: serieId });
    const raw = localStorage.getItem(`ce_detail_${serieId}`);
    if (raw) setData(JSON.parse(raw));

    // Score global : Supabase uniquement (source de vérité par compte)
    const loadResult = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("ce_results")
        .select("score, total, level")
        .eq("user_id", session.user.id)
        .eq("serie_id", serieId)
        .single();
      if (data) setGlobalResult(data);
    };
    loadResult();
  }, [serieId]);

  if (!data || !globalResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF7]">
        <div className="h-10 w-10 rounded-full border-4 border-neutral-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  const { detail, timeSpent, answeredCount } = data;
  const { score, total, level } = globalResult;
  const pct = Math.round((score / total) * 100);
  const correctCount = detail.filter(d => d.userAnswer === d.correctAnswer).length;
  const perf = PERF[level];

  const toggleAll = () => {
    const anyOpen = Object.values(expanded).some(Boolean);
    const next = detail.reduce((acc: Record<number, boolean>, _, i) => ({ ...acc, [i]: !anyOpen }), {});
    setExpanded(next);
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-neutral-900">

      {/* ══ HEADER + CARTE NIVEAU — connectés sans espace ══ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-10 pb-32 relative overflow-hidden">
        {/* Décoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 blur-[60px] rounded-full -ml-10 -mb-10" />

        <div className="relative z-10 text-center text-white max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 px-4 py-1.5 rounded-full mb-4">
            <Award className="w-4 h-4 text-orange-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-orange-400">Série {serieId} terminée</span>
          </div>
          <h1 className={`${STUDENT_TEXT.sectionTitle} mb-1 text-white`}>
            {answeredCount} / {detail.length}
            <span className="text-neutral-400 text-xl ml-2 font-bold">questions</span>
          </h1>
          <p className="text-neutral-400 text-sm font-medium">répondues</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-20 pb-16 relative z-10">

        {/* CARTE NIVEAU — chevauche le header */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-900/20 border border-neutral-100 px-8 py-7 text-center mb-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-600 mb-2">Résultat obtenu</p>
          <p className="text-4xl font-black text-slate-900 tracking-tight mb-1">
            Niveau {level} <span className="text-orange-500">|</span> {NCLC[level]}
          </p>
          <p className="text-xl font-bold text-neutral-500">{score} / {total} points</p>

          {/* Barre de progression */}
          <div className="mt-5 h-3 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 font-bold mt-1.5">{pct}% de réussite</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xl font-black text-green-700">{correctCount}/{detail.length}</p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">Correctes</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xl font-black text-orange-700">{pct}%</p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">Réussite</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-xl font-black text-slate-700">{formatTime(timeSpent)}</p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide mt-0.5">Temps passé</p>
          </div>
        </div>

        {/* PERFORMANCE */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 mb-5">
          <p className={`text-sm font-black mb-0.5 ${perf.color}`}>{perf.label}</p>
          <p className="text-xs text-orange-700 font-medium leading-snug">{perf.msg}</p>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => router.push(`/tcf-canada/comprehension/ecrit/${serieId}/quiz`)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg"
          >
            <RotateCcw className="w-4 h-4" /> Refaire
          </button>
          <button
            onClick={() => router.push("/tcf-canada/comprehension/ecrit")}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-neutral-200 text-neutral-700 font-bold text-sm py-3.5 rounded-2xl hover:border-orange-400 hover:text-orange-600 transition-all active:scale-[0.98]"
          >
            <List className="w-4 h-4" /> Séries
          </button>
        </div>

        {/* APERÇU */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 mb-4 shadow-sm">
          <p className="text-sm font-black text-slate-900 mb-4">Aperçu des réponses</p>
          <div className="flex flex-wrap gap-2">
            {detail.map((d, i) => {
              const isCorrect = d.userAnswer === d.correctAnswer;
              const isUnanswered = d.userAnswer === null;
              return (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white ${
                    isUnanswered ? "bg-neutral-300" : isCorrect ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4">
            {[["bg-green-500","Correcte"],["bg-red-500","Incorrecte"],["bg-neutral-300","Non répondue"]].map(([bg, label]) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-semibold">
                <div className={`w-3 h-3 rounded-full ${bg}`} /> {label}
              </span>
            ))}
          </div>
        </div>

        {/* REVUE DÉTAILLÉE */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black text-slate-900">Revue détaillée</p>
            <button onClick={toggleAll} className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors">
              {Object.values(expanded).some(Boolean) ? "Masquer les réponses" : "Afficher les réponses"}
            </button>
          </div>

          <div className="space-y-2">
            {detail.map((d, i) => {
              const isCorrect = d.userAnswer === d.correctAnswer;
              const isOpen = !!expanded[i];
              const q = questions[i];
              const niveau = q?.niveau ?? d.niveau;
              const points = q ? (PERF[q.niveau] ? d.points : d.points) : d.points;
              const userLabel = d.userAnswer !== null ? OPTION_LABELS[d.userAnswer] : null;
              const correctLabel = OPTION_LABELS[d.correctAnswer];
              const userText = d.userAnswer !== null ? q?.options[d.userAnswer] : null;
              const correctText = q?.options[d.correctAnswer] ?? null;

              return (
                <div key={i} className="border border-neutral-200 rounded-2xl overflow-hidden">

                  {/* EN-TÊTE cliquable */}
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 text-left transition-all"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                      {i + 1}
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${LEVEL_COLOR[niveau]}`}>
                      {niveau}
                    </span>
                    <span className="text-xs text-neutral-400 font-semibold shrink-0">{points}pt</span>

                    <div className="flex-1 text-xs min-w-0">
                      {isCorrect ? (
                        <span className="text-green-600 font-semibold">✓ {correctLabel}. {correctText}</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-red-500 font-semibold">✗ {userLabel ? `${userLabel}. ${userText}` : "Non répondue"}</span>
                          <span className="text-green-600 font-semibold">✓ {correctLabel}. {correctText}</span>
                        </div>
                      )}
                    </div>

                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />}
                  </button>

                  {/* CONTENU DÉROULANT */}
                  {isOpen && q && (
                    <div className="border-t border-orange-200 px-4 py-4 bg-orange-50/30 space-y-4">

                      {/* Texte du document + question */}
                      <div className="relative bg-white rounded-2xl border-2 border-orange-400 shadow-sm">
                        <div className="absolute top-0 left-4 -translate-y-1/2 z-10">
                          <span className="inline-flex items-center bg-white border-2 border-orange-400 rounded-full px-3 py-0.5 text-xs font-bold text-orange-600 whitespace-nowrap">
                            Question : {i + 1}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] overflow-hidden rounded-2xl">
                          <span className="text-4xl font-black text-slate-900 uppercase -rotate-12 whitespace-nowrap select-none">NEXA</span>
                        </div>
                        <div className="relative z-10 px-5 pt-6 pb-4">
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{q.texte}</p>
                          <p className="text-sm font-black text-slate-900 pt-3 border-t border-neutral-100 mt-3">{q.question}</p>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        {q.options.map((opt, idx) => {
                          const isGoodAnswer = idx === d.correctAnswer;
                          const isWrongAnswer = idx === d.userAnswer && !isGoodAnswer;
                          const label = OPTION_LABELS[idx];

                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium ${
                                isGoodAnswer
                                  ? "bg-green-50 border-green-400 text-green-800"
                                  : isWrongAnswer
                                  ? "bg-red-50 border-red-400 text-red-700"
                                  : "bg-white border-neutral-200 text-neutral-600"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  isGoodAnswer ? "bg-green-500 text-white"
                                  : isWrongAnswer ? "bg-red-500 text-white"
                                  : "bg-neutral-100 text-neutral-500"
                                }`}>
                                  {label}
                                </span>
                                {opt}
                              </span>
                              {isGoodAnswer && (
                                <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full ml-3 shrink-0">
                                  Bonne réponse
                                </span>
                              )}
                              {isWrongAnswer && (
                                <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full ml-3 shrink-0">
                                  Votre réponse
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOUTONS BAS DE PAGE */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => router.push(`/tcf-canada/comprehension/ecrit/${serieId}/quiz`)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg"
          >
            <RotateCcw className="w-4 h-4" /> Refaire
          </button>
          <button
            onClick={() => router.push("/tcf-canada/comprehension/ecrit")}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-neutral-200 text-neutral-700 font-bold text-sm py-4 rounded-2xl hover:border-orange-400 hover:text-orange-600 transition-all active:scale-[0.98]"
          >
            <List className="w-4 h-4" /> Séries
          </button>
        </div>

      </div>
    </div>
  );
}
