import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalize(value: unknown) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function extractSnippet(text: string, words: string[], length = 200) {
  const normalized = normalize(text);
  const index = words.map((word) => normalized.indexOf(word)).find((position) => position >= 0) ?? -1;
  const start = Math.max(0, index < 0 ? 0 : index - 80);
  const end = Math.min(text.length, start + length);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const query = String(body.query || "").trim().slice(0, 120);
  if (!query) return NextResponse.json({ results: [] });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id")
    .eq("id", user.id)
    .maybeSingle();

  const visible = ["and(center_id.is.null,status.eq.approved,visibility.eq.public)"];
  if (profile?.center_id) {
    visible.push(`and(center_id.eq.${profile.center_id},visibility.eq.center,status.eq.approved)`);
    visible.push(`and(center_id.eq.${profile.center_id},visibility.eq.public,status.eq.approved)`);
  }

  const { data, error } = await supabaseAdmin
    .from("bibliotheque_documents")
    .select("id, titre, categorie, icone, icon_color, icon_bg, content_text, mots_cles, is_paid, price")
    .or(visible.join(","))
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const words = normalize(query).split(/\s+/).filter(Boolean);
  const paidIds = (data || []).filter((doc) => doc.is_paid).map((doc) => doc.id);
  const { data: purchases } = paidIds.length
    ? await supabaseAdmin.from("document_purchases").select("document_id, status")
      .eq("buyer_id", user.id).in("document_id", paidIds).in("status", ["pending", "paid"])
    : { data: [] as Array<{ document_id: number; status: string }> };
  const statusByDocument = new Map((purchases || []).map((purchase) => [purchase.document_id, purchase.status]));

  const results = (data || [])
    .filter((doc) => {
      const searchable = normalize([doc.titre, doc.categorie, doc.content_text, ...(doc.mots_cles || [])].join(" "));
      return words.every((word) => searchable.includes(word));
    })
    .slice(0, 10)
    .map((doc) => ({
      id: doc.id,
      titre: doc.titre,
      categorie: doc.categorie,
      icone: doc.icone,
      icon_color: doc.icon_color,
      icon_bg: doc.icon_bg,
      mots_cles: doc.mots_cles,
      is_paid: doc.is_paid,
      price: doc.price,
      purchase_status: doc.is_paid ? statusByDocument.get(doc.id) || null : "free",
      snippet: doc.content_text && (!doc.is_paid || statusByDocument.get(doc.id) === "paid")
        ? extractSnippet(doc.content_text, words) : null,
      matchIn: words.some((word) => normalize(doc.content_text).includes(word)) ? "content" : "metadata",
    }));

  return NextResponse.json({ results });
}
