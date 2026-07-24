import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // 1. Authentification obligatoire
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé.", ok: false }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required", ok: false },
        { status: 400 }
      );
    }

    // 2. Vérifier que la session existe ET appartient à l'utilisateur connecté
    const { data: sessionExists, error: selectError } = await supabase
      .from("user_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .eq("user_id", user.id) // ← ownership check
      .single();

    if (selectError || !sessionExists) {
      return NextResponse.json(
        { error: "Session introuvable.", ok: false },
        { status: 404 }
      );
    }

    // 3. Suppression sécurisée (double garde sur user_id)
    const { error: deleteError } = await supabase
      .from("user_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("sessions/delete: DB error", deleteError.code);
      return NextResponse.json(
        { error: "Erreur interne.", ok: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("sessions/delete: unexpected error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Internal server error", ok: false },
      { status: 500 }
    );
  }
}
