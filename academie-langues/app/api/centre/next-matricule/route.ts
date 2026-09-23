import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  formatMatricule,
  generateMatricule,
  resolveStudentIdPrefixForCenter,
} from "@/app/utils/student-matricule.server";

/** Aperçu en lecture seule du prochain matricule — ne touche jamais le compteur. */
export async function GET(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;

  const centerId = ctx!.centerId;
  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("student_id_prefix, center_type")
    .eq("id", centerId)
    .maybeSingle();

  let prefix: string;
  try {
    prefix = resolveStudentIdPrefixForCenter(
      centerRow?.student_id_prefix ?? null,
      centerRow?.center_type ?? ctx!.centerType,
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Préfixe de matricule institutionnel obligatoire. Configurez-le dans Paramètres → Identité.",
        code: "MATRICULE_PREFIX_REQUIRED",
      },
      { status: 400 },
    );
  }

  const year = new Date().getFullYear();
  const { data: counterRow } = await supabaseAdmin
    .from("center_student_counters")
    .select("counter")
    .eq("center_id", centerId)
    .eq("year", year)
    .maybeSingle();

  const nextSeq = (counterRow?.counter ?? 0) + 1;
  return NextResponse.json({ matricule: formatMatricule(prefix, year, nextSeq) });
}

/**
 * Attribue un matricule à un étudiant du centre s'il n'en a pas encore
 * (backfill scolarité univ avant impression).
 * Body: { student_id: string }
 */
export async function POST(req: Request) {
  const { ctx, error } = await getCenterStaffContext(req);
  if (error) return error;
  const perm = await requireCenterPermission(ctx!, "etudiants");
  if (perm) return perm;

  const centerId = ctx!.centerId;
  const body = await req.json().catch(() => ({}));
  const studentId = String(body.student_id || "");
  if (!studentId) return NextResponse.json({ error: "student_id requis." }, { status: 400 });

  const { data: centerRow } = await supabaseAdmin
    .from("centers")
    .select("student_id_prefix, center_type")
    .eq("id", centerId)
    .maybeSingle();

  let prefix: string;
  try {
    prefix = resolveStudentIdPrefixForCenter(
      centerRow?.student_id_prefix ?? null,
      centerRow?.center_type ?? ctx!.centerType,
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Préfixe de matricule institutionnel obligatoire. Configurez-le dans Paramètres → Identité.",
        code: "MATRICULE_PREFIX_REQUIRED",
      },
      { status: 400 },
    );
  }

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id, role, matricule")
    .eq("id", studentId)
    .maybeSingle();
  if (!student || student.center_id !== centerId || student.role !== "student") {
    return NextResponse.json({ error: "Étudiant introuvable." }, { status: 404 });
  }
  if (student.matricule?.trim()) {
    return NextResponse.json({ matricule: student.matricule, already: true });
  }

  const matricule = await generateMatricule(
    supabaseAdmin,
    centerId,
    prefix,
    new Date().getFullYear(),
  );
  const { error: updErr } = await supabaseAdmin
    .from("profiles")
    .update({ matricule })
    .eq("id", studentId)
    .eq("center_id", centerId);
  if (updErr) {
    if (updErr.code === "23505") {
      return NextResponse.json({ error: "Ce matricule existe déjà.", code: "MATRICULE_DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }
  return NextResponse.json({ matricule, already: false });
}
