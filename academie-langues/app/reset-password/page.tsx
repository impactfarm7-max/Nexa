"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/utils/supabase";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { checkPasswordStrength, isPasswordStrong, PASSWORD_POLICY_HINT } from "@/app/utils/password-policy";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // 🧠 LE RADAR : On écoute le lien de l'e-mail pour débloquer la session
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const authError = hashParams.get("error");
    const errorCode = hashParams.get("error_code");

    if (authError || errorCode) {
      const resetError =
        errorCode === "otp_expired" ||
        hashParams.get("error_description")?.toLowerCase().includes("expired")
          ? "expired"
          : "invalid";

      router.replace(`/login?reset_error=${resetError}`);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          console.log("Lien de récupération détecté et validé !");
        }
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const pwdCheck = checkPasswordStrength(password);
    if (!pwdCheck.ok) {
      setErrorMsg(pwdCheck.message || PASSWORD_POLICY_HINT);
      return;
    }

    setLoading(true);

    // Mise à jour du mot de passe dans Supabase
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      // Si ça échoue, c'est souvent parce que le lien a expiré (durée de vie : 1h)
      setErrorMsg(t("auth", "resetLinkExpiredOrInvalid"));
    } else {
      setDone(true);
      // On le renvoie vers la page de connexion après 2 secondes
      setTimeout(() => router.push("/login"), 2000);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-in zoom-in duration-300" />
          <h1 className="text-2xl font-black text-slate-900">{t("auth", "resetPasswordUpdated")}</h1>
          <p className="text-slate-500 mt-2 font-medium">{t("auth", "resetRedirecting")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <form onSubmit={handleUpdate} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-orange-100">
          <Lock className="text-orange-500 w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{t("auth", "resetTitle")}</h1>
        <p className="text-sm text-slate-500 mb-8 font-medium">{t("auth", "resetSubtitle")}</p>

        <input
          required
          type="password"
          placeholder={t("auth", "resetPlaceholder")}
          className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 outline-none focus:border-orange-500 font-bold mb-2 text-sm placeholder:font-medium placeholder:text-slate-400 tracking-widest transition-all"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
          minLength={6}
          autoComplete="new-password"
        />
        <p className="mb-4 text-left text-[10px] font-medium leading-relaxed text-slate-400">{PASSWORD_POLICY_HINT}</p>
        {errorMsg && (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-left text-xs font-bold text-red-600">{errorMsg}</p>
        )}

        <button 
          disabled={loading || !isPasswordStrong(password)}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50 active:scale-95 flex justify-center items-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            t("auth", "resetSubmit")
          )}
        </button>
      </form>
    </div>
  );
}
