"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/app/utils/supabase";
import { runExaminerSpeechFromStream, stopEdgeTts } from "@/app/utils/speak-edge-tts";
import { pickRecorderMimeType, transcribeRecordingBlob } from "@/app/utils/audio-recording";
import { Mic, Square, CheckCircle2, Loader2, MessageSquare, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Task = 1 | 2 | 3;
export type Msg = { role: "user" | "ai"; text: string };

export interface EOData {
  t1: string;
  t2: Msg[];
  t3: string;
}

interface Sujet {
  1: string;
  2: string;
  3: string;
}

interface Props {
  sujet: Sujet;
  sujetId: number;
  onComplete: (data: EOData) => void;
  initialData?: EOData | null;
  onDataChange?: (data: EOData) => void;
}

const TIMER_PAR_TACHE: Record<Task, number> = { 1: 120, 2: 210, 3: 270 };
const MAX_TURNS = 10;

export default function EpreuveEO({ sujet, onComplete, initialData, onDataChange }: Props) {
  const [activeTask, setActiveTask] = useState<Task>(1);

  // Enregistrement
  const [isRecording, setIsRecording]   = useState(false);
  const [processing, setProcessing]     = useState(false); // gap stop→transcription
  const [transcribing, setTranscribing] = useState(false);
  const [timer, setTimer]               = useState(0);

  // Transcriptions (restaurées depuis initialData si présent)
  const [t1Transcript, setT1Transcript] = useState(initialData?.t1 ?? "");
  const [t3Transcript, setT3Transcript] = useState(initialData?.t3 ?? "");

  // Tâche 2 dialogue
  const [conversation, setConversation] = useState<Msg[]>(initialData?.t2 ?? []);
  const [aiSpeaking, setAiSpeaking]     = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [hint, setHint]                 = useState<string | null>(null);

  // Tâches validées
  const [t1Done, setT1Done] = useState(false);
  const [t2Done, setT2Done] = useState(false);
  const [t3Done, setT3Done] = useState(false);

  // Refs
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const audioBlobMimeRef  = useRef<string>("audio/webm");
  const voiceRef          = useRef<SpeechSynthesisVoice | null>(null);
  const activeTaskRef     = useRef<Task>(1);
  const conversationRef   = useRef<Msg[]>([]);
  const userTurnsRef      = useRef(0);
  const chatRef           = useRef<HTMLDivElement>(null);

  useEffect(() => { activeTaskRef.current = activeTask; }, [activeTask]);
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);

  // Notifie le parent a chaque changement pour autosave
  useEffect(() => {
    onDataChange?.({ t1: t1Transcript, t2: conversation, t3: t3Transcript });
  }, [t1Transcript, t3Transcript, conversation, onDataChange]);

  const userTurns = useMemo(
    () => conversation.filter((m) => m.role === "user").length,
    [conversation]
  );
  useEffect(() => { userTurnsRef.current = userTurns; }, [userTurns]);

  const turnsLeft = Math.max(0, MAX_TURNS - userTurns);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [conversation]);

  // Voix française
  useEffect(() => {
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const fr = voices.filter((v) => v.lang.startsWith("fr"));
      voiceRef.current = fr.find((v) => v.name.includes("Google")) ?? fr[0] ?? null;
    };
    if (window.speechSynthesis.getVoices().length > 0) pick();
    window.speechSynthesis.onvoiceschanged = pick;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const runStreamingExaminerSpeech = async (
    response: Response,
    accessToken: string,
    onText: (fullText: string) => void,
  ) => {
    await runExaminerSpeechFromStream(response, accessToken, voiceRef.current, onText);
  };

  // Timer — tourne pendant enregistrement ou parole IA
  useEffect(() => {
    if (!isRecording && !aiSpeaking && !transcribing) return;
    if (timer <= 0) {
      if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [isRecording, aiSpeaking, transcribing, timer]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ─── Transcription (copie exacte de la page standalone) ─────────────────
  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      let result = await transcribeRecordingBlob(
        audioBlob,
        audioBlobMimeRef.current,
        token,
      );

      if (!result.ok && result.error === "Erreur de transcription. Réessayez.") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        result = await transcribeRecordingBlob(
          audioBlob,
          audioBlobMimeRef.current,
          token,
        );
      }

      if (!result.ok) {
        setHint(result.error);
        setTimeout(() => setHint(null), 4000);
        return;
      }

      const text = result.transcript;

      if (activeTaskRef.current === 2) {
        if (text.trim()) {
          handleAIInteraction(text);
        } else {
          setHint("Aucune parole détectée. Réessayez.");
          setTimeout(() => setHint(null), 3000);
        }
      } else {
        // T1 ou T3 — monologue
        if (activeTaskRef.current === 1) setT1Transcript(text || "(Aucune parole détectée)");
        else setT3Transcript(text || "(Aucune parole détectée)");
      }
    } catch {
      setHint("Erreur de transcription. Vérifiez votre connexion et réessayez.");
      setTimeout(() => setHint(null), 4000);
    } finally {
      setTranscribing(false);
    }
  };

  // ─── Enregistrement (copie exacte de la page standalone) ─────────────────
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
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioBlobMimeRef.current = mimeType;
      setProcessing(false);
      if (audioBlob.size < 800) {
        setHint("Enregistrement trop court. Parlez au moins une seconde.");
        setTimeout(() => setHint(null), 4000);
        return;
      }
      transcribeAudio(audioBlob);
    };

    mediaRecorder.start(500); // timeslice 500ms — même que la page standalone
    mediaRecorderRef.current = mediaRecorder;
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setProcessing(true); // gap entre stop et transcription
      return;
    }
    if (timer === 0) setTimer(TIMER_PAR_TACHE[activeTaskRef.current]);
    try {
      await startRecording();
      setIsRecording(true);
    } catch {
      setHint("Veuillez autoriser l'accès au microphone dans votre navigateur.");
      setTimeout(() => setHint(null), 4000);
    }
  };

  // ─── Dialogue IA (T2) ─────────────────────────────────────────────────
  const handleAIInteraction = async (msg: string) => {
    if (!msg.trim() || userTurnsRef.current >= MAX_TURNS) return;

    const isQuestion = msg.includes("?") || /pourquoi|comment|quand|où|quel/i.test(msg);
    if (!isQuestion) {
      setHint("En tâche 2, posez une question à l'examinateur.");
      setTimeout(() => setHint(null), 2500);
    }

    setConversation((prev) => [...prev, { role: "user", text: msg }, { role: "ai", text: "" }]);
    setAiLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/simulateur/oral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          action: "interaction",
          message: msg,
          sujet: sujet[2],
          tour: userTurnsRef.current + 1,
          tours_restants: Math.max(0, MAX_TURNS - (userTurnsRef.current + 1)),
        }),
      });

      if (!res.body) throw new Error("no stream");

      const token = session?.access_token ?? "";
      setAiLoading(false);
      setAiSpeaking(true);

      await runStreamingExaminerSpeech(res, token, (fullText) => {
        setConversation((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: "ai", text: fullText };
          return u;
        });
      });

      setAiSpeaking(false);
    } catch {
      setAiLoading(false);
      setAiSpeaking(false);
    }
  };

  // ─── Rendu tâche monologue (T1 & T3) ─────────────────────────────────
  const renderMonologue = (taskNum: 1 | 3) => {
    const transcript = taskNum === 1 ? t1Transcript : t3Transcript;
    const isDone     = taskNum === 1 ? t1Done : t3Done;
    const setDone    = taskNum === 1 ? setT1Done : setT3Done;
    const clearTr    = () => { taskNum === 1 ? setT1Transcript("") : setT3Transcript(""); };
    const busy       = isRecording || processing || transcribing;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100">
            <Mic size={11} /> Tâche {taskNum} — Monologue
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {isRecording ? <span className="text-red-500 animate-pulse">{fmt(timer)}</span> : fmt(TIMER_PAR_TACHE[taskNum])}
          </span>
        </div>

        <div className="p-5 md:p-6">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4 mb-5">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Sujet</p>
            <p className="text-sm text-slate-700 leading-relaxed">{sujet[taskNum]}</p>
          </div>

          {isDone ? (
            /* ── Tâche validée ── */
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={26} className="text-emerald-600" />
              </div>
              <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Tâche {taskNum} validée</p>
              {transcript && (
                <p className="text-xs text-slate-500 italic text-center line-clamp-2 max-w-md">{transcript}</p>
              )}
              <button onClick={() => { setDone(false); clearTr(); }}
                className="text-[10px] font-black text-slate-400 hover:text-orange-500 uppercase tracking-widest underline transition-colors">
                Recommencer
              </button>
            </div>
          ) : transcript && !busy ? (
            /* ── Transcription disponible ── */
            <div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Votre réponse transcrite
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{transcript}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={clearTr}
                  className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  Recommencer
                </button>
                <button onClick={() => setDone(true)}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-orange-500/25">
                  <CheckCircle2 size={13} className="inline mr-1" /> Valider
                </button>
              </div>
            </div>
          ) : (
            /* ── Contrôles enregistrement ── */
            <div className="flex flex-col items-center gap-4 py-4">
              {!busy ? (
                <>
                  <button onClick={toggleRecording}
                    className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-orange-500/40">
                    <Mic size={36} />
                  </button>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Appuyez pour enregistrer
                  </p>
                </>
              ) : isRecording ? (
                <div className="flex flex-col items-center gap-3">
                  <button onClick={toggleRecording}
                    className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full flex items-center justify-center animate-pulse shadow-xl shadow-red-500/40">
                    <Square size={32} />
                  </button>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Enregistrement en cours</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={36} className="text-orange-500 animate-spin" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {processing ? "Traitement audio" : "Transcription"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Rendu tâche dialogue (T2) ─────────────────────────────────────
  const renderDialogue = () => {
    const busy = isRecording || processing || transcribing || aiLoading || aiSpeaking;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100">
            <MessageSquare size={11} /> Tâche 2 — Dialogue IA
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{turnsLeft} tour{turnsLeft > 1 ? "s" : ""}</span>
        </div>

        <div className="p-5 md:p-6">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4 mb-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Sujet</p>
            <p className="text-sm text-slate-700 leading-relaxed">{sujet[2]}</p>
          </div>

          {/* Historique */}
          <div ref={chatRef} className="min-h-[120px] max-h-[240px] overflow-y-auto space-y-2 mb-4 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
            {conversation.length === 0 && (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-6">
                Enregistrez pour démarrer le dialogue
              </p>
            )}
            {conversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm shadow-sm shadow-orange-500/20"
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                }`}>
                  {msg.text || <Loader2 size={11} className="animate-spin inline" />}
                </div>
              </div>
            ))}
          </div>

          {hint && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 font-medium mb-3 text-center">
              {hint}
            </div>
          )}

          {t2Done ? (
            <div className="flex flex-col items-center gap-2 py-3">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Dialogue validé</p>
            </div>
          ) : turnsLeft === 0 ? (
            <button onClick={() => setT2Done(true)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-orange-500/25">
              <CheckCircle2 size={13} className="inline mr-1" /> Valider le dialogue
            </button>
          ) : (
            <div className="flex justify-center items-center gap-3">
              {!busy ? (
                <>
                  <button onClick={toggleRecording}
                    className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/40 transition-all active:scale-95">
                    <Mic size={20} />
                  </button>
                  {userTurns > 0 && (
                    <button onClick={() => setT2Done(true)}
                      className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Terminer
                    </button>
                  )}
                </>
              ) : isRecording ? (
                <button onClick={toggleRecording}
                  className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-500/40">
                  <Square size={20} />
                </button>
              ) : (
                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center">
                  <Loader2 size={20} className="text-orange-500 animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const tasksDone = [t1Done, t2Done, t3Done].filter(Boolean).length;

  // ─── Render principal ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* Header section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center">
            <Mic size={18} className="text-rose-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em]">Expression Orale</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{tasksDone} / 3 tâches validées</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{Math.round((tasksDone / 3) * 100)}<span className="text-sm text-slate-400">%</span></p>
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(tasksDone / 3) * 100}%` }}
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
          />
        </div>
      </div>

      {/* Onglets tâches */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          3 tâches — corrections IA affichées en fin d&apos;examen
        </p>
        <div className="flex gap-2">
          {([1, 2, 3] as Task[]).map((t) => {
            const done = t === 1 ? t1Done : t === 2 ? t2Done : t3Done;
            return (
              <button key={t} onClick={() => setActiveTask(t)}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTask === t
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30"
                    : done
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100"
                }`}>
                Tâche {t}
                {done && activeTask !== t && <span className="ml-1 opacity-70">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu de la tâche active */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTask}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTask === 1 && renderMonologue(1)}
          {activeTask === 2 && renderDialogue()}
          {activeTask === 3 && renderMonologue(3)}
        </motion.div>
      </AnimatePresence>

      {/* Footer navigation */}
      <div className="flex items-center justify-end gap-3">
        {activeTask < 3 ? (
          <button
            onClick={() => setActiveTask((t) => (t + 1) as Task)}
            disabled={(activeTask === 1 && !t1Done) || (activeTask === 2 && !t2Done)}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Tâche suivante <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={() => onComplete({ t1: t1Transcript, t2: conversation, t3: t3Transcript })}
            disabled={!t1Done || !t2Done || !t3Done}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25 active:scale-95"
          >
            <CheckCircle2 size={14} /> Soumettre l&apos;Examen
          </button>
        )}
      </div>
    </div>
  );
}
