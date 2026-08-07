export type CenterSignupRef = {
  signup_slug?: string | null;
  code?: string | null;
};

/** Référence utilisée dans l'URL d'inscription (signup_slug prioritaire, sinon code centre). */
export function getCenterSignupRef(center: CenterSignupRef | null | undefined): string | null {
  if (!center) return null;
  const ref = String(center.signup_slug || center.code || "").trim();
  return ref || null;
}

/** URL complète d'inscription étudiant pour un centre. */
export function buildCenterSignupUrl(
  origin: string,
  center: CenterSignupRef | null | undefined,
  locale?: "fr" | "en",
): string | null {
  const ref = getCenterSignupRef(center);
  if (!ref) return null;
  const param = center?.signup_slug ? "centre" : "centerCode";
  const languageParam = locale ? `&lang=${locale}` : "";
  return `${origin}/login?signup=1&${param}=${encodeURIComponent(ref)}${languageParam}`;
}
