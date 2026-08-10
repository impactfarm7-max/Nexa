import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assertSuperadmin(userId: string) {
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
  return profile?.role === "superadmin";
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await assertSuperadmin(user.id))) return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, titre, categorie, storage_path, is_paid, price, status, created_at, center_id, centers(name)")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}
