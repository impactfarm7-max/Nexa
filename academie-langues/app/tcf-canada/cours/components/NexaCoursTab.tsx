"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/app/utils/supabase";
import { coursSemaine1, quizSemaine1 } from "../../../data/cours_semaine1";
import LessonReader from "./LessonReader";
import { coursSemaine2, quizSemaine2 } from "../../../data/cours_semaine2";
import { coursSemaine3, quizSemaine3 } from "../../../data/cours_semaine3";
import { coursSemaine4, quizSemaine4 } from "../../../data/cours_semaine4";
import { coursSemaine5, quizSemaine5 } from "../../../data/cours_semaine5";
import {
  CheckCircle2, ArrowLeft, BookOpen,
  Target, Lock, PlayCircle, Star
} from "lucide-react";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const DAYS = ["L", "Ma", "Me", "J", "V", "S", "D"] as const;

const SEMAINES = [
  { id: 1, title: "Fondations & Stratégie", desc: "Comprendre les pièges du TCF et la méthode NEXA.", time: "Semaine 01" },
  { id: 2, title: "Maîtrise de l'Écrit", desc: "Structurez vos pensées comme un natif.", time: "Semaine 02" },
  { id: 3, title: "Compréhension Intensive", desc: "Entraînement audio et lecture rapide.", time: "Semaine 03" },
  { id: 4, title: "Module Bonus", desc: "Les Pièges Mortels, Sécuriser les derniers points.", time: "Semaine 04" },
  { id: 5, title: "Gérer son Stress", desc: "Les clés psychologiques pour réussir le TCF Canada sous pression.", time: "Semaine 05" },
];

const ALL_NEXA_MODULES = [
  ...coursSemaine1,
  ...coursSemaine2,
  ...coursSemaine3,
  ...coursSemaine4,
  ...coursSemaine5,
];

function findWeekForLesson(lessonId: number): number | null {
  if (coursSemaine1.some((c) => c.id === lessonId)) return 1;
  if (coursSemaine2.some((c) => c.id === lessonId)) return 2;
  if (coursSemaine3.some((c) => c.id === lessonId)) return 3;
  if (coursSemaine4.some((c) => c.id === lessonId)) return 4;
  if (coursSemaine5.some((c) => c.id === lessonId)) return 5;
  return null;
}

type NexaCoursTabProps = {
  initialLessonId?: string | null;
  scrollToHighlightId?: string | null;
  onScrollToHighlightDone?: () => void;
};

// Retourne le lundi de la semaine courante (pour scoper le daily tracker)
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

