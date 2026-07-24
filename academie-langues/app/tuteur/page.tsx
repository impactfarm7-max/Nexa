"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { clearStaleAuthSession, isRefreshTokenError } from "@/app/utils/supabase-auth";
import { logClientActivity } from "@/app/utils/client-activity";
import { useTutorGlobalLock } from "@/app/hooks/useTutorGlobalLock";
import TutorMaintenanceOverlay from "@/app/components/TutorMaintenanceOverlay";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Sparkles,
  User,
  AlertCircle,
  BookOpen,
  PenTool,
  MessageCircleQuestion,
  Clock,
  RotateCcw,
} from "lucide-react";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { TUTOR_EXCHANGE_QUOTA } from "@/app/utils/tutor-quota";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type TutorAccessState = {
  hasAccess: boolean;
  unlimited: boolean;
  total: number | null;
  used: number | null;
};

export default function TutorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const tutorLock = useTutorGlobalLock(isAdmin);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [access, setAccess] = useState<TutorAccessState | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const init = async () => {
      const { error: authError } = await supabase.auth.getUser();
      if (authError && isRefreshTokenError(authError.message)) {
        await clearStaleAuthSession();
        router.push("/login");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      setAccessToken(session.access_token);

      const { data: profile } = await supabase
        .from("profiles")
        .select("prenom, first_name, role, center_id")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        setIsAdmin(profile.role === "admin");
        void supabase
          .from("profiles")
          .update({ current_activity: "En session avec le Tuteur 🤖" })
          .eq("id", session.user.id);
        logClientActivity("Ouverture Tuteur", "Page tuteur consultée");
      }

      setLoading(false);

      try {
        const res = await fetch("/api/tuteur/message", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.status === 401) {
          await clearStaleAuthSession();
          router.push("/login");
          return;
        }
        const json = await res.json();
        setAccess(json as TutorAccessState);
        const history = Array.isArray(json.history) ? json.history : [];
        if (history.length > 0) {
          setMessages(
            history.map((m: { role: "user" | "assistant"; content: string }, i: number) => ({
              id: `h-${i}`,
              role: m.role,
              content: m.content,
            })),
          );
        }
      } catch {
        /* historique optionnel */
      }
    };

    void init();
  }, [router]);

  const handleNewConversation = async () => {
    if (!accessToken) return;
    setMessages([]);
    setSendError(null);
    try {
      await fetch("/api/tuteur/message", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      console.error("Erreur reinitialisation conversation:", error);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSendMessage = async (forcedText?: string) => {
    const textToSend = forcedText || inputValue.trim();
    if (!textToSend) return;

    if (tutorLock.locked) return;
    if (access && !access.unlimited && (access.used ?? 0) >= (access.total ?? TUTOR_EXCHANGE_QUOTA)) return;
    if (!accessToken) return;

    const newUserMsg: Message = { id: Date.now().toString(), role: "user", content: textToSend };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsTyping(true);
    setSendError(null);

    try {
      const res = await fetch("/api/tuteur/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: textToSend }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSendError(json.error || "Le tuteur IA est momentanément indisponible. Réessayez.");
        setIsTyping(false);
        return;
      }

      setAccess({ hasAccess: true, unlimited: json.unlimited, total: json.total, used: json.used });
      const reply: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: json.reply };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    } catch (error) {
      console.error("Erreur Tuteur:", error);
      setSendError("Le tuteur IA est momentanément indisponible. Réessayez.");
      setIsTyping(false);
    }
  };

  const suggestions = [
    { icon: BookOpen, text: "Explique-moi une règle de grammaire" },
    { icon: PenTool, text: "Corrige cette phrase pour le TCF" },
    { icon: MessageCircleQuestion, text: "Fais-moi passer un test rapide" },
  ];

  if (loading) {
    return <StudentRouteSkeleton contentOnly variant="page" />;
  }

  const isTutorLocked = tutorLock.locked;
  const quotaTotal = access?.total ?? TUTOR_EXCHANGE_QUOTA;
  const quotaUsed = access?.used ?? 0;
  const quotaUnlimited = access?.unlimited ?? false;
  const quotaRemaining = quotaTotal - quotaUsed;
  const isQuotaReached = !quotaUnlimited && quotaRemaining <= 0;
  const isBlocked = isTutorLocked || isQuotaReached;
  const displayFirstName = userProfile?.prenom || userProfile?.first_name;

  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full bg-[#FFFBF7] text-neutral-900 font-sans flex flex-col overflow-x-hidden selection:bg-orange-500/30">
      <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60 py-3 shrink-0">
        <div className="nexa-student-shell flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              aria-label="Retour au tableau de bord"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={STUDENT_TEXT.pageTitle} style={{ color: BRAND.blue }}>Coach NEXA</h1>
                <span className="bg-orange-50 border border-orange-200 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md flex items-center gap-1" style={{ color: BRAND.orange }}>
                  <Sparkles className="w-3 h-3" /> Flash
                </span>
              </div>
              <p className={`${STUDENT_TEXT.subtitle} mt-0.5`}>
                {isTutorLocked ? "Fonctionnalité bientôt disponible" : "Votre tuteur privé disponible 24/7"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isTutorLocked && messages.length > 0 && (
              <button
                onClick={handleNewConversation}
                aria-label="Nouvelle conversation"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-orange-200 bg-white text-[10px] font-black uppercase tracking-wider text-neutral-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Nouvelle conversation</span>
              </button>
            )}
            <div className="flex flex-col items-end shrink-0">
              {isTutorLocked ? (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 mb-1 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {tutorLock.unlockAt ? "Ouverture dans" : "Bientôt disponible"}
                  </span>
                  {tutorLock.unlockAt ? (
                    <div
                      className="grid grid-cols-4 gap-1 rounded-lg border border-orange-100 bg-orange-50/60 p-1.5"
                      aria-live="polite"
                      title={tutorLock.countdownLabel}
                    >
                      {[
                        { value: tutorLock.daysRemaining, label: "J" },
                        { value: tutorLock.hoursRemaining, label: "H" },
                        { value: tutorLock.minutesRemaining, label: "M" },
                        { value: tutorLock.secondsRemaining, label: "S" },
                      ].map((unit) => (
                        <div key={unit.label} className="min-w-[2.25rem] rounded-md bg-white px-1.5 py-1 border border-orange-100 text-center">
                          <p className="text-sm font-bold tabular-nums leading-none" style={{ color: BRAND.blue }}>
                            {String(unit.value).padStart(2, "0")}
                          </p>
                          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-neutral-400">
                            {unit.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-orange-600">
                      Fonctionnalité en préparation
                    </div>
                  )}
                </>
              ) : quotaUnlimited ? (
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  Messages illimités
                </span>
              ) : (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1 hidden md:block">
                    Échanges restants
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 md:w-24 h-1.5 bg-orange-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${isQuotaReached ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.max(0, Math.min(100, (quotaRemaining / Math.max(1, quotaTotal)) * 100))}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${isQuotaReached ? "text-red-500" : ""}`} style={isQuotaReached ? undefined : { color: BRAND.blue }}>
                      {Math.max(0, quotaRemaining)}/{quotaTotal}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {isTutorLocked ? (
        <main className="nexa-student-shell flex-1 relative overflow-hidden" aria-hidden="true">
          <TutorMaintenanceOverlay lock={tutorLock} />
        </main>
      ) : (
        <>
          <main className="nexa-student-shell flex-1 overflow-y-auto p-4 md:p-6 xl:p-8 relative">
            <div className="w-full space-y-5 pb-4">
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center pt-8 pb-4 text-center">
                  <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-200 mb-5">
                    <Sparkles className="w-8 h-8" style={{ color: BRAND.orange }} />
                  </div>
                  <h2 className={`${STUDENT_TEXT.sectionTitle} mb-2`} style={{ color: BRAND.blue }}>
                    {displayFirstName ? `Bonjour ${displayFirstName} !` : "Bonjour !"}
                  </h2>
                  <p className="text-neutral-500 text-sm max-w-xl mx-auto leading-relaxed mb-6">
                    Je suis votre tuteur privé, propulsé par NEXA. Je suis directement connecté à vos cours pour vous aider de manière précise et pédagogique. Que révisons-nous aujourd&apos;hui ?
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-4xl mx-auto">
                    {suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(sug.text)}
                        disabled={isBlocked}
                        aria-disabled={isBlocked}
                        className="p-4 min-h-[44px] bg-white border border-orange-200 rounded-xl hover:border-orange-400 transition-colors text-left group flex flex-col gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <sug.icon className="w-5 h-5 text-neutral-400 group-hover:text-orange-500 transition-colors" />
                        <span className="text-xs font-semibold leading-snug" style={{ color: BRAND.blue }}>{sug.text}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex gap-3 max-w-[92%] sm:max-w-[85%] md:max-w-[75%] xl:max-w-[70%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-orange-50 border border-orange-200" : "border border-orange-300"}`} style={msg.role === "assistant" ? { backgroundColor: BRAND.orange } : undefined}>
                        {msg.role === "user" ? <User className="w-4 h-4 text-neutral-500" /> : <Sparkles className="w-4 h-4 text-white" />}
                      </div>
                      <div className={`p-4 rounded-xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "text-white rounded-tr-sm"
                          : "bg-white border border-orange-200 text-neutral-800 rounded-tl-sm whitespace-pre-wrap"
                      }`} style={msg.role === "user" ? { backgroundColor: BRAND.blue } : undefined}>
                        {msg.content}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full justify-start">
                  <div className="flex gap-3 max-w-[75%] flex-row">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-orange-300" style={{ backgroundColor: BRAND.orange }}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-orange-200 rounded-tl-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {isQuotaReached && (
                <div className="flex items-center justify-center gap-2 p-3 mt-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold text-center mx-auto w-fit">
                  <AlertCircle className="w-4 h-4" />
                  Vous avez utilisé vos {TUTOR_EXCHANGE_QUOTA} échanges avec le tuteur IA.
                </div>
              )}

              {sendError && (
                <div className="flex items-center justify-center gap-2 p-3 mt-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold text-center mx-auto w-fit">
                  <AlertCircle className="w-4 h-4" />
                  {sendError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </main>

          <div className="nexa-student-shell bg-[#FFFBF7]/95 backdrop-blur-sm border-t border-orange-100/60 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0 relative z-20">
              <div className="w-full relative flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    isQuotaReached
                      ? `Quota de ${TUTOR_EXCHANGE_QUOTA} échanges atteint...`
                      : "Posez votre question ici..."
                  }
                  disabled={isBlocked || isTyping}
                  aria-disabled={isBlocked || isTyping}
                  className="w-full bg-white border border-orange-200 text-sm text-neutral-900 rounded-xl px-4 py-3 pr-14 outline-none focus:border-orange-400 transition-all resize-none overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] max-h-[120px]"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isBlocked || isTyping}
                  aria-disabled={!inputValue.trim() || isBlocked || isTyping}
                  className="absolute right-2 bottom-2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white rounded-lg transition-all disabled:opacity-50 active:scale-95"
                  style={{ backgroundColor: BRAND.blue }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-[10px] font-medium text-neutral-400 mt-2">
                Le tuteur peut commettre des erreurs. Vérifiez toujours vos cours.
              </p>
            </div>
        </>
      )}
    </div>
  );
}
