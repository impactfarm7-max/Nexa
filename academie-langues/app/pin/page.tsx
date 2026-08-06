"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, AlertTriangle, ShieldCheck, Fingerprint } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function PinPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/dashboard";
    return window.localStorage.getItem("iag_pin_next") || "/dashboard";
  }, []);

  useEffect(() => {
    // Vérifier que l'utilisateur est connecté, sinon rediriger vers onboarding
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/onboarding");
    });
  }, [router]);

  const unlock = async () => {
    setErr(null);

    if (pin.length !== 4) {
      setErr(t("auth", "pinCodeMustBe4Digits"));
      return;
    }

    // Vérification du lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000 / 60);
      setErr(`${t("auth", "pinTooManyAttempts")} ${remaining} ${t("auth", "pinMinutesSuffix")}`);
      setPin("");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/onboarding");
        return;
      }

      // Vérification du PIN côté serveur (PBKDF2, pas de hash localStorage)
      const verifyRes = await fetch("/api/pin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pin }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.valid) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");
        if (newAttempts >= 3) {
          const until = Date.now() + 5 * 60 * 1000;
          setLockedUntil(until);
          setAttempts(0);
          setErr(t("auth", "pinLockedAfterAttempts"));
        } else {
          setErr(`${t("auth", "pinIncorrectCode")} ${3 - newAttempts} ${t("auth", "pinAttemptsRemaining")}`);
        }
        return;
      }

      // ✅ PIN correct — vérification limite appareils
      window.localStorage.setItem("iag_locked", "0");
      window.localStorage.setItem("iag_last_active", String(Date.now()));
      window.localStorage.removeItem("iag_pin_next");

      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session: pinSession } } = await supabase.auth.getSession();

      if (user && pinSession?.access_token) {
        const res = await fetch("/api/sessions/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pinSession.access_token}`,
          },
          body: JSON.stringify({
            device: navigator.userAgent,
            ip: "",
          }),
        });

        const result = await res.json();

        if (result.limitReached) {
          router.replace("/login?reason=device_limit");
          return;
        }

        localStorage.setItem("session_token", result.token);
      }

      setAttempts(0);
      setLockedUntil(null);
      router.replace(nextPath);

    } catch {
      setErr(t("auth", "pinSystemError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      
      <section className="hidden lg:flex lg:w-1/2 bg-slate-950 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-600/10 via-transparent to-transparent opacity-60" />
        
        <div className="relative z-10 max-w-md text-left">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-10 shadow-2xl">
             <Fingerprint className="w-8 h-8 text-orange-500" />
          </div>
          
          <h2 className="text-4xl font-black text-white leading-tight mb-6">
            {t("auth", "pinHeroTitlePart1")} <span className="text-orange-500">{t("auth", "pinHeroTitlePart2")}</span>
          </h2>
          <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
            {t("auth", "pinHeroDescription")}
          </p>

          <div className="flex items-center gap-3 py-3 px-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl w-fit">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span className="text-orange-500 text-sm font-bold tracking-wide uppercase">{t("auth", "pinEncryptionActive")}</span>
          </div>
        </div>
      </section>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-sm">
          
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 rounded-[1.5rem] bg-orange-50 border border-orange-100 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-orange-600 stroke-[1.8]" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              {t("auth", "pinLockedSpaceTitle")}
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium italic">
              {t("auth", "pinEnterCode")}
            </p>
          </div>

          <div className="bg-white border border-slate-100 lg:border-none rounded-[2.5rem] p-8 lg:p-0 shadow-[0_20px_60px_rgba(0,0,0,0.06)] lg:shadow-none">
            <label className="block text-[11px] font-black uppercase text-orange-600 mb-4 text-center tracking-widest">
              {t("auth", "pinUnlockCodeLabel")}
            </label>

            <input
              autoFocus
              inputMode="numeric"
              maxLength={4}
              placeholder="• • • •"
              className={`w-full h-20 bg-slate-50 border rounded-2xl px-4 outline-none font-black text-center text-4xl tracking-[0.4em] transition-all shadow-inner ${
                err
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-slate-100 focus:border-orange-500 text-slate-900"
              }`}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") unlock();
              }}
            />

            {err && (
              <div className="mt-4 text-[11px] text-red-600 font-bold flex items-center justify-center gap-2 animate-bounce">
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                {err}
              </div>
            )}

            <div className="space-y-4 mt-10">
              <button
                onClick={unlock}
                disabled={loading || pin.length !== 4 || (lockedUntil !== null && Date.now() < lockedUntil)}
                className="w-full h-16 rounded-[1.5rem] bg-slate-950 text-white font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-950/20 disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {loading
                  ? t("auth", "pinVerifying")
                  : lockedUntil && Date.now() < lockedUntil
                  ? t("auth", "pinLocked")
                  : t("auth", "pinUnlock")}
              </button>

              <button
                onClick={() => router.replace("/dashboard")}
                className="w-full h-14 rounded-2xl bg-white border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("auth", "pinExitSpace")}
              </button>
            </div>
          </div>

          <p className="mt-12 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center opacity-40">
            {t("auth", "pinFooter")}
          </p>
        </div>
      </section>

    </div>
  );
}