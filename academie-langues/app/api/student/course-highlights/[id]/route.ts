import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_COLORS = new Set(["yellow", "green", "blue", "pink", "orange"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.note !== undefined) updates.note = body.note ? String(body.note).trim().slice(0, 500) : null;
  if (body.color_key !== undefined) {
    if (!VALID_COLORS.has(body.color_key)) {
      return NextResponse.json({ error: "Couleur invalide." }, { status: 400 });
    }
    updates.color_key = body.color_key;
  }

  const { data, error } = await supabaseAdmin
    .from("student_course_highlights")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, source_type, source_id, course_id, selected_text, note, color_key, anchor, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Surlignage introuvable." }, { status: 404 });
  }

  return NextResponse.json({ highlight: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("student_course_highlights")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
