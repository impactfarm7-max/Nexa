import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { computeCenterDerivedStatus } from "@/app/api/superadmin/centers/route";
import { collectCenterAlerts } from "@/app/utils/center-alerts";
import {
  sendCenterRenewalAlertEmail,
  sendCenterTrialAlertEmail,
} from "@/app/utils/activation-emails";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function resolveManagerEmail(centerId: string, fallbackEmail: string | null) {
  const [{ data: centerUsers }, { data: managerProfiles }, { data: center }] = await Promise.all([
    supabaseAdmin
      .from("center_users")
      .select("role, profiles:user_id ( email )")
      .eq("center_id", centerId)
      .in("role", ["owner", "manager"]),
    supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("center_id", centerId)
      .in("role", ["center_manager", "campus_manager"]),
    supabaseAdmin.from("centers").select("email").eq("id", centerId).maybeSingle(),
  ]);

  for (const row of centerUsers ?? []) {
    const raw = row.profiles as unknown;
    const profile = (Array.isArray(raw) ? raw[0] : raw) as { email?: string | null } | null;
    if (profile?.email?.trim()) return profile.email.trim();
  }
  for (const row of managerProfiles ?? []) {
    if (row.email?.trim()) return row.email.trim();
  }
  if (center?.email?.trim()) return center.email.trim();
  if (fallbackEmail?.trim()) return fallbackEmail.trim();
  return null;
}

function shouldSendToday(daysLeft: number, alertWindowDays: number) {
  // Un email aux bornes : début de fenêtre d’alerte + J-1, pour éviter le spam quotidien.
  return daysLeft === alertWindowDays || daysLeft === 1 || daysLeft === 0;
}

/**
 * GET /api/superadmin/subscription-alerts
 * Cron quotidien (CRON_SECRET) — emails essais urgents + renouvellements.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { data: centers, error } = await supabaseAdmin
    .from("centers")
    .select(
      "id, name, status, email, created_at, trial_ends_at, renewal_at, renewal_alert_days, subscription_amount, nexa_offer",
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const enriched = (centers ?? []).map((center) => ({
    ...center,
    derived_status: computeCenterDerivedStatus(center, now),
  }));

  const alerts = collectCenterAlerts(enriched, now);
  let trialSent = 0;
  let renewalSent = 0;
  let skipped = 0;

  for (const alert of alerts) {
    if (alert.kind !== "trial_urgent" && alert.kind !== "renewal_soon") continue;

    const windowDays =
      typeof alert.center.renewal_alert_days === "number" && alert.center.renewal_alert_days > 0
        ? Math.trunc(alert.center.renewal_alert_days)
        : 7;

    if (alert.kind === "renewal_soon" && !shouldSendToday(alert.daysLeft, windowDays)) {
      skipped += 1;
      continue;
    }
    if (alert.kind === "trial_urgent" && alert.daysLeft > 1) {
      skipped += 1;
      continue;
    }

    const to = await resolveManagerEmail(alert.center.id, (alert.center as { email?: string | null }).email ?? null);
    if (!to) {
      skipped += 1;
      continue;
    }

    if (alert.kind === "trial_urgent") {
      const result = await sendCenterTrialAlertEmail({
        to,
        centerName: alert.center.name,
        daysLeft: alert.daysLeft,
        endsAt: new Date(alert.dueAt).toISOString(),
      });
      if (result.sent) trialSent += 1;
      else skipped += 1;
    } else {
      const result = await sendCenterRenewalAlertEmail({
        to,
        centerName: alert.center.name,
        daysLeft: alert.daysLeft,
        renewalAt: new Date(alert.dueAt).toISOString(),
        amount: alert.center.subscription_amount,
      });
      if (result.sent) renewalSent += 1;
      else skipped += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    alerts: alerts.length,
    trialSent,
    renewalSent,
    skipped,
  });
}
