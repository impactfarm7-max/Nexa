import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { TUTOR_EXCHANGE_QUOTA } from "@/app/utils/tutor-quota";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 0,
  timeout: 45000,
});

const MODEL = "claude-haiku-4-5-20251001";
const HISTORY_LIMIT = 12;
const MAX_MESSAGE_LENGTH = 4000;

const TUTOR_SYSTEM_PROMPT = `Tu es "Coach NEXA", le tuteur IA privé de NEXA, plateforme de préparation au TCF Canada.
Tu aides les étudiants avec leurs questions de grammaire, vocabulaire, compréhension et méthodologie d'examen, en français.

RÈGLES :
- Sois pédagogue, chaleureux et concis (3-6 phrases sauf si l'étudiant demande un exercice ou une explication détaillée).
- Utilise des exemples concrets liés au TCF Canada (expression écrite, expression orale, compréhension).
- Si la question sort du cadre de l'apprentissage du français / TCF Canada, recentre poliment vers ce cadre.
- Ne donne jamais d'information sur les prix, quotas ou procédures administratives, redirige vers le support NEXA pour ça.
- Termine parfois par une question ou une proposition d'exercice pour garder l'échange interactif.

FORMAT DE RÉPONSE (important) :
- Texte brut uniquement, jamais de markdown : pas d'astérisques (**gras**), pas de dièses (# titres), pas de puces (-, *), pas de blocs de code.
- N'utilise jamais le tiret cadratin (—) ni le tiret demi-cadratin (–). Utilise une virgule, un point, ou "et"/"mais" à la place.
- Pour mettre un mot en avant, utilise des guillemets ou reformule la phrase, jamais de gras/italique.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

// Filet de sécurité si le modèle ignore les consignes de format : retire le
// markdown résiduel (gras/italique/titres/puces) et les tirets cadratins.
function sanitizeReply(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/[—–]/g, ",")
    .replace(/,\s*,/g, ",")
    .trim();
}

async function loadHistory(userId: string): Promise<ChatMessage[]> {
  const { data } = await supabaseAdmin
    .from("tutor_messages")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(200);
  return ((data as { role: "user" | "assistant"; content: string }[] | null) || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

async function saveMessage(userId: string, role: "user" | "assistant", content: string) {
  await supabaseAdmin.from("tutor_messages").insert({ user_id: userId, role, content });
}

async function loadProfile(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role, pack_name, tutor_ia_used")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

const STAFF_ROLES = new Set(["admin", "center_manager", "trainer", "superadmin"]);

/** NEXA : pas de packs — tout compte étudiant authentifié a 15 échanges. */
function computeAccess(profile: { role: string | null } | null | undefined) {
  const isAdmin = profile?.role === "admin";
  const role = profile?.role ?? "student";
  const hasAccess = Boolean(profile && !STAFF_ROLES.has(role));
  const unlimited = isAdmin;
  const total = TUTOR_EXCHANGE_QUOTA;
  return { isAdmin, total, unlimited, hasAccess };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const [profile, history] = await Promise.all([loadProfile(user.id), loadHistory(user.id)]);
  const { total, unlimited, hasAccess } = computeAccess(profile);

  return NextResponse.json({
    hasAccess,
    unlimited,
    total: unlimited ? null : total,
    used: unlimited ? null : profile?.tutor_ia_used ?? 0,
    history,
  });
}

export async function DELETE(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  await supabaseAdmin.from("tutor_messages").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message trop long (4000 caractères max)." }, { status: 400 });
  }

  const profile = await loadProfile(user.id);
  const { total, unlimited, hasAccess, used } = { ...computeAccess(profile), used: profile?.tutor_ia_used ?? 0 };

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Le tuteur IA n'est pas disponible pour ce compte." },
      { status: 403 },
    );
  }
  if (!unlimited && used >= TUTOR_EXCHANGE_QUOTA) {
    return NextResponse.json(
      { error: `Quota de ${TUTOR_EXCHANGE_QUOTA} échanges au tuteur IA épuisé.` },
      { status: 403 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Tuteur IA indisponible pour le moment." }, { status: 503 });
  }

  const history = (await loadHistory(user.id)).slice(-HISTORY_LIMIT);

  let reply = "";
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: TUTOR_SYSTEM_PROMPT,
      messages: [...history, { role: "user", content: message }],
    });
    const raw = response.content.find((c) => c.type === "text") as { text?: string } | undefined;
    reply = sanitizeReply(raw?.text?.trim() || "");
  } catch (err) {
    console.error("[api/tuteur/message] Claude error", err);
    return NextResponse.json({ error: "Le tuteur IA est momentanément indisponible. Réessayez." }, { status: 502 });
  }

  if (!reply) {
    return NextResponse.json({ error: "Le tuteur IA est momentanément indisponible. Réessayez." }, { status: 502 });
  }

  let nextUsed = used;
  if (!unlimited) {
    const { data: quotaRow } = await supabaseAdmin
      .from("profiles")
      .update({ tutor_ia_used: used + 1 })
      .eq("id", user.id)
      .lt("tutor_ia_used", TUTOR_EXCHANGE_QUOTA)
      .select("tutor_ia_used")
      .maybeSingle();

    if (!quotaRow) {
      return NextResponse.json(
        { error: `Quota de ${TUTOR_EXCHANGE_QUOTA} échanges au tuteur IA épuisé.` },
        { status: 403 },
      );
    }
    nextUsed = quotaRow.tutor_ia_used;
  }

  await saveMessage(user.id, "user", message);
  await saveMessage(user.id, "assistant", reply);

  return NextResponse.json({
    reply,
    unlimited,
    total: unlimited ? null : total,
    used: unlimited ? null : nextUsed,
  });
}
