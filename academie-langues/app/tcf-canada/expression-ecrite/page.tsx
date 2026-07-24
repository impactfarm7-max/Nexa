"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, PenTool, ChevronRight, Sparkles, Clock } from "lucide-react";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

export default function ExpressionEcritePage() {
  const router = useRouter();

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
            Tableau de bord
          </button>
          <span className={`${STUDENT_TEXT.pageTitle} flex items-center gap-2`} style={{ color: BRAND.blue }}>
            <PenTool className="w-4 h-4" style={{ color: BRAND.orange }} />
            Expression Écrite
          </span>
        </div>
      </nav>

      <main className="nexa-student-shell pt-10 md:pt-14 xl:pt-16">

        {/* TITRE */}
        <div className="mb-10 text-center">
          <h1 className={`${STUDENT_TEXT.sectionTitle} mb-3`} style={{ color: BRAND.blue }}>
            Expression <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Écrite</span>
          </h1>
          <p className={`${STUDENT_TEXT.subtitle} max-w-md mx-auto`}>
            Choisissez votre mode d'entraînement pour progresser à l'écrit.
          </p>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 xl:gap-8">

          {/* BANQUE DE SUJETS */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => router.push("/tcf-canada/expression-ecrite/banque")}
            className="group relative w-full min-h-[44px] text-left bg-white border-2 border-orange-200 hover:border-orange-500 rounded-[2rem] p-7 md:p-8 xl:p-10 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(249,115,22,0.15)] hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-100 transition-colors" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-5 group-hover:bg-orange-500 group-hover:text-white transition-all">
                <BookOpen className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-2 block">Nouveau</span>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-2 leading-tight">
                Banque de Sujets Corrigés
              </h2>
              <p className="text-[12px] font-medium text-slate-500 mb-5 leading-relaxed">
                Consultez 31 sujets complets avec leurs corrigés modèles pour les 3 tâches. Idéal pour comprendre les attentes du correcteur.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-orange-600">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> 31 sujets</span>
                <span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> 33 corrigés</span>
              </div>
            </div>
            <div className="absolute bottom-6 right-6">
              <ChevronRight className="w-5 h-5 text-orange-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>

          {/* SIMULATEUR */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => router.push("/tcf-canada/simulateur/entrainement")}
            className="group relative w-full min-h-[44px] text-left bg-slate-950 border-2 border-slate-950 hover:bg-orange-600 hover:border-orange-600 rounded-[2rem] p-7 md:p-8 xl:p-10 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(249,115,22,0.25)] hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                <PenTool className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2 block">IA + Correction</span>
              <h2 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight">
                Simulateur Mode Zen
              </h2>
              <p className="text-[12px] font-medium text-slate-400 mb-5 leading-relaxed">
                Rédigez vos textes et obtenez une correction instantanée par intelligence artificielle avec score, erreurs et conseils.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-orange-400">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> 1 essai / jour</span>
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Correction IA</span>
              </div>
            </div>
            <div className="absolute bottom-6 right-6">
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>

        </div>

        {/* LIEN MODE EXAMEN */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5"
        >
          <button
            onClick={() => router.push("/tcf-canada/simulateur/examen")}
            className="group w-full min-h-[44px] bg-white border-2 border-orange-100 hover:border-orange-300 rounded-[1.5rem] p-5 xl:p-6 flex items-center justify-between transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-red-500 block mb-0.5">Conditions réelles</span>
                <h3 className="font-black text-slate-900 text-sm">Mode Examen Chronométré</h3>
                <p className="text-[11px] text-slate-400 font-medium">60 minutes · 3 tâches · Mercredi & Samedi</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
          </button>
        </motion.div>

      </main>
    </div>
  );
}
