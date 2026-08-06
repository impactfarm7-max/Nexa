"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase"; 
import { ShieldCheck, UserCheck, CheckCircle, Lock } from "lucide-react";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function Onboarding() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [showTrialWelcome, setShowTrialWelcome] = useState(false);

  // PIN + confirmation UNIQUEMENT
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");

  const canSubmit = useMemo(() => {
    return (
      pin.length === 4 &&
      pin2.length === 4 &&
      pin === pin2
    );
  }, [pin, pin2]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;

      if (!u) {
        router.replace("/login");
        return;
      }

      setUser(u);
    };

    getUser();
  }, [router]);

  useEffect(() => {
    const storedTrialEndsAt = localStorage.getItem("nexa_trial_welcome");
    if (!storedTrialEndsAt) return;
    setTrialEndsAt(storedTrialEndsAt);
    setShowTrialWelcome(true);
  }, []);

  const closeTrialWelcome = () => {
    localStorage.removeItem("nexa_trial_welcome");
    setShowTrialWelcome(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1) Hacher et sauvegarder le PIN via l'API sécurisée (PBKDF2 côté serveur)
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/pin/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || t("auth", "onboardingPinSaveError"));
      }

      // 2) Mettre à jour les métadonnées pour marquer l'onboarding comme terminé
      const { error: updError } = await supabase.auth.updateUser({
        data: { onboarding_done: true },
      });
      if (updError) throw updError;

      // 3) Préparer le "Laissez-passer" pour cette session dans le téléphone
      if (typeof window !== "undefined") {
        sessionStorage.setItem("is_unlocked", "true");
        localStorage.setItem("last_active_date", new Date().toISOString());
      }

      // 🎯 REDIRECTION VERS LA PAGE CHOIX
      router.replace("/choix");
      
    } catch (error: any) {
      alert(t("auth", "onboardingGenericError") + (error?.message ?? t("auth", "onboardingUnknownError")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {showTrialWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-950">{t("auth", "onboardingTrialTitle")}</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              {t("auth", "onboardingTrialDescription")}
            </p>
            <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-orange-700">
              {t("auth", "onboardingTrialEndLabel")} {trialEndsAt ? new Date(trialEndsAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US") : t("auth", "onboardingTrialEndDefault")}
            </p>
            <button
              type="button"
              onClick={closeTrialWelcome}
              className="mt-6 h-14 w-full rounded-2xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-orange-600"
            >
              {t("auth", "onboardingTrialStartButton")}
            </button>
          </div>
        </div>
      )}
      
      {/* 💻 CÔTÉ GAUCHE : VISIBLE UNIQUEMENT SUR PC (lg:flex) */}
      <section className="hidden lg:flex lg:w-1/2 bg-slate-950 relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-transparent opacity-50" />
        
        <div className="relative z-10 max-w-md">
          <img
            src={BRAND.logo}
            alt="NEXA"
            className="w-16 h-16 rounded-2xl mb-10 shadow-xl object-cover"
          />
          
          <h2 className="text-4xl font-black text-white leading-tight mb-8">
            {t("auth", "onboardingHeroTitlePrefix")} <span className="text-orange-500">{t("auth", "onboardingHeroTitleHighlight")}</span>
          </h2>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
                <ShieldCheck className="text-orange-500 w-5 h-5" />
              </div>
              <p className="text-slate-400 font-medium">{t("auth", "onboardingFeaturePin")}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
                <UserCheck className="text-orange-500 w-5 h-5" />
              </div>
              <p className="text-slate-400 font-medium">{t("auth", "onboardingFeatureProfile")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 📱 CÔTÉ DROIT : LE FORMULAIRE (PC et Mobile) */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          
          {/* Header Mobile */}
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 rounded-[1.5rem] bg-orange-50 border border-orange-100 flex items-center justify-center lg:hidden">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="mt-6 text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {t("auth", "onboardingFormTitle")}
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {t("auth", "onboardingFormSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border-slate-100 lg:border-none rounded-[2.5rem] p-0 lg:p-0 shadow-none">
            
            {/* Sécurité PIN */}
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-black uppercase text-orange-600 mb-2 block text-center tracking-widest">{t("auth", "onboardingPinLabel")}</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("auth", "onboardingPinPlaceholder")}
                  className="w-full h-16 bg-slate-50 border border-orange-200 rounded-2xl px-4 outline-none focus:border-orange-500 font-black text-center text-3xl tracking-[0.4em] text-slate-900 shadow-inner"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 mb-2 block text-center tracking-widest">{t("auth", "onboardingConfirmLabel")}</label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={4}
                  placeholder={t("auth", "onboardingPinPlaceholder")}
                  className={`w-full h-16 bg-slate-50 border rounded-2xl px-4 outline-none font-black text-center text-3xl tracking-[0.4em] text-slate-900 transition-all ${
                    pin2.length === 4 && pin !== pin2 ? "border-red-300 bg-red-50" : "border-slate-100 focus:border-orange-500"
                  }`}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                />
                {pin2.length === 4 && pin !== pin2 && (
                  <p className="text-[10px] text-center text-red-500 font-black mt-3 animate-pulse">{t("auth", "onboardingPinMismatch")}</p>
                )}
              </div>
            </div>

            <button
              disabled={loading || !canSubmit}
              className="w-full h-16 rounded-[1.5rem] bg-slate-950 text-white font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl disabled:opacity-30 disabled:grayscale mt-10 flex items-center justify-center gap-3"
            >
              {loading ? t("auth", "onboardingSubmitLoading") : (
                <>
                  {t("auth", "onboardingSubmitButton")} <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-12 text-[10px] text-slate-300 font-bold uppercase tracking-widest text-center">
            {t("auth", "onboardingFooter")}
          </p>
        </div>
      </section>

    </div>
  );
}
