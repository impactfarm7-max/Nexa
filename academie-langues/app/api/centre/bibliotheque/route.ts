import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { normalizeCenterType } from "@/app/data/center-types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MANAGER_ROLES = ["center_manager", "campus_manager"];

async function assertLibreCenterManager(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", userId)
    .single();

  if (!profile?.center_id || !MANAGER_ROLES.includes(profile.role || "")) {
    return { ok: false as const, status: 403, error: "Accès réservé aux responsables de centre." };
  }

  const { data: center } = await supabaseAdmin
    .from("centers")
    .select("center_type")
    .eq("id", profile.center_id)
    .maybeSingle();

  if (normalizeCenterType(center?.center_type) === "tcf_canada") {
    return { ok: false as const, status: 403, error: "Fonctionnalité réservée aux centres libres." };
  }

  return { ok: true as const, centerId: profile.center_id as string };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const access = await assertLibreCenterManager(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, titre, categorie, icone, storage_path, visibility, is_paid, price, status, rejection_reason, created_at")
    .eq("center_id", access.centerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const access = await assertLibreCenterManager(user.id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const titre = String(form.get("titre") || "").trim();
  const categorie = String(form.get("categorie") || "").trim();
  const visibility = String(form.get("visibility") || "");
  const isPaid = form.get("is_paid") === "true";
  const price = Number(form.get("price") || 0);

  if (!file || !titre) {
    return NextResponse.json({ error: "Titre et fichier requis." }, { status: 400 });
  }
  if (!["center", "public"].includes(visibility)) {
    return NextResponse.json({ error: "Visibilité invalide." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `centre/${access.centerId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("ressources_iag")
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Échec de l'envoi du fichier : ${uploadError.message}` }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .insert({
      titre,
      categorie: categorie || "Centre",
      icone: "BookOpen",
      storage_path: storagePath,
      center_id: access.centerId,
      created_by: user.id,
      visibility,
      is_paid: isPaid,
      price: isPaid ? price : null,
      status: visibility === "public" ? "pending_review" : "approved",
    })
    .select()
    .single();

  if (error) {
    await supabaseAdmin.storage.from("ressources_iag").remove([storagePath]).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}
