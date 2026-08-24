"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  LayoutDashboard, Users, GraduationCap, GitBranch, CreditCard,
  MessageSquare, Building2, BookOpen,
  ClipboardList, Calendar, Camera, Settings2, BarChart3,
  BookMarked, PenTool, ChevronDown, ChevronUp,
  PanelLeftClose, PanelLeftOpen, Video, Flag, Gem, LibraryBig,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { STAFF_PERMISSION_ROUTES } from "@/app/utils/student-routes";
import { filterModulePermissions, ensureTcfCommunautePermission, ensureDefaultLivesPermission, TRAINER_DEFAULT_MODULE_PERMISSIONS } from "@/app/data/tcf-teaching-subjects";
import { normalizeCenterType, type CenterTypeCode } from "@/app/data/center-types";
import { getCenterMeCache, peekCenterBootstrap } from "@/app/utils/center-me-cache";
import { BRAND } from "@/app/utils/brand";
import { CenterBrandMark } from "@/app/centre/center-page-ui";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useI18n } from "@/app/i18n/I18nProvider";
import { normalizeNexaOffer } from "@/app/data/nexaOffers";
import { tcfPlanLabel } from "@/app/data/tcfOffers";
import { ALL_STAFF_MODULE_PERMS, VIEW_AS_EVENT, isViewAsStaffPreview } from "@/app/utils/view-as";

/* ─── Constantes ────────────────────────────────────────────────────────── */
const SIDEBAR_W_VAR  = "--nexa-center-sidebar-w";
const COLLAPSE_KEY   = "nexa_center_collapsed";
const BLUE           = BRAND.blue;
const ORANGE         = BRAND.orange;
const CREAM          = BRAND.bg;

const FULL_ACCESS_ROLES  = ["center_manager", "campus_manager", "manager"];
const TRAINER_DEFAULT_PATHS = [
  "/centre/cours",
  "/centre/examens",
  "/centre/communaute",
];

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Branch  = { id: string; name: string };
type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  permKey?: string | null;
  children?: NavItem[];
};

const FORMATION_ITEM: NavItem = {
  label: "navFormation",
  icon: BookOpen,
  path: "/centre/cours",
  children: [
    { label: "navCoursConstructeur", icon: PenTool,    path: "/centre/cours/gestion-cours", permKey: "cours" },
    { label: "navPlanning",          icon: Calendar,   path: "/centre/cours/planning",      permKey: "planning" },
    { label: "navMissionsDevoirs",   icon: BookMarked, path: "/centre/cours/devoirs",       permKey: "cours" },
  ],
};

/* ─── Listes de navigation — Centre Générique ───────────────────────────── */
const MANAGER_NAV: NavItem[] = [
  { label: "navDashboard",        icon: LayoutDashboard, path: "/centre/dashboard",                  permKey: null },
  { label: "navStaff",            icon: GraduationCap,   path: "/centre/staff",                      permKey: "staff" },
  { label: "navProgrammes",       icon: GitBranch,       path: "/centre/filieres",                   permKey: "filieres" },
  { label: "navEtudiants",        icon: Users,           path: "/centre/etudiants",                  permKey: "etudiants" },
  { label: "navFinance",          icon: CreditCard,      path: "/centre/finance",                    permKey: "finance" },
  FORMATION_ITEM,
  { label: "navExamensNotes",     icon: ClipboardList,   path: "/centre/examens/examensuniversels",  permKey: "examens" },
  { label: "navCommunaute",       icon: MessageSquare,   path: "/centre/communaute",                 permKey: "communaute" },
  { label: "navSessionsLive",     icon: Video,           path: "/centre/lives",                      permKey: "lives" },
  { label: "navBibliotheque",     icon: LibraryBig,      path: "/centre/bibliotheque",               permKey: "bibliotheque" },
  { label: "navRapports",         icon: BarChart3,       path: "/centre/rapports",                   permKey: "rapports" },
  { label: "navAbonnements",      icon: Gem,             path: "/centre/abonnements",                permKey: "abonnements" },
  { label: "navCreditsIa",        icon: Sparkles,        path: "/centre/credits-ia",                 permKey: "abonnements" },
  { label: "navParametres",       icon: Settings2,       path: "/centre/parametres/entreprise",      permKey: "parametres" },
];

