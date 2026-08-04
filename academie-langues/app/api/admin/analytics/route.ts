import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/superadmin-auth-server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return NextResponse.json({ error: "Compte administrateur requis." }, { status: 403 });
  }

  const requestedDays = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = Number.isInteger(requestedDays) ? Math.max(7, Math.min(requestedDays, 90)) : 30;
  const { data, error } = await supabaseAdmin.rpc("get_site_analytics", { p_days: days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
