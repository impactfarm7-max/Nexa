import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptServer, decryptServer } from "@/app/utils/messageCrypto.server";
import { runSupportBot } from "@/app/utils/support-bot";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findStudentByEmail(email: string | null) {
  if (!email) return null;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role")
    .eq("email", email)
    .neq("role", "admin")
    .maybeSingle();
  return data;
}

async function findAdminId() {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email")?.trim().toLowerCase() || null;
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 });

  const student = await findStudentByEmail(email);
  if (student) {
    const { data, error } = await supabaseAdmin
      .from("support_messages")
      .select("*")
      .or(`from_user_id.eq.${student.id},to_user_id.eq.${student.id}`)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin
      .from("support_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("to_user_id", student.id)
      .is("read_at", null);

    const adminIds = [...new Set((data || [])
      .filter((msg: any) => msg.from_user_id !== student.id)
      .map((msg: any) => msg.from_user_id)
    )];
    const { data: adminProfiles } = adminIds.length > 0
      ? await supabaseAdmin.from("profiles").select("id, prenom").in("id", adminIds)
      : { data: [] as any[] };
    const adminNameMap = new Map((adminProfiles || []).map((p: any) => [p.id, p.prenom || "Support client"]));
    const messages = (data || []).map((msg: any) => ({
      ...msg,
      message: decryptServer(msg.message, { kind: "support", studentId: student.id }),
      sender_name: msg.from_user_id !== student.id ? adminNameMap.get(msg.from_user_id) || "Support client" : null,
    }));

    return NextResponse.json({ mode: "account", studentId: student.id, messages });
  }

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

  const adminIds = [...new Set((data || [])
    .filter((msg: any) => msg.sender === "admin" && msg.sender_user_id)
    .map((msg: any) => msg.sender_user_id)
  )];
  const { data: adminProfiles } = adminIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, prenom").in("id", adminIds)
    : { data: [] as any[] };
  const adminNameMap = new Map((adminProfiles || []).map((p: any) => [p.id, p.prenom || "Support client"]));
  const messages = (data || []).map((msg: any) => ({
    ...msg,
    message: decryptServer(msg.message, { kind: "guest", token }),
    sender_name: msg.sender === "admin" ? adminNameMap.get(msg.sender_user_id) || "Support client" : null,
  }));

  return NextResponse.json({ mode: "guest", messages });
}

export async function POST(req: Request) {
  const body = await req.json();
  const token = String(body.token || "").trim();
  const message = String(body.message || "").trim();
  const imageUrl = String(body.imageUrl || "").trim() || null;
  const guestName = String(body.guestName || "").trim() || null;
  const guestEmail = String(body.guestEmail || "").trim().toLowerCase() || null;

  if (!token || (!message && !imageUrl)) {
    return NextResponse.json({ error: "Token et message ou image requis" }, { status: 400 });
  }

  const student = await findStudentByEmail(guestEmail);
  const messageWithFallback = imageUrl
    ? `${message}${message ? "\n\n" : ""}Image jointe : ${imageUrl}`
    : message;

  if (student) {
    const adminId = await findAdminId();
    if (!adminId) return NextResponse.json({ error: "Aucun admin trouve" }, { status: 404 });

    const encMsg = encryptServer(messageWithFallback, { kind: "support", studentId: student.id });
    const { data: inserted, error } = await supabaseAdmin.from("support_messages").insert([{
      from_user_id: student.id,
      to_user_id: adminId,
      message: encMsg,
      image_url: imageUrl,
    }]).select("id, image_url").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (imageUrl && inserted?.image_url !== imageUrl) {
      return NextResponse.json({ error: "Image non enregistree dans support_messages" }, { status: 500 });
    }
    try { await runSupportBot({ kind: "account", studentId: student.id }); } catch (e) { console.error("[guest->bot account]", e); }
    return NextResponse.json({ ok: true, mode: "account", studentId: student.id });
  }

  const encMsg = encryptServer(messageWithFallback, { kind: "guest", token });
  const { data: inserted, error } = await supabaseAdmin.from("guest_support_messages").insert([{
    guest_token: token,
    guest_name: guestName,
    guest_email: guestEmail,
    sender: "guest",
    message: encMsg,
    image_url: imageUrl,
  }]).select("id, image_url").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (imageUrl && inserted?.image_url !== imageUrl) {
    return NextResponse.json({ error: "Image non enregistree dans guest_support_messages" }, { status: 500 });
  }
  try { await runSupportBot({ kind: "guest", token }); } catch (e) { console.error("[guest->bot]", e); }
  return NextResponse.json({ ok: true });
}
