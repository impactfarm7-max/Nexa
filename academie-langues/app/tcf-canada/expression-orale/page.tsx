"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronRight, Clock, Mic, Sparkles } from "lucide-react";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { banqueExpressionOrale } from "@/app/data/banque_expression_orale";

const tache2Count = banqueExpressionOrale.filter((s) => s.tache === 2).length;
const tache3Count = banqueExpressionOrale.filter((s) => s.tache === 3).length;

export default function ExpressionOralePage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans pb-24 md:pb-12 overflow-x-hidden">
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
            <Mic className="w-4 h-4" style={{ color: BRAND.orange }} />
            Expression Orale
          </span>
        </div>
      </nav>

      <main className="nexa-student-shell pt-10 md:pt-14 xl:pt-16">
        <div className="mb-10 text-center">
          <h1 className={`${STUDENT_TEXT.sectionTitle} mb-3`} style={{ color: BRAND.blue }}>
            Expression <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Orale</span>
          </h1>
          <p className={`${STUDENT_TEXT.subtitle} max-w-md mx-auto`}>
            Choisissez votre mode d'entraînement pour progresser à l'oral.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 xl:gap-8">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => router.push("/tcf-canada/expression-orale/banque")}
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
                Consultez les sujets de tâche 2 et tâche 3 avec questions modèles et réponses corrigées.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-orange-600">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> {tache2Count} tâche 2</span>
                <span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3" /> {tache3Count} tâche 3</span>
              </div>
            </div>
            <div className="absolute bottom-6 right-6">
              <ChevronRight className="w-5 h-5 text-orange-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => router.push("/tcf-canada/simulateur/oral")}
            className="group relative w-full min-h-[44px] text-left bg-slate-950 border-2 border-slate-950 hover:bg-orange-600 hover:border-orange-600 rounded-[2rem] p-7 md:p-8 xl:p-10 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(249,115,22,0.25)] hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-5">
                <Mic className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2 block">IA + Vocal</span>
              <h2 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight">
                Simulateur Oral
              </h2>
              <p className="text-[12px] font-medium text-slate-400 mb-5 leading-relaxed">
                Enregistrez votre réponse, dialoguez avec l'examinateur IA et recevez une correction instantanée.
              </p>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-orange-400">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Chronometre</span>
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Correction IA</span>
              </div>
            </div>
            <div className="absolute bottom-6 right-6">
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        </div>
      </main>
    </div>
  );
}
