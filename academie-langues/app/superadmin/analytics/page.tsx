"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Download,
  Eye,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";
import { type NexaOfferKey } from "@/app/data/nexaOffers";
import { superadminFetch } from "../../utils/superadmin-api-client";

type Point = { date: string; visitors: number; newVisitors: number; pageViews: number };
type CenterDerivedStatus =
  | "active"
  | "trial"
  | "trial_expired"
  | "subscription_expired"
  | "paused"
  | "revoked";
type TopCenter = { id: string; name: string; student_count: number };
type NetworkCenterExport = {
  name: string;
  offer: NexaOfferKey;
  status: CenterDerivedStatus;
  students: number;
  amount: number;
  renewal_at: string | null;
};

type Analytics = {
  series: Point[];
  topPages: { path: string; views: number; visitors: number }[];
  totalVisitors: number;
  periodVisitors: number;
  periodPageViews: number;
  previousPeriodVisitors: number;
  previousPeriodPageViews: number;
  centersByOffer: Record<NexaOfferKey, number>;
  centersByStatus: Record<CenterDerivedStatus, number>;
  totalStudents: number;
  mrr: number;
  topCenters: TopCenter[];
  networkCenters: NetworkCenterExport[];
};

const EMPTY: Analytics = {
  series: [],
  topPages: [],
  totalVisitors: 0,
  periodVisitors: 0,
  periodPageViews: 0,
  previousPeriodVisitors: 0,
  previousPeriodPageViews: 0,
  centersByOffer: { decouverte: 0, croissance: 0, pro: 0, entreprise: 0, custom: 0 },
  centersByStatus: {
    active: 0,
    trial: 0,
    trial_expired: 0,
    subscription_expired: 0,
    paused: 0,
    revoked: 0,
  },
  totalStudents: 0,
  mrr: 0,
  topCenters: [],
  networkCenters: [],
};

const STATUS_KEYS: CenterDerivedStatus[] = [
  "active",
  "trial",
  "trial_expired",
  "subscription_expired",
  "paused",
  "revoked",
];

const STATUS_BADGE: Record<CenterDerivedStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  trial: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  trial_expired: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  subscription_expired: "bg-red-500/15 text-red-300 border-red-500/25",
  paused: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  revoked: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};

const OFFER_BADGE: Record<NexaOfferKey, string> = {
  decouverte: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  croissance: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  pro: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  entreprise: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  custom: "bg-slate-500/15 text-slate-300 border-slate-500/25",
};

type Tab = "audience" | "network";

function formatFcfa(value: number, locale: string) {
  return `${new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(value)} FCFA`;
}

