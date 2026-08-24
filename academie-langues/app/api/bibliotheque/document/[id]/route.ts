import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProfileRow = {
  role: string | null;
  center_id: string | null;
  subscription_ends_at: string | null;
  subscription_paused_at: string | null;
  tag_status: string | null;
  center_status: string | null;
};

function normalizeStoragePath(raw: string): string {
  let path = raw.trim();
  const fromUrl = path.match(
    /\/storage\/v1\/object\/(?:public|sign)\/ressources_iag\/(.+?)(?:\?|$)/i,
  );
  if (fromUrl?.[1]) path = decodeURIComponent(fromUrl[1]);
  if (path.startsWith("ressources_iag/")) path = path.slice("ressources_iag/".length);
  while (path.startsWith("/")) path = path.slice(1);
  return path;
}

async function assertLibraryReader(userId: string): Promise<
  | { ok: true; profile: ProfileRow }
  | { ok: false; status: number; error: string }
> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id, subscription_ends_at, subscription_paused_at, tag_status, center_status")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { ok: false, status: 403, error: "Profil introuvable." };

  if (profile.role === "admin" || profile.role === "superadmin") {
    return { ok: true, profile: profile as ProfileRow };
  }

  if (profile.tag_status === "revoque" || profile.center_status === "revoked") {
    return { ok: false, status: 403, error: "Accès révoqué." };
  }
  if (profile.tag_status === "pending_center_approval" || profile.center_status === "pending_center_approval") {
    return { ok: false, status: 403, error: "Compte en attente de validation par le centre." };
  }
  if (profile.tag_status === "termine") {
    return { ok: false, status: 403, error: "Formation terminée." };
  }
  if (profile.subscription_paused_at) {
    return { ok: false, status: 403, error: "Votre pack est temporairement en pause." };
  }

  const subActive =
    !!profile.subscription_ends_at &&
    new Date(profile.subscription_ends_at).getTime() > Date.now();
  if (subActive) return { ok: true, profile: profile as ProfileRow };

  // Étudiants rattachés à un centre (TCF / libre) : accès bibliothèque via le centre.
  if (profile.role === "student" && profile.center_id) {
    return { ok: true, profile: profile as ProfileRow };
  }

  return { ok: false, status: 403, error: "Abonnement requis ou expiré." };
}

async function canReadDocument(
  doc: {
    id: number;
    center_id: string | null;
    visibility: string | null;
    status: string | null;
    is_paid: boolean | null;
  },
  profile: ProfileRow,
  userId: string,
): Promise<boolean> {
  if (doc.is_paid) {
    const { data: purchase } = await supabaseAdmin.from("document_purchases")
      .select("id")
      .eq("document_id", doc.id)
      .eq("buyer_id", userId)
      .eq("status", "paid")
      .maybeSingle();
    if (!purchase && profile.role !== "admin" && profile.role !== "superadmin") return false;
  }

  const status = doc.status || "approved";
  if (status !== "approved" && profile.role !== "admin" && profile.role !== "superadmin") {
    return false;
  }

  // Catalogue NEXA historique
  if (!doc.center_id) return true;

  if (doc.visibility === "public" && status === "approved") return true;

  if (
    doc.visibility === "center" &&
    profile.center_id &&
    doc.center_id === profile.center_id
  ) {
    return true;
  }

  return false;
}

/**
 * URL signée côté serveur (service role) pour éviter les 404 storage RLS
 * quand l'étudiant appelle createSignedUrl depuis le navigateur.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const access = await assertLibraryReader(user.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const docId = Number(id);
  if (!Number.isFinite(docId)) {
    return NextResponse.json({ error: "Document invalide." }, { status: 400 });
  }

  const { data: doc, error: docErr } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, storage_path, center_id, visibility, status, is_paid")
    .eq("id", docId)
    .maybeSingle();

  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 });
  if (!doc?.storage_path) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  if (!(await canReadDocument(doc, access.profile, user.id))) {
    return NextResponse.json({ error: "Document non accessible." }, { status: 403 });
  }

  const storagePath = normalizeStoragePath(doc.storage_path);
  if (!storagePath) {
    return NextResponse.json({ error: "Chemin de fichier invalide." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from("ressources_iag")
    .createSignedUrl(storagePath, 120);

  if (error || !data?.signedUrl) {
    const msg = error?.message || "Impossible de générer le lien sécurisé.";
    const notFound = /not found|not_found|404|object/i.test(msg);
    return NextResponse.json(
      { error: notFound ? "Fichier introuvable dans le stockage." : msg },
      { status: notFound ? 404 : 500 },
    );
  }

  // createSignedUrl ne vérifie pas l'existence → HEAD pour détecter un vrai 404 storage.
  try {
    const probe = await fetch(data.signedUrl, { method: "HEAD" });
    if (!probe.ok) {
      return NextResponse.json(
        { error: "Fichier introuvable dans le stockage." },
        { status: 404 },
      );
    }
  } catch {
    // Si le HEAD échoue (CORS/réseau), on renvoie quand même l'URL — le lecteur tranchera.
  }

  return NextResponse.json({ url: data.signedUrl });
}
