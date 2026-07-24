"use client";

import { Clock, LayoutDashboard } from "lucide-react";
import CenterNotifications from "@/app/components/CenterNotifications";
import { buildCenterSignupUrl } from "@/app/utils/center-signup-link";
import type { CenterInfo } from "../types";
import { PendingBanner, BLUE, ORANGE } from "../dashboard-ui";
import { greeting, todayLabel } from "../utils";
import ShareSignupLinkMenu from "./ShareSignupLinkMenu";

type Props = {
  center: CenterInfo | null;
  staffPrenom: string;
  isTCF: boolean;
  copied: boolean;
  onCopyLink: () => void;
  children: React.ReactNode;
};

export default function DashboardShell({
  center,
  staffPrenom,
  isTCF,
  copied,
  onCopyLink,
  children,
}: Props) {
  const signupUrl =
    typeof window !== "undefined"
      ? buildCenterSignupUrl(window.location.origin, center)
      : null;

  // ── TCF : shell existant (inchangé) ──────────────────────────────────────
  if (isTCF) {
    return (
      <div className="min-h-[100dvh] overflow-x-hidden pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-8 bg-[linear-gradient(180deg,#F7F7F6_0%,#eef1f8_100%)]">
        <header className="relative overflow-hidden border-b border-[#11224E]/10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#11224E_0%,#1a3568_55%,#11224E_100%)]" />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#eb670e]/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#eb670e]/35 to-transparent" />

          <div className="relative nexa-center-shell py-2.5 sm:py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-black/15"
                  style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #c95508 100%)` }}
                >
                  <LayoutDashboard size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white/40 truncate">
                      {center?.name}
                      <span className="ml-1">🇨🇦 TCF</span>
                    </p>
                    <span className="text-[9px] text-white/35 hidden sm:inline">·</span>
                    <span className="text-[9px] font-medium text-white/45 capitalize truncate hidden sm:inline">
                      {todayLabel()}
                    </span>
                  </div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight leading-snug text-white truncate">
                    {greeting()}, {staffPrenom} 👋
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                <div className="[&_button]:border-white/20 [&_button]:bg-white/10 [&_button]:text-white [&_button]:h-8 [&_button]:w-8">
                  <CenterNotifications />
                </div>
                {center?.code && (
                  <span className="hidden md:inline text-[9px] font-bold font-mono bg-white/10 text-white/80 border border-white/20 px-2 py-1 rounded-md truncate max-w-[6rem]">
                    {center.code}
                  </span>
                )}
                {signupUrl && (
                  <ShareSignupLinkMenu
                    signupUrl={signupUrl}
                    centerName={center?.name}
                    copied={copied}
                    onCopy={onCopyLink}
                    variant="dark"
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="nexa-center-shell py-4 sm:py-5 space-y-4 sm:space-y-5">
          {center?.status === "pending" && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-3 shadow-sm">
              <Clock size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <PendingBanner />
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  // ── Générique : shell SaaS clair (Google / Staff Paie) ───────────────────
  // Header fixe aligné sur le trait bas du header sidebar (h-[68px] · Plan …)
  // Contenu seul scrollable — overflow-x-hidden du shell parent casse sticky.
  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ backgroundColor: "#FFFBF7" }}>
      <header className="shrink-0 h-[68px] border-b border-black/[0.06] z-30" style={{ backgroundColor: "#FFFBF7" }}>
        <div className="nexa-center-shell h-full flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-neutral-500 truncate leading-tight">
              {center?.name || "Centre"}
              <span className="text-neutral-300 mx-1.5">·</span>
              <span className="capitalize">{todayLabel()}</span>
            </p>
            <h1
              className="font-display text-lg sm:text-xl font-black tracking-tight truncate leading-tight mt-0.5"
              style={{ color: BLUE }}
            >
              {greeting()}, {staffPrenom}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CenterNotifications />
            {center?.code && (
              <span className="hidden md:inline text-[11px] font-mono font-medium text-neutral-500 border border-neutral-200 bg-white px-2.5 py-1.5 rounded-lg">
                {center.code}
              </span>
            )}
            {signupUrl && (
              <ShareSignupLinkMenu
                signupUrl={signupUrl}
                centerName={center?.name}
                copied={copied}
                onCopy={onCopyLink}
                variant="light"
              />
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <div className="nexa-center-shell py-5 sm:py-6 space-y-5 sm:space-y-6">
          {center?.status === "pending" && (
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 flex items-start gap-3">
              <Clock size={16} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
              <p className="text-sm text-neutral-600 leading-relaxed">
                En attente d&apos;activation par Nexa — vous pouvez configurer votre espace librement.
              </p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
