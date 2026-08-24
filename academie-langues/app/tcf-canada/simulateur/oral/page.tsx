"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { banqueSujetsOral } from "@/app/data/sujets_oral";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit";
import { useOralSimulatorLock } from "@/app/hooks/useOralSimulatorLock";
import OralSimulatorMaintenance from "@/app/components/simulateur/OralSimulatorMaintenance";
import { getOralCorrectionUserMessage } from "@/app/utils/oral-correction-errors";
import { runExaminerSpeechFromStream, stopEdgeTts } from "@/app/utils/speak-edge-tts";
import { pickRecorderMimeType, transcribeRecordingBlob } from "@/app/utils/audio-recording";
import { supabase } from "@/app/utils/supabase";
import {
  ArrowLeft,
  Mic,
  Square,
  Volume2,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Timer,
  ChevronRight,
  GraduationCap,
  AlertTriangle,
  X,
  Flag,
  Loader2,
  Download,
} from "lucide-react";

const SESSION_TIMEOUT_MS = 8000;

/** supabase.auth.getSession() peut rester pendante sans jamais résoudre en cas
 * de stall réseau — évite de bloquer indéfiniment le simulateur oral. */
async function getSessionSafe() {
  try {
    return await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), SESSION_TIMEOUT_MS),
      ),
    ]);
  } catch {
    return { data: { session: null } };
  }
}

type Task = 1 | 2 | 3;
type Msg = { role: "user" | "ai"; text: string };

// Défini au niveau module pour garder une référence stable entre les rendus
// (le définir à l'intérieur du composant causerait un unmount/remount à chaque render)
const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={[
      "bg-white rounded-3xl border border-neutral-200/60 shadow-sm",
      className,
    ].join(" ")}
  >
    {children}
  </section>
);

