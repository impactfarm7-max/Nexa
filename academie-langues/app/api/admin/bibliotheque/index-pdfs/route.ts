import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { createRequire } from "module";

export const maxDuration = 120;

const requireCJS = createRequire(import.meta.url);
const { PDFParse } = requireCJS("pdf-parse");

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/bibliotheque/index-pdfs
 * Extrait le texte de tous les PDFs du Storage et remplit content_text.
 * Réservé aux admins.
 */
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins uniquement." }, { status: 403 });
  }

  const { data: docs, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, titre, storage_path, content_text");

  if (error || !docs) {
    return NextResponse.json({ error: "Erreur lecture DB." }, { status: 500 });
  }

  const results: { id: number; titre: string; status: string; pages?: number }[] = [];

  for (const doc of docs) {
    if (doc.content_text) {
      results.push({ id: doc.id, titre: doc.titre, status: "skipped (already indexed)" });
      continue;
    }

    if (!doc.storage_path) {
      results.push({ id: doc.id, titre: doc.titre, status: "skipped (no storage_path)" });
      continue;
    }

    try {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from("ressources_iag")
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        results.push({ id: doc.id, titre: doc.titre, status: `error: ${downloadError?.message ?? "download failed"}` });
        continue;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // pdf-parse v2 class-based API
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();

      // result.pages is an array of { text, num }
      const text = (result.pages as { text: string }[])
        .map((p) => p.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500_000);

      await supabaseAdmin
        .from("bibliotheque_documents")
        .update({ content_text: text })
        .eq("id", doc.id);

      results.push({ id: doc.id, titre: doc.titre, status: "indexed", pages: result.pages?.length });
    } catch (err: any) {
      results.push({ id: doc.id, titre: doc.titre, status: `error: ${err.message}` });
    }
  }

  return NextResponse.json({ results, total: docs.length });
}
