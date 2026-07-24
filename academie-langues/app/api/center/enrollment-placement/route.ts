import { NextResponse } from "next/server";
import { getCenterStaffContext, supabaseAdmin } from "@/app/utils/center-auth-server";
import { finalizeStudentClassroom } from "@/app/utils/studentClassroom.server";

/**
 * POST /api/center/enrollment-placement
 * Change filière / niveau / classe d'une inscription existante.
 */
export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  let body: {
    enrollment_id?: string;
    filiere_id?: string;
    niveau_id?: string | null;
    groupe_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const enrollmentId = String(body.enrollment_id || "").trim();
  const filiereId = String(body.filiere_id || "").trim();
  const niveauId = body.niveau_id ? String(body.niveau_id).trim() : null;
  const groupeId = body.groupe_id ? String(body.groupe_id).trim() : null;

  if (!enrollmentId || !filiereId) {
    return NextResponse.json({ error: "Inscription et filière requises." }, { status: 400 });
  }

  const { data: enrollment, error: enrErr } = await supabaseAdmin
    .from("enrollments")
    .select("id, student_id, filiere_id, niveau_id, groupe_id, status, filieres(center_id, type)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (enrErr || !enrollment) {
    return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  }

  const enrFiliere = enrollment.filieres as { center_id?: string; type?: string } | null;
  if (enrFiliere?.center_id && enrFiliere.center_id !== ctx!.centerId) {
    return NextResponse.json({ error: "Inscription hors de votre centre." }, { status: 403 });
  }

  const { data: targetFiliere, error: filErr } = await supabaseAdmin
    .from("filieres")
    .select("id, center_id, type, name")
    .eq("id", filiereId)
    .maybeSingle();

  if (filErr || !targetFiliere || targetFiliere.center_id !== ctx!.centerId) {
    return NextResponse.json({ error: "Programme invalide pour ce centre." }, { status: 400 });
  }

  if (niveauId) {
    const { data: niv } = await supabaseAdmin
      .from("niveaux")
      .select("id, filiere_id, annee")
      .eq("id", niveauId)
      .maybeSingle();
    if (!niv || niv.filiere_id !== filiereId) {
      return NextResponse.json({ error: "Niveau invalide pour ce programme." }, { status: 400 });
    }
  } else if (targetFiliere.type === "cursus") {
    return NextResponse.json({ error: "Niveau requis pour un cursus." }, { status: 400 });
  }

  if (groupeId) {
    const { data: grp } = await supabaseAdmin
      .from("groupes")
      .select("id, filiere_id, niveau_id, nom")
      .eq("id", groupeId)
      .maybeSingle();
    if (!grp) {
      return NextResponse.json({ error: "Classe introuvable." }, { status: 400 });
    }
    const okByFiliere = grp.filiere_id === filiereId;
    const okByNiveau = Boolean(niveauId && grp.niveau_id === niveauId);
    if (!okByFiliere && !okByNiveau) {
      return NextResponse.json({ error: "Classe hors de ce programme / niveau." }, { status: 400 });
    }
  }

  const oldGroupeId = enrollment.groupe_id as string | null;

  const { error: updErr } = await supabaseAdmin
    .from("enrollments")
    .update({
      filiere_id: filiereId,
      niveau_id: niveauId,
      groupe_id: groupeId,
    })
    .eq("id", enrollmentId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  // Migrer la salle de classe communauté si la classe change
  if (groupeId && groupeId !== oldGroupeId) {
    if (oldGroupeId) {
      const { data: oldRoom } = await supabaseAdmin
        .from("community_rooms")
        .select("id")
        .eq("groupe_id", oldGroupeId)
        .eq("type", "classroom")
        .maybeSingle();
      if (oldRoom?.id) {
        await supabaseAdmin
          .from("community_room_members")
          .delete()
          .eq("room_id", oldRoom.id)
          .eq("user_id", enrollment.student_id);
      }
    }

    const classroomResult = await finalizeStudentClassroom(supabaseAdmin, {
      studentId: enrollment.student_id,
      centerId: ctx!.centerId,
      groupeId,
    });
    if (!classroomResult.ok) {
      console.warn("[enrollment-placement] classroom sync:", classroomResult.error);
    }
  }

  const [{ data: niveauRow }, { data: groupeRow }] = await Promise.all([
    niveauId
      ? supabaseAdmin.from("niveaux").select("annee, mois, semaines, jours").eq("id", niveauId).maybeSingle()
      : Promise.resolve({ data: null }),
    groupeId
      ? supabaseAdmin.from("groupes").select("nom").eq("id", groupeId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    success: true,
    enrollment: {
      id: enrollmentId,
      filiere_id: filiereId,
      filiere_name: targetFiliere.name,
      niveau_id: niveauId,
      niveau_annee: niveauRow?.annee ?? null,
      groupe_id: groupeId,
      groupe_nom: groupeRow?.nom ?? null,
    },
  });
}
