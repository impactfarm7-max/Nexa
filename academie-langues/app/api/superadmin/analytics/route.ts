import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

export async function GET(req: NextRequest) {
  const { ctx, error: authError } = await getSuperadminContext(req);
  if (!ctx) return authError;
  const requested = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = Number.isInteger(requested) ? Math.max(7, Math.min(requested, 90)) : 30;
  const { data, error } = await supabaseAdmin.rpc("get_site_analytics", { p_days: days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
