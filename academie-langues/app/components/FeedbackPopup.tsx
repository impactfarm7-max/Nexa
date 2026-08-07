"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send, CheckCircle } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";

const FEEDBACK_INTERVAL_DAYS = 10;

export default function FeedbackPopup() {
  const { locale } = useI18n();
  const en = locale === "en";
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const checkShouldShow = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      const userId = sessionData.session.user.id;

      // Lire depuis la table profiles (fiable cross-device/cross-session)
      const { data: profile } = await supabase
        .from("profiles")
        .select("feedback_last_shown")
        .eq("id", userId)
        .single();

      if (profile?.feedback_last_shown) {
        const daysSince = (Date.now() - new Date(profile.feedback_last_shown).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < FEEDBACK_INTERVAL_DAYS) return;
      }

      // Enregistrer immédiatement la date d'affichage dans profiles
      await supabase
        .from("profiles")
        .update({ feedback_last_shown: new Date().toISOString() })
        .eq("id", userId);

      setVisible(true);
    };

    const timer = setTimeout(checkShouldShow, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) { setLoading(false); return; }

      const meta = userData.user.user_metadata ?? {};
      const prenom = meta.prenom || meta.name || meta.full_name || userData.user.email?.split("@")[0] || "Anonyme";

      const { error } = await supabase.from("feedback").insert({
        user_id: userData.user.id,
        rating,
        comment: comment.trim() || null,
        prenom,
      });

      if (error) { console.error("Erreur Supabase:", error.message); setLoading(false); return; }

      setLoading(false);
      setSubmitted(true);
      setTimeout(() => setVisible(false), 2500);
    } catch (err) {
      console.error("Erreur réseau:", err);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
  };

  const handleStarClick = useCallback((star: number) => setRating(star), []);
  const handleStarEnter = useCallback((star: number) => setHovered(star), []);
  const handleStarLeave = useCallback(() => setHovered(0), []);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Conteneur centré */}
          <div className="fixed inset-0 flex items-center justify-center z-50 px-4 pointer-events-none">

            {/* Carte */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto relative"
            >
              {/* Bouton fermer */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={14} className="text-slate-500" />
              </button>

              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Header */}
                    <div className="text-center pr-6 mb-5">
                      <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Star size={22} className="text-orange-500 fill-orange-500" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{en ? "Your feedback matters!" : "Votre avis compte !"}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {en ? "How would you rate your experience on NEXA?" : "Comment évaluez-vous votre expérience sur NEXA ?"}
                      </p>
                    </div>

                    {/* Étoiles */}
                    <div className="flex justify-center gap-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleStarClick(star)}
                          onMouseEnter={() => handleStarEnter(star)}
                          onMouseLeave={handleStarLeave}
                          className="p-1 transition-opacity active:opacity-70"
                        >
                          <Star
                            size={36}
                            className={`transition-colors duration-100 ${
                              star <= (hovered || rating)
                                ? "text-orange-500 fill-orange-500"
                                : "text-slate-200 fill-slate-200"
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Label étoiles */}
                    <div className="h-5 mb-3 text-center">
                      {(hovered || rating) > 0 && (
                        <p className="text-xs font-bold text-orange-500">
                          {(en
                            ? ["", "Very poor 😞", "Poor 😕", "Average 😐", "Good 😊", "Excellent! 🔥"]
                            : ["", "Très mauvais 😞", "Mauvais 😕", "Correct 😐", "Bien 😊", "Excellent ! 🔥"])[hovered || rating]}
                        </p>
                      )}
                    </div>

                    {/* Commentaire */}
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={en ? "Share your experience (optional)..." : "Partagez votre expérience (optionnel)..."}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-400 resize-none transition-colors font-medium mb-4"
                    />

                    {/* Bouton envoyer */}
                    <button
                      onClick={handleSubmit}
                      disabled={rating === 0 || loading}
                      className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 mb-3"
                    >
                      {loading ? (
                        <span className="animate-pulse">{en ? "Sending..." : "Envoi en cours..."}</span>
                      ) : (
                        <><Send size={15} /> {en ? "Send my feedback" : "Envoyer mon avis"}</>
                      )}
                    </button>

                    {/* Lien ignorer */}
                    <button
                      onClick={handleClose}
                      className="w-full text-[11px] text-slate-400 font-medium hover:text-slate-600 transition-colors"
                    >
                      {en ? "Remind me tomorrow" : "Me le rappeler demain"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6 space-y-3"
                  >
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{en ? "Thank you very much!" : "Merci Beaucoup !"}</h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {en ? "Your feedback helps us improve NEXA for every learner. 🙏" : "Votre avis nous aide à améliorer NEXA pour tous les apprenants. 🙏"}
                    </p>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={20} className={star <= rating ? "text-orange-500 fill-orange-500" : "text-slate-200 fill-slate-200"} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
