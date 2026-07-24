import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { DEFAULT_HIGHLIGHT_THEMES } from "@/app/utils/highlightConstants";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_KEYS = new Set(["yellow", "green", "blue", "pink", "orange"]);

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("student_highlight_themes")
    .select("color_key, hex_color, label")
    .eq("user_id", user.id);

  if (!data?.length) {
    return NextResponse.json({ themes: DEFAULT_HIGHLIGHT_THEMES });
  }

  const byKey = Object.fromEntries(data.map((t) => [t.color_key, t]));
  const themes = DEFAULT_HIGHLIGHT_THEMES.map((d) => byKey[d.color_key] ?? d);
  return NextResponse.json({ themes });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorise." }, { status: 401 });

  const { themes } = await req.json();
  if (!Array.isArray(themes)) {
    return NextResponse.json({ error: "Format invalide." }, { status: 400 });
  }

  const rows = themes
    .filter((t: { color_key?: string; label?: string }) => t.color_key && VALID_KEYS.has(t.color_key))
    .map((t: { color_key: string; label: string; hex_color?: string }) => {
      const def = DEFAULT_HIGHLIGHT_THEMES.find((d) => d.color_key === t.color_key);
      return {
        user_id: user.id,
        color_key: t.color_key,
        hex_color: t.hex_color || def?.hex_color || "#FEF08A",
        label: String(t.label || def?.label || "Note").slice(0, 40),
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucun theme valide." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("student_highlight_themes").upsert(rows, {
    onConflict: "user_id,color_key",
  });

  if (error) {
    console.error("highlight-themes PATCH:", error);
    return NextResponse.json({ error: "Erreur base de donnees." }, { status: 500 });
  }

  const { data } = await supabaseAdmin
    .from("student_highlight_themes")
    .select("color_key, hex_color, label")
    .eq("user_id", user.id);

  const byKey = Object.fromEntries((data ?? []).map((t) => [t.color_key, t]));
  return NextResponse.json({
    themes: DEFAULT_HIGHLIGHT_THEMES.map((d) => byKey[d.color_key] ?? d),
  });
}
