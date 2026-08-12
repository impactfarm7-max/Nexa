"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PauseCircle, UserRound } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import PresenceTracker from "./PresenceTracker";
import SiteAnalyticsTracker from "./SiteAnalyticsTracker";
import CommunityBubble from "./CommunityBubble";
import {
  loadStudentAccess,
  peekStudentAccess,
  resolveCenterGuardStatus,
} from "@/app/utils/student-access-cache";
import { isPublicAppRoute } from "@/app/utils/public-routes";
import { BRAND } from "@/app/utils/brand";
import { initPwaInstallCapture } from "@/app/utils/pwa-install";
import { useI18n } from "@/app/i18n/I18nProvider";
import { isViewAsStudentPreview } from "@/app/utils/view-as";
import SaViewAsBanner from "./SaViewAsBanner";

const EXAM_PASSAGE_KEY = "nexa_exam_passage";

function isPinUnlocked() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("is_unlocked") === "true";
}

function isImmersiveExamPassage(pathname: string | null) {
  if (typeof window === "undefined" || !pathname) return false;
  return (
    pathname.startsWith("/tcf-canada/simulateur/examen") &&
    sessionStorage.getItem(EXAM_PASSAGE_KEY) === "1"
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, setLocaleOverride } = useI18n();
  const isPublic = isPublicAppRoute(pathname);
  const isProfilePage = Boolean(pathname?.startsWith("/profil"));

  useEffect(() => {
    initPwaInstallCapture();
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/centre")) return;
    if (isPublic) {
      setLocaleOverride(null);
      return () => setLocaleOverride(null);
    }
    let cancelled = false;
    const apply = (centerType?: string | null) => {
      if (cancelled) return;
      const isTcfExperience = pathname?.startsWith("/tcf-canada") || centerType === "tcf_canada";
      setLocaleOverride(isTcfExperience ? "fr" : null);
    };
    apply(peekStudentAccess()?.centerType);
    void loadStudentAccess().then((access) => apply(access?.centerType));
    return () => {
      cancelled = true;
      setLocaleOverride(null);
    };
  }, [isPublic, pathname, setLocaleOverride]);

  const hideSidebar =
    pathname?.includes("/quiz") ||
    pathname?.startsWith("/tcf-canada/comprehension/ecrit") ||
    pathname?.startsWith("/tcf-canada/comprehension/orale") ||
    pathname?.startsWith("/tcf-canada/live/room") ||
    pathname?.startsWith("/dashboard/examen-complet") ||
    pathname?.startsWith("/dashboard/coaching/room");

  const [showSidebar, setShowSidebar] = useState(false);
  const [immersiveExam, setImmersiveExam] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [centerName, setCenterName] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const inExamPassage = isImmersiveExamPassage(pathname);
      setImmersiveExam(inExamPassage);

      if (isPublic || hideSidebar || inExamPassage) {
        setShowSidebar(false);
        return;
      }

      if (isViewAsStudentPreview()) {
        setShowSidebar(true);
        return;
      }

      const access = peekStudentAccess();
      if (!access?.profile?.pin_hash) {
        setShowSidebar(true);
        return;
      }
      setShowSidebar(isPinUnlocked());
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("nexa-sidebar-sync", sync);
    const id = window.setInterval(sync, 200);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("nexa-sidebar-sync", sync);
      window.clearInterval(id);
    };
  }, [isPublic, hideSidebar, pathname]);

  useEffect(() => {
    if (isPublic) {
      setIsPaused(false);
      setCenterName(null);
      setPauseReason(null);
      return;
    }

    let cancelled = false;

    const apply = (access: NonNullable<ReturnType<typeof peekStudentAccess>>) => {
      if (!access.profile.center_id) {
        setIsPaused(false);
        setCenterName(null);
        setPauseReason(null);
        return;
      }
      const resolved = resolveCenterGuardStatus(access.profile, access.centerInfo);
      setIsPaused(resolved.status === "paused");
      setCenterName(access.centerName);
      setPauseReason(
        resolved.status === "paused" ? access.profile.access_pause_reason || null : null,
      );
    };

    const cached = peekStudentAccess();
    if (cached) apply(cached);

    void (async () => {
      const access = await loadStudentAccess();
      if (cancelled || !access) return;
      apply(access);
    })();

    return () => {
      cancelled = true;
    };
  }, [isPublic, pathname]);

  if (isPublic) {
    return (
      <>
        <SaViewAsBanner />
        <SiteAnalyticsTracker />
        {children}
      </>
    );
  }

  const presenceTracker = <PresenceTracker />;
  const hideBubble = pathname === "/dashboard" || pathname?.startsWith("/communaute") || isPaused;
  const communityBubble = hideBubble ? null : <CommunityBubble />;
  const shouldHideSidebar = hideSidebar || immersiveExam;
  const lockContent = isPaused && !isProfilePage;

  const pausedOverlay = lockContent ? (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center bg-white/55 backdrop-blur-[1px] px-4 pt-10 sm:pt-16">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-blue-100 bg-white p-5 sm:p-6 text-center shadow-xl">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${BRAND.blue}12` }}
        >
          <PauseCircle className="h-7 w-7" style={{ color: BRAND.blue }} />
        </div>
        <p className="text-lg font-black" style={{ color: BRAND.blue }}>
          {t("dashboard", "profilPausedTitle")}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
          {t("dashboard", "profilPausedBodyPrefix")}
          {centerName ? <> {t("dashboard", "profilPausedBy")} <strong>{centerName}</strong></> : ` ${t("dashboard", "profilPausedByYourCenter")}`}.
          {" "}{t("dashboard", "profilPausedContact")}
        </p>
        {pauseReason && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{t("dashboard", "profilPausedReasonLabel")}</p>
            <p className="mt-1 text-sm font-bold text-blue-900 leading-relaxed">{pauseReason}</p>
          </div>
        )}
        <Link
          href="/profil"
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:opacity-90"
          style={{ backgroundColor: BRAND.orange }}
        >
          <UserRound className="h-4 w-4" />
          {t("dashboard", "profilPausedViewProfile")}
        </Link>
      </div>
    </div>
  ) : null;

  const mainContent = (
    <div className="relative w-full" style={{ minHeight: "100dvh" }}>
      <div
        className={
          lockContent
            ? "select-none pointer-events-none opacity-40 grayscale-[0.35]"
            : undefined
        }
        aria-hidden={lockContent || undefined}
      >
        {children}
      </div>
      {pausedOverlay}
    </div>
  );

  if (shouldHideSidebar) {
    return (
      <>
        <SaViewAsBanner />
        <main className="w-full relative" style={{ minHeight: "100dvh" }}>
          {presenceTracker}
          {mainContent}
        </main>
      </>
    );
  }

  const sidebarWidth = showSidebar ? "var(--nexa-sidebar-w, 16rem)" : "0px";

  return (
    <>
      <SaViewAsBanner />
      <SiteAnalyticsTracker />
      {presenceTracker}
      <div className="flex w-full overflow-x-hidden" style={{ minHeight: "100dvh" }}>
        {showSidebar && <Sidebar />}
        <div
          className="flex-1 flex flex-col min-w-0 w-full transition-[margin] duration-300 ease-in-out"
          style={{ marginLeft: sidebarWidth }}
        >
          <main className="flex-1 w-full relative">{mainContent}</main>
        </div>
      </div>
      {communityBubble}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  );
}