const TRAINER_DEFAULT_NAV: NavItem[] = [
  { label: "navDashboard",  icon: LayoutDashboard, path: "/centre/dashboard",                  permKey: null },
  FORMATION_ITEM,
  { label: "navSessionsLive",   icon: Video,         path: "/centre/lives",                      permKey: "lives" },
  { label: "navExamensNotes",   icon: ClipboardList, path: "/centre/examens/examensuniversels",  permKey: "examens" },
  { label: "navCommunaute",     icon: MessageSquare, path: "/centre/communaute",                 permKey: "communaute" },
];

const EXTRA_TRAINER_ITEMS: NavItem[] = [
  { label: "navEtudiants",  icon: Users,         path: "/centre/etudiants",             permKey: "etudiants" },
  { label: "navFinance",    icon: CreditCard,    path: "/centre/finance",               permKey: "finance" },
  { label: "navStaff",      icon: GraduationCap, path: "/centre/staff",                 permKey: "staff" },
  { label: "navProgrammes", icon: GitBranch,     path: "/centre/filieres",              permKey: "filieres" },
  { label: "navRapports",   icon: BarChart3,     path: "/centre/rapports",              permKey: "rapports" },
  { label: "navParametres", icon: Settings2,     path: "/centre/parametres/entreprise", permKey: "parametres" },
];

/* ─── Listes de navigation — Centre TCF Canada ──────────────────────────── */
const TCF_MANAGER_NAV: NavItem[] = [
  { label: "navDashboard",     icon: LayoutDashboard, path: "/centre/dashboard",                  permKey: null },
  { label: "navStaff",         icon: GraduationCap,   path: "/centre/staff",                      permKey: "staff" },
  { label: "navProgrammeTcf",  icon: Flag,            path: "/centre/tcf/programme",              permKey: "filieres" },
  { label: "navEtudiantsTcf",  icon: Users,           path: "/centre/tcf/etudiants",              permKey: "etudiants" },
  { label: "navFinance",       icon: CreditCard,      path: "/centre/finance",                    permKey: "finance" },
  FORMATION_ITEM,
  { label: "navExamensNotes",  icon: ClipboardList,   path: "/centre/examens/examensuniversels",  permKey: "examens" },
  { label: "navCommunaute",    icon: MessageSquare,   path: "/centre/communaute",                 permKey: "communaute" },
  { label: "navSessionsLive",  icon: Video,           path: "/centre/lives",                      permKey: "lives" },
  { label: "navBibliotheque",  icon: LibraryBig,      path: "/centre/bibliotheque",               permKey: "bibliotheque" },
  { label: "navRapports",      icon: BarChart3,       path: "/centre/rapports",                   permKey: "rapports" },
  { label: "navAbonnements",   icon: Gem,             path: "/centre/abonnements",                permKey: "abonnements" },
  { label: "navCreditsIa",     icon: Sparkles,        path: "/centre/credits-ia",                 permKey: "abonnements" },
  { label: "navParametres",    icon: Settings2,       path: "/centre/parametres/entreprise",      permKey: "parametres" },
];

const TCF_TRAINER_NAV: NavItem[] = [
  { label: "navMyDashboard",  icon: LayoutDashboard, path: "/centre/dashboard",                  permKey: null },
  FORMATION_ITEM,
  { label: "navExamensNotes", icon: ClipboardList,   path: "/centre/examens/examensuniversels",  permKey: "examens" },
  { label: "navSessionsLive", icon: Video,           path: "/centre/lives",                      permKey: "lives" },
  { label: "navCommunaute",   icon: MessageSquare,   path: "/centre/communaute",                 permKey: "communaute" },
];

