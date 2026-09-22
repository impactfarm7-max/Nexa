import type { SupabaseClient } from "@supabase/supabase-js";

export type AttendanceStatus = "present" | "absent";

export async function resolveSlotGroupeIds(
  supabase: SupabaseClient,
  slotId: string,
  fallbackGroupeId: string | null,
): Promise<string[]> {
  const { data: links } = await supabase
    .from("schedule_slot_groupes")
    .select("groupe_id")
    .eq("slot_id", slotId);
  const ids = (links ?? []).map((l) => l.groupe_id).filter(Boolean);
  if (ids.length) return [...new Set(ids)];
  return fallbackGroupeId ? [fallbackGroupeId] : [];
}

export async function resolveSlotStudentRoster(
  supabase: SupabaseClient,
  centerId: string,
  groupeIds: string[],
): Promise<{ id: string; name: string; groupe_id: string | null }[]> {
  if (groupeIds.length === 0) return [];

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, groupe_id, profiles:student_id(id, prenom, nom, center_id, role)")
    .in("groupe_id", groupeIds)
    .in("status", ["active", "completed"]);

  const map = new Map<string, { id: string; name: string; groupe_id: string | null }>();
  for (const e of enrollments ?? []) {
    const raw = e.profiles as
      | {
          id: string;
          prenom: string | null;
          nom: string | null;
          center_id: string | null;
          role: string | null;
        }
      | {
          id: string;
          prenom: string | null;
          nom: string | null;
          center_id: string | null;
          role: string | null;
        }[]
      | null;
    const p = Array.isArray(raw) ? raw[0] ?? null : raw;
    if (!e.student_id || !p || p.center_id !== centerId || p.role !== "student") continue;
    if (map.has(e.student_id)) continue;
    map.set(e.student_id, {
      id: e.student_id,
      name: `${p.prenom || ""} ${p.nom || ""}`.trim() || e.student_id,
      groupe_id: e.groupe_id,
    });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
