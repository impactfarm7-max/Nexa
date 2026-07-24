import type { SupabaseClient } from "@supabase/supabase-js";

type GroupeRow = { id: string; is_default_signup?: boolean | null };

type ResolveGroupeParams = {
  filiereId: string;
  niveauId?: string | null;
  explicitGroupeId?: string | null;
};

async function fetchGroupesForProgram(
  supabase: SupabaseClient,
  params: ResolveGroupeParams,
): Promise<GroupeRow[]> {
  let query = supabase.from("groupes").select("id, is_default_signup");

  if (params.niveauId) {
    query = query.or(
      `filiere_id.eq.${params.filiereId},niveau_id.eq.${params.niveauId}`,
    );
  } else {
    query = query.eq("filiere_id", params.filiereId);
  }

  const { data } = await query.order("created_at", { ascending: true });
  return (data || []) as GroupeRow[];
}

/** Resolve which groupe (classroom) a new student should join. */
export async function resolveSignupGroupeId(
  supabase: SupabaseClient,
  filiereId: string,
  explicitGroupeId?: string | null,
  niveauId?: string | null,
): Promise<string | null> {
  if (explicitGroupeId) return explicitGroupeId;

  const rows = await fetchGroupesForProgram(supabase, { filiereId, niveauId });
  if (rows.length === 0) return null;

  const markedDefault = rows.find((g) => g.is_default_signup);
  if (markedDefault) return markedDefault.id;

  if (rows.length === 1) return rows[0].id;

  return null;
}

export async function countGroupesForFiliere(
  supabase: SupabaseClient,
  filiereId: string,
  niveauId?: string | null,
): Promise<number> {
  let query = supabase.from("groupes").select("id", { count: "exact", head: true });

  if (niveauId) {
    query = query.or(`filiere_id.eq.${filiereId},niveau_id.eq.${niveauId}`);
  } else {
    query = query.eq("filiere_id", filiereId);
  }

  const { count } = await query;
  return count ?? 0;
}

/** Ensure the classroom community room exists and add the student as member. */
export async function addStudentToGroupeRoom(
  supabase: SupabaseClient,
  params: { studentId: string; groupeId: string; centerId: string },
): Promise<{ ok: boolean; roomId?: string; error?: string }> {
  const { studentId, groupeId, centerId } = params;

  await supabase.rpc("ensure_groupe_room", {
    p_groupe_id: groupeId,
    p_center_id: centerId,
  });

  const { data: room } = await supabase
    .from("community_rooms")
    .select("id")
    .eq("groupe_id", groupeId)
    .eq("type", "classroom")
    .maybeSingle();

  if (!room?.id) {
    return { ok: false, error: "Salle de classe introuvable pour ce groupe." };
  }

  const { error } = await supabase.rpc("add_member_if_missing", {
    p_room_id: room.id,
    p_user_id: studentId,
    p_role: "member",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, roomId: room.id };
}

/** Assign a pending student to the default/sole classroom (signup flow). */
export async function assignPendingClassroom(
  supabase: SupabaseClient,
  params: {
    studentId: string;
    centerId: string;
    filiereId: string;
    groupeId?: string | null;
    niveauId?: string | null;
  },
): Promise<{ ok: boolean; assigned: boolean; groupeId: string | null; error?: string }> {
  const resolvedGroupeId = await resolveSignupGroupeId(
    supabase,
    params.filiereId,
    params.groupeId,
    params.niveauId,
  );

  if (!resolvedGroupeId) {
    return { ok: true, assigned: false, groupeId: null };
  }

  await supabase
    .from("profiles")
    .update({ pending_groupe_id: resolvedGroupeId })
    .eq("id", params.studentId);

  const roomResult = await addStudentToGroupeRoom(supabase, {
    studentId: params.studentId,
    groupeId: resolvedGroupeId,
    centerId: params.centerId,
  });

  if (!roomResult.ok) {
    return {
      ok: false,
      assigned: false,
      groupeId: resolvedGroupeId,
      error: roomResult.error,
    };
  }

  return { ok: true, assigned: true, groupeId: resolvedGroupeId };
}

/** Resolve groupe for activation: explicit > pending > default/sole. */
export async function resolveActivationGroupeId(
  supabase: SupabaseClient,
  params: {
    filiereId: string;
    niveauId?: string | null;
    explicitGroupeId?: string | null;
    pendingGroupeId?: string | null;
  },
): Promise<{ groupeId: string | null; requiresChoice: boolean }> {
  if (params.explicitGroupeId) {
    return { groupeId: params.explicitGroupeId, requiresChoice: false };
  }

  if (params.pendingGroupeId) {
    return { groupeId: params.pendingGroupeId, requiresChoice: false };
  }

  const resolved = await resolveSignupGroupeId(
    supabase,
    params.filiereId,
    null,
    params.niveauId,
  );
  if (resolved) {
    return { groupeId: resolved, requiresChoice: false };
  }

  const count = await countGroupesForFiliere(
    supabase,
    params.filiereId,
    params.niveauId,
  );
  return { groupeId: null, requiresChoice: count > 1 };
}

/** After enrollment, sync classroom membership and clear pending flag. */
export async function finalizeStudentClassroom(
  supabase: SupabaseClient,
  params: { studentId: string; centerId: string; groupeId: string },
): Promise<{ ok: boolean; error?: string }> {
  const roomResult = await addStudentToGroupeRoom(supabase, params);
  if (!roomResult.ok) return roomResult;

  await supabase
    .from("profiles")
    .update({ pending_groupe_id: null })
    .eq("id", params.studentId);

  return { ok: true };
}
