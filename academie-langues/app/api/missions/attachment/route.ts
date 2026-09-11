import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { isStudentEligibleForMission } from "@/app/utils/missionTargeting";
import { getSignedStorageUrl } from "@/app/utils/storage-signed-url.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const missionId = req.nextUrl.searchParams.get("missionId");
  const submissionId = req.nextUrl.searchParams.get("submissionId");

  if (submissionId) {
    return serveSubmissionFile(submissionId, user.id);
  }

  if (!missionId) return NextResponse.json({ error: "missionId requis." }, { status: 400 });

  const { data: mission } = await supabaseAdmin
    .from("missions")
    .select("id, center_id, target_user_id, groupe_id, filiere_matiere_id, attachment_url, attachment_name")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission?.attachment_url) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .maybeSingle();

  const isStaff =
    !!profile &&
    STAFF_ROLES.includes(profile.role || "") &&
    profile.center_id === mission.center_id;
  const isTargetStudent =
    !isStaff && (await isStudentEligibleForMission(supabaseAdmin, mission, user.id));

  if (!isStaff && !isTargetStudent) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const signedUrl = await getSignedStorageUrl("mission-files", mission.attachment_url, 60);
  if (!signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const upstream = await fetch(signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Impossible de charger le fichier." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const filename = (mission.attachment_name || "piece-jointe").replace(/[^\w.\-À-ÿ ]+/g, "_");
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Sert le fichier joint à une soumission étudiante (mission_submissions.file_url),
 * distinct de la pièce jointe de la mission elle-même. Autorisé pour l'étudiant
 * auteur de la soumission, ou pour le staff du centre de la mission (même
 * périmètre que /api/centre/missions/correct et /pending).
 */
async function serveSubmissionFile(submissionId: string, userId: string) {
  const { data: submission } = await supabaseAdmin
    .from("mission_submissions")
    .select("id, user_id, file_url, file_name, mission_id, missions:mission_id(id, center_id)")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission?.file_url) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const mission = (submission as any).missions;
  const isOwner = submission.user_id === userId;

  let isStaff = false;
  if (!isOwner && mission?.center_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, center_id")
      .eq("id", userId)
      .maybeSingle();
    isStaff =
      !!profile &&
      STAFF_ROLES.includes(profile.role || "") &&
      profile.center_id === mission.center_id;
  }

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const signedUrl = await getSignedStorageUrl("mission-files", submission.file_url, 60);
  if (!signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const upstream = await fetch(signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Impossible de charger le fichier." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const filename = (submission.file_name || "devoir").replace(/[^\w.\-À-ÿ ]+/g, "_");
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
