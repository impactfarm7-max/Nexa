import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendPushToUsers } from "@/app/utils/push-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const { submissionId, comment } = await req.json();
  const cleanComment = typeof comment === "string" ? comment.trim() : "";

  if (!submissionId || !cleanComment) {
    return NextResponse.json({ error: "Commentaire requis." }, { status: 400 });
  }

  const { data: submission } = await supabaseAdmin
    .from("mission_submissions")
    .select("id, user_id, mission_id")
    .eq("id", submissionId)
    .single();

  if (!submission) {
    return NextResponse.json({ error: "Soumission introuvable." }, { status: 404 });
  }

  const { data: submissionProfile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", submission.user_id)
    .maybeSingle();

  if (submissionProfile?.center_id) {
    return NextResponse.json({ error: "Soumission centre non visible dans IAG Academy." }, { status: 403 });
  }

  const { data: mission } = submission.mission_id
    ? await supabaseAdmin.from("missions").select("title, center_id").eq("id", submission.mission_id).single()
    : { data: null };

  if (mission?.center_id) {
    return NextResponse.json({ error: "Mission centre non visible dans IAG Academy." }, { status: 403 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("mission_submissions")
    .update({
      admin_comment: cleanComment,
      admin_comment_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateError) {
    console.error("submission comment update error:", updateError);
    return NextResponse.json(
      {
        error: updateError.message,
        hint: "Ajoute les colonnes admin_comment et admin_comment_at sur mission_submissions.",
      },
      { status: 500 }
    );
  }

  const title = mission?.title ? ` sur "${mission.title}"` : "";
  const message = `💬 Nouveau commentaire de l'admin${title} : ${cleanComment}`;

  await supabaseAdmin.from("notifications").insert({
    user_id: submission.user_id,
    message,
  });

  await sendPushToUsers([submission.user_id], {
    title: "Nouveau commentaire",
    body: mission?.title ? `Commentaire sur ${mission.title}` : "Un admin a commenté votre soumission.",
    url: "/tcf-canada/missions",
  });

  return NextResponse.json({ ok: true, comment: cleanComment });
}
