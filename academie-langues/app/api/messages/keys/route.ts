import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { deriveSubkeyB64 } from "@/app/utils/messageCrypto.server";
import type { CryptoCtx } from "@/app/utils/messageCrypto.core.mjs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Canaux broadcast B2C (annonces) — tout utilisateur authentifié peut déchiffrer. */
const PUBLIC_BROADCAST_CHANNELS = new Set(["general", "tcf", "anglais"]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

async function canAccessCommunityChannel(userId: string, channel: string, admin: boolean) {
  if (admin) return true;
  if (PUBLIC_BROADCAST_CHANNELS.has(channel)) return true;

  if (UUID_RE.test(channel)) {
    const { data: membership } = await supabaseAdmin
      .from("community_room_members")
      .select("user_id")
      .eq("room_id", channel)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(membership);
  }

  return false;
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind as string;
  const admin = await isAdmin(user.id);

  let ctx: CryptoCtx;
  if (kind === "community") {
    if (!body.channel) return NextResponse.json({ error: "channel requis" }, { status: 400 });
    const channel = String(body.channel);
    const allowed = await canAccessCommunityChannel(user.id, channel, admin);
    if (!allowed) return NextResponse.json({ error: "Interdit." }, { status: 403 });
    ctx = { kind: "community", channel };
  } else if (kind === "private") {
    const a = String(body.userA || "");
    const b = String(body.userB || "");
    if (!a || !b) return NextResponse.json({ error: "userA/userB requis" }, { status: 400 });
    if (!admin && user.id !== a && user.id !== b) {
      return NextResponse.json({ error: "Interdit." }, { status: 403 });
    }
    ctx = { kind: "private", userA: a, userB: b };
  } else if (kind === "support") {
    const studentId = String(body.studentId || "");
    if (!studentId) return NextResponse.json({ error: "studentId requis" }, { status: 400 });
    if (!admin && user.id !== studentId) {
      return NextResponse.json({ error: "Interdit." }, { status: 403 });
    }
    ctx = { kind: "support", studentId };
  } else if (kind === "guest") {
    if (!admin) return NextResponse.json({ error: "Interdit." }, { status: 403 });
    const token = String(body.token || "");
    if (!token) return NextResponse.json({ error: "token requis" }, { status: 400 });
    ctx = { kind: "guest", token };
  } else {
    return NextResponse.json({ error: "kind invalide" }, { status: 400 });
  }

  return NextResponse.json({ key: deriveSubkeyB64(ctx) });
}
