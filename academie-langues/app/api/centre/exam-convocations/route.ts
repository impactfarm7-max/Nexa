import { NextResponse } from "next/server";
import { getCenterStaffContext, requireCenterPermission, supabaseAdmin } from "@/app/utils/center-auth-server";
import {
  createUnivConvocationAssignments,
  resolveUnivConvocationStudentIds,
  type ConvocationTargetScope,
} from "@/app/utils/examConvocations.server";
import {
  assertTrainerFiliere,
  assertTrainerGroupes,
  assertTrainerUe,
  getTrainerAcademicScope,
  isTrainerLeastPrivilege,
  studentInTrainerScope,
  type TrainerAcademicScope,
} from "@/app/utils/trainerAcademicScope.server";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function normalizePlanningMode(v: unknown): "manual" | "auto" {
  return v === "auto" ? "auto" : "manual";
}

async function requireUniversite(ctx: { centerId: string; centerType: string | null }) {
  if (ctx.centerType !== "universite") {
    return fail("Réservé aux centres université.", 403);
  }
  return null;
}

/** Staff : examens OU etudiants ; formateurs : examens. */
async function requireConvocationAccess(ctx: Parameters<typeof requireCenterPermission>[0]) {
  if (ctx.role === "trainer") {
    return requireCenterPermission(ctx, "examens");
  }
  const examensErr = await requireCenterPermission(ctx, "examens");
  if (!examensErr) return null;
  return requireCenterPermission(ctx, "etudiants");
}

async function loadTrainerScopeOrNull(
  ctx: Parameters<typeof isTrainerLeastPrivilege>[0],
): Promise<TrainerAcademicScope | null> {
  if (!isTrainerLeastPrivilege(ctx)) return null;
  return getTrainerAcademicScope(supabaseAdmin, ctx.user.id, ctx.centerId);
}

function denyEmptyScope(scope: TrainerAcademicScope | null) {
  if (scope?.empty) return fail("Aucune UE / promotion assignée.", 403);
  return null;
}

/** Vérifie que chaque étudiant a une inscription active dans une promo du formateur. */
async function assertStudentsInTrainerScope(
  scope: TrainerAcademicScope,
  centerId: string,
  studentIds: string[],
): Promise<string | null> {
  if (!studentIds.length) return "Choisissez au moins un étudiant.";
  const { data: enr } = await supabaseAdmin
    .from("enrollments")
    .select("student_id, groupe_id, filieres(center_id)")
    .in("student_id", studentIds)
    .in("status", ["active", "completed"]);
  for (const sid of studentIds) {
    const rows = (enr || []).filter((e) => {
      if (e.student_id !== sid) return false;
      const f = e.filieres as { center_id?: string } | { center_id?: string }[] | null;
      const c = Array.isArray(f) ? f[0]?.center_id : f?.center_id;
      return c === centerId;
    });
    if (!studentInTrainerScope(scope, rows.map((e) => e.groupe_id))) {
      return "Hors de votre périmètre (étudiant).";
    }
  }
  return null;
}

