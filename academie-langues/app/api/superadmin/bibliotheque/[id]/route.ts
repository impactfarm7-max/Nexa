import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assertSuperadmin(userId: string) {
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
  return profile?.role === "superadmin";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await assertSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });

  const { status, rejection_reason } = await req.json();
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: status === "rejected" ? (rejection_reason || null) : null,
    })
    .eq("id", id)
    .eq("status", "pending_review")
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Document introuvable ou déjà traité." }, { status: 404 });

  return NextResponse.json({ document: data });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await assertSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });

  const { data: doc } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc?.storage_path) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

  const { data, error } = await supabaseAdmin.storage
    .from("ressources_iag")
    .createSignedUrl(doc.storage_path, 120);

  if (error || !data) return NextResponse.json({ error: "Impossible de générer l'aperçu." }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
