import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

const STUDENT_FIELDS =
  "id, prenom, email, phone, ville, center_id, tag_status, subscription_ends_at, subscription_paused_at, pack_name, last_sign_in_at, created_at";

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ students: [], centers: {} });
  }

  const escaped = q.replace(/[%_]/g, "\\$&");

  const [{ data: byProfile, error: profileError }, { data: matchingCenters }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(STUDENT_FIELDS)
      .eq("role", "student")
      .not("center_id", "is", null)
      .or(`prenom.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`)
      .limit(30),
    supabaseAdmin
      .from("centers")
      .select("id, name, code")
      .or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`)
      .limit(5),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const results = new Map<string, (typeof byProfile)[number]>();
  for (const row of byProfile ?? []) results.set(row.id, row);

  const centerIds = (matchingCenters ?? []).map((c) => c.id);
  if (centerIds.length > 0) {
    const { data: byCenter } = await supabaseAdmin
      .from("profiles")
      .select(STUDENT_FIELDS)
      .eq("role", "student")
      .in("center_id", centerIds)
      .limit(50);
    for (const row of byCenter ?? []) results.set(row.id, row);
  }

  const students = Array.from(results.values());
  const allCenterIds = Array.from(new Set(students.map((s) => s.center_id).filter(Boolean)));

  const centersMap: Record<string, { id: string; name: string; code: string | null }> = {};
  if (allCenterIds.length > 0) {
    const { data: centersData } = await supabaseAdmin
      .from("centers")
      .select("id, name, code")
      .in("id", allCenterIds);
    for (const c of centersData ?? []) centersMap[c.id] = c;
  }

  return NextResponse.json({ students, centers: centersMap });
}
