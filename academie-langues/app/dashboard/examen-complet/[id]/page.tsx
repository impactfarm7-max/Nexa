"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { examensComplets } from "@/app/data/examens_complets";
import { catalogueSeriesCE } from "@/app/data/comprehension_ecrite/index";
import { seriesData } from "@/app/data/comprehension_orale";
import { banqueSujetsExamen } from "@/app/data/sujets_examen";
import { banqueSujetsOral } from "@/app/data/sujets_oral";
import { supabase } from "@/app/utils/supabase";
import EpreuveCE from "@/app/components/examen/EpreuveCE";
import EpreuveCO from "@/app/components/examen/EpreuveCO";
import EpreuveEE from "@/app/components/examen/EpreuveEE";
import EpreuveEO, { type EOData } from "@/app/components/examen/EpreuveEO";
import { encryptMessage } from "@/app/utils/messageCrypto.client"
import {
  Timer, X, CheckCircle2, AlertTriangle,
  BookOpenCheck, Headphones, PenLine, Mic,
  Loader2, Trophy, Star, CloudOff, Cloud, RotateCcw,
} from "lucide-react";

// ─── Couleurs de marque NEXA (harmonisées avec dashboard/communauté) ───────
const BRAND = { blue: "#11224E", orange: "#F87B1B" };

// ─── Séquence officielle TCF Canada ────────────────────────────────────────
const SECTIONS = [
  { id: "CE", title: "Compréhension Écrite",  icon: BookOpenCheck, color: "blue",   time: "60 min"  },
  { id: "CO", title: "Compréhension Orale",   icon: Headphones,    color: "teal",   time: "40 min"  },
  { id: "EE", title: "Expression Écrite",     icon: PenLine,       color: "violet", time: "60 min"  },
  { id: "EO", title: "Expression Orale",      icon: Mic,           color: "rose",   time: "12 min"  },
];

const sectionStyles: Record<string, { activeBg: string; activeBorder: string; activeText: string }> = {
  CE: { activeBg: "bg-blue-50",   activeBorder: "border-blue-500",   activeText: "text-blue-600"   },
  CO: { activeBg: "bg-teal-50",   activeBorder: "border-teal-500",   activeText: "text-teal-600"   },
  EE: { activeBg: "bg-violet-50", activeBorder: "border-violet-500", activeText: "text-violet-600" },
  EO: { activeBg: "bg-rose-50",   activeBorder: "border-rose-500",   activeText: "text-rose-600"   },
};

const TOTAL_TIME = 9900; // 2 h 45 (durée officielle TCF Canada)

const CE_POINTS: Record<string, number> = { A1: 3, A2: 9, B1: 15, B2: 21, C1: 26, C2: 33 };
const CE_TOTAL = 699;

function getCELevel(score: number): string {
  if (score >= 600) return "C2";
  if (score >= 500) return "C1";
  if (score >= 400) return "B2";
  if (score >= 300) return "B1";
  if (score >= 200) return "A2";
  return "A1";
}

function getCOLevel(score: number, total: number): string {
  const p = total > 0 ? score / total : 0;
  if (p >= 0.9) return "C2";
  if (p >= 0.75) return "C1";
  if (p >= 0.6)  return "B2";
  if (p >= 0.45) return "B1";
  if (p >= 0.3)  return "A2";
  return "A1";
}

// ─── Types résultats ──────────────────────────────────────────────────────
interface CEResult { score: number; total: number; niveau: string; correctCount: number }
interface COResult { score: number; total: number; niveau: string; correctCount: number }
interface EEResult { note: string; niveau: string; details_taches: any[]; conseil_coach: string }
interface EOResult { tache1: any; tache2: any; tache3: any }
interface AllResults { ce: CEResult; co: COResult; ee: EEResult | null; eo: EOResult | null }

// ─── Phase ────────────────────────────────────────────────────────────────
type Phase = "loading" | "exam" | "correcting" | "results";
type SyncStatus = "idle" | "saving" | "saved" | "error";