const TCF_EXTRA_TRAINER_ITEMS: NavItem[] = [
  { label: "navEtudiantsTcf", icon: Users,         path: "/centre/tcf/etudiants",         permKey: "etudiants" },
  { label: "navProgrammeTcf", icon: Flag,          path: "/centre/tcf/programme",         permKey: "filieres" },
  { label: "navFinance",      icon: CreditCard,    path: "/centre/finance",               permKey: "finance" },
  { label: "navStaff",        icon: GraduationCap, path: "/centre/staff",                 permKey: "staff" },
  { label: "navRapports",     icon: BarChart3,     path: "/centre/rapports",              permKey: "rapports" },
  { label: "navBibliotheque", icon: LibraryBig,    path: "/centre/bibliotheque",          permKey: "bibliotheque" },
  { label: "navParametres",   icon: Settings2,     path: "/centre/parametres/entreprise", permKey: "parametres" },
];

/* ─── Formation courte : shell type TCF, sans routes / contenu TCF ───────── */
const SHORT_MANAGER_NAV: NavItem[] = [
  { label: "navDashboard",     icon: LayoutDashboard, path: "/centre/dashboard",                  permKey: null },
  { label: "navStaff",         icon: GraduationCap,   path: "/centre/staff",                      permKey: "staff" },
  { label: "navEtudiants",     icon: Users,           path: "/centre/etudiants",                  permKey: "etudiants" },
  { label: "navProgrammes",    icon: GitBranch,       path: "/centre/filieres",                   permKey: "filieres" },
  FORMATION_ITEM,
  { label: "navExamensNotes",  icon: ClipboardList,   path: "/centre/examens/examensuniversels",  permKey: "examens" },
  { label: "navFinance",       icon: CreditCard,      path: "/centre/finance",                    permKey: "finance" },
  { label: "navRapports",      icon: BarChart3,       path: "/centre/rapports",                   permKey: "rapports" },
  { label: "navCommunaute",    icon: MessageSquare,   path: "/centre/communaute",                 permKey: "communaute" },
  { label: "navSessionsLive",  icon: Video,           path: "/centre/lives",                      permKey: "lives" },
  { label: "navAbonnements",   icon: Gem,             path: "/centre/abonnements",                permKey: "abonnements" },
  { label: "navCreditsIa",     icon: Sparkles,        path: "/centre/credits-ia",                 permKey: "abonnements" },
  { label: "navParametres",    icon: Settings2,       path: "/centre/parametres/entreprise",      permKey: "parametres" },
];

const SHORT_EXTRA_TRAINER_ITEMS: NavItem[] = [
  { label: "navEtudiants",  icon: Users,         path: "/centre/etudiants",             permKey: "etudiants" },
  { label: "navProgrammes", icon: GitBranch,     path: "/centre/filieres",              permKey: "filieres" },
  { label: "navFinance",    icon: CreditCard,    path: "/centre/finance",               permKey: "finance" },
  { label: "navStaff",      icon: GraduationCap, path: "/centre/staff",                 permKey: "staff" },
  { label: "navRapports",   icon: BarChart3,     path: "/centre/rapports",              permKey: "rapports" },
  { label: "navParametres", icon: Settings2,     path: "/centre/parametres/entreprise", permKey: "parametres" },
];

function hasPermForNavItem(item: NavItem, perms: string[]): boolean {
  if (!item.permKey) return true;
  if (perms.includes(item.permKey)) return true;
  return perms.some((p) =>
    (STAFF_PERMISSION_ROUTES[p] || []).some((prefix: string) => item.path.startsWith(prefix))
  );
}

function filterNavItemForStaff(item: NavItem, perms: string[]): NavItem | null {
  if (item.children) {
    const children = item.children.filter((child) => hasPermForNavItem(child, perms));
    if (children.length === 0) return null;
    return { ...item, children };
  }
  return hasPermForNavItem(item, perms) ? item : null;
}

function resolvePlanLabel(
  center: { nexa_offer?: string | null; plan_type?: string | null; center_type?: string | null },
  t: (ns: "centre", key: string) => string,
  locale: "fr" | "en",
): string {
  if (normalizeCenterType(center.center_type) === "tcf_canada") {
    return tcfPlanLabel(center.plan_type, locale);
  }
  const key = normalizeNexaOffer(center.nexa_offer);
  if (!key) return t("centre", "abonnementsTrial");
  if (key === "custom") return t("centre", "offerNameCustom");
  if (key === "decouverte") return t("centre", "offerNameDecouverte");
  if (key === "croissance") return t("centre", "offerNameCroissance");
  if (key === "pro") return t("centre", "offerNamePro");
  if (key === "entreprise") return t("centre", "offerNameEntreprise");
  return t("centre", "abonnementsTrial");
}

