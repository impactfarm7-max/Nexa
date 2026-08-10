import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Documents visibles pour un étudiant "centre libre" :
 * - documents historiques NEXA (center_id null)
 * - documents publics approuvés (visibilité publique + validés par un superadmin)
 * - documents privés de son propre centre (visibilité "centre", pas de validation requise)
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", user.id)
    .single();

  const centerId = profile?.center_id || null;

  const filters = [
    "center_id.is.null",
    "and(visibility.eq.public,status.eq.approved)",
  ];
  if (centerId) {
    filters.push(`and(center_id.eq.${centerId},visibility.eq.center)`);
  }

  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, titre, categorie, icone, icon_color, icon_bg, storage_path, mots_cles, is_paid, price")
    .or(filters.join(","))
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}