export default function SuperadminAnalyticsPage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("audience");
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState("30");
  const [data, setData] = useState<Analytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await superadminFetch<Analytics>(`/api/superadmin/analytics?days=${days}`);
      setData({ ...EMPTY, ...json });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("superadmin", "analyticsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [days, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = data.series.at(-1) || { visitors: 0, newVisitors: 0, pageViews: 0, date: "" };
  const max = Math.max(1, ...data.series.map((point) => point.visitors));
  const series = useMemo(
    () =>
      days === 90
        ? data.series.filter((_, index) => index % 3 === 0 || index === data.series.length - 1)
        : data.series,
    [data.series, days],
  );
  const change = (now: number, before: number) =>
    before ? Math.round(((now - before) / before) * 100) : now ? 100 : 0;

  const exportAudienceCsv = () => {
    const rows = [
      [
        t("superadmin", "analyticsCsvHeaderDate"),
        t("superadmin", "analyticsCsvHeaderUniqueVisitors"),
        t("superadmin", "analyticsCsvHeaderNewVisitors"),
        t("superadmin", "analyticsCsvHeaderPageViews"),
      ],
      ...data.series.map((p) => [p.date, p.visitors, p.newVisitors, p.pageViews]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-nexa-${days}-jours.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNetworkCsv = () => {
    const rows = [
      [
        t("superadmin", "analyticsCsvNetworkName"),
        t("superadmin", "analyticsCsvNetworkOffer"),
        t("superadmin", "analyticsCsvNetworkStatus"),
        t("superadmin", "analyticsCsvNetworkStudents"),
        t("superadmin", "analyticsCsvNetworkAmount"),
        t("superadmin", "analyticsCsvNetworkRenewal"),
      ],
      ...data.networkCenters.map((c) => [
        c.name,
        c.offer,
        c.status,
        c.students,
        c.amount,
        c.renewal_at ? c.renewal_at.slice(0, 10) : "",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics-reseau-centres.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const offerLabel = (key: NexaOfferKey) =>
    key === "custom"
      ? t("superadmin", "centresOfferCustom")
      : key === "decouverte"
        ? t("superadmin", "centresOfferDecouverte")
        : key === "croissance"
          ? t("superadmin", "centresOfferCroissance")
          : key === "pro"
            ? t("superadmin", "centresOfferPro")
            : t("superadmin", "centresOfferEntreprise");

  const statusLabel = (key: CenterDerivedStatus) =>
    t("superadmin", `centresDerivedStatus_${key}` as "centresDerivedStatus_active");

  const audienceCards = [
    { label: t("superadmin", "analyticsVisitorsToday"), value: today.visitors, icon: Users },
    { label: t("superadmin", "analyticsNewVisitorsToday"), value: today.newVisitors, icon: UserPlus },
    {
      label: t("superadmin", "analyticsVisitorsOverDays", { days }),
      value: data.periodVisitors,
      icon: TrendingUp,
    },
    {
      label: t("superadmin", "analyticsPageViewsOverDays", { days }),
      value: data.periodPageViews,
      icon: Eye,
    },
  ];

  const mainOfferKeys: Exclude<NexaOfferKey, "custom">[] = [
    "decouverte",
    "croissance",
    "pro",
    "entreprise",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">
            {tab === "audience" ? t("superadmin", "analyticsTitle") : t("superadmin", "analyticsNetwork")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {tab === "audience"
              ? t("superadmin", "analyticsSubtitle")
              : t("superadmin", "analyticsCentersByOffer")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {(["audience", "network"] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-md px-3 py-2 text-xs font-black ${
                  tab === key ? "bg-orange-500 text-white" : "text-slate-400"
                }`}
              >
                {key === "audience" ? t("superadmin", "analyticsTitle") : t("superadmin", "analyticsNetwork")}
              </button>
            ))}
          </div>
          {tab === "audience" && (
            <>
              {[7, 30, 90].map((period) => (
                <button
                  key={period}
                  onClick={() => setDays(period)}
                  className={`rounded-lg px-3 py-2 text-xs font-black ${
                    days === period
                      ? "bg-orange-500 text-white"
                      : "border border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {period} {t("superadmin", "analyticsDays")}
                </button>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setDays(Math.max(7, Math.min(Number(customDays) || 30, 90)));
                }}
                className="flex"
              >
                <input
                  type="number"
                  min="7"
                  max="90"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-16 rounded-l-lg border border-white/10 bg-white/5 px-2 text-xs text-white outline-none"
                />
                <button className="rounded-r-lg border border-l-0 border-white/10 px-2 text-[10px] font-bold text-slate-400">
                  {t("superadmin", "analyticsCustomDays")}
                </button>
              </form>
              <button
                onClick={exportAudienceCsv}
                aria-label={t("superadmin", "analyticsExportCsv")}
                className="rounded-lg border border-white/10 p-2 text-slate-400"
              >
                <Download className="h-4 w-4" />
              </button>
            </>
          )}
          {tab === "network" && (
            <button
              onClick={exportNetworkCsv}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300"
            >
              <Download className="h-4 w-4" />
              {t("superadmin", "analyticsExport")}
            </button>
          )}
          <button
            onClick={() => void load()}
            aria-label={t("superadmin", "analyticsRefresh")}
            className="rounded-lg border border-white/10 p-2 text-slate-400"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
          {error}
          <button
            onClick={() => void load()}
            className="ml-3 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-black"
          >
            {t("superadmin", "analyticsRetry")}
          </button>
        </div>
      ) : tab === "audience" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {audienceCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
                <Icon className="h-5 w-5 text-orange-400" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {label}
                </p>
                {loading ? (
                  <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-white/5" />
                ) : (
                  <p className="mt-1 text-3xl font-black text-white">{value.toLocaleString(locale)}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t("superadmin", "analyticsVisitorsTooltip"), value: change(data.periodVisitors, data.previousPeriodVisitors) },
              { label: t("superadmin", "analyticsViews"), value: change(data.periodPageViews, data.previousPeriodPageViews) },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a0f1c] p-5"
              >
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    {t("superadmin", "analyticsEvolution")} · {item.label}
                  </p>
                  <p className="text-[10px] text-slate-600">{t("superadmin", "analyticsPreviousPeriod")}</p>
                </div>
                <span
                  className={`flex items-center gap-1 text-xl font-black ${
                    item.value >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {item.value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {item.value > 0 ? "+" : ""}
                  {item.value}%
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <div className="flex justify-between">
              <div>
                <h3 className="font-black text-white">{t("superadmin", "analyticsVisitorsPerDay")}</h3>
                <p className="text-xs text-slate-500">{t("superadmin", "analyticsChartLegend")}</p>
              </div>
              <p className="text-xs font-bold text-slate-500">
                {data.totalVisitors} {t("superadmin", "analyticsTotal")}
              </p>
            </div>
            <div className="mt-6 flex h-64 items-end gap-1 border-b border-white/10">
              {series.map((point) => (
                <div
                  key={point.date}
                  className="group flex h-full min-w-3 flex-1 items-end gap-px"
                  title={`${point.date}: ${point.visitors} ${t("superadmin", "analyticsVisitorsTooltip")}`}
                >
                  <div
                    className="w-2/3 rounded-t bg-orange-500/80"
                    style={{ height: `${Math.max(3, (point.visitors / max) * 90)}%` }}
                  />
                  <div
                    className="w-1/3 rounded-t bg-emerald-400/80"
                    style={{ height: `${Math.max(3, (point.newVisitors / max) * 90)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <h3 className="font-black text-white">{t("superadmin", "analyticsTopPages")}</h3>
            <div className="mt-3 divide-y divide-white/[0.07]">
              {data.topPages.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  {t("superadmin", "analyticsTopPagesEmpty")}
                </p>
              )}
              {data.topPages.map((page, index) => (
                <div key={page.path} className="flex items-center gap-3 py-3">
                  <span className="w-6 text-xs font-black text-slate-600">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-200">{page.path}</span>
                  <span className="text-xs text-slate-500">
                    {page.visitors} {t("superadmin", "analyticsVisitorsTooltip")}
                  </span>
                  <span className="w-20 text-right text-sm font-black text-white">
                    {page.views} {t("superadmin", "analyticsViews")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {mainOfferKeys.map((key) => (
              <div key={key} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${OFFER_BADGE[key]}`}
                >
                  {offerLabel(key)}
                </span>
                {loading ? (
                  <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-white/5" />
                ) : (
                  <p className="mt-3 text-3xl font-black text-white">
                    {data.centersByOffer[key].toLocaleString(locale)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Users className="h-5 w-5 text-orange-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t("superadmin", "analyticsTotalStudents")}
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-white/5" />
              ) : (
                <p className="mt-1 text-3xl font-black text-white">
                  {data.totalStudents.toLocaleString(locale)}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <Wallet className="h-5 w-5 text-orange-400" />
              <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t("superadmin", "analyticsMrr")}
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-32 animate-pulse rounded-lg bg-white/5" />
              ) : (
                <p className="mt-1 text-2xl font-black text-white">{formatFcfa(data.mrr, locale)}</p>
              )}
            </div>
          </div>

          {data.centersByOffer.custom > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-4">
              <span
                className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${OFFER_BADGE.custom}`}
              >
                {offerLabel("custom")}
              </span>
              <span className="ml-3 text-sm font-black text-white">
                {loading ? "—" : data.centersByOffer.custom.toLocaleString(locale)}
              </span>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <h3 className="font-black text-white">{t("superadmin", "analyticsCentersByStatus")}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_KEYS.map((key) => (
                <span
                  key={key}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${STATUS_BADGE[key]}`}
                >
                  {statusLabel(key)}
                  <span className="font-black">
                    {loading ? "—" : data.centersByStatus[key].toLocaleString(locale)}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-400" />
              <h3 className="font-black text-white">{t("superadmin", "analyticsTopCenters")}</h3>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="py-3 pr-4">{t("superadmin", "analyticsRank")}</th>
                    <th className="py-3 pr-4">{t("superadmin", "analyticsCenterName")}</th>
                    <th className="py-3 text-right">{t("superadmin", "analyticsHeadcount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {data.topCenters.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        —
                      </td>
                    </tr>
                  )}
                  {data.topCenters.map((center, index) => (
                    <tr key={center.id}>
                      <td className="py-3 pr-4 text-xs font-black text-slate-600">{index + 1}</td>
                      <td className="py-3 pr-4 font-bold text-slate-200">{center.name}</td>
                      <td className="py-3 text-right font-black text-white">
                        {center.student_count.toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
