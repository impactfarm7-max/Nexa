import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MANAGER_ROLES = ["admin", "center_manager", "campus_manager"];

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .single();

  if (!profile?.center_id || !MANAGER_ROLES.includes(profile.role || "")) {
    return NextResponse.json({ error: "Accès réservé aux responsables de centre." }, { status: 403 });
  }

  const { data: doc } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, center_id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc || doc.center_id !== profile.center_id) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  await supabaseAdmin.storage.from("ressources_iag").remove([doc.storage_path]).catch(() => {});

  const { error } = await supabaseAdmin.from("bibliotheque_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
