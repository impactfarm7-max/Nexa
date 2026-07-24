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

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return { sent: 0, total: 0 };
  if (!configureWebPush()) return { sent: 0, total: 0 };

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", uniqueUserIds);

  if (error || !subs?.length) return { sent: 0, total: subs?.length ?? 0 };

  const body = JSON.stringify({ ...payload, url: payload.url || "/dashboard" });
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body
      )
    )
  );

  const expired = subs.filter((_, i) => {
    const result = results[i];
    return (
      result.status === "rejected" &&
      (result.reason?.statusCode === 410 || result.reason?.statusCode === 404)
    );
  });

  if (expired.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expired.map((sub) => sub.endpoint));
  }

  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    total: subs.length,
  };
}

