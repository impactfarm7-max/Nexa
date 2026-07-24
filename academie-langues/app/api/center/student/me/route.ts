import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, email, center_id, role, tag_status, simulations_completed, current_activity, pack_name, subscription_ends_at, ee_total, ee_used, exam_total, exam_used, exam_4m_total, exam_4m_used, eo_total, eo_used, coaching_total, coaching_used, centers:center_id(id, name, city, address, phone, email, status)")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile?.center_id || !profile?.centers) {
    return NextResponse.json({ error: "Compte etudiant centre requis." }, { status: 403 });
  }

  if (profile.tag_status === "pending_center_approval") {
    return NextResponse.json({ error: "Compte en attente de validation par le centre." }, { status: 403 });
  }

  const { data: submissions } = await supabaseAdmin
    .from("mission_submissions")
    .select("mission_id")
    .eq("user_id", user.id);

  const { data: missions } = await supabaseAdmin
    .from("missions")
    .select("id, title, description, created_at, center_id, target_user_id")
    .eq("center_id", profile.center_id)
    .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile,
    center: profile.centers,
    missions: missions || [],
    submittedMissionIds: (submissions || []).map((submission: any) => submission.mission_id),
  });
}
