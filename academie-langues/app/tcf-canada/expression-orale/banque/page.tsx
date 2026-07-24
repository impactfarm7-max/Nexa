"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, ListChecks, Mic } from "lucide-react";
import { banqueExpressionOrale, type SujetOralCorrige, type TacheOrale } from "@/app/data/banque_expression_orale";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const TACHE_COLORS: Record<TacheOrale, { bg: string; badge: string; text: string; border: string }> = {
  1: { bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", text: "text-blue-700", border: "border-blue-200" },
  2: { bg: "bg-violet-50", badge: "bg-violet-100 text-violet-700", text: "text-violet-700", border: "border-violet-200" },
  3: { bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700", border: "border-emerald-200" },
};

const TACHE_LABELS: Record<TacheOrale, string> = {
  1: "Présentation",
  2: "Interaction dirigée",
  3: "Expression d'un point de vue",
};

function SujetCard({ sujet }: { sujet: SujetOralCorrige }) {
  const [open, setOpen] = useState(false);
  const colors = TACHE_COLORS[sujet.tache];

  return (
    <div className={`rounded-2xl border ${colors.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full text-left p-4 md:p-5 ${colors.bg} flex items-start justify-between gap-3 transition-all`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${colors.badge}`}>
            Tâche {sujet.tache}
          </span>
          <div className="flex-1 min-w-0">
            <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${colors.text} opacity-70`}>
              {TACHE_LABELS[sujet.tache]}
            </span>
            <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
              {sujet.consigne}
            </p>
          </div>
        </div>
        <div className="shrink-0 mt-0.5">
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

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
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Consigne</h4>
                <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 rounded-xl p-3">
                  {sujet.consigne}
                </p>
              </div>

              {sujet.questions && (
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3 h-3" /> Questions modèles
                  </h4>
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                    <ul className="space-y-2">
                      {sujet.questions.map((question, index) => (
                        <li key={index} className="text-sm text-slate-700 leading-relaxed font-medium flex gap-2">
                          <span className="text-violet-500 font-black shrink-0">{index + 1}.</span>
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {sujet.corrige && (
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Corrigé modèle
                  </h4>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                      {sujet.corrige}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BanqueExpressionOralePage() {
  const router = useRouter();
  const [selectedTache, setSelectedTache] = useState<TacheOrale | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => banqueExpressionOrale.filter((s) => selectedTache === "all" || s.tache === selectedTache),
    [selectedTache]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const pageItems = filtered.slice((page - 1) * 12, page * 12);

  const selectTache = (tache: TacheOrale | "all") => {
    setSelectedTache(tache);
    setPage(1);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans pb-24 md:pb-12 overflow-x-hidden">
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
        <div className="mb-8">
          <h1 className={`${STUDENT_TEXT.sectionTitle} mb-2`} style={{ color: BRAND.blue }}>
            Banque de <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Sujets Corrigés</span>
          </h1>
          <p className={STUDENT_TEXT.subtitle}>
            {banqueExpressionOrale.length} sujets et corrigés modèles pour l'expression orale TCF Canada.
          </p>
        </div>

        <div className="mb-6">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Filtrer par tâche</p>
          <div className="flex flex-wrap gap-2">
            {(["all", 1, 2, 3] as const).map((tache) => (
              <button
                key={tache}
                onClick={() => selectTache(tache)}
                className={`min-h-[44px] rounded-xl px-4 text-xs font-black transition-all inline-flex items-center gap-2 ${
                  selectedTache === tache
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                    : "bg-white border border-orange-100 text-slate-500 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {tache === "all" ? <ListChecks className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {tache === "all" ? "Tout" : `Tâche ${tache}`}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedTache}-${page}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className={STUDENT_TEXT.cardTitle} style={{ color: BRAND.blue }}>
                {selectedTache === "all" ? "Tous les sujets" : `Tâche ${selectedTache}`}
              </h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {filtered.length} sujets
              </span>
            </div>

            {pageItems.map((sujet) => (
              <SujetCard key={sujet.id} sujet={sujet} />
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-orange-100">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-2 min-h-[44px] text-xs font-black text-orange-600 bg-orange-50 px-4 py-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-100 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Page precedente
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-2 min-h-[44px] text-xs font-black text-orange-600 bg-orange-50 px-4 py-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-100 transition-all"
          >
            Page suivante <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </main>
    </div>
  );
}
