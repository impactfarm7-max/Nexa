import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";
import { normalizeNexaOffer, type NexaOfferKey } from "@/app/data/nexaOffers";
import { computeCenterDerivedStatus, type CenterDerivedStatus } from "../centers/route";

type CentersByOffer = Record<NexaOfferKey | "none", number>;
type CentersByStatus = Record<CenterDerivedStatus, number>;

type NetworkCenterExport = {
  name: string;
  offer: NexaOfferKey | "none";
  status: CenterDerivedStatus;
  students: number;
  amount: number;
  renewal_at: string | null;
  center_type: string | null;
  city: string | null;
};

type UpcomingRenewal = {
  id: string;
  name: string;
  amount: number;
  renewal_at: string;
  days_left: number;
};

type StudentHealth = {
  actifs: number;
  pauses: number;
  expires: number;
  termines: number;
  revoques: number;
  total: number;
};

const EMPTY_OFFERS: CentersByOffer = {
  decouverte: 0,
  croissance: 0,
  pro: 0,
  entreprise: 0,
  custom: 0,
  none: 0,
};

const EMPTY_STATUS: CentersByStatus = {
  active: 0,
  trial: 0,
  trial_expired: 0,
  subscription_expired: 0,
  paused: 0,
  revoked: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function classifyStudent(
  row: {
    tag_status: string | null;
    subscription_ends_at: string | null;
    subscription_paused_at: string | null;
  },
  now: number,
) {
  if (row.tag_status === "revoque") return "revoques" as const;
  if (row.tag_status === "termine") return "termines" as const;
  if (row.subscription_paused_at) return "pauses" as const;
  if (row.subscription_ends_at && new Date(row.subscription_ends_at).getTime() <= now) return "expires" as const;
  return "actifs" as const;
}

export async function GET(req: NextRequest) {
  const { ctx, error: authError } = await getSuperadminContext(req);
  if (!ctx) return authError;

  const requested = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = Number.isInteger(requested) ? Math.max(7, Math.min(requested, 90)) : 30;
  const now = Date.now();
  const periodStart = now - days * DAY_MS;
  const renewalHorizon = now + 30 * DAY_MS;

  const [
    { data: siteAnalytics, error: analyticsError },
    { data: centers, error: centersError },
    { data: students, error: studentsError },
  ] = await Promise.all([
    supabaseAdmin.rpc("get_site_analytics", { p_days: days }),
    supabaseAdmin
      .from("centers")
      .select(
        "id, name, city, status, center_type, nexa_offer, trial_ends_at, renewal_at, renewal_alert_days, subscription_amount, subscription_starts_at, created_at",
      ),
    supabaseAdmin
      .from("profiles")
      .select("center_id, tag_status, subscription_ends_at, subscription_paused_at, created_at")
      .eq("role", "student")
      .not("center_id", "is", null),
  ]);

  if (analyticsError) return NextResponse.json({ error: analyticsError.message }, { status: 500 });
  if (centersError) return NextResponse.json({ error: centersError.message }, { status: 500 });
  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

  const studentCountByCenter = new Map<string, number>();
  const studentHealth: StudentHealth = {
    actifs: 0,
    pauses: 0,
    expires: 0,
    termines: 0,
    revoques: 0,
    total: 0,
  };
  let newStudentsInPeriod = 0;

  for (const row of students ?? []) {
    if (!row.center_id) continue;
    studentHealth.total++;
    studentHealth[classifyStudent(row, now)]++;
    studentCountByCenter.set(row.center_id, (studentCountByCenter.get(row.center_id) ?? 0) + 1);
    if (row.created_at && new Date(row.created_at).getTime() >= periodStart) {
      newStudentsInPeriod++;
    }
  }

  const centersByOffer = { ...EMPTY_OFFERS };
  const centersByStatus = { ...EMPTY_STATUS };
  const centersByType = { tcf: 0, native: 0 };
  let mrr = 0;
  let revenueAtRisk = 0;
  let newCentersInPeriod = 0;
  let activeCenters = 0;
  const networkCenters: NetworkCenterExport[] = [];
  const upcomingRenewals: UpcomingRenewal[] = [];

  for (const center of centers ?? []) {
    const offer = normalizeNexaOffer(center.nexa_offer);
    const offerKey: NexaOfferKey | "none" = offer ?? "none";
    centersByOffer[offerKey]++;

    const derivedStatus = computeCenterDerivedStatus(
      {
        status: center.status,
        created_at: center.created_at,
        trial_ends_at: center.trial_ends_at,
        renewal_at: center.renewal_at,
        nexa_offer: center.nexa_offer,
      },
      now,
    );
    centersByStatus[derivedStatus]++;

    if (center.center_type === "tcf_canada") centersByType.tcf++;
    else centersByType.native++;

    if (center.created_at && new Date(center.created_at).getTime() >= periodStart) {
      newCentersInPeriod++;
    }

    const amount = Number(center.subscription_amount) || 0;
    if (derivedStatus === "active") {
      activeCenters++;
      mrr += amount;
    }

    if (derivedStatus === "subscription_expired") {
      revenueAtRisk += amount;
    }

    if (derivedStatus === "active" && center.renewal_at) {
      const renewalMs = new Date(center.renewal_at).getTime();
      if (Number.isFinite(renewalMs) && renewalMs > now && renewalMs <= renewalHorizon) {
        const daysLeft = Math.max(0, Math.ceil((renewalMs - now) / DAY_MS));
        const alertDays =
          typeof center.renewal_alert_days === "number" && center.renewal_alert_days > 0
            ? center.renewal_alert_days
            : 7;
        if (daysLeft <= Math.max(alertDays, 30)) {
          revenueAtRisk += amount;
          upcomingRenewals.push({
            id: center.id,
            name: center.name ?? "",
            amount,
            renewal_at: center.renewal_at,
            days_left: daysLeft,
          });
        }
      }
    }

    networkCenters.push({
      name: center.name ?? "",
      offer: offerKey,
      status: derivedStatus,
      students: studentCountByCenter.get(center.id) ?? 0,
      amount,
      renewal_at: center.renewal_at ?? null,
      center_type: center.center_type ?? null,
      city: center.city ?? null,
    });
  }

  upcomingRenewals.sort((a, b) => a.days_left - b.days_left);

  const topCenters = (centers ?? [])
    .map((center) => ({
      id: center.id,
      name: center.name ?? "",
      student_count: studentCountByCenter.get(center.id) ?? 0,
      offer: normalizeNexaOffer(center.nexa_offer),
      status: computeCenterDerivedStatus(center, now),
    }))
    .sort((a, b) => b.student_count - a.student_count)
    .slice(0, 10);

  const totalCenters = (centers ?? []).length;
  const avgStudentsPerCenter =
    activeCenters > 0 ? Math.round((studentHealth.actifs / activeCenters) * 10) / 10 : 0;
  const arpu = activeCenters > 0 ? Math.round(mrr / activeCenters) : 0;

  return NextResponse.json({
    ...(siteAnalytics ?? {}),
    centersByOffer,
    centersByStatus,
    centersByType,
    totalCenters,
    activeCenters,
    totalStudents: studentHealth.total,
    studentHealth,
    mrr,
    arpu,
    avgStudentsPerCenter,
    revenueAtRisk,
    newCentersInPeriod,
    newStudentsInPeriod,
    renewalsNext30Days: upcomingRenewals.length,
    upcomingRenewals: upcomingRenewals.slice(0, 8),
    topCenters,
    networkCenters,
    periodDays: days,
  });
}
