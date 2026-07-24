/** Ciblage coaching de groupe : uniquement les classes liées (au moins une requise). */
export function studentMatchesCollectiveSlot(
  slot: {
    groupe_id?: string | null;
    schedule_slot_groupes?: Array<{ groupe_id: string }>;
  },
  studentGroupeIds: string[]
): boolean {
  const linked = (slot.schedule_slot_groupes ?? []).map((g) => g.groupe_id).filter(Boolean);

  // Aucune classe → pas de coaching de groupe ouvert (utiliser Sessions Live pour ça)
  if (linked.length === 0 && !slot.groupe_id) {
    return false;
  }

  if (studentGroupeIds.length === 0) return false;

  if (linked.length > 0) {
    return linked.some((id) => studentGroupeIds.includes(id));
  }
  if (slot.groupe_id) {
    return studentGroupeIds.includes(slot.groupe_id);
  }
  return false;
}

export function collectiveTargetGroupeIds(slot: {
  groupe_id?: string | null;
  schedule_slot_groupes?: Array<{ groupe_id: string }>;
}): string[] {
  const linked = (slot.schedule_slot_groupes ?? []).map((g) => g.groupe_id).filter(Boolean);
  if (linked.length > 0) return linked;
  if (slot.groupe_id) return [slot.groupe_id];
  return [];
}
