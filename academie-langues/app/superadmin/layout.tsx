"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, BarChart3, Bell, Building2, ChevronRight, Command, Headphones, Handshake, Inbox, LayoutDashboard,
  Layers, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck,
  Star, Sun, ScrollText, Users, UsersRound, UserCog, Wallet, X, LibraryBig,
} from "lucide-react";
import { Noto_Sans } from "next/font/google";
import { supabase } from "../utils/supabase";
import { superadminFetch } from "../utils/superadmin-api-client";
import { collectCenterAlerts } from "../utils/center-alerts";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  canAccessPath,
  firstAllowedPath,
  type SuperadminAccess,
  type SuperadminMenuKey,
} from "@/app/data/superadminMenus";
import { SuperadminCentersContext } from "./SuperadminCentersContext";

const superadminNotoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const MFA_SETUP_PATH = "/superadmin/mfa-setup";
const CHANGE_PASSWORD_PATH = "/superadmin/change-password";
const PREFS_KEY = "nexa_superadmin_preferences";

const NAV_CONFIG = [
  { href: "/superadmin/dashboard", menuKey: "dashboard", labelKey: "navDashboardLabel", descKey: "navDashboardDesc", icon: LayoutDashboard, groupKey: "groupPiloting" },
  { href: "/superadmin/analytics", menuKey: "analytics", labelKey: "navAnalyticsLabel", descKey: "navAnalyticsDesc", icon: BarChart3, groupKey: "groupPiloting" },
  { href: "/superadmin/alertes", menuKey: "alertes", labelKey: "navAlertsLabel", descKey: "navAlertsDesc", icon: AlertTriangle, groupKey: "groupPiloting" },
  { href: "/superadmin/commercial", menuKey: "commercial", labelKey: "navCommercialLabel", descKey: "navCommercialDesc", icon: Handshake, groupKey: "groupPiloting" },
  { href: "/superadmin/finance", menuKey: "finance", labelKey: "navFinanceLabel", descKey: "navFinanceDesc", icon: Wallet, groupKey: "groupPiloting" },
  { href: "/superadmin/demandes", menuKey: "centres", labelKey: "navDemandesLabel", descKey: "navDemandesDesc", icon: Inbox, groupKey: "groupPiloting" },
  { href: "/superadmin/centres", menuKey: "centres", labelKey: "navCentersLabel", descKey: "navCentersDesc", icon: Building2, groupKey: "groupNetwork" },
  { href: "/superadmin/effectifs", menuKey: "effectifs", labelKey: "navHeadcountLabel", descKey: "navHeadcountDesc", icon: UsersRound, groupKey: "groupNetwork" },
  { href: "/superadmin/etudiants", menuKey: "etudiants", labelKey: "navStudentsLabel", descKey: "navStudentsDesc", icon: Users, groupKey: "groupNetwork" },
  { href: "/superadmin/offres", menuKey: "offres", labelKey: "navOffersLabel", descKey: "navOffersDesc", icon: Layers, groupKey: "groupNetwork" },
  { href: "/superadmin/support", menuKey: "support", labelKey: "navSupportLabel", descKey: "navSupportDesc", icon: Headphones, groupKey: "groupOperations" },
  { href: "/superadmin/bibliotheque", menuKey: "bibliotheque", labelKey: "navLibraryLabel", descKey: "navLibraryDesc", icon: LibraryBig, groupKey: "groupOperations" },
  { href: "/superadmin/audit", menuKey: "audit", labelKey: "navAuditLabel", descKey: "navAuditDesc", icon: ScrollText, groupKey: "groupSecurity" },
  { href: "/superadmin/equipe", menuKey: "equipe", labelKey: "navTeamLabel", descKey: "navTeamDesc", icon: UserCog, groupKey: "groupSecurity" },
] as const;

