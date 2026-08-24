"use client";



import Link from "next/link";

import { usePathname } from "next/navigation";

import { useEffect, useState } from "react";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { supabase } from "../utils/supabase";

import { getStudentNavPaths } from "../utils/student-routes";

import { getStudentNavItems } from "../utils/studentNavItems";

import { useTutorGlobalLock } from "../hooks/useTutorGlobalLock";

import { BRAND, STUDENT_TEXT } from "../utils/brand";
import { peekStudentAccess } from "../utils/student-access-cache";
import ProfileAvatar from "./ProfileAvatar";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "@/app/i18n/I18nProvider";



const SIDEBAR_W_VAR = "--nexa-sidebar-w";

const COLLAPSE_KEY = "nexa_sidebar_collapsed";

const ORANGE = "#eb670e";

const BLUE_LIGHT = "#1a3066";

const BLUE_DEEP = "#0d1a3d";



function sidebarWidthPx(collapsed: boolean): string {

  if (typeof window === "undefined") return collapsed ? "5rem" : "16rem";

  const w = window.innerWidth;

  if (w < 768) return "0px";

  if (collapsed) {

    if (w >= 1536) return "6rem";

    if (w >= 1280) return "5.5rem";

    return "5rem";

  }

  if (w >= 1536) return "20rem";

  if (w >= 1280) return "18rem";

  return "16rem";

}



