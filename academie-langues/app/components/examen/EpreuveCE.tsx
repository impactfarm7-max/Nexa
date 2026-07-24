"use client";

import { useEffect, useState } from "react";
import { QuestionCE } from "@/app/data/comprehension_ecrite/types";
import { CheckCircle2, ChevronLeft, ChevronRight, BookOpenCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const OPTION_LABELS = ["A", "B", "C", "D"];

const levelColor: Record<string, string> = {
  A1: "bg-blue-50 text-blue-600 border-blue-100",
  A2: "bg-blue-50 text-blue-600 border-blue-100",
  B1: "bg-blue-100 text-blue-700 border-blue-200",
  B2: "bg-blue-100 text-blue-700 border-blue-200",
  C1: "bg-emerald-50 text-emerald-600 border-emerald-100",
  C2: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface Props {
  questions: QuestionCE[];
  onComplete: (answers: Record<number, number>) => void;
  initialAnswers?: Record<number, number>;
  onAnswerChange?: (answers: Record<number, number>) => void;
}

export default function EpreuveCE({ questions, onComplete, initialAnswers, onAnswerChange }: Props) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>(initialAnswers ?? {});

  const q = questions[currentQ];
  const answeredCount = Object.keys(answers).length;

  // Notifie le parent a chaque changement (pour autosave)
  useEffect(() => { onAnswerChange?.(answers); }, [answers, onAnswerChange]);

  const handleSelect = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQ]: optionIndex }));
  };

  if (!q) return null;

  return (
    <div className="flex flex-col gap-5">

      {/* Header section avec icône */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 xl:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 xl:w-11 xl:h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <BookOpenCheck size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] xl:text-xs font-black text-blue-600 uppercase tracking-[0.3em]">Compréhension Écrite</p>
            <p className="text-xs xl:text-sm text-slate-500 font-medium mt-0.5">{answeredCount} / {questions.length} questions répondues</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl xl:text-2xl font-black text-slate-900 tracking-tighter">{Math.round((answeredCount / questions.length) * 100)}<span className="text-sm text-slate-400">%</span></p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          />
        </div>
      </div>

      {/* Grille de navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 xl:p-6 shadow-sm overflow-x-auto">
        <p className="text-[10px] xl:text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
          Navigation rapide
        </p>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-13 gap-1.5 min-w-0">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`aspect-square rounded-lg text-xs font-black flex items-center justify-center transition-all ${
                i === currentQ
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white scale-110 shadow-md shadow-orange-500/30"
                  : answers[i] !== undefined
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Carte question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        >
          {/* Bandeau niveau */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <span className={`inline-block px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${levelColor[q.niveau] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
              Niveau {q.niveau}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Question {currentQ + 1} / {questions.length}
            </span>
          </div>

          {/* Texte du passage */}
          <div className="p-5 md:p-6 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Texte</p>
            <p className="text-sm text-slate-700 leading-relaxed">{q.texte}</p>
          </div>

          {/* Question + Options */}
          <div className="p-5 md:p-6">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2">Question</p>
            <p className="text-base font-bold text-slate-900 mb-5">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                    answers[currentQ] === i
                      ? "border-orange-500 bg-orange-50 text-slate-900 shadow-sm shadow-orange-500/10"
                      : "border-slate-200 hover:border-orange-200 text-slate-700 hover:bg-orange-50/30"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                      answers[currentQ] === i
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/30"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Footer navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
          disabled={currentQ === 0}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={14} /> Précédent
        </button>

        {currentQ < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Suivant <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={() => onComplete(answers)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/25 active:scale-95"
          >
            <CheckCircle2 size={14} /> Valider CE
          </button>
        )}
      </div>
    </div>
  );
}
