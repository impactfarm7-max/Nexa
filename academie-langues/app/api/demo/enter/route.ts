import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumeFixedWindow, requestIp } from "@/app/utils/fixed-window-rate-limit";
import { getPublicSiteUrl } from "@/app/utils/public-site-url";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type CenterKind = "libre" | "tcf";
type ViewAs = "center" | "student";

export async function POST(req: NextRequest) {
  const rate = await consumeFixedWindow(`demo-enter:${requestIp(req)}`, 20, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { centerKind?: CenterKind; viewAs?: ViewAs };
  const { centerKind, viewAs } = body;
  if (centerKind !== "libre" && centerKind !== "tcf") {
    return NextResponse.json({ error: "Type de centre invalide." }, { status: 400 });
  }
  if (viewAs !== "center" && viewAs !== "student") {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  const wantedCenterType = centerKind === "tcf" ? "tcf_canada" : "generic";
  const wantedRole = viewAs === "center" ? "center_manager" : "student";

  const { data: candidates, error: profilesErr } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, center_id, centers!profiles_center_id_fkey(name, center_type)")
    .eq("is_demo_account", true)
    .eq("role", wantedRole);

  if (profilesErr) {
    console.error("demo/enter: profiles query failed", profilesErr);
    return NextResponse.json({ error: "Erreur serveur, réessayez plus tard." }, { status: 500 });
  }

  const match = (candidates || []).find(
    (p: any) => p.centers?.center_type === wantedCenterType,
  ) as { id: string; email: string; centers: { name: string } } | undefined;

  if (!match?.email) {
    return NextResponse.json(
      { error: "Compte démo introuvable. Exécutez scripts/seed-demo-accounts.mjs." },
      { status: 404 },
    );
  }

  const site = getPublicSiteUrl();
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: match.email,
    options: { redirectTo: `${site}/visite/enter` },
  });

  const hashedToken =
    (linkData as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token || null;

  if (linkError || !hashedToken) {
    console.error("demo/enter: generateLink failed", linkError);
    return NextResponse.json({ error: "Erreur serveur, réessayez plus tard." }, { status: 500 });
  }

  return NextResponse.json({ token_hash: hashedToken, centerName: match.centers.name });
}
