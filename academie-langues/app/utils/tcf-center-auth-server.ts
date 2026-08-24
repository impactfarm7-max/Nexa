import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/utils/center-auth-server";

export async function requireTcfCenter(centerId: string): Promise<NextResponse | null> {
  const { data: center, error } = await supabaseAdmin
    .from("centers")
    .select("id, center_type")
    .eq("id", centerId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!center) return NextResponse.json({ error: "Centre introuvable." }, { status: 404 });
  if (center.center_type !== "tcf_canada") {
    return NextResponse.json(
      {
        error: "Cette fonctionnalité est réservée aux centres TCF Canada.",
        code: "TCF_CENTER_REQUIRED",
      },
      { status: 403 },
    );
  }

  return null;
}
