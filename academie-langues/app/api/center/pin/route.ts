import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import {
  DEFAULT_PIN_SETTINGS,
  hashPin,
  parsePinSettings,
  validatePin,
  verifyPin,
  type PinSettings,
} from "@/app/utils/pin-crypto";
import { canManagePinProtectedZones, isCenterStaff } from "@/app/utils/student-routes";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function loadProfilePinRow(userId: string) {
  const full = await supabaseAdmin
    .from("profiles")
    .select("id, role, center_id, pin_hash, pin_settings")
    .eq("id", userId)
    .maybeSingle();

  if (!full.error) return { data: full.data, error: null };

  if (full.error.message.includes("pin_settings")) {
    const fallback = await supabaseAdmin
      .from("profiles")
      .select("id, role, center_id, pin_hash")
      .eq("id", userId)
      .maybeSingle();
    if (fallback.error) return { data: null, error: fallback.error };
    return { data: { ...fallback.data, pin_settings: null }, error: null };
  }

  return { data: null, error: full.error };
}

async function getCenterPinContext(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return { response: NextResponse.json({ error: "Non autorise." }, { status: 401 }) };
  }

  const [{ data: profile, error: profileError }, { data: membership }] = await Promise.all([
    loadProfilePinRow(user.id),
    supabaseAdmin
      .from("center_users")
      .select("center_id, role")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) };
  }

  const centerId = profile?.center_id || membership?.center_id;
  const isStaff = profile?.role === "admin" || isCenterStaff(profile) || Boolean(membership);

  if (!centerId || !isStaff) {
    return { response: NextResponse.json({ error: "Compte centre requis." }, { status: 403 }) };
  }

  return { user, profile };
}

export async function GET(req: Request) {
  const ctx = await getCenterPinContext(req);
  if ("response" in ctx && ctx.response) return ctx.response;

  const { profile } = ctx;
  return NextResponse.json({
    hasPin: Boolean(profile?.pin_hash),
    pinSettings: parsePinSettings(profile?.pin_settings),
  });
}

export async function POST(req: Request) {
  const ctx = await getCenterPinContext(req);
  if ("response" in ctx && ctx.response) return ctx.response;

  const { user, profile } = ctx;
  const body = await req.json();
  const action = String(body.action || "create");

  if (action === "create") {
    if (profile?.pin_hash) {
      return NextResponse.json({ error: "Un code PIN existe deja." }, { status: 400 });
    }

    const pin = body.pin;
    const confirmPin = body.confirmPin ?? body.confirm;
    if (!validatePin(pin)) {
      return NextResponse.json({ error: "PIN invalide (4 chiffres requis)." }, { status: 400 });
    }
    if (pin !== confirmPin) {
      return NextResponse.json({ error: "Les codes PIN ne correspondent pas." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ pin_hash: hashPin(pin) })
      .eq("id", user!.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "change") {
    if (!profile?.pin_hash) {
      return NextResponse.json({ error: "Aucun PIN defini." }, { status: 400 });
    }

    const { oldPin, newPin, confirmPin } = body;
    if (!validatePin(oldPin) || !validatePin(newPin)) {
      return NextResponse.json({ error: "PIN invalide (4 chiffres requis)." }, { status: 400 });
    }
    if (newPin !== confirmPin) {
      return NextResponse.json({ error: "Les nouveaux codes ne correspondent pas." }, { status: 400 });
    }
    if (oldPin === newPin) {
      return NextResponse.json({ error: "Le nouveau PIN doit etre different." }, { status: 400 });
    }
    if (!verifyPin(oldPin, profile.pin_hash)) {
      return NextResponse.json({ error: "Ancien PIN incorrect." }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ pin_hash: hashPin(newPin) })
      .eq("id", user!.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}

export async function PATCH(req: Request) {
  const ctx = await getCenterPinContext(req);
  if ("response" in ctx && ctx.response) return ctx.response;

  const { user, profile } = ctx;

  if (!canManagePinProtectedZones(profile?.role)) {
    return NextResponse.json(
      { error: "Seuls le responsable et le directeur de campus peuvent modifier les zones protegees." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const incoming = body.pinSettings ?? body.pin_settings;

  if (!incoming || typeof incoming !== "object") {
    return NextResponse.json({ error: "Parametres invalides." }, { status: 400 });
  }

  const current = parsePinSettings(profile?.pin_settings);
  const next: PinSettings = {
    secure_programme: Boolean(incoming.secure_programme),
    secure_etudiants: Boolean(incoming.secure_etudiants),
    block_downloads: Boolean(incoming.block_downloads),
  };

  const enabling =
    (next.secure_programme && !current.secure_programme) ||
    (next.secure_etudiants && !current.secure_etudiants) ||
    (next.block_downloads && !current.block_downloads);

  if (enabling && !profile?.pin_hash) {
    return NextResponse.json(
      { error: "Creez un code PIN avant d activer une protection." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ pin_settings: next })
    .eq("id", user!.id);

  if (error) {
    if (error.message.includes("pin_settings")) {
      return NextResponse.json(
        { error: "Colonne pin_settings absente. Executez supabase-center-pin.sql." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pinSettings: next });
}
