import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/feedback — get all feedbacks (admin only)
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé aux admins." },
      { status: 403 }
    );
  }

  const { data: feedbacks, error } = await supabaseAdmin
    .from("user_feedbacks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur fetch feedbacks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with user profiles
  const userIds = [...new Set(feedbacks?.map((f: any) => f.user_id) || [])];
  const profilesRes = userIds.length > 0
    ? await supabaseAdmin
        .from("profiles")
        .select("id, prenom, email, center_id")
        .in("id", userIds)
    : { data: [] };

  const profileMap: Record<string, any> = {};
  (profilesRes.data ?? []).forEach((p: any) => {
    profileMap[p.id] = p;
  });

  const enriched = (feedbacks || [])
    .filter((f: any) => {
      const profile = profileMap[f.user_id];
      return profile && !profile.center_id;
    })
    .map((f: any) => ({
      ...f,
      profiles: profileMap[f.user_id] ?? null,
    }));

  return NextResponse.json({ feedbacks: enriched });
}

// PATCH /api/admin/feedback — update feedback status (admin only)
export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé aux admins." },
      { status: 403 }
    );
  }

  const { id, status } = await req.json();

  if (!id || !status) {
    return NextResponse.json(
      { error: "id et status requis." },
      { status: 400 }
    );
  }

  if (!["pending", "treated"].includes(status)) {
    return NextResponse.json(
      { error: "Status invalide." },
      { status: 400 }
    );
  }

  const { data: feedbackOwner } = await supabaseAdmin
    .from("user_feedbacks")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (!feedbackOwner?.user_id) {
    return NextResponse.json({ error: "Retour introuvable." }, { status: 404 });
  }

  const { data: ownerProfile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", feedbackOwner.user_id)
    .maybeSingle();

  if (!ownerProfile || ownerProfile.center_id) {
    return NextResponse.json({ error: "Retour centre non modifiable depuis IAG Academy." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_feedbacks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erreur update feedback:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: data });
}
