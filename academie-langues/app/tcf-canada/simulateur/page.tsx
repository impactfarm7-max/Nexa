"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  PenTool,
  Timer,
  ChevronRight,
  Zap,
  Sparkles,
  Award,
  Lock,
  Clock
} from "lucide-react";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { supabase } from "@/app/utils/supabase";

// ====================================================
// 🔒 BLOCAGE QUOTIDIEN — uniquement Expression Écrite
// ====================================================
const TASK_KEYS = {
  entrainement: "iag_last_entrainement",
};

function isBlockedToday(key: string): boolean {
  const last = localStorage.getItem(key);
  if (!last) return false;
  const lastDate = new Date(last).toDateString();
  const today = new Date().toDateString();
  return lastDate === today;
}

function getUnlockTime(key: string): string {
  const last = localStorage.getItem(key);
  if (!last) return "";
  const tomorrow = new Date(last);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const now = new Date();
  const diffMs = tomorrow.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffH}h ${diffM}min`;
}

// Appelé depuis entrainement/page.tsx après soumission réussie
export function markTaskDone(path: string) {
  const key = TASK_KEYS[path as keyof typeof TASK_KEYS];
  if (key) localStorage.setItem(key, new Date().toISOString());
}
// ====================================================

export default function SimulateurMenu() {
  const router = useRouter();
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  const [unlockIn, setUnlockIn] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState<string | null>(null);

  // Vérifier le statut de blocage au chargement — uniquement pour Expression Écrite
  useEffect(() => {
    const blockedState: Record<string, boolean> = {};
    const unlockState: Record<string, string> = {};

    // Seul "entrainement" est soumis au blocage quotidien
    const key = TASK_KEYS["entrainement"];
    blockedState["entrainement"] = isBlockedToday(key);
    if (blockedState["entrainement"]) {
      unlockState["entrainement"] = getUnlockTime(key);
    }

    setBlocked(blockedState);
    setUnlockIn(unlockState);

    // Mettre à jour le countdown chaque minute
    const interval = setInterval(() => {
      const newUnlock: Record<string, string> = {};
      if (isBlockedToday(key)) newUnlock["entrainement"] = getUnlockTime(key);
      setUnlockIn(newUnlock);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Signal radar admin
  useEffect(() => {
    let channel: any;
    const activerSignal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ current_activity: 'Simulateur 🎙️' }).eq('id', user.id);
        channel = supabase.channel('online-users');
        channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') await channel.track({ user_id: user.id });
        });
      }
    };
    activerSignal();
    return () => {
      const couperSignal = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from('profiles').update({ current_activity: null }).eq('id', user.id);
        if (channel) supabase.removeChannel(channel);
      };
      couperSignal();
    };
  }, []);

  const menuItems = [
    {
      title: "Expression Orale",
      icon: Mic,
      path: "oral",
      desc: "Pratiquez l'oral avec notre IA. Simulation de l'entretien et feedback immédiat.",
      badge: "Coach Vocal",
      color: "bg-blue-500",
      light: "bg-blue-50",
      text: "text-blue-600"
    },
    {
      title: "Expression Écrite",
      icon: PenTool,
      path: "entrainement",
      desc: "Mode Zen : Rédigez les tâches 1, 2 et 3 sans pression avec correction.",
      badge: "Entraînement",
      color: "bg-orange-500",
      light: "bg-orange-50",
      text: "text-orange-600"
    },
    {
      title: "Mode Examen",
      icon: Timer,
      path: "examen",
      desc: "Conditions réelles : 3 tâches, 60 minutes chrono.",
      badge: "Session Officielle",
      color: "bg-slate-900",
      light: "bg-slate-100",
      text: "text-slate-900"
    },
  ];

  const handleClick = (path: string) => {
    // Seul Expression Écrite est soumis au blocage quotidien
    if (path === "entrainement" && blocked["entrainement"]) {
      setShowModal("entrainement");
      return;
    }
    // Pour oral et examen : navigation directe sans marquage
    router.push(`/tcf-canada/simulateur/${path}`);
  };

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans pb-24 md:pb-12 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60">
        <div className="nexa-student-shell py-3 md:py-4 flex items-center gap-3 md:gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-white border border-orange-200 grid place-items-center hover:bg-orange-50 active:scale-95 transition shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-800 stroke-[1.8]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] xl:text-xs font-black uppercase tracking-[0.2em] text-orange-600 mb-0.5">
              NEXA Intelligence Engine
            </p>
            <h1 className={`${STUDENT_TEXT.pageTitle} leading-tight truncate`} style={{ color: BRAND.blue }}>
              Simulateur <span className="text-orange-600">TCF Canada</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="nexa-student-shell pt-6 md:pt-10 xl:pt-12">
        
        {/* Banner Desktop */}
        <div className="hidden md:flex items-center justify-between bg-slate-900 rounded-[2rem] xl:rounded-[2.5rem] p-8 xl:p-12 mb-8 xl:mb-10 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 blur-[80px] rounded-full -mr-20 -mt-20" />
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-orange-500 w-5 h-5" />
              <span className="text-xs xl:text-sm font-black uppercase tracking-widest text-orange-500">Préparez-vous à l'excellence</span>
            </div>
            <h2 className={`${STUDENT_TEXT.sectionTitle} mb-4 tracking-tighter`}>Maîtrisez les épreuves <br/>en conditions réelles.</h2>
            <p className="text-slate-400 font-medium leading-relaxed text-sm xl:text-base">
              Utilisez le Mode Zen pour perfectionner vos structures, puis défiez le chronomètre avec nos sujets d'examen officiels.
            </p>
          </div>
          <div className="relative z-10 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-center">
            <Award className="w-12 h-12 text-orange-500 mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Précision de correction</p>
            <p className="text-2xl font-black text-white tracking-tighter">98.4%</p>
          </div>
        </div>

        {/* Mobile Info Tag */}
        <div className="md:hidden bg-orange-50 rounded-2xl border border-orange-100 px-5 py-4 mb-6 flex items-center gap-3 shadow-sm">
          <Zap className="w-5 h-5 text-orange-600 shrink-0" />
          <p className="text-xs text-neutral-700 font-bold leading-snug">
            Chaque tâche est accessible <span className="text-orange-600">une seule fois par jour</span>. Elle se débloque automatiquement demain.
          </p>
        </div>

        {/* Info desktop */}
        <div className="hidden md:flex items-center gap-2 mb-6 bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3">
          <Clock className="w-4 h-4 text-orange-500 shrink-0" />
          <p className="text-xs text-orange-700 font-bold">
            Chaque tâche est accessible <span className="font-black">une seule fois par jour</span> — elle se débloque automatiquement à minuit.
          </p>
        </div>

        {/* GRILLE DES MODES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 xl:gap-8">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isBlocked = blocked[item.path];

            return (
              <motion.button
                key={i}
                whileHover={{ y: isBlocked ? 0 : -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleClick(item.path)}
                className={`group relative w-full text-left rounded-[2rem] xl:rounded-[2.5rem] border shadow-sm transition-all duration-300 p-5 sm:p-6 md:p-8 xl:p-10 flex flex-col h-full min-h-[280px] ${
                  isBlocked
                    ? "bg-slate-100 border-slate-200 opacity-70 cursor-not-allowed"
                    : "bg-white border-neutral-200 hover:shadow-2xl hover:border-orange-200"
                }`}
              >
                {/* Icône & Badge */}
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] ${isBlocked ? "bg-slate-200" : item.light} border border-neutral-100 flex items-center justify-center transition-transform duration-500 ${!isBlocked && "group-hover:scale-110"}`}>
                    {isBlocked
                      ? <Lock className="w-7 h-7 text-slate-400" />
                      : <Icon className={`w-7 h-7 md:w-8 md:h-8 ${item.text} stroke-[2]`} />
                    }
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${
                    isBlocked
                      ? "text-slate-400 bg-slate-200 border-slate-300"
                      : `${item.text} ${item.light} border-neutral-100`
                  }`}>
                    {isBlocked ? "Complété" : item.badge}
                  </span>
                </div>

                {/* Texte */}
                <div className="flex-1">
                  <h3 className={`${STUDENT_TEXT.cardTitle} leading-tight mb-3 transition-colors ${
                    isBlocked ? "text-neutral-400" : "group-hover:opacity-90"
                  }`} style={isBlocked ? undefined : { color: BRAND.blue }}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">
                    {item.desc}
                  </p>
                  {isBlocked && (
                    <div className="flex items-center gap-2 bg-slate-200 rounded-xl px-3 py-2 w-fit">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-black text-slate-500">
                        Disponible dans {unlockIn[item.path]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bouton bas de carte */}
                <div className={`pt-6 border-t border-slate-100 flex items-center justify-between transition-colors ${
                  isBlocked ? "text-slate-300" : "text-slate-300 group-hover:text-orange-600"
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {isBlocked ? "Revenir demain" : "Accéder au simulateur"}
                  </span>
                  {isBlocked
                    ? <Lock className="w-4 h-4" />
                    : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  }
                </div>

                {/* Effet décoratif */}
                {!isBlocked && (
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] opacity-40">
            NEXA Neural Engine • Processing v2.6.0
          </p>
        </div>
      </main>

      {/* MODAL BLOQUÉ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Lock className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className={`${STUDENT_TEXT.cardTitle} mb-2`} style={{ color: BRAND.blue }}>Tâche complétée aujourd'hui</h3>
            <p className="text-sm text-slate-500 font-medium mb-2 leading-relaxed">
              Vous avez déjà effectué cette tâche aujourd'hui. Elle se débloquera automatiquement demain à minuit.
            </p>
            <div className="flex items-center justify-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 mb-6">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-black text-orange-600">
                Disponible dans {unlockIn[showModal]}
              </span>
            </div>
            <button
              onClick={() => setShowModal(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              Compris !
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}