import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { supabaseAdmin } from "@/app/utils/center-auth-server";
import { isCenterOperational } from "@/app/utils/center-trial";

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { centerId } = await req.json();
  if (!centerId) return NextResponse.json({ error: "Centre requis." }, { status: 400 });

  const { data: membership } = await supabaseAdmin.from("center_users").select("center_id, centers:center_id(status, created_at, trial_ends_at, renewal_at)").eq("user_id", user.id).eq("center_id", centerId).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Vous n’appartenez pas à ce centre." }, { status: 403 });
  if (!isCenterOperational(membership.centers as never)) return NextResponse.json({ error: "Ce centre n’est pas encore actif." }, { status: 409 });

  const { error } = await supabaseAdmin.from("profiles").update({ center_id: centerId }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, centerId });
}
