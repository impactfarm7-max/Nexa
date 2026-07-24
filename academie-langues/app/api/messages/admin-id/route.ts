import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const forceIagSupport = searchParams.get("scope") === "iag-support";

  const { data: requester } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id, centers:center_id(name)")
    .eq("id", user.id)
    .maybeSingle();

  if (requester?.center_id && !forceIagSupport) {
    const { data: centerAdmin } = await supabaseAdmin
      .from("center_users")
      .select("user_id")
      .eq("center_id", requester.center_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!centerAdmin?.user_id) {
      return NextResponse.json({ error: "Aucun admin centre trouve" }, { status: 404 });
    }

    return NextResponse.json({
      adminId: centerAdmin.user_id,
      centerId: requester.center_id,
      centerName: (requester.centers as any)?.name || "Votre centre",
    });
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .is("center_id", null)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Aucun admin trouve" }, { status: 404 });
  return NextResponse.json({ adminId: data.id, centerId: null, centerName: "IAG Academy" });
}
