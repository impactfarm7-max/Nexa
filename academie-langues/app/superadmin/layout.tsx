"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, Bell, Building2, ChevronRight, Command, Inbox, LayoutDashboard,
  LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck,
  Star, Sun, ScrollText, Users, X,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { superadminFetch } from "../utils/superadmin-api-client";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useI18n } from "@/app/i18n/I18nProvider";

const MFA_SETUP_PATH = "/superadmin/mfa-setup";
const PREFS_KEY = "nexa_superadmin_preferences";

const NAV_CONFIG = [
  { href: "/superadmin/dashboard", labelKey: "navDashboardLabel", descKey: "navDashboardDesc", icon: LayoutDashboard, groupKey: "groupPiloting" },
  { href: "/superadmin/analytics", labelKey: "navAnalyticsLabel", descKey: "navAnalyticsDesc", icon: BarChart3, groupKey: "groupPiloting" },
  { href: "/superadmin/centres", labelKey: "navCentersLabel", descKey: "navCentersDesc", icon: Building2, groupKey: "groupNetwork" },
  { href: "/superadmin/etudiants", labelKey: "navStudentsLabel", descKey: "navStudentsDesc", icon: Users, groupKey: "groupNetwork" },
  { href: "/superadmin/demandes", labelKey: "navRequestsLabel", descKey: "navRequestsDesc", icon: Inbox, groupKey: "groupOperations" },
  { href: "/superadmin/audit", labelKey: "navAuditLabel", descKey: "navAuditDesc", icon: ScrollText, groupKey: "groupSecurity" },
] as const;

