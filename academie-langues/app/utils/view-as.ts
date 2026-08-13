/** Aperçu dashboard (centre / staff / étudiant) sans changer le rôle réel. */

export const VIEW_AS_KEY = "nexa_view_as";
export const VIEW_AS_EVENT = "nexa-view-as";

export type ViewAsMode = "center" | "staff" | "student";

export const ALL_STAFF_MODULE_PERMS = [
  "finance",
  "etudiants",
  "filieres",
  "staff",
  "communaute",
  "parametres",
  "cours",
  "planning",
  "examens",
  "rapports",
  "activities",
  "lives",
  "abonnements",
  "bibliotheque",
] as const;

const CENTER_ACTORS = new Set(["center_manager", "campus_manager", "manager"]);
const STAFF_ACTORS = new Set(["staff", "trainer"]);

export function isCenterViewActor(role?: string | null): boolean {
  return Boolean(role && CENTER_ACTORS.has(role));
}

export function isStaffViewActor(role?: string | null): boolean {
  return Boolean(role && STAFF_ACTORS.has(role));
}

export function canUseViewAs(role?: string | null): boolean {
  return isCenterViewActor(role) || isStaffViewActor(role);
}

export function readViewAs(): ViewAsMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(VIEW_AS_KEY);
  if (raw === "staff" || raw === "student") return raw;
  return null;
}

export function writeViewAs(mode: ViewAsMode | null) {
  if (typeof window === "undefined") return;
  if (!mode || mode === "center") window.sessionStorage.removeItem(VIEW_AS_KEY);
  else window.sessionStorage.setItem(VIEW_AS_KEY, mode);
  window.dispatchEvent(new Event(VIEW_AS_EVENT));
}

export function clearViewAs() {
  writeViewAs(null);
}

export function isViewAsStudentPreview(): boolean {
  return readViewAs() === "student";
}

export function isViewAsStaffPreview(): boolean {
  return readViewAs() === "staff";
}

export function isStudentPreviewPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tcf-canada") ||
    pathname.startsWith("/communaute") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/profil") ||
    pathname.startsWith("/bibliotheque")
  );
}

export function resolveCurrentView(actualRole: string | null | undefined): ViewAsMode | null {
  if (isCenterViewActor(actualRole)) {
    const preview = readViewAs();
    if (preview === "staff" || preview === "student") return preview;
    return "center";
  }
  if (isStaffViewActor(actualRole)) {
    return readViewAs() === "student" ? "student" : "staff";
  }
  return null;
}

export function viewAsOptions(
  actualRole: string | null | undefined,
  current: ViewAsMode | null,
): ViewAsMode[] {
  if (!current) return [];
  if (isCenterViewActor(actualRole)) {
    return (["center", "staff", "student"] as ViewAsMode[]).filter((m) => m !== current);
  }
  if (isStaffViewActor(actualRole)) {
    return current === "student" ? ["staff"] : ["student"];
  }
  return [];
}

export function pathForViewAs(mode: ViewAsMode): string {
  return mode === "student" ? "/dashboard" : "/centre/dashboard";
}
