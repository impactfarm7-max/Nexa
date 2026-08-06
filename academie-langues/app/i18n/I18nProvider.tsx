"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Locale, MessageNamespace, messages } from "./messages";

const STORAGE_KEY = "nexa_locale";
const COOKIE_NAME = "nexa_locale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setLocaleOverride: (locale: Locale | null) => void;
  t: (namespace: MessageNamespace, key: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "fr" || stored === "en") return stored;
  const cookie = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))?.[1];
  if (cookie === "fr" || cookie === "en") return cookie;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("fr");
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const effectiveLocale = localeOverride ?? locale;

  useEffect(() => updateLocale(initialLocale()), []);

  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.cookie = `${COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;
  }, []);

  useEffect(() => {
    document.documentElement.lang = effectiveLocale;
  }, [effectiveLocale]);

  const t = useCallback((namespace: MessageNamespace, key: string, values?: Record<string, string | number>) => {
    const dictionary = messages[effectiveLocale][namespace] as Record<string, string>;
    const template = dictionary[key] ?? key;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, token: string) =>
      values[token] === undefined ? match : String(values[token]),
    );
  }, [effectiveLocale]);

  const value = useMemo(() => ({ locale: effectiveLocale, setLocale, setLocaleOverride, t }), [effectiveLocale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
