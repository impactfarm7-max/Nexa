import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { getSignedStorageUrl, resolveStoragePath } from "@/app/utils/storage-signed-url.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

/**
 * Résout en batch les URLs signées pour les pièces jointes de la
 * communauté (bucket `community-files`, actuellement public — voir
 * Task 9). Le chemin Storage est `${centerId}/${roomId}/<fichier>` ; on
 * autorise l'appelant s'il est membre du salon `roomId`
 * (`community_room_members`) ou staff du centre `centerId`.
 *
 * Ne migre rien, ne modifie pas le bucket : renvoie simplement `null`
 * pour les URLs non autorisées ou introuvables, à filtrer côté client.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const urls = Array.isArray(body.urls) ? (body.urls as string[]).slice(0, 100) : [];
  if (urls.length === 0) return NextResponse.json({ signed: {} });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .maybeSingle();
  const isStaff = !!profile && STAFF_ROLES.includes(profile.role || "");

  const { data: memberships } = await supabaseAdmin
    .from("community_room_members")
    .select("room_id")
    .eq("user_id", user.id);
  const memberRoomIds = new Set((memberships || []).map((m) => m.room_id));

  const signed: Record<string, string | null> = {};

  for (const url of urls) {
    try {
      const path = resolveStoragePath("community-files", url);
      const [centerId, roomId] = path.split("/");
      const authorized =
        (isStaff && profile!.center_id === centerId) || memberRoomIds.has(roomId);
      signed[url] = authorized ? await getSignedStorageUrl("community-files", url, 3600) : null;
    } catch {
      signed[url] = null;
    }
  }

  return NextResponse.json({ signed });
}
