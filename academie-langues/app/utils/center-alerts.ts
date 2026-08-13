import { centerTrialRemainingMs } from "@/app/utils/center-trial";

export type AlertCenter = {
  id: string;
  name: string;
  status?: string | null;
  derived_status?: string | null;
  created_at?: string | null;
  trial_ends_at?: string | null;
  renewal_at?: string | null;
  renewal_alert_days?: number | null;
  subscription_amount?: number | null;
  nexa_offer?: string | null;
  billing_status?: string | null;
  stats?: { actifs?: number; total?: number };
  usage?: {
    seatsOver?: boolean;
    staffOver?: boolean;
    campusOver?: boolean;
    seatsOccupied?: number;
    seatsMax?: number | null;
  };
};

export type CenterAlertKind =
  | "trial_urgent"
  | "trial_pending"
  | "trial_expired"
  | "renewal_soon"
  | "subscription_expired"
  | "billing_unpaid"
  | "quota_breach";

export type CenterAlert = {
  kind: CenterAlertKind;
  center: AlertCenter;
  dueAt: number;
  daysLeft: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const URGENT_TRIAL_MS = DAY_MS;

function trialEndsAtMs(center: AlertCenter): number | null {
  if (center.trial_ends_at) {
    const t = new Date(center.trial_ends_at).getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (center.created_at) {
    return Date.now() + centerTrialRemainingMs(center.created_at);
  }
  return null;
}

function alertDays(center: AlertCenter): number {
  const raw = center.renewal_alert_days;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.trunc(raw);
  return 7;
}

/** Alertes opérationnelles pour le pilotage superadmin. */
export function collectCenterAlerts(centers: AlertCenter[], now = Date.now()): CenterAlert[] {
  const alerts: CenterAlert[] = [];

  for (const center of centers) {
    const derived = center.derived_status;

    if (derived === "trial" || (center.status === "pending" && derived !== "trial_expired")) {
      const ends = trialEndsAtMs(center);
      if (ends != null) {
        const remaining = ends - now;
        if (remaining > 0 && remaining < URGENT_TRIAL_MS) {
          alerts.push({
            kind: "trial_urgent",
            center,
            dueAt: ends,
            daysLeft: Math.max(0, Math.ceil(remaining / DAY_MS)),
          });
        } else if (remaining > 0) {
          alerts.push({
            kind: "trial_pending",
            center,
            dueAt: ends,
            daysLeft: Math.max(1, Math.ceil(remaining / DAY_MS)),
          });
        }
      } else {
        alerts.push({ kind: "trial_pending", center, dueAt: now, daysLeft: 0 });
      }
    }

    if (derived === "trial_expired") {
      const ends = trialEndsAtMs(center) ?? now;
      alerts.push({
        kind: "trial_expired",
        center,
        dueAt: ends,
        daysLeft: 0,
      });
    }

    if (derived === "subscription_expired") {
      const due = center.renewal_at ? new Date(center.renewal_at).getTime() : now;
      alerts.push({
        kind: "subscription_expired",
        center,
        dueAt: Number.isFinite(due) ? due : now,
        daysLeft: 0,
      });
    }

    if (derived === "active" && center.renewal_at) {
      const due = new Date(center.renewal_at).getTime();
      if (Number.isFinite(due) && due > now) {
        const windowMs = alertDays(center) * DAY_MS;
        const remaining = due - now;
        if (remaining <= windowMs) {
          alerts.push({
            kind: "renewal_soon",
            center,
            dueAt: due,
            daysLeft: Math.max(0, Math.ceil(remaining / DAY_MS)),
          });
        }
      }
    }

    if (center.billing_status === "unpaid" || center.billing_status === "grace") {
      alerts.push({
        kind: "billing_unpaid",
        center,
        dueAt: now,
        daysLeft: 0,
      });
    }

    if (center.usage?.seatsOver || center.usage?.staffOver || center.usage?.campusOver) {
      alerts.push({
        kind: "quota_breach",
        center,
        dueAt: now,
        daysLeft: 0,
      });
    }
  }

  const priority: Record<CenterAlertKind, number> = {
    trial_urgent: 0,
    billing_unpaid: 1,
    quota_breach: 2,
    subscription_expired: 3,
    trial_expired: 4,
    renewal_soon: 5,
    trial_pending: 6,
  };

  return alerts.sort((a, b) => {
    const p = priority[a.kind] - priority[b.kind];
    if (p !== 0) return p;
    return a.dueAt - b.dueAt;
  });
}

export function summarizeAlerts(alerts: CenterAlert[]) {
  return {
    trialUrgent: alerts.filter((a) => a.kind === "trial_urgent").length,
    trialPending: alerts.filter((a) => a.kind === "trial_pending").length,
    trialExpired: alerts.filter((a) => a.kind === "trial_expired").length,
    renewalSoon: alerts.filter((a) => a.kind === "renewal_soon").length,
    subscriptionExpired: alerts.filter((a) => a.kind === "subscription_expired").length,
    billingUnpaid: alerts.filter((a) => a.kind === "billing_unpaid").length,
    quotaBreach: alerts.filter((a) => a.kind === "quota_breach").length,
    total: alerts.length,
  };
}
