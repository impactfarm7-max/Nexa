import { supabaseAdmin } from "@/app/utils/center-auth-server";

function isMissingRelation(error: { message?: string } | null) {
  const msg = error?.message || "";
  return msg.includes("does not exist") || msg.includes("Could not find");
}

/** §6 — tente les vues SQL, retourne null si absentes (fallback TS). */
export async function loadFinanceByFiliereFromView(centerId: string) {
  const { data, error } = await supabaseAdmin
    .from("report_finance_by_filiere")
    .select("filiere_name, ca_facture, encaisse, reste, nb_dossiers")
    .eq("center_id", centerId)
    .order("filiere_name");

  if (error) {
    if (isMissingRelation(error)) return null;
    throw new Error(error.message);
  }
  if (!data?.length) return null;

  return (data as {
    filiere_name: string;
    ca_facture: number;
    encaisse: number;
    reste: number;
    nb_dossiers: number;
  }[]).map((row) => ({
    label: row.filiere_name,
    ca: Number(row.ca_facture) || 0,
    encaisse: Number(row.encaisse) || 0,
    reste: Number(row.reste) || 0,
    nbDossiers: Number(row.nb_dossiers) || 0,
  }));
}

export async function loadEffectifsByFiliereFromView(centerId: string) {
  const { data, error } = await supabaseAdmin
    .from("report_effectifs_by_filiere")
    .select("filiere_name, effectif, actifs, brouillons")
    .eq("center_id", centerId)
    .order("filiere_name");

  if (error) {
    if (isMissingRelation(error)) return null;
    throw new Error(error.message);
  }
  if (!data?.length) return null;

  return (data as {
    filiere_name: string;
    effectif: number;
    actifs: number;
    brouillons: number;
  }[]).map((row) => ({
    label: row.filiere_name,
    count: Number(row.actifs) || 0,
    total: Number(row.effectif) || 0,
  }));
}

export async function loadFinanceCenterTotalsFromView(centerId: string) {
  const { data, error } = await supabaseAdmin
    .from("report_finance_by_center")
    .select("ca_facture, encaisse, reste, nb_retard")
    .eq("center_id", centerId)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const row = data as { ca_facture: number; encaisse: number; reste: number; nb_retard: number };
  return {
    caFacture: Number(row.ca_facture) || 0,
    encaisse: Number(row.encaisse) || 0,
    reste: Number(row.reste) || 0,
    nbRetard: Number(row.nb_retard) || 0,
  };
}