export default function NexaCoursTab({
  initialLessonId,
  scrollToHighlightId,
  onScrollToHighlightDone,
}: NexaCoursTabProps = {}) {
  const router = useRouter();
  const { isAdmin, isSubValid } = useSimulationLimit();
  const isTrial = !isAdmin && !isSubValid;

  // Auth
  const [userId, setUserId] = useState<string | null>(null);

  // Progression
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [week1Validated, setWeek1Validated] = useState(false);
  const [week1ValidatedAt, setWeek1ValidatedAt] = useState<number | null>(null);

  // Semaine 2
  const [week2Validated, setWeek2Validated] = useState(false);
  const [week2ValidatedAt, setWeek2ValidatedAt] = useState<number | null>(null);

  // Semaine 3
  const [week3Validated, setWeek3Validated] = useState(false);
  const [week3ValidatedAt, setWeek3ValidatedAt] = useState<number | null>(null);

  // Semaine 4
  const [week4Validated, setWeek4Validated] = useState(false);
  const [week4ValidatedAt, setWeek4ValidatedAt] = useState<number | null>(null);

  // Semaine 5
  const [week5Validated, setWeek5Validated] = useState(false);
  const [week5ValidatedAt, setWeek5ValidatedAt] = useState<number | null>(null);

  // Quiz
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizWeek, setQuizWeek] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeLesson, setActiveLesson] = useState<number | null>(null);

  // Daily tracker
  const [selectedDay, setSelectedDay] = useState<(typeof DAYS)[number]>("L");
  const [dailyData, setDailyData] = useState<Record<string, { CO?: number; CE?: number; summary?: string }>>({});
  const [isDaySaved, setIsDaySaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scoreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── CHARGEMENT INITIAL ───────────────────────────────────────────────────

  useEffect(() => {
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    setSelectedDay(DAYS[todayIndex]);
    loadUserData();
  }, []);

  useEffect(() => {
    if (!initialLessonId) return;
    const id = Number(initialLessonId);
    if (!Number.isFinite(id)) return;
    const week = findWeekForLesson(id);
    if (!week) return;
    setActiveWeek(week);
    setActiveLesson(id);
  }, [initialLessonId]);

  const loadUserData = async () => {
    setIsSyncing(true);
    try {
      // 1. Récupérer l'utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // 2. Charger la progression (user_progress)
      const { data: progress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (progress) {
        setCompletedModules(progress.completed_modules ?? []);
        setWeek1Validated(progress.week1_validated ?? false);
        setWeek1ValidatedAt(progress.week1_validated_at ?? null);
      }

      // Charger la validation semaine 2 depuis localStorage
      const w2 = localStorage.getItem(`iag_w2_${user.id}`);
      if (w2) {
        const { validated, at } = JSON.parse(w2);
        setWeek2Validated(validated);
        setWeek2ValidatedAt(at);
      }

      // Charger la validation semaine 3 depuis localStorage
      const w3 = localStorage.getItem(`iag_w3_${user.id}`);
      if (w3) {
        const { validated, at } = JSON.parse(w3);
        setWeek3Validated(validated);
        setWeek3ValidatedAt(at);
      }

      // Charger la validation semaine 4 depuis localStorage
      const w4 = localStorage.getItem(`iag_w4_${user.id}`);
      if (w4) {
        const { validated, at } = JSON.parse(w4);
        setWeek4Validated(validated);
        setWeek4ValidatedAt(at);
      }

      // Charger la validation semaine 5 depuis localStorage
      const w5 = localStorage.getItem(`iag_w5_${user.id}`);
      if (w5) {
        const { validated, at } = JSON.parse(w5);
        setWeek5Validated(validated);
        setWeek5ValidatedAt(at);
      }

      // 3. Charger le bilan journalier (daily_tracker) pour la semaine courante
      const weekStart = getWeekStart();
      const { data: dailyRows } = await supabase
        .from("daily_tracker")
        .select("day, co_score, ce_score, summary")
        .eq("user_id", user.id)
        .eq("week_start", weekStart);

      if (dailyRows) {
        const mapped: typeof dailyData = {};
        dailyRows.forEach((row: any) => {
          mapped[row.day] = {
            CO: row.co_score ?? undefined,
            CE: row.ce_score ?? undefined,
            summary: row.summary ?? undefined,
          };
        });
        setDailyData(mapped);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── SAUVEGARDE PROGRESSION ───────────────────────────────────────────────

  const saveProgress = useCallback(async (
    newModules: number[],
    w1Validated: boolean,
    w1ValidatedAt: number | null
  ) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("user_progress").upsert({
        user_id: userId,
        completed_modules: newModules,
        week1_validated: w1Validated,
        week1_validated_at: w1ValidatedAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error?.message) throw error;
    } catch (e) {
      console.error("saveProgress error:", e);
    }
  }, [userId]);

  const markAsDone = async (id: number) => {
    if (!completedModules.includes(id)) {
      const newProgress = [...completedModules, id];
      setCompletedModules(newProgress);
      await saveProgress(newProgress, week1Validated, week1ValidatedAt);
    }
    setActiveLesson(null);
  };

  // ─── SAUVEGARDE BILAN JOURNALIER ──────────────────────────────────────────

  const upsertDailyRow = async (day: string, patch: Partial<{ CO: number; CE: number; summary: string }>) => {
    if (!userId) return;
    const weekStart = getWeekStart();
    const current = dailyData[day] ?? {};
    const merged = { ...current, ...patch };
    setIsSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.from("daily_tracker").upsert({
        user_id: userId,
        day,
        week_start: weekStart,
        co_score: merged.CO ?? null,
        ce_score: merged.CE ?? null,
        summary: merged.summary ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,day,week_start" });
      if (error) throw error;
    } catch (e) {
      setSaveError("Erreur de sauvegarde. Réessayez.");
      console.error("upsertDailyRow error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoreChange = (type: "CE" | "CO", value: string) => {
    const parsed = parseInt(value) || undefined;
    setDailyData((prev) => ({
      ...prev,
      [selectedDay]: { ...prev[selectedDay], [type]: parsed },
    }));
    setIsDaySaved(false);
    // Debounce : attend 500ms d'inactivité avant d'écrire en base
    if (scoreDebounceRef.current) clearTimeout(scoreDebounceRef.current);
    scoreDebounceRef.current = setTimeout(() => {
      upsertDailyRow(selectedDay, { [type]: parsed });
    }, 500);
  };

  const handleSummaryChange = (text: string) => {
    setDailyData((prev) => ({
      ...prev,
      [selectedDay]: { ...prev[selectedDay], summary: text },
    }));
    setIsDaySaved(false);
  };

  const saveDailyLog = async () => {
    const summary = dailyData[selectedDay]?.summary;
    if (!summary) return;
    await upsertDailyRow(selectedDay, { summary });
    if (!saveError) setIsDaySaved(true);
  };

  // ─── QUIZ ─────────────────────────────────────────────────────────────────

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setScore(0);
    setQuizFinished(false);
    setShowExplanation(false);
  };

  const activeQuizQuestions = quizWeek === 1 ? quizSemaine1 : quizWeek === 2 ? quizSemaine2 : quizWeek === 3 ? quizSemaine3 : quizWeek === 4 ? quizSemaine4 : quizSemaine5;

  const handleQuizAnswer = async (index: number) => {
    const isCorrect = index === activeQuizQuestions[currentQuestion].reponseCorrecte;
    const newScore = score + (isCorrect ? 1 : 0);
    if (isCorrect) setScore(newScore);
    setShowExplanation(true);

    setTimeout(async () => {
      setShowExplanation(false);
      if (currentQuestion < activeQuizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setQuizFinished(true);
        const seuilValidation = Math.floor(activeQuizQuestions.length * 0.75);
        if (newScore >= seuilValidation) {
          const now = Date.now();
          if (quizWeek === 1) {
            setWeek1Validated(true);
            setWeek1ValidatedAt(now);
            await saveProgress(completedModules, true, now);
          } else if (quizWeek === 2) {
            setWeek2Validated(true);
            setWeek2ValidatedAt(now);
            if (userId) {
              localStorage.setItem(`iag_w2_${userId}`, JSON.stringify({ validated: true, at: now }));
            }
          } else if (quizWeek === 3) {
            setWeek3Validated(true);
            setWeek3ValidatedAt(now);
            if (userId) {
              localStorage.setItem(`iag_w3_${userId}`, JSON.stringify({ validated: true, at: now }));
            }
          } else if (quizWeek === 4) {
            setWeek4Validated(true);
            setWeek4ValidatedAt(now);
            if (userId) {
              localStorage.setItem(`iag_w4_${userId}`, JSON.stringify({ validated: true, at: now }));
            }
          } else {
            setWeek5Validated(true);
            setWeek5ValidatedAt(now);
            if (userId) {
              localStorage.setItem(`iag_w5_${userId}`, JSON.stringify({ validated: true, at: now }));
            }
          }
        }
      }
    }, 2500);
  };

  // ─── HELPERS VERROUILLAGE ─────────────────────────────────────────────────

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="text-neutral-900 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      {activeWeek && !activeLesson && !quizStarted && (
        <div className="mb-4 flex justify-end items-center gap-2">
          {(isSyncing || isSaving) && <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />}
          <button
            onClick={() => { setActiveWeek(null); setActiveLesson(null); resetQuiz(); }}
            className="text-xs font-semibold text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour à la carte
          </button>
        </div>
      )}

      <main className="pt-2 md:pt-4">

        {/* ============================================================ */}
        {/* VUE 1 : CARTE DES NIVEAUX                                    */}
        {/* ============================================================ */}
        {!activeWeek && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-5 xl:mb-7">
              <h1 className={`${STUDENT_TEXT.sectionTitle} mb-1`} style={{ color: BRAND.blue }}>
                Votre feuille de route
              </h1>
              <p className="text-slate-500 text-sm xl:text-base">Débloquez chaque niveau pour avancer.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:gap-4 2xl:gap-5 gap-3">
                {SEMAINES.map((semaine, index) => {
                  // Essai : semaines 2-6 bloquées
                  const isTrialLocked = isTrial && index > 0;

                  let isLocked = false;
                  let lockMessage = "";

                  if (isAdmin || index === 0) {
                    isLocked = false;
                  } else if (index === 1) {
                    if (!week1Validated) { isLocked = true; lockMessage = "Requis : Valider la Semaine 01"; }
                  } else if (index === 2) {
                    if (!week2Validated) { isLocked = true; lockMessage = "Requis : Valider la Semaine 02"; }
                  } else if (index === 3) {
                    if (!week3Validated) { isLocked = true; lockMessage = "Requis : Valider la Semaine 03"; }
                  } else if (index === 4) {
                    if (!week4Validated) { isLocked = true; lockMessage = "Requis : Valider la Semaine 04"; }
                  } else {
                    isLocked = true;
                    lockMessage = `Requis : Valider la Semaine 0${index}`;
                  }

                  const weekValidated = [week1Validated, week2Validated, week3Validated, week4Validated, week5Validated];
                  const isCompleted = weekValidated[index] ?? false;

                  if (isTrialLocked) {
                    return (
                      <button
                        key={semaine.id}
                        onClick={() => router.push("/paywall")}
                        className="relative w-full text-left p-4 xl:p-5 2xl:p-6 rounded-xl border border-orange-200 bg-white transition-colors overflow-hidden group hover:border-orange-400"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-600">
                            {semaine.time}
                          </span>
                          <span className="flex items-center gap-1 bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                            <Star size={8} fill="currentColor" /> Pro
                          </span>
                        </div>
                        <h3 className="text-sm font-display font-black tracking-tight leading-snug mb-1" style={{ color: BRAND.blue }}>{semaine.title}</h3>
                        <p className="text-xs line-clamp-2 text-slate-500">{semaine.desc}</p>
                        <div className="mt-2 pt-2 border-t border-orange-100">
                          <span className="text-[10px] font-semibold text-orange-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Débloquer avec un Pack
                          </span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={semaine.id}
                      disabled={isLocked}
                      onClick={() => setActiveWeek(semaine.id)}
                      className={`relative w-full text-left p-4 xl:p-5 2xl:p-6 rounded-xl border transition-colors overflow-hidden group ${
                        isLocked
                          ? "bg-orange-50/50 border-orange-200 border-dashed cursor-not-allowed"
                          : isCompleted
                            ? "bg-white border-orange-300"
                            : "bg-white border-orange-200 hover:border-orange-400"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isCompleted ? "bg-orange-500 text-white" : isLocked ? "bg-orange-50 text-orange-400" : "bg-orange-50 text-orange-700"
                        }`}>
                          {isCompleted ? "Validé" : semaine.time}
                        </span>
                        {isLocked ? <Lock className="w-4 h-4 text-orange-300" /> : isCompleted ? <CheckCircle2 className="w-4 h-4 text-orange-600" /> : <PlayCircle className="w-4 h-4 text-orange-500" />}
                      </div>
                      <h3 className={`text-sm xl:text-base 2xl:text-lg font-display font-black tracking-tight leading-snug mb-1 ${isLocked ? "text-slate-400" : ""}`} style={isLocked ? undefined : { color: BRAND.blue }}>{semaine.title}</h3>
                      <p className={`text-xs xl:text-sm line-clamp-2 ${isLocked ? "text-slate-400" : "text-slate-500"}`}>{semaine.desc}</p>
                      {isLocked && (
                        <div className="mt-2 pt-2 border-t border-orange-100">
                          <span className="text-[10px] font-semibold text-orange-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {lockMessage}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* VUE 2 : LISTE DES LEÇONS                                     */}
        {/* ============================================================ */}
        {activeWeek === 1 && !activeLesson && !quizStarted && (
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
              <div className="bg-white border border-orange-200 rounded-xl p-4 md:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-orange-500 mb-1 block">Semaine 01</span>
                  <h2 className={`${STUDENT_TEXT.cardTitle} mb-1`} style={{ color: BRAND.blue }}>Fondations & Stratégie</h2>
                  <p className="text-slate-500 text-xs max-w-sm">Validez tous les modules pour débloquer le quiz.</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg text-center shrink-0">
                  <span className="block text-base font-display font-black tracking-tight" style={{ color: BRAND.blue }}>{Math.round((completedModules.length / coursSemaine1.length) * 100)}%</span>
                  <span className="text-[10px] text-slate-500">Progression</span>
                </div>
              </div>

            <div className="space-y-3 mb-10">
              {coursSemaine1.map((cours, index) => {
                const isLocked = index > 0 && !completedModules.includes(coursSemaine1[index - 1].id);
                const isDone = completedModules.includes(cours.id);
                return (
                  <button key={cours.id} disabled={isLocked} onClick={() => setActiveLesson(cours.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left group ${isLocked ? "bg-white/60 border-orange-100 opacity-60 cursor-not-allowed" : "bg-white border-orange-200 hover:border-orange-400"}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-50 text-emerald-600" : isLocked ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-orange-500 block mb-0.5">Leçon 0{index + 1}</span>
                      <h3 className={`text-sm font-display font-black truncate ${isLocked ? "text-slate-400" : ""}`} style={isLocked ? undefined : { color: BRAND.blue }}>{cours.titre}</h3>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              disabled={completedModules.length < coursSemaine1.length}
              onClick={() => { setQuizWeek(1); setQuizStarted(true); }}
              className={`w-full p-5 rounded-xl border transition-colors flex flex-col items-center justify-center text-center ${
                completedModules.length < coursSemaine1.length
                  ? "bg-orange-50/50 border-orange-200 opacity-60 cursor-not-allowed"
                  : week1Validated
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              <Target className={`w-8 h-8 mb-2 ${week1Validated ? "text-emerald-500" : completedModules.length < coursSemaine1.length ? "text-slate-400" : "text-white"}`} />
              <h3 className="text-base font-bold mb-1">{week1Validated ? "Séquence validée" : "Quiz du boss"}</h3>
              <p className={`text-xs font-medium max-w-xs ${week1Validated ? "opacity-70" : "text-slate-400"}`}>
                {week1Validated ? "Vous avez prouvé votre niveau." : `Test final de la semaine. ${Math.floor(quizSemaine1.length * 0.75)}/${quizSemaine1.length} pour débloquer la suite.`}
              </p>
            </button>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/* VUE 2B : SEMAINE 2 — LISTE DES LEÇONS                        */}
        {/* ============================================================ */}
        {activeWeek === 2 && !activeLesson && !quizStarted && (() => {
          const sem2ModuleIds = coursSemaine2.map(c => c.id);
          const sem2CompletedCount = completedModules.filter(id => sem2ModuleIds.includes(id)).length;
          return (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
              <div className="bg-white border border-orange-200 rounded-xl p-4 md:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-orange-500 mb-1 block">Semaine 02</span>
                  <h2 className={`${STUDENT_TEXT.cardTitle} mb-1`} style={{ color: BRAND.blue }}>Maîtrise de l'Écrit</h2>
                  <p className="text-slate-500 text-xs max-w-sm">Validez tous les modules pour débloquer le quiz.</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg text-center shrink-0">
                  <span className="block text-base font-display font-black tracking-tight" style={{ color: BRAND.blue }}>{Math.round((sem2CompletedCount / coursSemaine2.length) * 100)}%</span>
                  <span className="text-[10px] text-slate-500">Progression</span>
                </div>
              </div>

              <div className="space-y-3 mb-10">
                {coursSemaine2.map((cours, index) => {
                  const isLocked = !isAdmin && index > 0 && !completedModules.includes(coursSemaine2[index - 1].id);
                  const isDone = completedModules.includes(cours.id);
                  return (
                    <button key={cours.id} disabled={isLocked} onClick={() => setActiveLesson(cours.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left group ${isLocked ? "bg-white/60 border-orange-100 opacity-60 cursor-not-allowed" : "bg-white border-orange-200 hover:border-orange-400"}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-50 text-emerald-600" : isLocked ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-orange-500 block mb-0.5">Module 0{index + 1}</span>
                        <h3 className={`text-sm font-display font-black truncate ${isLocked ? "text-slate-400" : ""}`} style={isLocked ? undefined : { color: BRAND.blue }}>{cours.titre}</h3>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!isAdmin && sem2CompletedCount < coursSemaine2.length}
                onClick={() => { setQuizWeek(2); setQuizStarted(true); }}
                className={`w-full p-5 rounded-xl border transition-colors flex flex-col items-center justify-center text-center ${
                  !isAdmin && sem2CompletedCount < coursSemaine2.length
                    ? "bg-orange-50/50 border-orange-200 opacity-60 cursor-not-allowed"
                    : week2Validated
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                <Target className={`w-8 h-8 mb-2 ${week2Validated ? "text-emerald-500" : !isAdmin && sem2CompletedCount < coursSemaine2.length ? "text-slate-400" : "text-white"}`} />
                <h3 className="text-base font-bold mb-1">{week2Validated ? "Séquence validée" : "Quiz du boss"}</h3>
                <p className={`text-xs font-medium max-w-xs ${week2Validated ? "opacity-70" : "text-slate-400"}`}>
                  {week2Validated ? "Vous avez prouvé votre niveau." : `Test final de la semaine. ${Math.floor(quizSemaine2.length * 0.75)}/${quizSemaine2.length} pour débloquer la suite.`}
                </p>
              </button>
            </motion.div>
          );
        })()}

        {/* ============================================================ */}
        {/* VUE 2C : SEMAINE 3 — LISTE DES LEÇONS                        */}
        {/* ============================================================ */}
        {activeWeek === 3 && !activeLesson && !quizStarted && (() => {
          const sem3ModuleIds = coursSemaine3.map(c => c.id);
          const sem3CompletedCount = completedModules.filter(id => sem3ModuleIds.includes(id)).length;
          return (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
              <div className="bg-white border border-orange-200 rounded-xl p-4 md:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-orange-500 mb-1 block">Semaine 03</span>
                  <h2 className={`${STUDENT_TEXT.cardTitle} mb-1`} style={{ color: BRAND.blue }}>Compréhension Intensive</h2>
                  <p className="text-slate-500 text-xs max-w-sm">Validez tous les modules pour débloquer le quiz.</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg text-center shrink-0">
                  <span className="block text-base font-display font-black tracking-tight" style={{ color: BRAND.blue }}>{Math.round((sem3CompletedCount / coursSemaine3.length) * 100)}%</span>
                  <span className="text-[10px] text-slate-500">Progression</span>
                </div>
              </div>

              <div className="space-y-3 mb-10">
                {coursSemaine3.map((cours, index) => {
                  const isLocked = !isAdmin && index > 0 && !completedModules.includes(coursSemaine3[index - 1].id);
                  const isDone = completedModules.includes(cours.id);
                  return (
                    <button key={cours.id} disabled={isLocked} onClick={() => setActiveLesson(cours.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left group ${isLocked ? "bg-white/60 border-orange-100 opacity-60 cursor-not-allowed" : "bg-white border-orange-200 hover:border-orange-400"}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-50 text-emerald-600" : isLocked ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-orange-500 block mb-0.5">Module 0{index + 1}</span>
                        <h3 className={`text-sm font-display font-black truncate ${isLocked ? "text-slate-400" : ""}`} style={isLocked ? undefined : { color: BRAND.blue }}>{cours.titre}</h3>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!isAdmin && sem3CompletedCount < coursSemaine3.length}
                onClick={() => { setQuizWeek(3); setQuizStarted(true); }}
                className={`w-full p-5 rounded-xl border transition-colors flex flex-col items-center justify-center text-center ${
                  !isAdmin && sem3CompletedCount < coursSemaine3.length
                    ? "bg-orange-50/50 border-orange-200 opacity-60 cursor-not-allowed"
                    : week3Validated
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                <Target className={`w-8 h-8 mb-2 ${week3Validated ? "text-emerald-500" : !isAdmin && sem3CompletedCount < coursSemaine3.length ? "text-slate-400" : "text-white"}`} />
                <h3 className="text-base font-bold mb-1">{week3Validated ? "Séquence validée" : "Quiz du boss"}</h3>
                <p className={`text-xs font-medium max-w-xs ${week3Validated ? "opacity-70" : "text-slate-400"}`}>
                  {week3Validated ? "Vous avez prouvé votre niveau." : `Test final de la semaine. ${Math.floor(quizSemaine3.length * 0.75)}/${quizSemaine3.length} pour débloquer la suite.`}
                </p>
              </button>
            </motion.div>
          );
        })()}

        {/* ============================================================ */}
        {/* VUE 2D : SEMAINE 4 — LISTE DES LEÇONS                        */}
        {/* ============================================================ */}
        {activeWeek === 4 && !activeLesson && !quizStarted && (() => {
          const sem4ModuleIds = coursSemaine4.map(c => c.id);
          const sem4CompletedCount = completedModules.filter(id => sem4ModuleIds.includes(id)).length;
          return (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
              <div className="bg-white border border-orange-200 rounded-xl p-4 md:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-orange-500 mb-1 block">Semaine 04</span>
                  <h2 className={`${STUDENT_TEXT.cardTitle} mb-1`} style={{ color: BRAND.blue }}>Module Bonus</h2>
                  <p className="text-slate-500 text-xs max-w-sm">Validez tous les modules pour débloquer le quiz.</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg text-center shrink-0">
                  <span className="block text-base font-display font-black tracking-tight" style={{ color: BRAND.blue }}>{Math.round((sem4CompletedCount / coursSemaine4.length) * 100)}%</span>
                  <span className="text-[10px] text-slate-500">Progression</span>
                </div>
              </div>

              <div className="space-y-3 mb-10">
                {coursSemaine4.map((cours, index) => {
                  const isLocked = !isAdmin && index > 0 && !completedModules.includes(coursSemaine4[index - 1].id);
                  const isDone = completedModules.includes(cours.id);
                  return (
                    <button key={cours.id} disabled={isLocked} onClick={() => setActiveLesson(cours.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left group ${isLocked ? "bg-white/60 border-orange-100 opacity-60 cursor-not-allowed" : "bg-white border-orange-200 hover:border-orange-400"}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-50 text-emerald-600" : isLocked ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-orange-500 block mb-0.5">Module 0{index + 1}</span>
                        <h3 className={`text-sm font-display font-black truncate ${isLocked ? "text-slate-400" : ""}`} style={isLocked ? undefined : { color: BRAND.blue }}>{cours.titre}</h3>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!isAdmin && sem4CompletedCount < coursSemaine4.length}
                onClick={() => { setQuizWeek(4); setQuizStarted(true); }}
                className={`w-full p-5 rounded-xl border transition-colors flex flex-col items-center justify-center text-center ${
                  !isAdmin && sem4CompletedCount < coursSemaine4.length
                    ? "bg-orange-50/50 border-orange-200 opacity-60 cursor-not-allowed"
                    : week4Validated
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                <Target className={`w-8 h-8 mb-2 ${week4Validated ? "text-emerald-500" : !isAdmin && sem4CompletedCount < coursSemaine4.length ? "text-slate-400" : "text-white"}`} />
                <h3 className="text-base font-bold mb-1">{week4Validated ? "Séquence validée" : "Quiz du boss"}</h3>
                <p className={`text-xs font-medium max-w-xs ${week4Validated ? "opacity-70" : "text-slate-400"}`}>
                  {week4Validated ? "Vous avez prouvé votre niveau." : `Test final de la semaine. ${Math.floor(quizSemaine4.length * 0.75)}/${quizSemaine4.length} pour débloquer la suite.`}
                </p>
              </button>
            </motion.div>
          );
        })()}

        {/* ============================================================ */}
        {/* VUE 2E : SEMAINE 5 — LISTE DES LEÇONS                        */}
        {/* ============================================================ */}
        {activeWeek === 5 && !activeLesson && !quizStarted && (() => {
          const sem5ModuleIds = coursSemaine5.map(c => c.id);
          const sem5CompletedCount = completedModules.filter(id => sem5ModuleIds.includes(id)).length;
          return (
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
              <div className="bg-white border border-orange-200 rounded-xl p-4 md:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-orange-500 mb-1 block">Semaine 05</span>
                  <h2 className={`${STUDENT_TEXT.cardTitle} mb-1`} style={{ color: BRAND.blue }}>Gérer son Stress</h2>
                  <p className="text-slate-500 text-xs max-w-sm">Validez tous les modules pour débloquer le quiz.</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg text-center shrink-0">
                  <span className="block text-base font-display font-black tracking-tight" style={{ color: BRAND.blue }}>{Math.round((sem5CompletedCount / coursSemaine5.length) * 100)}%</span>
                  <span className="text-[10px] text-slate-500">Progression</span>
                </div>
              </div>

              <div className="space-y-3 mb-10">
                {coursSemaine5.map((cours, index) => {
                  const isLocked = !isAdmin && index > 0 && !completedModules.includes(coursSemaine5[index - 1].id);
                  const isDone = completedModules.includes(cours.id);
                  return (
                    <button key={cours.id} disabled={isLocked} onClick={() => setActiveLesson(cours.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left group ${isLocked ? "bg-white/60 border-orange-100 opacity-60 cursor-not-allowed" : "bg-white border-orange-200 hover:border-orange-400"}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-50 text-emerald-600" : isLocked ? "bg-slate-100 text-slate-400" : "bg-orange-50 text-orange-600"}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-semibold text-orange-500 block mb-0.5">Module 0{index + 1}</span>
                        <h3 className={`text-sm font-display font-black truncate ${isLocked ? "text-slate-400" : ""}`} style={isLocked ? undefined : { color: BRAND.blue }}>{cours.titre}</h3>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!isAdmin && sem5CompletedCount < coursSemaine5.length}
                onClick={() => { setQuizWeek(5); setQuizStarted(true); }}
                className={`w-full p-5 rounded-xl border transition-colors flex flex-col items-center justify-center text-center ${
                  !isAdmin && sem5CompletedCount < coursSemaine5.length
                    ? "bg-orange-50/50 border-orange-200 opacity-60 cursor-not-allowed"
                    : week5Validated
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-orange-500 border-orange-500 text-white hover:bg-orange-600"
                }`}
              >
                <Target className={`w-8 h-8 mb-2 ${week5Validated ? "text-emerald-500" : !isAdmin && sem5CompletedCount < coursSemaine5.length ? "text-slate-400" : "text-white"}`} />
                <h3 className="text-base font-bold mb-1">{week5Validated ? "Séquence validée" : "Quiz du boss"}</h3>
                <p className={`text-xs font-medium max-w-xs ${week5Validated ? "opacity-70" : "text-slate-400"}`}>
                  {week5Validated ? "Vous avez prouvé votre niveau." : `Test final de la semaine. ${Math.floor(quizSemaine5.length * 0.75)}/${quizSemaine5.length} pour débloquer la suite.`}
                </p>
              </button>
            </motion.div>
          );
        })()}

        {/* ============================================================ */}
        {/* VUE 3 : LECTURE D'UNE LEÇON                                  */}
        {/* ============================================================ */}
        <AnimatePresence>
          {activeLesson && (() => {
            const leconActive = ALL_NEXA_MODULES.find((c) => c.id === activeLesson);
            if (!leconActive) return null;
            return (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <LessonReader
                  sourceType="nexa_module"
                  sourceId={String(leconActive.id)}
                  title={leconActive.titre}
                  htmlContent={leconActive.contenu}
                  onClose={() => setActiveLesson(null)}
                  scrollToHighlightId={scrollToHighlightId}
                  onScrollToHighlightDone={onScrollToHighlightDone}
                  footer={
                    <button
                      onClick={() => markAsDone(activeLesson)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold text-sm transition-colors flex justify-center items-center gap-2"
                    >
                      Valider cette leçon <CheckCircle2 className="w-4 h-4" />
                    </button>
                  }
                />
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* VUE 4 : LE QUIZ                                              */}
        {/* ============================================================ */}
        <AnimatePresence>
          {quizStarted && !quizFinished && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto mt-2">
              <div className="flex justify-between items-end mb-4 px-1">
                <span className="text-4xl font-bold text-orange-200 leading-none">{currentQuestion + 1}</span>
                <p className="text-xs font-semibold text-slate-500">Question {currentQuestion + 1}/{activeQuizQuestions.length}</p>
              </div>
              <div className="bg-white p-5 md:p-6 xl:p-8 rounded-xl border border-orange-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-orange-100">
                  <motion.div className="h-full bg-orange-500" initial={{ width: 0 }} animate={{ width: `${(currentQuestion / activeQuizQuestions.length) * 100}%` }} />
                </div>
                <h3 className={`${STUDENT_TEXT.cardTitle} mb-5 leading-snug`} style={{ color: BRAND.blue }}>{activeQuizQuestions[currentQuestion].question}</h3>
                <div className="grid gap-3 xl:gap-4">
                  {activeQuizQuestions[currentQuestion].options.map((opt, idx) => (
                    <button key={idx} disabled={showExplanation} onClick={() => handleQuizAnswer(idx)}
                      className={`p-3 xl:p-4 rounded-lg text-left font-medium transition-colors border text-sm xl:text-base ${
                        showExplanation
                          ? idx === activeQuizQuestions[currentQuestion].reponseCorrecte
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-400 opacity-50"
                          : "bg-white border-orange-200 hover:border-orange-400 hover:bg-orange-50/40"
                      }`}
                    >{opt}</button>
                  ))}
                </div>
                {showExplanation && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl text-sm font-medium bg-orange-50 text-orange-800">
                    <span className="font-bold uppercase tracking-widest text-[10px] block mb-1">Explication du coach</span>
                    {activeQuizQuestions[currentQuestion].explication}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/* VUE 5 : RÉSULTAT DU QUIZ                                     */}
        {/* ============================================================ */}
        {quizFinished && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center mt-8 px-4">
            <div className="bg-white p-8 rounded-xl border border-orange-200 text-center max-w-md w-full">
              <div className="text-5xl mb-3">{score >= Math.floor(activeQuizQuestions.length * 0.75) ? "🏆" : "💪"}</div>
              <h2 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>{score >= Math.floor(activeQuizQuestions.length * 0.75) ? "Semaine validée !" : "Pas loin !"}</h2>
              <p className="text-sm text-slate-500 mb-6">Score : <span className={`font-bold text-lg ml-1 ${score >= Math.floor(activeQuizQuestions.length * 0.75) ? "text-emerald-600" : "text-orange-500"}`}>{score}/{activeQuizQuestions.length}</span></p>
              <button onClick={() => { resetQuiz(); setActiveWeek(null); }}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold text-sm hover:bg-orange-600 transition-colors">
                Retour à la carte
              </button>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
