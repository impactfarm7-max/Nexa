"use client";

import { ArrowRight, Lock } from "lucide-react";
import type { useI18n } from "@/app/i18n/I18nProvider";

type TFunc = ReturnType<typeof useI18n>["t"];

type SuperadminMfaStepProps = {
  t: TFunc;
  formTitle: string;
  formSubtitle: string;
  fieldWrap: string;
  fieldInput: string;
  BLUE: string;
  handleVerifySuperadminMfa: (e: React.FormEvent) => void | Promise<void>;
  mfaVerifying: boolean;
  mfaCode: string;
  setMfaCode: (v: string) => void;
  onCancel: () => void;
};

export default function SuperadminMfaStep({
  t,
  formTitle,
  formSubtitle,
  fieldWrap,
  fieldInput,
  BLUE,
  handleVerifySuperadminMfa,
  mfaVerifying,
  mfaCode,
  setMfaCode,
  onCancel,
}: SuperadminMfaStepProps) {
  return (
    <form onSubmit={handleVerifySuperadminMfa} className="space-y-5">
      <div>
        <h2 className={formTitle}>{t("auth", "loginTwoStepVerification")}</h2>
        <p className={formSubtitle}>
          {t("auth", "loginEnterMfaCode")}
        </p>
      </div>

      <div className={fieldWrap}>
        <div className="pl-3 text-slate-400"><Lock className="h-5 w-5" /></div>
        <input
          required
          autoFocus
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          className={`${fieldInput} tracking-[0.5em]`}
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>

      <button
        disabled={mfaVerifying || mfaCode.length !== 6}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
        style={{ backgroundColor: BLUE }}
      >
        {mfaVerifying ? t("auth", "loginVerifying") : t("auth", "loginValidate")}
        {!mfaVerifying && <ArrowRight size={16} />}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
      >
        {t("auth", "loginCancel")}
      </button>
    </form>
  );
}
