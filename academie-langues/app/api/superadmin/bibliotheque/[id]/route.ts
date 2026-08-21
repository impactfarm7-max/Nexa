import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { logSuperadminAction } from "@/app/utils/superadmin-auth-server";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function isSuperadmin(id: string) {
  const { data } = await supabaseAdmin.from("profiles").select("role").eq("id", id).single();
  return data?.role === "superadmin";
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await isSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });
  const { data: doc } = await supabaseAdmin.from("bibliotheque_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!doc?.storage_path) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const { data, error } = await supabaseAdmin.storage.from("ressources_iag").createSignedUrl(doc.storage_path, 120);
  if (error || !data) return NextResponse.json({ error: "Impossible de générer l’aperçu." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await isSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (body.status !== undefined && !["approved", "rejected", "pending_review"].includes(body.status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    patch.status = body.status;
    patch.reviewed_by = user.id;
    patch.reviewed_at = new Date().toISOString();
    patch.rejection_reason = body.status === "rejected" ? (body.rejection_reason || null) : null;
  }
  if (typeof body.titre === "string" && body.titre.trim()) patch.titre = body.titre.trim().slice(0, 180);
  if (typeof body.categorie === "string") patch.categorie = body.categorie.trim().slice(0, 80) || "Nexa";
  if (typeof body.is_paid === "boolean") {
    patch.is_paid = body.is_paid;
    patch.price = body.is_paid ? Math.max(0, Number(body.price) || 0) : null;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("bibliotheque_documents").update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logSuperadminAction(user.id,
    body.status === "approved" ? "library_document_approved" : body.status === "rejected" ? "library_document_rejected" : "library_document_updated",
    { targetType: "bibliotheque_document", targetId: id, req, metadata: { titre: data.titre, centerId: data.center_id } });
  return NextResponse.json({ document: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await isSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });
  const { data: doc } = await supabaseAdmin.from("bibliotheque_documents")
    .select("id, titre, storage_path, center_id").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  const { error } = await supabaseAdmin.from("bibliotheque_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (doc.storage_path) await supabaseAdmin.storage.from("ressources_iag").remove([doc.storage_path]);
  await logSuperadminAction(user.id, "library_document_deleted", {
    targetType: "bibliotheque_document", targetId: id, req, metadata: { titre: doc.titre, centerId: doc.center_id },
  });
  return NextResponse.json({ ok: true });
}
