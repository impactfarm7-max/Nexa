"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, BookOpen, ChevronRight, BookOpenCheck, Clock, Target, TrendingUp, Lock, Star } from "lucide-react";
import { catalogueSeriesCE } from "@/app/data/comprehension_ecrite/index";
import { supabase } from "@/app/utils/supabase";
import { logClientActivity } from "@/app/utils/client-activity";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

const TOTAL_QUESTIONS = 39;
const TOTAL_SERIES = 40;

const SERIES = Array.from({ length: TOTAL_SERIES }, (_, i) => ({ id: i + 1, label: `Série ${i + 1}` }));

const availableIds = new Set(catalogueSeriesCE.filter((s) => s.questions.length > 0).map((s) => s.id));

type SerieResult = { score: number; total: number; level: string };

const LEVEL_LABEL: Record<string, string> = {
  A1: "Débutant", A2: "Élémentaire",
  B1: "Intermédiaire", B2: "Interm. Sup.",
  C1: "Avancé", C2: "Maîtrise",
};
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

function formatStudyTime(s: number) {
  if (s <= 0) return "0min";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function ComprehensionEcritPage() {
  const router = useRouter();
  const { isAdmin, isSubValid } = useSimulationLimit();
  const isTrial = !isAdmin && !isSubValid;

  const [results, setResults] = useState<Record<number, SerieResult>>({});
  const [filter, setFilter] = useState<"tous" | "termines" | "non-termines">("tous");
  const [totalTime, setTotalTime] = useState(0);
  const [avgPct, setAvgPct] = useState(0);
  const [bestLevel, setBestLevel] = useState("");

  useEffect(() => {
    logClientActivity("Ouverture comprehension ecrite", "Catalogue des series consulte");

    const fetchResults = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("ce_results")
        .select("serie_id, score, total, level, time_spent")
        .eq("user_id", session.user.id);
      if (!data || data.length === 0) return;

      const map: Record<number, SerieResult> = {};
      let time = 0;
      let scoreSum = 0;
      let totalSum = 0;
      let best = "A1";

      data.forEach((r) => {
        map[r.serie_id] = { score: r.score, total: r.total, level: r.level };
        scoreSum += r.score;
        totalSum += r.total;
        time += r.time_spent ?? 0;
        if (LEVEL_ORDER.indexOf(r.level) >= LEVEL_ORDER.indexOf(best)) {
          best = r.level;
        }
      });

      setResults(map);
      setTotalTime(time);
      setAvgPct(totalSum > 0 ? Math.round((scoreSum / totalSum) * 100) : 0);
      setBestLevel(best);
    };
    fetchResults();
  }, []);

  const done = Object.keys(results).length;
  const progressPct = Math.round((done / TOTAL_SERIES) * 100);

  const filtered = SERIES.filter((s) => {
    if (filter === "termines") return !!results[s.id];
    if (filter === "non-termines") return !results[s.id];
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-neutral-900 pb-16">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
              <BookOpenCheck className="w-4 h-4 text-white stroke-[2]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">TCF Canada</p>
              <h1 className={`${STUDENT_TEXT.pageTitle} leading-tight`} style={{ color: BRAND.blue }}>
                Compréhension de l'Écrit
              </h1>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hidden md:block">
            {done}/{TOTAL_SERIES} complétées
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-6">

        {/* ══ BLOC STATS ══ */}
        <div className="rounded-3xl overflow-hidden border border-neutral-200 shadow-sm mb-6">

          {/* Bandeau */}
          <div className="bg-slate-900 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Quiz Effectuées</p>
            <p className="text-xl font-black text-white leading-none mb-2">
              {done} <span className="text-sm font-bold text-slate-400">/ {TOTAL_SERIES}</span>
            </p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Stats cards */}
          <div className="bg-white grid grid-cols-3 divide-x divide-neutral-100">

            <div className="px-2 py-2.5 flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 leading-none">{formatStudyTime(totalTime)}</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide leading-tight">Temps</p>
              </div>
            </div>

            <div className="px-2 py-2.5 flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 leading-none">{done > 0 ? `${avgPct}%` : "—"}</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide leading-tight">Réussite</p>
              </div>
            </div>

            <div className={`px-2 py-2.5 flex items-center gap-1.5 ${done > 0 ? "bg-orange-50 border-l-2 border-orange-500" : ""}`}>
              <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 leading-none">{done > 0 ? bestLevel : "—"}</p>
                {done > 0 ? (
                  <p className="text-[9px] font-bold text-orange-500 leading-tight truncate">{LEVEL_LABEL[bestLevel]}</p>
                ) : (
                  <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide leading-tight">Niveau</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* FILTRES */}
        <div className="flex gap-2 mb-6">
          {(["tous", "termines", "non-termines"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === f
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "bg-white border border-neutral-200 text-neutral-500 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {f === "tous" ? "Tous" : f === "termines" ? "Terminés" : "Non terminés"}
            </button>
          ))}
        </div>

        {/* GRILLE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((serie) => {
            const result = results[serie.id];
            const done = !!result;
            const isLocked = !availableIds.has(serie.id);
            const isTrialLocked = isTrial && serie.id > 1;

            if (isTrialLocked) {
              return (
                <button
                  key={serie.id}
                  onClick={() => router.push("/paywall")}
                  className="flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all group bg-white border-orange-100 hover:border-orange-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-orange-50">
                      <Lock className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black leading-tight text-neutral-700">{serie.label}</p>
                      <p className="text-[11px] font-semibold text-orange-400">Réservé aux membres</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0">
                    <Star size={8} fill="currentColor" /> Pro
                  </span>
                </button>
              );
            }

            return (
              <button
                key={serie.id}
                onClick={() => {
                  if (isLocked) return;
                  logClientActivity("Serie comprehension ecrite selectionnee", serie.label, { serie_id: serie.id });
                  router.push(`/tcf-canada/comprehension/ecrit/${serie.id}`);
                }}
                disabled={isLocked}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all group ${
                  isLocked
                    ? "bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed"
                    : done
                    ? "bg-orange-50 border-orange-200 hover:bg-orange-100 active:scale-[0.98] cursor-pointer"
                    : "bg-white border-neutral-200 hover:border-orange-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isLocked ? "bg-neutral-200" : done ? "bg-orange-500" : "bg-orange-100"}`}>
                    {isLocked
                      ? <Lock className="w-4 h-4 text-neutral-400" />
                      : done
                      ? <CheckCircle2 className="w-5 h-5 text-white stroke-2" />
                      : <BookOpen className="w-5 h-5 text-orange-600 stroke-2" />
                    }
                  </div>
                  <div>
                    <p className={`text-sm font-black leading-tight ${isLocked ? "text-neutral-400" : done ? "text-orange-900" : "text-neutral-900"}`}>{serie.label}</p>
                    <p className={`text-[11px] font-semibold ${isLocked ? "text-neutral-400" : done ? "text-orange-500" : "text-neutral-500"}`}>
                      {isLocked ? "Bientôt disponible" : done ? `${result.level} · ${result.score}/${result.total}` : `${TOTAL_QUESTIONS} questions`}
                    </p>
                  </div>
                </div>
                {!isLocked && (
                  <span className={`text-[11px] font-black flex items-center gap-0.5 ${done ? "text-orange-500 group-hover:text-orange-600" : "text-orange-600 group-hover:text-orange-700"}`}>
                    {done ? "Refaire" : "Commencer"} <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-neutral-400">
            <p className="text-sm font-bold">Aucune série dans cette catégorie.</p>
          </div>
        )}

      </main>
    </div>
  );
}
