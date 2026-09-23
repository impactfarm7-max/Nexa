import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
} from "@/app/utils/trainerAcademicScope.server";
import { formatUeHoursShort, sumUeHours } from "@/app/utils/teachingLoad";
import { isUniversityCenter } from "@/app/utils/student-matricule";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function requireUniversity(ctx: { centerType: string | null }) {
  if (!isUniversityCenter(ctx.centerType)) {
    return fail("Charge d'enseignement réservée aux centres université.", 403);
  }
  return null;
}

/**
 * GET — charge d'enseignement agrégée par formateur (UE assignées, hors EDT).
 * PATCH — met à jour service_annuel_heures d'un formateur du centre.
 */
export async function GET(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const univGate = requireUniversity(auth.ctx!);
  if (univGate) return univGate;
  const perm = await requireCenterPermission(auth.ctx, "cours");
  if (perm) return perm;

  try {
    const centerId = auth.ctx!.centerId;
    let scopeUeIds: Set<string> | null = null;
    let scopeSelfOnly: string | null = null;
    if (isTrainerLeastPrivilege(auth.ctx!)) {
      const scope = await getTrainerAcademicScope(supabaseAdmin, auth.ctx!.user.id, centerId);
      scopeSelfOnly = auth.ctx!.user.id;
      scopeUeIds = scope.filiereMatiereIds;
      if (scope.empty) {
        return NextResponse.json({ trainers: [], missingColumns: false });
      }
    }

    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, role, service_annuel_heures")
      .eq("center_id", centerId)
      .in("role", ["trainer", "center_manager", "campus_manager", "manager"]);
    if (staffErr) {
      if (/service_annuel_heures/i.test(staffErr.message || "") || ["42703", "PGRST204"].includes(staffErr.code || "")) {
        return fail(
          "Colonne service_annuel_heures absente — exécutez supabase-teaching-load-heures-2026-09-23.sql.",
          503,
        );
      }
      return fail(staffErr.message, 500);
    }

    let trainers = (staff || []).filter((p) => p.role === "trainer" || p.role === "center_manager" || p.role === "campus_manager" || p.role === "manager");
    if (scopeSelfOnly) trainers = trainers.filter((p) => p.id === scopeSelfOnly);

    const trainerIds = trainers.map((t) => t.id);
    if (!trainerIds.length) return NextResponse.json({ trainers: [] });

    const { data: links, error: linkErr } = await supabaseAdmin
      .from("matiere_formateurs")
      .select(
        "formateur_id, filiere_matiere_id, filiere_matieres(id, heures_cm, heures_td, heures_tp, course_format, filiere_id, filieres(name, center_id), exam_disciplines(name))",
      )
      .in("formateur_id", trainerIds);
    if (linkErr) {
      if (/heures_cm|heures_td|heures_tp/i.test(linkErr.message || "") || ["42703", "PGRST204"].includes(linkErr.code || "")) {
        return fail(
          "Colonnes heures CM/TD/TP absentes — exécutez supabase-teaching-load-heures-2026-09-23.sql.",
          503,
        );
      }
      return fail(linkErr.message, 500);
    }

    type UeRow = {
      id: string;
      name: string;
      filiere: string;
      heures_cm: number | null;
      heures_td: number | null;
      heures_tp: number | null;
      course_format: string | null;
      total: number;
    };

    const byTrainer = new Map<string, UeRow[]>();
    for (const link of links || []) {
      const fm = link.filiere_matieres as
        | {
            id: string;
            heures_cm?: number | null;
            heures_td?: number | null;
            heures_tp?: number | null;
            course_format?: string | null;
            filieres?: { name?: string; center_id?: string } | { name?: string; center_id?: string }[] | null;
            exam_disciplines?: { name?: string } | { name?: string }[] | null;
          }
        | {
            id: string;
            heures_cm?: number | null;
            heures_td?: number | null;
            heures_tp?: number | null;
            course_format?: string | null;
            filieres?: { name?: string; center_id?: string } | { name?: string; center_id?: string }[] | null;
            exam_disciplines?: { name?: string } | { name?: string }[] | null;
          }[]
        | null;
      const row = Array.isArray(fm) ? fm[0] : fm;
      if (!row?.id) continue;
      if (scopeUeIds && !scopeUeIds.has(row.id)) continue;
      const fil = Array.isArray(row.filieres) ? row.filieres[0] : row.filieres;
      if (fil?.center_id && fil.center_id !== centerId) continue;
      const disc = Array.isArray(row.exam_disciplines) ? row.exam_disciplines[0] : row.exam_disciplines;
      const hours = {
        heures_cm: row.heures_cm != null ? Number(row.heures_cm) : null,
        heures_td: row.heures_td != null ? Number(row.heures_td) : null,
        heures_tp: row.heures_tp != null ? Number(row.heures_tp) : null,
      };
      const list = byTrainer.get(link.formateur_id) || [];
      if (list.some((u) => u.id === row.id)) continue;
      list.push({
        id: row.id,
        name: disc?.name || "—",
        filiere: fil?.name || "—",
        ...hours,
        course_format: row.course_format || null,
        total: sumUeHours(hours),
      });
      byTrainer.set(link.formateur_id, list);
    }

    const result = trainers
      .map((t) => {
        const ues = (byTrainer.get(t.id) || []).sort((a, b) => a.name.localeCompare(b.name));
        const load = ues.reduce((s, u) => s + u.total, 0);
        const service =
          t.service_annuel_heures != null && Number(t.service_annuel_heures) > 0
            ? Number(t.service_annuel_heures)
            : null;
        const over = service != null && load > service;
        return {
          id: t.id,
          name: `${t.prenom || ""} ${t.nom || ""}`.trim() || t.id,
          role: t.role,
          service_annuel_heures: service,
          load_hours: load,
          load_pct: service ? Math.round((load / service) * 100) : null,
          over_service: over,
          ues: ues.map((u) => ({
            ...u,
            hours_label: formatUeHoursShort(u),
          })),
        };
      })
      .filter((t) => t.ues.length > 0 || t.role === "trainer")
      .sort((a, b) => b.load_hours - a.load_hours || a.name.localeCompare(b.name));

    return NextResponse.json({ trainers: result });
  } catch (e) {
    console.error("[centre/teaching-load GET]", e);
    return fail("Lecture charge impossible.", 500);
  }
}

