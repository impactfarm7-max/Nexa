"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Ban, CalendarClock, Loader2, ShieldAlert, Users } from "lucide-react";
import { collectCenterAlerts, type AlertCenter, type CenterAlert, type CenterAlertKind } from "../../utils/center-alerts";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useSuperadminCenters } from "../SuperadminCentersContext";

type CenterRow = AlertCenter & {
  derived_status?: string;
  city?: string | null;
};

const KIND_ORDER: CenterAlertKind[] = [
  "trial_urgent",
  "billing_unpaid",
  "quota_breach",
  "subscription_expired",
  "trial_expired",
  "renewal_soon",
  "trial_pending",
];

export default function SuperadminAlertesPage() {
  const { t, locale } = useI18n();
  const { centers, loading } = useSuperadminCenters<CenterRow>();
  const [filterKind, setFilterKind] = useState<CenterAlertKind | null>(null);

  const allAlerts = useMemo(() => collectCenterAlerts(centers), [centers]);
  const alerts = useMemo(
    () => (filterKind ? allAlerts.filter((a) => a.kind === filterKind) : allAlerts),
    [allAlerts, filterKind],
  );

  const labelFor = (alert: CenterAlert) => {
    const { kind, daysLeft: days, dueAt, center } = alert;
    const date = formatDate(dueAt);

    if (kind === "quota_breach") {
      const usage = center.usage;
      if (usage?.seatsOver) {
        return t("superadmin", "alertesQuotaSeatsDesc")
          .replace("{occupied}", String(usage.seatsOccupied ?? 0))
          .replace("{max}", String(usage.seatsMax ?? "—"));
      }
      if (usage?.campusOver) {
        return t("superadmin", "alertesQuotaCampusDesc");
      }
      return t("superadmin", "alertesQuotaGenericDesc");
    }

    if (kind === "billing_unpaid") {
      return t("superadmin", center.billing_status === "grace" ? "alertesBillingGraceDesc" : "alertesBillingUnpaidDesc");
    }

    const key =
      kind === "trial_urgent"
        ? "dashboardAlertTrialUrgent"
        : kind === "trial_expired"
          ? "dashboardAlertTrialExpired"
          : kind === "renewal_soon"
            ? "dashboardAlertRenewalSoon"
            : kind === "subscription_expired"
              ? "dashboardAlertSubExpired"
              : "alertesPendingTrial";
    return t("superadmin", key).replace("{days}", String(days)).replace("{date}", date);
  };

  const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">{t("superadmin", "alertesTitle")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("superadmin", "alertesSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {KIND_ORDER.map((kind) => {
          const count = allAlerts.filter((a) => a.kind === kind).length;
          const active = filterKind === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setFilterKind((current) => (current === kind ? null : kind))}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-orange-500/50 bg-orange-500/10"
                  : "border-white/10 bg-[#0a0f1c] hover:border-white/20"
              }`}
            >
              <p className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-orange-300" : "text-slate-500"}`}>
                {t("superadmin", `alertesKind_${kind}`)}
              </p>
              <p className="mt-1 text-xl font-black text-white">{loading ? "—" : count}</p>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0a0f1c]">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("superadmin", "centersLoading")}
          </p>
        ) : alerts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-700" />
            <p className="text-sm font-black text-white">
              {t("superadmin", filterKind ? "alertesEmptyFiltered" : "alertesEmpty")}
            </p>
            {filterKind && (
              <button
                type="button"
                onClick={() => setFilterKind(null)}
                className="mt-3 text-xs font-bold text-orange-400 hover:text-orange-300"
              >
                {t("superadmin", "alertesClearFilter")}
              </button>
            )}
          </div>
        ) : (
          <ul className="custom-scrollbar max-h-[70vh] divide-y divide-white/5 overflow-y-auto">
            {alerts.map((alert) => (
              <li key={`${alert.kind}-${alert.center.id}`}>
                <Link
                  href={`/superadmin/centres?focus=${alert.center.id}`}
                  className="flex items-start gap-3 px-4 py-4 transition hover:bg-white/[0.03]"
                >
                  {alert.kind === "renewal_soon" ? (
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  ) : alert.kind === "quota_breach" ? (
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  ) : alert.kind === "billing_unpaid" ? (
                    <Ban className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  ) : (
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        alert.kind === "trial_urgent" || alert.kind === "subscription_expired"
                          ? "text-red-400"
                          : "text-orange-400"
                      }`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">{alert.center.name}</p>
                    <p className="text-xs text-slate-400">{labelFor(alert)}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {t("superadmin", `alertesKind_${alert.kind}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
