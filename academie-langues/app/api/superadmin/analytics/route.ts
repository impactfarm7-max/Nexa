import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";
import { normalizeNexaOffer, type NexaOfferKey } from "@/app/data/nexaOffers";
import { computeCenterDerivedStatus, type CenterDerivedStatus } from "../centers/route";

type CentersByOffer = Record<NexaOfferKey, number>;
type CentersByStatus = Record<CenterDerivedStatus, number>;

type NetworkCenterExport = {
  name: string;
  offer: NexaOfferKey;
  status: CenterDerivedStatus;
  students: number;
  amount: number;
  renewal_at: string | null;
};

const EMPTY_OFFERS: CentersByOffer = {
  decouverte: 0,
  croissance: 0,
  pro: 0,
  entreprise: 0,
  custom: 0,
};

const EMPTY_STATUS: CentersByStatus = {
  active: 0,
  trial: 0,
  trial_expired: 0,
  subscription_expired: 0,
  paused: 0,
  revoked: 0,
};

export async function GET(req: NextRequest) {
  const { ctx, error: authError } = await getSuperadminContext(req);
  if (!ctx) return authError;

  const requested = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = Number.isInteger(requested) ? Math.max(7, Math.min(requested, 90)) : 30;
  const now = Date.now();

  const [
    { data: siteAnalytics, error: analyticsError },
    { data: centers, error: centersError },
    { data: students, error: studentsError },
  ] = await Promise.all([
    supabaseAdmin.rpc("get_site_analytics", { p_days: days }),
    supabaseAdmin
      .from("centers")
      .select("id, name, status, nexa_offer, trial_ends_at, renewal_at, subscription_amount"),
    supabaseAdmin
      .from("profiles")
      .select("center_id")
      .eq("role", "student")
      .not("center_id", "is", null),
  ]);

  if (analyticsError) return NextResponse.json({ error: analyticsError.message }, { status: 500 });
  if (centersError) return NextResponse.json({ error: centersError.message }, { status: 500 });
  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

  const studentCountByCenter = new Map<string, number>();
  let totalStudents = 0;

  for (const row of students ?? []) {
    if (!row.center_id) continue;
    totalStudents++;
    studentCountByCenter.set(row.center_id, (studentCountByCenter.get(row.center_id) ?? 0) + 1);
  }

  const centersByOffer = { ...EMPTY_OFFERS };
  const centersByStatus = { ...EMPTY_STATUS };
  let mrr = 0;
  const networkCenters: NetworkCenterExport[] = [];

  for (const center of centers ?? []) {
    const offer = normalizeNexaOffer(center.nexa_offer) ?? "decouverte";
    centersByOffer[offer]++;

    const derivedStatus = computeCenterDerivedStatus(center, now);
    centersByStatus[derivedStatus]++;

    if (
      center.status === "active" &&
      (!center.renewal_at || new Date(center.renewal_at).getTime() > now)
    ) {
      mrr += Number(center.subscription_amount) || 0;
    }

    networkCenters.push({
      name: center.name ?? "",
      offer,
      status: derivedStatus,
      students: studentCountByCenter.get(center.id) ?? 0,
      amount: Number(center.subscription_amount) || 0,
      renewal_at: center.renewal_at ?? null,
    });
  }

  const topCenters = (centers ?? [])
    .map((center) => ({
      id: center.id,
      name: center.name ?? "",
      student_count: studentCountByCenter.get(center.id) ?? 0,
    }))
    .sort((a, b) => b.student_count - a.student_count)
    .slice(0, 10);

  return NextResponse.json({
    ...(siteAnalytics ?? {}),
    centersByOffer,
    centersByStatus,
    totalStudents,
    mrr,
    topCenters,
    networkCenters,
  });
}
