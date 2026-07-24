"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, LogOut, ChevronLeft, ChevronRight, CheckCircle2, RefreshCw } from "lucide-react";
import { seriesData } from "@/app/data/comprehension_orale";
import { supabase } from "@/app/utils/supabase";
import { logClientActivity } from "@/app/utils/client-activity";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const TOTAL_TIME = 35 * 60;

export default function QuizOralePage() {
  const router = useRouter();
  const params = useParams();
  const serieId = Number(params.id);
  const questions = seriesData[serieId] ?? [];

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [finished, setFinished] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    logClientActivity("Quiz comprehension orale ouvert", `Serie ${serieId}`, {
      serie_id: serieId,
      total_questions: questions.length,
    });
  }, [questions.length, serieId]);

  // Timer
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleFinish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [finished]);

  // Auto-play audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  }, [currentQ]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleSelect = (label: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ]: label }));
  };

  const handleAutoFill = () => {
    const filled: Record<number, string> = { ...answers };
    questions.forEach((q, i) => {
      if (!filled[i]) filled[i] = q.correctAnswer;
    });
    setAnswers(filled);
  };

  const handleFinish = useCallback(() => {
    setFinished(true);
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) score += q.points;
    });
    const total = questions.reduce((s, q) => s + q.points, 0);
    const pct = score / total;
    const level = pct >= 0.9 ? "C2" : pct >= 0.75 ? "C1" : pct >= 0.6 ? "B2" : pct >= 0.45 ? "B1" : pct >= 0.3 ? "A2" : "A1";
    const timeSpent = TOTAL_TIME - timeLeft;

    const detail = questions.map((q, i) => ({
      userAnswer: answers[i] ?? null,
      correctAnswer: q.correctAnswer,
      points: q.points,
      level: q.level,
      userText: q.options.find(o => o.label === answers[i])?.text ?? null,
      correctText: q.options.find(o => o.label === q.correctAnswer)?.text ?? null,
    }));

    // localStorage pour la page résultats (même session)
    localStorage.setItem(`co_detail_${serieId}`, JSON.stringify({ detail, timeSpent, answeredCount: Object.keys(answers).length }));
    const saved = JSON.parse(localStorage.getItem("co_results") ?? "{}");
    saved[serieId] = { score, total, level };
    localStorage.setItem("co_results", JSON.stringify(saved));
    logClientActivity("Quiz comprehension orale termine", `Serie ${serieId} - score ${score}/${total} - niveau ${level}`, {
      serie_id: serieId,
      score,
      total,
      level,
      answered_count: Object.keys(answers).length,
      time_spent: timeSpent,
    });

    // Navigation immédiate — Supabase en arrière-plan
    router.push(`/tcf-canada/comprehension/orale/${serieId}/resultat`);

    // Sauvegarde Supabase sans bloquer
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { console.error("CO upsert: no session"); return; }
      const { error } = await supabase.from("co_results").upsert({
        user_id: session.user.id,
        serie_id: serieId,
        score,
        total,
        level,
        time_spent: timeSpent,
        answered_count: Object.keys(answers).length,
        detail,
      }, { onConflict: "user_id,serie_id" });
      if (error) console.error("CO upsert error:", error);
      else console.log("CO upsert success:", { serieId, score, level });
    });
  }, [answers, questions, serieId, router, timeLeft]);

  const q = questions[currentQ];
  if (!q) return null;

  const timerPct = (timeLeft / TOTAL_TIME) * 100;
  const isLow = timeLeft < 300;

  const levelColor: Record<string, string> = {
    A1: "bg-teal-500", A2: "bg-teal-600",
    B1: "bg-blue-500", B2: "bg-indigo-500",
    C1: "bg-purple-500", C2: "bg-orange-500",
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#FFFBF7] text-neutral-900 overflow-hidden">

      {/* ══ BARRE MOBILE TOP (visible seulement sur mobile) ══ */}
      <div className="md:hidden bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white" />
          <span className={`text-xl font-black tracking-tight ${isLow ? "text-red-200" : "text-white"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <div className="flex-1 mx-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${isLow ? "bg-red-400" : "bg-white"}`} style={{ width: `${timerPct}%` }} />
        </div>
        <button onClick={() => setShowQuitModal(true)} className="text-white/80 hover:text-white">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* ══════════════════════════════════════
          PANNEAU GAUCHE (desktop uniquement)
      ══════════════════════════════════════ */}
      <div className="hidden md:flex w-[340px] shrink-0 flex-col border-r border-neutral-200 bg-white overflow-hidden">

        {/* Timer */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 px-5 pt-5 pb-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`text-3xl font-black tracking-tight ${isLow ? "text-red-200" : "text-white"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-3">Temps restant</p>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${isLow ? "bg-red-400" : "bg-white"}`} style={{ width: `${timerPct}%` }} />
          </div>
        </div>

        {/* Remplir automatiquement */}
        <div className="px-4 py-3 border-b border-neutral-100">
          <button onClick={handleAutoFill} className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold py-2.5 rounded-lg transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Remplir automatiquement
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 py-3 flex-1 overflow-y-auto">
          <p className="text-xs font-bold text-neutral-700 mb-3">Navigation des questions</p>
          <div className="grid grid-cols-7 gap-2">
            {questions.map((_, i) => {
              const isCurrent = i === currentQ;
              const isAnswered = !!answers[i];
              return (
                <button key={i} onClick={() => setCurrentQ(i)}
                  className={`w-full aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    isCurrent ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                    : isAnswered ? "bg-slate-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-orange-500" /><span className="text-[10px] text-neutral-500">Actuelle</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-slate-900" /><span className="text-[10px] text-neutral-500">Répondue</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-neutral-100 border border-neutral-300" /><span className="text-[10px] text-neutral-500">Non rép.</span></div>
          </div>
        </div>

        {/* Quitter */}
        <div className="px-4 py-3 border-t border-neutral-100">
          <button onClick={() => setShowQuitModal(true)} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 text-xs font-bold py-2.5 rounded-lg transition-all">
            <LogOut className="w-3.5 h-3.5" />
            Quitter l'examen
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ZONE PRINCIPALE
      ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#FFFBF7]">

        {/* Contenu */}
        <div className="flex-1 flex flex-col px-4 md:px-8 py-4 overflow-hidden min-h-0">

          {/* Badge Question — haut */}
          <div className="inline-flex items-center border-2 border-blue-500 rounded-full px-4 py-1.5 mb-3 self-start shrink-0">
            <span className="text-sm font-bold text-blue-600">Question : {currentQ + 1}</span>
          </div>

          {/* Zone centrale — image + audio + instruction */}
          <div className={`${q.image ? "flex-1 min-h-0" : "flex-1"} flex flex-col items-center justify-center gap-3 w-full`}>
            {q.image && (
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden w-full flex-1 min-h-0">
                <img src={q.image} alt={`Question ${currentQ + 1}`} className="w-full h-full object-contain" />
              </div>
            )}
            <audio ref={audioRef} controls className="rounded-lg w-full md:w-2/3 shrink-0" src={q.audio} style={{ height: 40 }} />
            <p className="text-sm font-bold text-neutral-900 text-center shrink-0">{q.instruction}</p>
          </div>

          {/* Options A / B / C / D */}
          <div className="grid grid-cols-2 gap-2 w-full pt-3 shrink-0">
            {q.options.map((opt) => {
              const selected = answers[currentQ] === opt.label;
              return (
                <button key={opt.label} onClick={() => handleSelect(opt.label)}
                  className={`flex items-center gap-3 px-3 md:px-5 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] w-full ${
                    selected ? "border-orange-500 bg-orange-50" : "border-neutral-200 bg-white hover:border-orange-300"
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border ${
                    selected ? "bg-orange-500 text-white border-orange-500" : "bg-white text-neutral-600 border-neutral-300"
                  }`}>{opt.label}</div>
                  {opt.text && <span className="text-xs md:text-sm text-neutral-700">{opt.text}</span>}
                  {selected && <CheckCircle2 className="w-4 h-4 text-orange-500 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BARRE NAVIGATION BAS ── */}
        <div className="bg-white border-t border-neutral-200 px-4 md:px-8 py-3 flex items-center justify-between shrink-0">
          <button onClick={() => setCurrentQ((p) => Math.max(0, p - 1))} disabled={currentQ === 0}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-700 border border-neutral-200 bg-white hover:bg-neutral-50 px-3 md:px-4 py-2 rounded-xl disabled:opacity-30 transition-all active:scale-95">
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black px-3 py-1 rounded-full text-white ${levelColor[q.level] ?? "bg-gray-400"}`}>{q.level}</span>
            <span className="text-xs font-bold text-neutral-500">{q.points} pts</span>
          </div>

          {currentQ < questions.length - 1 ? (
            <button onClick={() => setCurrentQ((p) => p + 1)}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 md:px-5 py-2 rounded-xl transition-all active:scale-95">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinish}
              className="flex items-center gap-1.5 text-sm font-bold text-white bg-green-500 hover:bg-green-600 px-4 md:px-5 py-2 rounded-xl transition-all active:scale-95">
              Terminer <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Modal confirmation quitter */}
      {showQuitModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 w-full max-w-sm">
            <div className="flex items-start justify-between mb-3">
              <h2 className={STUDENT_TEXT.cardTitle} style={{ color: BRAND.blue }}>Quitter l'examen ?</h2>
              <button onClick={() => setShowQuitModal(false)} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            </div>
            <p className="text-sm text-neutral-500 mb-6">
              Votre progression ne sera pas sauvegardée. Vous devrez recommencer l'examen depuis le début.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitModal(false)}
                className="flex-1 border border-neutral-200 text-neutral-700 font-bold text-sm py-2.5 rounded-xl hover:bg-neutral-50 transition-all"
              >
                Continuer l'examen
              </button>
              <button
                onClick={() => router.push(`/tcf-canada/comprehension/orale`)}
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
