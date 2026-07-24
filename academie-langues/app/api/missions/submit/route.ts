import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { runMissionAiCorrection } from "@/app/utils/missionAiCorrection";
import { isStudentEligibleForMission } from "@/app/utils/missionTargeting";
import {
  allowsFormat,
  detectFileSubmissionFormat,
  normalizeSubmissionFormats,
} from "@/app/utils/missionSubmissionFormats";

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const {
      mission_id,
      mission_title,
      mission_description,
      answer_text,
      file_url,
      file_name,
      file_mime,
    } = await req.json();

    if (!mission_id) {
      return NextResponse.json({ error: "mission_id requis." }, { status: 400 });
    }
    if (!answer_text?.trim() && !file_url) {
      return NextResponse.json({ error: "Un texte ou un fichier est requis." }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("center_id")
      .eq("id", user.id)
      .maybeSingle();

    const { data: mission, error: missionError } = await supabaseAdmin
      .from("missions")
      .select("id, center_id, target_user_id, groupe_id, filiere_matiere_id, correction_mode, submission_formats, title, description, formateur_id")
      .eq("id", mission_id)
      .maybeSingle();

    if (missionError || !mission) {
      return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
    }

    const allowedMission = profile?.center_id
      ? mission.center_id === profile.center_id &&
        (await isStudentEligibleForMission(supabaseAdmin, mission, user.id))
      : !mission.center_id;

    if (!allowedMission) {
      return NextResponse.json({ error: "Mission non assignée à cet étudiant." }, { status: 403 });
    }

    const formats = normalizeSubmissionFormats((mission as any).submission_formats);
    const hasText = !!answer_text?.trim();
    const hasFile = !!file_url;

    if (hasText && !allowsFormat(formats, "text")) {
      return NextResponse.json(
        { error: "Ce devoir n’accepte pas de réponse textuelle." },
        { status: 400 }
      );
    }

    if (hasFile) {
      const fileFormat = detectFileSubmissionFormat({ type: file_mime, name: file_name });
      if (!allowsFormat(formats, fileFormat)) {
        return NextResponse.json(
          { error: `Ce devoir n’accepte pas les fichiers de type « ${fileFormat} ».` },
          { status: 400 }
        );
      }
    }

    if (!hasText && !hasFile) {
      return NextResponse.json({ error: "Un texte ou un fichier est requis." }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("mission_submissions")
      .select("id")
      .eq("mission_id", mission_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Vous avez déjà soumis ce devoir." }, { status: 409 });
    }

    const correctionMode = mission.correction_mode || "auto";
    const needsManualReview =
      correctionMode === "manual" || !answer_text?.trim();

    const { data: submission, error: insertError } = await supabaseAdmin
      .from("mission_submissions")
      .insert([{
        mission_id,
        user_id: user.id,
        answer_text: answer_text?.trim() || null,
        file_url: file_url || null,
        file_name: file_name || null,
        status: needsManualReview ? "pending_review" : "correcting",
      }])
      .select()
      .single();

    if (insertError || !submission) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
    }

    if (needsManualReview) {
      // Notifier le formateur + staff du centre
      if (mission.center_id) {
        const recipientIds = new Set<string>();
        if (mission.formateur_id) recipientIds.add(mission.formateur_id);

        const { data: staff } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("center_id", mission.center_id)
          .in("role", ["center_manager", "campus_manager", "trainer", "staff"]);
        for (const s of staff ?? []) recipientIds.add(s.id);

        const ids = [...recipientIds];
        if (ids.length > 0) {
          await supabaseAdmin.from("notifications").insert(
            ids.map((user_id) => ({
              user_id,
              message: `📝 Devoir à corriger — « ${mission.title} ». Ouvrez Cours → Devoirs.`,
            }))
          );
          try {
            const { sendPushToUsers } = await import("@/app/utils/push-server");
            await sendPushToUsers(ids, {
              title: "Devoir à corriger",
              body: `« ${mission.title} » en attente de correction`,
              url: "/centre/cours/devoirs",
            });
          } catch {
            // push best-effort
          }
        }
      }

      return NextResponse.json({
        submission_id: submission.id,
        status: "pending_review",
        message: correctionMode === "manual"
          ? "Votre devoir a été envoyé. Votre enseignant le corrigera prochainement."
          : undefined,
      });
    }

    let correction: Record<string, unknown> | null = null;
    try {
      correction = await runMissionAiCorrection(
        mission_title || mission.title,
        mission_description ?? mission.description,
        answer_text.trim()
      );
    } catch (aiErr) {
      console.error("AI correction error:", aiErr);
    }

    await supabaseAdmin
      .from("mission_submissions")
      .update({
        status: correction ? "done" : "pending_review",
        correction: correction || null,
      })
      .eq("id", submission.id);

    if (!correction && mission.center_id) {
      const recipientIds = new Set<string>();
      if (mission.formateur_id) recipientIds.add(mission.formateur_id);
      const { data: staff } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("center_id", mission.center_id)
        .in("role", ["center_manager", "campus_manager", "trainer", "staff"]);
      for (const s of staff ?? []) recipientIds.add(s.id);
      const ids = [...recipientIds];
      if (ids.length > 0) {
        await supabaseAdmin.from("notifications").insert(
          ids.map((user_id) => ({
            user_id,
            message: `📝 Correction IA échouée — « ${mission.title} » à corriger manuellement. Ouvrez Cours → Devoirs.`,
          }))
        );
      }
    }

    return NextResponse.json({
      submission_id: submission.id,
      status: correction ? "done" : "pending_review",
      correction,
    });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
