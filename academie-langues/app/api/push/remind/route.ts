import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

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
 * GET /api/push/remind
 * Appelé par Vercel Cron toutes les 48h.
 * Protégé par CRON_SECRET.
 * Envoie une notification à tous les abonnés qui ne se sont
 * pas connectés depuis plus de 2 jours (last_seen_at).
 */
export async function GET(req: Request) {
  // Sécurité : seul Vercel Cron (ou un appel admin avec le secret) peut déclencher
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Récupère les abonnés inactifs depuis 24h (ou jamais vus)
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, profiles!inner(last_seen_at)")
    .or(`last_seen_at.lt.${oneDayAgo},last_seen_at.is.null`);

  if (error) {
    console.error("remind query error:", error);
    return NextResponse.json({ error: "DB error." }, { status: 500 });
  }

  const messages = [
    { title: "🎯 On t'attend sur NEXA !", body: "Reprends ton entraînement TCF Canada — ta session du jour t'attend." },
    { title: "📚 1 jour sans pratiquer…", body: "Chaque jour compte avant ton examen ! Reviens t'entraîner maintenant." },
    { title: "🔥 Ne perds pas ton élan !", body: "Tes objectifs TCF Canada sont à portée. Continue ton entraînement." },
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  const payload = JSON.stringify({ ...msg, url: "/dashboard" });

  const results = configureWebPush()
    ? await Promise.allSettled(
        (subs ?? []).map((sub: any) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        )
      )
    : [];

  // Nettoyer les subscriptions expirées
  const expired = (subs ?? []).filter((_: any, i: number) => {
    const r = results[i];
    return r?.status === "rejected" &&
      (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
  });
  if (expired.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expired.map((s: any) => s.endpoint));
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[remind] ${sent}/${(subs ?? []).length} notifications envoyées.`);
  return NextResponse.json({ sent, total: (subs ?? []).length });
}
