/**
 * Routage B2C vs personnel centre vs étudiant centre.
 */

export const STUDENT_HOME = "/dashboard";
export const CENTER_HOME = "/centre/dashboard";
export const SUPERADMIN_HOME = "/superadmin/dashboard";
/** @deprecated Alias */
export const CENTER_STUDENT_HOME = STUDENT_HOME;
export const B2C_STUDENT_HOME = STUDENT_HOME;

type ProfileLike = {
  role?: string | null;
  center_id?: string | null;
};

/** Rôles du personnel d'un établissement (espace /centre/*). */
export const CENTER_STAFF_ROLES = new Set([
  "center_manager",
  "campus_manager",
  "trainer",
  "staff",
  "manager",
]);

export function isCenterStaff(profile: ProfileLike | null | undefined): boolean {
  return Boolean(profile?.role && CENTER_STAFF_ROLES.has(profile.role));
}

/** Boss et directeur de campus peuvent configurer les zones protégées (PIN). */
export function canManagePinProtectedZones(role?: string | null): boolean {
  return role === "center_manager" || role === "campus_manager";
}

/** Étudiant rattaché à un centre (espace app/ partagé). */
export function isCenterStudent(profile: ProfileLike | null | undefined): boolean {
  return profile?.role === "student" && Boolean(profile?.center_id);
}

/** Superadmin Nexa — pilotage du réseau de centres (espace /superadmin/*). */
export function isSuperAdmin(profile: ProfileLike | null | undefined): boolean {
  return profile?.role === "superadmin";
}

/** Rôles à privilèges exemptés des contrôles de cycle de vie étudiant (revoque/termine). */
export function isPrivilegedRole(profile: ProfileLike | null | undefined): boolean {
  return profile?.role === "admin" || profile?.role === "superadmin";
}

/** Destination après connexion / PIN. */
export function resolvePostLoginPath(profile: ProfileLike | null | undefined): string {
  if (!profile) return "/login";
  if (isSuperAdmin(profile)) return SUPERADMIN_HOME;
  if (isCenterStaff(profile)) return CENTER_HOME;
  return STUDENT_HOME;
}

/** Destination après quitter une salle (évite le flash UI étudiant pour le staff). */
export function resolveMeetingExitPath(
  kind: "live" | "group" | "individual",
  profile?: ProfileLike | null,
): string {
  if (isCenterStaff(profile)) {
    if (kind === "live") return "/centre/lives";
    if (kind === "group") return "/centre/cours/planning";
    return "/centre/cours/coaching";
  }
  return "/dashboard/coaching";
}

/** Navigation apprenant (B2C et étudiant centre). */
export function getStudentNavPaths(_centerId: string | null = null) {
  return {
    home: STUDENT_HOME,
    coaching: "/dashboard/coaching",
    missions: "/tcf-canada/missions",
    communaute: "/communaute",
    messages: "/messages",
    profil: "/profil",
  };
}

/** Permissions staff → chemins sidebar centre. */
export const STAFF_PERMISSION_ROUTES: Record<string, string[]> = {
  finance: ["/centre/finance"],
  etudiants: ["/centre/etudiants", "/centre/tcf/etudiants"],
  filieres: ["/centre/filieres", "/centre/tcf/programme"],
  staff: ["/centre/staff"],
  communaute: ["/centre/communaute"],
  parametres: ["/centre/parametres"],
  cours: ["/centre/cours", "/centre/lives"],
  planning: ["/centre/cours/planning", "/centre/lives"],
  examens: ["/centre/examens"],
  rapports: ["/centre/rapports"],
  lives: ["/centre/lives"],
  bibliotheque: ["/centre/bibliotheque"],
  abonnements: ["/centre/abonnements"],
};

export function canAccessCenterPath(
  pathname: string,
  role: string | null,
  permissions: string[],
): boolean {
  if (!role) return false;
  if (role === "center_manager" || role === "campus_manager" || role === "manager") return true;
  if (role === "trainer") {
    const trainerDefaults = [
      "/centre/dashboard",
      "/centre/cours",
      "/centre/communaute",
      "/centre/examens",
      "/centre/lives",
      "/centre/mon-compte",
      "/centre/profil",
    ];
    if (trainerDefaults.some((p) => pathname.startsWith(p))) return true;
    // Accès supplémentaires accordés par le centre
    return permissions.some((perm) =>
      (STAFF_PERMISSION_ROUTES[perm] || []).some((prefix) => pathname.startsWith(prefix))
    );
  }
  if (role !== "staff") return false;
  if (pathname.startsWith("/centre/dashboard") || pathname.startsWith("/centre/mon-compte") || pathname.startsWith("/centre/profil")) return true;
  // Sessions Live : rubrique attribuée par défaut à tout le personnel
  if (pathname.startsWith("/centre/lives")) return true;
  return permissions.some((perm) =>
    (STAFF_PERMISSION_ROUTES[perm] || []).some((prefix) => pathname.startsWith(prefix))
  );
}
