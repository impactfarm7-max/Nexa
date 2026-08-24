import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { requireTcfCenter } from "@/app/utils/tcf-center-auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { centerId } = await req.json();
  if (!centerId) return NextResponse.json({ error: "centerId requis." }, { status: 400 });

  // Vérifier que l'utilisateur appartient bien à ce centre
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", user.id)
    .single();

  if (profile?.center_id !== centerId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const tcfError = await requireTcfCenter(centerId);
  if (tcfError) return tcfError;

  // Vérifier si la filière existe déjà (identifiée par name)
  const { data: existing } = await supabaseAdmin
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", "TCF Canada")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ filiereId: existing.id });
  }

  // Créer la filière TCF — uniquement les colonnes garanties existantes
  const { data: filiere, error } = await supabaseAdmin
    .from("filieres")
    .insert({
      center_id: centerId,
      created_by: user.id,
      name: "TCF Canada",
      type: "formation_courte",
      mode: "presentiel",
      discipline_type: "tcf_canada",
      duree_valeur: 3,
      duree_unite: "mois",
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[init-tcf-filiere] insert error:", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }

  return NextResponse.json({ filiereId: filiere.id });
}
