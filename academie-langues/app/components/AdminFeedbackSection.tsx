"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, CheckCircle, Clock, AlertCircle, RefreshCcw, ChevronDown, ChevronUp, WifiOff } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { useOfflineQueue } from "@/app/hooks/useOfflineQueue";

type UserFeedback = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  status: "pending" | "treated";
  created_at: string;
  profiles?: {
    id: string;
    prenom: string | null;
    email: string | null;
  };
};

interface AdminFeedbackSectionProps {
  searchQuery?: string;
}

export default function AdminFeedbackSection({ searchQuery = "" }: AdminFeedbackSectionProps) {
  const { isOnline } = useOnlineStatus();
  const { addToQueue, pendingCount: queuedActionsCount } = useOfflineQueue();

  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTreated, setExpandedTreated] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => fetchFeedbacks(), 800);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté");
      }

      const res = await fetch("/api/admin/feedback", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
    } catch (error) {
      console.error("Erreur fetch feedbacks:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "pending" | "treated") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Vous devez être connecté");
      }

      if (!isOnline) {
        addToQueue({
          type: "feedback_status_update",
          payload: { id, status },
          endpoint: "/api/admin/feedback",
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        setFeedbacks((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status } : f))
        );
        return;
      }

      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, status }),
      });

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      );
    } catch (error) {
      console.error("Erreur update feedback:", error);
    }
  };

  const pendingFeedbacks = feedbacks
    .filter((f) => f.status === "pending")
    .filter((f) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.message.toLowerCase().includes(q) ||
        f.profiles?.prenom?.toLowerCase().includes(q) ||
        f.profiles?.email?.toLowerCase().includes(q)
      );
    });

  const treatedFeedbacks = feedbacks
    .filter((f) => f.status === "treated")
    .filter((f) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.message.toLowerCase().includes(q) ||
        f.profiles?.prenom?.toLowerCase().includes(q) ||
        f.profiles?.email?.toLowerCase().includes(q)
      );
    });

  const typeIcon: Record<string, string> = {
    bug: "🐛",
    "feature-request": "💡",
    complaint: "⚠️",
    general: "💬",
  };

  const typeLabel: Record<string, string> = {
    bug: "Bug",
    "feature-request": "Fonctionnalité",
    complaint: "Réclamation",
    general: "Général",
  };

  const FeedbackCard = ({ feedback, isTreated }: { feedback: UserFeedback; isTreated: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`border rounded-2xl p-6 transition-all ${
        isTreated
          ? "bg-slate-950/30 border-slate-800/30 hover:border-slate-800/50"
          : "bg-slate-900/50 border-slate-800 hover:border-slate-700/80 hover:shadow-lg hover:shadow-orange-500/5"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">{typeIcon[feedback.type] || "💬"}</span>
            <div className="flex-1">
              <p className={`font-bold text-sm ${isTreated ? "text-slate-500" : "text-white"}`}>
                {feedback.profiles?.prenom || "Anonyme"}
              </p>
              <p className={`text-xs ${isTreated ? "text-slate-600" : "text-slate-500"}`}>
                {feedback.profiles?.email || "email non disponible"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
              isTreated
                ? "text-slate-600 bg-slate-800/30"
                : "text-slate-400 bg-slate-800/50"
            }`}>
              {typeLabel[feedback.type] || feedback.type}
            </span>
            <span className={`text-[10px] ${isTreated ? "text-slate-700" : "text-slate-600"}`}>
              {new Date(feedback.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Message */}
      <p className={`text-sm leading-relaxed mb-4 border-t pt-4 ${
        isTreated
          ? "text-slate-600 border-slate-800/30"
          : "text-slate-300 border-slate-800/50"
      }`}>
        {feedback.message}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-end">
        {!isTreated ? (
          <button
            onClick={() => updateStatus(feedback.id, "treated")}
            disabled={!isOnline}
            title={!isOnline ? "Connexion requise" : ""}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Marquer traité
          </button>
        ) : (
          <button
            onClick={() => updateStatus(feedback.id, "pending")}
            disabled={!isOnline}
            title={!isOnline ? "Connexion requise" : ""}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remettre en attente
          </button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="w-full space-y-8">
      {/* Header avec boutons de contrôle */}
      <div className="flex items-center gap-3 justify-between flex-wrap">
        <button
          onClick={fetchFeedbacks}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-800/50 rounded-2xl text-red-400"
        >
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </motion.div>
      )}

      {/* Offline State */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-amber-950/30 border border-amber-800/50 rounded-2xl text-amber-400"
        >
          <WifiOff size={18} />
          <span className="text-sm font-medium">
            Mode hors ligne — {queuedActionsCount} action{queuedActionsCount !== 1 ? "s" : ""} en attente
          </span>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      )}

      {/* SECTION EN ATTENTE */}
      {!loading && (
        <>
          {/* Header EN ATTENTE */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full" />
              <div>
                <h3 className="text-xl font-black text-white">Feedbacks en attente</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  {pendingFeedbacks.length} retour{pendingFeedbacks.length > 1 ? "s" : ""} à traiter
                </p>
              </div>
              <div className="ml-auto">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-800/50">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Feedback List - EN ATTENTE */}
            <AnimatePresence mode="popLayout">
              {pendingFeedbacks.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="w-14 h-14 bg-slate-900/50 rounded-2xl flex items-center justify-center mb-3 border border-slate-800">
                    <MessageCircle size={24} className="text-slate-700" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">
                    Tous les feedbacks ont été traités! 🎉
                  </p>
                </motion.div>
              )}

              <div className="space-y-4">
                {pendingFeedbacks.map((feedback, idx) => (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <FeedbackCard feedback={feedback} isTreated={false} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>

          {/* SECTION TRAITÉ */}
          {treatedFeedbacks.length > 0 && (
            <div className="space-y-4">
              {/* Header TRAITÉ avec toggle */}
              <button
                onClick={() => setExpandedTreated(!expandedTreated)}
                className="w-full flex items-center gap-4 hover:opacity-80 transition-opacity"
              >
                <div className="w-1 h-8 bg-gradient-to-b from-slate-600 to-slate-700 rounded-full" />
                <div className="flex-1 text-left">
                  <h3 className="text-xl font-black text-slate-500">Feedbacks traités</h3>
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                    {treatedFeedbacks.length} retour{treatedFeedbacks.length > 1 ? "s" : ""} archivé{treatedFeedbacks.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="ml-auto">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800/30 border border-slate-800/50">
                    {expandedTreated ? (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>
              </button>

              {/* Feedback List - TRAITÉ (Collapsible) */}
              <AnimatePresence>
                {expandedTreated && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {treatedFeedbacks.map((feedback, idx) => (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <FeedbackCard feedback={feedback} isTreated={true} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}
