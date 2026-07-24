import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();
  const slug = String(body.slug || body.ref || "").trim().toLowerCase();

  if (!code && !slug) return NextResponse.json({ error: "Reference centre requise." }, { status: 400 });

  const selectFields = "id, name, code, signup_slug, slug, status, center_type";
  let center: {
    id: string;
    name: string;
    code: string | null;
    signup_slug: string | null;
    slug: string | null;
    status: string | null;
    center_type: string | null;
  } | null = null;
  let error: { message: string } | null = null;

  if (slug) {
    // Le lien envoyé aux étudiants peut contenir signup_slug ou slug interne
    const bySignupSlug = await supabaseAdmin
      .from("centers")
      .select(selectFields)
      .eq("signup_slug", slug)
      .maybeSingle();
    if (bySignupSlug.error) error = bySignupSlug.error;
    else if (bySignupSlug.data) center = bySignupSlug.data;
    else {
      const bySlug = await supabaseAdmin
        .from("centers")
        .select(selectFields)
        .eq("slug", slug)
        .maybeSingle();
      if (bySlug.error) error = bySlug.error;
      else center = bySlug.data;
    }
  } else {
    const byCode = await supabaseAdmin
      .from("centers")
      .select(selectFields)
      .eq("code", code)
      .maybeSingle();
    if (byCode.error) error = byCode.error;
    else center = byCode.data;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!center) {
    return NextResponse.json({ error: "Centre invalide." }, { status: 404 });
  }
  // Centres suspendus / révoqués : pas d'inscription. "pending" = centre en attente NEXA, OK pour pré-inscrire.
  if (center.status && ["suspended", "revoked"].includes(center.status)) {
    return NextResponse.json({ error: "Centre indisponible." }, { status: 404 });
  }

  let programName: string | null = null;
  if (center.center_type === "tcf_canada") {
    programName = "TCF Canada";
  } else {
    const { data: publishedFiliere } = await supabaseAdmin
      .from("filieres")
      .select("name")
      .eq("center_id", center.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (publishedFiliere?.name) {
      programName = publishedFiliere.name;
    } else {
      const { data: anyFiliere } = await supabaseAdmin
        .from("filieres")
        .select("name")
        .eq("center_id", center.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      programName = anyFiliere?.name || "Formation professionnelle";
    }
  }

  return NextResponse.json({
    center: {
      id: center.id,
      name: center.name,
      code: center.code,
      signup_slug: center.signup_slug,
      center_type: center.center_type,
      program_name: programName,
    },
  });
}
