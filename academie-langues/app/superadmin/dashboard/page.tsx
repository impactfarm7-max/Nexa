"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Users, AlertTriangle, ShieldCheck, Inbox, ArrowRight } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { centerTrialRemainingMs } from "../../utils/center-trial";
import { useI18n } from "@/app/i18n/I18nProvider";

type CenterStats = { actifs: number; pauses: number; expires: number; termines: number; revoques: number; total: number };
type CenterRow = { id: string; status: "active" | "suspended" | "pending" | "rejected"; created_at: string; stats: CenterStats };

const URGENT_TRIAL_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export default function SuperadminDashboardPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<CenterRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const centersJson = await superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers");
        setCenters(centersJson.centers || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeCenters = centers.filter((c) => c.status === "active").length;
  const pendingCentersList = centers.filter((c) => c.status === "pending");
  const pendingCenters = pendingCentersList.length;
  const decidedCentersTotal = centers.length - pendingCenters;
  const urgentTrials = pendingCentersList.filter(
    (c) => centerTrialRemainingMs(c.created_at) > 0 && centerTrialRemainingMs(c.created_at) < URGENT_TRIAL_THRESHOLD_MS
  ).length;
  const totalActiveStudents = centers.reduce((sum, c) => sum + c.stats.actifs, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">{t("superadmin", "dashboardTitle")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("superadmin", "dashboardSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/superadmin/centres" className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5 transition-colors hover:border-orange-500/30">
          <Building2 className="h-5 w-5 text-orange-400" />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("superadmin", "dashboardActiveCenters")}</p>
          <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : `${activeCenters} / ${decidedCentersTotal}`}</p>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <Users className="h-5 w-5 text-orange-400" />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("superadmin", "dashboardActiveStudents")}</p>
          <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : totalActiveStudents}</p>
        </div>
        <Link
          href="/superadmin/centres?status=trial"
          className={`rounded-2xl border p-5 transition-colors ${
            urgentTrials > 0
              ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
              : "border-white/10 bg-[#0a0f1c] hover:border-orange-500/30"
          }`}
        >
          {urgentTrials > 0 ? (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-orange-400" />
          )}
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("superadmin", "dashboardTrialsExpiring")}</p>
          <p className={`mt-1 text-2xl font-black ${urgentTrials > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {loading ? "—" : urgentTrials > 0 ? urgentTrials : t("superadmin", "dashboardNone")}
          </p>
        </Link>
      </div>

      {pendingCenters > 0 && (
        <Link
          href="/superadmin/centres?status=trial"
          className="flex items-center justify-between gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 transition-colors hover:bg-orange-500/10"
        >
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-orange-400" />
            <div>
              <p className="font-bold text-white">
                {t("superadmin", "dashboardRequestsToHandle").replace("{count}", String(pendingCenters)).replace("{plural}", pendingCenters > 1 ? "s" : "")}
              </p>
              <p className="text-xs text-slate-400">
                {t("superadmin", "dashboardCentersTrial").replace("{plural}", pendingCenters > 1 ? "s" : "")}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-orange-400" />
        </Link>
      )}
    </div>
  );
}
