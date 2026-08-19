"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  Headphones,
  Inbox,
  LibraryBig,
  ShieldCheck,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { collectCenterAlerts, type AlertCenter } from "../../utils/center-alerts";
import { nexaOfferLabel, type NexaOfferKey } from "@/app/data/nexaOffers";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useSuperadminCenters } from "../SuperadminCentersContext";

type CenterStats = { actifs: number; pauses: number; expires: number; termines: number; revoques: number; total: number };
type DerivedStatus =
  | "active"
  | "trial"
  | "trial_expired"
  | "subscription_expired"
  | "paused"
  | "revoked";

type CenterRow = AlertCenter & {
  status: "active" | "suspended" | "pending" | "rejected" | "expired";
  derived_status: DerivedStatus;
  stats: CenterStats;
  nexa_offer: NexaOfferKey | null;
  center_type?: string | null;
  city?: string | null;
  created_at?: string | null;
};

const STATUS_ORDER: DerivedStatus[] = [
  "active",
  "trial",
  "trial_expired",
  "subscription_expired",
  "paused",
  "revoked",
];

const STATUS_BAR: Record<DerivedStatus, string> = {
  active: "bg-emerald-400",
  trial: "bg-amber-400",
  trial_expired: "bg-orange-400",
  subscription_expired: "bg-red-400",
  paused: "bg-slate-400",
  revoked: "bg-rose-500",
};

const OFFER_ORDER: NexaOfferKey[] = ["decouverte", "croissance", "pro", "entreprise", "custom"];

const OFFER_BAR: Record<NexaOfferKey, string> = {
  decouverte: "bg-sky-400",
  croissance: "bg-emerald-400",
  pro: "bg-violet-400",
  entreprise: "bg-orange-400",
  custom: "bg-slate-400",
};