function readSidebarCache(t: (ns: "centre", key: string) => string, locale: "fr" | "en") {
  const json = getCenterMeCache();
  if (!json) return null;

  const center = json.center as {
    id?: string;
    name?: string;
    center_type?: string;
    nexa_offer?: string | null;
    plan_type?: string | null;
  } | null;
  const role = json.role as string | null;
  const permissions = filterModulePermissions((json.permissions || []) as string[]);

  if (!center?.id || !role) return null;

  const centerType = normalizeCenterType(center.center_type);
  const staffPermissions =
    FULL_ACCESS_ROLES.includes(role)
      ? ["finance", "etudiants", "filieres", "staff", "communaute", "parametres", "cours", "planning", "examens", "rapports", "activities", "lives", "bibliotheque", "abonnements"]
      : ensureDefaultLivesPermission(ensureTcfCommunautePermission(permissions, centerType === "tcf_canada" ? "tcf_canada" : null));

  return {
    centerId: center.id,
    centerName: center.name || "Mon Établissement",
    centerType,
    planType: resolvePlanLabel(center, t, locale),
    userRole: role,
    staffPermissions,
    branches: [{ id: center.id, name: center.name || "Mon Établissement" }] as Branch[],
    activeBranchId: center.id,
  };
}

/* ─── Composant principal ───────────────────────────────────────────────── */
function CenterSidebarInner() {
  const pathname    = usePathname();
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const lang = locale === "en" ? "en" : "fr";

  const [centerId,          setCenterId]          = useState<string | null>(null);
  const [centerName,        setCenterName]        = useState("Mon Établissement");
  const [centerType,        setCenterType]        = useState<CenterTypeCode | null>(null);
  const [logoUrl,           setLogoUrl]           = useState<string | null>(null);
  const [planType,          setPlanType]          = useState("");
  const [isCollapsed,       setIsCollapsed]       = useState(false);
  const [hydrated,          setHydrated]          = useState(false);
  const [userRole,          setUserRole]          = useState<string | null>(null);
  const [userPrenom,        setUserPrenom]        = useState("Staff");
  const [staffPermissions,  setStaffPermissions]  = useState<string[]>([]);
  const [uploadingLogo,     setUploadingLogo]     = useState(false);
  const [branchMenuOpen,    setBranchMenuOpen]    = useState(false);
  const [branches,          setBranches]          = useState<Branch[]>([]);
  const [activeBranchId,    setActiveBranchId]    = useState<string | null>(null);
  const [coursOpen,         setCoursOpen]         = useState(false);
  const [previewStaff,      setPreviewStaff]      = useState(false);
  const [hasAiCredits,      setHasAiCredits]      = useState(false);

  useEffect(() => {
    const sync = () => setPreviewStaff(isViewAsStaffPreview());
    sync();
    window.addEventListener(VIEW_AS_EVENT, sync);
    return () => window.removeEventListener(VIEW_AS_EVENT, sync);
  }, []);

  /* Init cache + collapse */
  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved === "1") setIsCollapsed(true);
    setHydrated(true);

    const cached = readSidebarCache(t, lang);
    if (cached) {
      setCenterId(cached.centerId);
      setCenterName(cached.centerName);
      setCenterType(cached.centerType);
      setPlanType(cached.planType);
      setUserRole(cached.userRole);
      setStaffPermissions(cached.staffPermissions);
      setBranches(cached.branches);
      setActiveBranchId(cached.activeBranchId);
    }
  }, [t]);

  /* Logo + prénom en différé si le cache bootstrap suffit pour le menu */
  useEffect(() => {
    const bootstrap = peekCenterBootstrap();
    if (bootstrap?.staffPrenom) {
      setUserPrenom(bootstrap.staffPrenom);
    }

    const cId = bootstrap?.centerId ?? centerId;
    if (!cId) {
      void fetchCenterData();
      return;
    }

    if (!bootstrap && !centerId) {
      void fetchCenterData();
      return;
    }

    void (async () => {
      if (!bootstrap?.staffPrenom) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("prenom")
          .eq("id", session.user.id)
          .single();
        if (profile?.prenom) setUserPrenom(profile.prenom);
      }

      const { data: branding } = await supabase
        .from("center_branding")
        .select("logo_url")
        .eq("center_id", cId)
        .maybeSingle();
      setLogoUrl(branding?.logo_url || null);
    })();
  }, [centerId]);

  /* Visibilité "Crédits IA" — masqué tant que le centre n'a aucun stock */
  useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      try {
        const res = await fetch("/api/centre/credits", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const wallet = json?.wallet as Record<string, number> | undefined;
        const total = wallet
          ? Object.values(wallet).reduce((sum, n) => sum + (Number(n) || 0), 0)
          : 0;
        if (!cancelled) setHasAiCredits(total > 0);
      } catch {
        if (!cancelled) setHasAiCredits(false);
      }
    })();
    return () => { cancelled = true; };
  }, [centerId]);

  /* Auto-ouvrir sous-menu Cours */
  useEffect(() => {
    if (pathname.startsWith("/centre/cours")) setCoursOpen(true);
  }, [pathname]);

  /* CSS variable largeur */
  useEffect(() => {
    const update = () => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      document.documentElement.style.setProperty(
        SIDEBAR_W_VAR,
        !desktop ? "0px" : isCollapsed ? "5rem" : "16rem",
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isCollapsed]);

  /* Données centre */
  const fetchCenterData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles").select("role, center_id, prenom")
      .eq("id", session.user.id).single();

    if (!profile) return;
    setUserRole(profile.role);
    setUserPrenom(profile.prenom || "Staff");

    if (profile.role === "staff" || profile.role === "trainer") {
      const { data: permRows } = await supabase
        .from("staff_permissions").select("permission").eq("profile_id", session.user.id);
      let perms = filterModulePermissions((permRows || []).map((r) => r.permission));
      if (profile.center_id) {
        const { data: center } = await supabase
          .from("centers").select("center_type").eq("id", profile.center_id).maybeSingle();
        perms = ensureTcfCommunautePermission(perms, center?.center_type);
      }
      if (profile.role === "trainer" && perms.length === 0) {
        perms = [...TRAINER_DEFAULT_MODULE_PERMISSIONS];
      }
      setStaffPermissions(ensureDefaultLivesPermission(perms));
    } else if (FULL_ACCESS_ROLES.includes(profile.role)) {
      setStaffPermissions(["finance","etudiants","filieres","staff","communaute",
        "parametres","cours","planning","examens","rapports","activities","lives","bibliotheque","abonnements"]);
    }

    if (profile.center_id) {
      setCenterId(profile.center_id);
      const { data: center } = await supabase
        .from("centers").select("name, center_type, nexa_offer, plan_type").eq("id", profile.center_id).single();
      if (center) {
        setCenterName(center.name);
        setPlanType(resolvePlanLabel(center, t, lang));
        setCenterType(normalizeCenterType(center.center_type));
        setBranches([{ id: profile.center_id, name: center.name }]);
        setActiveBranchId(profile.center_id);
      }
      const { data: branding } = await supabase
        .from("center_branding").select("logo_url")
        .eq("center_id", profile.center_id).maybeSingle();
      setLogoUrl(branding?.logo_url || null);
    }
  };

  const toggleCollapse = () =>
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });

  const uploadLogo = async (file: File) => {
    if (!centerId) return;
    setUploadingLogo(true);
    const ext  = file.name.split(".").pop();
    const path = `${centerId}/logo.${ext}`;
    const { error } = await supabase.storage.from("center-logos").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("center-logos").getPublicUrl(path);
      await supabase.from("center_branding").upsert({ center_id: centerId, logo_url: data.publicUrl });
      setLogoUrl(data.publicUrl);
    }
    setUploadingLogo(false);
  };

  const canManage = !previewStaff && userRole === "center_manager";
  const isTrainer = !previewStaff && userRole === "trainer";
  const isManager = !previewStaff && FULL_ACCESS_ROLES.includes(userRole || "");
  const navPerms = previewStaff ? [...ALL_STAFF_MODULE_PERMS] : staffPermissions;

  /* Actif */
  const active = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const isTCF = centerType === "tcf_canada";
  const isShort = centerType === "formation_courte";

  /* Filtrage items manager/staff */
  const buildManagerNav = (): NavItem[] => {
    if (!userRole) return [];
    const baseNav = isTCF ? TCF_MANAGER_NAV : isShort ? SHORT_MANAGER_NAV : MANAGER_NAV;
    if (isManager) return baseNav;
    return baseNav
      .map((item) => filterNavItemForStaff(item, navPerms))
      .filter((item): item is NavItem => item !== null);
  };

  const buildTrainerNav = () => {
    if (isTCF) {
      return {
        defaultItems: TCF_TRAINER_NAV,
        extraItems: TCF_EXTRA_TRAINER_ITEMS.filter((item) =>
          item.permKey ? staffPermissions.includes(item.permKey) : false
        ),
      };
    }
    if (isShort) {
      return {
        defaultItems: TCF_TRAINER_NAV,
        extraItems: SHORT_EXTRA_TRAINER_ITEMS.filter((item) =>
          item.permKey ? staffPermissions.includes(item.permKey) : false
        ),
      };
    }
    return {
      defaultItems: TRAINER_DEFAULT_NAV,
      extraItems: EXTRA_TRAINER_ITEMS.filter(item =>
        item.permKey ? staffPermissions.includes(item.permKey) : false
      ),
    };
  };

  const activeBranch = branches.find(b => b.id === activeBranchId);

  /* ── Styles partagés ─────────────────────────────────────────────────── */

  // Item actif : fond bleu NEXA
  const activeItemStyle: React.CSSProperties = {
    backgroundColor: BLUE,
  };

  const itemCls = (isActive: boolean, indent = false) =>
    [
      "relative flex items-center rounded-xl transition-all duration-150 group",
      indent ? "pl-6 pr-3 py-2" : "px-3 py-2.5",
      isCollapsed && !indent ? "justify-center py-3" : "gap-3",
      isActive
        ? "text-white font-black"
        : "font-medium hover:bg-black/[0.04]",
    ].join(" ");

  /* ── Render item simple ──────────────────────────────────────────────── */
  const NavLink = ({ item, indent = false }: { item: NavItem; indent?: boolean }) => {
    const isAct = active(item.path);
    const Icon  = item.icon;
    return (
      <Link
        href={item.path}
        title={isCollapsed && !indent ? t("centre", item.label) : undefined}
        className={itemCls(isAct, indent)}
        style={isAct ? activeItemStyle : { color: "rgba(17,34,78,0.62)" }}
      >
        {/* Accent orange — trait vertical à gauche */}
        {isAct && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 3, height: "60%", backgroundColor: ORANGE }}
          />
        )}
        <Icon
          size={indent ? 14 : 17}
          className="shrink-0"
          style={{ color: isAct ? "#fff" : "rgba(17,34,78,0.45)" }}
        />
        {(!isCollapsed || indent) && (
          <span className={indent ? "text-[13px]" : "text-[14px]"}>{t("centre", item.label)}</span>
        )}
      </Link>
    );
  };

  /* ── Render Cours (avec sous-items) ──────────────────────────────────── */
  const CoursExpandable = ({ item }: { item: NavItem }) => {
    const parentAct    = active(item.path);
    const childAct     = item.children?.some(c => active(c.path)) ?? false;
    const highlight    = parentAct || childAct;
    const Icon         = item.icon;

    return (
      <div>
        <button
          onClick={() => {
            if (isCollapsed) { router.push(item.path); return; }
            setCoursOpen(v => !v);
          }}
          title={isCollapsed ? t("centre", item.label) : undefined}
          className={`w-full ${itemCls(highlight)}`}
          style={highlight ? activeItemStyle : { color: "rgba(17,34,78,0.62)" }}
        >
          {highlight && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
              style={{ width: 3, height: "60%", backgroundColor: ORANGE }}
            />
          )}
          <Icon
            size={17}
            className="shrink-0"
            style={{ color: highlight ? "#fff" : "rgba(17,34,78,0.45)" }}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-[13px]">{t("centre", item.label)}</span>
              {coursOpen
                ? <ChevronUp   size={12} className="shrink-0" style={{ color: highlight ? "rgba(255,255,255,0.7)" : "rgba(17,34,78,0.35)" }} />
                : <ChevronDown size={12} className="shrink-0" style={{ color: highlight ? "rgba(255,255,255,0.7)" : "rgba(17,34,78,0.35)" }} />}
            </>
          )}
        </button>

        {!isCollapsed && coursOpen && item.children && (
          <div className="mt-0.5 ml-4 space-y-0.5 border-l-2 pl-2" style={{ borderColor: "rgba(17,34,78,0.10)" }}>
            {item.children.map(child => <NavLink key={child.path} item={child} indent />)}
          </div>
        )}
      </div>
    );
  };

  /* ── Section label ───────────────────────────────────────────────────── */
  const SectionLabel = ({ label }: { label: string }) =>
    !isCollapsed ? (
      <p
        className="px-3 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest select-none"
        style={{ color: "rgba(17,34,78,0.35)" }}
      >
        {label}
      </p>
    ) : (
      <div className="mx-3 my-2 border-t" style={{ borderColor: "rgba(17,34,78,0.10)" }} />
    );

  // Masquer la sidebar en mode configuration initiale (après tous les hooks)
  if (searchParams.get("setup") === "1") return null;

  /* ─────────────────────────────── JSX ─────────────────────────────────── */
  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out select-none border-r border-black/[0.06] ${
        isCollapsed ? "w-20" : "w-64"
      } ${hydrated ? "" : "invisible"}`}
      style={{ backgroundColor: CREAM }}
    >

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div className={`flex items-center gap-2 border-b border-black/[0.06] shrink-0 px-3 transition-all duration-300 ${
        isCollapsed ? "h-16 justify-center flex-col py-2" : "h-[68px]"
      }`}>

        {/* Logo + nom */}
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Logo carré bordure bleue */}
            <div className="relative shrink-0">
              <CenterBrandMark
                src={logoUrl}
                alt={centerName}
                icon={Building2}
                size={36}
              />
              {canManage && (
                <label className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow-sm" style={{ backgroundColor: ORANGE }}>
                  <Camera size={9} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                </label>
              )}
            </div>
            {/* Nom */}
            <div className="flex-1 min-w-0">
              <p className="font-black text-[13px] leading-tight truncate" style={{ color: BLUE }}>{centerName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isTCF && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: ORANGE }}>
                    🇨🇦 TCF
                  </span>
                )}
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(17,34,78,0.40)" }}>
                  {uploadingLogo ? t("centre", "sidebarEnvoi") : t("centre", "sidebarPlan").replace("{plan}", planType)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Logo centré quand collapsed */}
        {isCollapsed && (
          <CenterBrandMark
            src={logoUrl}
            alt={centerName}
            icon={Building2}
            size={32}
          />
        )}

        {/* Bouton réduction — intégré dans le header (comme Claude/Gemini) */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? t("centre", "sidebarExpand") : t("centre", "sidebarCollapse")}
          className={`rounded-xl p-1.5 transition-all hover:bg-black/[0.05] shrink-0 ${
            isCollapsed ? "mt-1" : ""
          }`}
          style={{ color: "rgba(17,34,78,0.45)" }}
        >
          {isCollapsed
            ? <PanelLeftOpen  size={17} />
            : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* ══ SÉLECTEUR CAMPUS ════════════════════════════════════════════ */}
      {!isCollapsed && branches.length > 0 && (
        <div className="px-3 pt-2.5 relative shrink-0">
          <button
            onClick={() => setBranchMenuOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-black/[0.04] border border-black/[0.06] bg-white"
          >
            <Building2 size={12} className="shrink-0" style={{ color: "rgba(17,34,78,0.40)" }} />
            <span className="flex-1 text-left text-[12px] font-bold truncate" style={{ color: "rgba(17,34,78,0.70)" }}>
              {activeBranch?.name || t("centre", "sidebarCampus")}
            </span>
            <ChevronDown
              size={11}
              className={`transition-transform shrink-0 ${branchMenuOpen ? "rotate-180" : ""}`}
              style={{ color: "rgba(17,34,78,0.35)" }}
            />
          </button>
          {branchMenuOpen && (
            <div
              className="absolute left-3 right-3 top-full mt-1 rounded-xl z-50 overflow-hidden border border-black/[0.08] bg-white shadow-lg"
            >
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setActiveBranchId(b.id); setBranchMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-[12px] font-bold transition-colors ${
                    b.id === activeBranchId ? "text-white" : "hover:bg-black/[0.04]"
                  }`}
                  style={
                    b.id === activeBranchId
                      ? { backgroundColor: BLUE }
                      : { color: "rgba(17,34,78,0.55)" }
                  }
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ NAVIGATION ══════════════════════════════════════════════════ */}
      <nav className="nexa-sidebar-nav flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">

        {/* — VUE MANAGER / STAFF — */}
        {!isTrainer && (
          <>
            <SectionLabel label={
              isManager
                ? (isTCF ? t("centre", "sidebarSectionCentreTcfCanada") : isShort ? t("centre", "sidebarSectionFormationCourte") : t("centre", "sidebarSectionGestionCentre"))
                : t("centre", "sidebarSectionMonEspace")
            } />
            {buildManagerNav()
              .filter(item => item.path !== "/centre/credits-ia" || hasAiCredits)
              .map(item =>
                item.children
                  ? <CoursExpandable key={item.path} item={item} />
                  : <NavLink key={item.path} item={item} />
              )}
          </>
        )}

        {/* — VUE FORMATEUR — */}
        {isTrainer && (() => {
          const { defaultItems, extraItems } = buildTrainerNav();
          return (
            <>
              <SectionLabel label={isTCF ? t("centre", "sidebarSectionEspaceFormateurTcf") : isShort ? t("centre", "sidebarSectionEspaceFormateur") : t("centre", "sidebarSectionMonEspace")} />
              {defaultItems.map(item =>
                item.children
                  ? <CoursExpandable key={item.path} item={item} />
                  : <NavLink key={item.path} item={item} />
              )}
              {extraItems.length > 0 && (
                <>
                  <SectionLabel label={t("centre", "sidebarSectionAccesSupplementaires")} />
                  {extraItems.map(item => <NavLink key={item.path} item={item} />)}
                </>
              )}
            </>
          );
        })()}

      </nav>

      {/* ══ PROFIL ══════════════════════════════════════════════════════ */}
      <div
        className="px-2.5 py-3 shrink-0 border-t border-black/[0.06]"
        style={{ backgroundColor: "rgba(255,255,255,0.65)" }}
      >
        {!isTCF && !isCollapsed && <div className="mb-2 px-0.5"><LanguageSwitcher /></div>}
        <Link
          href="/centre/profil"
          className={`flex items-center rounded-xl transition-colors hover:bg-black/[0.04] ${isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2"}`}
          title={t("centre", "sidebarMonProfil")}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-[11px] shrink-0"
            style={{ backgroundColor: BLUE }}
          >
            {userPrenom.charAt(0).toUpperCase()}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black truncate" style={{ color: BLUE }}>{userPrenom}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: "rgba(17,34,78,0.40)" }}>
                {userRole === "admin"          ? t("centre", "roleAdministrateur")
                 : userRole === "center_manager" ? t("centre", "roleResponsable")
                 : userRole === "campus_manager" ? t("centre", "roleDirCampus")
                 : userRole === "staff"          ? t("centre", "roleAdministratif")
                 : userRole === "trainer"        ? t("centre", "roleFormateur")
                 : t("centre", "rolePersonnel")}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}

export default function CenterSidebar() {
  return (
    <Suspense fallback={null}>
      <CenterSidebarInner />
    </Suspense>
  );
}
