import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/superadmin-auth-server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId : "";
  const path = typeof body?.path === "string" ? body.path.split("?")[0] : "/";
  if (!UUID_PATTERN.test(visitorId) || !path.startsWith("/") || path.length > 300) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  if (["/superadmin", "/api"].some((prefix) => path.startsWith(prefix))) return new NextResponse(null, { status: 204 });
  const { error } = await supabaseAdmin.rpc("record_site_visit", { p_visitor_id: visitorId, p_path: path });
  if (error) { console.error("Analytics visit:", error.message); return NextResponse.json({ error: "Analytics indisponibles." }, { status: 503 }); }
  return new NextResponse(null, { status: 204 });
}