export default function ModeOral() {
  const router = useRouter();
  const { locked: oralLocked } = useOralSimulatorLock();

  // --------- États ---------
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isFullExam, setIsFullExam] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");

  const [conversation, setConversation] = useState<Msg[]>([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  const [timer, setTimer] = useState(0);

  const [hint, setHint] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioBlobMimeRef = useRef<string>("audio/webm");

  const { canSimulateEO, eoLeft, isAdmin, loading: limitLoading, recordEOSimulation, isEssaiPack } = useSimulationLimit();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Refs pour éviter les stale closures
  const activeTaskRef = useRef<Task | null>(null);
  const selectedSubjectRef = useRef<number | null>(null);
  const conversationRef = useRef<Msg[]>([]);
  const userTurnsRef = useRef(0);
  const transcriptRef = useRef("");
  const timerStartedRef = useRef(false);
  const timerExpiredRef = useRef(false);
  const [autoCorrectPending, setAutoCorrectPending] = useState(false);
  const [taskTimeUp, setTaskTimeUp] = useState(false);
  const autoCorrectTriggeredRef = useRef(false);
  const interactionGenerationRef = useRef(0);
  const transcribeGenerationRef = useRef(0);

  // Ref pour le chat
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --------- Voix française ---------
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const pickBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const fr = voices.filter((v) => v.lang.startsWith("fr"));
      voiceRef.current =
        fr.find((v) => v.name.includes("Google")) ??
        fr.find((v) => v.name.includes("Microsoft")) ??
        fr.find((v) => /amélie|thomas|juliette|nicolas/i.test(v.name)) ??
        fr[0] ??
        null;
    };

    if (window.speechSynthesis.getVoices().length > 0) pickBestVoice();
    window.speechSynthesis.onvoiceschanged = pickBestVoice;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const runStreamingExaminerSpeech = async (
    response: Response,
    accessToken: string,
    onText: (fullText: string) => void,
    shouldAbort?: () => boolean,
  ) => {
    await runExaminerSpeechFromStream(
      response,
      accessToken,
      voiceRef.current,
      onText,
      shouldAbort,
    );
  };

  const timersParTache: Record<Task, number> = { 1: 120, 2: 210, 3: 270 };

  const MAX_TURNS = 10;
  const userTurns = useMemo(
    () => conversation.filter((m) => m.role === "user").length,
    [conversation]
  );
  const turnsLeft = Math.max(0, MAX_TURNS - userTurns);
  const task2Locked = activeTask === 2 && userTurns >= MAX_TURNS;

  const subjectText = useMemo(() => {
    if (!selectedSubject || !activeTask) return "";
    return banqueSujetsOral[selectedSubject]?.[activeTask] ?? "";
  }, [selectedSubject, activeTask]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const danger = timer > 0 && timer <= 20;

  // Sync refs pour éviter les stale closures
  useEffect(() => { activeTaskRef.current = activeTask; }, [activeTask]);
  useEffect(() => { selectedSubjectRef.current = selectedSubject; }, [selectedSubject]);
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);
  useEffect(() => { userTurnsRef.current = userTurns; }, [userTurns]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const resetTimerAutoCorrectState = () => {
    timerStartedRef.current = false;
    timerExpiredRef.current = false;
    setTaskTimeUp(false);
    setAutoCorrectPending(false);
    autoCorrectTriggeredRef.current = false;
    interactionGenerationRef.current += 1;
    transcribeGenerationRef.current += 1;
  };

  // Auto-scroll vers le bas à chaque nouveau message / chunk de l'IA
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [conversation]);

  // --------- Timer (décompte continu une fois démarré) ---------
  useEffect(() => {
    if (!activeTask || !selectedSubject || resultat || timer <= 0 || !timerStartedRef.current) {
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask, selectedSubject, resultat, timer]);

  useEffect(() => {
    if (timer !== 0 || !timerStartedRef.current || timerExpiredRef.current) return;
    if (!activeTask || !selectedSubject || resultat) return;

    timerExpiredRef.current = true;
    setTaskTimeUp(true);
    setAutoCorrectPending(true);
    interactionGenerationRef.current += 1;
    transcribeGenerationRef.current += 1;

    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    stopEdgeTts();
    setAiSpeaking(false);
    setLoading(false);
    setTranscribing(false);
    setHint("Temps écoulé. Correction automatique en cours…");
  }, [timer, activeTask, selectedSubject, resultat]);

  useEffect(() => {
    if (activeTask !== 2 || !selectedSubject || resultat) return;
    if (userTurns < MAX_TURNS) return;
    if (autoCorrectTriggeredRef.current) return;

    setAutoCorrectPending(true);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setHint("Dialogue terminé. Correction automatique en cours…");
  }, [activeTask, selectedSubject, resultat, userTurns]);

  // --------- ✅ Interaction Tâche 2 — reçoit le texte directement ---------
  const handleInteractionWithText = async (msg: string) => {
    const currentTask = activeTaskRef.current;
    const currentSubject = selectedSubjectRef.current;
    const currentUserTurns = userTurnsRef.current;

    if (currentTask !== 2 || !currentSubject) return;
    if (timerExpiredRef.current) return;
    if (!msg.trim()) return;

    if (currentUserTurns >= MAX_TURNS) {
      setAutoCorrectPending(true);
      setHint("Dialogue terminé. Correction automatique en cours…");
      return;
    }

    const looksLikeQuestion =
      msg.includes("?") ||
      /pourquoi|comment|quand|où|quel|quelle|quels|quelles|est-ce que/i.test(msg);

    if (!looksLikeQuestion) {
      setHint("En tâche 2, essayez de poser une question à l'examinateur.");
      setTimeout(() => setHint(null), 2500);
    }

    setConversation((prev) => [
      ...prev,
      { role: "user", text: msg },
      { role: "ai", text: "" },
    ]);
    setLoading(true);
    const interactionGeneration = interactionGenerationRef.current;

    try {
      const currentSujet = banqueSujetsOral[currentSubject]?.[2] ?? "";

      const { data: { session } } = await getSessionSafe();
      const res = await fetch("/api/simulateur/oral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "interaction",
          message: msg,
          sujet: currentSujet,
          tour: currentUserTurns + 1,
          tours_restants: Math.max(0, MAX_TURNS - (currentUserTurns + 1)),
        }),
      });

      if (
        interactionGeneration !== interactionGenerationRef.current ||
        timerExpiredRef.current
      ) {
        return;
      }

      if (!res.body) throw new Error("Pas de stream");

      const token = session?.access_token ?? "";
      setLoading(false);
      setAiSpeaking(true);

      const shouldAbort = () =>
        interactionGeneration !== interactionGenerationRef.current ||
        timerExpiredRef.current;

      await runStreamingExaminerSpeech(res, token, (fullText) => {
        if (shouldAbort()) return;
        setConversation((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "ai", text: fullText };
          return updated;
        });
      }, shouldAbort);
    } catch {
      if (
        interactionGeneration === interactionGenerationRef.current &&
        !timerExpiredRef.current
      ) {
        alert("Connexion interrompue. Vérifiez votre réseau et réessayez.");
      }
    } finally {
      if (interactionGeneration === interactionGenerationRef.current) {
        setLoading(false);
        setAiSpeaking(false);
      }
    }
  };

  // --------- ✅ Transcription Whisper — auto-trigger pour Tâche 2 ---------
  const transcribeAudio = async (audioBlob: Blob) => {
    if (timerExpiredRef.current) return;

    const transcribeGeneration = transcribeGenerationRef.current;
    setTranscribing(true);

    try {
      const { data: { session } } = await getSessionSafe();
      const token = session?.access_token ?? "";

      let result = await transcribeRecordingBlob(
        audioBlob,
        audioBlobMimeRef.current,
        token,
      );

      if (
        transcribeGeneration !== transcribeGenerationRef.current ||
        timerExpiredRef.current
      ) {
        return;
      }

      if (!result.ok && result.error === "Erreur de transcription. Réessayez.") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        result = await transcribeRecordingBlob(
          audioBlob,
          audioBlobMimeRef.current,
          token,
        );
      }

      if (
        transcribeGeneration !== transcribeGenerationRef.current ||
        timerExpiredRef.current
      ) {
        return;
      }

      if (!result.ok) {
        setHint(result.error);
        setTimeout(() => setHint(null), 4000);
        return;
      }

      const text = result.transcript;

      if (activeTaskRef.current === 2) {
        if (text.trim()) {
          if (timerExpiredRef.current) {
            setConversation((prev) => [...prev, { role: "user", text }]);
          } else {
            await handleInteractionWithText(text);
          }
        } else if (!timerExpiredRef.current) {
          setHint("Aucune parole détectée. Réessayez.");
          setTimeout(() => setHint(null), 3000);
        }
      } else {
        setTranscript(text);
      }
    } catch {
      setHint("Erreur de transcription. Vérifiez votre connexion et réessayez.");
      setTimeout(() => setHint(null), 4000);
    } finally {
      if (transcribeGeneration === transcribeGenerationRef.current) {
        setTranscribing(false);
      }
    }
  };

  // --------- Démarrage MediaRecorder ---------
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickRecorderMimeType();

    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timerExpiredRef.current) return;

      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      audioBlobMimeRef.current = mimeType;
      setAudioBlob(blob);
      if (blob.size < 800) {
        setHint("Enregistrement trop court. Parlez au moins une seconde.");
        setTimeout(() => setHint(null), 4000);
        return;
      }
      transcribeAudio(blob);
    };

    mediaRecorder.start(500);
    mediaRecorderRef.current = mediaRecorder;
  };

  // --------- Toggle micro ---------
  const toggleRecording = async () => {
    if (!activeTask) return;

    if (activeTask === 2 && (task2Locked || taskTimeUp)) {
      setHint(
        taskTimeUp
          ? "Temps écoulé. Correction en cours…"
          : "Tous les tours sont utilisés. Correction en cours…",
      );
      setTimeout(() => setHint(null), 2500);
      return;
    }

    if (taskTimeUp) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (timer === 0) {
      setTimer(timersParTache[activeTask]);
      timerStartedRef.current = true;
      timerExpiredRef.current = false;
      setTaskTimeUp(false);
      setAutoCorrectPending(false);
      autoCorrectTriggeredRef.current = false;
    }
    setResultat(null);

    try {
      await startRecording();
      setIsRecording(true);
    } catch {
      setHint("🎤 Veuillez autoriser l'accès au microphone dans votre navigateur.");
      setTimeout(() => setHint(null), 4000);
    }
  };

  // --------- Correction finale ---------
  const handleFinalCorrection = async () => {
    const currentSubject = selectedSubjectRef.current;
    const currentTask = activeTaskRef.current;
    if (!currentSubject || !currentTask) return;
    if (isCorrecting || resultat) return;
    if (!canSimulateEO) {
      setCorrectionError(
        getOralCorrectionUserMessage({
          message: "Quota EO épuisé ou limite hebdomadaire atteinte.",
          status: 429,
        }),
      );
      return;
    }
    setLoading(true);
    setIsCorrecting(true);
    setCorrectionError(null);

    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    stopEdgeTts();

    const currentSujet =
      banqueSujetsOral[currentSubject]?.[currentTask] ?? subjectText;
    const currentConversation = conversationRef.current;
    const currentTranscript = transcriptRef.current.trim();
    const currentUserTurns = userTurnsRef.current;
    const finalMessage =
      currentTask === 2
        ? currentConversation
            .filter((c) => c.role === "user" && c.text.trim())
            .map((c) => `Moi: ${c.text}`)
            .join("\n") ||
          currentConversation
            .map((c) => `${c.role === "user" ? "Moi" : "Examinateur"}: ${c.text}`)
            .join("\n")
        : currentTranscript;

    if (!finalMessage) {
      setHint("Aucune parole détectée. Enregistrez votre réponse avant de corriger.");
      setTimeout(() => setHint(null), 3500);
      setLoading(false);
      setIsCorrecting(false);
      autoCorrectTriggeredRef.current = false;
      return;
    }

    const MAX_RETRIES = 3;
    let lastError = "";
    let lastStatus: number | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          setHint(`Nouvelle tentative de correction (${attempt}/${MAX_RETRIES})…`);
        }

        const { data: { session } } = await getSessionSafe();
        if (!session) throw new Error("Session expirée. Veuillez vous reconnecter.");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

        const res = await fetch("/api/simulateur/oral", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "correction",
            message: finalMessage,
            sujet: currentSujet,
            task: currentTask,
            isTask2: currentTask === 2,
            tours: currentTask === 2 ? currentUserTurns : undefined,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastStatus = res.status;

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          const apiError =
            payload && typeof payload === "object" && "error" in payload
              ? String((payload as { error?: string }).error)
              : `Erreur ${res.status}`;
          throw new Error(apiError);
        }

        if (!payload || typeof payload !== "object" || !("note" in payload)) {
          throw new Error("Réponse de correction invalide.");
        }

        setHint(null);
        setResultat(payload);
        recordEOSimulation();
        setLoading(false);
        setIsCorrecting(false);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Erreur inconnue";
        if (error instanceof Error && error.name === "AbortError") {
          lastError = "AbortError";
        }

        const isRetryable =
          lastError.includes("AbortError") ||
          lastError.includes("timeout") ||
          lastError.includes("Failed to fetch") ||
          lastError.includes("429") ||
          lastError.includes("502") ||
          lastError.includes("503") ||
          lastError.includes("JSON") ||
          lastError.includes("invalide") ||
          lastError.includes("n'a pas pu être générée");

        if (isRetryable && attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        break;
      }
    }

    setHint(null);
    setCorrectionError(
      getOralCorrectionUserMessage({ message: lastError, status: lastStatus }),
    );
    setLoading(false);
    setIsCorrecting(false);
  };

  useEffect(() => {
    if (!autoCorrectPending || autoCorrectTriggeredRef.current) return;
    if (!activeTask || !selectedSubject || resultat || isCorrecting) return;
    if (isRecording || transcribing || aiSpeaking || loading) return;

    autoCorrectTriggeredRef.current = true;
    setAutoCorrectPending(false);
    void handleFinalCorrection();
  }, [
    autoCorrectPending,
    isRecording,
    transcribing,
    aiSpeaking,
    loading,
    isCorrecting,
    resultat,
    activeTask,
    selectedSubject,
    conversation,
    transcript,
    userTurns,
    timer,
    canSimulateEO,
  ]);

  // --------- Reset / Next ---------
  const resetAll = () => {
    mediaRecorderRef.current?.stop();
    stopEdgeTts();
    setSelectedSubject(null);
    setActiveTask(null);
    setTranscript("");
    setConversation([]);
    setResultat(null);
    setTimer(0);
    setIsFullExam(false);
    setLoading(false);
    setIsCorrecting(false);
    setAiSpeaking(false);
    setIsRecording(false);
    setTranscribing(false);
    setHint(null);
    setCorrectionError(null);
    setQuitOpen(false);
    setAudioBlob(null);
    resetTimerAutoCorrectState();
  };

  // --------- Téléchargements ---------
  const downloadAudio = () => {
    if (!audioBlob) return;
    const ext = audioBlobMimeRef.current.includes("mp4") ? "mp4" : "webm";
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iag_tache${activeTask}_audio.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadChat = () => {
    if (!conversation.length) return;
    const text = conversation
      .map((m) => `${m.role === "user" ? "Vous" : "Examinateur"}: ${m.text}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iag_tache2_dialogue.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCorrection = async () => {
    if (!resultat) return;
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const mL = 16, mR = 16;
    const cW = W - mL - mR;
    let y = 0;

    // ── Palette ──────────────────────────────────────────────────────
    const C = {
      orange:   [234, 88,  12]  as [number, number, number],
      slate900: [15,  23,  42]  as [number, number, number],
      slate700: [51,  65,  85]  as [number, number, number],
      slate500: [100, 116, 139] as [number, number, number],
      slate200: [226, 232, 240] as [number, number, number],
      slate50:  [248, 250, 252] as [number, number, number],
      white:    [255, 255, 255] as [number, number, number],
      blue:     [37,  99,  235] as [number, number, number],
      emerald:  [5,   150, 105] as [number, number, number],
      amber:    [217, 119, 6]   as [number, number, number],
      red:      [220, 38,  38]  as [number, number, number],
      emeraldBg:[236, 253, 245] as [number, number, number],
      amberBg:  [255, 251, 235] as [number, number, number],
      blueBg:   [239, 246, 255] as [number, number, number],
    };

    const setFill = (c: [number, number, number]) => doc.setFillColor(...c);
    const setDraw = (c: [number, number, number]) => doc.setDrawColor(...c);
    const setTxt  = (c: [number, number, number]) => doc.setTextColor(...c);

    const pageBreak = (need: number) => {
      if (y + need > H - 14) { doc.addPage(); y = 22; drawPageBg(); }
    };

    const wrap = (text: string, x: number, maxW: number, lh: number) => {
      const lines = doc.splitTextToSize(text || "", maxW);
      lines.forEach((line: string) => { pageBreak(lh); doc.text(line, x, y); y += lh; });
    };

    const drawPageBg = () => {
      setFill(C.slate50);
      doc.rect(0, 0, 6, H, "F");
      setFill(C.orange);
      doc.rect(0, 0, 6, 60, "F");
    };

    const sectionHeader = (label: string, accent: [number, number, number], bg: [number, number, number]) => {
      pageBreak(14);
      setFill(bg);
      doc.roundedRect(mL, y - 5, cW, 11, 2, 2, "F");
      setFill(accent);
      doc.roundedRect(mL, y - 5, 3, 11, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setTxt(accent);
      doc.text(label.toUpperCase(), mL + 7, y + 2.5);
      y += 10;
    };

    const divider = (gap = 4) => {
      y += gap;
      setDraw(C.slate200);
      doc.setLineWidth(0.2);
      doc.line(mL, y, W - mR, y);
      y += gap;
    };

    // ── En-tête ──────────────────────────────────────────────────────
    drawPageBg();
    setFill(C.orange);
    doc.rect(0, 0, W, 18, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTxt(C.white);
    doc.text("IAG Academy", mL + 2, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTxt([255, 200, 150] as [number, number, number]);
    doc.text("Rapport de correction du simulateur oral", mL + 2, 16.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTxt(C.white);
    const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(`Tache 0${activeTask}`, W - mR, 10, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTxt([255, 200, 150] as [number, number, number]);
    doc.text(dateStr, W - mR, 15.5, { align: "right" });

    y = 28;

    // ── SECTION 1 — SUJET ────────────────────────────────────────────
    sectionHeader("Sujet de la tâche", C.orange, [255, 247, 237]);
    y += 3;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10.5);
    setTxt(C.slate700);
    wrap(subjectText, mL + 4, cW - 12, 5.8);
    y += 4;

    // ── SECTION 2 — TRANSCRIPTION / DIALOGUE ─────────────────────────
    divider();
    const hasDialogue = activeTask === 2 && conversation.length > 0;
    const hasTranscript = !hasDialogue && !!transcript;

    if (hasDialogue) {
      sectionHeader("Dialogue (Tâche 2)", C.blue, C.blueBg);
      y += 3;
      conversation.forEach((m) => {
        const speaker = m.role === "user" ? "Vous" : "Examinateur";
        const label = `${speaker} :`;
        pageBreak(8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        setTxt(m.role === "user" ? C.blue : C.emerald);
        doc.text(label, mL + 4, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        setTxt(C.slate700);
        wrap(m.text, mL + 8, cW - 16, 5.2);
        y += 2;
      });
      y += 4;
    } else if (hasTranscript) {
      sectionHeader("Votre transcription", C.blue, C.blueBg);
      y += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setTxt(C.slate700);
      wrap(transcript, mL + 4, cW - 12, 5.8);
      y += 6;
    }

    // ── SECTION 3 — CORRECTION IA ────────────────────────────────────
    divider();
    sectionHeader("Correction IAG Academy Coach", C.emerald, C.emeraldBg);
    y += 4;

    // Score Card
    pageBreak(28);
    setFill(C.slate900);
    doc.roundedRect(mL, y, cW, 24, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    setTxt(C.white);
    doc.text(`${resultat.note}`, mL + 10, y + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTxt(C.slate500);
    doc.text("/ 20", mL + 24, y + 15);

    setDraw([60, 80, 100] as [number, number, number]);
    doc.setLineWidth(0.3);
    doc.line(mL + 52, y + 4, mL + 52, y + 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(C.slate500);
    doc.text("NIVEAU ESTIME", mL + 57, y + 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setTxt(C.orange);
    doc.text(resultat.niveau ?? "", mL + 57, y + 18);

    const scoreVal = parseFloat(resultat.note);
    const scoreLabel = scoreVal >= 16 ? "Excellent" : scoreVal >= 12 ? "Satisfaisant" : "A ameliorer";
    const badgeColor = scoreVal >= 16 ? C.emerald : scoreVal >= 12 ? C.blue : C.amber;
    setFill(badgeColor);
    doc.roundedRect(W - mR - 32, y + 5, 30, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(C.white);
    doc.text(scoreLabel, W - mR - 17, y + 11.5, { align: "center" });
    y += 30;

    // Commentaire global
    pageBreak(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(C.slate500);
    doc.text("AVIS DE L'EXAMINATEUR", mL, y);
    y += 5;

    setFill(C.slate50);
    setDraw(C.slate200);
    doc.setLineWidth(0.3);
    const commentLines = doc.splitTextToSize(resultat.commentaire_global ?? "", cW - 16);
    const commentH = commentLines.length * 5.5 + 13;
    pageBreak(commentH);
    doc.roundedRect(mL, y, cW, commentH, 2, 2, "FD");
    setFill(C.emerald);
    doc.rect(mL, y, 2.5, commentH, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTxt(C.slate700);
    y += 5;
    commentLines.forEach((line: string) => { doc.text(line, mL + 6, y); y += 5.5; });
    y += 8;

    // Version idéale
    if (resultat.version_ideale) {
      pageBreak(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setTxt(C.blue);
      doc.text("VERSION IDÉALE", mL, y);
      y += 5;
      const idealLines = doc.splitTextToSize(resultat.version_ideale, cW - 16);
      const idealH = idealLines.length * 5.5 + 13;
      pageBreak(idealH);
      setFill(C.blueBg);
      setDraw(C.slate200);
      doc.setLineWidth(0.3);
      doc.roundedRect(mL, y, cW, idealH, 2, 2, "FD");
      setFill(C.blue);
      doc.rect(mL, y, 2.5, idealH, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setTxt(C.slate700);
      y += 5;
      idealLines.forEach((line: string) => { doc.text(line, mL + 6, y); y += 5.5; });
      y += 8;
    }

    // Erreurs identifiées
    const erreurs: string[] = resultat.erreurs_identifiees ?? [];
    if (erreurs.length > 0) {
      pageBreak(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setTxt(C.amber);
      doc.text("ERREURS IDENTIFIÉES", mL, y);
      y += 5;

      erreurs.forEach((err: string) => {
        const lines = doc.splitTextToSize(`• ${err}`, cW - 14);
        const blockH = lines.length * 5.2 + 8;
        pageBreak(blockH + 4);
        setFill(C.amberBg);
        setDraw([253, 230, 138] as [number, number, number]);
        doc.setLineWidth(0.2);
        doc.roundedRect(mL, y, cW, blockH, 2, 2, "FD");
        setFill(C.amber);
        doc.rect(mL, y, 2.5, blockH, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        setTxt(C.slate700);
        y += 5;
        lines.forEach((line: string) => { doc.text(line, mL + 6, y); y += 5.2; });
        y += 6;
      });
    }

    // Conseils
    const conseils: string[] = resultat.conseils ?? [];
    if (conseils.length > 0) {
      y += 2;
      const allConseils = conseils.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n");
      const conseilLines = doc.splitTextToSize(allConseils, cW - 22);
      const conseilH = conseilLines.length * 5.5 + 26;
      pageBreak(conseilH + 2);
      setFill(C.slate900);
      doc.roundedRect(mL, y, cW, conseilH, 3, 3, "F");
      setFill(C.orange);
      doc.roundedRect(mL, y, cW, 1.5, 0, 0, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setTxt(C.orange);
      doc.text("CONSEILS POUR LE JOUR J", mL + 6, y + 10);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      setTxt([203, 213, 225] as [number, number, number]);
      conseilLines.forEach((line: string) => { doc.text(line, mL + 6, y); y += 5.5; });
      y += 8;
    }

    // ── Pied de page ─────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      setDraw(C.slate200);
      doc.setLineWidth(0.2);
      doc.line(mL, H - 10, W - mR, H - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setTxt(C.slate500);
      doc.text("IAG Academy  •  Simulateur Oral", mL, H - 5.5);
      doc.text(`Tache 0${activeTask}  |  Page ${p} / ${totalPages}`, W - mR, H - 5.5, { align: "right" });
      setFill(C.orange);
      doc.circle(W / 2, H - 5.5, 0.8, "F");
    }

    doc.save(`IAG_Academy_Oral_Tache0${activeTask}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleNext = () => {
    if (activeTask && activeTask < 3) {
      setActiveTask((activeTask + 1) as Task);
      setResultat(null);
      setTranscript("");
      setConversation([]);
      setTimer(0);
      setLoading(false);
      setAiSpeaking(false);
      setIsRecording(false);
      setTranscribing(false);
      setHint(null);
      resetTimerAutoCorrectState();
    } else {
      resetAll();
    }
  };

  const handlePrevious = () => {
    if (activeTask && activeTask > 1) {
      setActiveTask((activeTask - 1) as Task);
      setResultat(null);
      setTranscript("");
      setConversation([]);
      setTimer(0);
      setLoading(false);
      setAiSpeaking(false);
      setIsRecording(false);
      setTranscribing(false);
      setHint(null);
      resetTimerAutoCorrectState();
    }
  };


  if (oralLocked) {
    return <OralSimulatorMaintenance backHref="/tcf-canada/simulateur" backLabel="Retour simulateur" />;
  }

  // =========================
  // ÉCRAN 1 : choix sujet
  // =========================
  if (!selectedSubject) {
    return (
      <div className="min-h-[100dvh] bg-neutral-50 text-neutral-900 font-sans">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Retour</span>
            </button>
            <div className="text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Simulateur Oral</p>
              <p className="text-sm font-extrabold text-neutral-900">Choisir un sujet</p>
            </div>
          </div>
        </header>
        <div className="max-w-md mx-auto px-6 pt-6 pb-12">
          <div className="bg-orange-50/70 rounded-2xl border border-orange-100/60 px-4 py-3 mb-5">
            <p className="text-xs text-neutral-700 flex items-start gap-2">
              <Mic className="w-4 h-4 text-orange-600 stroke-[1.8] mt-0.5" />
              Choisissez un sujet, puis sélectionnez une tâche (ou examen complet).
            </p>
          </div>
          <div className="grid gap-3">
            {Object.keys(banqueSujetsOral).map(Number).map((id) => (
              <motion.button
                key={id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSubject(id)}
                className="text-left bg-white rounded-3xl border border-neutral-200/60 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-200/40 grid place-items-center">
                      <Mic className="w-6 h-6 text-orange-600 stroke-[1.8]" />
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-neutral-900">Sujet Oral #{id}</p>
                      <p className="text-[11px] text-neutral-500 font-semibold">Choisir ce thème</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400 stroke-[2]" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // ÉCRAN 2 : choix tâche
  // =========================
  if (selectedSubject && !activeTask) {
    return (
      <div className="min-h-[100dvh] bg-neutral-50 text-neutral-900 font-sans">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
          <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSelectedSubject(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Sujets</span>
            </button>
            <div className="text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Sujet #{selectedSubject}</p>
              <p className="text-sm font-extrabold text-neutral-900">Que travailler ?</p>
            </div>
          </div>
        </header>
        <div className="max-w-md mx-auto px-6 pt-6 pb-12 grid gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { setIsFullExam(true); setActiveTask(1); }}
            className="text-left bg-neutral-900 text-white rounded-3xl shadow-lg hover:bg-neutral-800 transition p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 grid place-items-center">
                <GraduationCap className="w-6 h-6 text-white stroke-[1.8]" />
              </div>
              <div>
                <p className="text-base font-extrabold">Examen blanc complet</p>
                <p className="text-[11px] text-white/70 font-semibold">Tâches 1 → 2 → 3 à la suite</p>
              </div>
            </div>
          </motion.button>

          <div className="flex items-center gap-4 my-1">
            <div className="h-px bg-neutral-200 flex-1" />
            <span className="text-neutral-500 text-[10px] font-extrabold uppercase tracking-wider">ou entraînement ciblé</span>
            <div className="h-px bg-neutral-200 flex-1" />
          </div>

          {[
            { task: 1 as Task, title: "Tâche 1 : Présentation", sub: "Monologue • 2 min" },
            { task: 2 as Task, title: "Tâche 2 : Interaction", sub: "Jeu de rôle IA • 3 min 30 • 6 tours max" },
            { task: 3 as Task, title: "Tâche 3 : Opinion", sub: "Argumentation • 4 min 30" },
          ].map(({ task, title, sub }) => (
            <button
              key={task}
              onClick={() => { setIsFullExam(false); setActiveTask(task); }}
              className="text-left bg-white rounded-3xl border border-neutral-200/60 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 p-5"
            >
              <p className="text-sm font-extrabold text-neutral-900">{title}</p>
              <p className="text-[11px] text-neutral-500 font-semibold">{sub}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // =========================
  // ÉCRAN 3 : simulateur
  // =========================
  return (
    <div className="min-h-[100dvh] bg-neutral-50 text-neutral-900 font-sans">
      {/* Modal Quitter */}
      <AnimatePresence>
        {quitOpen && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-black/30 backdrop-blur-sm p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setQuitOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/60 shadow-2xl overflow-hidden"
            >
              <div className="p-5 flex items-start justify-between gap-3 border-b border-neutral-200/60">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">Quitter l'exercice</p>
                  <h3 className="text-lg font-extrabold text-neutral-900">Confirmer la sortie</h3>
                  <p className="text-sm text-neutral-500 mt-1">Votre progression actuelle sera perdue.</p>
                </div>
                <button
                  onClick={() => setQuitOpen(false)}
                  className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 shadow-sm grid place-items-center hover:shadow-md transition"
                >
                  <X className="w-5 h-5 text-neutral-700 stroke-[1.8]" />
                </button>
              </div>
              <div className="p-5 grid gap-3">
                <button
                  onClick={() => { setQuitOpen(false); resetAll(); }}
                  className="w-full rounded-3xl px-4 py-4 bg-red-600 text-white font-extrabold shadow-lg hover:bg-red-700 transition inline-flex items-center justify-center gap-2"
                >
                  <Flag className="w-5 h-5 text-white stroke-[2]" /> Quitter
                </button>
                <button
                  onClick={() => setQuitOpen(false)}
                  className="w-full rounded-3xl px-4 py-4 bg-white border border-neutral-200 text-neutral-900 font-extrabold shadow-sm hover:shadow-md transition"
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header studio */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setQuitOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Menu</span>
          </button>

          <div className="text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
              Sujet {selectedSubject} • Tâche {activeTask}
            </p>
            <div className={[
              "inline-flex items-center gap-2 px-4 py-2 rounded-2xl border font-extrabold",
              danger ? "bg-red-50 border-red-200 text-red-700" : "bg-neutral-50 border-neutral-200 text-neutral-900",
            ].join(" ")}>
              <Timer className={["w-4 h-4 stroke-[1.8]", danger ? "text-red-600" : "text-orange-600"].join(" ")} />
              <span className="text-lg tabular-nums">{formatTime(timer)}</span>
            </div>
          </div>

          {/* Badge statut */}
          <div className="w-[92px] flex justify-end">
            {aiSpeaking ? (
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-2xl">
                <Volume2 className="w-4 h-4 text-emerald-600 stroke-[1.8]" /> IA
              </span>
            ) : transcribing ? (
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-100 px-3 py-2 rounded-2xl">
                <Loader2 className="w-4 h-4 text-orange-600 stroke-[1.8] animate-spin" /> STT
              </span>
            ) : isRecording ? (
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-2xl">
                <Mic className="w-4 h-4 text-red-600 stroke-[1.8]" /> REC
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-2 rounded-2xl">
                <Mic className="w-4 h-4 text-neutral-700 stroke-[1.8]" /> prêt
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-6 pb-24 grid gap-4">
        {/* Sujet */}
        <Card className="p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Consigne</p>
          <p className="mt-2 text-neutral-700 leading-relaxed whitespace-pre-wrap">{subjectText}</p>
        </Card>

        {/* Navigation entre tâches */}
        {activeTask !== null && (activeTask > 1 || activeTask < 3) && (
          <div className="flex gap-2">
            {activeTask > 1 && (
              <button
                onClick={handlePrevious}
                className="flex-1 rounded-2xl px-4 py-3 bg-white border-2 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition text-neutral-700 font-extrabold text-sm inline-flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                Précédent
              </button>
            )}
            {activeTask < 3 && (
              <button
                onClick={handleNext}
                className="flex-1 rounded-2xl px-4 py-3 bg-white border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 transition text-orange-700 font-extrabold text-sm inline-flex items-center justify-center gap-2"
              >
                Suivant
                <ChevronRight className="w-4 h-4 stroke-[2.2]" />
              </button>
            )}
          </div>
        )}

        {/* Tâche 2 : bandeau tours + instruction */}
        {activeTask === 2 && (
          <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
              Tours restants :{" "}
              <span className={[
                "px-2 py-0.5 rounded-full border",
                turnsLeft <= 1 ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100",
              ].join(" ")}>
                {turnsLeft}/{MAX_TURNS}
              </span>
            </p>
            {task2Locked ? (
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                Dialogue terminé ✅
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-neutral-400">
                🎤 Parlez → coupez le micro → l'IA répond
              </span>
            )}
          </div>
        )}

        {/* Chat Tâche 2 */}
        {activeTask === 2 && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-neutral-200/60 flex items-center justify-between">
              <p className="text-sm font-extrabold text-neutral-900 inline-flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-600 stroke-[1.8]" /> Dialogue
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                {userTurns}/{MAX_TURNS}
              </p>
            </div>

            <div
              ref={chatContainerRef}
              className="p-4 h-[130px] overflow-y-auto space-y-3 bg-neutral-50/40"
            >
              {conversation.length === 0 && (
                <p className="text-center text-[11px] text-neutral-400 italic py-8">
                  Le dialogue s'affichera ici… Appuyez sur le micro pour commencer.
                </p>
              )}
              {conversation.map((msg, i) => (
                <div
                  key={i}
                  className={[
                    "max-w-[88%] rounded-2xl p-3 text-sm leading-relaxed border",
                    msg.role === "user"
                      ? "ml-auto bg-orange-600 text-white border-orange-600"
                      : "mr-auto bg-white text-neutral-800 border-neutral-200",
                  ].join(" ")}
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 mb-1">
                    {msg.role === "user" ? "Vous" : "Examinateur"}
                  </p>
                  {msg.text || (
                    <span className="inline-flex gap-1 opacity-50">
                      <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                      <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Hint */}
        <AnimatePresence>
          {hint && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="bg-orange-50 border border-orange-100/70 rounded-2xl px-4 py-3 text-xs text-neutral-700 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-orange-600 stroke-[1.8] mt-0.5 shrink-0" />
              {hint}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Erreur correction */}
        <AnimatePresence>
          {correctionError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 stroke-[1.8] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 mb-1">
                      Correction impossible
                    </p>
                    <p className="text-[13px] leading-relaxed font-medium">{correctionError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCorrectionError(null)}
                  className="w-8 h-8 rounded-xl border border-red-200 bg-white grid place-items-center shrink-0"
                  aria-label="Fermer le message d'erreur"
                >
                  <X className="w-4 h-4 text-red-600 stroke-[2]" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contrôles */}
        {!resultat && (
          <div className="grid gap-3">
            {(!aiSpeaking || (activeTask === 2 && (task2Locked || taskTimeUp))) && !taskTimeUp && (
              <div className="flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleRecording}
                  disabled={
                    taskTimeUp ||
                    (activeTask === 2 && task2Locked) ||
                    transcribing ||
                    loading ||
                    (activeTask === 2 && aiSpeaking)
                  }
                  className={[
                    "w-24 h-24 rounded-full grid place-items-center shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed",
                    isRecording ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700",
                  ].join(" ")}
                >
                  {transcribing || loading ? (
                    <Loader2 className="w-9 h-9 text-white stroke-[2] animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-9 h-9 text-white stroke-[2]" />
                  ) : (
                    <Mic className="w-9 h-9 text-white stroke-[2]" />
                  )}
                </motion.button>
              </div>
            )}

            {transcribing && (
              <p className="text-center text-[11px] text-orange-600 font-semibold animate-pulse">
                Transcription en cours…
              </p>
            )}
            {loading && activeTask === 2 && !isCorrecting && (
              <p className="text-center text-[11px] text-orange-600 font-semibold animate-pulse">
                L'examinateur prépare sa réponse…
              </p>
            )}
            {isCorrecting && (
              <p className="text-center text-[11px] text-orange-600 font-semibold animate-pulse">
                Analyse de votre prise de parole en cours…
              </p>
            )}
            {aiSpeaking && activeTask === 2 && (
              <p className="text-center text-[11px] text-emerald-600 font-semibold">
                L'examinateur parle… attendez pour répondre.
              </p>
            )}

            {/* Limite quotidienne */}
            {!isAdmin && !limitLoading && (
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest border ${canSimulateEO ? "bg-neutral-50 border-neutral-200 text-neutral-500" : "bg-red-50 border-red-100 text-red-600"}`}>
                <span>{canSimulateEO ? (isEssaiPack ? "Session EO restante (essai 24 h)" : "Corrections EO restantes") : "Quota expression orale atteint"}</span>
                <span className={`px-2 py-0.5 rounded-lg ${canSimulateEO ? "bg-neutral-200 text-neutral-700" : "bg-red-100 text-red-700"}`}>
                  {canSimulateEO ? (eoLeft === Infinity ? "∞" : eoLeft) : 0}
                </span>
              </div>
            )}

            {/* Bouton correction — Tâches 1 & 3 */}
            {activeTask !== 2 && !isRecording && !transcribing && transcript.trim().length > 0 && (
              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={handleFinalCorrection}
                disabled={loading || !canSimulateEO}
                className="rounded-3xl px-4 py-4 bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 transition font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 text-white stroke-[2] animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-white stroke-[2]" />
                )}
                {loading ? "Calcul…" : "Corriger"}
              </motion.button>
            )}

            {/* Transcription capturée — Tâches 1 & 3 uniquement */}
            {activeTask !== 2 && transcript.trim() && !isRecording && !transcribing && (
              <Card className="p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                  Transcription capturée
                </p>
                <p className="mt-2 text-sm text-neutral-700 italic leading-relaxed">
                  "{transcript.trim()}"
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Résultats */}
        {resultat && (
          <div className="fixed inset-0 z-[60] bg-neutral-50 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
              <header className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Résultats</p>
                  <h2 className="text-lg font-extrabold text-neutral-900">Tâche {activeTask}</h2>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-orange-50 border border-orange-100/70 text-orange-700">Oral</span>
              </header>

              <Card className="p-6 text-center">
                <div className="text-5xl font-extrabold text-orange-600">{resultat.note}</div>
                <div className="mt-1 text-sm font-extrabold text-neutral-900">{resultat.niveau}</div>
                <p className="mt-4 text-sm text-neutral-700 italic leading-relaxed bg-neutral-50 border border-neutral-200/60 rounded-2xl p-4">
                  "{resultat.commentaire_global}"
                </p>
              </Card>

              <div className="grid gap-3">
                <Card className="p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Transcription</p>
                  <p className="mt-2 text-sm text-neutral-700 italic leading-relaxed">
                    "{activeTask === 2
                      ? conversation.filter((c) => c.role === "user").map((c) => c.text).join(" … ")
                      : transcript}"
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Version idéale</p>
                  <p className="mt-2 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{resultat.version_ideale}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">Corrections</p>
                  <ul className="mt-3 space-y-2">
                    {resultat.erreurs_identifiees?.map((e: string, i: number) => (
                      <li key={i} className="text-sm text-neutral-800 bg-red-50/60 border border-red-100 rounded-2xl p-3">{e}</li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Conseils</p>
                  <ul className="mt-3 space-y-2">
                    {resultat.conseils?.map((c: string, i: number) => (
                      <li key={i} className="text-sm text-neutral-800 bg-orange-50/60 border border-orange-100 rounded-2xl p-3">{c}</li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Boutons télécharger */}
              <div className="grid gap-2">
                {audioBlob && (
                  <button
                    onClick={downloadAudio}
                    className="w-full rounded-3xl px-5 py-3.5 font-extrabold text-sm text-neutral-800 bg-white border border-neutral-200 shadow-sm hover:shadow-md transition inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-orange-600 stroke-[2]" />
                    Télécharger l'audio enregistré
                  </button>
                )}
                {activeTask === 2 && conversation.length > 0 && (
                  <button
                    onClick={downloadChat}
                    className="w-full rounded-3xl px-5 py-3.5 font-extrabold text-sm text-neutral-800 bg-white border border-neutral-200 shadow-sm hover:shadow-md transition inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-orange-600 stroke-[2]" />
                    Télécharger le dialogue
                  </button>
                )}
                <button
                  onClick={downloadCorrection}
                  className="w-full rounded-3xl px-5 py-3.5 font-extrabold text-sm text-neutral-800 bg-white border border-neutral-200 shadow-sm hover:shadow-md transition inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-600 stroke-[2]" />
                  Télécharger la correction complète
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.99 }}
                onClick={handleNext}
                className="w-full rounded-3xl px-5 py-5 font-extrabold text-base text-white shadow-lg transition bg-orange-600 hover:bg-orange-700"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-white stroke-[2]" />
                  {activeTask !== null && activeTask < 3 ? `Tâche ${activeTask + 1}` : "Retour menu"}
                </span>
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
