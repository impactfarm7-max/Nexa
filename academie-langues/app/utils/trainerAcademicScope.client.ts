import { supabase } from "@/app/utils/supabase";

/** Scope formateur côté client, filtré au centre courant (deny-by-default). */
export async function loadClientTrainerScope(
  formateurId: string,
  centerId: string,
): Promise<{
  filiereIds: Set<string>;
  groupeIds: Set<string>;
  disciplineIds: Set<string>;
  filiereMatiereIds: Set<string>;
  empty: boolean;
}> {
  const empty = {
    filiereIds: new Set<string>(),
    groupeIds: new Set<string>(),
    disciplineIds: new Set<string>(),
    filiereMatiereIds: new Set<string>(),
    empty: true as const,
  };

  const [{ data: mfRows }, { data: fgRows }] = await Promise.all([
    supabase
      .from("matiere_formateurs")
      .select(
        "filiere_matiere_id, filiere_matieres(id, filiere_id, niveau_id, discipline_id, filieres(center_id))",
      )
      .eq("formateur_id", formateurId),
    supabase.from("formateur_groupes").select("groupe_id").eq("formateur_id", formateurId),
  ]);

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
    if (!center || center !== centerId) continue;
    filiereMatiereIds.add(fm.id);
    if (fm.filiere_id) filiereIds.add(fm.filiere_id);
    if (fm.niveau_id) niveauIds.add(fm.niveau_id);
    if (fm.discipline_id) disciplineIds.add(fm.discipline_id);
  }

  if (filiereMatiereIds.size === 0) return empty;

  const explicit = [...new Set((fgRows || []).map((r) => r.groupe_id).filter(Boolean))];
  const groupeIds = new Set<string>(explicit);

  if (groupeIds.size === 0 && niveauIds.size > 0) {
    const { data: gRows } = await supabase.from("groupes").select("id").in("niveau_id", [...niveauIds]);
    for (const g of gRows || []) groupeIds.add(g.id);
  } else if (groupeIds.size === 0 && filiereIds.size > 0) {
    const { data: gRows } = await supabase.from("groupes").select("id").in("filiere_id", [...filiereIds]);
    for (const g of gRows || []) groupeIds.add(g.id);
  }

  if (groupeIds.size > 0) {
    const { data: gMeta } = await supabase
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
    filiereIds,
    groupeIds,
    disciplineIds,
    filiereMatiereIds,
    empty: false,
  };
}