export async function GET(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireConvocationAccess(auth.ctx);
  if (perm) return perm;
  const univErr = await requireUniversite(auth.ctx);
  if (univErr) return univErr;

  const trainerScope = await loadTrainerScopeOrNull(auth.ctx);
  const emptyErr = denyEmptyScope(trainerScope);
  if (emptyErr) return emptyErr;

  const url = new URL(req.url);
  if (url.searchParams.get("meta") === "1") {
    const { data: centerRow } = await supabaseAdmin
      .from("centers")
      .select("exam_convocation_from_planning")
      .eq("id", auth.ctx.centerId)
      .maybeSingle();

    const { data: filieres } = await supabaseAdmin
      .from("filieres")
      .select("id, name")
      .eq("center_id", auth.ctx.centerId)
      .eq("type", "cursus")
      .order("name");
    let filiereIds = (filieres ?? []).map((f) => f.id);
    if (trainerScope) {
      filiereIds = filiereIds.filter((id) => trainerScope.filiereIds.has(id));
    }

    const [{ data: rooms }, { data: niveaux }, { data: matieres }, { data: enrollments }] = await Promise.all([
      supabaseAdmin
        .from("schedule_slots")
        .select("room_name")
        .eq("center_id", auth.ctx.centerId)
        .not("room_name", "is", null),
      filiereIds.length
        ? supabaseAdmin.from("niveaux").select("id, filiere_id").in("filiere_id", filiereIds)
        : Promise.resolve({ data: [] as { id: string; filiere_id: string }[] }),
      filiereIds.length
        ? supabaseAdmin
            .from("filiere_matieres")
            .select("id, filiere_id, credits, course_format, exam_disciplines(name)")
            .in("filiere_id", filiereIds)
        : Promise.resolve({ data: [] as { id: string; filiere_id: string; credits: number | null; course_format: string | null; exam_disciplines: { name: string } | { name: string }[] | null }[] }),
      filiereIds.length
        ? supabaseAdmin
            .from("enrollments")
            .select("student_id, groupe_id, profiles:student_id(id, prenom, nom)")
            .in("filiere_id", filiereIds)
            .in("status", ["active", "completed"])
        : Promise.resolve({ data: [] as { student_id: string; groupe_id: string | null; profiles: { id: string; prenom: string | null; nom: string | null } | null }[] }),
    ]);

    const niveauIds = (niveaux ?? []).map((n) => n.id);
    const niveauById = new Map((niveaux ?? []).map((n) => [n.id, n.filiere_id]));
    let { data: groupes } = niveauIds.length
      ? await supabaseAdmin.from("groupes").select("id, nom, niveau_id").in("niveau_id", niveauIds).order("nom")
      : { data: [] as { id: string; nom: string; niveau_id: string }[] };
    if (trainerScope) {
      groupes = (groupes ?? []).filter((g) => trainerScope.groupeIds.has(g.id));
    }

    const roomSet = new Set<string>();
    for (const r of rooms ?? []) {
      const name = (r.room_name || "").trim();
      if (name) roomSet.add(name);
    }

    const studentMap = new Map<string, { id: string; name: string; groupe_id: string | null }>();
    for (const e of enrollments ?? []) {
      if (trainerScope && (!e.groupe_id || !trainerScope.groupeIds.has(e.groupe_id))) continue;
      const p = e.profiles as { id: string; prenom: string | null; nom: string | null } | null;
      if (!e.student_id || studentMap.has(e.student_id)) continue;
      studentMap.set(e.student_id, {
        id: e.student_id,
        name: `${p?.prenom || ""} ${p?.nom || ""}`.trim() || e.student_id,
        groupe_id: e.groupe_id,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: planningRaw } = await supabaseAdmin
      .from("schedule_slots")
      .select("id, title, room_name, specific_date, start_time, end_time, groupe_id, discipline_id, is_exam, exam_disciplines(name)")
      .eq("center_id", auth.ctx.centerId)
      .eq("is_exam", true)
      .not("specific_date", "is", null)
      .gte("specific_date", today)
      .order("specific_date", { ascending: true })
      .limit(40);

    let planningSlots = (planningRaw ?? []).map((s) => {
      const disc = s.exam_disciplines as { name?: string } | { name?: string }[] | null;
      const discName = Array.isArray(disc) ? disc[0]?.name : disc?.name;
      const start = String(s.start_time || "08:00").slice(0, 5);
      const end = String(s.end_time || "10:00").slice(0, 5);
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const durationMinutes = Math.max(15, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0)));
      return {
        id: s.id,
        title: (s.title || discName || "Épreuve").trim(),
        room_name: (s.room_name || "").trim(),
        specific_date: s.specific_date as string,
        start_time: start,
        end_time: end,
        duration_minutes: durationMinutes,
        groupe_id: s.groupe_id as string | null,
        scheduled_at: `${s.specific_date}T${start}:00`,
        is_exam: true,
        has_convocation: false as boolean,
      };
    });
    if (trainerScope) {
      planningSlots = planningSlots.filter((s) => s.groupe_id && trainerScope.groupeIds.has(s.groupe_id));
    }
    const slotIds = planningSlots.map((s) => s.id);
    if (slotIds.length) {
      const linkedIds = new Set<string>();
      const { data: linked } = await supabaseAdmin
        .from("exam_convocations")
        .select("schedule_slot_id")
        .in("schedule_slot_id", slotIds)
        .neq("status", "cancelled");
      for (const row of linked ?? []) {
        if (row.schedule_slot_id) linkedIds.add(row.schedule_slot_id);
      }
      planningSlots = planningSlots.map((s) => ({ ...s, has_convocation: linkedIds.has(s.id) }));
    }

    let matieresScoped = matieres ?? [];
    if (trainerScope) {
      matieresScoped = matieresScoped.filter((m) => trainerScope.filiereMatiereIds.has(m.id));
    }

    return NextResponse.json({
      filieres: (filieres ?? []).filter((f) => !trainerScope || trainerScope.filiereIds.has(f.id)),
      rooms: [...roomSet].sort((a, b) => a.localeCompare(b, "fr")),
      groupes: (groupes ?? []).map((g) => ({
        id: g.id,
        nom: g.nom,
        filiere_id: niveauById.get(g.niveau_id) ?? null,
      })),
      matieres: matieresScoped.map((m) => {
        const disc = m.exam_disciplines;
        const name = Array.isArray(disc) ? disc[0]?.name : disc?.name;
        const fmt = m.course_format === "cm" || m.course_format === "td" || m.course_format === "tp"
          ? m.course_format.toUpperCase()
          : null;
        return {
          id: m.id,
          filiere_id: m.filiere_id,
          label: name ? (fmt ? `${name} · ${fmt}` : name) : "UE",
          credits: m.credits,
        };
      }),
      students: [...studentMap.values()].sort((a, b) => a.name.localeCompare(b.name, "fr")),
      planningSlots,
      exam_convocation_from_planning: normalizePlanningMode(centerRow?.exam_convocation_from_planning),
    });
  }

  const id = url.searchParams.get("id");
  if (id) {
    const { data: convocation, error } = await supabaseAdmin
      .from("exam_convocations")
      .select("*")
      .eq("id", id)
      .eq("center_id", auth.ctx.centerId)
      .maybeSingle();
    if (error || !convocation) return fail("Convocation introuvable.", 404);

    if (trainerScope) {
      if (convocation.filiere_matiere_id) {
        const ueErr = assertTrainerUe(trainerScope, convocation.filiere_matiere_id);
        if (ueErr) return fail(ueErr, 403);
      }
      const [{ data: grpsCheck }, { data: studsCheck }] = await Promise.all([
        supabaseAdmin.from("exam_convocation_groupes").select("groupe_id").eq("convocation_id", id),
        supabaseAdmin.from("exam_convocation_students").select("user_id").eq("convocation_id", id),
      ]);
      const gids = (grpsCheck ?? []).map((g) => g.groupe_id);
      const sids = (studsCheck ?? []).map((s) => s.user_id);
      if (gids.length) {
        const gErr = assertTrainerGroupes(trainerScope, gids);
        if (gErr) return fail(gErr, 403);
      } else if (convocation.target_scope === "all") {
        return fail("Hors de votre périmètre.", 403);
      } else if (convocation.target_scope === "students" || sids.length) {
        const sErr = await assertStudentsInTrainerScope(trainerScope, auth.ctx.centerId, sids);
        if (sErr) return fail(sErr, 403);
      } else {
        // Groupes vides sans étudiants : pas lisible hors périmètre
        return fail("Hors de votre périmètre.", 403);
      }
    }

    const [{ data: grps }, { data: studs }, { data: assignments }] = await Promise.all([
      supabaseAdmin.from("exam_convocation_groupes").select("groupe_id").eq("convocation_id", id),
      supabaseAdmin.from("exam_convocation_students").select("user_id").eq("convocation_id", id),
      supabaseAdmin
        .from("exam_convocation_assignments")
        .select("user_id, status, profiles:user_id(prenom, nom)")
        .eq("convocation_id", id),
    ]);

    return NextResponse.json({
      convocation,
      groupe_ids: (grps ?? []).map((g) => g.groupe_id),
      student_ids: (studs ?? []).map((s) => s.user_id),
      assignments: assignments ?? [],
    });
  }

  let { data: convocations, error } = await supabaseAdmin
    .from("exam_convocations")
    .select("*")
    .eq("center_id", auth.ctx.centerId)
    .order("scheduled_at", { ascending: false })
    .limit(100);
  if (error) return fail(error.message, 500);

  if (trainerScope && convocations?.length) {
    const ids = convocations.map((c) => c.id);
    const { data: linkGroups } = await supabaseAdmin
      .from("exam_convocation_groupes")
      .select("convocation_id, groupe_id")
      .in("convocation_id", ids);
    const groupsByConv = new Map<string, string[]>();
    for (const row of linkGroups ?? []) {
      const list = groupsByConv.get(row.convocation_id) || [];
      list.push(row.groupe_id);
      groupsByConv.set(row.convocation_id, list);
    }
    convocations = convocations.filter((c) => {
      if (c.filiere_matiere_id && !trainerScope.filiereMatiereIds.has(c.filiere_matiere_id)) return false;
      const gids = groupsByConv.get(c.id) || [];
      if (gids.length) return gids.every((gid) => trainerScope.groupeIds.has(gid));
      if (c.target_scope === "all") return false;
      if (c.created_by === auth.ctx.user.id) return true;
      return false;
    });
  }

  return NextResponse.json({ convocations: convocations ?? [] });
}

