import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { encryptServer, decryptServer } from "@/app/utils/messageCrypto.server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOT_MARKER = String.fromCharCode(0x200b);

function isAgentRole(role?: string | null) {
  return role === "admin" || role === "superadmin";
}

function isNetworkUserRole(role?: string | null) {
  return (
    role === "student" ||
    role === "center_manager" ||
    role === "campus_manager" ||
    role === "trainer" ||
    role === "staff"
  );
}

async function assertSuperadmin(userId: string) {
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", userId).single();
  return profile?.role === "superadmin";
}

type ConversationRow = {
  student_id: string;
  prenom: string;
  email: string | null;
  role: string | null;
  center_id: string | null;
  center_name: string | null;
  last_message: string;
  last_at: string;
  unread: number;
};

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await assertSuperadmin(user.id))) {
    return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  if (studentId) {
    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("id, prenom, nom, email, center_id, role, centers:center_id(name)")
      .eq("id", studentId)
      .maybeSingle();

    if (!student?.center_id || !isNetworkUserRole(student.role)) {
      return NextResponse.json({ error: "Conversation hors périmètre réseau." }, { status: 404 });
    }

    const { data: rows } = await supabaseAdmin
      .from("support_messages")
      .select("*")
      .or(`from_user_id.eq.${studentId},to_user_id.eq.${studentId}`)
      .order("created_at", { ascending: true });

    const messages = (rows || []).map((msg: any) => {
      const plain = decryptServer(msg.message, { kind: "support", studentId });
      return {
        ...msg,
        message: plain.startsWith(BOT_MARKER) ? plain.slice(BOT_MARKER.length) : plain,
        is_bot: plain.startsWith(BOT_MARKER),
      };
    });

    await supabaseAdmin
      .from("support_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("from_user_id", studentId)
      .is("read_at", null);

    return NextResponse.json({
      student: {
        id: student.id,
        prenom: student.prenom,
        nom: student.nom,
        email: student.email,
        center_id: student.center_id,
        center_name: (student.centers as any)?.name || null,
      },
      messages,
    });
  }

  const { data: supportRows } = await supabaseAdmin
    .from("support_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(4000);

  const rows = supportRows || [];
  const participantIds = [...new Set(rows.flatMap((msg: any) => [msg.from_user_id, msg.to_user_id]))];
  if (participantIds.length === 0) {
    return NextResponse.json({ conversations: [] as ConversationRow[] });
  }

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, prenom, email, role, center_id, centers:center_id(name)")
    .in("id", participantIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  const map = new Map<string, ConversationRow>();

  for (const msg of rows) {
    const fromProfile = profileMap.get(msg.from_user_id);
    const toProfile = profileMap.get(msg.to_user_id);
    if (!fromProfile && !toProfile) continue;

    const sid = !isAgentRole(fromProfile?.role) && isNetworkUserRole(fromProfile?.role)
      ? msg.from_user_id
      : !isAgentRole(toProfile?.role) && isNetworkUserRole(toProfile?.role)
        ? msg.to_user_id
        : null;
    if (!sid) continue;
    const profile = profileMap.get(sid);
    if (!profile?.center_id || !isNetworkUserRole(profile.role)) continue;

    const plain = decryptServer(msg.message, { kind: "support", studentId: sid });
    const preview = (plain.startsWith(BOT_MARKER) ? plain.slice(BOT_MARKER.length) : plain)
      .replace(/\n*\s*Image jointe\s*:\s*https?:\/\/\S+\s*/g, "")
      .trim()
      .slice(0, 160);

    if (!map.has(sid)) {
      map.set(sid, {
        student_id: sid,
        prenom: profile.prenom || profile.email || sid,
        email: profile.email || null,
        role: profile.role || null,
        center_id: profile.center_id,
        center_name: profile.centers?.name || null,
        last_message: preview || "(pièce jointe)",
        last_at: msg.created_at,
        unread: 0,
      });
    }

    if (msg.from_user_id === sid && !msg.read_at) {
      map.get(sid)!.unread += 1;
    }
  }

  const conversations = [...map.values()].sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  );

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!(await assertSuperadmin(user.id))) {
    return NextResponse.json({ error: "Superadmin uniquement." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;

  if (!studentId || (!message && !imageUrl)) {
    return NextResponse.json({ error: "Message invalide." }, { status: 400 });
  }

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("id, center_id, role")
    .eq("id", studentId)
    .maybeSingle();

  if (!student?.center_id || !isNetworkUserRole(student.role)) {
    return NextResponse.json({ error: "Utilisateur hors périmètre réseau." }, { status: 404 });
  }

  const messageWithFallback = imageUrl
    ? `${message}${message ? "\n\n" : ""}Image jointe : ${imageUrl}`
    : message;
  const enc = encryptServer(messageWithFallback, { kind: "support", studentId });

  const { data: inserted, error } = await supabaseAdmin
    .from("support_messages")
    .insert([{
      from_user_id: user.id,
      to_user_id: studentId,
      message: enc,
      image_url: imageUrl,
    }])
    .select("id, image_url, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("support_conversations").upsert(
    { conversation_key: studentId, kind: "account", mode: "human" },
    { onConflict: "conversation_key" }
  );

  return NextResponse.json({ ok: true, message: inserted });
}
