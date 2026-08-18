/**
 * Menus & droits de l'espace /superadmin.
 * is_owner → accès total (y compris gestion d'équipe).
 * Sinon → uniquement les clés listées dans `menus`.
 */

export const SUPERADMIN_MENU_KEYS = [
  "dashboard",
  "analytics",
  "alertes",
  "commercial",
  "finance",
  "centres",
  "effectifs",
  "etudiants",
  "offres",
  "support",
  "bibliotheque",
  "audit",
  "equipe",
] as const;

export type SuperadminMenuKey = (typeof SUPERADMIN_MENU_KEYS)[number];

/** Menus assignables à un superadmin non-owner (pas l'équipe). */
export const SUPERADMIN_ASSIGNABLE_MENUS: SuperadminMenuKey[] = SUPERADMIN_MENU_KEYS.filter(
  (k) => k !== "equipe",
);

export const SUPERADMIN_MENU_PATHS: Record<SuperadminMenuKey, string> = {
  dashboard: "/superadmin/dashboard",
  analytics: "/superadmin/analytics",
  alertes: "/superadmin/alertes",
  commercial: "/superadmin/commercial",
  finance: "/superadmin/finance",
  centres: "/superadmin/centres",
  effectifs: "/superadmin/effectifs",
  etudiants: "/superadmin/etudiants",
  offres: "/superadmin/offres",
  support: "/superadmin/support",
  bibliotheque: "/superadmin/bibliotheque",
  audit: "/superadmin/audit",
  equipe: "/superadmin/equipe",
};

const PATH_TO_MENU: { prefix: string; key: SuperadminMenuKey }[] = [
  { prefix: "/superadmin/dashboard", key: "dashboard" },
  { prefix: "/superadmin/analytics", key: "analytics" },
  { prefix: "/superadmin/alertes", key: "alertes" },
  { prefix: "/superadmin/commercial", key: "commercial" },
  { prefix: "/superadmin/finance", key: "finance" },
  { prefix: "/superadmin/centres", key: "centres" },
  { prefix: "/superadmin/effectifs", key: "effectifs" },
  { prefix: "/superadmin/etudiants", key: "etudiants" },
  { prefix: "/superadmin/offres", key: "offres" },
  { prefix: "/superadmin/support", key: "support" },
  { prefix: "/superadmin/bibliotheque", key: "bibliotheque" },
  { prefix: "/superadmin/audit", key: "audit" },
  { prefix: "/superadmin/equipe", key: "equipe" },
  { prefix: "/superadmin/demandes", key: "centres" },
];

export function isSuperadminMenuKey(value: unknown): value is SuperadminMenuKey {
  return typeof value === "string" && (SUPERADMIN_MENU_KEYS as readonly string[]).includes(value);
}

export function sanitizeSuperadminMenus(raw: unknown): SuperadminMenuKey[] {
  if (!Array.isArray(raw)) return [];
  const out: SuperadminMenuKey[] = [];
  for (const item of raw) {
    if (!isSuperadminMenuKey(item)) continue;
    if (item === "equipe") continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

export function menuKeyForPath(pathname: string | null | undefined): SuperadminMenuKey | null {
  if (!pathname || !pathname.startsWith("/superadmin")) return null;
  if (pathname === "/superadmin" || pathname === "/superadmin/") return "dashboard";
  if (pathname === "/superadmin/mfa-setup") return null;
  for (const entry of PATH_TO_MENU) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) return entry.key;
  }
  return null;
}

export type SuperadminAccess = {
  isOwner: boolean;
  menus: SuperadminMenuKey[];
  disabled: boolean;
};

/** Accès effectif : owner = tous les menus. */
export function resolveEffectiveMenus(access: SuperadminAccess | null | undefined): SuperadminMenuKey[] {
  if (!access || access.disabled) return [];
  if (access.isOwner) return [...SUPERADMIN_MENU_KEYS];
  const menus = access.menus.filter((m) => m !== "equipe");
  // Toujours laisser le dashboard si au moins un menu est accordé ? Non — respecter la sélection.
  return menus;
}

export function canAccessMenu(
  access: SuperadminAccess | null | undefined,
  menu: SuperadminMenuKey,
): boolean {
  if (!access || access.disabled) return false;
  if (access.isOwner) return true;
  if (menu === "equipe") return false;
  return access.menus.includes(menu);
}

export function canAccessPath(
  access: SuperadminAccess | null | undefined,
  pathname: string | null | undefined,
): boolean {
  const key = menuKeyForPath(pathname);
  if (!key) return true;
  return canAccessMenu(access, key);
}

export function firstAllowedPath(access: SuperadminAccess | null | undefined): string {
  const menus = resolveEffectiveMenus(access);
  for (const key of SUPERADMIN_MENU_KEYS) {
    if (menus.includes(key)) return SUPERADMIN_MENU_PATHS[key];
  }
  return "/login";
}
