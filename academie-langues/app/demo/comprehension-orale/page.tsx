"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, BookOpen, ChevronRight, Headphones, Lock } from "lucide-react";

const TOTAL_QUESTIONS = 39;
const TOTAL_MINUTES = 35;
const TOTAL_POINTS = 699;
const TOTAL_SERIES = 20;

const SERIES = Array.from({ length: TOTAL_SERIES }, (_, i) => ({ id: i + 1, label: `Série ${i + 1}` }));

type SerieResult = { score: number; total: number; level: string };

function getLevel(score: number, total: number): string {
  const pct = score / total;
  if (pct >= 0.9) return "C2";
  if (pct >= 0.75) return "C1";
  if (pct >= 0.6) return "B2";
  if (pct >= 0.45) return "B1";
  if (pct >= 0.3) return "A2";
  return "A1";
}

export default function ComprehensionOralePage() {
  const router = useRouter();
  const [results, setResults] = useState<Record<number, SerieResult>>({});
  const [filter, setFilter] = useState<"tous" | "termines" | "non-termines">("tous");

  useEffect(() => {
    const saved = localStorage.getItem("co_results");
    if (saved) setResults(JSON.parse(saved));
  }, []);

  const filtered = SERIES.filter((s) => {
    if (filter === "termines") return !!results[s.id];
    if (filter === "non-termines") return !results[s.id];
    return true;
  });

  return (
    /** * CHANGEMENT CLÉ ICI : 
     * fixed inset-0 : Prend tout l'écran
     * z-[100] : Passe par-dessus la sidebar/navbar (généralement z-40 ou z-50)
     * bg-neutral-50 : Définit le fond pour qu'on ne voit pas par transparence
     * overflow-y-auto : Permet le scroll à l'intérieur de la démo
     */
    <div className="fixed inset-0 z-[100] bg-neutral-50 overflow-y-auto pb-16">

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center hover:bg-neutral-50 active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Headphones className="w-4 h-4 text-white stroke-[2]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">TCF Canada</p>
              <h1 className="text-base font-black text-neutral-900 leading-tight tracking-tight">
                Compréhension de l'Oral
              </h1>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hidden md:block">
            {Object.keys(results).length}/{TOTAL_SERIES} complétées
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-6">

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
            const isPremium = serie.id !== 1;

            return (
              <button
                key={serie.id}
                onClick={() => {
                  if (isPremium) {
                    alert("Cette série est réservée aux membres Premium.");
                    return;
                  }
                  router.push(`/tcf-canada/comprehension/orale/${serie.id}`);
                }}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all group ${
                  isPremium
                    ? "bg-neutral-100/50 border-neutral-200 cursor-not-allowed hover:bg-neutral-100"
                    : done
                    ? "bg-orange-50 border-orange-200 hover:bg-orange-100 active:scale-[0.98] cursor-pointer"
                    : "bg-white border-neutral-200 hover:border-orange-300 hover:shadow-md active:scale-[0.98] cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isPremium ? "bg-neutral-200" : done ? "bg-orange-500" : "bg-orange-100"
                  }`}>
                    {isPremium ? (
                      <Lock className="w-4 h-4 text-neutral-500 stroke-[2]" />
                    ) : done ? (
                      <CheckCircle2 className="w-5 h-5 text-white stroke-[2]" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-orange-600 stroke-[2]" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-black leading-tight ${
                      isPremium ? "text-neutral-500" : done ? "text-orange-900" : "text-neutral-900"
                    }`}>{serie.label}</p>
                    <p className={`text-[11px] font-semibold ${
                      isPremium ? "text-neutral-400" : done ? "text-orange-500" : "text-neutral-500"
                    }`}>
                      {done ? `${result.level} · ${result.score}/${result.total}` : `${TOTAL_QUESTIONS} questions`}
                    </p>
                  </div>
                </div>

                <span className={`text-[11px] font-black flex items-center gap-0.5 ${
                  isPremium ? "text-neutral-400" : done ? "text-orange-500 group-hover:text-orange-600" : "text-orange-600 group-hover:text-orange-700"
                }`}>
                  {isPremium ? "Premium" : done ? "Refaire" : "Commencer"} 
                  {!isPremium && <ChevronRight className="w-3.5 h-3.5" />}
                  {isPremium && <Lock className="w-3 h-3 ml-0.5" />}
                </span>
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