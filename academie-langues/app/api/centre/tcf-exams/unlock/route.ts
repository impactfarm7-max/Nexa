import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { requireTcfCenter } from "@/app/utils/tcf-center-auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["center_manager", "campus_manager", "trainer", "staff"];
const MAX_EXAMEN_ID = 25;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const tcfError = await requireTcfCenter(profile.center_id);
  if (tcfError) return tcfError;

  const body = await req.json();
  const { user_id, examen_id, expires_at, reason } = body;

  if (!user_id || !expires_at) {
    return NextResponse.json({ error: "user_id et expires_at requis." }, { status: 400 });
  }

  let parsedExamenId: number | null = null;
  if (examen_id != null && examen_id !== "") {
    const n = Number(examen_id);
    if (!Number.isInteger(n) || n < 1 || n > MAX_EXAMEN_ID) {
      return NextResponse.json({ error: `examen_id doit être un entier entre 1 et ${MAX_EXAMEN_ID}.` }, { status: 400 });
    }
    parsedExamenId = n;
  }

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id")
    .eq("id", user_id)
    .eq("center_id", profile.center_id)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Élève introuvable dans ce centre." }, { status: 404 });
  }

  const { data: unlock, error } = await supabaseAdmin
    .from("tcf_exam_unlocks")
    .insert({
      center_id: profile.center_id,
      user_id,
      examen_id: parsedExamenId,
      expires_at: new Date(expires_at).toISOString(),
      reason: reason?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("notifications").insert({
    user_id,
    message: `🔓 Votre centre vous a débloqué l'examen complet TCF.`,
  });

  return NextResponse.json({ unlock_id: unlock?.id });
}
