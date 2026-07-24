import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/feedback — submit user feedback
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, type = "general" } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Le message est requis." },
        { status: 400 }
      );
    }

    if (!["bug", "feature-request", "complaint", "general"].includes(type)) {
      return NextResponse.json(
        { error: "Type de retour invalide." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("user_feedbacks")
      .insert([
        {
          user_id: user.id,
          message: message.trim(),
          type,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erreur insert feedback:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (error) {
    console.error("Erreur feedback:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// GET /api/feedback — get user's own feedback
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_feedbacks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur fetch feedback:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedbacks: data || [] });
}
