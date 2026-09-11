import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Extrait le chemin (bucket-relative) d'une valeur stockée en base : soit
 * une ancienne URL publique complète (.../storage/v1/object/public/<bucket>/<path>),
 * soit déjà un chemin nu. Ne migre rien, permet de rester compatible avec
 * les lignes existantes sans les réécrire.
 */
export function resolveStoragePath(bucket: string, stored: string): string {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = stored.indexOf(marker);
  if (idx === -1) return stored;
  return decodeURIComponent(stored.slice(idx + marker.length));
}

/**
 * Génère une URL signée à courte durée de vie pour un objet Storage, à
 * partir d'une valeur stockée (URL complète historique ou chemin nu).
 * Retourne null si le fichier n'existe plus / erreur Storage.
 */
export async function getSignedStorageUrl(
  bucket: string,
  stored: string,
  expiresIn = 60,
): Promise<string | null> {
  const path = resolveStoragePath(bucket, stored);
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
