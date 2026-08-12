import { NextRequest, NextResponse } from "next/server";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

const STUDENT_FIELDS =
  "id, prenom, nom, email, phone, ville, center_id, tag_status, center_status, subscription_ends_at, subscription_paused_at, pack_name, last_sign_in_at, created_at";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { ctx, error } = await getSuperadminContext(req);
  if (!ctx) return error;

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0);

  let query = supabaseAdmin
    .from("profiles")
    .select(STUDENT_FIELDS, { count: "exact" })
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q.length >= 2) {
    const escaped = q.replace(/[%_]/g, "\\$&");
    const { data: matchingCenters } = await supabaseAdmin
      .from("centers")
      .select("id")
      .or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`)
      .limit(8);
    const centerIds = (matchingCenters ?? []).map((c) => c.id);
    const orParts = [
      `prenom.ilike.%${escaped}%`,
      `nom.ilike.%${escaped}%`,
      `email.ilike.%${escaped}%`,
      `phone.ilike.%${escaped}%`,
    ];
    if (centerIds.length > 0) {
      orParts.push(`center_id.in.(${centerIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  const { data: students, error: studentsError, count } = await query;
  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }

  const rows = students ?? [];
  const allCenterIds = Array.from(new Set(rows.map((s) => s.center_id).filter(Boolean))) as string[];
  const centersMap: Record<string, { id: string; name: string; code: string | null }> = {};
  if (allCenterIds.length > 0) {
    const { data: centersData } = await supabaseAdmin
      .from("centers")
      .select("id, name, code")
      .in("id", allCenterIds);
    for (const c of centersData ?? []) centersMap[c.id] = c;
  }

  return NextResponse.json({
    students: rows,
    centers: centersMap,
    total: count ?? rows.length,
    hasMore: offset + rows.length < (count ?? 0),
  });
}
