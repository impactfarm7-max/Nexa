"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, MessageCircle, GraduationCap, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/app/utils/supabase";

export default function PaywallPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("prenom, role, subscription_ends_at")
        .eq("id", session.user.id)
        .single();
      if (profile?.role === "admin") { router.replace("/dashboard"); return; }
      const isPremium = profile?.subscription_ends_at && new Date(profile.subscription_ends_at).getTime() > Date.now();
      if (isPremium) { router.replace("/dashboard"); return; }
      if (profile?.prenom) setPrenom(profile.prenom);
    };
    load();
  }, [router]);

  const handleContact = () => {
    const msg = encodeURIComponent("Bonjour NEXA, ma periode d'essai de 24 heures est terminee. Je souhaite effectuer un achat pour continuer a utiliser l'application. Pouvez-vous m'aider ?");
    window.open(`https://wa.me/237683375069?text=${msg}`, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">

      {/* Décorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 blur-[100px] rounded-full -ml-24 -mb-24 pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 z-10">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-black text-lg tracking-tight">NEXA</span>
      </div>

      {/* Carte principale */}
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm z-10">

        {/* Icône cadenas */}
        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-orange-400" />
        </div>

        <h1 className="text-2xl font-black text-white mb-2">
          {prenom ? `${prenom}, ta` : "Ta"} période d'essai est terminée
        </h1>
        <p className="text-neutral-400 text-sm leading-relaxed mb-7">
          Tu as utilise tes 24 heures d'essai gratuit. Pour continuer ta preparation au TCF Canada, effectue un achat afin d'activer ton acces premium.
        </p>

        {/* Ce que tu obtiens */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3">Avec l'accès premium</p>
          {[
            "40 séries de Compréhension Écrite",
            "40 séries de Compréhension Orale",
            "Simulateurs Expression Écrite & Orale",
            "Corrections IA détaillées illimitées",
            "Suivi de progression par compte",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-sm text-neutral-300 font-medium">{item}</span>
            </div>
          ))}
        </div>

        {/* Bouton WhatsApp */}
        <button
          onClick={handleContact}
          className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 mb-3"
        >
          <MessageCircle className="w-5 h-5" />
          Effectuer un achat
        </button>

        {/* Retour dashboard */}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          <GraduationCap className="w-4 h-4" />
          Retour au dashboard
        </button>
      </div>

      {/* Mention durée d'essai */}
      <div className="flex items-center gap-2 mt-6 z-10">
        <Clock className="w-3.5 h-3.5 text-neutral-600" />
        <p className="text-[11px] text-neutral-600 font-medium">Essai gratuit de 24 heures inclus a l'inscription</p>
      </div>
    </div>
  );
}
