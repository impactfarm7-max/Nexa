"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, MessageCircle, GraduationCap, LogOut, CheckCircle2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";

export default function TerminePage() {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
      }
    };

    check();
  }, [router]);

  const handleContact = () => {
    const msg = encodeURIComponent(
      "Bonjour NEXA, ma formation est terminée. Je souhaite continuer ma préparation. Pouvez-vous m'aider ?"
    );
    window.open(`https://wa.me/+237683375069?text=${msg}`, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/8 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 blur-[100px] rounded-full -ml-24 -mb-24 pointer-events-none" />

      <div className="flex items-center gap-2 mb-10 z-10">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-black text-lg tracking-tight">NEXA</span>
      </div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm z-10">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-5">
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>

        <h1 className="text-2xl font-black text-white mb-3">Formation terminée</h1>
        <p className="text-neutral-400 text-sm leading-relaxed mb-7">
          Félicitations ! Ta formation NEXA est arrivée à son terme. Nous espérons que
          cette préparation t'a bien aidé pour le TCF Canada.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3">
            Tu souhaites aller plus loin ?
          </p>
          {[
            "Renouveler ton accès à la plateforme",
            "Passer à une formation supérieure",
            "Préparer une nouvelle session TCF",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-sm text-neutral-300 font-medium">{item}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleContact}
          className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 mb-3"
        >
          <MessageCircle className="w-5 h-5" />
          Contacter NEXA
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