function formatFcfa(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`;
}

function formatShortDate(value: number | string, locale: string) {
  const ms = typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function isTcfType(type: string | null | undefined) {
  return Boolean(type && /tcf/i.test(type));
}

function BarRow({
  label,
  value,
  max,
  colorClass,
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <li className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate text-slate-400">{label}</span>
        <span className="font-black text-white">
          {value}
          <span className="ml-1.5 text-[10px] font-bold text-slate-600">{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

export default function SuperadminDashboardPage() {
  const { t, locale } = useI18n();
  const { centers, loading: centersLoading } = useSuperadminCenters<CenterRow>();
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [libraryPending, setLibraryPending] = useState(0);
  const [supportUnread, setSupportUnread] = useState(0);
  const loading = centersLoading || extrasLoading;

  useEffect(() => {
    const load = async () => {
      try {
        const [libraryJson, supportJson] = await Promise.all([
          superadminFetch<{ documents: unknown[] }>("/api/superadmin/bibliotheque").catch(() => ({ documents: [] })),
          superadminFetch<{ conversations: Array<{ unread: number }> }>("/api/superadmin/support").catch(() => ({
            conversations: [],
          })),
        ]);
        setLibraryPending((libraryJson.documents || []).length);
        setSupportUnread((supportJson.conversations || []).reduce((sum, c) => sum + (c.unread || 0), 0));
      } finally {
        setExtrasLoading(false);
      }
    };
    load();
  }, []);

  const alerts = useMemo(() => collectCenterAlerts(centers), [centers]);
  const alertSummary = useMemo(
    () => ({
      trialUrgent: alerts.filter((a) => a.kind === "trial_urgent").length,
      renewalSoon: alerts.filter((a) => a.kind === "renewal_soon").length,
      trialExpired: alerts.filter((a) => a.kind === "trial_expired").length,
      subscriptionExpired: alerts.filter((a) => a.kind === "subscription_expired").length,
      trialPending: alerts.filter((a) => a.kind === "trial_pending").length,
    }),
    [alerts],
  );

  const activeCenters = centers.filter((c) => c.derived_status === "active").length;
  const pausedCenters = centers.filter((c) => c.derived_status === "paused").length;
  const decidedCentersTotal = centers.filter((c) => c.status !== "pending").length;
  const totalActiveStudents = centers.reduce((sum, c) => sum + (c.stats?.actifs ?? 0), 0);
  const totalStudents = centers.reduce((sum, c) => sum + (c.stats?.total ?? 0), 0);
  const studentPaused = centers.reduce((sum, c) => sum + (c.stats?.pauses ?? 0), 0);
  const studentExpired = centers.reduce((sum, c) => sum + (c.stats?.expires ?? 0), 0);
  const studentRevoked = centers.reduce((sum, c) => sum + (c.stats?.revoques ?? 0), 0);

  const mrr = centers
    .filter((c) => c.derived_status === "active")
    .reduce((sum, c) => sum + (typeof c.subscription_amount === "number" ? c.subscription_amount : 0), 0);

  const revenueAtRisk = alerts
    .filter((a) => a.kind === "renewal_soon" || a.kind === "subscription_expired")
    .reduce((sum, a) => sum + (typeof a.center.subscription_amount === "number" ? a.center.subscription_amount : 0), 0);

  const avgStudents =
    activeCenters > 0 ? Math.round((totalActiveStudents / activeCenters) * 10) / 10 : 0;

  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const newThisMonth = centers.filter((c) => c.created_at && new Date(c.created_at).getTime() >= monthStart).length;
  const tcfCount = centers.filter((c) => isTcfType(c.center_type)).length;
  const nativeCount = centers.length - tcfCount;

  const byStatus = useMemo(() => {
    const map: Record<DerivedStatus, number> = {
      active: 0,
      trial: 0,
      trial_expired: 0,
      subscription_expired: 0,
      paused: 0,
      revoked: 0,
    };
    for (const c of centers) {
      if (c.derived_status in map) map[c.derived_status] += 1;
    }
    return map;
  }, [centers]);

  const byOffer = useMemo(() => {
    const map: Record<NexaOfferKey, number> = {
      decouverte: 0,
      croissance: 0,
      pro: 0,
      entreprise: 0,
      custom: 0,
    };
    for (const c of centers) {
      if (c.nexa_offer && c.nexa_offer in map) map[c.nexa_offer] += 1;
    }
    return map;
  }, [centers]);

  const topCenters = useMemo(
    () => [...centers].sort((a, b) => (b.stats?.actifs ?? 0) - (a.stats?.actifs ?? 0)).slice(0, 6),
    [centers],
  );

  const recentCenters = useMemo(
    () =>
      [...centers]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 5),
    [centers],
  );

  const renewalsSoon = alerts.filter((a) => a.kind === "renewal_soon").slice(0, 8);
  const actionAlerts = alerts.filter((a) => a.kind !== "trial_pending").slice(0, 8);
  const pendingCount = alertSummary.trialPending + alertSummary.trialUrgent;
  const statusMax = Math.max(1, ...STATUS_ORDER.map((s) => byStatus[s]));
  const offerMax = Math.max(1, ...OFFER_ORDER.map((o) => byOffer[o]));

  const conversionRate =
    decidedCentersTotal > 0 ? Math.round((activeCenters / decidedCentersTotal) * 100) : 0;

  const monthlyGrowth = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { month: "short" }),
        count: 0,
      });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const c of centers) {
      if (!c.created_at) continue;
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = byKey.get(key);
      if (bucket) bucket.count += 1;
    }
    return months;
  }, [centers, locale]);
  const growthMax = Math.max(1, ...monthlyGrowth.map((m) => m.count));

  const geoBreakdown = useMemo(() => {
    const byCity = new Map<string, number>();
    for (const c of centers) {
      const city = (c.city || "").trim();
      if (!city) continue;
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
    }
    const sorted = [...byCity.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const othersCount = sorted.slice(5).reduce((sum, [, count]) => sum + count, 0);
    return { top, othersCount };
  }, [centers]);
  const geoMax = Math.max(1, ...geoBreakdown.top.map(([, count]) => count), geoBreakdown.othersCount);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">{t("superadmin", "dashboardTitle")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("superadmin", "dashboardSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/superadmin/centres?status=active" className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5 transition-colors hover:border-orange-500/30">
          <Building2 className="h-5 w-5 text-orange-400" />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("superadmin", "dashboardActiveCenters")}</p>
          <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : `${activeCenters} / ${Math.max(decidedCentersTotal, activeCenters)}`}</p>
          {!loading && (
            <p className="mt-1 text-[11px] text-slate-500">
              {t("superadmin", "dashboardNewThisMonth").replace("{count}", String(newThisMonth))}
            </p>
          )}
        </Link>
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <Users className="h-5 w-5 text-orange-400" />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("superadmin", "dashboardActiveStudents")}</p>
          <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : totalActiveStudents}</p>
          {!loading && (
            <p className="mt-1 text-[11px] text-slate-500">
              {t("superadmin", "dashboardTotalStudents").replace("{count}", String(totalStudents))}
              {" · "}
              {t("superadmin", "dashboardAvgPerCenter").replace("{avg}", String(avgStudents))}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <Wallet className="h-5 w-5 text-orange-400" />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("superadmin", "dashboardMrr")}</p>
          <p className="mt-1 text-2xl font-black text-white">{loading ? "—" : formatFcfa(mrr, locale)}</p>
          {!loading && revenueAtRisk > 0 && (
            <p className="mt-1 text-[11px] text-amber-400/90">
              {t("superadmin", "dashboardRevenueAtRisk").replace("{amount}", formatFcfa(revenueAtRisk, locale))}
            </p>
          )}
        </div>
        <Link
          href="/superadmin/centres?status=trial"
          className={`rounded-2xl border p-5 transition-colors ${
            alertSummary.trialUrgent > 0
              ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
              : "border-white/10 bg-[#0a0f1c] hover:border-orange-500/30"
          }`}
        >
          {alertSummary.trialUrgent > 0 ? (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-orange-400" />
          )}
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">{t("superadmin", "dashboardTrialsExpiring")}</p>
          <p className={`mt-1 text-2xl font-black ${alertSummary.trialUrgent > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {loading ? "—" : alertSummary.trialUrgent > 0 ? alertSummary.trialUrgent : t("superadmin", "dashboardNone")}
          </p>
          {!loading && (
            <p className="mt-1 text-[11px] text-slate-500">
              {t("superadmin", "dashboardPausedCenters").replace("{count}", String(pausedCenters))}
            </p>
          )}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/superadmin/bibliotheque" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0f1c] px-4 py-3.5 transition hover:border-orange-500/30">
          <LibraryBig className="h-4 w-4 text-orange-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("superadmin", "dashboardLibraryPending")}</p>
            <p className="text-sm font-black text-white">{loading ? "—" : libraryPending}</p>
          </div>
        </Link>
        <Link href="/superadmin/support" className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0f1c] px-4 py-3.5 transition hover:border-orange-500/30">
          <Headphones className="h-4 w-4 text-orange-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("superadmin", "dashboardSupportUnread")}</p>
            <p className="text-sm font-black text-white">{loading ? "—" : supportUnread}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0f1c] px-4 py-3.5">
          <Building2 className="h-4 w-4 text-sky-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("superadmin", "dashboardTypeMix")}</p>
            <p className="truncate text-sm font-black text-white">
              {loading ? "—" : t("superadmin", "dashboardTypeMixValue").replace("{tcf}", String(tcfCount)).replace("{native}", String(nativeCount))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0f1c] px-4 py-3.5">
          <TrendingDown className="h-4 w-4 text-amber-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t("superadmin", "dashboardStudentHealth")}</p>
            <p className="truncate text-[11px] font-bold text-slate-300">
              {loading
                ? "—"
                : t("superadmin", "dashboardStudentHealthValue")
                    .replace("{paused}", String(studentPaused))
                    .replace("{expired}", String(studentExpired))
                    .replace("{revoked}", String(studentRevoked))}
            </p>
          </div>
        </div>
      </div>

      {pendingCount > 0 && (
        <Link
          href="/superadmin/centres?status=trial"
          className="flex items-center justify-between gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 transition-colors hover:bg-orange-500/10"
        >
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-orange-400" />
            <div>
              <p className="font-bold text-white">
                {t("superadmin", "dashboardRequestsToHandle")
                  .replace("{count}", String(pendingCount))
                  .replace("{plural}", pendingCount > 1 ? "s" : "")}
              </p>
              <p className="text-xs text-slate-400">
                {t("superadmin", "dashboardCentersTrial").replace("{plural}", pendingCount > 1 ? "s" : "")}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-orange-400" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-white">{t("superadmin", "dashboardAlertsTitle")}</h2>
            <Link href="/superadmin/centres" className="text-[11px] font-bold text-orange-400 hover:text-orange-300">
              {t("superadmin", "dashboardSeeAll")}
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">…</p>
          ) : actionAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">{t("superadmin", "dashboardAlertsEmpty")}</p>
          ) : (
            <ul className="custom-scrollbar max-h-80 space-y-2 overflow-y-auto pr-1">
              {actionAlerts.map((alert) => {
                const labelKey =
                  alert.kind === "trial_urgent"
                    ? "dashboardAlertTrialUrgent"
                    : alert.kind === "trial_expired"
                      ? "dashboardAlertTrialExpired"
                      : alert.kind === "renewal_soon"
                        ? "dashboardAlertRenewalSoon"
                        : "dashboardAlertSubExpired";
                return (
                  <li key={`${alert.kind}-${alert.center.id}`}>
                    <Link
                      href={`/superadmin/centres?focus=${alert.center.id}`}
                      className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 transition hover:border-orange-500/20 hover:bg-white/[0.04]"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          alert.kind === "trial_urgent" || alert.kind === "subscription_expired"
                            ? "bg-red-400"
                            : alert.kind === "renewal_soon"
                              ? "bg-amber-400"
                              : "bg-orange-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{alert.center.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {t("superadmin", labelKey)
                            .replace("{days}", String(alert.daysLeft))
                            .replace("{date}", formatShortDate(alert.dueAt, locale))}
                        </p>
                      </div>
                      <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-white">{t("superadmin", "dashboardRenewalsSoon")}</h2>
            <span className="text-[11px] font-bold text-slate-500">{renewalsSoon.length}</span>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">…</p>
          ) : renewalsSoon.length === 0 ? (
            <p className="text-sm text-slate-500">{t("superadmin", "dashboardNoRenewalsSoon")}</p>
          ) : (
            <ul className="custom-scrollbar max-h-80 space-y-2 overflow-y-auto pr-1">
              {renewalsSoon.map((alert) => (
                <li key={`renewal-${alert.center.id}`}>
                  <Link
                    href={`/superadmin/centres?focus=${alert.center.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 hover:border-amber-500/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{alert.center.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {nexaOfferLabel(alert.center.nexa_offer, locale === "en" ? "en" : "fr")}
                        {typeof alert.center.subscription_amount === "number"
                          ? ` · ${formatFcfa(alert.center.subscription_amount, locale)}`
                          : ""}
                        {` · J-${alert.daysLeft}`}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-bold text-amber-300">{formatShortDate(alert.dueAt, locale)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <h2 className="mb-4 text-sm font-black text-white">{t("superadmin", "dashboardStatusBreakdown")}</h2>
          <ul className="space-y-3">
            {STATUS_ORDER.map((status) => (
              <BarRow
                key={status}
                label={t("superadmin", `centresDerivedStatus_${status}`)}
                value={loading ? 0 : byStatus[status]}
                max={statusMax}
                colorClass={STATUS_BAR[status]}
              />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <h2 className="mb-4 text-sm font-black text-white">{t("superadmin", "dashboardOffersBreakdown")}</h2>
          <ul className="space-y-3">
            {OFFER_ORDER.map((offer) => (
              <BarRow
                key={offer}
                label={nexaOfferLabel(offer, locale === "en" ? "en" : "fr")}
                value={loading ? 0 : byOffer[offer]}
                max={offerMax}
                colorClass={OFFER_BAR[offer]}
              />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-white">{t("superadmin", "dashboardTopCenters")}</h2>
            <Link href="/superadmin/analytics" className="text-[11px] font-bold text-orange-400 hover:text-orange-300">
              {t("superadmin", "dashboardSeeAll")}
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">…</p>
          ) : topCenters.length === 0 ? (
            <p className="text-sm text-slate-500">{t("superadmin", "dashboardEmptyCenters")}</p>
          ) : (
            <ul className="custom-scrollbar max-h-72 space-y-1 overflow-y-auto pr-1">
              {topCenters.map((center, index) => (
                <li key={center.id}>
                  <Link
                    href={`/superadmin/centres?focus=${center.id}`}
                    className="flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-white/[0.03]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10 text-[10px] font-black text-orange-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{center.name}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {center.city || "—"}
                        {center.nexa_offer ? ` · ${nexaOfferLabel(center.nexa_offer, locale === "en" ? "en" : "fr")}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{center.stats?.actifs ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-white">{t("superadmin", "dashboardRecentCenters")}</h2>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">…</p>
          ) : recentCenters.length === 0 ? (
            <p className="text-sm text-slate-500">{t("superadmin", "dashboardEmptyCenters")}</p>
          ) : (
            <ul className="custom-scrollbar max-h-72 space-y-1 overflow-y-auto pr-1">
              {recentCenters.map((center) => (
                <li key={center.id}>
                  <Link
                    href={`/superadmin/centres?focus=${center.id}`}
                    className="flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{center.name}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {t("superadmin", `centresDerivedStatus_${center.derived_status}`)}
                        {center.city ? ` · ${center.city}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-slate-500">
                      {center.created_at ? formatShortDate(center.created_at, locale) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <h2 className="mb-1 text-sm font-black text-white">{t("superadmin", "dashboardConversionRate")}</h2>
          <p className="mt-3 text-3xl font-black text-emerald-400">{loading ? "—" : `${conversionRate}%`}</p>
          {!loading && (
            <p className="mt-1 text-[11px] text-slate-500">
              {t("superadmin", "dashboardConversionRateHint")
                .replace("{active}", String(activeCenters))
                .replace("{decided}", String(decidedCentersTotal))}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <h2 className="text-sm font-black text-white">{t("superadmin", "dashboardGrowthTitle")}</h2>
          <p className="text-[11px] text-slate-500">{t("superadmin", "dashboardGrowthSubtitle")}</p>
          <div className="mt-5 flex h-24 items-end gap-2">
            {monthlyGrowth.map((m) => (
              <div key={m.key} className="group flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex h-16 w-full items-end">
                  <div
                    className="w-full rounded-t bg-orange-500/80 transition-all duration-150 group-hover:bg-orange-400"
                    style={{ height: `${loading ? 0 : Math.max(m.count > 0 ? 8 : 2, (m.count / growthMax) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold uppercase text-slate-500">{m.label}</span>
                <span className="text-[10px] font-black text-white">{loading ? "—" : m.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <h2 className="mb-4 text-sm font-black text-white">{t("superadmin", "dashboardGeoTitle")}</h2>
          {loading ? (
            <p className="text-sm text-slate-500">…</p>
          ) : geoBreakdown.top.length === 0 ? (
            <p className="text-sm text-slate-500">{t("superadmin", "dashboardGeoEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {geoBreakdown.top.map(([city, count]) => (
                <BarRow key={city} label={city} value={count} max={geoMax} colorClass="bg-sky-400" />
              ))}
              {geoBreakdown.othersCount > 0 && (
                <BarRow
                  label={t("superadmin", "dashboardGeoOthers")}
                  value={geoBreakdown.othersCount}
                  max={geoMax}
                  colorClass="bg-slate-500"
                />
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