type SearchResult = { id: string; href: string; type: string; title: string; detail: string };
type CenterRow = { id: string; name: string; city?: string | null; status: string; creatorEmail?: string | null };

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const NAV_ITEMS = useMemo(
    () =>
      NAV_CONFIG.map((item) => ({
        href: item.href,
        icon: item.icon,
        label: t("superadmin", item.labelKey),
        description: t("superadmin", item.descKey),
        group: t("superadmin", item.groupKey),
      })),
    [t]
  );
  const isMfaSetupRoute = pathname === MFA_SETUP_PATH;
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [studentResults, setStudentResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!profile || profile.role !== "superadmin") return router.replace("/login");
      if (isMfaSetupRoute) {
        if (!cancelled) { setEmail(session.user.email ?? null); setAuthorized(true); }
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        if (aal?.nextLevel !== "aal2") return router.replace(MFA_SETUP_PATH);
        await supabase.auth.signOut();
        return router.replace("/login");
      }
      if (!cancelled) { setEmail(session.user.email ?? null); setAuthorized(true); }
    };
    void checkSuperadmin();
    return () => { cancelled = true; };
  }, [router, isMfaSetupRoute]);

  useEffect(() => {
    if (!authorized || isMfaSetupRoute) return;
    void superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers")
      .then((json) => setCenters(json.centers || []))
      .catch(() => undefined);
  }, [authorized, isMfaSetupRoute]);

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

  const activeItem = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) || NAV_ITEMS[0];
  const pendingCenters = centers.filter((center) => center.status === "pending");
  const navigationResults = query.trim().length < 2 ? [] : NAV_ITEMS.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase())).map((item) => ({ id: item.href, href: item.href, type: t("superadmin", "resultTypeSection"), title: item.label, detail: item.description }));
  const centerResults = query.trim().length < 2 ? [] : centers.filter((center) => `${center.name} ${center.city || ""} ${center.creatorEmail || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6).map((center) => ({ id: center.id, href: "/superadmin/centres", type: t("superadmin", "resultTypeCenter"), title: center.name, detail: center.city || center.creatorEmail || "" }));
  const results = [...navigationResults, ...centerResults, ...studentResults].slice(0, 14);
  const groups = useMemo(() => [...new Set(NAV_ITEMS.map((item) => item.group))], [NAV_ITEMS]);
  const toggleFavorite = useCallback((href: string) => setFavorites((current) => current.includes(href) ? current.filter((item) => item !== href) : [...current, href].slice(-4)), []);

  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace("/login"); };
  if (!authorized) return null;
  if (isMfaSetupRoute) return <>{children}</>;

  return (
    <div className={`superadmin-shell flex min-h-screen ${theme === "light" ? "superadmin-light bg-slate-100 text-slate-900" : "bg-[#05070d] text-slate-100"}`}>
      {mobileOpen && <button aria-label={t("superadmin", "closeMenu")} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`superadmin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.08] bg-[#080d18] shadow-2xl transition-[width,transform] duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${collapsed ? "lg:w-20" : "lg:w-72"} w-[min(88vw,18rem)] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/[0.07] px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-950/40"><ShieldCheck className="h-5 w-5 text-white" /></div>
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-black uppercase tracking-wider text-white">{t("superadmin", "brandName")}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{t("superadmin", "brandSubtitle")}</p></div>}
          <button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-500 hover:text-white lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label={t("superadmin", "navAriaLabel")}>
          {!collapsed && favorites.length > 0 && <div className="mb-5 rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-1.5"><p className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-500/60">{t("superadmin", "favorites")}</p>{favorites.map((href) => { const item = NAV_ITEMS.find((entry) => entry.href === href); if (!item) return null; return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-amber-200/70 hover:bg-amber-500/10"><Star className="h-3.5 w-3.5 fill-current" />{item.label}</Link>; })}</div>}
          {groups.map((group) => <div key={group} className="mb-5">{!collapsed && <p className="mb-1.5 px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{group}</p>}{NAV_ITEMS.filter((item) => item.group === group).map(({ href, label, description, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); const count = href === "/superadmin/demandes" ? pendingCenters.length : 0; return <Link key={href} href={href} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={`mb-1 flex min-h-12 items-center rounded-xl transition ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-orange-500 text-white shadow-lg shadow-orange-950/30" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}><Icon className="h-4.5 w-4.5 shrink-0" />{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{label}</p><p className={`truncate text-[9px] ${active ? "text-orange-100/70" : "text-slate-600"}`}>{description}</p></div>}{count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{count}</span>}</Link>; })}</div>)}
        </nav>
        <div className="border-t border-white/[0.07] p-3">
          <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "gap-1"}`}>
            <button onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} title={t("superadmin", "changeTheme")} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 hover:text-white">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{!collapsed && t("superadmin", "theme")}</button>
            <button onClick={() => setCollapsed((value) => !value)} title={t("superadmin", "reduceSidebar")} className="hidden h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 hover:text-white lg:flex">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}{!collapsed && t("superadmin", "reduce")}</button>
          </div>
          <button onClick={handleSignOut} className={`mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-red-500/10 hover:text-red-300`}><LogOut className="h-4 w-4" />{!collapsed && t("superadmin", "signOut")}</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-white/[0.07] bg-[#05070d]/90 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobileOpen(true)} aria-label={t("superadmin", "openMenu")} className="rounded-xl border border-white/[0.07] p-2.5 text-slate-400 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-400">{activeItem.group}</p><h1 className="truncate text-base font-black text-white">{activeItem.label}</h1></div>
          <LanguageSwitcher compact dark />
          <button onClick={() => setCommandOpen(true)} className="hidden items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-white sm:flex"><Search className="h-4 w-4" /><span className="hidden xl:inline">{t("superadmin", "globalSearch")}</span><kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-600 xl:inline">Ctrl K</kbd></button>
          <button onClick={() => toggleFavorite(activeItem.href)} aria-label={t("superadmin", "addToFavorites")} className={`hidden rounded-xl border p-2.5 sm:block ${favorites.includes(activeItem.href) ? "border-amber-400/30 bg-amber-400/10 text-amber-400" : "border-white/[0.07] text-slate-500"}`}><Star className={`h-4 w-4 ${favorites.includes(activeItem.href) ? "fill-current" : ""}`} /></button>
          <div className="relative"><button onClick={() => setNotificationsOpen((value) => !value)} aria-label={t("superadmin", "notifications")} className="relative rounded-xl border border-white/[0.07] p-2.5 text-slate-400"><Bell className="h-4 w-4" />{pendingCenters.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{pendingCenters.length}</span>}</button>{notificationsOpen && <div className="absolute right-0 top-12 w-[min(22rem,85vw)] rounded-2xl border border-white/10 bg-[#0b1120] p-2 shadow-2xl"><p className="px-3 py-2 text-xs font-black uppercase tracking-wider text-white">{t("superadmin", "toHandle")}</p>{pendingCenters.length === 0 ? <p className="px-3 py-6 text-center text-xs text-slate-500">{t("superadmin", "allUpToDate")}</p> : <Link href="/superadmin/demandes" onClick={() => setNotificationsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-white/5"><span className="h-2 w-2 rounded-full bg-orange-400" /><span className="flex-1 text-xs font-bold text-slate-300">{t("superadmin", "requestsToHandle").replace("{count}", String(pendingCenters.length))}</span><ChevronRight className="h-4 w-4 text-slate-600" /></Link>}</div>}</div>
          {email && <span className="hidden max-w-40 truncate text-[10px] font-medium text-slate-500 2xl:block">{email}</span>}
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>

      {commandOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 px-4 pt-[10vh] backdrop-blur-sm" onClick={() => setCommandOpen(false)}><div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1120] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex h-16 items-center gap-3 border-b border-white/[0.07] px-5"><Command className="h-5 w-5 text-orange-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("superadmin", "searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-600" /><kbd className="rounded border border-white/10 px-2 py-1 text-[9px] text-slate-500">ESC</kbd></div><div className="custom-scrollbar max-h-[55vh] overflow-y-auto p-2">{query.trim().length < 2 && <p className="px-4 py-10 text-center text-sm text-slate-500">{t("superadmin", "searchNetworkPrompt")}</p>}{searching && <div className="space-y-2 p-2">{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>}{!searching && query.trim().length >= 2 && results.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">{t("superadmin", "noResults")}</p>}{!searching && results.map((result) => <Link key={`${result.type}-${result.id}`} href={result.href} onClick={() => { setCommandOpen(false); setQuery(""); }} className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-xs font-black text-orange-400">{result.type[0]}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{result.title}</p><p className="truncate text-xs text-slate-500">{result.type} · {result.detail}</p></div><ChevronRight className="h-4 w-4 text-slate-700" /></Link>)}</div></div></div>}
    </div>
  );
}