export default function TunnelExamenComplet() {
  const router   = useRouter();
  const rawParams = useParams();
  const examenId = parseInt(rawParams.id as string);
  const config   = examensComplets.find((e) => e.id === examenId);
  const lsKey    = `exam_session_v1_${examenId}`;

  // ─── États globaux ────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft]       = useState(TOTAL_TIME);
  const [quitOpen, setQuitOpen]       = useState(false);
  const [phase, setPhase]             = useState<Phase>("loading");
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [syncStatus, setSyncStatus]   = useState<SyncStatus>("idle");
  const [restored, setRestored]       = useState(false);

  // ─── Certificat (généré côté serveur après finalize, on l'attend ici) ──
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [centerRank, setCenterRank] = useState<{ rank: number | null; total: number | null } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
const [reportText, setReportText] = useState("");
const [reportSending, setReportSending] = useState(false);
const [reportSent, setReportSent] = useState(false);


  // ─── Données collectées ───────────────────────────────────────────────
  const [ceAnswers, setCeAnswers] = useState<Record<number, number>>({});
  const [coAnswers, setCoAnswers] = useState<Record<number, string>>({});
  const [eeAnswers, setEeAnswers] = useState<{ 1: string; 2: string; 3: string } | null>(null);
  const [eoData,    setEoData]    = useState<EOData | null>(null);

  // ─── Résultats (lifted pour autosave progressif) ──────────────────────
  const [ceResult, setCeResult] = useState<CEResult | null>(null);
  const [coResult, setCoResult] = useState<COResult | null>(null);
  const [eeResult, setEeResult] = useState<EEResult | null>(null);
  const [eoResult, setEoResult] = useState<EOResult | null>(null);

  const results: AllResults | null = phase === "results" && ceResult && coResult
    ? { ce: ceResult, co: coResult, ee: eeResult, eo: eoResult }
    : null;

  // Refs pour autosave (toujours valeurs courantes sans déclencher les effets)
  const sessionIdRef  = useRef<string | null>(null);
  const currentStepRef = useRef(currentStep);
  const timeLeftRef   = useRef(timeLeft);
  const ceAnswersRef  = useRef(ceAnswers);
  const coAnswersRef  = useRef(coAnswers);
  const eeAnswersRef  = useRef(eeAnswers);
  const eoDataRef     = useRef(eoData);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { ceAnswersRef.current = ceAnswers; }, [ceAnswers]);
  useEffect(() => { coAnswersRef.current = coAnswers; }, [coAnswers]);
  useEffect(() => { eeAnswersRef.current = eeAnswers; }, [eeAnswers]);
  useEffect(() => { eoDataRef.current = eoData; }, [eoData]);

  // ─── Persistence helpers ──────────────────────────────────────────────
  const saveLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(lsKey, JSON.stringify({
        sessionId: sessionIdRef.current,
        currentStep: currentStepRef.current,
        timeLeft: timeLeftRef.current,
        ceAnswers: ceAnswersRef.current,
        coAnswers: coAnswersRef.current,
        eeAnswers: eeAnswersRef.current,
        eoData: eoDataRef.current,
      }));
    } catch {}
  }, [lsKey]);

  const saveServer = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setSyncStatus("saving");
      const res = await fetch("/api/exam-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: "save",
          sessionId: sessionIdRef.current,
          currentStep: currentStepRef.current,
          // ⚠️ on n'envoie plus timeLeft au serveur : il n'en a pas besoin,
          // il le recalcule lui-même à partir de started_at. L'envoyer ne
          // servirait qu'à donner une fausse impression de contrôle au
          // client -- le serveur l'ignore désormais complètement.
          ceAnswers: ceAnswersRef.current,
          coAnswers: coAnswersRef.current,
          eeAnswers: eeAnswersRef.current,
          eoData: eoDataRef.current,
        }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (typeof json.timeLeft === "number") {
          // Le serveur est la SEULE source de vérité pour le chrono -- on
          // recale systématiquement l'affichage local sur sa valeur. Ça
          // corrige toute dérive (onglet en arrière-plan, horloge système
          // modifiée, etc.) à chaque sauvegarde (toutes les 30s + à chaque
          // changement d'étape).
          setTimeLeft(json.timeLeft);
          if (json.timeLeft <= 0) {
            // Le serveur dit que le temps est écoulé : on verrouille et on
            // lance la correction immédiatement, même si l'affichage local
            // montrait encore quelques secondes.
            triggerCorrections(ceAnswersRef.current, coAnswersRef.current, eeAnswersRef.current, eoDataRef.current);
          }
        }
        setSyncStatus("saved");
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus("error");
    }
  }, []);
  const sendProblemReport = async (forceSubmit: boolean) => {
  setReportSending(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && sessionIdRef.current) {
      // 1. Ticket structuré, visible par le staff (pour le triage)
      await supabase.from("exam_support_tickets").insert({
        session_id: sessionIdRef.current,
        user_id: session.user.id,
        step: SECTIONS[currentStepRef.current]?.id || null,
        description: reportText.trim() || "Problème technique signalé sans détail.",
      });

      // 2. Message privé direct à l'admin -- pour une visibilité immédiate,
      // sans attendre qu'un staff aille consulter les tickets.
      try {
        const adminRes = await fetch("/api/messages/admin-id", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (adminRes.ok) {
          const { adminId } = await adminRes.json();
          if (adminId) {
            const alertText = `🚨 Problème technique pendant un examen (${SECTIONS[currentStepRef.current]?.id}) : ${reportText.trim() || "non précisé"}`;
            const enc = await encryptMessage(alertText, { kind: "private", userA: session.user.id, userB: adminId });
            await supabase.from("private_messages").insert({ from_user_id: session.user.id, to_user_id: adminId, message: enc });
          }
        }
      } catch (notifyErr) {
        console.warn("[exam-session] notification admin échouée (non bloquant):", notifyErr);
      }
    }
  } catch (err) {
    console.warn("[exam-session] envoi du ticket échoué:", err);
  }
  setReportSending(false);
  setReportSent(true);

  if (forceSubmit) {
    setReportOpen(false);
    // Réutilise exactement le même chemin que "temps écoulé" -- accepte
    // les sections incomplètes (ee/eo peuvent être null), déjà géré
    // proprement par triggerCorrections (affiche "Correction non
    // disponible" pour la section concernée).
    triggerCorrections(ceAnswersRef.current, coAnswersRef.current, eeAnswersRef.current, eoDataRef.current);
  }
};


  // ─── Init : restaurer ou créer une session au mount ───────────────────
  useEffect(() => {
    if (!Number.isFinite(examenId) || !config) return;
    let cancelled = false;
    const init = async () => {
      let restoredFromServer = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // 1. Chercher session active
          const getRes = await fetch(`/api/exam-session?examenId=${examenId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const getJson = await getRes.json().catch(() => ({}));
          if (cancelled) return;

          if (getJson.session) {
            // Restaurer
            const s = getJson.session;
            setSessionId(s.id);
            setCurrentStep(s.current_step ?? 0);
            setTimeLeft(s.time_left ?? TOTAL_TIME);
            setCeAnswers(s.ce_answers || {});
            setCoAnswers(s.co_answers || {});
            setEeAnswers(s.ee_answers);
            setEoData(s.eo_data);
            setCeResult(s.ce_result);
            setCoResult(s.co_result);
            setEeResult(s.ee_result);
            setEoResult(s.eo_result);
            setRestored(true);
            restoredFromServer = true;
          } else {
            // Créer une nouvelle session
            const initRes = await fetch("/api/exam-session", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ action: "init", examenId }),
            });
            const initJson = await initRes.json().catch(() => ({}));
            if (!cancelled && initJson.session) setSessionId(initJson.session.id);
          }
        }
      } catch (err) {
        console.warn("[exam-session] init error:", err);
      }

      // Fallback localStorage si serveur indisponible
      if (!restoredFromServer && !cancelled) {
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem(lsKey) : null;
          if (raw) {
            const local = JSON.parse(raw);
            setCurrentStep(local.currentStep ?? 0);
            setTimeLeft(local.timeLeft ?? TOTAL_TIME);
            setCeAnswers(local.ceAnswers || {});
            setCoAnswers(local.coAnswers || {});
            setEeAnswers(local.eeAnswers);
            setEoData(local.eoData);
            if (local.sessionId) setSessionId(local.sessionId);
            if (Object.keys(local.ceAnswers || {}).length > 0 || local.eeAnswers || local.eoData) {
              setRestored(true);
            }
          }
        } catch {}
      }

      if (!cancelled) setPhase("exam");
    };
    init();
    return () => { cancelled = true; };
  }, [examenId, config, lsKey]);

  // Protection contre l'actualisation
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, []);

  // Chronomètre global
  useEffect(() => {
    if (phase !== "exam" || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft]);

  // Poll de l'état du certificat (généré côté serveur après finalize) --
  // s'active uniquement une fois en phase "results", et s'arrête dès que
  // pdf_url est disponible ou après ~60s.
  useEffect(() => {
    if (phase !== "results" || !sessionIdRef.current) return;
    let cancelled = false;
    const poll = async () => {
      for (let i = 0; i < 20 && !cancelled; i++) {
        const { data } = await supabase
          .from("exam_certificates")
          .select("pdf_url")
          .eq("session_id", sessionIdRef.current)
          .eq("session_table", "exam_sessions")
          .maybeSingle();
        if (data?.pdf_url) {
          setCertificateUrl(data.pdf_url);
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [phase]);

  useEffect(() => {
    if (phase !== "results") return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/tcf/exam-eligibility", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const j = await res.json();
        if (j.mode === "center" && j.rank != null && j.rankTotal != null) {
          setCenterRank({ rank: j.rank, total: j.rankTotal });
        }
      }
    })();
  }, [phase]);

  // Temps écoulé → correction automatique
  useEffect(() => {
    if (timeLeft === 0 && phase === "exam") triggerCorrections(ceAnswersRef.current, coAnswersRef.current, eeAnswersRef.current, eoDataRef.current);
  }, [timeLeft, phase]);

  // Autosave localStorage à chaque changement de données
  useEffect(() => {
    if (phase !== "exam") return;
    saveLocal();
  }, [ceAnswers, coAnswers, eeAnswers, eoData, currentStep, phase, saveLocal]);

  // Autosave serveur toutes les 30s pendant l'examen
  useEffect(() => {
    if (phase !== "exam" || !sessionId) return;
    const id = setInterval(saveServer, 30000);
    return () => clearInterval(id);
  }, [phase, sessionId, saveServer]);

  // Flush serveur au changement d'étape
  useEffect(() => {
    if (phase !== "exam" || !sessionId) return;
    saveServer();
  }, [currentStep, phase, sessionId, saveServer]);

  const formatTime = (s: number) => {
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
    return `${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  };

  const danger = timeLeft <= 15 * 60;

  // ─── Helper : déclenche une correction IA en background (fire-and-forget)
  const triggerBackgroundCorrection = useCallback(async (
    action: "correct-ee" | "correct-eo",
    payload: any,
  ) => {
    if (!sessionIdRef.current) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/exam-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action, sessionId: sessionIdRef.current, ...payload }),
      });
    } catch (err) { console.warn(`[exam-session] ${action} trigger failed:`, err); }
  }, []);

  // ─── Callbacks sections ───────────────────────────────────────────────
  const handleCEComplete = (answers: Record<number, number>) => {
    setCeAnswers(answers);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCOComplete = (answers: Record<number, string>) => {
    setCoAnswers(answers);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEEComplete = (answers: { 1: string; 2: string; 3: string }) => {
    setEeAnswers(answers);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Lance la correction EE en background pendant que l'etudiant fait l'EO
    if (sujetEE) {
      void triggerBackgroundCorrection("correct-ee", { eeAnswers: answers, sujetEE });
    }
  };

  const handleEOComplete = (data: EOData) => {
    setEoData(data);
    // Lance la correction EO en background, puis on entre en phase correcting (qui poll)
    if (sujetEO) {
      void triggerBackgroundCorrection("correct-eo", { eoData: data, sujetEO });
    }
    triggerCorrections(ceAnswersRef.current, coAnswersRef.current, eeAnswersRef.current, data);
  };

  // ─── Calcul local + récupération des corrections IA depuis le serveur ───
  const triggerCorrections = async (
    ce: Record<number, number>,
    co: Record<number, string>,
    ee: { 1: string; 2: string; 3: string } | null,
    eo: EOData | null,
  ) => {
    setPhase("correcting");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // CE — calcul local
    const scoreCE = questionsCE.reduce((acc, q, i) => {
      return acc + (ce[i] === q.reponseCorrecte ? (CE_POINTS[q.niveau] ?? 3) : 0);
    }, 0);
    const correctCE = questionsCE.filter((q, i) => ce[i] === q.reponseCorrecte).length;

    // CO — calcul local
    const scoreCO = questionsCO.reduce((acc, q, i) => {
      return acc + (co[i] === q.correctAnswer ? q.points : 0);
    }, 0);
    const totalCO  = questionsCO.reduce((acc, q) => acc + q.points, 0);
    const correctCO = questionsCO.filter((q, i) => co[i] === q.correctAnswer).length;

    const localCE: CEResult = { score: scoreCE, total: CE_TOTAL, niveau: getCELevel(scoreCE), correctCount: correctCE };
    const localCO: COResult = { score: scoreCO, total: totalCO, niveau: getCOLevel(scoreCO, totalCO), correctCount: correctCO };
    setCeResult(localCE);
    setCoResult(localCO);

    // Polling : on attend que les corrections IA EE et EO soient prêtes côté serveur
    let finalEE: EEResult | null = null;
    let finalEO: EOResult | null = null;

    if (sessionIdRef.current) {
      // S'assure que les corrections sont lancées (au cas où le handler EE/EO n'a pas eu le temps)
      if (ee && sujetEE) void triggerBackgroundCorrection("correct-ee", { eeAnswers: ee, sujetEE });
      if (eo && sujetEO) void triggerBackgroundCorrection("correct-eo", { eoData: eo, sujetEO });

      const startedAt = Date.now();
      const MAX_WAIT_MS = 180_000; // 3 min max
      while (Date.now() - startedAt < MAX_WAIT_MS) {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          if (!authSession) break;
          const res = await fetch(`/api/exam-session?examenId=${examenId}`, {
            headers: { Authorization: `Bearer ${authSession.access_token}` },
          });
          const json = await res.json().catch(() => ({}));
          const s = json.session;
          if (s) {
            const eeOk = s.ee_correction_status === "done" || s.ee_correction_status === "failed" || !ee;
            const eoOk = s.eo_correction_status === "done" || s.eo_correction_status === "failed" || !eo;
            if (eeOk && eoOk) {
              finalEE = s.ee_result ?? null;
              finalEO = s.eo_result ?? null;
              break;
            }
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 3000));
      }
    } else {
      // Fallback : mode hors-ligne (pas de sessionId) — appel direct comme avant
      if (ee && sujetEE) {
        try {
          const t3 = sujetEE[3];
          const t3Fmt = `Consigne: ${t3.consigne}\nTitre: ${t3.titre}\nDoc 1: ${t3.document1}\nDoc 2: ${t3.document2}`;
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch("/api/simulateur/examen", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
            body: JSON.stringify({ message: `EXAMEN COMPLET\nT1: ${sujetEE[1]} -> Rep: ${ee[1]}\nT2: ${sujetEE[2]} -> Rep: ${ee[2]}\nT3: ${t3Fmt} -> Rep: ${ee[3]}` }),
          });
          const data = await res.json();
          const raw = (data.reply ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          finalEE = JSON.parse(raw);
        } catch { finalEE = null; }
      }
    }

    setEeResult(finalEE);
    setEoResult(finalEO);

    // Finalize la session côté serveur
    if (sessionIdRef.current) {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession) {
          await fetch("/api/exam-session", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authSession.access_token}` },
            body: JSON.stringify({ action: "finalize", sessionId: sessionIdRef.current, ceResult: localCE, coResult: localCO }),
          });
        }
        // Nettoie le localStorage maintenant que l'examen est fini
        if (typeof window !== "undefined") localStorage.removeItem(lsKey);
      } catch {}
    }

    setPhase("results");
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 text-center">
        <div>
          <p className="text-slate-500 mb-4">Examen introuvable.</p>
          <button onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm transition-colors">
            Retour
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PHASE : LOADING (init / restore depuis serveur)
  // ════════════════════════════════════════════════════════════════════
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-10 text-center bg-[#FFFBF7]">
        <div>
          <Loader2 className="text-orange-500 w-10 h-10 animate-spin mx-auto mb-4" />
          <p className="text-neutral-500 font-medium text-sm">Préparation de votre examen…</p>
        </div>
      </div>
    );
  }

  // ─── Données des épreuves ─────────────────────────────────────────────
  const questionsCE = catalogueSeriesCE.find((s) => s.id === config.sujet_ce)?.questions ?? [];
  const questionsCO = seriesData[config.sujet_co] ?? [];
  const sujetEE     = (banqueSujetsExamen as any)[config.sujet_ee];
  const sujetEO     = (banqueSujetsOral as any)[config.sujet_eo];

  // ════════════════════════════════════════════════════════════════════
  // PHASE : CORRECTION EN COURS
  // ════════════════════════════════════════════════════════════════════
  if (phase === "correcting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: `linear-gradient(180deg, ${BRAND.blue}, #0B1530)` }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
          <div className="w-24 h-24 bg-orange-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-orange-500/30">
            <Loader2 className="text-orange-400 w-12 h-12 animate-spin" />
          </div>
          <h2 className="text-3xl font-display font-black text-white mb-3">Correction en cours…</h2>
          <p className="text-slate-300 font-medium text-sm leading-relaxed">
            L'IA analyse vos 4 épreuves simultanément.<br />
            Calcul des scores CE & CO · Correction EE & EO…
          </p>
          <div className="mt-8 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-orange-500/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PHASE : RÉSULTATS COMPLETS
  // ════════════════════════════════════════════════════════════════════
  if (phase === "results" && results) {
    const { ce, co, ee, eo } = results;
    const timeUsed = TOTAL_TIME - timeLeft;

    const levelBadge = (niveau: string) => {
      const isC = niveau?.includes("C");
      const isB = niveau?.includes("B");
      const cls = isC
        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
        : isB
          ? "bg-blue-50 text-blue-600 border border-blue-100"
          : "bg-orange-50 text-orange-600 border border-orange-100";
      return (
        <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest ${cls}`}>
          {niveau}
        </span>
      );
    };

    return (
      <div className="min-h-screen bg-[#FFFBF7] pb-16 font-sans">
        {/* Header résultats */}
        <div className="px-6 py-10 text-center text-white relative overflow-hidden border-b-4" style={{ backgroundColor: BRAND.blue, borderColor: BRAND.orange }}>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundColor: BRAND.orange, boxShadow: `0 10px 30px ${BRAND.orange}66` }}>
              <Trophy className="text-white w-8 h-8" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: BRAND.orange }}>Rapport officiel NEXA du TCF Canada</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-display font-black tracking-tight mb-2">
              Examen Officiel {String(examenId).padStart(2, "0")}
            </h1>
            <p className="text-white/60 text-sm">
              Temps utilisé : <strong className="text-white">{formatTime(timeUsed)}</strong>
            </p>
            {centerRank?.rank != null && centerRank.total != null && (
              <p className="text-sm font-bold mt-3" style={{ color: BRAND.orange }}>
                Tu es {centerRank.rank}e sur {centerRank.total} ce mois-ci au centre
              </p>
            )}
          </motion.div>
        </div>

        <div className="nexa-student-shell mt-6 xl:mt-8 space-y-5 xl:space-y-7">

          {/* ── CE & CO côte à côte ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 xl:gap-7">

            {/* CE */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-orange-200 p-5 transition-colors hover:border-orange-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
                  <BookOpenCheck size={16} className="text-blue-600" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compréhension Écrite</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-4xl font-display font-black tracking-tighter leading-none" style={{ color: BRAND.blue }}>{ce.score}<span className="text-xl text-slate-400 font-bold ml-1">/{ce.total}</span></p>
                </div>
                <div className="ml-auto">{levelBadge(ce.niveau)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-600 font-bold mb-2">
                  {ce.correctCount} / {questionsCE.length} réponses correctes
                </p>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                    style={{ width: `${(ce.correctCount / Math.max(questionsCE.length, 1)) * 100}%` }} />
                </div>
              </div>
            </motion.div>

            {/* CO */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-orange-200 p-5 transition-colors hover:border-orange-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center">
                  <Headphones size={16} className="text-teal-600" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compréhension Orale</span>
              </div>
              <div className="flex items-end gap-3 mb-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                  <p className="text-4xl font-display font-black tracking-tighter leading-none" style={{ color: BRAND.blue }}>{co.score}<span className="text-xl text-slate-400 font-bold ml-1">/{co.total}</span></p>
                </div>
                <div className="ml-auto">{levelBadge(co.niveau)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-600 font-bold mb-2">
                  {co.correctCount} / {questionsCO.length} réponses correctes
                </p>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
                    style={{ width: `${(co.correctCount / Math.max(questionsCO.length, 1)) * 100}%` }} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── EE ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-orange-200 p-5 md:p-6 transition-colors hover:border-orange-300 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-orange-50 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-5 relative z-10">
              <div className="w-9 h-9 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center">
                <PenLine size={16} className="text-violet-600" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expression Écrite</span>
            </div>
            {ee ? (
              <div className="relative z-10">
                <div className="flex flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="flex-shrink min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 flex items-center gap-1.5" style={{ color: BRAND.orange }}>
                      <Star size={12} /> Note Globale
                    </p>
                    <p className="text-5xl md:text-6xl font-display font-black tracking-tighter leading-none" style={{ color: BRAND.blue }}>
                      {String(ee.note).replace(/\s*\/\s*20/i, "")}<span className="text-2xl md:text-3xl text-slate-400 font-bold tracking-normal ml-1">/ 20</span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Niveau CECRL</p>
                    {levelBadge(ee.niveau)}
                  </div>
                </div>
                {/* Détail par tâche */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:gap-4 mb-4">
                  {ee.details_taches?.map((t: any) => (
                    <div key={t.tache} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center hover:bg-orange-50/50 hover:border-orange-100 transition-all">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tâche {t.tache}</p>
                      <p className="text-2xl font-display font-black tracking-tighter" style={{ color: BRAND.blue }}>{t.note}</p>
                      {t.points_forts && (
                        <p className="text-[10px] text-slate-500 mt-2 leading-snug">{t.points_forts}</p>
                      )}
                    </div>
                  ))}
                </div>
                {/* Conseils coach */}
                {ee.conseil_coach && (
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star size={13} className="text-orange-500" />
                      <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Conseil Coach</p>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{ee.conseil_coach}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center relative z-10">
                <AlertTriangle size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-xs font-medium">Correction non disponible (aucune réponse ou erreur réseau)</p>
              </div>
            )}
          </motion.div>

          {/* ── EO ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-orange-200 p-5 md:p-6 transition-colors hover:border-orange-300">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center">
                <Mic size={16} className="text-rose-600" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Expression Orale</span>
            </div>
            {eo ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([1, 2, 3] as const).map((t) => {
                  const r = eo[`tache${t}` as keyof EOResult];
                  return (
                    <div key={t} className="bg-slate-50 border border-slate-100 rounded-xl p-4 hover:bg-orange-50/50 hover:border-orange-100 transition-all">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Tâche {t}</p>
                      <p className="text-2xl font-display font-black tracking-tighter mb-2" style={{ color: BRAND.blue }}>{r?.note ?? "—"}</p>
                      {levelBadge(r?.niveau ?? "—")}
                      {r?.commentaire_global && (
                        <p className="text-[10px] text-slate-600 mt-3 leading-snug">{r.commentaire_global}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center">
                <AlertTriangle size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-xs font-medium">Correction non disponible (aucune réponse ou erreur réseau)</p>
              </div>
            )}
          </motion.div>

          {/* ── Certificat ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
            {certificateUrl ? (
              <a
                href={certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 text-center hover:brightness-110"
                style={{ backgroundColor: BRAND.blue }}
              >
                Télécharger mon certificat
              </a>
            ) : (
              <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest text-center flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Génération du certificat en cours…
              </div>
            )}
          </motion.div>

          {/* Retour */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <button onClick={() => router.push("/dashboard")}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98]">
              Retour au tableau de bord
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PHASE : EXAMEN EN COURS
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] flex flex-col font-sans overflow-x-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 py-3">
        <div className="nexa-student-shell flex flex-wrap justify-between items-center gap-2 sm:gap-3">
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-[9px] xl:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 flex-wrap" style={{ color: BRAND.orange }}>
            Examen officiel du TCF Canada
            <span className={`inline-flex items-center gap-1 normal-case font-bold text-[9px] tracking-normal ${
              syncStatus === "saving" ? "text-amber-500" :
              syncStatus === "saved" ? "text-emerald-500" :
              syncStatus === "error" ? "text-red-500" : "text-slate-400"
            }`}>
              {syncStatus === "error" ? <CloudOff size={11} /> : <Cloud size={11} />}
              {syncStatus === "saving" ? "Sauvegarde…" : syncStatus === "saved" ? "Sauvegardé" : syncStatus === "error" ? "Hors ligne" : ""}
            </span>
          </p>
          <p className="text-sm xl:text-base font-display font-black truncate" style={{ color: BRAND.blue }}>
            {String(examenId).padStart(2, "0")} · {SECTIONS[currentStep].title}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
        <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-bold text-sm xl:text-base transition-colors ${
          danger ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "text-white border-orange-400"
        }`} style={danger ? {} : { backgroundColor: BRAND.blue }}>
          <Timer size={15} /> {formatTime(timeLeft)}
        </div>
        <button
          onClick={() => setReportOpen(true)}
          title="Signaler un problème"
          className="p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-orange-600 transition-colors"
        >
          <AlertTriangle size={18} />
        </button>

        <button onClick={() => setQuitOpen(true)}
          className="p-2 bg-white hover:bg-red-50 border border-orange-200 hover:border-red-200 rounded-lg text-neutral-500 hover:text-red-500 transition-colors">
          <X size={18} />
        </button>
        </div>
        </div>
      </header>

      {/* Bannière de session restaurée */}
      <AnimatePresence>
        {restored && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <RotateCcw size={16} />
              <p className="text-xs font-bold">Session reprise. Vos réponses ont été restaurées.</p>
            </div>
            <button onClick={() => setRestored(false)} className="text-emerald-600 hover:text-emerald-800">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de progression */}
      <div className="sticky top-[57px] z-40 bg-white border-b border-orange-100 py-3">
        <div className="nexa-student-shell max-w-3xl xl:max-w-4xl mx-auto flex items-center justify-between relative px-1">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
          <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full z-0 transition-all duration-700"
            style={{ width: `${(currentStep / 3) * 100}%`, backgroundColor: BRAND.orange }} />

          {SECTIONS.map((section, index) => {
            const isActive = index === currentStep;
            const isPast   = index < currentStep;
            const Icon     = section.icon;
            return (
              <div key={section.id} className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                  isActive
                    ? `${sectionStyles[section.id].activeBg} ${sectionStyles[section.id].activeBorder} ${sectionStyles[section.id].activeText} scale-110 shadow-lg`
                    : isPast ? "text-white"
                    : "bg-white border-slate-200 text-slate-300"
                }`} style={isPast ? { backgroundColor: BRAND.orange, borderColor: BRAND.orange } : {}}>
                  {isPast ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </div>
                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${
                  isActive ? sectionStyles[section.id].activeText : isPast ? "text-slate-700" : "text-slate-300"
                }`}>{section.id}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenu épreuve */}
      <main className="nexa-student-shell flex-1 py-4 md:py-6 xl:py-8">
        <AnimatePresence mode="wait">
          <motion.div key={`banner-${currentStep}`}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }}
            className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: BRAND.orange }}>Épreuve {currentStep + 1} sur 4</p>
              <h2 className="text-lg sm:text-xl xl:text-2xl 2xl:text-3xl font-display font-black tracking-tight" style={{ color: BRAND.blue }}>{SECTIONS[currentStep].title}</h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 rounded-xl border border-orange-100">
              <Timer size={12} className="text-orange-500" />
              <span className="text-xs font-bold text-orange-500">{SECTIONS[currentStep].time}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div key={`section-${currentStep}`}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>

            {currentStep === 0 && questionsCE.length > 0 && (
              <EpreuveCE questions={questionsCE} onComplete={handleCEComplete} initialAnswers={ceAnswers} onAnswerChange={setCeAnswers} />
            )}
            {currentStep === 1 && questionsCO.length > 0 && (
              <EpreuveCO questions={questionsCO} onComplete={handleCOComplete} initialAnswers={coAnswers} onAnswerChange={setCoAnswers} />
            )}
            {currentStep === 2 && sujetEE && (
              <EpreuveEE sujet={sujetEE} sujetId={config.sujet_ee} onComplete={handleEEComplete} initialAnswers={eeAnswers ?? undefined} onAnswerChange={setEeAnswers} />
            )}
            {currentStep === 3 && sujetEO && (
              <EpreuveEO sujet={sujetEO} sujetId={config.sujet_eo} onComplete={handleEOComplete} initialData={eoData} onDataChange={setEoData} />
            )}

            {/* Fallback données manquantes */}
            {((currentStep === 0 && !questionsCE.length) ||
              (currentStep === 1 && !questionsCO.length) ||
              (currentStep === 2 && !sujetEE) ||
              (currentStep === 3 && !sujetEO)) && (
              <div className="bg-white rounded-xl border border-orange-200 p-6 text-center">
                <p className="text-neutral-500 mb-4">Données introuvables pour cette épreuve.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modale abandon */}
      <AnimatePresence>
        {quitOpen && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-xl max-w-sm w-full text-center border border-orange-200">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-100">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <h3 className="font-display font-black text-xl mb-2 tracking-tight" style={{ color: BRAND.blue }}>Abandonner l'examen ?</h3>
              <p className="text-xs text-slate-500 mb-8 font-medium leading-relaxed">
                Cette action est irréversible. Votre progression sera perdue.
              </p>
              <div className="space-y-3">
                <button onClick={async () => {
                  setQuitOpen(false);
                  if (sessionIdRef.current) {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (session) {
                        await fetch("/api/exam-session", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
                          body: JSON.stringify({ action: "abandon", sessionId: sessionIdRef.current }),
                        });
                      }
                    } catch {}
                  }
                  if (typeof window !== "undefined") localStorage.removeItem(lsKey);
                  router.push("/dashboard");
                }}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md transition-colors">
                  Confirmer l'abandon
                </button>
                <button onClick={() => setQuitOpen(false)}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors">
                  Retourner à l'épreuve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
  {reportOpen && (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white p-6 rounded-xl max-w-md w-full border border-orange-200">
        {reportSent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-100">
              <CheckCircle2 className="text-emerald-600" size={24} />
            </div>
            <h3 className="font-display font-black text-lg mb-2" style={{ color: BRAND.blue }}>Problème signalé</h3>
            <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
              L'équipe NEXA a été notifiée. Vous pouvez continuer l'épreuve ou soumettre votre copie telle quelle. Un enseignant pourra réexaminer manuellement la section concernée.
            </p>
            <div className="space-y-3">
              <button onClick={() => sendProblemReport(true)}
                className="w-full py-3.5 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md transition-colors"
                style={{ backgroundColor: BRAND.blue }}>
                Soumettre ma copie telle quelle
              </button>
              <button onClick={() => { setReportOpen(false); setReportSent(false); setReportText(""); }}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors">
                Continuer à essayer
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
            <h3 className="font-display font-black text-lg mb-2 text-center" style={{ color: BRAND.blue }}>Signaler un problème</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed text-center">
              Décrivez ce qui ne fonctionne pas (micro, enregistrement, transcription...). Un enseignant sera notifié immédiatement.
            </p>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={4}
              placeholder="Ex : le micro ne s'active pas à la tâche 2 de l'expression orale..."
              className="w-full border-2 border-slate-200 focus:border-orange-400 rounded-xl p-3 text-sm text-slate-800 resize-none outline-none mb-4"
            />
            <div className="space-y-3">
              <button onClick={() => sendProblemReport(false)} disabled={reportSending || !reportText.trim()}
                className="w-full py-3.5 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md transition-colors disabled:opacity-50"
                style={{ backgroundColor: BRAND.orange }}>
                {reportSending ? "Envoi..." : "Envoyer le signalement"}
              </button>
              <button onClick={() => setReportOpen(false)}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-colors">
                Annuler
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )}
</AnimatePresence>


    </div>
  );
}
