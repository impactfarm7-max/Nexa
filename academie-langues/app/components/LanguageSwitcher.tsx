"use client";

import { useI18n } from "@/app/i18n/I18nProvider";

export default function LanguageSwitcher({ dark = false }: { compact?: boolean; dark?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const inactiveClass = dark ? "text-white/45 hover:text-white" : "text-neutral-400 hover:text-neutral-700";
  const activeClass = "text-red-500";

  return (
    <div
      className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-black uppercase tracking-wide"
      role="group"
      aria-label={t("common", "language")}
    >
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`transition-colors ${locale === "fr" ? activeClass : inactiveClass}`}
        aria-pressed={locale === "fr"}
        title={t("common", "french")}
      >
        FR
      </button>
      <span className={dark ? "text-white/25" : "text-neutral-300"} aria-hidden>|</span>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`transition-colors ${locale === "en" ? activeClass : inactiveClass}`}
        aria-pressed={locale === "en"}
        title={t("common", "english")}
      >
        EN
      </button>
    </div>
  );
}
