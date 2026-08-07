"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, AlertCircle, CheckCircle, Bug, Lightbulb, AlertTriangle, MessageCircle, Clock } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { useOfflineQueue } from "@/app/hooks/useOfflineQueue";
import { useI18n } from "@/app/i18n/I18nProvider";

type FeedbackType = "bug" | "feature-request" | "complaint" | "general";

interface FeedbackFormProps {
  onClose?: () => void;
  isModal?: boolean;
}

export default function FeedbackForm({ onClose, isModal = false }: FeedbackFormProps) {
  const { locale } = useI18n();
  const en = locale === "en";
  const { isOnline } = useOnlineStatus();
  const { addToQueue, pendingCount } = useOfflineQueue();

  const [message, setMessage] = useState("");
  const [type, setType] = useState<FeedbackType>("general");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "queued">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setStatus("error");
      setErrorMsg(en ? "Message is required." : "Le message est requis.");
      return;
    }

    setLoading(true);
    setStatus("idle");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(en ? "You must be signed in to send feedback" : "Vous devez être connecté pour envoyer un retour");
      }

      // Mode offline: mettre en queue
      if (!isOnline) {
        addToQueue({
          type: "feedback_submit",
          payload: { message, type },
          endpoint: "/api/feedback",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        setStatus("queued");
        setMessage("");
        setType("general");
        setLoading(false);

        if (isModal && onClose) {
          setTimeout(() => onClose(), 2500);
        }
        return;
      }

      // Mode online: comportement normal
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message, type }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || (en ? "An error occurred while submitting" : "Erreur lors de la soumission"));
      }

      setStatus("success");
      setMessage("");
      setType("general");

      if (isModal && onClose) {
        setTimeout(() => onClose(), 2500);
      }
    } catch (error) {
      setStatus("error");
      setErrorMsg(
        error instanceof Error ? error.message : (en ? "Server error" : "Erreur serveur")
      );
    } finally {
      setLoading(false);
    }
  };

  const feedbackTypes: Array<{ value: FeedbackType; label: string; icon: React.ReactNode; color: string }> = [
    { value: "bug", label: en ? "Report a bug" : "Signaler un bug", icon: <Bug size={20} />, color: "from-red-600 to-red-700" },
    { value: "feature-request", label: en ? "Request a feature" : "Demander une fonctionnalité", icon: <Lightbulb size={20} />, color: "from-yellow-600 to-yellow-700" },
    { value: "complaint", label: en ? "Complaint" : "Réclamation", icon: <AlertTriangle size={20} />, color: "from-orange-600 to-orange-700" },
    { value: "general", label: en ? "General feedback" : "Feedback général", icon: <MessageCircle size={20} />, color: "from-blue-600 to-blue-700" },
  ];

  const content = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Selection */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
          {en ? "Feedback type" : "Type de retour"}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {feedbackTypes.map((option) => {
            const isSelected = type === option.value;
            return (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative group px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 overflow-hidden ${
                  isSelected
                    ? `bg-gradient-to-br ${option.color} text-white shadow-lg shadow-orange-500/20`
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="feedbackType"
                    className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  <span className="text-lg">{option.icon}</span>
                  <span className="hidden sm:inline text-xs uppercase tracking-widest font-black">
                    {option.label.split(" ")[0]}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Message Input */}
      <div>
        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          {en ? "Your message" : "Votre message"}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={en ? "Describe your feedback..." : "Décrivez votre retour..."}
          className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none text-slate-200 placeholder:text-slate-600 transition-all text-sm font-medium"
          rows={5}
        />
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-800/50 rounded-xl text-red-400"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queued Message */}
      <AnimatePresence>
        {status === "queued" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl text-amber-400"
          >
            <Clock size={18} className="shrink-0" />
            <span className="text-sm font-medium">{en ? "Feedback saved and will be sent automatically when reconnected" : "Retour sauvegardé, envoi automatique à la reconnexion"}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-emerald-400"
          >
            <CheckCircle size={18} className="shrink-0" />
            <span className="text-sm font-medium">{en ? "Thank you for your feedback! 🎉" : "Merci pour votre retour! 🎉"}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      <motion.button
        onClick={handleSubmit}
        disabled={loading || status === "success"}
        whileHover={{ scale: loading || status === "success" ? 1 : 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-800 text-white font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:shadow-none disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>{en ? "Sending..." : "Envoi en cours..."}</span>
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle size={18} />
            <span>{en ? "Sent!" : "Envoyé!"}</span>
          </>
        ) : (
          <>
            <Send size={18} />
            <span>{en ? "Send my feedback" : "Envoyer mon retour"}</span>
          </>
        )}
      </motion.button>

      {/* Pending Count Badge */}
      {pendingCount > 0 && (
        <p className="text-center text-xs text-amber-500 font-medium mt-1">
          {en
            ? `${pendingCount} feedback item${pendingCount > 1 ? "s" : ""} waiting to be sent`
            : `${pendingCount} retour${pendingCount > 1 ? "s" : ""} en attente d'envoi`}
        </p>
      )}
    </form>
  );

  if (isModal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-slate-800/50 relative overflow-hidden"
        >
          {/* Decorative background gradient */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 rounded-full blur-3xl" />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                  {en ? "Give us your feedback" : "Nous donner votre avis"}
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {en ? "Help us improve the app" : "Aidez-nous à améliorer l'app"}
                </p>
              </div>
              {onClose && (
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-lg bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </motion.button>
              )}
            </div>

            {/* Form */}
            {content}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl shadow-lg p-8 max-w-lg mx-auto border border-slate-800/50">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
          {en ? "Give us your feedback" : "Nous donner votre avis"}
        </h2>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
          {en ? "Help us improve the app" : "Aidez-nous à améliorer l'app"}
        </p>
      </div>
      {content}
    </div>
  );
}
