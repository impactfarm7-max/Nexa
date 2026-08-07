import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  GitBranch,
  GraduationCap,
  Calendar,
  ClipboardList,
  Settings2,
  BookOpen,
  Video,
  Flag,
  type LucideIcon,
} from "lucide-react";

export type CenterNavItem = {
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  path: string;
};

const GENERIC_SHEET: CenterNavItem[] = [
  { label: "Programmes", icon: GitBranch, path: "/centre/filieres" },
  { label: "Staff", icon: GraduationCap, path: "/centre/staff" },
  { label: "Planning", icon: Calendar, path: "/centre/cours/planning" },
  { label: "Cours", icon: BookOpen, path: "/centre/cours/gestion-cours" },
  { label: "Devoirs", icon: BookOpen, path: "/centre/cours/devoirs" },
  { label: "Examens", icon: ClipboardList, path: "/centre/examens/examensuniversels" },
  { label: "Paramètres", icon: Settings2, path: "/centre/parametres/entreprise" },
];

const TCF_SHEET: CenterNavItem[] = [
  { label: "Staff", icon: GraduationCap, path: "/centre/staff" },
  { label: "Programme TCF", icon: Flag, path: "/centre/tcf/programme" },
  { label: "Cours", icon: BookOpen, path: "/centre/cours/gestion-cours" },
  { label: "Planning", icon: Calendar, path: "/centre/cours/planning" },
  { label: "Devoirs", icon: BookOpen, path: "/centre/cours/devoirs" },
  { label: "Examens", icon: ClipboardList, path: "/centre/examens/examensuniversels" },
  { label: "Sessions Live", icon: Video, path: "/centre/lives" },
  { label: "Paramètres", icon: Settings2, path: "/centre/parametres/entreprise" },
];

export function getCenterBottomBarItems(isTCF: boolean): {
  left: CenterNavItem[];
  right: CenterNavItem[];
} {
  if (isTCF) {
    return {
      left: [
        { label: "Tableau de bord", shortLabel: "Accueil", icon: LayoutDashboard, path: "/centre/dashboard" },
        { label: "Étudiants TCF", shortLabel: "Étudiants", icon: Users, path: "/centre/tcf/etudiants" },
      ],
      right: [
        { label: "Finance", shortLabel: "Finance", icon: CreditCard, path: "/centre/finance" },
        { label: "bottomCommunity", shortLabel: "bottomCommunityShort", icon: MessageSquare, path: "/centre/communaute" },
      ],
    };
  }

  return {
    left: [
      { label: "Tableau de bord", shortLabel: "Accueil", icon: LayoutDashboard, path: "/centre/dashboard" },
      { label: "Étudiants", shortLabel: "Étudiants", icon: Users, path: "/centre/etudiants" },
    ],
    right: [
      { label: "Finance", shortLabel: "Finance", icon: CreditCard, path: "/centre/finance" },
      { label: "bottomCommunity", shortLabel: "bottomCommunityShort", icon: MessageSquare, path: "/centre/communaute" },
    ],
  };
}

export function getCenterBottomSheetItems(isTCF: boolean): CenterNavItem[] {
  return isTCF ? TCF_SHEET : GENERIC_SHEET;
}
