import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, requireSuperadminMenu, supabaseAdmin } from "@/app/utils/superadmin-auth-server";
import { computeCenterDerivedStatus } from "@/app/api/superadmin/centers/route";
import { buildMonthlyRevenue } from "@/app/data/financePayments";

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;
  const menuError = requireSuperadminMenu(ctx, "finance");
  if (menuError) return menuError;

  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = Number.isFinite(requestedDays) ? Math.max(7, Math.min(requestedDays, 365)) : 30;
  const periodStart = Date.now() - days * 24 * 60 * 60 * 1000;

  const [{ data: payments, error: paymentsError }, { data: centers, error: centersError }] = await Promise.all([
    supabaseAdmin.from("finance_payments").select("amount, paid_at").order("paid_at", { ascending: false }).limit(5000),
    supabaseAdmin.from("centers").select("status, nexa_offer, created_at, trial_ends_at, renewal_at, subscription_amount"),
  ]);
  if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 500 });
  if (centersError) return NextResponse.json({ error: centersError.message }, { status: 500 });

  const now = Date.now();
  let totalAllTime = 0;
  let totalPeriod = 0;
  let countPeriod = 0;
  for (const p of payments ?? []) {
    const amount = Number(p.amount) || 0;
    totalAllTime += amount;
    if (new Date(p.paid_at).getTime() >= periodStart) {
      totalPeriod += amount;
      countPeriod += 1;
    }
  }

  let revenueAtRisk = 0;
  for (const c of centers ?? []) {
    const status = computeCenterDerivedStatus(c, now);
    if (status === "subscription_expired") revenueAtRisk += Number(c.subscription_amount) || 0;
  }

  const monthlyRevenue = buildMonthlyRevenue(payments ?? [], 12, new Date());

  return NextResponse.json({ totalAllTime, totalPeriod, countPeriod, revenueAtRisk, monthlyRevenue, periodDays: days });
}
