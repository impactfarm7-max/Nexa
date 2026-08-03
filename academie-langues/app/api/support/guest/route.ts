import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptServer, decryptServer } from "@/app/utils/messageCrypto.server";
import { runSupportBot } from "@/app/utils/support-bot";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOKEN_RE = /^[a-zA-Z0-9_-]{8,128}$/;

function normalizeToken(raw: string | null | undefined): string | null {
  const token = String(raw || "").trim();
  if (!token || !TOKEN_RE.test(token)) return null;
  return token;
}

/**
 * Support invité uniquement — jamais d'escalade email → fil de compte (IDOR).
 * Les utilisateurs connectés utilisent supabase client /api/support/bot.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = normalizeToken(searchParams.get("token"));
  if (!token) return NextResponse.json({ error: "Token manquant ou invalide" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("guest_support_messages")
    .select("*")
    .eq("guest_token", token)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin
    .from("guest_support_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("guest_token", token)
    .eq("sender", "admin")
    .is("read_at", null);

  const adminIds = [
    ...new Set(
      (data || [])
        .filter((msg: any) => msg.sender === "admin" && msg.sender_user_id)
        .map((msg: any) => msg.sender_user_id)
    ),
  ];
  const { data: adminProfiles } =
    adminIds.length > 0
      ? await supabaseAdmin.from("profiles").select("id, prenom").in("id", adminIds)
      : { data: [] as any[] };
  const adminNameMap = new Map(
    (adminProfiles || []).map((p: any) => [p.id, p.prenom || "Support client"])
  );
  const messages = (data || []).map((msg: any) => ({
    ...msg,
    message: decryptServer(msg.message, { kind: "guest", token }),
    sender_name: msg.sender === "admin" ? adminNameMap.get(msg.sender_user_id) || "Support client" : null,
  }));

  return NextResponse.json({ mode: "guest", messages });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = normalizeToken(body.token);
  const message = String(body.message || "").trim();
  const imageUrl = String(body.imageUrl || "").trim() || null;
  const guestName = String(body.guestName || "").trim() || null;
  const guestEmail = String(body.guestEmail || "").trim().toLowerCase() || null;

  if (!token || (!message && !imageUrl)) {
    return NextResponse.json({ error: "Token et message ou image requis" }, { status: 400 });
  }

  const messageWithFallback = imageUrl
    ? `${message}${message ? "\n\n" : ""}Image jointe : ${imageUrl}`
    : message;

  const encMsg = encryptServer(messageWithFallback, { kind: "guest", token });
  const { data: inserted, error } = await supabaseAdmin
    .from("guest_support_messages")
    .insert([
      {
        guest_token: token,
        guest_name: guestName,
        guest_email: guestEmail,
        sender: "guest",
        message: encMsg,
        image_url: imageUrl,
      },
    ])
    .select("id, image_url")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (imageUrl && inserted?.image_url !== imageUrl) {
    return NextResponse.json(
      { error: "Image non enregistree dans guest_support_messages" },
      { status: 500 }
    );
  }
  try {
    await runSupportBot({ kind: "guest", token });
  } catch (e) {
    console.error("[guest->bot]", e);
  }
  return NextResponse.json({ ok: true, mode: "guest" });
}
