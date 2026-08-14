"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  Calendar,
  CreditCard,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { superadminFetch } from "@/app/utils/superadmin-api-client";
import { useI18n } from "@/app/i18n/I18nProvider";
import { centerTypeLabel } from "@/app/data/center-types";
import {
  getOfferQuota,
  normalizeNexaOffer,
  NEXA_OFFERS,
} from "@/app/data/nexaOffers";
import { normalizeTcfPlan, tcfPlanLabel } from "@/app/data/tcfOffers";
import { CenterCreditsPanel } from "./CenterCreditsPanel";
import { FicheField, FicheRow, FicheSection } from "./fiche";
import { ViewAsModal } from "./ViewAsModal";

export type DerivedStatus =
  | "active"
  | "trial"
  | "trial_expired"
  | "subscription_expired"
  | "paused"
  | "revoked";

type CenterListRow = {
  id: string;
  name: string;
  derived_status: DerivedStatus;
};

type CenterDetail = {
  id: string;
  name: string;
  city: string;
  code: string | null;
  address: string | null;
  country: string | null;
  region: string | null;
  center_type: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  nexa_offer: string | null;
  plan_type?: string | null;
  trial_ends_at: string | null;
  renewal_at: string | null;
  subscription_amount: number | null;
  subscription_period_months: number | null;
  pause_reason: string | null;
  quota_overrides: Record<string, unknown> | null;
  created_at: string;
  derived_status: DerivedStatus;
  billing_status?: string | null;
  last_payment_at?: string | null;
  commercial_intent?: string | null;
  commercial_note?: string | null;
  upgrade_requested_at?: string | null;
};

type ManagerRow = {
  role: string | null;
  role_label: string | null;
  profiles: {
    prenom: string | null;
    nom: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
  };
};

type CenterUsage = {
  seatsOccupied: number;
  seatsMax: number | null;
  seatsPct: number | null;
  seatsOver: boolean;
  staffCount: number;
  staffMax: number | null;
  staffOver: boolean;
  campusCount: number;
  campusMax: number | null;
  campusOver: boolean;
};

type DetailResponse = {
  center: CenterDetail;
  managers: ManagerRow[];
  creatorEmail: string | null;
  stats: { actifs: number; pauses: number; expires: number; termines: number; revoques: number; total: number };
  usage?: CenterUsage;
};

const DERIVED_STATUS_BADGE: Record<DerivedStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  trial: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  trial_expired: "bg-red-500/10 text-red-300 border-red-500/20",
  subscription_expired: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  paused: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  revoked: "bg-red-500/10 text-red-400 border-red-500/20",
};

const OFFER_BADGE: Record<string, string> = {
  decouverte: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  croissance: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  pro: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  entreprise: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  starter: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  ultra: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  custom: "bg-purple-500/15 text-purple-300 border-purple-500/25",
  none: "bg-slate-700/40 text-slate-400 border-slate-600/40",
};

