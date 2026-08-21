import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { logSuperadminAction } from "@/app/utils/superadmin-auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assertSuperadmin(userId: string) {
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
  return profile?.role === "superadmin";
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await assertSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, titre, categorie, storage_path, visibility, is_paid, price, status, rejection_reason, created_at, center_id, centers(name)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await assertSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const titre = String(form.get("titre") || "").trim();
  const categorie = String(form.get("categorie") || "").trim();
  const isPaid = form.get("is_paid") === "true";
  const price = Number(form.get("price") || 0);
  if (!file || !titre) return NextResponse.json({ error: "Titre et fichier requis." }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  if (file.size > 30 * 1024 * 1024) return NextResponse.json({ error: "Le fichier ne doit pas dépasser 30 Mo." }, { status: 400 });
  if (isPaid && (!Number.isFinite(price) || price <= 0)) return NextResponse.json({ error: "Prix invalide." }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `nexa/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabaseAdmin.storage.from("ressources_iag")
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data, error } = await supabaseAdmin.from("bibliotheque_documents").insert({
    titre,
    categorie: categorie || "Nexa",
    icone: "BookOpen",
    storage_path: storagePath,
    center_id: null,
    created_by: user.id,
    visibility: "public",
    is_paid: isPaid,
    price: isPaid ? price : null,
    status: "approved",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).select().single();
  if (error) {
    await supabaseAdmin.storage.from("ressources_iag").remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await logSuperadminAction(user.id, "library_document_created", {
    targetType: "bibliotheque_document", targetId: String(data.id), req,
    metadata: { titre: data.titre, categorie: data.categorie },
  });
  return NextResponse.json({ document: data }, { status: 201 });
}
