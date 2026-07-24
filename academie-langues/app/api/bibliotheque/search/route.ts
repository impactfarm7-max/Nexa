import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Extrait un snippet de ~200 caractères autour du mot trouvé dans le texte.
 */
function extractSnippet(text: string, query: string, snippetLength = 200): string {
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(Boolean);

  let bestIndex = -1;
  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx !== -1) { bestIndex = idx; break; }
  }

  if (bestIndex === -1) return text.slice(0, snippetLength) + "…";

  const start = Math.max(0, bestIndex - 80);
  const end = Math.min(text.length, bestIndex + snippetLength);
  const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  return snippet;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ results: [] });

  const q = query.trim();

  // Recherche full-text PostgreSQL sur content_indexed + fallback ILIKE sur titre/catégorie
  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, titre, categorie, icone, icon_color, icon_bg, storage_path, content_text, mots_cles")
    .or(
      `content_indexed.fts(french).${q.split(/\s+/).join(" & ")},titre.ilike.%${q}%,categorie.ilike.%${q}%`
    )
    .limit(10);

  if (error) {
    // Fallback si la syntaxe fts échoue : recherche ILIKE simple
    const { data: fallback } = await supabaseAdmin
      .from("bibliotheque_documents")
      .select("id, titre, categorie, icone, icon_color, icon_bg, storage_path, content_text, mots_cles")
      .or(`titre.ilike.%${q}%,categorie.ilike.%${q}%,content_text.ilike.%${q}%`)
      .limit(10);

    const results = (fallback || []).map(doc => ({
      id: doc.id,
      titre: doc.titre,
      categorie: doc.categorie,
      icone: doc.icone,
      icon_color: doc.icon_color,
      icon_bg: doc.icon_bg,
      storage_path: doc.storage_path,
      mots_cles: doc.mots_cles,
      snippet: doc.content_text ? extractSnippet(doc.content_text, q) : null,
      matchIn: doc.content_text?.toLowerCase().includes(q.toLowerCase()) ? "content" : "metadata",
    }));

    return NextResponse.json({ results });
  }

  const results = (data || []).map(doc => ({
    id: doc.id,
    titre: doc.titre,
    categorie: doc.categorie,
    icone: doc.icone,
    icon_color: doc.icon_color,
    icon_bg: doc.icon_bg,
    storage_path: doc.storage_path,
    mots_cles: doc.mots_cles,
    snippet: doc.content_text ? extractSnippet(doc.content_text, q) : null,
    matchIn: doc.content_text?.toLowerCase().includes(q.toLowerCase()) ? "content" : "metadata",
  }));

  return NextResponse.json({ results });
}
