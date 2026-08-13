/** URL publique de la plateforme (emails, liens de connexion, view-as). */
export const PUBLIC_SITE_URL = "https://nexa-edu.com";

/**
 * Base URL pour les liens envoyés par e-mail / redirections.
 * Remappe l'ancien domaine nexa.fr si encore présent en env.
 */
export function getPublicSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || PUBLIC_SITE_URL).trim().replace(/\/$/, "");
  if (!raw) return PUBLIC_SITE_URL;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (u.hostname === "nexa.fr" || u.hostname === "www.nexa.fr") {
      return PUBLIC_SITE_URL;
    }
    return `${u.protocol}//${u.host}`;
  } catch {
    return PUBLIC_SITE_URL;
  }
}
