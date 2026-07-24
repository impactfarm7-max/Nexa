"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, LogOut, ChevronLeft, ChevronRight, CheckCircle2, CheckCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { catalogueSeriesCE } from "@/app/data/comprehension_ecrite/index";
import { supabase } from "@/app/utils/supabase";
import { logClientActivity } from "@/app/utils/client-activity";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const TOTAL_TIME = 60 * 60;
const POINTS: Record<string, number> = { A1: 3, A2: 9, B1: 15, B2: 21, C1: 26, C2: 33 };
const OPTION_LABELS = ["A", "B", "C", "D"];

export default function QuizEcritPage() {
  const router = useRouter();
  const params = useParams();
  const serieId = Number(params.id);
  const questions = catalogueSeriesCE.find((s) => s.id === serieId)?.questions ?? [];

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [finished, setFinished] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);

  const q = questions[currentQ];
  const isLow = timeLeft < 5 * 60;
  const timerPct = (timeLeft / TOTAL_TIME) * 100;
  const allAnswered = Object.keys(answers).length === questions.length;

  useEffect(() => {
    logClientActivity("Quiz comprehension ecrite ouvert", `Serie ${serieId}`, {
      serie_id: serieId,
      total_questions: questions.length,
    });
  }, [questions.length, serieId]);

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleSelect = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQ]: optionIndex }));
  };

  const handleAutoFill = () => {
    const filled: Record<number, number> = { ...answers };
    questions.forEach((q, i) => {
      if (filled[i] === undefined) filled[i] = q.reponseCorrecte;
    });
    setAnswers(filled);
  };

  const handleFinish = useCallback(async () => {
    if (finished) return;
    setFinished(true);
    let score = 0;
    questions.forEach((question, i) => {
      if (answers[i] === question.reponseCorrecte) {
        score += POINTS[question.niveau] ?? 3;
      }
    });
    const total = 699;
    let level = "A1";
    if (score >= 600) level = "C2";
    else if (score >= 500) level = "C1";
    else if (score >= 400) level = "B2";
    else if (score >= 300) level = "B1";
    else if (score >= 200) level = "A2";
    const timeSpent = TOTAL_TIME - timeLeft;

    const detail = questions.map((question, i) => ({
      userAnswer: answers[i] ?? null,
      correctAnswer: question.reponseCorrecte,
      points: POINTS[question.niveau] ?? 3,
      niveau: question.niveau,
    }));

    // Détail stocké en localStorage uniquement pour l'affichage immédiat de la page résultat
    localStorage.setItem(`ce_detail_${serieId}`, JSON.stringify({ detail, timeSpent, answeredCount: Object.keys(answers).length }));

    // Sauvegarde Supabase attendue — source de vérité par compte
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("ce_results").upsert({
        user_id: session.user.id,
        serie_id: serieId,
        score,
        total,
        level,
        time_spent: timeSpent,
        answered_count: Object.keys(answers).length,
        detail,
      }, { onConflict: "user_id,serie_id" });
    }

    logClientActivity("Quiz comprehension ecrite termine", `Serie ${serieId} - score ${score}/${total} - niveau ${level}`, {
      serie_id: serieId,
      score,
      total,
      level,
      answered_count: Object.keys(answers).length,
      time_spent: timeSpent,
    });

    router.push(`/tcf-canada/comprehension/ecrit/${serieId}/resultat`);
  }, [answers, finished, questions, serieId, router, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !finished) handleFinish();
  }, [timeLeft, finished, handleFinish]);

  if (!q) return null;

  const levelColor: Record<string, string> = {
    A1: "bg-teal-500", A2: "bg-teal-600",
    B1: "bg-blue-500", B2: "bg-indigo-500",
    C1: "bg-purple-500", C2: "bg-orange-500",
  };

  /* ── Grille de navigation (partagée desktop + mobile) ── */
  const NavGrid = () => (
    <div className="grid grid-cols-8 md:grid-cols-7 gap-1.5 md:gap-2">
      {questions.map((_, i) => {
        const isCurrent = i === currentQ;
        const isAnswered = answers[i] !== undefined;
        return (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`w-full aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
              isCurrent
                ? "bg-orange-500 text-white"
                : isAnswered
                ? "bg-slate-800 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row bg-[#FFFBF7] md:h-screen md:overflow-hidden text-neutral-900" style={{ minHeight: "100dvh" }}>

      {/* ══════════════════════════════════════
          PANNEAU GAUCHE — desktop uniquement
      ══════════════════════════════════════ */}
      <div className="hidden md:flex w-85 shrink-0 flex-col border-r border-neutral-200 bg-white overflow-hidden">

        {/* Timer */}
        <div className={`px-5 pt-5 pb-4 text-white transition-colors ${isLow ? "bg-gradient-to-br from-red-500 to-orange-600" : "bg-gradient-to-br from-orange-500 to-amber-500"}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`text-3xl font-black tracking-tight ${isLow ? "animate-pulse" : ""}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mb-3">Temps restant</p>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isLow ? "bg-red-200" : "bg-white"}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>

        {/* Remplir automatiquement */}
        <div className="px-4 py-3 border-b border-neutral-100">
          <button
            onClick={handleAutoFill}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold py-2.5 rounded-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Remplir automatiquement
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <p className="text-xs font-bold text-neutral-700 mb-3">Navigation des questions</p>
          <NavGrid />

          {/* Légende */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-orange-500" />
              <span className="text-[10px] text-neutral-500">Actuelle</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-slate-800" />
              <span className="text-[10px] text-neutral-500">Répondue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-neutral-100 border border-neutral-300" />
              <span className="text-[10px] text-neutral-500">Non rép.</span>
            </div>
          </div>
        </div>

        {/* Quitter */}
        <div className="px-4 py-3 border-t border-neutral-100">
          <button
            onClick={() => setQuitOpen(true)}
            className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 text-xs font-bold py-2.5 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Quitter l'examen
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ZONE PRINCIPALE
      ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col md:overflow-hidden bg-[#FFFBF7]">

        {/* ── HEADER MOBILE uniquement ── */}
        <header className="md:hidden sticky top-0 z-40 bg-white border-b border-neutral-200 flex items-center justify-between px-4 py-3 shrink-0">
          <button
            onClick={() => setQuitOpen(true)}
            className="w-10 h-10 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-700 stroke-2" />
          </button>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-sm ${isLow ? "bg-red-50 text-red-600 animate-pulse" : "text-neutral-700"}`}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={handleAutoFill}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Auto
          </button>
        </header>

        {/* ── CONTENU MOBILE : scroll naturel du document ── */}
        <div className="md:hidden px-4 py-4">

          {/* Grille navigation mobile */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-3 mb-4 shadow-sm">
            <NavGrid />
          </div>

          {/* Document + question */}
          <div className="relative bg-white rounded-3xl border-2 border-orange-400 shadow-sm mb-4 mt-2">
            <div className="absolute top-0 left-5 -translate-y-1/2 z-10">
              <span className="inline-flex items-center bg-white border-2 border-orange-400 rounded-full px-4 py-1 text-sm font-bold text-orange-600 whitespace-nowrap">
                Question : {currentQ + 1}
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] overflow-hidden rounded-3xl">
              <span className="text-6xl font-black text-slate-900 uppercase -rotate-12 whitespace-nowrap select-none">
                NEXA
              </span>
            </div>
            <div className="relative z-10 px-5 pt-8 pb-4">
              <p className="font-medium text-slate-800 leading-relaxed text-lg whitespace-pre-wrap">
                {q.texte}
              </p>
              <p className="text-lg font-black text-slate-900 pt-4 border-t border-neutral-100 mt-4">{q.question}</p>
            </div>
          </div>

          {/* Options mobile — 1 colonne */}
          <div className="flex flex-col gap-3">
            {q.options.map((option, index) => {
              const isSelected = answers[currentQ] === index;
              const label = OPTION_LABELS[index];
              return (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] w-full ${
                    isSelected
                      ? "border-orange-500 bg-orange-50"
                      : "border-neutral-200 bg-white hover:border-orange-300"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border ${
                    isSelected
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-neutral-600 border-neutral-300"
                  }`}>
                    {label}
                  </div>
                  <span className={`text-sm leading-snug flex-1 ${isSelected ? "text-orange-900 font-semibold" : "text-slate-700"}`}>{option}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BARRE NAVIGATION BAS MOBILE ── */}
        <div className="md:hidden bg-white border-t border-neutral-200 px-4 py-3 flex items-center justify-between shrink-0 sticky bottom-0 z-30">
          <button
            onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-1.5 text-sm font-bold text-neutral-500 hover:text-neutral-900 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-xs font-bold text-neutral-400">{currentQ + 1} / {questions.length}</span>
          {allAnswered ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-700 px-5 py-2 rounded-xl transition-all active:scale-95"
            >
              Terminer <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ((p) => Math.min(questions.length - 1, p + 1))}
              disabled={answers[currentQ] === undefined || currentQ === questions.length - 1}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-700 px-5 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── CONTENU DESKTOP : split 75/25 ── */}
        {/* 75% — Document + question */}
        <div className="hidden md:block flex-3 overflow-y-auto px-8 py-6">
          <div className="relative bg-white rounded-3xl border-2 border-orange-400 shadow-sm mb-5 mt-6 h-[calc(100%-3rem)]">
            <div className="absolute top-0 left-5 -translate-y-1/2 z-10">
              <span className="inline-flex items-center bg-white border-2 border-orange-400 rounded-full px-4 py-1 text-sm font-bold text-orange-600 whitespace-nowrap">
                Question : {currentQ + 1}
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] overflow-hidden rounded-3xl">
              <span className="text-6xl font-black text-slate-900 uppercase -rotate-12 whitespace-nowrap select-none">
                NEXA
              </span>
            </div>
            <div className="relative z-10 px-8 pt-8 pb-4 h-full flex flex-col">
              <p className="font-medium text-slate-800 leading-relaxed text-lg whitespace-pre-wrap flex-1 overflow-y-auto">
                {q.texte}
              </p>
              <p className="text-lg font-black text-slate-900 pt-4 border-t border-neutral-100 mt-4 shrink-0">{q.question}</p>
            </div>
          </div>
        </div>

        {/* 25% — Options desktop */}
        <div className="hidden md:block flex-1 overflow-y-auto px-8 py-4 bg-white border-t border-neutral-200">
          <div className="grid grid-cols-2 gap-3 w-full h-full">
            {q.options.map((option, index) => {
              const isSelected = answers[currentQ] === index;
              const label = OPTION_LABELS[index];
              return (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] w-full ${
                    isSelected
                      ? "border-orange-500 bg-orange-50"
                      : "border-neutral-200 bg-neutral-50 hover:border-orange-300"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border ${
                    isSelected
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-neutral-600 border-neutral-300"
                  }`}>
                    {label}
                  </div>
                  {option && <span className="text-sm text-neutral-700 leading-snug">{option}</span>}
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-orange-500 ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BARRE NAVIGATION BAS DESKTOP ── */}
        <div className="hidden md:flex bg-white border-t border-neutral-200 px-8 py-3 items-center justify-between shrink-0">
          <button
            onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
            disabled={currentQ === 0}
            className="flex items-center gap-1.5 text-sm font-bold text-neutral-500 hover:text-neutral-900 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full text-white ${levelColor[q.niveau] ?? "bg-gray-400"}`}>
              {q.niveau}
            </span>
            <span className="text-xs font-bold text-neutral-500">{POINTS[q.niveau] ?? 3} pts</span>
          </div>

          {allAnswered ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-700 px-5 py-2 rounded-xl transition-all active:scale-95"
            >
              Terminer <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ((p) => Math.min(questions.length - 1, p + 1))}
              disabled={answers[currentQ] === undefined || currentQ === questions.length - 1}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-700 px-5 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── MODAL QUITTER ── */}
      {quitOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm">
            <div className="flex items-start justify-between mb-3">
              <h2 className={`${STUDENT_TEXT.cardTitle}`} style={{ color: BRAND.blue }}>Quitter l'examen ?</h2>
              <button onClick={() => setQuitOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>
            <p className="text-sm text-neutral-500 mb-6">
              Votre progression ne sera pas sauvegardée. Vous devrez recommencer l'examen depuis le début.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setQuitOpen(false)}
                className="flex-1 border border-neutral-200 text-neutral-700 font-bold text-sm py-2.5 rounded-xl hover:bg-neutral-50 transition-all"
              >
                Continuer l'examen
              </button>
              <button
                onClick={() => router.push(`/tcf-canada/comprehension/ecrit`)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" /> Quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
