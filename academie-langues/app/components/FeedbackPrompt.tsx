"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { supabase } from "../utils/supabase";

const FEEDBACK_INTERVAL_DAYS = 12;

interface FeedbackPromptProps {
  onOpen?: () => void;
}

export default function FeedbackPrompt({ onOpen }: FeedbackPromptProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkShouldShow = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const userId = sessionData.session.user.id;

      // Lire depuis profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("feedback_prompt_last_shown")
        .eq("id", userId)
        .single();

      if (profile?.feedback_prompt_last_shown) {
        const daysSince =
          (Date.now() -
            new Date(profile.feedback_prompt_last_shown).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSince < FEEDBACK_INTERVAL_DAYS) return;
      }

      // Enregistrer immédiatement la date d'affichage
      await supabase
        .from("profiles")
        .update({ feedback_prompt_last_shown: new Date().toISOString() })
        .eq("id", userId);

      setVisible(true);
    };

    const timer = setTimeout(checkShouldShow, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpen = () => {
    setVisible(false);
    setDismissed(true);
    onOpen?.();
  };

  const handleClose = () => {
    setVisible(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-8 right-8 z-40 max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-white flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageCircle className="w-5 h-5 mt-0.5" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-sm">Votre avis nous aide!</h3>
                  <p className="text-xs text-blue-100">
                    Partagez vos retours pour améliorer l'app
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Comment se passe votre expérience sur NEXA? Vos suggestions nous permettent d'améliorer continuellement l'app.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleOpen}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Send size={16} />
                  Partager
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg transition-colors text-sm"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
