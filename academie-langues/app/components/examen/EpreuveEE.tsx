"use client";

import { useEffect, useState, useMemo } from "react";
import { SujetTache3 } from "@/app/data/sujets_examen";
import { CheckCircle2, PenLine, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Task = 1 | 2 | 3;
type Answers = { 1: string; 2: string; 3: string };

interface Sujet {
  1: string;
  2: string;
  3: SujetTache3;
}

interface Props {
  sujet: Sujet;
  sujetId: number;
  onComplete: (answers: Answers) => void;
  initialAnswers?: Answers;
  onAnswerChange?: (answers: Answers) => void;
}

const TASK_LIMITS: Record<Task, [number, number]> = {
  1: [60, 120],
  2: [120, 150],
  3: [120, 180],
};

export default function EpreuveEE({ sujet, onComplete, initialAnswers, onAnswerChange }: Props) {
  const [activeTask, setActiveTask] = useState<Task>(1);
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? { 1: "", 2: "", 3: "" });

  useEffect(() => { onAnswerChange?.(answers); }, [answers, onAnswerChange]);

  const [minWords, maxWords] = TASK_LIMITS[activeTask];

  const wordCount = useMemo(() => {
    const text = answers[activeTask] || "";
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }, [answers, activeTask]);

  const wordColor =
    wordCount === 0 ? "text-slate-400" :
    wordCount < minWords ? "text-amber-500" :
    wordCount > maxWords ? "text-red-500" :
    "text-emerald-600";

  const allTasksWritten = [1, 2, 3].every(
    (t) => answers[t as Task].trim().split(/\s+/).filter((w) => w.length > 0).length >= 10
  );

  const tasksDone = [1, 2, 3].filter(
    (t) => answers[t as Task].trim().split(/\s+/).filter((w) => w.length > 0).length >= TASK_LIMITS[t as Task][0]
  ).length;

  const task3 = sujet[3];

  return (
    <div className="flex flex-col gap-5">

      {/* Header section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center">
            <PenLine size={18} className="text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-violet-600 uppercase tracking-[0.3em]">Expression Écrite</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{tasksDone} / 3 tâches complètes</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{Math.round((tasksDone / 3) * 100)}<span className="text-sm text-slate-400">%</span></p>
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(tasksDone / 3) * 100}%` }}
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
          />
        </div>
      </div>

      {/* Onglets tâches */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          3 tâches — corrections IA affichées en fin d&apos;examen
        </p>
        <div className="flex gap-1.5 sm:gap-2">
          {([1, 2, 3] as Task[]).map((t) => {
            const wc = answers[t].trim().split(/\s+/).filter((w) => w.length > 0).length;
            const done = wc >= TASK_LIMITS[t][0];
            return (
              <button
                key={t}
                onClick={() => setActiveTask(t)}
                className={`flex-1 min-h-[44px] py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                  activeTask === t
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30"
                    : done
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100"
                }`}
              >
                Tâche {t}
                {done && activeTask !== t && <span className="ml-1.5 opacity-70">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu tâche active */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTask}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        >
          <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100">
              <PenLine size={11} /> Tâche {activeTask}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {minWords}–{maxWords} mots
            </span>
          </div>

          <div className="p-5 md:p-6">
            {/* Sujet */}
            {activeTask === 3 ? (
              <div className="space-y-3 mb-5">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Consigne</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{task3.consigne}</p>
                </div>
                <div className="text-center font-black text-slate-900 text-base border border-slate-200 rounded-xl py-3 px-4 bg-slate-50">
                  {task3.titre}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-orange-50/30 hover:border-orange-100 transition-all">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Document 1</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{task3.document1}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-orange-50/30 hover:border-orange-100 transition-all">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Document 2</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{task3.document2}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4 mb-5">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Consigne</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {sujet[activeTask as 1 | 2]}
                </p>
              </div>
            )}

            {/* Zone de rédaction */}
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Votre réponse</p>
            <textarea
              value={answers[activeTask]}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [activeTask]: e.target.value }))
              }
              placeholder="Rédigez votre réponse ici..."
              className="w-full min-h-[180px] sm:min-h-[220px] xl:min-h-[280px] border-2 border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-xl p-4 xl:p-5 text-sm xl:text-base text-slate-800 focus:outline-none resize-y leading-relaxed transition-colors bg-slate-50/30"
            />

            <div className={`flex items-center justify-between mt-3 text-xs font-black uppercase tracking-widest ${wordColor}`}>
              <span>{wordCount} mot{wordCount > 1 ? "s" : ""}</span>
              <span className="text-slate-400">Objectif : {minWords}–{maxWords}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3">
        {activeTask < 3 ? (
          <button
            onClick={() => setActiveTask((t) => (t + 1) as Task)}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Tâche suivante <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={() => onComplete(answers)}
            disabled={!allTasksWritten}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/25 active:scale-95"
          >
            <CheckCircle2 size={14} /> Valider EE
          </button>
        )}
      </div>
    </div>
  );
}
