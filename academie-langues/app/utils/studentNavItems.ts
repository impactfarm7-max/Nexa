import {
  LayoutDashboard,
  MessageCircle,
  Video,
  BookOpen,
  FileText,
  Library,
  Timer,
  Users,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { getStudentNavPaths } from "./student-routes";
import {
  resolveStudentExperienceMode,
  type StudentExperienceMode,
} from "@/app/data/center-types";

export type StudentNavItem = {
  label: string;
  shortLabel?: string;
  /** Stable dashboard.ts key — preferred over FR label string-matching. */
  labelKey?: string;
  shortLabelKey?: string;
  icon: LucideIcon;
  path: string;
  tutorLockBadge?: boolean;
};

type NavOptions = {
  centerId?: string | null;
  centerType?: string | null;
  mode?: StudentExperienceMode;
};

function resolveMode(opts: NavOptions): StudentExperienceMode {
  if (opts.mode) return opts.mode;
  return resolveStudentExperienceMode(opts.centerId ?? null, opts.centerType ?? null);
}

/** Navigation TCF / B2C / formation courte (allégée = même liens pour l'instant). */
function getTcfLikeNavItems(centerId: string | null): StudentNavItem[] {
  const navPaths = getStudentNavPaths(centerId);
  return [
    { label: "Tableau de bord", shortLabel: "Accueil", icon: LayoutDashboard, path: navPaths.home },
    { label: "Mon tuteur", shortLabel: "Tuteur", icon: MessageCircle, path: "/tuteur", tutorLockBadge: true },
    { label: "Session Live", shortLabel: "Live", icon: Video, path: navPaths.coaching },
    { label: "Cours et Quiz", shortLabel: "Cours", icon: BookOpen, path: "/tcf-canada/cours" },
    { label: "Mes Devoirs", shortLabel: "Devoirs", icon: FileText, path: navPaths.missions },
    { label: "Bibliothèque", shortLabel: "Bibliothèque", icon: Library, path: "/bibliotheque" },
    { label: "Mode Examen", shortLabel: "Examen", icon: Timer, path: "/tcf-canada/simulateur/examen" },
    { label: "Communauté", shortLabel: "Communauté", labelKey: "navCommunity", shortLabelKey: "navCommunity", icon: Users, path: navPaths.communaute },
  ];
}

/** Navigation pluri-annuelle : sans packs / simulateurs TCF, avec tuteur IA + cours centre. */
function getPluriannualNavItems(centerId: string | null): StudentNavItem[] {
  const navPaths = getStudentNavPaths(centerId);
  return [
    { label: "Tableau de bord", shortLabel: "Accueil", icon: LayoutDashboard, path: navPaths.home },
    { label: "Mon tuteur", shortLabel: "Tuteur", icon: MessageCircle, path: "/tuteur", tutorLockBadge: true },
    { label: "Session Live", shortLabel: "Live", icon: Video, path: navPaths.coaching },
    { label: "Mes cours", shortLabel: "Cours", icon: BookOpen, path: "/tcf-canada/cours?tab=centre" },
    { label: "Mes Devoirs", shortLabel: "Devoirs", icon: FileText, path: navPaths.missions },
    { label: "Communauté", shortLabel: "Communauté", labelKey: "navCommunity", shortLabelKey: "navCommunity", icon: Users, path: navPaths.communaute },
  ];
}

export function getStudentNavItems(
  centerIdOrOpts: string | null | NavOptions = null,
  centerType?: string | null,
): StudentNavItem[] {
  const opts: NavOptions =
    typeof centerIdOrOpts === "object" && centerIdOrOpts !== null
      ? centerIdOrOpts
      : { centerId: centerIdOrOpts, centerType };

  const centerId = opts.centerId ?? null;
  const mode = resolveMode(opts);

  if (mode === "pluriannual") return getPluriannualNavItems(centerId);
  return getTcfLikeNavItems(centerId);
}

export const STUDENT_ADMIN_NAV_ITEM: StudentNavItem = {
  label: "Dashboard Admin",
  shortLabel: "Admin",
  labelKey: "navAdmin",
  shortLabelKey: "navAdmin",
  icon: ShieldCheck,
  path: "/admin",
};

/** Liens affichés dans la barre fixe mobile (hors menu « + »). */
export function getBottomBarPrimaryItems(
  centerIdOrOpts: string | null | NavOptions = null,
  centerType?: string | null,
) {
  const opts: NavOptions =
    typeof centerIdOrOpts === "object" && centerIdOrOpts !== null
      ? centerIdOrOpts
      : { centerId: centerIdOrOpts, centerType };

  const centerId = opts.centerId ?? null;
  const navPaths = getStudentNavPaths(centerId);
  const items = getStudentNavItems(opts);
  const mode = resolveMode(opts);

  if (mode === "pluriannual") {
    return {
      left: items.filter((i) => i.path === navPaths.home || i.path === "/tuteur"),
      right: items.filter((i) => i.path === navPaths.missions || i.path === navPaths.communaute),
    };
  }

  return {
    left: items.filter((i) => i.path === navPaths.home || i.path === "/tuteur"),
    right: items.filter((i) => i.path === navPaths.missions || i.path === navPaths.communaute),
  };
}

/** Liens regroupés dans le menu « + » mobile. */
export function getBottomSheetNavItems(
  centerIdOrOpts: string | null | NavOptions = null,
  centerType?: string | null,
) {
  const opts: NavOptions =
    typeof centerIdOrOpts === "object" && centerIdOrOpts !== null
      ? centerIdOrOpts
      : { centerId: centerIdOrOpts, centerType };

  const centerId = opts.centerId ?? null;
  const navPaths = getStudentNavPaths(centerId);

  const primaryPaths = new Set([
    navPaths.home,
    "/tuteur",
    navPaths.missions,
    navPaths.communaute,
  ]);

  return getStudentNavItems(opts).filter((i) => !primaryPaths.has(i.path));
}