export default function Sidebar() {
  const { t } = useI18n();

  const pathname = usePathname();

  const [isAdmin, setIsAdmin] = useState(false);

  const tutorLock = useTutorGlobalLock(isAdmin);

  const [userName, setUserName] = useState(t("dashboard", "sidebarDefaultStudentName"));
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  const cachedAccess = peekStudentAccess();
  const [centerId, setCenterId] = useState<string | null>(
    () => cachedAccess?.profile.center_id ?? null,
  );
  const [centerName, setCenterName] = useState<string | null>(
    () => cachedAccess?.centerName ?? null,
  );
  const [centerLogoUrl, setCenterLogoUrl] = useState<string | null>(null);
  const [centerType, setCenterType] = useState<string | null>(
    () => cachedAccess?.centerType ?? null,
  );

  const [isCollapsed, setIsCollapsed] = useState(false);

  const [hydrated, setHydrated] = useState(false);



  const toggleCollapse = () => {

    setIsCollapsed((prev) => {

      const next = !prev;

      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");

      return next;

    });

  };



  useEffect(() => {

    const saved = localStorage.getItem(COLLAPSE_KEY);

    if (saved === "1") setIsCollapsed(true);

    setHydrated(true);

  }, []);



  useEffect(() => {

    const updateWidthVar = () => {

      document.documentElement.style.setProperty(SIDEBAR_W_VAR, sidebarWidthPx(isCollapsed));

    };

    updateWidthVar();

    window.addEventListener("resize", updateWidthVar);

    return () => window.removeEventListener("resize", updateWidthVar);

  }, [isCollapsed]);



  useEffect(() => {

    const fetchUserData = async () => {

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const { data: profile } = await supabase

        .from("profiles")

        .select("role, prenom, center_id, avatar_url")

        .eq("id", session.user.id)

        .single();



      if (profile?.role === "admin") setIsAdmin(true);

      if (profile?.prenom) setUserName(profile.prenom);
      setUserAvatarUrl((profile?.avatar_url as string | null) || null);

      const cId = (profile?.center_id as string | null) || null;
      setCenterId(cId);

      if (!cId) {
        setCenterName(null);
        setCenterLogoUrl(null);
        setCenterType(null);
        return;
      }

      const cached = peekStudentAccess();
      if (cached?.centerName) setCenterName(cached.centerName);
      if (cached?.centerType) setCenterType(cached.centerType);

      const [{ data: center }, { data: branding }] = await Promise.all([
        supabase.from("centers").select("name, center_type").eq("id", cId).maybeSingle(),
        supabase.from("center_branding").select("logo_url").eq("center_id", cId).maybeSingle(),
      ]);

      if (center?.name) setCenterName(center.name);
      if (center?.center_type) setCenterType(center.center_type);
      setCenterLogoUrl((branding?.logo_url as string | null) || null);
    };

    fetchUserData();

  }, []);



  const hiddenRoutes = ["/login", "/", "/choix", "/onboarding", "/pin", "/cgu", "/politique-confidentialite"];

  if (

    hiddenRoutes.includes(pathname || "") ||

    pathname?.includes("/quiz") ||

    pathname?.includes("/resultat")

  ) {

    return null;

  }



  const navPaths = getStudentNavPaths(centerId);

  const navItems = getStudentNavItems({ centerId, centerType });
  const isTcfExperience = centerType === "tcf_canada" || pathname?.startsWith("/tcf-canada");
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

  const isCenterStudent = Boolean(centerId);
  const brandTitle = isCenterStudent ? (centerName || t("dashboard", "sidebarMyCenter")) : "NEXA";
  const brandTagline = isCenterStudent ? t("dashboard", "sidebarPoweredByNexa") : t("dashboard", "sidebarElite");

  const brandLogoBox = (size: "md" | "sm") => {
    const box =
      size === "md"
        ? "w-9 h-9 md:w-10 md:h-10 xl:w-11 xl:h-11 2xl:w-12 2xl:h-12 rounded-xl xl:rounded-2xl"
        : "w-8 h-8 md:w-9 md:h-9 xl:w-10 xl:h-10 rounded-xl";

    if (isCenterStudent && centerLogoUrl) {
      return (
        <div className={`${box} flex items-center justify-center shrink-0 shadow-lg overflow-hidden bg-white`}>
          <img src={centerLogoUrl} alt={brandTitle} className="w-full h-full object-cover" />
        </div>
      );
    }

    if (isCenterStudent) {
      const initial = (centerName || "C").charAt(0).toUpperCase();
      return (
        <div
          className={`${box} flex items-center justify-center shrink-0 shadow-lg font-black text-white`}
          style={{ backgroundColor: ORANGE, boxShadow: `0 8px 20px ${ORANGE}40` }}
        >
          <span className={size === "md" ? "text-sm md:text-base xl:text-lg" : "text-xs md:text-sm"}>{initial}</span>
        </div>
      );
    }

    return (
      <div className={`${box} flex items-center justify-center shrink-0 shadow-lg overflow-hidden bg-[#11224E]`}>
        <img
          src={BRAND.logo}
          alt="NEXA"
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  const bg = `linear-gradient(175deg, ${BLUE_LIGHT} 0%, ${BRAND.blue} 58%, ${BLUE_DEEP} 100%)`;



  const itemCls = (isActive: boolean) =>

    [

      "relative flex items-center min-w-0 rounded-xl xl:rounded-2xl transition-all duration-150 group",

      isCollapsed

        ? "justify-center py-3 md:py-3.5 xl:py-4 2xl:py-[1.125rem] px-0"

        : "gap-2.5 md:gap-3 xl:gap-3.5 2xl:gap-4 px-3 md:px-3.5 xl:px-4 2xl:px-5 py-2.5 md:py-3 xl:py-3.5 2xl:py-4",

      isActive

        ? `${STUDENT_TEXT.sidebarItemActive} text-white shadow-lg shadow-black/20`

        : `${STUDENT_TEXT.sidebarItemIdle} text-white/60 hover:text-white/90 hover:bg-white/10`,

    ].join(" ");



  const iconCls = (isActive: boolean) =>

    `shrink-0 w-4 h-4 md:w-[17px] md:h-[17px] xl:w-5 xl:h-5 2xl:w-[22px] 2xl:h-[22px] ${

      isActive ? "text-white" : "text-white/50 group-hover:text-white/80"

    }`;



  return (

    <aside

      className={`hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out select-none overflow-hidden ${

        isCollapsed ? "w-20 xl:w-[5.5rem] 2xl:w-24" : "w-64 xl:w-72 2xl:w-80"

      } ${hydrated ? "" : "invisible"}`}

      style={{ background: bg }}

    >

      {/* Header */}

      <div

        className={`flex items-center gap-2 md:gap-2.5 xl:gap-3 border-b shrink-0 transition-all duration-300 ${

          isCollapsed

            ? "h-16 md:h-[4.25rem] xl:h-[4.5rem] 2xl:h-20 justify-center flex-col py-2 md:py-2.5 px-2"

            : "h-[68px] md:h-[4.5rem] xl:h-20 2xl:h-[5.5rem] px-3 md:px-3.5 xl:px-4 2xl:px-5"

        }`}

        style={{ borderColor: "rgba(255,255,255,0.08)" }}

      >

        {!isCollapsed && (

          <div

            onClick={() => window.location.reload()}

            className="flex items-center gap-2 md:gap-2.5 xl:gap-3 flex-1 min-w-0 cursor-pointer"

          >

            {brandLogoBox("md")}

            <div className="flex-1 min-w-0 overflow-hidden">

              <p className={`${STUDENT_TEXT.sidebarBrand} text-white truncate`}>{brandTitle}</p>

              <p className={`${STUDENT_TEXT.sidebarTagline} truncate`} style={{ color: ORANGE }}>

                {brandTagline}

              </p>

            </div>

          </div>

        )}



        {isCollapsed && (

          <div

            onClick={() => window.location.reload()}

            className="w-8 h-8 md:w-9 md:h-9 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"

            style={{ backgroundColor: "rgba(0,0,0,0.22)" }}

          >

          {brandLogoBox("sm")}

          </div>

        )}



        <button

          onClick={toggleCollapse}

          title={isCollapsed ? t("common", "expand") : t("common", "collapse")}

          className={`rounded-xl p-1.5 md:p-2 xl:p-2.5 transition-all hover:bg-white/10 text-white/50 hover:text-white shrink-0 ${

            isCollapsed ? "mt-1" : ""

          }`}

        >

          {isCollapsed ? (

            <PanelLeftOpen className="w-4 h-4 md:w-[17px] md:h-[17px] xl:w-5 xl:h-5" />

          ) : (

            <PanelLeftClose className="w-4 h-4 md:w-[17px] md:h-[17px] xl:w-5 xl:h-5" />

          )}

        </button>

      </div>



      {/* Navigation */}

      <nav className="nexa-student-sidebar-nav flex-1 px-2 md:px-2.5 xl:px-3.5 2xl:px-4 py-3 md:py-3.5 xl:py-4 2xl:py-5 space-y-0.5 md:space-y-1 xl:space-y-1.5 2xl:space-y-2 overflow-y-auto overflow-x-hidden min-h-0">

        {!isCollapsed && (

          <p

            className={`px-3 md:px-3.5 xl:px-4 2xl:px-5 pt-1 xl:pt-1.5 pb-2 xl:pb-2.5 ${STUDENT_TEXT.sidebarSection} text-white/30 select-none truncate`}

          >

            {t("common", "myJourney")}

          </p>

        )}

        {isCollapsed && (

          <div

            className="mx-2 md:mx-3 xl:mx-4 my-2 md:my-2.5 xl:my-3 border-t"

            style={{ borderColor: "rgba(255,255,255,0.12)" }}

          />

        )}



        {!isTcfExperience && !isCollapsed && <div className="px-2 pb-2"><LanguageSwitcher dark /></div>}

        {navItems.map((item) => {

          const isActive = pathname === item.path;

          const Icon = item.icon;

          return (

            <Link

              key={item.path}

              href={item.path}

              title={isCollapsed ? navLabel(item) : undefined}

              className={itemCls(isActive)}

              style={isActive ? { backgroundColor: ORANGE } : undefined}

            >

              {isActive && (

                <span

                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/90"

                  style={{ width: 3, height: "60%" }}

                />

              )}

              <Icon strokeWidth={isActive ? 2.5 : 2} className={iconCls(isActive)} />

              {!isCollapsed && (

                <span className={`${STUDENT_TEXT.sidebarItem} truncate flex-1 min-w-0`}>{navLabel(item)}</span>

              )}

              {item.tutorLockBadge && tutorLock.locked && (

                <span

                  className={`${isCollapsed ? "absolute top-1.5 right-1.5" : "ml-auto shrink-0"} rounded-md px-1.5 py-0.5 md:px-2 md:py-0.5 ${STUDENT_TEXT.sidebarSection} text-white`}

                  style={{ backgroundColor: "rgba(0,0,0,0.25)" }}

                  title={tutorLock.countdownLabel}

                >

                  J-{tutorLock.daysRemaining}

                </span>

              )}

            </Link>

          );

        })}



      </nav>



      {/* Profil */}

      <div

        className="px-2 md:px-2.5 xl:px-3.5 2xl:px-4 py-3 md:py-3.5 xl:py-4 2xl:py-5 shrink-0 border-t"

        style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.12)" }}

      >

        <Link

          href={navPaths.profil}

          title={isCollapsed ? `${t("dashboard", "sidebarProfileTitle")} : ${userName}` : undefined}

          className={`flex items-center min-w-0 rounded-xl xl:rounded-2xl transition-colors hover:bg-white/10 ${

            isCollapsed

              ? "justify-center p-2 md:p-2.5 xl:p-3"

              : "gap-2.5 md:gap-3 xl:gap-3.5 px-2.5 md:px-3 xl:px-3.5 2xl:px-4 py-2 md:py-2.5 xl:py-3"

          }`}

        >

          <ProfileAvatar
            url={userAvatarUrl}
            name={userName}
            size="w-8 h-8 md:w-9 md:h-9 xl:w-10 xl:h-10 2xl:w-11 2xl:h-11"
            fallbackClassName="font-display font-black text-white text-[11px] md:text-xs xl:text-sm 2xl:text-base"
            fallbackStyle={{ backgroundColor: ORANGE }}
          />

          {!isCollapsed && (

            <div className="flex-1 min-w-0 overflow-hidden">

              <p className={`${STUDENT_TEXT.sidebarMeta} text-white/40 truncate`}>{t("dashboard", "sidebarMyAccount")}</p>

              <p className={`${STUDENT_TEXT.sidebarProfile} text-white truncate mt-0.5`}>{userName}</p>

            </div>

          )}

        </Link>

      </div>

    </aside>

  );

}


