"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Clock, HelpCircle, Zap, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { logClientActivity } from "@/app/utils/client-activity";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const TOTAL_QUESTIONS = 39;
const TOTAL_MINUTES = 60;
const TOTAL_POINTS = 699;

export default function ConsigneEcritPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  useEffect(() => {
    logClientActivity("Ouverture serie comprehension ecrite", `Serie ${id}`, { serie_id: id });
  }, [id]);

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-neutral-900 flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Compréhension de l'Écrit</p>
            <h1 className={`${STUDENT_TEXT.pageTitle} leading-tight`} style={{ color: BRAND.blue }}>Série {id}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >

          {/* Icône */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-xl shadow-orange-500/25 mb-5">
              <BookOpenCheck className="w-10 h-10 text-white stroke-[1.8]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 mb-1">TCF Canada · NEXA</p>
            <h2 className={`${STUDENT_TEXT.sectionTitle} tracking-tight`} style={{ color: BRAND.blue }}>Série {id}</h2>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: HelpCircle, label: "Questions", value: TOTAL_QUESTIONS },
              { icon: Clock, label: "Minutes", value: TOTAL_MINUTES },
              { icon: Zap, label: "Points", value: TOTAL_POINTS },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                <span className="text-2xl font-black text-orange-600">{value}</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{label}</span>
              </div>
            ))}
          </div>

          {/* Info lecture */}
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 mb-4">
            <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <BookOpenCheck className="w-4 h-4 text-orange-600 stroke-2" />
            </div>
            <p className="text-xs font-semibold text-orange-800 leading-snug">
              Cette épreuve est basée sur des documents écrits. Lisez attentivement chaque texte avant de répondre aux questions.
            </p>
          </div>

          {/* Conseil stratégique */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-8">
            <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              💡 Conseil stratégique
            </p>
            <ul className="text-xs text-amber-900 font-medium space-y-1.5 leading-relaxed">
              <li>Les questions augmentent en difficulté : <span className="font-black">A1 → A2 → B1 → B2 → C1 → C2</span></li>
              <li>Lisez d'abord la question, puis le texte pour cibler l'information clé.</li>
              <li>Concentrez-vous sur les <span className="font-black">20 dernières questions</span>, elles rapportent le plus de points.</li>
            </ul>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-700 stroke-2" />
            </button>
            <button
              onClick={() => {
                logClientActivity("Quiz comprehension ecrite lance", `Serie ${id}`, { serie_id: id });
                router.push(`/tcf-canada/comprehension/ecrit/${id}/quiz`);
              }}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all"
            >
              Commencer l'épreuve
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
