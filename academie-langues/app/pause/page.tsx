"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CirclePause, GraduationCap, LogOut, MessageCircle } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function PackPausedPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_paused_at")
        .eq("id", session.user.id)
        .single();
      if (!profile?.subscription_paused_at) router.replace("/dashboard");
    };

    void checkStatus();
    const interval = window.setInterval(checkStatus, 15000);
    return () => window.clearInterval(interval);
  }, [router]);

  const handleContact = () => {
    const message = encodeURIComponent(t("auth", "pauseWhatsappMessage"));
    window.open(`https://wa.me/+237683375069?text=${message}`, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-5 py-12">
      <div className="flex items-center gap-2 mb-10">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-black text-lg tracking-tight">NEXA</span>
      </div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
          <CirclePause className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">{t("auth", "pauseTitle")}</h1>
        <p className="text-neutral-400 text-sm leading-relaxed mb-4">
          {t("auth", "pauseDescription1")}
        </p>
        <p className="text-neutral-500 text-sm leading-relaxed mb-8">
          {t("auth", "pauseDescription2")}
        </p>

        <button onClick={handleContact} className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-4 rounded-2xl transition-all mb-3">
          <MessageCircle className="w-5 h-5" /> {t("auth", "pauseContactButton")}
        </button>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 text-sm font-semibold py-3 rounded-2xl transition-colors">
          <LogOut className="w-4 h-4" /> {t("auth", "pauseLogoutButton")}
        </button>
      </div>
    </div>
  );
}
