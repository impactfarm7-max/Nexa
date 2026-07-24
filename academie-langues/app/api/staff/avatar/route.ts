import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MANAGER_ROLES = new Set(["admin", "center_manager", "campus_manager"]);
const STAFF_ROLES = new Set(["campus_manager", "trainer", "staff"]);

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, center_id")
      .eq("id", callerData.user.id)
      .single();

    if (!callerProfile?.center_id || !MANAGER_ROLES.has(callerProfile.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const profileId = String(formData.get("profile_id") || "");

    if (!(file instanceof File) || !profileId) {
      return NextResponse.json({ error: "Fichier ou profil manquant." }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Taille max : 2 Mo." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Format image requis." }, { status: 400 });
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("center_id, role")
      .eq("id", profileId)
      .single();

    if (
      !targetProfile ||
      targetProfile.center_id !== callerProfile.center_id ||
      !STAFF_ROLES.has(targetProfile.role)
    ) {
      return NextResponse.json({ error: "Profil introuvable ou hors centre." }, { status: 403 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profileId}/avatar.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from("avatars").getPublicUrl(path);

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", profileId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ avatar_url: urlData.publicUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
