import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { hashPin, validatePin, verifyPin } from "@/app/utils/pin-crypto";
import { consumeFixedWindow, requestIp } from "@/app/utils/fixed-window-rate-limit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ valid: false, error: "Non autorisé." }, { status: 401 });

  const rate = consumeFixedWindow(`pin:${user.id}:${requestIp(req)}`, 8, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { valid: false, error: "Trop de tentatives." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const { pin } = await req.json();

  if (!validatePin(pin)) {
    return NextResponse.json({ valid: false, error: "PIN invalide." }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("pin_hash")
    .eq("id", user.id)
    .single();

  if (error || !profile?.pin_hash) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const isValid = verifyPin(pin, profile.pin_hash);

  // Migration transparente : si le PIN est correct mais ancien format → re-hasher
  if (isValid && !profile.pin_hash.startsWith("pbkdf2:")) {
    const newHash = hashPin(pin);
    await supabase
      .from("profiles")
      .update({ pin_hash: newHash })
      .eq("id", user.id);
  }

  return NextResponse.json({ valid: isValid });
}
