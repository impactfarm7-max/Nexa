import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_DM_ROLES = [
  "admin",
  "center_manager",
  "campus_manager",
  "staff",
  "trainer",
  "manager",
] as const;

/**
 * Liste le staff du centre de l'étudiant connecté (pour les MP communauté).
 */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, center_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.center_id) {
    return NextResponse.json({ error: "Centre introuvable." }, { status: 403 });
  }

  // Réservé aux étudiants du centre (staff a son propre hub).
  if (profile.role !== "student") {
    return NextResponse.json({ error: "Réservé aux étudiants." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, role")
    .eq("center_id", profile.center_id)
    .in("role", [...STAFF_DM_ROLES])
    .neq("id", user.id)
    .order("prenom", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    staff: (data || []).map((p) => ({
      id: p.id,
      prenom: p.prenom || "Staff",
      role: p.role || "staff",
    })),
  });
}
