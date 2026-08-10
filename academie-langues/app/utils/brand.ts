/** Couleurs et tokens NEXA — alignés sur le dashboard étudiant */
export const BRAND = {
  blue: "#11224E",
  orange: "#F87B1B",
  white: "#FFFFFF",
  bg: "#FFFBF7",
  /** Logo officiel (UI) — ne pas confondre avec favicon PWA / logos centres */
  logo: "/logo-nexa.jpeg",
} as const;

/** Typographie dashboard étudiant (tailles identiques à app/dashboard/page.tsx) */
export const STUDENT_TEXT = {
  /** En-tête de page — ex. « Bonjour, Prénom » */
  pageTitle: "font-display font-black tracking-tight text-base md:text-lg xl:text-xl 2xl:text-2xl",
  /** Titre de section — ex. « Pack d'entraînement » */
  sectionTitle: "font-display font-black tracking-tight text-lg md:text-xl xl:text-2xl 2xl:text-3xl",
  /** Titre de carte / bloc — ex. « Mes notes de la semaine » */
  cardTitle: "font-display font-black text-sm md:text-base xl:text-lg 2xl:text-xl",
  /** Label compact dans une carte */
  cardLabel: "font-display font-black text-[12px] md:text-sm uppercase tracking-tight leading-tight",
  badge: "font-bold uppercase tracking-widest text-[9px] md:text-[10px] xl:text-[11px]",
  subtitle: "text-[11px] md:text-sm xl:text-base text-neutral-400 font-medium",
  /** Sidebar étudiante — échelle fluide, alignée dashboard */
  sidebarBrand: "font-display font-black tracking-tight text-sm md:text-base xl:text-lg 2xl:text-xl",
  sidebarTagline: "font-display font-bold uppercase tracking-wider text-[9px] md:text-[10px] xl:text-[11px] 2xl:text-[12px]",
  sidebarSection: "font-display font-black uppercase tracking-widest text-[9px] md:text-[10px] xl:text-[11px] 2xl:text-[12px]",
  sidebarItem: "font-display text-[13px] md:text-[14px] xl:text-base 2xl:text-[16px] leading-snug",
  sidebarItemActive: "font-display font-black",
  sidebarItemIdle: "font-display font-medium",
  sidebarMeta: "font-display font-bold uppercase tracking-wider text-[9px] md:text-[10px] xl:text-[11px]",
  sidebarProfile: "font-display font-black text-[12px] md:text-sm xl:text-base 2xl:text-lg",

  tab: "font-display font-semibold tracking-tight text-[12px] sm:text-sm xl:text-base",
  tabActive: "font-display font-black",
} as const;

export const studentShellClass =
  "min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans selection:bg-orange-500/30 overflow-x-hidden pb-24 md:pb-10";
