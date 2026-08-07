"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Plus,
  X,
  User,
  HeadphonesIcon,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { getStudentNavPaths } from "../utils/student-routes";
import {
  getBottomBarPrimaryItems,
  getBottomSheetNavItems,
  STUDENT_ADMIN_NAV_ITEM,
} from "../utils/studentNavItems";
import { useTutorGlobalLock } from "../hooks/useTutorGlobalLock";
import { motion, AnimatePresence } from "framer-motion";
import { peekStudentAccess } from "../utils/student-access-cache";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const cachedAccess = peekStudentAccess();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [centerId, setCenterId] = useState<string | null>(
    () => cachedAccess?.profile.center_id ?? null,
  );
  const [centerType, setCenterType] = useState<string | null>(
    () => cachedAccess?.centerType ?? null,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tutorLock = useTutorGlobalLock(isAdmin);

  const navLabel = (item: { label: string; labelKey?: string } | string) => {
    if (typeof item !== "string" && item.labelKey) return t("dashboard", item.labelKey);
    const label = typeof item === "string" ? item : item.label;
    const keys: Record<string, string> = {
      "Tableau de bord": "navDashboard", Accueil: "navHome",
      "Mon tuteur": "navTutor", Tuteur: "navTutorShort",
      "Session Live": "navLive", Live: "navLive",
      "Cours et Quiz": "navCoursesQuiz", "Mes cours": "navCourses", Cours: "navCoursesShort",
      "Mes Devoirs": "navHomework", Devoirs: "navHomeworkShort",
      "Bibliothèque": "navLibrary", "Mode Examen": "navExamMode", Examen: "navExamShort",
    };
    return keys[label] ? t("dashboard", keys[label]) : label;
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, center_id")
        .eq("id", session.user.id)
        .single();

      const profileCenterId = (profile?.center_id as string | null) || null;
      setCenterId(profileCenterId);

      if (profileCenterId) {
        const { data: center } = await supabase
          .from("centers")
          .select("center_type")
          .eq("id", profileCenterId)
          .maybeSingle();
        setCenterType(center?.center_type ?? null);
      } else {
        setCenterType(null);
      }

      if (profile?.role === "admin") {
        setIsAdmin(true);
        return;
      }

      let unreadQuery = supabase
        .from("private_messages")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", session.user.id)
        .is("read_at", null);

      unreadQuery = profileCenterId ? unreadQuery.eq("center_id", profileCenterId) : unreadQuery.is("center_id", null);
      const { count } = await unreadQuery;

      if (count) setUnreadCount(count);
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId || isAdmin) return;
    let ch: ReturnType<typeof supabase.channel> | undefined;
    const setupListener = () => {
      ch = supabase.channel("pm_badge_" + userId)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "private_messages", filter: `to_user_id=eq.${userId}` },
        (payload) => {
          const rowCenterId = (payload.new as { center_id?: string | null })?.center_id || null;
          if (rowCenterId === centerId) setUnreadCount((n) => n + 1);
        }).subscribe();
    };
    setupListener();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [userId, isAdmin, centerId]);

  useEffect(() => {
    if (pathname === "/messages" || pathname === "/centre/student/messages") setUnreadCount(0);
  }, [pathname]);

  const hiddenRoutes = ["/login", "/", "/choix", "/onboarding", "/pin", "/cgu", "/politique-confidentialite"];
  const hideOnImmersiveChat =
    pathname === "/communaute" ||
    pathname === "/tuteur" ||
    pathname?.startsWith("/centre/student/communaute");
  if (
    hiddenRoutes.includes(pathname || "") ||
    hideOnImmersiveChat ||
    pathname?.startsWith("/admin") ||
    pathname?.includes("/quiz") ||
    pathname?.includes("/resultat") ||
    pathname?.startsWith("/tcf-canada/comprehension/orale")
  ) {
    return null;
  }

  const navPaths = getStudentNavPaths(centerId);
  const { left: leftNavItems, right: rightNavItems } = getBottomBarPrimaryItems({ centerId, centerType });
  const sheetNavItems = getBottomSheetNavItems({ centerId, centerType });

  const renderNavLink = (
    item: (typeof leftNavItems)[number],
    options?: { showTutorBadge?: boolean },
  ) => {
    const isActive = pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        href={item.path}
        className="relative flex flex-col items-center justify-center w-full active:scale-95 transition-transform min-w-0 px-0.5"
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-[#11224E]" : "text-slate-400"} />
        {options?.showTutorBadge && item.tutorLockBadge && tutorLock.locked && (
          <span className="absolute -top-0.5 right-[18%] rounded bg-orange-500 px-1 py-px text-[8px] font-black text-white">
            J-{tutorLock.daysRemaining}
          </span>
        )}
        <span className={`text-[10px] mt-1 text-center leading-tight transition-colors truncate max-w-full ${isActive ? "text-[#11224E] font-bold" : "text-slate-400 font-medium"}`}>
          {navLabel({
            label: item.shortLabel ?? item.label,
            labelKey: item.shortLabelKey ?? item.labelKey,
          })}
        </span>
      </Link>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-[#11224E]/60 backdrop-blur-sm z-[45]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="md:hidden fixed bottom-[calc(70px+env(safe-area-inset-bottom))] left-3 right-3 max-h-[min(70vh,520px)] overflow-y-auto bg-white rounded-3xl shadow-2xl p-4 z-[50] border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm font-black text-[#11224E]">{t("dashboard", "mobileNavigation")}</p>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                aria-label={t("dashboard", "mobileCloseMenu")}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {sheetNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                      isActive ? "bg-[#11224E]/10 ring-2 ring-[#11224E]/20" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? "bg-[#11224E] text-white" : "bg-[#11224E]/10 text-[#11224E]"}`}>
                      <Icon size={22} />
                    </div>
                    {item.tutorLockBadge && tutorLock.locked && (
                      <span className="absolute top-3 right-3 rounded bg-orange-500 px-1.5 py-0.5 text-[8px] font-black text-white">
                        J-{tutorLock.daysRemaining}
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-700 text-center leading-tight">{navLabel(item)}</span>
                  </Link>
                );
              })}

              <Link
                href={navPaths.profil}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                  pathname === navPaths.profil ? "bg-[#11224E]/10 ring-2 ring-[#11224E]/20" : "bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#11224E]/10 flex items-center justify-center text-[#11224E]">
                  <User size={22} />
                </div>
                <span className="text-xs font-bold text-slate-700">{t("dashboard", "mobileProfile")}</span>
              </Link>

              <Link
                href={navPaths.messages}
                className="relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#eb670e]/10 flex items-center justify-center text-[#eb670e]">
                  <HeadphonesIcon size={22} />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-700">{t("dashboard", "mobileSupport")}</span>
              </Link>

              {isAdmin && (
                <Link
                  href={STUDENT_ADMIN_NAV_ITEM.path}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors col-span-2 ${
                    pathname === STUDENT_ADMIN_NAV_ITEM.path ? "bg-orange-50 ring-2 ring-orange-200" : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-[#eb670e]">
                    <ShieldCheck size={22} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{t("dashboard", "navAdmin")}</span>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[60]">
        <nav className="flex justify-between items-center h-[70px] pb-[env(safe-area-inset-bottom)] px-1 sm:px-2">
          <div className="flex flex-1 justify-around min-w-0">
            {leftNavItems.map((item) => renderNavLink(item, { showTutorBadge: true }))}
          </div>

          <div className="relative -top-5 flex justify-center w-[72px] sm:w-[80px] shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative w-14 h-14 bg-[#eb670e] rounded-full flex items-center justify-center shadow-lg shadow-[#eb670e]/40 border-4 border-white transition-transform active:scale-90"
              aria-label={t("dashboard", "mobileOpenMenu")}
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Plus size={28} className="text-white" strokeWidth={3} />
              </motion.div>
              {unreadCount > 0 && !isMenuOpen && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full" />
              )}
            </button>
          </div>

          <div className="flex flex-1 justify-around min-w-0">
            {rightNavItems.map((item) => renderNavLink(item))}
          </div>
        </nav>
      </div>
    </>
  );
}
