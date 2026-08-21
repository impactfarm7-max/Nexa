"use client";

import { Building2, Eye, EyeOff, Globe, Lock, Mail, MapPin, ArrowRight } from "lucide-react";
import type { SignupCountry } from "../data/signup-countries";
import type { useI18n } from "@/app/i18n/I18nProvider";

type TFunc = ReturnType<typeof useI18n>["t"];

export type LinkedCenter = {
  id: string;
  name: string;
  code: string;
  programName?: string | null;
};

type SignupFormProps = {
  t: TFunc;
  formTitle: string;
  formSubtitle: string;
  fieldWrap: string;
  fieldInput: string;
  fieldStandalone: string;
  ORANGE: string;
  BLUE: string;
  loading: boolean;
  handleSignup: (e: React.FormEvent) => void | Promise<void>;

  prenom: string;
  setPrenom: (v: string) => void;
  nom: string;
  setNom: (v: string) => void;

  countries: SignupCountry[];
  countryCode: string;
  setCountryCode: (v: string) => void;
  selectedCountry: SignupCountry | undefined;

  phone: string;
  setPhone: (v: string) => void;
  ville: string;
  setVille: (v: string) => void;
  age: string;
  setAge: (v: string) => void;

  email: string;
  setEmail: (v: string) => void;

  centerLinkLabel: string | null;
  linkedCenter: LinkedCenter | null;
  centerCode: string;
  setCenterCode: (v: string) => void;
  setCenterLinkLabel: (v: string | null) => void;

  showSignupPassword: boolean;
  setShowSignupPassword: (updater: (prev: boolean) => boolean) => void;
  password: string;
  setPassword: (v: string) => void;

  acceptCGU: boolean;
  setAcceptCGU: (v: boolean) => void;

  onSwitchToLogin: () => void;
};

export default function SignupForm({
  t,
  formTitle,
  formSubtitle,
  fieldWrap,
  fieldInput,
  fieldStandalone,
  ORANGE,
  BLUE,
  loading,
  handleSignup,
  prenom,
  setPrenom,
  nom,
  setNom,
  countries,
  countryCode,
  setCountryCode,
  selectedCountry,
  phone,
  setPhone,
  ville,
  setVille,
  age,
  setAge,
  email,
  setEmail,
  centerLinkLabel,
  linkedCenter,
  centerCode,
  setCenterCode,
  setCenterLinkLabel,
  showSignupPassword,
  setShowSignupPassword,
  password,
  setPassword,
  acceptCGU,
  setAcceptCGU,
  onSwitchToLogin,
}: SignupFormProps) {
  return (
    <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
      <div>
        <h2 className={formTitle}>{t("auth", "loginCreateAccount")}</h2>
        <p className={formSubtitle}>{t("auth", "loginCompleteInfoBelow")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          required
          placeholder={t("auth", "loginFirstNamePlaceholder")}
          className={fieldStandalone}
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
        />
        <input
          required
          placeholder={t("auth", "loginLastNamePlaceholder")}
          className={fieldStandalone}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
      </div>

      <div className={fieldWrap}>
        <div className="pl-3 text-slate-400"><Globe className="h-4 w-4" /></div>
        <select
          required
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className={`${fieldInput} cursor-pointer`}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className={fieldWrap}>
        <span className="shrink-0 pl-3 text-sm font-semibold text-slate-500">
          {selectedCountry?.phone_code || "+"}
        </span>
        <input
          required
          type="tel"
          placeholder={t("auth", "loginPhonePlaceholder")}
          className={fieldInput}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
        />
      </div>

      <div className={fieldWrap}>
        <div className="pl-3 text-slate-400"><MapPin className="h-4 w-4" /></div>
        <input
          required
          placeholder={t("auth", "loginCityPlaceholder")}
          className={fieldInput}
          value={ville}
          onChange={(e) => setVille(e.target.value)}
        />
      </div>

      <input
        required
        type="number"
        min={10}
        max={99}
        placeholder={t("auth", "loginAgePlaceholder")}
        className={fieldStandalone}
        value={age}
        onChange={(e) => setAge(e.target.value)}
      />

      <div className={fieldWrap}>
        <div className="pl-3 text-slate-400"><Mail className="h-4 w-4" /></div>
        <input
          required
          type="email"
          placeholder={t("auth", "loginEmailPlaceholder")}
          className={fieldInput}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {!centerLinkLabel && !linkedCenter && (
        <div className={fieldWrap}>
          <div className="pl-3 text-slate-400"><Building2 className="h-4 w-4" /></div>
          <input
            type="text"
            placeholder={t("auth", "loginCenterCodePlaceholder")}
            className={`${fieldInput} uppercase`}
            value={centerCode}
            onChange={(e) => {
              setCenterLinkLabel(null);
              setCenterCode(e.target.value.toUpperCase());
            }}
          />
        </div>
      )}

      <div className={`${fieldWrap} relative`}>
        <div className="pl-3 text-slate-400"><Lock className="h-4 w-4" /></div>
        <input
          required
          type={showSignupPassword ? "text" : "password"}
          placeholder={t("auth", "loginPasswordExamplePlaceholder")}
          className={`${fieldInput} pr-12 ${!showSignupPassword && password.length > 0 ? "tracking-widest" : ""}`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowSignupPassword((prev) => !prev)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500"
        >
          {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="px-1 text-[10px] font-medium leading-relaxed text-slate-400">
        {t("auth", "loginPasswordPolicyHint")}
      </p>

      <label className="flex cursor-pointer items-start gap-3 select-none">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={acceptCGU}
            onChange={(e) => setAcceptCGU(e.target.checked)}
          />
          <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-slate-200 bg-white transition-all peer-checked:border-orange-500 peer-checked:bg-orange-500">
            {acceptCGU && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-[11px] font-medium leading-relaxed text-slate-500">
          {t("auth", "loginAcceptThe")}{" "}
          <a href="/cgu" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: ORANGE }} onClick={(e) => e.stopPropagation()}>
            {t("auth", "loginCguLabel")}
          </a>{" "}
          {t("auth", "loginAndThe")}{" "}
          <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: ORANGE }} onClick={(e) => e.stopPropagation()}>
            {t("auth", "loginPrivacyPolicyLabel")}
          </a>.
        </span>
      </label>

      <button
        disabled={loading || !acceptCGU}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: ORANGE }}
      >
        {loading ? t("auth", "loginCreatingAccount") : t("auth", "loginCreateMyAccount")}
        {!loading && <ArrowRight size={16} />}
      </button>

      <p className="pt-2 text-center text-sm font-medium text-slate-500">
        {t("auth", "loginAlreadyHaveAccount")}{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-black hover:underline"
          style={{ color: BLUE }}
        >
          {t("auth", "loginSignIn")}
        </button>
      </p>
    </form>
  );
}
