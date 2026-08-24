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
  const paidIds = (data || []).filter((doc) => doc.is_paid).map((doc) => doc.id);
  const { data: purchases } = paidIds.length
    ? await supabaseAdmin.from("document_purchases")
      .select("document_id, status")
      .eq("buyer_id", user.id)
      .in("document_id", paidIds)
      .in("status", ["pending", "paid"])
    : { data: [] as Array<{ document_id: number; status: string }> };
  const statusByDocument = new Map((purchases || []).map((purchase) => [purchase.document_id, purchase.status]));
  const documents = (data || []).map(({ storage_path: _storagePath, ...doc }) => ({
    ...doc,
    purchase_status: doc.is_paid ? statusByDocument.get(doc.id) || null : "free",
  }));
  return NextResponse.json({ documents });
}
