import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { hashPin, validatePin } from "@/app/utils/pin-crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { pin } = await req.json();

  if (!validatePin(pin)) {
    return NextResponse.json({ error: "PIN invalide (4 chiffres requis)." }, { status: 400 });
  }

  const pinHash = hashPin(pin);

  const { error } = await supabase
    .from("profiles")
    .update({ pin_hash: pinHash })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
