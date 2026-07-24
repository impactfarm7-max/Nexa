"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, CheckCircle2, FileText } from "lucide-react";
import { banqueExpressionEcrite, type Tache } from "@/app/data/banque_expression_ecrite";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const TACHE_COLORS: Record<number, { bg: string; badge: string; text: string; border: string }> = {
  1: { bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", text: "text-blue-700", border: "border-blue-200" },
  2: { bg: "bg-violet-50", badge: "bg-violet-100 text-violet-700", text: "text-violet-700", border: "border-violet-200" },
  3: { bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700", border: "border-emerald-200" },
};

const TACHE_LABELS: Record<number, string> = {
  1: "Message / Courriel",
  2: "Article / Blog / Récit",
  3: "Synthèse de documents",
};

function TacheCard({ tache }: { tache: Tache }) {
  const [open, setOpen] = useState(false);
  const colors = TACHE_COLORS[tache.numero];

  return (
    <div className={`rounded-2xl border ${colors.border} overflow-hidden`}>
      {/* HEADER */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left p-4 md:p-5 ${colors.bg} flex items-start justify-between gap-3 transition-all`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${colors.badge}`}>
            Tâche {tache.numero}
          </span>
          <div className="flex-1 min-w-0">
            <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${colors.text} opacity-70`}>
              {TACHE_LABELS[tache.numero]} · ~{tache.mots_indicatif} mots
            </span>
            <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
              {tache.consigne}
            </p>
          </div>
        </div>
        <div className="shrink-0 mt-0.5">
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* CONTENU */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 md:p-5 bg-white space-y-5">

              {/* CONSIGNE COMPLÈTE */}
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Consigne</h4>
                <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 rounded-xl p-3">
                  {tache.consigne}
                </p>
              </div>

              {/* DOCUMENTS (tâche 3) */}
              {tache.document1 && (
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> Documents fournis
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Document 1</span>
                      <p className="text-xs text-slate-600 leading-relaxed">{tache.document1}</p>
                    </div>
                    {tache.document2 && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Document 2</span>
                        <p className="text-xs text-slate-600 leading-relaxed">{tache.document2}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CORRIGÉ */}
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Corrigé modèle · ~{tache.mots_indicatif} mots
                </h4>
                {tache.titre_corrige && (
                  <p className="text-sm font-black text-slate-800 mb-2">{tache.titre_corrige}</p>
                )}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {tache.corrige}
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BanquePage() {
  const router = useRouter();
  const [selectedSujet, setSelectedSujet] = useState<number>(1);

  const sujet = banqueExpressionEcrite.find((s) => s.id === selectedSujet)!;

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans pb-24 md:pb-12 overflow-x-hidden">

      {/* HEADER */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-orange-100">
        <div className="nexa-student-shell py-4 flex justify-between items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 transition inline-flex items-center gap-2 group bg-orange-50 px-3 py-1.5 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour
          </button>
          <span className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-orange-400" />
            Banque de Sujets Corrigés
          </span>
        </div>
      </nav>

      <main className="nexa-student-shell pt-8 md:pt-10 xl:pt-12 pb-6">

        {/* TITRE */}
        <div className="mb-8">
          <h1 className={`${STUDENT_TEXT.sectionTitle} mb-2`} style={{ color: BRAND.blue }}>
            Banque de <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Sujets Corrigés</span>
          </h1>
          <p className={STUDENT_TEXT.subtitle}>
            {banqueExpressionEcrite.length} sujets complets avec corrigés modèles pour les 3 tâches de l'expression écrite TCF Canada.
          </p>
        </div>

        {/* SÉLECTEUR DE SUJET */}
        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Choisir un sujet</p>
          <div className="flex flex-wrap gap-2">
            {banqueExpressionEcrite.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSujet(s.id)}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl text-xs font-black transition-all ${
                  selectedSujet === s.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                    : "bg-white border border-orange-100 text-slate-500 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>

        {/* TÂCHES DU SUJET SÉLECTIONNÉ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedSujet}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className={STUDENT_TEXT.cardTitle} style={{ color: BRAND.blue }}>Sujet {String(selectedSujet).padStart(2, "0")}</h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">3 tâches</span>
            </div>

            {sujet.taches.map((tache) => (
              <TacheCard key={tache.numero} tache={tache} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* NAVIGATION SUJET PRÉCÉDENT / SUIVANT */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-orange-100">
          <button
            disabled={selectedSujet === 1}
            onClick={() => setSelectedSujet((p) => p - 1)}
            className="flex items-center gap-2 min-h-[44px] text-xs font-black text-orange-600 bg-orange-50 px-4 py-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-100 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Sujet précédent
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {selectedSujet} / {banqueExpressionEcrite.length}
          </span>
          <button
            disabled={selectedSujet === banqueExpressionEcrite.length}
            onClick={() => setSelectedSujet((p) => p + 1)}
            className="flex items-center gap-2 min-h-[44px] text-xs font-black text-orange-600 bg-orange-50 px-4 py-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-100 transition-all"
          >
            Sujet suivant <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

      </main>
    </div>
  );
}
