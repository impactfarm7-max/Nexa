import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { runMissionAiCorrection } from "@/app/utils/missionAiCorrection";

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["center_manager", "campus_manager", "trainer", "staff"];

function noteToNiveau(note: number): string {
  if (note >= 16) return "C2";
  if (note >= 14) return "C1";
  if (note >= 12) return "B2+";
  if (note >= 10) return "B2";
  if (note >= 6) return "B1";
  if (note >= 4) return "A2";
  return "A1";
}

async function getStaffProfile(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, center_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) return null;
  return profile;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const profile = await getStaffProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const body = await req.json();
    const { submission_id, action, note, commentaire_global, admin_comment } = body;

    if (!submission_id || !["ai", "manual"].includes(action)) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const { data: submission, error: subError } = await supabaseAdmin
      .from("mission_submissions")
      .select("id, user_id, answer_text, status, mission_id, missions:mission_id(id, center_id, title, description, correction_mode)")
      .eq("id", submission_id)
      .maybeSingle();

    if (subError || !submission) {
      return NextResponse.json({ error: "Soumission introuvable." }, { status: 404 });
    }

    const mission = (submission as any).missions;
    if (!mission || mission.center_id !== profile.center_id) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    if (action === "manual") {
      const parsedNote = Number(note);
      if (!Number.isFinite(parsedNote) || parsedNote < 0 || parsedNote > 20) {
        return NextResponse.json({ error: "Note invalide (0-20)." }, { status: 400 });
      }

      const correction = {
        note: parsedNote,
        niveau: noteToNiveau(parsedNote),
        commentaire_global: commentaire_global?.trim() || "Correction manuelle par votre enseignant.",
        erreurs: [],
        version_ideale: "",
        conseil_coach: "",
        corrected_by: "manual",
      };

      const updatePayload: Record<string, unknown> = {
        status: "done",
        correction,
      };
      if (typeof admin_comment === "string" && admin_comment.trim()) {
        updatePayload.admin_comment = admin_comment.trim();
      }

      const { error: updateError } = await supabaseAdmin
        .from("mission_submissions")
        .update(updatePayload)
        .eq("id", submission_id);

      if (updateError) {
        return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: submission.user_id,
        message: `✅ Votre devoir « ${mission.title} » a été corrigé (note ${parsedNote}/20).`,
      });

      return NextResponse.json({ status: "done", correction });
    }

    // Mode manuel : pas de correction IA
    if (mission.correction_mode === "manual") {
      return NextResponse.json(
        { error: "Ce devoir est en correction manuelle uniquement." },
        { status: 400 }
      );
    }

    if (!submission.answer_text?.trim()) {
      return NextResponse.json(
        { error: "Correction IA impossible sans texte. Utilisez la correction manuelle." },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from("mission_submissions")
      .update({ status: "correcting" })
      .eq("id", submission_id);

    let correction: Record<string, unknown> | null = null;
    try {
      correction = await runMissionAiCorrection(
        mission.title,
        mission.description,
        submission.answer_text
      );
    } catch (aiErr) {
      console.error("AI correction error:", aiErr);
    }

    const { error: updateError } = await supabaseAdmin
      .from("mission_submissions")
      .update({
        status: correction ? "done" : "pending_review",
        correction: correction || null,
      })
      .eq("id", submission_id);

    if (updateError) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
    }

    if (correction) {
      const note = Number((correction as any).note);
      await supabaseAdmin.from("notifications").insert({
        user_id: submission.user_id,
        message: Number.isFinite(note)
          ? `✅ Votre devoir « ${mission.title} » a été corrigé (note ${note}/20).`
          : `✅ Votre devoir « ${mission.title} » a été corrigé.`,
      });
    }

    return NextResponse.json({
      status: correction ? "done" : "pending_review",
      correction,
    });
  } catch (err) {
    console.error("Correct error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
