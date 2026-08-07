export function localizeCountryName(code: string, fallback: string, locale: string): string {
  if (locale !== "en") return fallback;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || fallback;
  } catch {
    return fallback;
  }
}
