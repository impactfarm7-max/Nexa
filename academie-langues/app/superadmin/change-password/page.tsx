"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { checkPasswordStrength, PASSWORD_POLICY_HINT } from "@/app/utils/password-policy";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function SuperadminChangePasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const strength = checkPasswordStrength(password);
    if (!strength.ok) {
      setError(strength.message || PASSWORD_POLICY_HINT);
      return;
    }
    if (password !== confirm) {
      setError(t("superadmin", "changePasswordMismatch"));
      return;
    }

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: pwdError } = await supabase.auth.updateUser({ password });
      if (pwdError) {
        setError(pwdError.message);
        setBusy(false);
        return;
      }

      await supabase
        .from("profiles")
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace("/superadmin/dashboard");
        return;
      }
      // Pas encore de MFA vérifié → configuration ; sinon retour login pour le challenge TOTP.
      if (aal?.nextLevel !== "aal2") {
        router.replace("/superadmin/mfa-setup");
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("superadmin", "changePasswordError"));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-black text-white">{t("superadmin", "changePasswordTitle")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("superadmin", "changePasswordSubtitle")}</p>

        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "changePasswordNew")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "changePasswordConfirm")}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          <p className="text-[11px] text-slate-500">{PASSWORD_POLICY_HINT}</p>
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {t("superadmin", "changePasswordSave")}
          </button>
        </form>
      </div>
    </div>
  );
}
