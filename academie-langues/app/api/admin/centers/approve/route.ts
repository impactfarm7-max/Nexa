import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { approveCenterApplication } from "@/app/utils/center-application-approve";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { user: null, response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { user: null, response: NextResponse.json({ error: "Acces reserve aux admins." }, { status: 403 }) };
  }

  return { user, response: null };
}

export async function POST(req: Request) {
  const { response } = await requireAdmin(req);
  if (response) return response;

  const { applicationId } = await req.json();
  const result = await approveCenterApplication(applicationId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    center: result.center,
    credentials: result.credentials,
  });
}