type SearchResult = { id: string; href: string; type: string; title: string; detail: string };
type CenterRow = {
  id: string;
  name: string;
  city?: string | null;
  status: string;
  derived_status?: string;
  creatorEmail?: string | null;
  created_at?: string | null;
  trial_ends_at?: string | null;
  renewal_at?: string | null;
  renewal_alert_days?: number | null;
  subscription_amount?: number | null;
  nexa_offer?: string | null;
};

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const isBootstrapRoute = pathname === MFA_SETUP_PATH || pathname === CHANGE_PASSWORD_PATH;
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [access, setAccess] = useState<SuperadminAccess | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [centersLoading, setCentersLoading] = useState(true);
  const [centersError, setCentersError] = useState<string | null>(null);
  const [newApplicationsCount, setNewApplicationsCount] = useState(0);
  const [studentResults, setStudentResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const NAV_ITEMS = useMemo(
    () =>
      NAV_CONFIG.filter((item) => {
        if (!access) return item.menuKey === "dashboard";
        if (access.isOwner) return true;
        if (item.menuKey === "equipe") return false;
        return access.menus.includes(item.menuKey as SuperadminMenuKey);
      }).map((item) => ({
        href: item.href,
        menuKey: item.menuKey,
        icon: item.icon,
        label: t("superadmin", item.labelKey),
        description: t("superadmin", item.descKey),
        group: t("superadmin", item.groupKey),
      })),
    [t, access],
  );

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      setCollapsed(Boolean(prefs.collapsed));
      if (prefs.theme === "light") setTheme("light");
      if (Array.isArray(prefs.favorites)) setFavorites(prefs.favorites);
    } catch { /* utiliser les préférences par défaut */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ collapsed, theme, favorites }));
  }, [collapsed, theme, favorites]);

  useEffect(() => {
    document.body.style.backgroundColor = theme === "light" ? "#f1f5f9" : "#05070d";
    return () => { document.body.style.backgroundColor = ""; };
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    setAuthorized(false);
    const checkSuperadmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/login");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, must_change_password")
        .eq("id", session.user.id)
        .single();
      if (!profile || profile.role !== "superadmin") return router.replace("/login");
      if (profile.must_change_password && pathname !== CHANGE_PASSWORD_PATH) {
        return router.replace(CHANGE_PASSWORD_PATH);
      }
      if (isBootstrapRoute) {
        if (!cancelled) { setEmail(session.user.email ?? null); setAuthorized(true); }
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        if (aal?.nextLevel !== "aal2") return router.replace(MFA_SETUP_PATH);
        await supabase.auth.signOut();
        return router.replace("/login");
      }
      if (!cancelled) {
        setEmail(session.user.email ?? null);
        setAuthorized(true);
      }
      try {
        const me = await superadminFetch<{
          isOwner: boolean;
          menus: SuperadminMenuKey[];
        }>("/api/superadmin/me");
        if (cancelled) return;
        setAccess({
          isOwner: me.isOwner,
          menus: me.menus,
          disabled: false,
        });
      } catch {
        if (!cancelled) setAccess({ isOwner: true, menus: [], disabled: false });
      }
    };
    void checkSuperadmin();
    return () => { cancelled = true; };
  }, [router, isBootstrapRoute, pathname]);

  useEffect(() => {
    if (!authorized || isBootstrapRoute || !access) return;
    if (!canAccessPath(access, pathname)) {
      router.replace(firstAllowedPath(access));
    }
  }, [authorized, isBootstrapRoute, access, pathname, router]);

  const refreshCenters = useCallback(async () => {
    setCentersError(null);
    try {
      const json = await superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers");
      setCenters(json.centers || []);
    } catch (e) {
      setCentersError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setCentersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized || isBootstrapRoute) return;
    void refreshCenters();
    void superadminFetch<{ applications: { status: string }[] }>("/api/superadmin/applications")
      .then((json) => setNewApplicationsCount((json.applications || []).filter((a) => a.status === "new").length))
      .catch(() => undefined);
  }, [authorized, isBootstrapRoute, refreshCenters]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "") || target?.isContentEditable;
      if ((event.key === "/" || (event.ctrlKey && event.key.toLowerCase() === "k")) && !editing) {
        event.preventDefault(); setCommandOpen(true);
      }
      if (event.key === "Escape") { setCommandOpen(false); setNotificationsOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setStudentResults([]); return; }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const json = await superadminFetch<{ students: Array<{ id: string; prenom: string | null; email: string | null; center_id: string | null }>; centers: Record<string, { name: string }> }>(`/api/superadmin/students?q=${encodeURIComponent(value)}`);
        setStudentResults((json.students || []).slice(0, 6).map((student) => ({ id: student.id, href: "/superadmin/etudiants", type: t("superadmin", "resultTypeStudent"), title: student.prenom || student.email || t("superadmin", "resultTypeStudent"), detail: student.email || (student.center_id ? json.centers?.[student.center_id]?.name : "") || "" })));
      } catch { setStudentResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, t]);

  const activeItem = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) || NAV_ITEMS[0] || {
    href: "/superadmin/dashboard",
    label: t("superadmin", "navDashboardLabel"),
    description: "",
    group: t("superadmin", "groupPiloting"),
    icon: LayoutDashboard,
    menuKey: "dashboard" as const,
  };
  const networkAlerts = useMemo(() => collectCenterAlerts(centers), [centers]);
  const alertCounts = useMemo(() => {
    const trialUrgent = networkAlerts.filter((a) => a.kind === "trial_urgent").length;
    const trialExpired = networkAlerts.filter((a) => a.kind === "trial_expired").length;
    const renewalSoon = networkAlerts.filter((a) => a.kind === "renewal_soon").length;
    const subscriptionExpired = networkAlerts.filter((a) => a.kind === "subscription_expired").length;
    const trialPending = networkAlerts.filter((a) => a.kind === "trial_pending" || a.kind === "trial_urgent").length;
    return {
      trialUrgent,
      trialExpired,
      renewalSoon,
      subscriptionExpired,
      trialPending,
      badge: trialUrgent + trialExpired + renewalSoon + subscriptionExpired + networkAlerts.filter((a) => a.kind === "trial_pending").length,
    };
  }, [networkAlerts]);
  const pendingCenters = centers.filter((center) => center.derived_status === "trial" || center.status === "pending");
  const navigationResults = query.trim().length < 2 ? [] : NAV_ITEMS.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase())).map((item) => ({ id: item.href, href: item.href, type: t("superadmin", "resultTypeSection"), title: item.label, detail: item.description }));
  const centerResults = query.trim().length < 2 ? [] : centers.filter((center) => `${center.name} ${center.city || ""} ${center.creatorEmail || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6).map((center) => ({ id: center.id, href: `/superadmin/centres?focus=${center.id}`, type: t("superadmin", "resultTypeCenter"), title: center.name, detail: center.city || center.creatorEmail || "" }));
  const results = [...navigationResults, ...centerResults, ...studentResults].slice(0, 14);
  const groups = useMemo(() => [...new Set(NAV_ITEMS.map((item) => item.group))], [NAV_ITEMS]);
  const toggleFavorite = useCallback((href: string) => setFavorites((current) => current.includes(href) ? current.filter((item) => item !== href) : [...current, href].slice(-4)), []);

  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace("/login"); };
  if (!authorized) return null;
  if (isBootstrapRoute) return <>{children}</>;

  const bellItems = [
    alertCounts.trialUrgent > 0 && {
      href: "/superadmin/centres?status=trial",
      label: t("superadmin", "alertTrialUrgent").replace("{count}", String(alertCounts.trialUrgent)),
      tone: "bg-red-400",
    },
    alertCounts.trialExpired > 0 && {
      href: "/superadmin/centres?status=trial_expired",
      label: t("superadmin", "alertTrialExpired").replace("{count}", String(alertCounts.trialExpired)),
      tone: "bg-orange-400",
    },
    alertCounts.subscriptionExpired > 0 && {
      href: "/superadmin/centres?status=subscription_expired",
      label: t("superadmin", "alertSubExpired").replace("{count}", String(alertCounts.subscriptionExpired)),
      tone: "bg-red-400",
    },
    alertCounts.renewalSoon > 0 && {
      href: "/superadmin/dashboard",
      label: t("superadmin", "alertRenewalSoon").replace("{count}", String(alertCounts.renewalSoon)),
      tone: "bg-amber-400",
    },
    alertCounts.trialPending > 0 && alertCounts.trialUrgent === 0 && {
      href: "/superadmin/centres?status=trial",
      label: t("superadmin", "requestsToHandle").replace("{count}", String(alertCounts.trialPending)),
      tone: "bg-orange-400",
    },
  ].filter(Boolean) as { href: string; label: string; tone: string }[];

  return (
    <div className={`superadmin-shell ${superadminNotoSans.className} flex h-dvh overflow-hidden ${theme === "light" ? "superadmin-light bg-slate-100 text-slate-900" : "bg-[#05070d] text-slate-100"}`}>
      {mobileOpen && <button aria-label={t("superadmin", "closeMenu")} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`superadmin-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh flex-col border-r border-white/[0.08] bg-[#080d18] shadow-2xl transition-[width,transform] duration-300 lg:static lg:z-auto lg:h-full lg:shrink-0 lg:translate-x-0 ${collapsed ? "lg:w-20" : "lg:w-72"} w-[min(88vw,18rem)] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/[0.07] px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/40"><ShieldCheck className="h-5 w-5 text-white" /></div>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-black uppercase tracking-wider text-white">{t("superadmin", "brandName")}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{t("superadmin", "brandSubtitle")}</p></div>}
          <button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-500 hover:text-white lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label={t("superadmin", "navAriaLabel")}>
          {!collapsed && favorites.length > 0 && <div className="mb-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-1.5"><p className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-500/60">{t("superadmin", "favorites")}</p>{favorites.map((href) => { const item = NAV_ITEMS.find((entry) => entry.href === href); if (!item) return null; return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-amber-200/70 hover:bg-amber-500/10"><Star className="h-3.5 w-3.5 fill-current" />{item.label}</Link>; })}</div>}
          {groups.map((group) => <div key={group} className="mb-5">{!collapsed && <p className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{group}</p>}{NAV_ITEMS.filter((item) => item.group === group).map(({ href, label, description, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); const count = href === "/superadmin/demandes" ? newApplicationsCount : href === "/superadmin/centres" ? pendingCenters.length : href === "/superadmin/dashboard" ? alertCounts.badge : 0; return <Link key={href} href={href} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={`mb-1 flex min-h-12 items-center rounded-xl transition ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}><Icon className="h-4.5 w-4.5 shrink-0" />{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{label}</p><p className={`truncate text-[9px] ${active ? "text-orange-100/70" : "text-slate-600"}`}>{description}</p></div>}{count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{count}</span>}</Link>; })}</div>)}
        </nav>
        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "gap-1"}`}>
            <button onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} title={t("superadmin", "changeTheme")} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 hover:text-white">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{!collapsed && t("superadmin", "theme")}</button>
            <button onClick={() => setCollapsed((value) => !value)} title={t("superadmin", "reduceSidebar")} className="hidden h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 hover:text-white lg:flex">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}{!collapsed && t("superadmin", "reduce")}</button>
          </div>
          <button onClick={handleSignOut} className={`mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-red-500/10 hover:text-red-300`}><LogOut className="h-4 w-4" />{!collapsed && t("superadmin", "signOut")}</button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#05070d]/90 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobileOpen(true)} aria-label={t("superadmin", "openMenu")} className="rounded-xl border border-white/[0.07] p-2.5 text-slate-400 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-400">{activeItem.group}</p><h1 className="truncate text-base font-black text-white">{activeItem.label}</h1></div>
          <LanguageSwitcher compact dark />
          <button onClick={() => setCommandOpen(true)} className="hidden items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white sm:flex"><Search className="h-4 w-4" /><span className="hidden xl:inline">{t("superadmin", "globalSearch")}</span><kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-600 xl:inline">Ctrl K</kbd></button>
          <button onClick={() => toggleFavorite(activeItem.href)} aria-label={t("superadmin", "addToFavorites")} className={`hidden rounded-xl border p-2.5 sm:block ${favorites.includes(activeItem.href) ? "border-amber-400/30 bg-amber-400/10 text-amber-400" : "border-white/[0.07] text-slate-500"}`}><Star className={`h-4 w-4 ${favorites.includes(activeItem.href) ? "fill-current" : ""}`} /></button>
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label={t("superadmin", "notifications")}
              aria-expanded={notificationsOpen}
              className="relative rounded-xl border border-white/[0.07] p-2.5 text-slate-400"
            >
              <Bell className="h-4 w-4" />
              {alertCounts.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                  {alertCounts.badge}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-[min(22rem,85vw)] rounded-2xl border border-white/10 bg-[#0b1120] p-2 shadow-2xl">
                <p className="px-3 py-2 text-xs font-black uppercase tracking-wider text-white">{t("superadmin", "toHandle")}</p>
                {bellItems.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-slate-500">{t("superadmin", "allUpToDate")}</p>
                ) : (
                  <div className="custom-scrollbar max-h-72 space-y-1 overflow-y-auto">
                    {bellItems.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5"
                      >
                        <span className={`h-2 w-2 rounded-full ${item.tone}`} />
                        <span className="flex-1 text-xs font-bold text-slate-300">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {email && <span className="hidden max-w-40 truncate text-[10px] font-medium text-slate-500 2xl:block">{email}</span>}
        </header>
        <main className="custom-scrollbar mx-auto w-full max-w-[1600px] flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <SuperadminCentersContext.Provider value={{ centers, loading: centersLoading, error: centersError, refresh: refreshCenters }}>
            {children}
          </SuperadminCentersContext.Provider>
        </main>
      </div>

      {commandOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 px-4 pt-[10vh] backdrop-blur-sm" onClick={() => setCommandOpen(false)}><div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1120] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex h-16 items-center gap-3 border-b border-white/[0.07] px-5"><Command className="h-5 w-5 text-orange-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("superadmin", "searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-600" /><kbd className="rounded border border-white/10 px-2 py-1 text-[9px] text-slate-500">ESC</kbd></div><div className="custom-scrollbar max-h-[55vh] overflow-y-auto p-2">{query.trim().length < 2 && <p className="px-4 py-10 text-center text-sm text-slate-500">{t("superadmin", "searchNetworkPrompt")}</p>}{searching && <div className="space-y-2 p-2">{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>}{!searching && query.trim().length >= 2 && results.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">{t("superadmin", "noResults")}</p>}{!searching && results.map((result) => <Link key={`${result.type}-${result.id}`} href={result.href} onClick={() => { setCommandOpen(false); setQuery(""); }} className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-xs font-black text-orange-400">{result.type[0]}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{result.title}</p><p className="truncate text-xs text-slate-500">{result.type} · {result.detail}</p></div><ChevronRight className="h-4 w-4 text-slate-700" /></Link>)}</div></div></div>}
    </div>
  );
}