export async function POST(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireConvocationAccess(auth.ctx);
  if (perm) return perm;
  const univErr = await requireUniversite(auth.ctx);
  if (univErr) return univErr;

  try {
    const body = await req.json();
    const epreuve_label = String(body.epreuve_label || "").trim();
    const room_name = String(body.room_name || "").trim();
    const scheduled_at = String(body.scheduled_at || "").trim();
    const target_scope = (body.target_scope || "groupes") as ConvocationTargetScope;
    const groupe_ids: string[] = Array.isArray(body.groupe_ids) ? body.groupe_ids.map(String) : [];
    const student_ids: string[] = Array.isArray(body.student_ids) ? body.student_ids.map(String) : [];
    const filiere_id = body.filiere_id ? String(body.filiere_id) : null;
    const filiere_matiere_id = body.filiere_matiere_id ? String(body.filiere_matiere_id) : null;
    const duration_minutes = body.duration_minutes != null ? Number(body.duration_minutes) : null;
    const instructions = body.instructions ? String(body.instructions).trim() : null;
    const status = body.status === "draft" ? "draft" : "published";
    const schedule_slot_id = body.schedule_slot_id ? String(body.schedule_slot_id) : null;

    if (!epreuve_label) return fail("Indiquez l'épreuve.");
    if (!room_name) return fail("Indiquez la salle.");
    if (!scheduled_at || Number.isNaN(Date.parse(scheduled_at))) return fail("Date invalide.");
    if (!["all", "groupes", "students"].includes(target_scope)) return fail("Cible invalide.");
    if (target_scope === "groupes" && groupe_ids.length === 0) return fail("Choisissez au moins une classe.");
    if (target_scope === "students" && student_ids.length === 0) return fail("Choisissez au moins un étudiant.");

    const trainerScope = await loadTrainerScopeOrNull(auth.ctx);
    const emptyErr = denyEmptyScope(trainerScope);
    if (emptyErr) return emptyErr;
    if (trainerScope) {
      if (target_scope === "all") return fail("Cible « tous » réservée à la direction.", 403);
      if (filiere_id) {
        const fErr = assertTrainerFiliere(trainerScope, filiere_id);
        if (fErr) return fail(fErr, 403);
      }
      if (filiere_matiere_id) {
        const ueErr = assertTrainerUe(trainerScope, filiere_matiere_id);
        if (ueErr) return fail(ueErr, 403);
      }
      if (groupe_ids.length) {
        const gErr = assertTrainerGroupes(trainerScope, groupe_ids);
        if (gErr) return fail(gErr, 403);
      }
      if (target_scope === "students" && student_ids.length) {
        const sErr = await assertStudentsInTrainerScope(trainerScope, auth.ctx.centerId, student_ids);
        if (sErr) return fail(sErr, 403);
      }
    }

    const { data: convocation, error } = await supabaseAdmin
      .from("exam_convocations")
      .insert({
        center_id: auth.ctx.centerId,
        filiere_id,
        filiere_matiere_id,
        epreuve_label,
        scheduled_at: new Date(scheduled_at).toISOString(),
        duration_minutes: Number.isFinite(duration_minutes) && duration_minutes! > 0 ? duration_minutes : null,
        room_name,
        instructions,
        status,
        target_scope,
        schedule_slot_id,
        created_by: auth.ctx.user.id,
      })
      .select("*")
      .single();
    if (error || !convocation) return fail(error?.message || "Création impossible.", 500);

    if (target_scope === "groupes" && groupe_ids.length) {
      await supabaseAdmin.from("exam_convocation_groupes").insert(
        groupe_ids.map((groupe_id) => ({ convocation_id: convocation.id, groupe_id })),
      );
    }
    if (target_scope === "students" && student_ids.length) {
      await supabaseAdmin.from("exam_convocation_students").insert(
        student_ids.map((user_id) => ({ convocation_id: convocation.id, user_id })),
      );
    }

    if (status === "published") {
      const resolved = await resolveUnivConvocationStudentIds(
        supabaseAdmin,
        auth.ctx.centerId,
        target_scope,
        groupe_ids,
        student_ids,
        filiere_id,
      );
      await createUnivConvocationAssignments(
        supabaseAdmin,
        convocation.id,
        resolved,
        epreuve_label,
        convocation.scheduled_at,
        room_name,
      );
    }

    return NextResponse.json({ convocation });
  } catch (e) {
    console.error("[centre/exam-convocations POST]", e);
    return fail("Impossible de créer la convocation.", 500);
  }
}

