import { NextResponse } from "next/server";
import { getSuperadminContext, supabaseAdmin } from "@/app/utils/superadmin-auth-server";

export async function GET(req: Request) {
  const { ctx, error } = await getSuperadminContext(req);
  if (error) return error;
  if (!ctx) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { data, error: listError } = await supabaseAdmin
    .from("center_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}
