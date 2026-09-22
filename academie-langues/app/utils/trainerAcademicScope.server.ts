import type { SupabaseClient } from "@supabase/supabase-js";
import type { CenterStaffContext } from "@/app/utils/center-auth-server";

/** Formateur univ : uniquement ses UE + ses promotions (moindre privilège). */
export function isTrainerLeastPrivilege(ctx: CenterStaffContext): boolean {
  return ctx.role === "trainer" && ctx.centerType === "universite";
}

export type TrainerAcademicScope = {
  filiereMatiereIds: Set<string>;
  groupeIds: Set<string>;
  filiereIds: Set<string>;
  disciplineIds: Set<string>;
  /** Aucune UE assignée → périmètre vide (tout refuser). */
  empty: boolean;
};

/**
 * Périmètre académique formateur :
 * - UE via `matiere_formateurs` (filtrées au centre — deny si center_id manquant)
 * - promotions via `formateur_groupes` filtrées au centre ; sinon fallback niveaux/filières
 */
export async function getTrainerAcademicScope(
  db: SupabaseClient,
  formateurId: string,
  centerId: string,
): Promise<TrainerAcademicScope> {
  const empty: TrainerAcademicScope = {
    filiereMatiereIds: new Set(),
    groupeIds: new Set(),
    filiereIds: new Set(),
    disciplineIds: new Set(),
    empty: true,
  };

  const { data: mfRows } = await db
    .from("matiere_formateurs")
    .select("filiere_matiere_id, filiere_matieres(id, filiere_id, niveau_id, discipline_id, filieres(center_id))")
    .eq("formateur_id", formateurId);

  const filiereMatiereIds = new Set<string>();
  const filiereIds = new Set<string>();
  const niveauIds = new Set<string>();
  const disciplineIds = new Set<string>();

  for (const row of mfRows || []) {
    const fm = row.filiere_matieres as
      | {
          id?: string;
          filiere_id?: string;
          niveau_id?: string | null;
          discipline_id?: string | null;
          filieres?: { center_id?: string } | { center_id?: string }[] | null;
        }
      | null;
    if (!fm?.id) continue;
    const fil = fm.filieres;
    const center = Array.isArray(fil) ? fil[0]?.center_id : fil?.center_id;
    // Deny-by-default : sans center_id fiable, ignorer l'UE (évite multi-centre).
    if (!center || center !== centerId) continue;
    filiereMatiereIds.add(fm.id);
    if (fm.filiere_id) filiereIds.add(fm.filiere_id);
    if (fm.niveau_id) niveauIds.add(fm.niveau_id);
    if (fm.discipline_id) disciplineIds.add(fm.discipline_id);
  }

  if (filiereMatiereIds.size === 0) return empty;

  const { data: fgRows } = await db
    .from("formateur_groupes")
    .select("groupe_id")
    .eq("formateur_id", formateurId);

  const explicitGroupes = [...new Set((fgRows || []).map((r) => r.groupe_id).filter(Boolean))];
  const groupeIds = new Set<string>();

  if (explicitGroupes.length > 0) {
    for (const id of explicitGroupes) groupeIds.add(id);
  } else if (niveauIds.size > 0) {
    const { data: gRows } = await db
      .from("groupes")
      .select("id")
      .in("niveau_id", [...niveauIds]);
    for (const g of gRows || []) groupeIds.add(g.id);
  } else if (filiereIds.size > 0) {
    const { data: gRows } = await db
      .from("groupes")
      .select("id")
      .in("filiere_id", [...filiereIds]);
    for (const g of gRows || []) groupeIds.add(g.id);
  }

  // Ne garder que les groupes rattachés aux filières du centre courant.
  if (groupeIds.size > 0) {
    const { data: gMeta } = await db
      .from("groupes")
      .select("id, filiere_id, niveaux(filiere_id)")
      .in("id", [...groupeIds]);
    const kept = new Set<string>();
    for (const g of gMeta || []) {
      const niv = g.niveaux as { filiere_id?: string } | { filiere_id?: string }[] | null;
      const nivFil = Array.isArray(niv) ? niv[0]?.filiere_id : niv?.filiere_id;
      const fid = g.filiere_id || nivFil;
      if (fid && filiereIds.has(fid)) kept.add(g.id);
    }
    for (const id of [...groupeIds]) {
      if (!kept.has(id)) groupeIds.delete(id);
    }
  }

  return {
    filiereMatiereIds,
    groupeIds,
    filiereIds,
    disciplineIds,
    empty: false,
  };
}

export function assertTrainerUe(
  scope: TrainerAcademicScope,
  filiereMatiereId: string | null | undefined,
): string | null {
  if (!filiereMatiereId) return "UE requise.";
  if (scope.empty || !scope.filiereMatiereIds.has(filiereMatiereId)) {
    return "Hors de votre périmètre (UE).";
  }
  return null;
}

export function assertTrainerGroupes(
  scope: TrainerAcademicScope,
  groupeIds: string[],
): string | null {
  if (scope.empty) return "Hors de votre périmètre.";
  if (groupeIds.length === 0) return "Au moins une promotion requise.";
  const forbidden = groupeIds.filter((id) => !scope.groupeIds.has(id));
  if (forbidden.length) return "Hors de votre périmètre (promotion).";
  return null;
}

/** Créneau planning : titre libre OK ; sinon discipline doit être dans les UE assignées. */
export function assertTrainerDiscipline(
  scope: TrainerAcademicScope,
  disciplineId: string | null | undefined,
): string | null {
  if (!disciplineId) return null;
  if (scope.empty || !scope.disciplineIds.has(disciplineId)) {
    return "Hors de votre périmètre (UE / discipline).";
  }
  return null;
}

export function assertTrainerFiliere(
  scope: TrainerAcademicScope,
  filiereId: string | null | undefined,
): string | null {
  if (!filiereId) return "Programme requis.";
  if (scope.empty || !scope.filiereIds.has(filiereId)) {
    return "Hors de votre périmètre (programme).";
  }
  return null;
}

/** Étudiant dans au moins une promotion du formateur (deny si pas de groupe). */
export function studentInTrainerScope(
  scope: TrainerAcademicScope,
  enrollmentGroupes: (string | null | undefined)[],
): boolean {
  if (scope.empty) return false;
  return enrollmentGroupes.some((g) => !!g && scope.groupeIds.has(g));
}

export function slotTouchesTrainerScope(
  scope: TrainerAcademicScope,
  slotGroupeIds: string[],
): boolean {
  if (scope.empty) return false;
  if (slotGroupeIds.length === 0) return false;
  return slotGroupeIds.some((id) => scope.groupeIds.has(id));
}

/** Salon communauté visible pour un formateur univ. */
export function communityRoomInTrainerScope(
  scope: TrainerAcademicScope,
  room: { groupe_id?: string | null; filiere_id?: string | null; type?: string | null },
): boolean {
  if (scope.empty) return false;
  if (room.groupe_id) return scope.groupeIds.has(room.groupe_id);
  // Annonces centre : visibles ; classroom / study_group sans promotion : refus.
  if (room.type === "announcement") return true;
  return false;
}
