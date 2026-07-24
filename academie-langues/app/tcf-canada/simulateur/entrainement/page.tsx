"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RefreshCcw,
  PenLine,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Target,
  CheckCircle2,
  Timer,
  Save,
  RotateCcw,
  MessageSquareText,
  Zap,
  Radio,
  Award,
  BookOpenCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  FileEdit,
} from "lucide-react";
import { banqueSujets } from "@/app/data/sujets_zen";
import { supabase } from "@/app/utils/supabase";
import { downloadTaskPDF } from "@/app/utils/pdfExport";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit"; 

const LAST_FEEDBACK_KEY = "iag_last_entrainement";
function markEntrainementDone() {
  localStorage.setItem(LAST_FEEDBACK_KEY, new Date().toISOString());
}

type Task = 1 | 2 | 3;

export default function ModeZen() {
  const router = useRouter();

  useEffect(() => {
    let channel: any;

    const activerSignal = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ current_activity: "Entraînement Zen 🧘" })
          .eq("id", user.id);

        channel = supabase.channel("online-users");
        channel.subscribe(async (status: string) => {
          if (status === "SUBSCRIBED")
            await channel.track({ user_id: user.id });
        });
      }
    };
    activerSignal();

    return () => {
      const couperSignal = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ current_activity: null })
            .eq("id", user.id);
        }
        if (channel) supabase.removeChannel(channel);
      };
      couperSignal();
    };
  }, []);

  const [activeTask, setActiveTask] = useState<Task>(1);
  const [subjectIndexes, setSubjectIndexes] = useState<Record<Task, number>>(() => ({
    1: Math.floor(Math.random() * 1000),
    2: Math.floor(Math.random() * 1000),
    3: Math.floor(Math.random() * 1000),
  }));
  const [inputs, setInputs] = useState<Record<Task, string>>({
    1: "",
    2: "",
    3: "",
  });
  const [loading, setLoading] = useState(false);
  const [resultats, setResultats] = useState<Record<Task, any | null>>({ 1: null, 2: null, 3: null });
  const resultat = resultats[activeTask];

  const [pdfLoading, setPdfLoading] = useState(false);

  // Cycle = 3 corrections au total (n'importe quelle combinaison) → 1 simulation consommée
  const [cycleCorrections, setCycleCorrections] = useState(0);
  const [cycleRecorded, setCycleRecorded] = useState(false);

  const { canSimulate, simulationsLeft, isAdmin, loading: limitLoading, recordSimulation, DAILY_LIMIT, incrementTrialCount, isTrial, trialDailyLeft } = useSimulationLimit();

  const taskLimits: Record<Task, [number, number]> = {
    1: [60, 120],
    2: [120, 150],
    3: [120, 180],
  };

  const taskTimers: Record<Task, number> = { 1: 600, 2: 900, 3: 1500 };
  const [timeLeft, setTimeLeft] = useState(taskTimers[1]);
  const [saveToast, setSaveToast] = useState<null | "saved" | "restored">(null);

  const subjectIndex = subjectIndexes[activeTask];
  const draftKey = `iag_zen_draft_t${activeTask}_s${subjectIndex}`;

  useEffect(() => {
    if (timeLeft > 0 && !loading && !resultat) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, loading, resultat]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const timeDanger = timeLeft <= 60;

  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setInputs((prev) => ({ ...prev, [activeTask]: savedDraft }));
      setSaveToast("restored");
      setTimeout(() => setSaveToast(null), 1500);
    } else {
      setInputs((prev) => ({ ...prev, [activeTask]: "" }));
    }
    setTimeLeft(taskTimers[activeTask]);
    setResultats((prev) => ({ ...prev, [activeTask]: null }));
  }, [activeTask, subjectIndex, draftKey]);

  useEffect(() => {
    const currentInput = inputs[activeTask];
    if (!currentInput.trim() || resultat) return;
    const t = setTimeout(() => {
      localStorage.setItem(draftKey, currentInput);
      setSaveToast("saved");
      setTimeout(() => setSaveToast(null), 1000);
    }, 1000);
    return () => clearTimeout(t);
  }, [inputs, activeTask, resultat, draftKey]);

  const wordCounts = useMemo(() => {
    return (Object.keys(inputs) as unknown as Task[]).reduce(
      (acc, task) => {
        acc[task] = inputs[task]
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
        return acc;
      },
      {} as Record<Task, number>,
    );
  }, [inputs]);

  const isTaskValid = (task: Task) => {
    const [min, max] = taskLimits[task];
    return wordCounts[task] >= min && wordCounts[task] <= max;
  };

  const allTasksValid = isTaskValid(activeTask);

  // Peut corriger si : le cycle n'est pas complet (< 3 corrections) ET le quota cycle est dispo
  const canCorrectCurrentTask = cycleCorrections < 3 && canSimulate;

  const wordsHint = useMemo(() => {
    const count = wordCounts[activeTask];
    const [min, max] = taskLimits[activeTask];
    if (count === 0) return "Commencez à rédiger…";
    if (count < min) return `Minimum ${min} mots requis`;
    if (count > max) return `Maximum ${max} mots autorisés`;
    return "Bonne longueur. Vérifiez la structure.";
  }, [wordCounts, activeTask]);

  const listeSujets = (banqueSujets as any)[activeTask];
  const totalSujets = listeSujets?.length || 1;
  const currentSubject: any = listeSujets?.[subjectIndex % totalSujets] || "Chargement...";

  // Fonctions de navigation des sujets
  const nextSubject = () => setSubjectIndexes((prev) => ({ ...prev, [activeTask]: (prev[activeTask] + 1) % totalSujets }));
  const prevSubject = () => setSubjectIndexes((prev) => ({ ...prev, [activeTask]: (prev[activeTask] - 1 + totalSujets) % totalSujets }));

  const formattedSujet = typeof currentSubject === "string" 
    ? currentSubject 
    : `Titre: ${currentSubject.titre}\nDoc 1: ${currentSubject.document1}\nDoc 2: ${currentSubject.document2}\nConsigne: ${currentSubject.consigne}`;

  const handleCorrection = async () => {
    if (!inputs[activeTask].trim()) return;
    if (!canSimulate) return;
    setLoading(true);
    setResultats((prev) => ({ ...prev, [activeTask]: null }));

    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
      const userId = session?.user?.id ?? null;

      // fire-and-forget — ne jamais bloquer la correction pour un log d'activité
      if (userId) {
        void supabase.from("profiles").update({ current_activity: "Correction en cours 🤖" }).eq("id", userId).then(() => {}, () => {});
      }

      const MAX_RETRIES = 3;
      let lastError = "";

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout (serveur 55s)

          const res = await fetch("/api/simulateur/zen", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({
              contexte: `Tâche ${activeTask} : ${formattedSujet}`,
              message: inputs[activeTask],
              mode: "ZEN",
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Erreur Serveur");
          }
          const data = await res.json();

          setResultats((prev) => ({
            ...prev,
            [activeTask]: {
              note: data.note ?? "N/A",
              niveau: data.niveau ?? "Auto",
              commentaire_global: data.commentaire_global || "Analyse terminée.",
              details_documents: data.details_documents ?? null,
              erreurs: data.erreurs_majeures ||
                data.erreurs || ["Aucune erreur majeure détectée. Bon travail !"],
              corrections: data.corrections ?? null,
              conseil_coach:
                data.conseil_du_coach ||
                data.conseil_coach ||
                "Continuez à pratiquer avec NEXA.",
            },
          }));

          markEntrainementDone();
          incrementTrialCount();

          // Incrémenter le compteur de corrections du cycle
          const newCount = cycleCorrections + 1;
          if (newCount >= 3) {
            setCycleCorrections(0);
            setCycleRecorded(false);
          } else {
            setCycleCorrections(newCount);
          }

          // ✅ API succeeded — post-correction updates are best-effort (don't trigger retry)
          try {
            if (newCount >= 3) {
              await recordSimulation();
            }

            localStorage.removeItem(draftKey);

            if (userId) {
              const { data: profile } = await supabase.from("profiles").select("simulations_completed").eq("id", userId).single();
              const currentCount = profile?.simulations_completed || 0;
              void supabase.from("profiles").update({ simulations_completed: currentCount + 1, current_activity: "Consulte ses corrections 📝" }).eq("id", userId).then(() => {}, () => {});
            }
          } catch (postErr) {
            console.warn("Post-correction update failed (non-blocking):", postErr);
          }

          return; // ✅ Succès, on sort de la boucle de retry
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Erreur inconnue";

          // Retry pour timeout, réseau, ou rate limit (429)
          const isRetryable =
            lastError.includes("AbortError") ||
            lastError.includes("timeout") ||
            lastError.includes("Failed to fetch") ||
            lastError.includes("429");

          if (isRetryable && attempt < MAX_RETRIES) {
            // Attendre avant de réessayer (backoff exponentiel)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }

          break; // Erreur non-retryable
        }
      }

      // Erreur finale après tous les retries
      console.error("Erreur de correction :", lastError);
      alert(
        lastError.includes("timeout") || lastError.includes("AbortError")
          ? "La correction a pris trop de temps. Vérifiez votre connexion et réessayez."
          : lastError || "Connexion interrompue. Vérifiez votre réseau et réessayez."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await downloadTaskPDF({
        taskNum: activeTask,
        sujet: formattedSujet,
        travail: inputs[activeTask],
        resultat: resultat,
      });
    } catch (e) {
      console.error("Erreur PDF :", e);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    // AJOUT : fixed inset-0 z-[100] overflow-y-auto pour passer en plein écran et cacher la sidebar
    <div className="fixed inset-0 z-[100] overflow-y-auto min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans selection:bg-orange-500/30">
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110]"
          >
            <div className="px-4 py-2 rounded-xl bg-slate-900 text-white shadow-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              {saveToast === "restored" ? (
                <>
                  <RotateCcw size={14} /> Brouillon restauré
                </>
              ) : (
                <>
                  <Save size={14} /> Travail enregistré
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-100 transition"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <h1 className={STUDENT_TEXT.pageTitle} style={{ color: BRAND.blue }}>
                Simulateur <span className="text-orange-600">Zen</span>
              </h1>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Entraînement Libre
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-black transition-colors ${timeDanger ? "bg-red-50 text-red-600 border-red-100 animate-pulse" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              <Timer size={14} /> {formatTime(timeLeft)}
            </div>
            <span className="hidden sm:block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
              Tâche {activeTask}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <div className="flex p-1.5 bg-slate-100/50 rounded-[1.5rem] border border-slate-200">
              {([1, 2, 3] as Task[]).map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setActiveTask(num);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTask === num ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-orange-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Tâche 0{num}
                </button>
              ))}
            </div>

            <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5">
                  <Target size={12} className="text-orange-500" /> Sujet Actif
                </span>
                
                {/* AJOUT : Navigation Sujet Précédent / Suivant */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button
                    onClick={prevSubject}
                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-white rounded-lg transition-colors"
                    title="Sujet précédent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-[10px] font-bold text-slate-400 px-2 w-12 text-center">
                    {subjectIndex % totalSujets + 1}/{totalSujets}
                  </span>
                  <button
                    onClick={nextSubject}
                    className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-white rounded-lg transition-colors"
                    title="Sujet suivant"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              
              {typeof currentSubject === "string" ? (
                <p className="text-slate-800 font-medium text-sm md:text-base leading-relaxed relative z-10 whitespace-pre-wrap">
                  {currentSubject}
                </p>
              ) : (
                <div className="space-y-6 relative z-10 mt-2">
                  {/* 1. CONSIGNE */}
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Consigne :</h3>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed">
                      {currentSubject.consigne}
                    </p>
                  </div>

                  {/* 2. TITRE */}
                  <div className="pt-2 border-t border-slate-100">
                    <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight mb-2">
                      Sujet : {currentSubject.titre}
                    </h2>
                  </div>

                  {/* 3. DOCUMENT 1 */}
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                      Document 1 :
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium text-justify">
                      {currentSubject.document1}
                    </p>
                  </div>

                  {/* 4. DOCUMENT 2 */}
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                      Document 2 :
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium text-justify">
                      {currentSubject.document2}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
                    <PenLine size={12} className="text-orange-600" />
                  </div>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {wordsHint}
                  </span>
                </div>
                <div
                  className={`text-[10px] font-black px-3 py-1 rounded-lg border transition-colors ${
                    isTaskValid(activeTask)
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-red-50 text-red-600 border-red-100"
                  }`}
                >
                  {wordCounts[activeTask]} / {taskLimits[activeTask][0]}–
                  {taskLimits[activeTask][1]} MOTS
                </div>
              </div>
              <textarea
                value={inputs[activeTask]}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const newWordCount = newValue
                    .trim()
                    .split(/\s+/)
                    .filter((w) => w.length > 0).length;
                  const [, max] = taskLimits[activeTask];
                  if (
                    newWordCount <= max ||
                    newValue.length < inputs[activeTask].length
                  ) {
                    setInputs((prev) => ({ ...prev, [activeTask]: newValue }));
                  }
                }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                placeholder="Rédigez votre réponse ici. Concentrez-vous sur la structure et le vocabulaire..."
                className="w-full h-[300px] md:h-[400px] p-6 md:p-8 text-base md:text-lg leading-relaxed outline-none resize-none bg-transparent placeholder:text-slate-300"
              />
            </div>

            {!isAdmin && !limitLoading && (
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${canSimulate ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-red-50 border-red-100 text-red-600"}`}>
                <span>{canSimulate ? (isTrial ? "Corrections restantes (essai)" : "Cycles restants aujourd'hui") : "Limite atteinte"}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium normal-case tracking-normal">
                    {cycleCorrections}/3 corrections
                  </span>
                  <span className={`px-2 py-0.5 rounded-md ${canSimulate ? "bg-slate-200 text-slate-700" : "bg-red-100 text-red-700"}`}>
                    {canSimulate ? `${simulationsLeft} / ${isTrial ? 6 : DAILY_LIMIT}` : `0 / ${isTrial ? 6 : DAILY_LIMIT}`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!canSimulate) {
                    if (isTrial) {
                      if (simulationsLeft === 0) {
                        alert("Vous avez utilisé vos 6 corrections d'essai. Contactez NEXA pour accéder à un pack.");
                      } else if (trialDailyLeft === 0) {
                        alert("Vous avez atteint votre limite de 3 corrections pour aujourd'hui. Revenez demain ou contactez NEXA pour accéder à un pack.");
                      } else {
                        alert("Votre periode d'essai de 24 heures est terminee. Effectuez un achat pour continuer.");
                      }
                    } else {
                      alert("Vous avez atteint votre limite du jour. Revenez demain ou contactez NEXA pour accéder à un pack.");
                    }
                    return;
                  }
                  handleCorrection();
                }}
                disabled={loading || !allTasksValid}
                className="flex-1 py-5 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest shadow-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-3 active:scale-95"
              >
                {loading ? (
                  <><RefreshCcw className="animate-spin text-orange-500" size={18} /> Analyse en cours...</>
                ) : (
                  <><Sparkles size={18} className="text-orange-400" /> Correction</>
                )}
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading || !inputs[activeTask].trim()}
                className="py-5 px-5 rounded-2xl border border-slate-200 bg-green-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 text-slate-700 font-black text-xs uppercase tracking-widest shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pdfLoading ? (
                  <RefreshCcw size={15} className="animate-spin" />
                ) : (
                  <>
                    <Download size={15} />
                    <span className="hidden sm:inline">Télécharger en PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-5 min-w-0 overflow-hidden">
            <AnimatePresence mode="wait">
              {resultat ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-5"
                >
                  <div className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between mb-6 relative z-10 border-b border-slate-100 pb-6">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 flex items-center gap-1">
                          <Award size={12} className="text-orange-500" />{" "}
                          Évaluation
                        </p>
                        <h3 className="text-3xl font-black text-slate-900">
                          {resultat.note}{" "}
                          <span className="text-sm font-bold text-slate-400">
                            / 20
                          </span>
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                          Niveau Estimé
                        </p>
                        <div
                          className={`px-4 py-1.5 text-xs font-black rounded-lg uppercase tracking-widest ${
                            resultat.niveau.includes("C")
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : resultat.niveau.includes("B")
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : "bg-orange-50 text-orange-600 border border-orange-100"
                          }`}
                        >
                          {resultat.niveau}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <BookOpenCheck size={14} className="text-slate-500" />{" "}
                        Avis de l'examinateur
                      </h4>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {resultat.commentaire_global}
                      </p>
                    </div>
                  </div>

                  {resultat.details_documents && resultat.details_documents.length > 0 && (
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-widest mb-4">
                        <BookOpenCheck size={16} className="text-blue-500" /> Analyse par Document
                      </h4>
                      <div className="space-y-4">
                        {resultat.details_documents.map((doc: any) => (
                          <div key={doc.document} className="p-4 bg-blue-50/50 border border-blue-100/60 rounded-xl space-y-2">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Document {doc.document}</p>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Reformulation</p>
                              <p className="text-xs font-medium text-slate-700 leading-relaxed">{doc.reformulation}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Intégration</p>
                              <p className="text-xs font-medium text-slate-700 leading-relaxed">{doc.integration}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                    <h4 className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-widest mb-4">
                      <AlertTriangle size={16} className="text-amber-500" />{" "}
                      Axes d'amélioration
                    </h4>
                    <div className="space-y-3">
                      {resultat.erreurs?.map((err: any, i: number) => (
                        <div
                          key={i}
                          className="p-3.5 bg-amber-50/50 border border-amber-100/50 rounded-xl text-xs font-medium text-slate-700 leading-relaxed flex flex-col gap-2"
                        >
                          {typeof err === "string" ? (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <p className="wrap-break-word min-w-0">{err}</p>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-red-400 font-black shrink-0">✗</span>
                                <p className="line-through text-slate-400 wrap-break-word min-w-0">{err.faute}</p>
                              </div>
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="text-emerald-500 font-black shrink-0">✓</span>
                                <p className="text-emerald-700 font-semibold wrap-break-word min-w-0">{err.correction}</p>
                              </div>
                              <p className="text-slate-500 italic pl-4 wrap-break-word">{err.explication}</p>
                            </>
                          )}
                        </div>
                      ))}
                      {(!resultat.erreurs || resultat.erreurs.length === 0) && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 text-center">
                          Aucune erreur majeure détectée. Excellent !
                        </div>
                      )}
                    </div>
                  </div>

                  {resultat.corrections && resultat.corrections.length > 0 && (
                    <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm">
                      <h4 className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase tracking-widest mb-4">
                        <FileEdit size={16} className="text-emerald-500" /> Proposition de correction
                      </h4>
                      <div className="space-y-3">
                        {resultat.corrections.map((c: string, i: number) => (
                          <div key={i} className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs font-medium text-slate-700 leading-relaxed">
                            {c}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-xl rounded-full" />
                    <h4 className="flex items-center gap-2 font-black text-[10px] text-orange-400 uppercase tracking-widest mb-3 relative z-10">
                      <Lightbulb size={14} /> Conseil pour le Jour J
                    </h4>
                    <p className="text-sm font-medium leading-relaxed text-slate-300 relative z-10">
                      {resultat.conseil_coach}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] min-h-[400px]">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-slate-100 text-slate-300">
                    <MessageSquareText size={32} strokeWidth={1.5} />
                  </div>
                  {/* MODIFICATION DU TEXTE ICI */}
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-2">
                    Analyse en attente
                  </h3>
                  <p className="text-xs font-medium text-slate-500 max-w-[200px] leading-relaxed">
                    Soumettez votre rédaction pour obtenir une correction
                    détaillée et votre score estimé.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] pb-10 opacity-60">
        NEXA Engine • Security & Intelligence © 2026
      </p>
    </div>
  );
}