export async function PATCH(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const univGate = requireUniversity(auth.ctx!);
  if (univGate) return univGate;
  if (isTrainerLeastPrivilege(auth.ctx!)) return fail("Non autorisé.", 403);
  const perm = await requireCenterPermission(auth.ctx, "staff");
  if (perm) return perm;

  try {
    const body = await req.json();
    const formateurId = String(body.formateur_id || "");
    const raw = body.service_annuel_heures;
    if (!formateurId) return fail("formateur_id requis.");
    const service =
      raw === null || raw === "" || raw === undefined
        ? null
        : Number(raw);
    if (service != null && (!Number.isFinite(service) || service < 0)) {
      return fail("service_annuel_heures invalide.");
    }

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, center_id, role")
      .eq("id", formateurId)
      .maybeSingle();
    if (pErr || !profile) return fail("Formateur introuvable.", 404);
    if (profile.center_id !== auth.ctx!.centerId) return fail("Hors centre.", 403);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ service_annuel_heures: service })
      .eq("id", formateurId);
    if (error) {
      if (/service_annuel_heures/i.test(error.message || "") || ["42703", "PGRST204"].includes(error.code || "")) {
        return fail(
          "Colonne service_annuel_heures absente — exécutez supabase-teaching-load-heures-2026-09-23.sql.",
          503,
        );
      }
      return fail(error.message, 500);
    }
    return NextResponse.json({ ok: true, formateur_id: formateurId, service_annuel_heures: service });
  } catch (e) {
    console.error("[centre/teaching-load PATCH]", e);
    return fail("Mise à jour impossible.", 500);
  }
}
