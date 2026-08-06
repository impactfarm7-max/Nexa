"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function LanguageSwitcher({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "fr" ? "en" : "fr";
  const label = next === "fr" ? t("common", "french") : t("common", "english");

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-wide transition ${dark ? "border-white/15 bg-white/10 text-white hover:bg-white/15" : "border-black/10 bg-white text-neutral-700 hover:border-black/20"}`}
      aria-label={`${t("common", "language")}: ${label}`}
      title={label}
    >
      <Languages className="h-4 w-4" aria-hidden />
      {!compact && <span>{locale.toUpperCase()}</span>}
    </button>
  );
}
