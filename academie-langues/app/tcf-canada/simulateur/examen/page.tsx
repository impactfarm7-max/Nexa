"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { banqueSujetsExamen } from "@/app/data/sujets_examen";
import { examensComplets } from "@/app/data/examens_complets";
import { supabase } from "@/app/utils/supabase";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit";
import {
  ArrowLeft, Timer, Flag, ChevronRight, AlertTriangle, 
  Sparkles, CheckCircle2, X, Trash2, Lock, Award, BookOpenCheck, Zap, Lightbulb, RotateCcw,
  Target, PenLine, Save, Crown, Layers, Info, PlayCircle
} from "lucide-react";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

type Task = 1 | 2 | 3;
type Answers = { 1: string; 2: string; 3: string };
type ExamMode = 'EE' | 'COMPLET' | 'CLOSED' | null;

const EXAM_PASSAGE_KEY = "nexa_exam_passage";
const HUB_PAGE_CLASS = "min-h-[100dvh] bg-[#FFFBF7] flex flex-col font-sans pb-24 md:pb-10 overflow-x-hidden";
const EXAM_SHELL = "nexa-student-shell w-full";
const EXAM_HUB_INNER = "w-full max-w-3xl xl:max-w-5xl 2xl:max-w-6xl mx-auto";

export default function ModeExamen() {
  const router = useRouter();

  // --- ÉTATS GÉNÉRAUX ET SÉLECTION DE MODE ---
  const [examMode, setExamMode] = useState<ExamMode>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // 1. VERROUILLAGE JOURS (Mercredi & Samedi)
  const [isExamDay, setIsExamDay] = useState<boolean | null>(null);
  const [nextSession, setNextSession] = useState("");
  
  // 🟢 ON FAIT APPEL AU VIGILE DES QUOTAS 🟢
  const {
    isAdmin,
    packType,
    canSimulateEE,
    canSimulateExamenComplet,
    examLeft,
    exam4mLeft,
    examCompletAccess,
    recordExamSimulation
  } = useSimulationLimit();

  const [isCenterStudent, setIsCenterStudent] = useState(false);
  const [examEligibility, setExamEligibility] = useState<{
    mode: string;
    canStart: boolean;
    isExceptional?: boolean;
    examenId: number | null;
    reason: string;
    scheduledAt?: string | null;
    sessionTitle?: string | null;
    rank?: number | null;
    rankTotal?: number | null;
    normalAccess?: typeof examCompletAccess;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, role")
        .eq("id", session.user.id)
        .maybeSingle();
      if (profile?.center_id && profile.role === "student") {
        setIsCenterStudent(true);
      }
      const res = await fetch("/api/tcf/exam-eligibility", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setExamEligibility(await res.json());
    })();
  }, []);

  useEffect(() => {
    const today = new Date().getDay(); 
    setIsExamDay(today === 3 || today === 6); // 3 = Mercredi, 6 = Samedi
    if (today === 0 || today === 1 || today === 2) setNextSession("Mercredi");
    else setNextSession("Samedi");
    // setIsExamDay(true); // Décommente pour tester hors jours J
  }, []);

  // ==========================================
  // 📡 LE SIGNAL RADAR (Présence en ligne)
  // ==========================================
  useEffect(() => {
    let channel: any;
    const activerSignal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Radar Admin
        await supabase.from('profiles').update({ current_activity: 'Examen Officiel ⏳' }).eq('id', user.id);
        channel = supabase.channel('online-users');
        channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') await channel.track({ user_id: user.id });
        });
      }
    };
    activerSignal();

    return () => {
      const couperSignal = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from('profiles').update({ current_activity: null }).eq('id', user.id);
        if (channel) supabase.removeChannel(channel);
      };
      couperSignal();
    };
  }, []);

  // --- LOGIQUE DE DÉVERROUILLAGE ---
  // EE est déverrouillé si le Vigile dit OK (Pack valide) ET s'il reste des crédits
  const hasEECredits = isAdmin || (canSimulateEE && examLeft > 0);
  
  // COMPLET : parcours normal (J+20 + anniversaires) OU convocation centre exceptionnelle
  const isCompletUnlocked = isAdmin || examEligibility?.canStart === true
    || (canSimulateExamenComplet && exam4mLeft > 0);

  const imposedExamenId = examEligibility?.isExceptional && examEligibility.examenId != null
    ? examEligibility.examenId
    : null;

  // --- GARDIEN D'ACTION ---
  const handleEEAction = (callback: () => void) => {
    if (!hasEECredits) {
      setShowPremiumModal(true);
    } else {
      callback();
    }
  };

  // 2. ÉTATS DE L'ÉPREUVE (Expression Écrite)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<Task>(1);
  const [answers, setAnswers] = useState<Answers>({ 1: "", 2: "", 3: "" });
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<null | "saved" | "restored">(null);

  const draftKey = useMemo(() => selectedSubject ? `iag_exam_draft_${selectedSubject}` : null, [selectedSubject]);
  const timeKey = useMemo(() => selectedSubject ? `iag_exam_time_${selectedSubject}` : null, [selectedSubject]);

  const wordCount = useMemo(() => {
    const text = answers[activeTask] || "";
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [answers, activeTask]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const danger = timeLeft <= 5 * 60;

  const taskLimits: Record<Task, [number, number]> = {
    1: [60, 120],
    2: [120, 150],
    3: [120, 180],
  };
  const [minWords, maxWords] = taskLimits[activeTask];
  const isWordCountValid = wordCount >= minWords && wordCount <= maxWords;

  const currentSubject: any = selectedSubject ? (banqueSujetsExamen as any)[selectedSubject]?.[activeTask] : null;

  const inActivePassage = selectedSubject !== null && !isFinished && examMode === "EE";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (inActivePassage) {
      sessionStorage.setItem(EXAM_PASSAGE_KEY, "1");
    } else {
      sessionStorage.removeItem(EXAM_PASSAGE_KEY);
    }
    window.dispatchEvent(new Event("nexa-sidebar-sync"));
    return () => {
      sessionStorage.removeItem(EXAM_PASSAGE_KEY);
      window.dispatchEvent(new Event("nexa-sidebar-sync"));
    };
  }, [inActivePassage]);

  // 3. PERSISTANCE
  useEffect(() => {
    if (!selectedSubject) return;
    const rawDraft = localStorage.getItem(draftKey!);
    const rawTime = localStorage.getItem(timeKey!);
    if (rawDraft) {
      const parsed = JSON.parse(rawDraft);
      setAnswers(parsed.answers);
      setActiveTask(parsed.activeTask);
      setSaveToast("restored");
      setTimeout(() => setSaveToast(null), 1600);
    }
    if (rawTime) {
      const parsedTime = Number(rawTime);
      if (parsedTime > 0) setTimeLeft(parsedTime);
    }
  }, [selectedSubject, draftKey, timeKey]);

  useEffect(() => {
    if (!selectedSubject || isFinished) return;
    const t = setTimeout(() => {
      localStorage.setItem(draftKey!, JSON.stringify({ answers, activeTask }));
      localStorage.setItem(timeKey!, String(timeLeft));
      setSaveToast("saved");
      setTimeout(() => setSaveToast(null), 900);
    }, 500);
    return () => clearTimeout(t);
  }, [answers, activeTask, timeLeft, selectedSubject, isFinished, draftKey, timeKey]);

  useEffect(() => {
    if (selectedSubject && !isFinished && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isFinished) {
      handleFinish();
    }
  }, [timeLeft, selectedSubject, isFinished]);

  // 4. LOGIQUE DE CORRECTION ET DÉDUCTION DES QUOTAS
  const handleFinish = async () => {
    if (!selectedSubject) return;
    setLoading(true);
    setIsFinished(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').update({ current_activity: 'Correction en cours 🤖' }).eq('id', user.id);

    const s: any = (banqueSujetsExamen as any)[selectedSubject];
    const t3Format = typeof s[3] === 'string' ? s[3] : `Consigne: ${s[3].consigne}\nTitre: ${s[3].titre}\nDoc 1: ${s[3].document1}\nDoc 2: ${s[3].document2}`;

    const MAX_RETRIES = 3;
    let lastError = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Ensure token is fresh before making API call (fail silently if refresh fails)
        try {
          await supabase.auth.refreshSession();
        } catch {
          console.warn("Token refresh failed, continuing with current session");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expirée. Veuillez vous reconnecter.");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout (serveur 55s)

        const res = await fetch("/api/simulateur/examen", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: `EXAMEN COMPLET\nT1: ${s[1]} -> Rép: ${answers[1]}\nT2: ${s[2]} -> Rép: ${answers[2]}\nT3: ${t3Format} -> Rép: ${answers[3]}`,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Erreur ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        setResultat(JSON.parse(data.reply));

        localStorage.removeItem(draftKey!);
        localStorage.removeItem(timeKey!);

        // ✅ API succeeded — post-correction updates are best-effort (don't trigger retry)
        try {
          await recordExamSimulation();
          if (user) {
            const { data: profile } = await supabase.from('profiles').select('simulations_completed').eq('id', user.id).single();
            const currentCount = profile?.simulations_completed || 0;
            await supabase.from('profiles').update({
              simulations_completed: currentCount + 1,
              current_activity: 'Consulte ses résultats 🏆'
            }).eq('id', user.id);
          }
        } catch (postErr) {
          console.warn("Post-correction update failed (non-blocking):", postErr);
        }

        setLoading(false);
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

        // Autre erreur, on ne retry pas
        break;
      }
    }

    // Afficher un message d'erreur approprié
    alert(
      lastError.includes("timeout") || lastError.includes("AbortError")
        ? "L'analyse a pris trop de temps. Vérifiez votre connexion et réessayez."
        : lastError.includes("JSON")
          ? "Erreur lors du traitement. Veuillez réessayer."
          : lastError || "Erreur lors de la correction."
    );
    setLoading(false);
  };

  function confirmQuit() {
    localStorage.removeItem(draftKey!);
    localStorage.removeItem(timeKey!);
    setSelectedSubject(null);
    setAnswers({1:"",2:"",3:""});
    setTimeLeft(60*60);
    setQuitOpen(false);
  }

  // ========================================================================
  // 🚀 FONCTION DE LANCEMENT DE LA SÉQUENCE COMPLÈTE
  // ========================================================================
  const startFullSequence = (subjectId: number) => {
    router.push(`/dashboard/examen-complet/${subjectId}`); 
  };

  // ========================================================================
  // RENDER DES DIFFÉRENTS ÉCRANS
  // ========================================================================

  if (isExamDay === null) return null;

  // 🔀 ÉCRAN 1 : SÉLECTION DU MODE (EE ou COMPLET)
  if (examMode === null) {
    return (
      <div className={HUB_PAGE_CLASS}>
        <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 py-3">
          <div className={`${EXAM_SHELL} flex items-center gap-3`}>
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition-colors group min-h-[40px] min-w-[40px] flex items-center justify-center">
            <ArrowLeft size={18} className="text-neutral-600 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] xl:text-xs font-semibold" style={{ color: BRAND.orange }}>TCF Canada</p>
            <h1 className={`${STUDENT_TEXT.pageTitle} truncate`} style={{ color: BRAND.blue }}>Centre d&apos;examen officiel</h1>
          </div>
          </div>
        </header>

        <main className={`${EXAM_SHELL} pt-6 xl:pt-8 space-y-5 xl:space-y-7`}>
          <div className={`${EXAM_HUB_INNER} grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6`}>

            {/* MODE EXPRESSION ÉCRITE */}
            <button
              onClick={() => {
                if (!hasEECredits) {
                  setShowPremiumModal(true);
                } else if (!isExamDay && !isAdmin) {
                  setExamMode('CLOSED');
                } else {
                  setExamMode('EE');
                }
              }}
              className={`p-5 xl:p-6 2xl:p-7 rounded-xl border text-left transition-colors relative group ${
                hasEECredits
                  ? "bg-white border-orange-200 hover:border-orange-400 cursor-pointer"
                  : "bg-neutral-50 border-orange-100 opacity-70 cursor-not-allowed"
              }`}
            >
              {!hasEECredits && (
                <div className="absolute top-3 right-3 p-1.5 bg-orange-50 rounded-lg border border-orange-100">
                  <Lock size={14} className="text-neutral-400" />
                </div>
              )}
              <div className="w-10 h-10 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-center mb-3">
                <PenLine className="text-orange-600" size={20} strokeWidth={1.75} />
              </div>
              <h2 className={`${STUDENT_TEXT.cardTitle} mb-1.5 leading-snug`} style={{ color: BRAND.blue }}>
                Examen expression écrite
              </h2>
              <p className="text-xs xl:text-sm text-neutral-600 mb-3 leading-relaxed">
                3 tâches en conditions réelles — 60 minutes.
              </p>
              <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-orange-50/80 border border-orange-100 rounded-lg">
                <Info size={12} className="text-orange-500 shrink-0" />
                <p className="text-[10px] font-medium text-orange-700">Mercredi et samedi uniquement</p>
              </div>
              {hasEECredits ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-orange-500 text-white">
                  <PlayCircle size={12} /> Démarrer
                </span>
              ) : (
                <span className="text-[11px] font-medium text-neutral-400">Crédits épuisés</span>
              )}
            </button>

            {/* MODE EXAMEN COMPLET */}
            <button
              onClick={() => {
                if (!isCompletUnlocked) {
                  setShowPremiumModal(true);
                  return;
                }
                if (examEligibility?.isExceptional && imposedExamenId != null) {
                  startFullSequence(imposedExamenId);
                } else {
                  setExamMode('COMPLET');
                }
              }}
              className={`p-5 xl:p-6 2xl:p-7 rounded-xl border-2 text-left transition-colors relative overflow-hidden group ${
                isCompletUnlocked
                  ? "cursor-pointer hover:brightness-105"
                  : "opacity-60 cursor-not-allowed"
              }`}
              style={{
                backgroundColor: isCompletUnlocked ? BRAND.blue : "#94a3b8",
                borderColor: BRAND.orange,
              }}
            >
              {!isCompletUnlocked && (
                <div className="absolute top-3 right-3 p-1.5 bg-white/10 rounded-lg">
                  <Lock size={14} className="text-white/80" />
                </div>
              )}
              <div className="w-10 h-10 bg-white/15 border border-orange-400/50 rounded-lg flex items-center justify-center mb-3">
                <Layers className="text-orange-300" size={20} strokeWidth={1.75} />
              </div>
              <h2 className={`${STUDENT_TEXT.cardTitle} mb-1.5 text-white leading-snug`}>
                Examen complet TCF Canada
              </h2>
              <p className="text-xs xl:text-sm text-white/80 mb-3 leading-relaxed">
                {examEligibility?.isExceptional
                  ? `${examEligibility.reason}${imposedExamenId != null ? ` — Officiel ${String(imposedExamenId).padStart(2, "0")}` : ""}`
                  : examCompletAccess.canUse
                    ? "4 épreuves d&apos;affilée (CE, CO, EE, EO) — 2h45."
                    : (examEligibility?.normalAccess?.reason || examCompletAccess.reason || "Accès non disponible.")}
              </p>
              <div className="flex gap-1 mb-3">
                {["CE", "CO", "EE", "EO"].map((label) => (
                  <span key={label} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white border border-white/20">{label}</span>
                ))}
              </div>
              {isCompletUnlocked ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-orange-500 text-white">
                  <PlayCircle size={12} /> Démarrer la séquence
                </span>
              ) : (
                <span className="text-[11px] font-medium text-white/60">Verrouillé</span>
              )}
            </button>
          </div>

          {/* Règlement */}
          <div className={`${EXAM_HUB_INNER} bg-white border border-orange-200 rounded-xl p-4 md:p-5 xl:p-6 flex gap-3 items-start`}>
            <Info className="text-orange-500 shrink-0 mt-0.5" size={20} />
            <div className="min-w-0">
              <h4 className={`${STUDENT_TEXT.cardTitle} mb-1.5`} style={{ color: BRAND.blue }}>
                {isCenterStudent ? "Parcours examen complet & centre" : "Règlement examen complet"}
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed mb-2">
                Déblocage <strong>20 jours après validation</strong> du compte, puis <strong>1 accès par anniversaire mensuel</strong> du premier déblocage (selon la durée de formation).
              </p>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {examEligibility?.normalAccess?.reason || examCompletAccess.reason}
                {exam4mLeft > 0 && exam4mLeft !== Infinity && (
                  <span className="block mt-1 font-semibold" style={{ color: BRAND.orange }}>{exam4mLeft} accès disponible(s).</span>
                )}
              </p>
              {isCenterStudent && examEligibility?.isExceptional && (
                <p className="text-[11px] font-medium mt-2" style={{ color: BRAND.orange }}>
                  Convocation exceptionnelle — sans impact sur vos crédits mensuels.
                </p>
              )}
              {isCenterStudent && examEligibility?.scheduledAt && (
                <p className="text-[11px] text-neutral-500 mt-1">
                  Prochaine convocation : {new Date(examEligibility.scheduledAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {isCenterStudent && examEligibility?.rank != null && examEligibility?.rankTotal != null && (
                <p className="text-[11px] font-semibold mt-2" style={{ color: BRAND.orange }}>
                  Classement centre : {examEligibility.rank}e / {examEligibility.rankTotal} ce mois
                </p>
              )}
            </div>
          </div>
        </main>

        <AnimatePresence>
          {showPremiumModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="relative w-full max-w-sm bg-white rounded-xl border border-orange-200 text-center p-6 z-10">
                <button onClick={() => setShowPremiumModal(false)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-orange-50 text-neutral-400 hover:bg-orange-100"><X className="w-4 h-4" /></button>
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-200"><Crown className="w-6 h-6 text-orange-500" /></div>
                <h3 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>Accès restreint</h3>
                <p className="text-xs text-neutral-500 mb-5 leading-relaxed px-1">Crédits épuisés ou pack incompatible. Mettez à niveau votre pack pour continuer.</p>
                <button onClick={() => { setShowPremiumModal(false); router.push("/profil"); }} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                  Passer au niveau supérieur <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 🛑 ÉCRAN : SESSION FERMÉE (Affiche l'écran de blocage Mercredi/Samedi)
  if (examMode === 'CLOSED') {
    return (
      <div className={`${HUB_PAGE_CLASS} items-center justify-center p-6`}>
        <div className="bg-white p-8 rounded-xl border border-orange-200 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className={`${STUDENT_TEXT.pageTitle} mb-2`} style={{ color: BRAND.blue }}>Session fermée</h1>
          <p className="text-sm text-neutral-600 mb-5">L&apos;expression écrite en conditions réelles n&apos;a lieu que le mercredi et le samedi.</p>
          <div className="bg-orange-50 border border-orange-100 rounded-lg py-3 px-4 text-sm font-semibold" style={{ color: BRAND.orange }}>
            Prochaine session : {nextSession}
          </div>
          <button onClick={() => setExamMode(null)} className="mt-6 text-xs font-semibold text-neutral-500 hover:text-orange-600 transition-colors">
            ← Retour au choix
          </button>
        </div>
      </div>
    );
  }

  // 🌍 ÉCRAN 2 : SÉLECTION DU SUJET (MODE COMPLET)
  if (examMode === 'COMPLET') {
    const nbExamens = Object.keys(banqueSujetsExamen).length;
    const examIds = imposedExamenId != null
      ? [imposedExamenId]
      : Array.from({ length: nbExamens }, (_, i) => i + 1);

    return (
      <div className={HUB_PAGE_CLASS}>
        <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 py-3">
          <div className={`${EXAM_SHELL} flex items-center gap-3`}>
          <button onClick={() => setExamMode(null)} className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition-colors group shrink-0">
            <ArrowLeft size={18} className="text-neutral-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] xl:text-xs font-semibold" style={{ color: BRAND.orange }}>Examen complet</p>
            <h1 className={`${STUDENT_TEXT.pageTitle} truncate`} style={{ color: BRAND.blue }}>Banque de sujets · 4 épreuves</h1>
          </div>
          <div className="hidden sm:flex gap-1 shrink-0">
            {["CE", "CO", "EE", "EO"].map((label) => (
              <span key={label} className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-orange-200 bg-white" style={{ color: BRAND.blue }}>{label}</span>
            ))}
          </div>
          </div>
        </header>

        <main className={`${EXAM_SHELL} py-5 xl:py-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 xl:gap-4`}>
          {examIds.map((examId) => {
            const hasConfig = !!examensComplets.find((e) => e.id === examId);
            const hasCompletCredits = isAdmin || examEligibility?.canStart === true
              || (canSimulateExamenComplet && exam4mLeft > 0);
            const isAvailable = hasConfig && hasCompletCredits;
            const isComingSoon = !hasConfig;

            return (
            <button
              key={examId}
              onClick={() => {
                if (isComingSoon) return;
                if (!hasCompletCredits) setShowPremiumModal(true);
                else startFullSequence(examId);
              }}
              disabled={isComingSoon}
              className={`group p-4 rounded-xl border text-left transition-colors relative w-full ${
                isComingSoon
                  ? "border-orange-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                  : isAvailable
                  ? "bg-white border-orange-200 hover:border-orange-400 cursor-pointer"
                  : "bg-neutral-50 border-orange-100 opacity-80 cursor-not-allowed"
              }`}
            >
                {isComingSoon ? (
                  <span className="absolute top-2 right-2 text-[8px] font-semibold text-neutral-400 uppercase">Bientôt</span>
                ) : !hasCompletCredits ? (
                  <Lock className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-neutral-300" />
                ) : null}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 border ${
                  isAvailable ? "border-orange-300" : "border-orange-100 bg-orange-50"
                }`} style={isAvailable ? { backgroundColor: BRAND.blue } : undefined}>
                  <Layers className={isAvailable ? "text-orange-300" : "text-neutral-400"} size={16} strokeWidth={1.75} />
                </div>
                <div className="text-sm font-bold mb-0.5" style={{ color: isAvailable ? BRAND.blue : "#737373" }}>
                  Examen {String(examId).padStart(2, "0")}
                </div>
                {!isComingSoon && (
                  <div className="flex gap-0.5 mt-1.5">
                    {["CE", "CO", "EE", "EO"].map((label) => (
                      <span key={label} className="text-[7px] font-semibold px-1 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">{label}</span>
                    ))}
                  </div>
                )}
            </button>
          )})}
        </main>

        <AnimatePresence>
          {showPremiumModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="relative w-full max-w-sm bg-white rounded-xl border border-orange-200 text-center p-6 z-10">
                <button onClick={() => setShowPremiumModal(false)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-orange-50 text-neutral-400"><X className="w-4 h-4" /></button>
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-200"><Crown className="w-6 h-6 text-orange-500" /></div>
                <h3 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>Crédits épuisés</h3>
                <p className="text-xs text-neutral-500 mb-5 leading-relaxed">Rechargez votre pack pour accéder à l&apos;examen complet.</p>
                <button onClick={() => { setShowPremiumModal(false); router.push("/profil"); }} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                  Recharger mon pack <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }


  // 📚 ÉCRAN 3 : SÉLECTION DU SUJET (MODE EE)
  if (!selectedSubject && !isFinished && examMode === 'EE') {
    const nbExamens = Object.keys(banqueSujetsExamen).length;

    return (
      <div className={HUB_PAGE_CLASS}>
        <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 py-3">
          <div className={`${EXAM_SHELL} flex items-center gap-3`}>
          <button onClick={() => setExamMode(null)} className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition-colors shrink-0">
            <ArrowLeft size={18} className="text-neutral-600" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] xl:text-xs font-semibold" style={{ color: BRAND.orange }}>Expression écrite</p>
            <h1 className={STUDENT_TEXT.pageTitle} style={{ color: BRAND.blue }}>Banque de sujets · 60 min</h1>
          </div>
          </div>
        </header>

        <main className={`${EXAM_SHELL} py-5 xl:py-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 xl:gap-4`}>
          {Array.from({length: nbExamens}).map((_, i) => (
            <button
              key={i+1}
              onClick={() => handleEEAction(() => setSelectedSubject(i+1))}
              className={`group p-4 rounded-xl border text-left transition-colors relative w-full ${
                hasEECredits
                  ? "bg-white border-orange-200 hover:border-orange-400 cursor-pointer"
                  : "bg-neutral-50 border-orange-100 opacity-80 cursor-not-allowed"
              }`}
            >
                {!hasEECredits && <Lock className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-neutral-300" />}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 border ${
                  hasEECredits ? "bg-orange-50 border-orange-200" : "bg-neutral-100 border-neutral-200"
                }`}>
                  <PenLine className={hasEECredits ? "text-orange-600" : "text-neutral-400"} size={16} strokeWidth={1.75} />
                </div>
                <div className="text-sm font-bold mb-0.5" style={{ color: hasEECredits ? BRAND.blue : "#737373" }}>
                  Examen {String(i+1).padStart(2, "0")}
                </div>
                <div className="text-[10px] font-medium" style={{ color: BRAND.orange }}>3 tâches · 60 min</div>
            </button>
          ))}
        </main>

        <AnimatePresence>
          {showPremiumModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setShowPremiumModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 12 }} className="relative w-full max-w-sm bg-white rounded-xl border border-orange-200 text-center p-6 z-10">
                <button onClick={() => setShowPremiumModal(false)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-orange-50 text-neutral-400"><X className="w-4 h-4" /></button>
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-200"><Crown className="w-6 h-6 text-orange-500" /></div>
                <h3 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>Crédits épuisés</h3>
                <p className="text-xs text-neutral-500 mb-5 leading-relaxed">Rechargez votre pack pour continuer les examens EE.</p>
                <button onClick={() => { setShowPremiumModal(false); router.push("/profil"); }} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                  Recharger mon pack <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 🏁 ÉCRAN 4 : AFFICHAGE DES RÉSULTATS (EE)
  if (isFinished) {
    return (
      <div className={HUB_PAGE_CLASS}>
        <header className="sticky top-0 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 p-3 z-40 flex justify-between items-center px-4">
           <button onClick={() => { setIsFinished(false); setSelectedSubject(null); setExamMode(null); }} className="text-xs font-semibold text-neutral-500 flex items-center gap-2 hover:text-orange-600 transition-colors group">
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform"/> Retour
           </button>
           <h2 className={STUDENT_TEXT.cardTitle} style={{ color: BRAND.blue }}>Rapport officiel</h2>
        </header>
        
        <main className={`${EXAM_SHELL} pt-8 md:pt-12 xl:pt-14 relative z-10 max-w-4xl xl:max-w-5xl 2xl:max-w-6xl`}>
           {loading ? (
             <div className="text-center py-24 bg-white rounded-xl border border-orange-200">
                <div className="relative mx-auto w-16 h-16 mb-6">
                    <div className="absolute inset-0 border-2 border-orange-100 rounded-full" />
                    <div className="absolute inset-0 border-2 border-orange-500 rounded-full border-t-transparent animate-spin" />
                </div>
                <h3 className={`${STUDENT_TEXT.sectionTitle} mb-2`} style={{ color: BRAND.blue }}>Correction en cours</h3>
                <p className="text-sm text-neutral-500">L&apos;IA NEXA analyse vos 3 tâches…</p>
             </div>
           ) : resultat && (
             <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="space-y-5">
               {/* SCORE GLOBAL */}
               <div className="bg-white rounded-xl border border-orange-200 p-6 md:p-8 relative overflow-hidden">
                   <div className="absolute -top-16 -right-16 w-48 h-48 bg-orange-50 rounded-full blur-3xl pointer-events-none" />
                   
                   <div className="flex flex-row items-center justify-between gap-4 mb-6 relative z-10 border-b border-orange-100 pb-6">
                       <div className="flex-shrink min-w-0">
                           <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: BRAND.orange }}>
                             <Award size={14} /> Note finale
                           </p>
                           <div className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none" style={{ color: BRAND.blue }}>
                              {String(resultat.note).replace(/\s*\/\s*20/i, "")}<span className="text-xl sm:text-2xl text-neutral-400 font-semibold ml-1">/ 20</span>
                           </div>
                       </div>
                       <div className="text-right flex-shrink-0">
                           <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Niveau CECRL</p>
                           <div className={`inline-block px-3 py-1.5 text-lg sm:text-xl font-bold rounded-lg uppercase tracking-wide ${
                                 resultat.niveau.includes("C") ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                 resultat.niveau.includes("B") ? "bg-blue-50 text-blue-600 border border-blue-100" :
                                 "bg-orange-50 text-orange-600 border border-orange-100"
                                }`}>
                             {resultat.niveau}
                           </div>
                       </div>
                   </div>

                   <div className="relative z-10">
                       <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                         <BookOpenCheck size={14} className="text-orange-500" /> Avis de l&apos;examinateur
                       </h4>
                       <p className="text-sm md:text-base text-neutral-700 leading-relaxed bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                         {resultat.commentaire_global}
                       </p>
                   </div>
               </div>

               {/* DÉTAILS PAR TÂCHE */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {resultat.details_taches?.map((t:any, index:number) => (
                    <div key={t.tache} className="bg-white p-4 rounded-xl border border-orange-200 hover:border-orange-300 transition-colors flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-orange-50 pb-3">
                           <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Tâche 0{t.tache || index + 1}</span>
                           <span className="text-base font-bold px-2 py-0.5 rounded-md bg-orange-50 border border-orange-100" style={{ color: BRAND.blue }}>{t.note}</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold text-orange-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Lightbulb size={11} /> Conseil
                          </p>
                          <p className="text-xs text-neutral-600 leading-relaxed">{t.conseil}</p>
                        </div>
                        {t.details_documents && t.details_documents.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-orange-50">
                            <p className="text-[9px] font-semibold text-blue-500 uppercase tracking-wider">Analyse par document</p>
                            {t.details_documents.map((doc: any) => (
                              <div key={doc.document} className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg space-y-1">
                                <p className="text-[9px] font-semibold text-blue-600 uppercase">Document {doc.document}</p>
                                <p className="text-[10px] text-neutral-600 leading-relaxed"><span className="font-semibold text-neutral-400">Reformulation : </span>{doc.reformulation}</p>
                                <p className="text-[10px] text-neutral-600 leading-relaxed"><span className="font-semibold text-neutral-400">Intégration : </span>{doc.integration}</p>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
               </div>

               {/* ERREURS & AMÉLIORATIONS */}
               <div className="bg-white p-5 md:p-6 rounded-xl border border-orange-200">
                  <h3 className={`flex items-center gap-2 ${STUDENT_TEXT.cardTitle} mb-4`} style={{ color: BRAND.blue }}>
                    <AlertTriangle size={16} className="text-amber-500"/> Synthèse analytique
                  </h3>
                  
                  <div className="space-y-3">
                    {resultat.erreurs?.length > 0 && (
                      <div className="space-y-2">
                         <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Axes d&apos;amélioration</h4>
                         {resultat.erreurs.map((e: any, i: number) => (
                           <div key={i} className="p-3 bg-amber-50/60 border border-amber-100 rounded-lg text-sm text-neutral-700 leading-relaxed flex flex-col gap-1.5">
                             {typeof e === "string" ? (
                               <div className="flex items-start gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                 <p>{e}</p>
                               </div>
                             ) : (
                               <>
                                 <div className="flex items-start gap-2">
                                   <span className="text-red-400 font-bold shrink-0">✗</span>
                                   <p className="line-through text-neutral-400">{e.faute}</p>
                                 </div>
                                 <div className="flex items-start gap-2">
                                   <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                   <p className="text-emerald-700 font-semibold">{e.correction}</p>
                                 </div>
                                 <p className="text-neutral-500 italic pl-4 text-xs">{e.explication}</p>
                               </>
                             )}
                           </div>
                         ))}
                      </div>
                    )}
                    {resultat.ameliorations?.length > 0 && (
                      <div className="space-y-2 mt-4">
                         <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">Points forts & suggestions</h4>
                         {resultat.ameliorations.map((a:string, i:number) => (
                             <div key={i} className="p-3 bg-blue-50/40 border border-blue-100 rounded-lg text-sm text-neutral-700 flex items-start gap-2 leading-relaxed">
                                 <Sparkles size={14} className="mt-0.5 shrink-0 text-blue-400"/> 
                                 <p>{a}</p>
                             </div>
                         ))}
                      </div>
                    )}
                  </div>
               </div>

               {/* CONSEIL */}
               <div className="text-white p-5 md:p-6 rounded-xl border border-orange-400 relative overflow-hidden" style={{ backgroundColor: BRAND.blue }}>
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
                  <h3 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-3 relative z-10 text-orange-300">
                    <Lightbulb size={14}/> Conseil pour le jour J
                  </h3>
                  <p className="text-base md:text-lg font-medium italic leading-relaxed relative z-10 text-white/90">&ldquo;{resultat.conseil_coach}&rdquo;</p>
               </div>
               
             </motion.div>
           )}
        </main>
      </div>
    );
  }

  // ✍️ ÉCRAN 5 : EXAMEN EE EN COURS
  return (
    <div className="fixed inset-0 z-[100] min-h-[100dvh] bg-[#FFFBF7] flex flex-col font-sans overflow-hidden">
     <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110]"
          >
            <div className="px-3 py-1.5 rounded-lg text-white text-[10px] font-semibold flex items-center gap-2 border border-orange-400" style={{ backgroundColor: BRAND.blue }}>
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
      <header className="sticky top-0 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 p-3 z-50 flex justify-between items-center px-4 gap-2">
          <button onClick={() => setQuitOpen(true)} className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-red-50 hover:border-red-200 transition-colors text-neutral-500 hover:text-red-500 shrink-0">
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-md bg-orange-50 border border-orange-100 shrink-0" style={{ color: BRAND.orange }}>
              EE · {String(selectedSubject).padStart(2, "0")}
            </span>
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-bold text-sm shrink-0 ${danger ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "text-white border-orange-400"}`} style={danger ? undefined : { backgroundColor: BRAND.blue }}>
              <Timer size={16} /> {formatTime(timeLeft)}
            </div>
          </div>
          <button onClick={handleFinish} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline">Soumettre</span><CheckCircle2 size={14} />
          </button>
      </header>

      <main className="w-full max-w-7xl xl:max-w-[90rem] mx-auto p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8 xl:gap-10 items-start relative z-10 overflow-y-auto pb-[env(safe-area-inset-bottom)]">

          {/* GAUCHE : SUJET (5 Colonnes) */}
          <div className="lg:col-span-5 space-y-3 md:space-y-4 lg:sticky lg:top-24">
            <div className="flex p-1 bg-white rounded-lg border border-orange-200">
               {[1,2,3].map(n => (
                 <button key={n} onClick={()=>setActiveTask(n as any)} className={`flex-1 py-2.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${activeTask===n ? 'bg-orange-500 text-white' : 'text-neutral-400 hover:text-neutral-600 hover:bg-orange-50'}`}>
                   Tâche 0{n}
                 </button>
               ))}
            </div>

            <div className="bg-white p-5 md:p-6 rounded-xl border border-orange-200 min-h-[220px] md:min-h-[280px]">
               <div className="flex items-center gap-2 mb-4">
                   <Target size={14} className="text-orange-500" />
                   <span className="text-[10px] font-semibold uppercase text-orange-600 tracking-wider">Sujet à traiter</span>
               </div>

               {typeof currentSubject === "string" ? (
                 <p className="font-medium text-neutral-800 leading-relaxed text-sm md:text-base whitespace-pre-wrap">{currentSubject}</p>
               ) : currentSubject ? (
                 <div className="space-y-4 mt-1">
                   <div>
                     <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Consigne</h3>
                     <p className="text-sm text-neutral-800 leading-relaxed">{currentSubject.consigne}</p>
                   </div>
                   <div className="pt-2 border-t border-orange-50">
                     <h2 className={`${STUDENT_TEXT.cardLabel} mb-1.5`} style={{ color: BRAND.blue }}>
                       Sujet : {currentSubject.titre}
                     </h2>
                   </div>
                   <div>
                     <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Document 1</h3>
                     <p className="text-sm text-neutral-700 leading-relaxed text-justify">{currentSubject.document1}</p>
                   </div>
                   <div>
                     <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Document 2</h3>
                     <p className="text-sm text-neutral-700 leading-relaxed text-justify">{currentSubject.document2}</p>
                   </div>
                 </div>
               ) : null}
            </div>
          </div>

          {/* DROITE : ÉDITEUR (7 Colonnes) */}
          <div className="lg:col-span-7 flex flex-col min-h-[48dvh] sm:min-h-[52dvh] lg:min-h-[560px] xl:min-h-[620px] bg-white rounded-xl border border-orange-200 overflow-hidden focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all relative">

            <div className="p-3 md:p-4 border-b border-orange-100 bg-orange-50/30 flex justify-between items-center px-5 md:px-6">
               <span className="text-[10px] font-semibold uppercase text-neutral-500 tracking-wider flex items-center gap-2">
                 <PenLine size={12}/> Rédaction
               </span>
               <div className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md border transition-colors ${
                 isWordCountValid
                   ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                   : "bg-orange-50 text-orange-600 border-orange-100"
               }`}>
                 {wordCount} / {minWords}–{maxWords} mots
               </div>
            </div>

            <textarea
              value={answers[activeTask]}
              onChange={(e) => {
                const newValue = e.target.value;
                const newWordCount = newValue.trim().split(/\s+/).filter((w) => w.length > 0).length;
                if (newWordCount <= maxWords || newValue.length < answers[activeTask].length) {
                  setAnswers({...answers, [activeTask]: newValue});
                }
              }}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className="flex-1 p-4 sm:p-5 md:p-8 xl:p-10 text-base xl:text-lg outline-none resize-none leading-relaxed bg-transparent placeholder:text-neutral-300 text-neutral-800 min-h-[200px]"
              placeholder="Commencez votre rédaction ici..."
            />

            <div className="p-3 md:p-4 bg-white border-t border-orange-100 flex gap-2 md:gap-3 relative z-10">
               {activeTask > 1 && (
                 <button onClick={()=>setActiveTask((t) => (t-1) as any)} className="flex-1 py-2.5 border border-orange-200 hover:bg-orange-50 rounded-lg font-semibold text-xs text-neutral-500 transition-colors">
                   Précédent
                 </button>
               )}
               {activeTask < 3 ? (
                   <button onClick={()=>setActiveTask((t) => (t+1) as any)} className="flex-[2] py-2.5 text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5" style={{ backgroundColor: BRAND.blue }}>
                     Suivant <ChevronRight size={14} />
                   </button>
               ) : (
                   <button onClick={handleFinish} className="flex-[2] py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all">
                       <CheckCircle2 size={15}/> Terminer
                   </button>
               )}
            </div>
          </div>
      </main>

      {/* MODAL QUITTER */}
      <AnimatePresence>
        {quitOpen && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{scale:0.95, opacity:0, y:12}} animate={{scale:1, opacity:1, y:0}} exit={{scale:0.95, opacity:0, y:12}} className="bg-white p-6 md:p-8 rounded-xl max-w-sm w-full text-center border border-orange-200">
               <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                   <Trash2 className="text-red-500" size={22}/>
               </div>
               <h3 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>Quitter l&apos;examen ?</h3>
               <p className="text-xs text-neutral-500 mb-6 leading-relaxed">Le chronomètre s&apos;arrêtera et votre progression sera effacée.</p>
               <div className="space-y-2">
                 <button onClick={() => confirmQuit()} className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-sm transition-colors">
                     Quitter et supprimer
                 </button>
                 <button onClick={() => setQuitOpen(false)} className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-neutral-700 rounded-lg font-semibold text-sm transition-colors">
                     Continuer l&apos;épreuve
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}