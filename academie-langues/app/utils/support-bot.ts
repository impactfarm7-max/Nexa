import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { encryptServer, decryptServer } from "@/app/utils/messageCrypto.server";
import { sendPushToUsers } from "@/app/utils/push-server";
import { SUPPORT_KNOWLEDGE } from "@/app/data/support-knowledge";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Marqueur invisible en tête de message = réponse du bot (le client l'affiche "Assistant NEXA")
export const BOT_MARKER = String.fromCharCode(0x200b); // zero-width space
const BOT_NAME = "Assistant NEXA 🤖";
const MODEL = "claude-haiku-4-5-20251001";
const HISTORY_LIMIT = 16;

function stripForContext(text: string) {
  const t = (text || "").startsWith(BOT_MARKER) ? (text || "").slice(BOT_MARKER.length) : (text || "");
  return t
    .replace(/\n*\s*Image jointe\s*:\s*https?:\/\/\S+\s*/g, "")
    .trim();
}

async function findAdminId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

type BotInput =
  | { kind: "account"; studentId: string }
  | { kind: "guest"; token: string };

async function getOrCreateConversation(conversationKey: string, kind: "account" | "guest") {
  const { data: existing } = await supabaseAdmin
    .from("support_conversations")
    .select("*")
    .eq("conversation_key", conversationKey)
    .maybeSingle();
  if (existing) return existing;

  const { data: created } = await supabaseAdmin
    .from("support_conversations")
    .insert({ conversation_key: conversationKey, kind, mode: "bot", status: "open" })
    .select("*")
    .single();
  return created;
}

async function loadHistory(input: BotInput): Promise<{ role: "user" | "assistant"; content: string }[]> {
  if (input.kind === "account") {
    const { data } = await supabaseAdmin
      .from("support_messages")
      .select("from_user_id, message, created_at")
      .or(`from_user_id.eq.${input.studentId},to_user_id.eq.${input.studentId}`)
      .order("created_at", { ascending: true });
    return (data || []).slice(-HISTORY_LIMIT).map((m: any) => ({
      role: (m.from_user_id === input.studentId ? "user" : "assistant") as "user" | "assistant",
      content: stripForContext(decryptServer(m.message, { kind: "support", studentId: input.studentId })),
    })).filter((m) => m.content);
  }
  const { data } = await supabaseAdmin
    .from("guest_support_messages")
    .select("sender, message, created_at")
    .eq("guest_token", input.token)
    .order("created_at", { ascending: true });
  return (data || []).slice(-HISTORY_LIMIT).map((m: any) => ({
    role: (m.sender === "guest" ? "user" : "assistant") as "user" | "assistant",
    content: stripForContext(decryptServer(m.message, { kind: "guest", token: input.token })),
  })).filter((m) => m.content);
}

async function insertBotReply(input: BotInput, text: string) {
  const stored = BOT_MARKER + text;
  if (input.kind === "account") {
    const adminId = await findAdminId();
    if (!adminId) return;
    const enc = encryptServer(stored, { kind: "support", studentId: input.studentId });
    await supabaseAdmin.from("support_messages").insert([{
      from_user_id: adminId,
      to_user_id: input.studentId,
      message: enc,
    }]);
  } else {
    const enc = encryptServer(stored, { kind: "guest", token: input.token });
    await supabaseAdmin.from("guest_support_messages").insert([{
      guest_token: input.token,
      sender: "admin",
      sender_name: BOT_NAME,
      message: enc,
    }]);
  }
}

async function escalateToHuman(conversationKey: string, input: BotInput, lastUserMsg: string) {
  await supabaseAdmin
    .from("support_conversations")
    .update({ status: "pending_human" })
    .eq("conversation_key", conversationKey);

  const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("role", "admin");
  const adminIds = (admins || []).map((a: any) => a.id);
  if (adminIds.length === 0) return;

  const who = input.kind === "account" ? "un étudiant" : "un invité";
  const message = `Support : le bot a transmis une conversation à un humain (${who}). Dernier message : "${lastUserMsg.slice(0, 120)}"`;

  await supabaseAdmin.from("notifications").insert(adminIds.map((id) => ({ user_id: id, message })));
  await sendPushToUsers(adminIds, {
    title: "Support : intervention requise",
    body: message,
    url: "/admin?tab=support",
  });
}

/**
 * Exécute le bot support pour une conversation.
 * Ne fait rien si la conversation est en mode "human" (admin a pris la main).
 */
export async function runSupportBot(input: BotInput): Promise<{ skipped?: boolean; replied?: boolean; escalated?: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) return { skipped: true };

  // Support centre = suivi réseau humain — ne pas mélanger avec le bot B2C.
  if (input.kind === "account") {
    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("center_id")
      .eq("id", input.studentId)
      .maybeSingle();
    if (student?.center_id) return { skipped: true };
  }

  const conversationKey = input.kind === "account" ? input.studentId : input.token;
  const convo = await getOrCreateConversation(conversationKey, input.kind);
  if (!convo || convo.mode === "human") return { skipped: true };

  const history = await loadHistory(input);
  if (history.length === 0 || history[history.length - 1].role !== "user") return { skipped: true };
  const lastUserMsg = history[history.length - 1].content;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `Tu es l'assistant support de NEXA, plateforme de préparation TCF Canada et IELTS. Tu réponds aux étudiants 24h/24 de façon chaleureuse, concise et précise, en français.

RÈGLES :
- Réponds UNIQUEMENT à partir de la base de connaissance ci-dessous. N'invente jamais de prix, quotas, délais ou procédures.
- Si la question sort de la base de connaissance, ou concerne un cas personnel que tu ne peux pas vérifier (paiement non reçu, bug spécifique au compte, litige, remboursement, accès bloqué), tu dois escalader vers un conseiller humain.
- Propose toujours discrètement, à la fin, la possibilité de parler à un conseiller humain si besoin.
- Sois bref (2-5 phrases max sauf si nécessaire).

Tu réponds STRICTEMENT en JSON valide, sans texte autour, au format :
{"reply": "ta réponse à l'utilisateur", "escalate": true|false}
- escalate=true si tu n'es pas sûr / cas personnel / hors base → dans ce cas "reply" annonce que tu transmets à un conseiller.
- escalate=false si tu réponds avec certitude depuis la base.

=== BASE DE CONNAISSANCE ===
${SUPPORT_KNOWLEDGE}`;

  let reply = "";
  let escalate = false;
  try {
    const res = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 700,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } } as any],
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      },
      { headers: { "anthropic-beta": "prompt-caching-2024-07-31" } }
    );
    const raw = res.content.find((c: any) => c.type === "text") as any;
    const txt = raw?.text?.trim() || "";
    const jsonMatch = txt.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : txt);
    reply = String(parsed.reply || "").trim();
    escalate = Boolean(parsed.escalate);
  } catch (err) {
    console.error("[support-bot] Claude error", err);
    reply = "Je transmets votre demande à un conseiller qui vous répondra ici très vite. Merci de votre patience 🙏";
    escalate = true;
  }

  if (!reply) {
    reply = "Je transmets votre demande à un conseiller. Vous aurez une réponse ici sous peu 🙏";
    escalate = true;
  }

  await insertBotReply(input, reply);
  await supabaseAdmin
    .from("support_conversations")
    .update({ last_bot_at: new Date().toISOString(), status: escalate ? "pending_human" : "open" })
    .eq("conversation_key", conversationKey);

  if (escalate) await escalateToHuman(conversationKey, input, lastUserMsg);

  return { replied: true, escalated: escalate };
}
