"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, RefreshCcw, PenLine, Sparkles, AlertTriangle, Lightbulb,
  Target, CheckCircle2, Timer, Save, RotateCcw, MessageSquareText,
  Award, BookOpenCheck, Download, Lock, ArrowRight,
  X, FileEdit
} from "lucide-react";
import { banqueSujets } from "@/app/data/sujets_zen";
import { downloadTaskPDF } from "@/app/utils/pdfExport";
import { supabase } from "@/app/utils/supabase";

type Task = 1 | 2 | 3;

export default function DemoExpressionEcrite() {
  const router = useRouter();

  // --- ÉTATS CLASSIQUES ---
  const [activeTask, setActiveTask] = useState<Task>(1);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [inputs, setInputs] = useState<Record<Task, string>>({ 1: "", 2: "", 3: "" });
  const [loading, setLoading] = useState(false);
  const [resultats, setResultats] = useState<Record<Task, any | null>>({ 1: null, 2: null, 3: null });
  const resultat = resultats[activeTask];
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saveToast, setSaveToast] = useState<null | "saved" | "restored">(null);

  // --- 🚀 LOGIQUE ESSAI GRATUIT (GUEST) ---
  const MAX_FREE_TRIALS = 2;
  const [freeTrialsLeft, setFreeTrialsLeft] = useState<number>(MAX_FREE_TRIALS);
  const [showSignupModal, setShowSignupModal] = useState(false);

  useEffect(() => {
    const storedTrials = localStorage.getItem("iag_free_trials");
    if (storedTrials !== null) {
      setFreeTrialsLeft(parseInt(storedTrials, 10));
    } else {
      localStorage.setItem("iag_free_trials", MAX_FREE_TRIALS.toString());
    }
  }, []);

  // --- LIMITES ET TEMPS ---
  const taskLimits: Record<Task, [number, number]> = { 1: [60, 120], 2: [120, 150], 3: [120, 180] };
  const taskTimers: Record<Task, number> = { 1: 600, 2: 1200, 3: 1500 };
  const [timeLeft, setTimeLeft] = useState(taskTimers[1]);

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

  // --- VALIDATION MOTS ---
  const wordCounts = useMemo(() => {
    return (Object.keys(inputs) as unknown as Task[]).reduce((acc, task) => {
        acc[task] = inputs[task].trim().split(/\s+/).filter((w) => w.length > 0).length;
        return acc;
      }, {} as Record<Task, number>);
  }, [inputs]);

  const isTaskValid = (task: Task) => {
    const [min, max] = taskLimits[task];
    return wordCounts[task] >= min && wordCounts[task] <= max;
  };

  const allTasksValid = isTaskValid(activeTask);

  const wordsHint = useMemo(() => {
    const count = wordCounts[activeTask];
    const [min, max] = taskLimits[activeTask];
    if (count === 0) return "Commencez à rédiger…";
    if (count < min) return `Minimum ${min} mots requis`;
    if (count > max) return `Maximum ${max} mots autorisés`;
    return "Bonne longueur. Vérifiez la structure.";
  }, [wordCounts, activeTask]);

  // --- SUJETS ---
  const listeSujets = (banqueSujets as any)[activeTask];
  const currentSubject: any = listeSujets?.[subjectIndex % (listeSujets?.length || 1)] || "Chargement...";
  const changeSubject = () => setSubjectIndex((prev) => prev + 1);

  const formattedSujet = typeof currentSubject === "string" 
    ? currentSubject 
    : `Titre: ${currentSubject.titre}\nDoc 1: ${currentSubject.document1}\nDoc 2: ${currentSubject.document2}\nConsigne: ${currentSubject.consigne}`;

  // --- CORRECTION ---
  const handleCorrection = async () => {
    if (!inputs[activeTask].trim() || !allTasksValid) return;
    if (freeTrialsLeft <= 0) {
      setShowSignupModal(true);
      return;
    }

    setLoading(true);
    setResultats((prev) => ({ ...prev, [activeTask]: null }));

    try {
      let { data: { session } } = await supabase.auth.refreshSession();
      if (!session) ({ data: { session } } = await supabase.auth.getSession());
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
      });

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
          erreurs: data.erreurs_majeures || data.erreurs || ["Aucune erreur majeure détectée. Bon travail !"],
          corrections: data.corrections ?? null,
          conseil_coach: data.conseil_du_coach || data.conseil_coach || "Continuez à pratiquer avec NEXA.",
        },
      }));

      const newTrials = freeTrialsLeft - 1;
      setFreeTrialsLeft(newTrials);
      localStorage.setItem("iag_free_trials", newTrials.toString());

    } catch (e) {
      console.error("Erreur de correction :", e);
      alert("Erreur de connexion. relancez.");
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
    /**
     * MODIFICATION ICI :
     * fixed inset-0 z-[100] : Force la page à couvrir tout l'écran par-dessus la sidebar
     * overflow-y-auto : Permet le scroll interne indispensable car la page est 'fixed'
     */
    <div className="fixed inset-0 z-[100] bg-[#FAFAFA] text-slate-900 font-sans selection:bg-orange-500/30 overflow-y-auto">
      
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-100 transition"
            >
              <ArrowLeft size={18} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                EXPRESSION ECRITE <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block">Démo Gratuite</span>
              </h1>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Testez notre outil
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-xs font-black transition-colors ${timeDanger ? "bg-red-50 text-red-600 border-red-100 animate-pulse" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
              <Timer size={14} /> {formatTime(timeLeft)}
            </div>
            <span className="hidden sm:block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
              Tâche {activeTask}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 pb-24">
        
        {/* BANNIÈRE DÉMO */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><Sparkles size={16} className="text-blue-500"/> Bienvenue dans l'aperçu gratuit !</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Vous pouvez tester la rédaction et la correction instantanée par l'IA sur nos vrais sujets.</p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Essais restants</p>
              <p className={`font-black text-lg leading-none ${freeTrialsLeft > 0 ? "text-emerald-600" : "text-red-500"}`}>{freeTrialsLeft} / {MAX_FREE_TRIALS}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* BOUTONS TÂCHES */}
            <div className="flex p-1.5 bg-slate-100/50 rounded-[1.5rem] border border-slate-200">
              {([1, 2, 3] as Task[]).map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveTask(num)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTask === num ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-orange-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Tâche 0{num}
                </button>
              ))}
            </div>

            {/* ZONE DU SUJET */}
            <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="px-3 py-1 bg-slate-50 border border-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5">
                  <Target size={12} className="text-orange-500" /> Sujet Actif
                </span>
                <button onClick={changeSubject} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-orange-600 transition-colors bg-slate-50 hover:bg-orange-50 px-3 py-1 rounded-lg">
                  <RefreshCcw size={12} /> Sujet suivant
                </button>
              </div>
              
              {/* Contenu du sujet */}
              {typeof currentSubject === "string" ? (
                <p className="text-slate-800 font-medium text-sm md:text-base leading-relaxed relative z-10 whitespace-pre-wrap">
                  {currentSubject}
                </p>
              ) : (
                <div className="space-y-6 relative z-10 mt-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Consigne :</h3>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed">{currentSubject.consigne}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight mb-2">Sujet : {currentSubject.titre}</h2>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Document 1 :</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium text-justify">{currentSubject.document1}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Document 2 :</h3>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium text-justify">{currentSubject.document2}</p>
                  </div>
                </div>
              )}
            </section>

            {/* ZONE DE SAISIE */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
                    <PenLine size={12} className="text-orange-600" />
                  </div>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">{wordsHint}</span>
                </div>
                <div className={`text-[10px] font-black px-3 py-1 rounded-lg border transition-colors ${isTaskValid(activeTask) ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                  {wordCounts[activeTask]} / {taskLimits[activeTask][0]}–{taskLimits[activeTask][1]} MOTS
                </div>
              </div>
              <textarea
                value={inputs[activeTask]}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const newWordCount = newValue.trim().split(/\s+/).filter((w) => w.length > 0).length;
                  const [, max] = taskLimits[activeTask];
                  if (newWordCount <= max || newValue.length < inputs[activeTask].length) {
                    setInputs((prev) => ({ ...prev, [activeTask]: newValue }));
                  }
                }}
                spellCheck={false}
                placeholder="Rédigez votre réponse ici..."
                className="w-full h-[300px] md:h-[400px] p-6 md:p-8 text-base md:text-lg leading-relaxed outline-none resize-none bg-transparent"
              />
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3">
              {freeTrialsLeft > 0 ? (
                <button
                  onClick={handleCorrection}
                  disabled={loading || !allTasksValid}
                  className="flex-1 py-5 rounded-2xl bg-slate-900 text-white font-black text-sm uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? <><RefreshCcw className="animate-spin text-orange-500" size={18} /> Analyse...</> : <><Sparkles size={18} className="text-orange-400" /> Corriger (Gratuit)</>}
                </button>
              ) : (
                <button
                  onClick={() => setShowSignupModal(true)}
                  className="flex-1 py-5 rounded-2xl bg-orange-600 text-white font-black text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-3"
                >
                   Créer un compte pour continuer <Lock size={18} />
                </button>
              )}

              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading || !inputs[activeTask].trim() || !resultat}
                className="py-5 px-5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40"
              >
                {pdfLoading ? <RefreshCcw size={15} className="animate-spin" /> : <><Download size={15} /><span className="hidden sm:inline">PDF</span></>}
              </button>
            </div>
          </div>

          {/* RÉSULTATS */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-5">
            <AnimatePresence mode="wait">
              {resultat ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                   <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6 border-b pb-6">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400">Évaluation</p>
                        <h3 className="text-3xl font-black text-slate-900">{resultat.note} <span className="text-sm font-bold text-slate-400">/ 20</span></h3>
                      </div>
                      <div className="px-4 py-1.5 text-xs font-black rounded-lg bg-orange-50 text-orange-600 border border-orange-100 uppercase">{resultat.niveau}</div>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{resultat.commentaire_global}"</p>
                  </div>

                  <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                    <h4 className="flex items-center gap-2 text-slate-900 font-black text-xs uppercase mb-4"><AlertTriangle size={16} className="text-amber-500" /> Améliorations</h4>
                    <div className="space-y-3">
                      {resultat.erreurs?.map((err: any, i: number) => (
                        <div key={i} className="p-3 bg-amber-50/50 rounded-xl text-xs font-medium text-slate-700">
                           • {typeof err === "string" ? err : err.explication}
                        </div>
                      ))}
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
                  <MessageSquareText size={32} className="text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase">Analyse IA en attente</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* MODALE D'INSCRIPTION */}
      <AnimatePresence>
        {showSignupModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowSignupModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 z-10 text-center">
              <button onClick={() => setShowSignupModal(false)} className="absolute top-4 right-4 p-2 text-slate-400"><X size={16} /></button>
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Target className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Fin de l'essai gratuit</h3>
              <p className="text-xs text-slate-500 mb-8">Créez un compte pour accéder à des corrections illimitées !</p>
              <button onClick={() => router.push("/login")} className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-xs uppercase shadow-lg active:scale-95 mb-3">
                Créer mon compte <ArrowRight size={14} className="inline ml-1" />
              </button>
              <button onClick={() => router.push("/")} className="text-[10px] font-bold text-slate-400 uppercase">Retour à l'accueil</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}