export async function PATCH(req: Request) {
  const auth = await getCenterStaffContext(req);
  if (auth.error) return auth.error;
  const perm = await requireConvocationAccess(auth.ctx);
  if (perm) return perm;
  const univErr = await requireUniversite(auth.ctx);
  if (univErr) return univErr;

  try {
    const body = await req.json();

    if (body.exam_convocation_from_planning != null && !body.id) {
      if (isTrainerLeastPrivilege(auth.ctx)) {
        return fail("Réservé à la direction.", 403);
      }
      const mode = normalizePlanningMode(body.exam_convocation_from_planning);
      const { error: modeErr } = await supabaseAdmin
        .from("centers")
        .update({ exam_convocation_from_planning: mode })
        .eq("id", auth.ctx.centerId);
      if (modeErr) return fail(modeErr.message, 500);
      return NextResponse.json({ ok: true, exam_convocation_from_planning: mode });
    }

    const id = String(body.id || "");
    if (!id) return fail("id requis.");

    const { data: existing } = await supabaseAdmin
      .from("exam_convocations")
      .select("*")
      .eq("id", id)
      .eq("center_id", auth.ctx.centerId)
      .maybeSingle();
    if (!existing) return fail("Convocation introuvable.", 404);

    const trainerScope = await loadTrainerScopeOrNull(auth.ctx);
    const emptyErr = denyEmptyScope(trainerScope);
    if (emptyErr) return emptyErr;
    if (trainerScope) {
      if (existing.filiere_matiere_id) {
        const ueErr = assertTrainerUe(trainerScope, existing.filiere_matiere_id);
        if (ueErr) return fail(ueErr, 403);
      }
      const { data: existingGrps } = await supabaseAdmin
        .from("exam_convocation_groupes")
        .select("groupe_id")
        .eq("convocation_id", id);
      const existingGids = (existingGrps ?? []).map((g) => g.groupe_id);
      if (existingGids.length) {
        const gErr = assertTrainerGroupes(trainerScope, existingGids);
        if (gErr) return fail(gErr, 403);
      } else if (existing.target_scope === "all") {
        return fail("Hors de votre périmètre.", 403);
      } else if (existing.target_scope === "students") {
        const { data: existingStuds } = await supabaseAdmin
          .from("exam_convocation_students")
          .select("user_id")
          .eq("convocation_id", id);
        const sErr = await assertStudentsInTrainerScope(
          trainerScope,
          auth.ctx.centerId,
          (existingStuds ?? []).map((s) => s.user_id),
        );
        if (sErr) return fail(sErr, 403);
      }
      if (body.filiere_id) {
        const fErr = assertTrainerFiliere(trainerScope, String(body.filiere_id));
        if (fErr) return fail(fErr, 403);
      }
      if (body.filiere_matiere_id) {
        const ueErr = assertTrainerUe(trainerScope, String(body.filiere_matiere_id));
        if (ueErr) return fail(ueErr, 403);
      }
      if (Array.isArray(body.groupe_ids) && body.groupe_ids.length) {
        const gErr = assertTrainerGroupes(trainerScope, body.groupe_ids.map(String));
        if (gErr) return fail(gErr, 403);
      }
      if (Array.isArray(body.student_ids) && body.student_ids.length) {
        const sErr = await assertStudentsInTrainerScope(
          trainerScope,
          auth.ctx.centerId,
          body.student_ids.map(String),
        );
        if (sErr) return fail(sErr, 403);
      }
      if (body.target_scope === "all") return fail("Cible « tous » réservée à la direction.", 403);
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.epreuve_label != null) patch.epreuve_label = String(body.epreuve_label).trim();
    if (body.room_name != null) patch.room_name = String(body.room_name).trim();
    if (body.scheduled_at != null) {
      const d = String(body.scheduled_at);
      if (Number.isNaN(Date.parse(d))) return fail("Date invalide.");
      patch.scheduled_at = new Date(d).toISOString();
    }
    if (body.duration_minutes !== undefined) {
      const n = body.duration_minutes == null ? null : Number(body.duration_minutes);
      patch.duration_minutes = n != null && Number.isFinite(n) && n > 0 ? n : null;
    }
    if (body.instructions !== undefined) patch.instructions = body.instructions ? String(body.instructions).trim() : null;
    if (body.filiere_id !== undefined) patch.filiere_id = body.filiere_id ? String(body.filiere_id) : null;
    if (body.filiere_matiere_id !== undefined) {
      patch.filiere_matiere_id = body.filiere_matiere_id ? String(body.filiere_matiere_id) : null;
    }
    if (body.status === "cancelled" || body.status === "published" || body.status === "draft") {
      patch.status = body.status;
    }
    if (body.target_scope != null) {
      if (!["all", "groupes", "students"].includes(body.target_scope)) return fail("Cible invalide.");
      patch.target_scope = body.target_scope;
    }

    const retarget =
      body.target_scope != null
      || Array.isArray(body.groupe_ids)
      || Array.isArray(body.student_ids);

    const { data: convocation, error } = await supabaseAdmin
      .from("exam_convocations")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !convocation) return fail(error?.message || "Mise à jour impossible.", 500);

    if (retarget) {
      const scope = (convocation.target_scope || "groupes") as ConvocationTargetScope;
      const groupe_ids: string[] = Array.isArray(body.groupe_ids) ? body.groupe_ids.map(String) : [];
      const student_ids: string[] = Array.isArray(body.student_ids) ? body.student_ids.map(String) : [];
      await supabaseAdmin.from("exam_convocation_groupes").delete().eq("convocation_id", id);
      await supabaseAdmin.from("exam_convocation_students").delete().eq("convocation_id", id);
      if (scope === "groupes" && groupe_ids.length) {
        await supabaseAdmin.from("exam_convocation_groupes").insert(
          groupe_ids.map((groupe_id) => ({ convocation_id: id, groupe_id })),
        );
      }
      if (scope === "students" && student_ids.length) {
        await supabaseAdmin.from("exam_convocation_students").insert(
          student_ids.map((user_id) => ({ convocation_id: id, user_id })),
        );
      }
    }

    const shouldRefreshAssignments =
      convocation.status === "published"
      && (retarget
        || existing.status !== "published"
        || body.epreuve_label != null
        || body.room_name != null
        || body.scheduled_at != null
        || body.notify === true);

    if (shouldRefreshAssignments) {
      const [{ data: grps }, { data: studs }] = await Promise.all([
        supabaseAdmin.from("exam_convocation_groupes").select("groupe_id").eq("convocation_id", id),
        supabaseAdmin.from("exam_convocation_students").select("user_id").eq("convocation_id", id),
      ]);
      const resolved = await resolveUnivConvocationStudentIds(
        supabaseAdmin,
        auth.ctx.centerId,
        convocation.target_scope as ConvocationTargetScope,
        (grps ?? []).map((g) => g.groupe_id),
        (studs ?? []).map((s) => s.user_id),
        convocation.filiere_id,
      );
      const { data: prev } = await supabaseAdmin
        .from("exam_convocation_assignments")
        .select("user_id")
        .eq("convocation_id", id)
        .neq("status", "cancelled");
      const prevSet = new Set((prev ?? []).map((p) => p.user_id));
      const nextSet = new Set(resolved);
      const removed = [...prevSet].filter((uid) => !nextSet.has(uid));
      if (removed.length) {
        await supabaseAdmin
          .from("exam_convocation_assignments")
          .update({ status: "cancelled" })
          .eq("convocation_id", id)
          .in("user_id", removed);
      }
      await createUnivConvocationAssignments(
        supabaseAdmin,
        id,
        resolved,
        convocation.epreuve_label,
        convocation.scheduled_at,
        convocation.room_name,
      );
    }

    if (convocation.status === "cancelled") {
      await supabaseAdmin
        .from("exam_convocation_assignments")
        .update({ status: "cancelled" })
        .eq("convocation_id", id);
    }

    return NextResponse.json({ convocation });
  } catch (e) {
    console.error("[centre/exam-convocations PATCH]", e);
    return fail("Impossible de mettre à jour la convocation.", 500);
  }
}
