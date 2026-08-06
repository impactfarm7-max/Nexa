"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from "@/app/utils/supabase";
import { STUDENT_HOME } from "@/app/utils/student-routes"; 
import { GraduationCap, Globe2, ChevronRight, CheckCircle2, LayoutDashboard } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function SelectionPage() {
  const router = useRouter();
  const { t } = useI18n();

  // 🎯 On initialise l'état
  const [formation, setFormation] = useState("tcf");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  // Vérification de la session au chargement.
  // GARDE-FOU : cette page ne sert qu'aux candidats DIRECTS (sans centre),
  // qui sont seuls maîtres de leur matière. Un étudiant de centre ne doit
  // jamais pouvoir s'auto-assigner une discipline ici -- sa matière vient
  // de ce que son centre a décidé (via exam_discipline_enrollments) -- on
  // le redirige donc directement vers son dashboard.
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.center_id) {
        // Étudiant de centre : sa matière est assignée par le centre, pas
        // choisie librement -- cette page ne le concerne pas.
        router.replace(STUDENT_HOME);
        return;
      }

      setUser(session.user);
      setChecking(false);
    };
    checkUser();
  }, [router]);

  const formations = [
    { 
      id: "tcf", 
      title: "TCF Canada",
      description: t("auth", "choixTcfDescription"),
      icon: GraduationCap,
      available: true
    },
    {
      id: "anglais",
      title: t("auth", "choixEnglishTitle"),
      description: t("auth", "choixEnglishDescription"),
      icon: Globe2,
      available: false
    }
  ];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    try {
      // 📡 TRACEUR : On met à jour le profil avec la formation exacte
      // On utilise .update().eq() pour être sûr de toucher le bon utilisateur
      const { error } = await supabase
        .from('profiles')
        .update({ 
          formation: formation, // Envoie 'tcf' ou 'anglais'
          current_activity: "Vient de choisir sa classe 🎓" 
        })
        .eq('id', user.id);

      if (error) throw error;

      // ✅ Redirection vers le Dashboard une fois enregistré
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Erreur de sélection :", error);
      alert(t("auth", "choixSaveError"));
    } finally {
      setIsLoading(false);
    }
  };

  // Affiche un état neutre pendant la vérification centre/direct, pour
  // éviter un flash du formulaire avant la redirection éventuelle.
  if (checking) {
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex items-center justify-center p-6 selection:bg-orange-500/20 font-sans">
      
      {/* 💻 CONTENEUR MODAL (Style SaaS moderne) */}
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
        
        {/* Décoration en fond */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-50" />

        {/* EN-TÊTE ÉPURÉ */}
        <div className="text-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-orange-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-orange-100">
            <GraduationCap className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-3">
            {t("auth", "choixTitle")}
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
            {t("auth", "choixSubtitle")}
          </p>
        </div>

        {/* SÉLECTION VISUELLE */}
        <form onSubmit={handleStart} className="relative z-10">
          <div className="space-y-4 mb-10">
            {formations.map((f) => {
              const Icon = f.icon;
              const isSelected = formation === f.id;

              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={!f.available}
                  onClick={() => setFormation(f.id)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 text-left transition-all duration-300 group ${
                    !f.available 
                      ? "opacity-40 cursor-not-allowed border-slate-100 bg-slate-50" 
                      : isSelected
                        ? "border-orange-500 bg-orange-50/50 shadow-md ring-1 ring-orange-500/20"
                        : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110" : "bg-slate-50 text-slate-400"}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`font-black text-sm md:text-base ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                        {f.title}
                      </h3>
                      <p className="text-[11px] md:text-xs text-slate-500 mt-0.5 font-medium">
                        {f.description}
                      </p>
                    </div>
                  </div>

                  {/* Indicateur de sélection */}
                  {f.available && (
                    <div className="shrink-0 ml-4">
                      {isSelected ? (
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-slate-300 transition-colors" />
                      )}
                    </div>
                  )}
                  
                  {!f.available && (
                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                      {t("auth", "choixComingSoon")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* BOUTON DE VALIDATION */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 shadow-xl shadow-slate-900/10 group"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {t("auth", "choixStartButton")} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center opacity-60">
          NEXA • Intelligence & Excellence
        </p>

      </div>
    </div>
  );
}