import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId requis." }, { status: 400 });

  if (studentId === user.id) {
    return NextResponse.json({ error: "Impossible de masquer son propre compte." }, { status: 400 });
  }

  // Soft delete : marque le profil comme supprimé sans toucher à l'auth
  const { data: targetProfile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!targetProfile || targetProfile.center_id) {
    return NextResponse.json({ error: "Compte centre non modifiable depuis IAG Academy." }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ tag_status: "supprime", updated_at: new Date().toISOString() })
    .eq("id", studentId)
    .is("center_id", null);

  if (error) {
    console.error("Erreur soft delete:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
