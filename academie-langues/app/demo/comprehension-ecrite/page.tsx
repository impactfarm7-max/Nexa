"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Timer, ChevronRight, ChevronLeft, CheckCircle2, 
  X, Award, ArrowRight, BarChart3, Lock, PlayCircle, BookOpen
} from "lucide-react";
import { catalogueSeriesCE, SerieCE, QuestionCE } from "@/app/data/comprehension_ecrite/index";

export default function DemoComprehensionEcrite() {
  const router = useRouter();

  // --- ÉTATS GLOBAUX ---
  const [view, setView] = useState<"list" | "test" | "results">("list");
  const [activeSerie, setActiveSerie] = useState<SerieCE | null>(null);
  
  // Stockage des scores { serieId: { points, niveau, correctes } }
  const [savedScores, setSavedScores] = useState<Record<number, any>>({});
  const [filter, setFilter] = useState<"tous" | "termines" | "non-termines">("tous");

  // --- ÉTATS DU TEST ---
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(60 * 60); 
  const [scoreData, setScoreData] = useState<any>(null);
  
  const [quitOpen, setQuitOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Charger les scores sauvegardés au démarrage
  useEffect(() => {
    const scores = localStorage.getItem("iag_ce_scores");
    if (scores) setSavedScores(JSON.parse(scores));
  }, []);

  // --- CHRONOMÈTRE ---
  useEffect(() => {
    if (view === "test" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && view === "test") {
      handleFinish();
    }
  }, [timeLeft, view]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // --- ACTIONS ---
  const startTest = (serie: SerieCE) => {
    // Condition de verrouillage (seule la série 1 est libre)
    if (serie.id !== 1) {
      setShowPremiumModal(true);
      return;
    }
    if (serie.questions.length === 0) {
      alert("Cette série est en cours de création. Essayez la Série 1 !");
      return;
    }
    setActiveSerie(serie);
    setCurrentQIndex(0);
    setAnswers({});
    setTimeLeft(60 * 60); // 60 minutes
    setView("test");
  };

  const handleSelectOption = (optionIndex: number) => {
    if (activeSerie) setAnswers(prev => ({ ...prev, [activeSerie.questions[currentQIndex].id]: optionIndex }));
  };

  const handleNext = () => {
    if (activeSerie && currentQIndex < activeSerie.questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    if (!activeSerie) return;
    let totalPoints = 0;
    let correctesCount = 0;

    Object.entries(answers).forEach(([qId, selectedIdx]) => {
      const question = activeSerie.questions.find(q => q.id === Number(qId));
      if (question && question.reponseCorrecte === selectedIdx) {
        correctesCount++;
        if (question.niveau === "A1") totalPoints += 3;
        else if (question.niveau === "A2") totalPoints += 9;
        else if (question.niveau === "B1") totalPoints += 15;
        else if (question.niveau === "B2") totalPoints += 21;
        else if (question.niveau === "C1") totalPoints += 26;
        else if (question.niveau === "C2") totalPoints += 33;
      }
    });

    let niveauEstime = "Non atteint";
    if (totalPoints >= 100 && totalPoints < 200) niveauEstime = "A1";
    else if (totalPoints >= 200 && totalPoints < 300) niveauEstime = "A2";
    else if (totalPoints >= 300 && totalPoints < 400) niveauEstime = "B1";
    else if (totalPoints >= 400 && totalPoints < 500) niveauEstime = "B2";
    else if (totalPoints >= 500 && totalPoints < 600) niveauEstime = "C1";
    else if (totalPoints >= 600) niveauEstime = "C2";

    const result = { points: totalPoints, niveau: niveauEstime, correctes: correctesCount };
    setScoreData(result);
    
    // Sauvegarder
    const newScores = { ...savedScores, [activeSerie.id]: result };
    setSavedScores(newScores);
    localStorage.setItem("iag_ce_scores", JSON.stringify(newScores));
    
    setView("results");
  };

  const returnToList = () => {
    setActiveSerie(null);
    setView("list");
  };

  // ========================================================
  // VUE 1 : LA LISTE DES SÉRIES (ADAPTÉE AU STYLE ORAL)
  // ========================================================
  if (view === "list") {
    const completedCount = Object.keys(savedScores).length;

    const filteredSeries = catalogueSeriesCE.filter((s) => {
      if (filter === "termines") return !!savedScores[s.id];
      if (filter === "non-termines") return !savedScores[s.id];
      return true;
    });

    return (
      // Le composant root en fixed pour masquer la sidebar globale
      <div className="fixed inset-0 z-[100] bg-neutral-50 overflow-y-auto pb-16">
        
        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60 shadow-sm">
          <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                <BookOpen className="w-4 h-4 text-white stroke-[2]" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">TCF Canada</p>
                <h1 className="text-base font-black text-neutral-900 leading-tight tracking-tight">
                  Compréhension Écrite
                </h1>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hidden md:block">
              {completedCount}/{catalogueSeriesCE.length} complétées
            </span>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-5 pt-6">

          {/* FILTRES */}
          <div className="flex gap-2 mb-6">
            {(["tous", "termines", "non-termines"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  filter === f
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-white border border-neutral-200 text-neutral-500 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {f === "tous" ? "Tous" : f === "termines" ? "Terminés" : "Non terminés"}
              </button>
            ))}
          </div>

          {/* GRILLE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSeries.map((serie) => {
              const score = savedScores[serie.id];
              const isCompleted = !!score;
              const isPremium = serie.id !== 1; // Seule la série 1 est accessible

              return (
                <button
                  key={serie.id}
                  onClick={() => startTest(serie)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all group ${
                    isPremium
                      ? "bg-neutral-100/50 border-neutral-200 cursor-not-allowed hover:bg-neutral-100"
                      : isCompleted
                      ? "bg-orange-50 border-orange-200 hover:bg-orange-100 active:scale-[0.98] cursor-pointer"
                      : "bg-white border-neutral-200 hover:border-orange-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isPremium ? "bg-neutral-200" : isCompleted ? "bg-orange-500" : "bg-orange-100"
                    }`}>
                      {isPremium ? (
                        <Lock className="w-4 h-4 text-neutral-500 stroke-[2]" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-white stroke-[2]" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-orange-600 stroke-[2]" />
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-black leading-tight ${
                        isPremium ? "text-neutral-500" : isCompleted ? "text-orange-900" : "text-neutral-900"
                      }`}>{serie.titre}</p>
                      <p className={`text-[11px] font-semibold ${
                        isPremium ? "text-neutral-400" : isCompleted ? "text-orange-500" : "text-neutral-500"
                      }`}>
                        {isCompleted 
                          ? `${score.niveau} · ${score.correctes}/${serie.questions?.length || 39}` 
                          : `${serie.questions?.length || 39} questions · 60 min`}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[11px] font-black flex items-center gap-0.5 ${
                    isPremium ? "text-neutral-400" : isCompleted ? "text-orange-500 group-hover:text-orange-600" : "text-orange-600 group-hover:text-orange-700"
                  }`}>
                    {isPremium ? "Premium" : isCompleted ? "Refaire" : "Commencer"} 
                    {!isPremium && <ChevronRight className="w-3.5 h-3.5" />}
                    {isPremium && <Lock className="w-3 h-3 ml-0.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredSeries.length === 0 && (
            <div className="text-center py-20 text-neutral-400">
              <p className="text-sm font-bold">Aucune série dans cette catégorie.</p>
            </div>
          )}

        </main>

        {/* MODALE PREMIUM */}
        <AnimatePresence>
          {showPremiumModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden text-center p-8 z-10">
                <button onClick={() => setShowPremiumModal(false)} className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5"><Lock className="w-8 h-8 text-orange-500" /></div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Contenu Verrouillé</h3>
                <p className="text-xs font-medium text-slate-500 mb-8 leading-relaxed">Cette série est réservée à nos étudiants inscrits. Créez un compte pour débloquer l'intégralité du catalogue d'entraînement.</p>
                <button onClick={() => router.push("/login")} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">Débloquer <ArrowRight size={14} /></button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ========================================================
  // VUE 2 : L'EXAMEN EN COURS (Déjà en Plein écran)
  // ========================================================
  if (view === "test" && activeSerie) {
    const currentQ = activeSerie.questions[currentQIndex];
    const answeredCount = Object.keys(answers).length;
    const progressPercent = (answeredCount / activeSerie.questions.length) * 100;
    const danger = timeLeft <= 5 * 60;

    return (
      <div className="fixed inset-0 z-[100] bg-[#FAFAFA] flex flex-col font-sans selection:bg-rose-500/30 overflow-y-auto">
        <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 p-3 md:p-4 z-40 flex justify-between items-center px-4 md:px-6 shadow-sm">
            <button onClick={() => setQuitOpen(true)} className="px-3 md:px-4 py-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors rounded-xl text-slate-600 hover:text-red-600 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2 shadow-sm">
              <ArrowLeft size={16} />
              <span className="hidden md:inline">Retour</span>
            </button>
            
            <div className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl border flex items-center gap-2 md:gap-3 font-black text-base md:text-lg shadow-sm transition-colors ${danger ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-900 text-white border-slate-800'}`}>
               <Timer size={18}/> {formatTime(timeLeft)}
            </div>
            
            <button onClick={handleFinish} className="bg-orange-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-md shadow-orange-500/20 active:scale-95 transition-all hover:bg-orange-500 flex items-center gap-1.5 md:gap-2">
               <span className="hidden md:inline">Terminer</span><span className="md:hidden">Fin</span> <CheckCircle2 size={14} />
            </button>
        </header>

        <div className="h-1.5 w-full bg-slate-100 shrink-0">
          <div className="h-full bg-orange-500 transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>

        <main className="max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
            <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-8 shrink-0">
              <div className="flex flex-wrap justify-center gap-2 md:gap-2.5">
                {activeSerie.questions.map((q, idx) => {
                  const isCurrent = currentQIndex === idx;
                  const isAnswered = answers[q.id] !== undefined;
                  let btnClass = "bg-white text-slate-600 border-slate-200 hover:border-orange-300"; 
                  if (isCurrent) btnClass = "bg-orange-600 text-white border-orange-600 shadow-md scale-110 z-10"; 
                  else if (isAnswered) btnClass = "bg-slate-800 text-white border-slate-800";

                  return (
                    <button key={q.id} onClick={() => setCurrentQIndex(idx)} className={`w-9 h-9 md:w-11 md:h-11 rounded-lg border text-xs md:text-sm font-bold flex items-center justify-center transition-all ${btnClass}`}>
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start flex-1">
              <div className="lg:col-span-7 mt-4 lg:mt-0">
                <div className="relative bg-white pt-10 pb-8 px-6 md:px-10 rounded-[2rem] border-2 border-orange-400 shadow-sm">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 overflow-hidden rounded-[2rem] z-0">
                    <span className="text-6xl md:text-8xl font-black text-slate-400 uppercase -rotate-12 whitespace-nowrap select-none">NEXA</span>
                  </div>
                  <div className="absolute -top-px left-6 -translate-y-1/2 bg-[#FAFAFA] px-2 z-20">
                    <div className="bg-orange-50 text-orange-600 border border-orange-200 px-5 py-1.5 rounded-full text-sm md:text-base font-black shadow-sm">
                      Question : {currentQIndex + 1}
                    </div>
                  </div>
                  <p className="relative z-10 font-medium text-slate-800 leading-loose text-base md:text-xl whitespace-pre-wrap text-justify">{currentQ.texte}</p>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-8 leading-snug">{currentQ.question}</h3>
                <div className="space-y-4 mb-10">
                  {currentQ.options.map((option, index) => {
                    const isSelected = answers[currentQ.id] === index;
                    return (
                      <button key={index} onClick={() => handleSelectOption(index)} className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group ${isSelected ? "border-orange-500 bg-orange-50 text-orange-900 font-bold ring-4 ring-orange-500/10" : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50 text-slate-700 font-medium shadow-sm hover:shadow"}`}>
                        <span className="text-base md:text-lg leading-relaxed pr-4">{option}</span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300"}`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                 
                <div className="flex gap-4 mt-auto pb-8">
                   <button onClick={handlePrev} disabled={currentQIndex === 0} className="flex-[1] py-4 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-600 transition-colors flex items-center justify-center gap-2 shadow-sm"><ChevronLeft size={16} /> Préc.</button>
                   <button onClick={handleNext} disabled={currentQIndex === activeSerie.questions.length - 1} className="flex-[2] py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-colors flex items-center justify-center gap-2">Suivant <ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
        </main>

        <AnimatePresence>
          {quitOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white p-8 md:p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl border border-slate-200">
                 <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100"><X className="text-red-500" size={24}/></div>
                 <h3 className="font-black text-xl mb-2 tracking-tight text-slate-900">Quitter la série ?</h3>
                 <p className="text-xs text-slate-500 mb-8 font-medium leading-relaxed px-2">Le chronomètre s'arrêtera et vous retournerez à l'accueil.</p>
                 <div className="space-y-3">
                   <button onClick={() => router.push('/')} className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md transition-colors">Oui, quitter vers l'accueil</button>
                   <button onClick={() => setQuitOpen(false)} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors">Continuer l'épreuve</button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ========================================================
  // VUE 3 : RÉSULTATS ET CORRECTION (Déjà en Plein écran)
  // ========================================================
  if (view === "results" && scoreData && activeSerie) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#FAFAFA] overflow-y-auto font-sans text-slate-900 pb-24">
        <header className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50 flex justify-between items-center px-4 md:px-8">
           <button onClick={() => router.push('/')} className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 hover:text-orange-600 transition-colors group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> <span className="hidden md:inline">Retour à l'accueil</span><span className="md:hidden">Accueil</span>
           </button>
           <h2 className="font-black text-slate-900 uppercase tracking-widest text-[10px] md:text-xs">Résultat de la {activeSerie.titre}</h2>
        </header>
        
        <main className="max-w-4xl mx-auto p-4 md:p-8 pt-8 md:pt-12">
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="space-y-6 md:space-y-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-50 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2 flex items-center gap-1.5"><Award size={14} /> Score Officiel</p>
                        <div className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">
                           {scoreData.correctes}<span className="text-2xl md:text-3xl text-slate-400 font-bold tracking-normal ml-1">/ {activeSerie.questions.length}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 mt-2">({scoreData.points} points TCF cumulés)</p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Niveau Estimé</p>
                        <div className="inline-block px-6 py-2 text-xl font-black rounded-xl uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {scoreData.niveau}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-10 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-orange-500"/> Détail de vos réponses</h3>
              <div className="space-y-6">
                {activeSerie.questions.map((q, i) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.reponseCorrecte;
                  const isUnanswered = userAnswer === undefined;

                  return (
                    <div key={q.id} className={`p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                          {isCorrect ? <CheckCircle2 size={14}/> : <X size={14}/>}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Question {i + 1}</p>
                          <p className="text-sm text-slate-700 font-medium">{q.question}</p>
                        </div>
                      </div>
                      <div className="ml-9 space-y-2 text-sm">
                        {!isCorrect && !isUnanswered && (
                          <div className="flex items-center gap-2 text-red-700 bg-red-100/50 p-2 rounded-lg"><span className="font-black">❌ Votre choix :</span> {q.options[userAnswer]}</div>
                        )}
                        {!isCorrect && isUnanswered && (
                          <div className="flex items-center gap-2 text-slate-500 bg-slate-100 p-2 rounded-lg"><span className="font-black">⏳ Non répondue</span></div>
                        )}
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100/50 p-2 rounded-lg"><span className="font-black">✅ Bonne réponse :</span> {q.options[q.reponseCorrecte]}</div>
                        <p className="text-slate-500 italic mt-2 text-xs leading-relaxed"><span className="font-bold">Pourquoi ?</span> {q.explication}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="text-center pt-4">
               <button onClick={returnToList} className="inline-flex items-center gap-2.5 px-8 py-4 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
                 Voir le catalogue des séries <ArrowRight size={16} />
               </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return null;
}