function offerLabel(
  t: (ns: "superadmin", key: string) => string,
  center: { center_type?: string | null; nexa_offer?: string | null; plan_type?: string | null },
  locale: string,
) {
  if (center.center_type === "tcf_canada") {
    const plan = normalizeTcfPlan(center.plan_type);
    if (!plan) return t("superadmin", "centresNoOffer");
    return tcfPlanLabel(plan, locale === "en" ? "en" : "fr");
  }
  const normalized = normalizeNexaOffer(center.nexa_offer);
  if (!normalized) return t("superadmin", "centresNoOffer");
  const map: Record<string, string> = {
    decouverte: "centresOfferDecouverte",
    croissance: "centresOfferCroissance",
    pro: "centresOfferPro",
    entreprise: "centresOfferEntreprise",
    custom: "centresOfferCustom",
  };
  return t("superadmin", map[normalized] ?? "centresOfferCustom");
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatQuota(value: number | null | undefined, suffix = ""): string {
  if (value == null) return "∞";
  return `${value}${suffix}`;
}

export function CenterDetailPanel({
  centerId,
  listRow,
  refreshKey = 0,
  onActivate,
  onChangeOffer,
  onPause,
  onResume,
  onRevoke,
  onReject,
  actionBusy,
}: {
  centerId: string | null;
  listRow: CenterListRow | null;
  refreshKey?: number;
  onActivate: () => void;
  onChangeOffer: () => void;
  onPause: () => void;
  onResume: () => void;
  onRevoke: () => void;
  onReject: () => void;
  actionBusy: boolean;
}) {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  const load = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<DetailResponse>(`/api/superadmin/centers/${centerId}`);
      setDetail(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersDetailLoadError"));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [centerId, t]);

  useEffect(() => {
    setDetail(null);
  }, [centerId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const markPaid = async () => {
    if (!centerId) return;
    setBillingBusy(true);
    try {
      await superadminFetch(`/api/superadmin/centers/${centerId}`, {
        method: "PATCH",
        body: JSON.stringify({ markPaid: true }),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersDetailLoadError"));
    } finally {
      setBillingBusy(false);
    }
  };

  const setBillingStatus = async (billing_status: "current" | "unpaid" | "grace") => {
    if (!centerId) return;
    setBillingBusy(true);
    try {
      await superadminFetch(`/api/superadmin/centers/${centerId}`, {
        method: "PATCH",
        body: JSON.stringify({ billing_status }),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("superadmin", "centersDetailLoadError"));
    } finally {
      setBillingBusy(false);
    }
  };

  if (!centerId || !listRow) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0a0f1c] p-12 text-center">
        <Building2 className="h-10 w-10 text-slate-700" />
        <p className="mt-4 text-sm font-bold text-slate-500">{t("superadmin", "centresDetailSelectHint")}</p>
      </div>
    );
  }

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[#0a0f1c] p-12">
        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  const center = detail?.center;
  const derived = center?.derived_status ?? listRow.derived_status;
  const derivedKey = `centresDerivedStatus_${derived}` as keyof typeof import("@/app/i18n/messages/superadmin").superadmin.fr;
  const isTcf = center?.center_type === "tcf_canada";
  const tcfPlan = isTcf ? normalizeTcfPlan(center?.plan_type) : null;
  const offerKey = isTcf ? null : normalizeNexaOffer(center?.nexa_offer);
  const hasOffer = isTcf ? Boolean(tcfPlan) : Boolean(offerKey);
  const offerBadgeKey = (isTcf ? tcfPlan : offerKey) ?? "none";
  const offerCfg = offerKey && offerKey !== "custom" ? NEXA_OFFERS[offerKey] : null;
  const overrides = center?.quota_overrides;
  const maxStudents = offerKey ? getOfferQuota(offerKey, "maxStudents", overrides) : null;
  const campus = offerKey ? getOfferQuota(offerKey, "maxCampus", overrides) : null;
  const staff = offerKey ? getOfferQuota(offerKey, "maxStaffAccounts", overrides) : null;
  const tutor = offerKey ? getOfferQuota(offerKey, "tutorInteractionsPerStudent", overrides) : null;
  const live = offerKey ? getOfferQuota(offerKey, "liveHoursPerStudent", overrides) : null;
  const studentOverrides =
    overrides?.studentQuotas && typeof overrides.studentQuotas === "object"
      ? (overrides.studentQuotas as Record<string, unknown>)
      : null;
  const primaryManager = detail?.managers?.[0]?.profiles;

  const btnBase =
    "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50";
  const actions: ReactNode[] = [];

  switch (derived) {
    case "trial":
    case "trial_expired":
      actions.push(
        <button key="activate" type="button" disabled={actionBusy} onClick={onActivate} className={`${btnBase} border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25`}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("superadmin", "centresActionActivate")}
        </button>,
        <button key="reject" type="button" disabled={actionBusy} onClick={onReject} className={`${btnBase} border-red-500/30 text-red-300 hover:bg-red-500/10`}>
          {t("superadmin", "centresActionReject")}
        </button>,
      );
      break;
    case "active":
      actions.push(
        <button key="pause" type="button" disabled={actionBusy} onClick={onPause} className={`${btnBase} border-amber-500/30 text-amber-300 hover:bg-amber-500/10`}>
          {t("superadmin", "centresActionPause")}
        </button>,
        <button key="revoke" type="button" disabled={actionBusy} onClick={onRevoke} className={`${btnBase} border-red-500/30 text-red-300 hover:bg-red-500/10`}>
          {t("superadmin", "centresActionRevoke")}
        </button>,
      );
      break;
    case "paused":
      actions.push(
        <button key="resume" type="button" disabled={actionBusy} onClick={onResume} className={`${btnBase} border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25`}>
          {t("superadmin", "centresActionResume")}
        </button>,
      );
      break;
    case "subscription_expired":
      actions.push(
        <button key="resume" type="button" disabled={actionBusy} onClick={onResume} className={`${btnBase} border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25`}>
          {t("superadmin", "centresActionResume")}
        </button>,
        <button key="revoke" type="button" disabled={actionBusy} onClick={onRevoke} className={`${btnBase} border-red-500/30 text-red-300 hover:bg-red-500/10`}>
          {t("superadmin", "centresActionRevoke")}
        </button>,
      );
      break;
    case "revoked":
      actions.push(
        <button key="reactivate" type="button" disabled={actionBusy} onClick={onActivate} className={`${btnBase} border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25`}>
          {t("superadmin", "centresActionReactivate")}
        </button>,
      );
      break;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-white">{center?.name ?? listRow.name}</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${DERIVED_STATUS_BADGE[derived]}`}>
                {t("superadmin", derivedKey)}
              </span>
            </div>
            {center && (
              <p className="mt-2 text-xs text-slate-500">
                {t("superadmin", "requestsCreatedOn")} {formatDate(center.created_at, locale)} · {centerTypeLabel(center.center_type)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              key="view-as"
              type="button"
              disabled={actionBusy}
              onClick={() => setViewAsOpen(true)}
              className={`${btnBase} border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20`}
            >
              <Eye className="h-3.5 w-3.5" />
              {t("superadmin", "viewAsAction")}
            </button>
            {actions}
          </div>
        </div>
        {detail?.stats && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: t("superadmin", "effectifsColActive"), value: detail.stats.actifs, className: "text-emerald-300" },
              { label: t("superadmin", "effectifsColPaused"), value: detail.stats.pauses, className: "text-slate-300" },
              { label: t("superadmin", "effectifsColExpired"), value: detail.stats.expires, className: "text-amber-300" },
              { label: t("superadmin", "effectifsColRevoked"), value: detail.stats.revoques, className: "text-rose-300" },
              { label: t("superadmin", "effectifsColTotal"), value: detail.stats.total, className: "text-white" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.label}</p>
                <p className={`mt-0.5 text-lg font-black ${item.className}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subscription block — always visible, primary CTA for offer assignment */}
      <div className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/90">
              {t("superadmin", "centresSubscriptionTitle")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${OFFER_BADGE[offerBadgeKey] ?? OFFER_BADGE.none}`}>
                {offerLabel(t, center || {}, locale)}
              </span>
              {center?.subscription_amount != null && (
                <span className="text-sm font-bold text-white">
                  {center.subscription_amount.toLocaleString()} FCFA{t("superadmin", "centresPerMonth")}
                </span>
              )}
            </div>
            {(offerCfg || offerKey === "custom") && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-lg bg-black/20 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  {t("superadmin", "centresQuotaMaxStudents")}: {formatQuota(maxStudents as number | null)}
                </span>
                <span className="rounded-lg bg-black/20 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  {t("superadmin", "centresQuotaCampus")}: {formatQuota(campus as number | null)}
                </span>
                <span className="rounded-lg bg-black/20 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  {t("superadmin", "centresQuotaStaff")}: {formatQuota(staff as number | null)}
                </span>
                <span className="rounded-lg bg-black/20 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  {t("superadmin", "centresQuotaTutor")}: {formatQuota(tutor as number | null)}
                </span>
                <span className="rounded-lg bg-black/20 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  {t("superadmin", "centresQuotaLive")}: {live == null ? "∞" : `${live}h`}
                </span>
              </div>
            )}
            {offerKey === "custom" && studentOverrides && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(
                  [
                    ["centresQuotaEe", "expressionEcrite"],
                    ["centresQuotaExamEe", "modesExamensEe"],
                    ["centresQuotaEo", "expressionOrale"],
                    ["centresQuotaBlanc", "examenBlanc"],
                    ["centresQuotaTutorIa", "sessionsTuteurIa"],
                  ] as const
                ).map(([labelKey, field]) => (
                  <span key={field} className="rounded-lg bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300/90">
                    {t("superadmin", labelKey)}: {formatQuota(typeof studentOverrides[field] === "number" ? (studentOverrides[field] as number) : null)}
                  </span>
                ))}
              </div>
            )}
            {center?.renewal_at && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-orange-400/70" />
                {t("superadmin", "centresRenewalAt")}: {formatDate(center.renewal_at, locale)}
              </p>
            )}
            {center?.pause_reason && (
              <p className="mt-2 text-xs text-amber-300/80">{center.pause_reason}</p>
            )}
            {!hasOffer && (
              <p className="mt-2 text-xs text-slate-400">{t("superadmin", "centresNoOfferHint")}</p>
            )}
          </div>
          <button
            type="button"
            onClick={hasOffer ? onChangeOffer : onActivate}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:opacity-90"
          >
            <CreditCard className="h-4 w-4" />
            {hasOffer ? t("superadmin", "centresEditOffer") : t("superadmin", "centresAssignOffer")}
          </button>
        </div>
      </div>

      <CenterCreditsPanel centerId={center?.id ?? listRow.id} />

      {detail?.usage && (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t("superadmin", "usageTitle")}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(
              [
                {
                  label: t("superadmin", "usageSeats"),
                  used: detail.usage.seatsOccupied,
                  max: detail.usage.seatsMax,
                  over: detail.usage.seatsOver,
                  pct: detail.usage.seatsPct,
                },
                {
                  label: t("superadmin", "usageStaff"),
                  used: detail.usage.staffCount,
                  max: detail.usage.staffMax,
                  over: detail.usage.staffOver,
                  pct:
                    detail.usage.staffMax && detail.usage.staffMax > 0
                      ? Math.round((detail.usage.staffCount / detail.usage.staffMax) * 100)
                      : null,
                },
                {
                  label: t("superadmin", "usageCampus"),
                  used: detail.usage.campusCount,
                  max: detail.usage.campusMax,
                  over: detail.usage.campusOver,
                  pct:
                    detail.usage.campusMax && detail.usage.campusMax > 0
                      ? Math.round((detail.usage.campusCount / detail.usage.campusMax) * 100)
                      : null,
                },
              ] as const
            ).map((row) => (
              <div
                key={row.label}
                className={`rounded-xl border px-3 py-3 ${row.over ? "border-red-500/40 bg-red-500/10" : "border-white/5 bg-white/[0.03]"}`}
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{row.label}</p>
                <p className={`mt-1 text-lg font-black ${row.over ? "text-red-300" : "text-white"}`}>
                  {row.used}
                  <span className="text-sm font-bold text-slate-500"> / {row.max == null ? "∞" : row.max}</span>
                </p>
                {row.pct != null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${row.over ? "bg-red-400" : row.pct >= 85 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(100, row.pct)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "billingTitle")}
            </p>
            <p className="mt-2 text-sm font-bold text-white">
              {t(
                "superadmin",
                center?.billing_status === "unpaid"
                  ? "billingStatusUnpaid"
                  : center?.billing_status === "grace"
                    ? "billingStatusGrace"
                    : center?.billing_status === "current"
                      ? "billingStatusCurrent"
                      : "billingStatusUnknown",
              )}
            </p>
            {center?.last_payment_at && (
              <p className="mt-1 text-xs text-slate-400">
                {t("superadmin", "billingLastPayment")}: {formatDate(center.last_payment_at, locale)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={billingBusy || actionBusy}
              onClick={() => void markPaid()}
              className={`${btnBase} border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25`}
            >
              {t("superadmin", "billingMarkPaid")}
            </button>
            <button
              type="button"
              disabled={billingBusy || actionBusy}
              onClick={() => void setBillingStatus("unpaid")}
              className={`${btnBase} border-red-500/30 text-red-300 hover:bg-red-500/10`}
            >
              {t("superadmin", "billingMarkUnpaid")}
            </button>
            <button
              type="button"
              disabled={billingBusy || actionBusy}
              onClick={() => void setBillingStatus("grace")}
              className={`${btnBase} border-amber-500/30 text-amber-300 hover:bg-amber-500/10`}
            >
              {t("superadmin", "billingMarkGrace")}
            </button>
          </div>
        </div>
      </div>

      {center && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-4 sm:p-5">
            <FicheSection label={t("superadmin", "requestsCenterForm")}>
              <FicheField label={t("superadmin", "requestsType")} value={centerTypeLabel(center.center_type)} />
              <FicheField label={t("superadmin", "requestsOffer")} value={offerLabel(t, center, locale)} />
              <FicheField
                label={t("superadmin", "requestsCityShort")}
                value={center.city}
                icon={<MapPin className="h-3.5 w-3.5" />}
              />
              <FicheField label={t("superadmin", "requestsRegion")} value={center.region} />
              <FicheField label={t("superadmin", "requestsCountryShort")} value={center.country} />
              <FicheField
                label={t("superadmin", "requestsTechnicalCode")}
                value={center.code}
                mono
                nowrap
              />
              <FicheField
                label={t("superadmin", "requestsPhone")}
                value={center.phone}
                icon={<Phone className="h-3.5 w-3.5" />}
                nowrap
              />
              <FicheField
                label={t("superadmin", "requestsCenterEmail")}
                value={center.email}
                icon={<Mail className="h-3.5 w-3.5" />}
              />
              <FicheRow
                label={t("superadmin", "requestsAddress")}
                value={center.address}
                icon={<Building2 className="h-3.5 w-3.5" />}
              />
            </FicheSection>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-4 sm:p-5">
            <FicheSection label={t("superadmin", "requestsManagerForm")}>
              <FicheField
                label={t("superadmin", "requestsFullName")}
                value={
                  [primaryManager?.prenom, primaryManager?.nom].filter(Boolean).join(" ") ||
                  detail?.creatorEmail ||
                  null
                }
                icon={<User className="h-3.5 w-3.5" />}
                span
              />
              <FicheField
                label={t("superadmin", "requestsRoleShort")}
                value={primaryManager?.job_title ?? detail?.managers?.[0]?.role_label}
                span
              />
              <FicheField
                label={t("superadmin", "requestsEmail")}
                value={primaryManager?.email ?? detail?.creatorEmail}
                icon={<Mail className="h-3.5 w-3.5" />}
              />
              <FicheField
                label={t("superadmin", "requestsContactPhone")}
                value={primaryManager?.phone ?? center.phone}
                icon={<Phone className="h-3.5 w-3.5" />}
                nowrap
              />
            </FicheSection>
          </div>
        </div>
      )}

      {viewAsOpen && (
        <ViewAsModal
          centerId={center?.id ?? listRow.id}
          centerName={center?.name ?? listRow.name}
          onClose={() => setViewAsOpen(false)}
        />
      )}
    </div>
  );
}
