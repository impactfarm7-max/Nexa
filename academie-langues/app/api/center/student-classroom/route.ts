import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { assignPendingClassroom } from "@/app/utils/studentClassroom.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const centerId = String(body.centerId || "").trim();
  if (!centerId) {
    return NextResponse.json({ error: "Centre requis." }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "student" || profile.center_id !== centerId) {
    return NextResponse.json({ error: "Compte étudiant invalide pour ce centre." }, { status: 403 });
  }

  const { data: filiere } = await supabaseAdmin
    .from("filieres")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", "TCF Canada")
    .maybeSingle();

  if (!filiere?.id) {
    return NextResponse.json({ ok: true, assigned: false, reason: "no_filiere" });
  }

  const result = await assignPendingClassroom(supabaseAdmin, {
    studentId: user.id,
    centerId,
    filiereId: filiere.id,
    groupeId: body.groupeId || null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Affectation impossible." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    assigned: result.assigned,
    groupeId: result.groupeId,
  });
}
