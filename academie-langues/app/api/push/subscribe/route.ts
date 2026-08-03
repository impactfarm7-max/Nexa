import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/push/subscribe  → enregistrer une subscription
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tag_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Profil introuvable." }, { status: 403 });
  if (profile.tag_status === "revoque" || profile.tag_status === "termine") {
    return NextResponse.json({ error: "Compte non autorise." }, { status: 403 });
  }

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Subscription invalide." }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (existing && existing.user_id !== user.id) {
    return NextResponse.json(
      { error: "Cet abonnement push est déjà lié à un autre compte." },
      { status: 409 }
    );
  }

  const { error: dbError } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (dbError) {
    console.error("push subscribe DB error:", dbError);
    return NextResponse.json({ error: "Erreur base de données." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe  → se désabonner
export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Endpoint manquant." }, { status: 400 });

  await supabaseAdmin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
