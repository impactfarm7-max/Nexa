import { createClient } from "@supabase/supabase-js";
import { DEFAULT_HIGHLIGHT_THEMES } from "@/app/utils/highlightConstants";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Prépare le contexte surlignages pour le tuteur IA (intégration future). */
export async function getHighlightContextForTutor(userId: string) {
  const [{ data: highlights }, { data: themes }] = await Promise.all([
    supabaseAdmin
      .from("student_course_highlights")
      .select("id, source_type, source_id, selected_text, note, color_key, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("student_highlight_themes")
      .select("color_key, hex_color, label")
      .eq("user_id", userId),
  ]);

  const themeList = themes?.length ? themes : DEFAULT_HIGHLIGHT_THEMES;
  const themeByKey = Object.fromEntries(themeList.map((t) => [t.color_key, t]));

  return (highlights ?? []).map((h) => ({
    id: h.id,
    source_type: h.source_type,
    source_id: h.source_id,
    excerpt: h.selected_text,
    note: h.note,
    theme: themeByKey[h.color_key]?.label ?? h.color_key,
    created_at: h.created_at,
  }));
}
