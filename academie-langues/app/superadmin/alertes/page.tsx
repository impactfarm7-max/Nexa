"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Loader2, ShieldAlert } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { collectCenterAlerts, type AlertCenter, type CenterAlertKind } from "../../utils/center-alerts";
import { useI18n } from "@/app/i18n/I18nProvider";

type CenterRow = AlertCenter & {
  derived_status?: string;
  city?: string | null;
};

const KIND_ORDER: CenterAlertKind[] = [
  "trial_urgent",
  "subscription_expired",
  "trial_expired",
  "renewal_soon",
  "trial_pending",
];

export default function SuperadminAlertesPage() {
  const { t, locale } = useI18n();
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const json = await superadminFetch<{ centers: CenterRow[] }>("/api/superadmin/centers");
        setCenters(json.centers || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const alerts = useMemo(() => collectCenterAlerts(centers), [centers]);

  const labelFor = (kind: CenterAlertKind, days: number, date: string) => {
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {KIND_ORDER.map((kind) => {
          const count = alerts.filter((a) => a.kind === kind).length;
          return (
            <div key={kind} className="rounded-2xl border border-white/10 bg-[#0a0f1c] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("superadmin", `alertesKind_${kind}`)}
              </p>
              <p className="mt-1 text-xl font-black text-white">{loading ? "—" : count}</p>
            </div>
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
            <p className="text-sm font-black text-white">{t("superadmin", "alertesEmpty")}</p>
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
                    <p className="text-xs text-slate-400">
                      {labelFor(alert.kind, alert.daysLeft, formatDate(alert.dueAt))}
                    </p>
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
