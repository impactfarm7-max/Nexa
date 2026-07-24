import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { checkSubscription } from "@/app/utils/auth-server";

let webPushConfigured = false;

function configureWebPush() {
  if (webPushConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL || "support@iag-academy.com";
  const subject = vapidEmail.startsWith("mailto:") || vapidEmail.startsWith("http")
    ? vapidEmail
    : `mailto:${vapidEmail}`;

  if (!publicKey || !privateKey) {
    console.warn("Push web desactive: cles VAPID manquantes.");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  webPushConfigured = true;
  return true;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/push/send
 * Body: { title, body, url?, user_id? }
 * Si user_id est absent → broadcast à tous les abonnés.
 * Réservé aux admins.
 */
export async function POST(req: Request) {
  const { user, error, status } = await checkSubscription(req);
  if (!user) return NextResponse.json({ error }, { status });

  // Vérifier que l'appelant est admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { title, body, url, user_id } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title et body sont requis." }, { status: 400 });
  }

  const payload = JSON.stringify({ title, body, url: url || "/dashboard" });
  let targetUserIds: string[] = [];
  if (user_id) {
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, center_id")
      .eq("id", user_id)
      .maybeSingle();
    if (!targetProfile || targetProfile.center_id) {
      return NextResponse.json({ error: "Compte centre non ciblable depuis IAG Academy." }, { status: 403 });
    }
    targetUserIds = [user_id];
  } else {
    const { data: globalProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .is("center_id", null);
    if (profilesError) return NextResponse.json({ error: "DB error." }, { status: 500 });
    targetUserIds = (globalProfiles || []).map((profile) => profile.id);
  }
  if (targetUserIds.length === 0) return NextResponse.json({ sent: 0, total: 0 });
  const inAppMessage = `${title}\n${body}`;

  // Récupérer les subscriptions cibles
  const query = supabaseAdmin.from("push_subscriptions").select("*").in("user_id", targetUserIds);

  const { data: subs, error: dbErr } = await query;
  if (dbErr || !subs) return NextResponse.json({ error: "DB error." }, { status: 500 });

  let inAppSent = 0;
  if (targetUserIds.length > 0) {
    const notifications = targetUserIds.map((targetUserId) => ({
      user_id: targetUserId,
      message: inAppMessage,
    }));

    const { error: notifErr } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (notifErr) {
      return NextResponse.json({ error: "Notification in-app non envoyee." }, { status: 500 });
    }

    inAppSent = notifications.length;
  }

  const results = configureWebPush()
    ? await Promise.allSettled(
        subs.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        )
      )
    : [];

  // Supprimer les subscriptions expirées (410 Gone)
  const expired = subs.filter((_, i) => {
    const r = results[i];
    return r?.status === "rejected" && (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
  });
  if (expired.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expired.map((s) => s.endpoint));
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent, total: subs.length, inAppSent });
}
