"use client";

import DashboardShell from "./components/DashboardShell";
import DashboardStatsSkeleton from "./components/DashboardStatsSkeleton";
import GenericManagerDashboard from "./components/GenericManagerDashboard";
import TcfManagerDashboard from "./components/TcfManagerDashboard";
import TrainerWeekSchedule from "@/app/components/TrainerWeekSchedule";
import { useCenterDashboard } from "./hooks/useCenterDashboard";
import { buildCenterSignupUrl } from "@/app/utils/center-signup-link";

export default function CenterDashboardPage() {
  const {
    statsLoading,
    staffPrenom,
    center,
    campuses,
    selectedCampus,
    isTCF,
    genericStats,
    tcfStats,
    copied,
    copyLink,
    handleCampus,
    canAccess,
    role,
  } = useCenterDashboard();

  const isTrainer = role === "trainer";

  return (
    <DashboardShell
      center={center}
      staffPrenom={staffPrenom}
      isTCF={isTCF}
      copied={copied}
      onCopyLink={copyLink}
    >
      {isTrainer ? (
        <div className="mb-6">
          <TrainerWeekSchedule />
        </div>
      ) : null}
      {statsLoading ? (
        <DashboardStatsSkeleton variant={isTCF ? "tcf" : "generic"} />
      ) : isTCF ? (
        <TcfManagerDashboard
          stats={tcfStats}
          campuses={campuses}
          selectedCampus={selectedCampus}
          onCampusChange={handleCampus}
          linkCopied={copied}
          onCopyLink={copyLink}
          canAccess={canAccess}
          showSignupLink={Boolean(center?.signup_slug || center?.code)}
          signupUrl={
            typeof window !== "undefined"
              ? buildCenterSignupUrl(window.location.origin, center)
              : null
          }
        />
      ) : (
        <GenericManagerDashboard
          stats={genericStats}
          campuses={campuses}
          selectedCampus={selectedCampus}
          onCampusChange={handleCampus}
          canAccess={canAccess}
        />
      )}
    </DashboardShell>
  );
}
