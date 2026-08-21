"use client";

import { Mail } from "lucide-react";
import type { useI18n } from "@/app/i18n/I18nProvider";

type TFunc = ReturnType<typeof useI18n>["t"];

type ResetPasswordStepProps = {
  t: TFunc;
  formTitle: string;
  formSubtitle: string;
  fieldWrap: string;
  fieldInput: string;
  ORANGE: string;
  loading: boolean;
  handleResetPwd: (e: React.FormEvent) => void | Promise<void>;
  email: string;
  setEmail: (v: string) => void;
  onBackToLogin: () => void;
};

export default function ResetPasswordStep({
  t,
  formTitle,
  formSubtitle,
  fieldWrap,
  fieldInput,
  ORANGE,
  loading,
  handleResetPwd,
  email,
  setEmail,
  onBackToLogin,
}: ResetPasswordStepProps) {
  return (
    <form onSubmit={handleResetPwd} className="space-y-5">
      <div>
        <h2 className={formTitle}>{t("auth", "loginForgotPasswordTitle")}</h2>
        <p className={formSubtitle}>{t("auth", "loginResetLinkDesc")}</p>
      </div>

      <div className={fieldWrap}>
        <div className="pl-3 text-slate-400"><Mail className="h-5 w-5" /></div>
        <input
          required
          type="email"
          placeholder={t("auth", "loginEmailPlaceholder")}
          className={fieldInput}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        disabled={loading}
        className="flex h-[52px] w-full items-center justify-center rounded-2xl text-sm font-black text-white transition-all hover:opacity-95 disabled:opacity-50"
        style={{ backgroundColor: ORANGE }}
      >
        {loading ? t("auth", "loginSendingInProgress") : t("auth", "loginSendResetLink")}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
      >
        {t("auth", "loginBackToLogin")}
      </button>
    </form>
  );
}
