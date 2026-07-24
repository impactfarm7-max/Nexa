// app/api/simulateur/oral/route.ts

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { checkSubscription, checkAndConsumeQuota, logSimulatorUsage } from "@/app/utils/auth-server";
import { normalizeOralCorrectionResult, parseAiJson } from "@/app/utils/parse-ai-json";
import { ORAL_SCORE_NIVEAU_BARME } from "@/app/utils/oral-score-niveau";

export const maxDuration = 60;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante dans les variables d'environnement.");

const anthropic = new Anthropic({
  apiKey,
  maxRetries: 0,
  timeout: 55000,
});

const ORAL_TASK_PROMPTS: Record<1 | 2 | 3, string> = {
  1: `Tu corriges la Tâche 1 (monologue de présentation, ~2 min).
Critères : clarté, structure (intro / développement / conclusion), vocabulaire, grammaire, fluidité, pertinence par rapport au sujet.`,
  2: `Tu corriges la Tâche 2 (interaction orale, jeu de rôle).
Critères : pertinence des questions/réponses, cohérence du dialogue, registre, grammaire, fluidité, capacité à maintenir l'échange.`,
  3: `Tu corriges la Tâche 3 (opinion argumentée, ~4 min 30).
Critères : prise de position claire, arguments, exemples, connecteurs logiques, grammaire, richesse lexicale, structure.`,
};

function resolveTaskNumber(body: { task?: number; isTask2?: boolean }): 1 | 2 | 3 {
  if (body.task === 1 || body.task === 2 || body.task === 3) return body.task;
  return body.isTask2 ? 2 : 1;
}

function buildCorrectionPrompt(task: 1 | 2 | 3, tours?: number) {
  const toursLine =
    task === 2 ? `\nNombre de tours candidat effectués : ${tours ?? 0}.` : "";

  return `Tu es un correcteur expert TCF Canada pour l'expression orale.
${ORAL_TASK_PROMPTS[task]}${toursLine}

${ORAL_SCORE_NIVEAU_BARME}

Renvoie UNIQUEMENT un objet JSON valide.
INTERDICTION de markdown. Commence par { et termine par }.

Structure exacte :
{
  "note": "XX/20",
  "niveau": "A1|A2|B1|B2|C1|C2",
  "commentaire_global": "2-4 phrases maximum",
  "version_ideale": "Exemple court adapté à la tâche",
  "erreurs_identifiees": ["erreur 1", "erreur 2"],
  "conseils": ["conseil 1", "conseil 2"]
}`;
}

async function createCorrectionWithRetry(
  systemPrompt: string,
  userContent: string,
): Promise<ReturnType<typeof normalizeOralCorrectionResult>> {
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });

      const content =
        response.content[0]?.type === "text" ? response.content[0].text : "";

      if (!content.trim()) {
        throw new Error("Réponse vide du correcteur.");
      }

      return normalizeOralCorrectionResult(parseAiJson(content));
    } catch (error: unknown) {
      lastError = error;
      const status = typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;
      const retryable = status === 429 || status === 529 || status === 503;

      if (retryable && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 2500));
        continue;
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Impossible d'obtenir une correction après plusieurs tentatives.");
}

export async function POST(req: NextRequest) {
  const { user, error, status } = await checkSubscription(req);
  if (!user) return NextResponse.json({ error }, { status });

  const body = await req.json();
  const { action, message, sujet, tour, tours_restants, tours } = body;

  if (action === "interaction") {
    const systemPrompt = `Tu es un interlocuteur TCF Canada pour la tâche d'interaction orale (Tâche 2).
Tu joues un rôle précis donné par le sujet ci-dessous et tu converses naturellement avec le candidat.

Sujet / contexte : ${sujet}

RÈGLES IMPÉRATIVES :
- Réponds en 1 à 2 phrases MAXIMUM. Jamais plus. Sois bref et naturel.
- Tu es AFFIRMATIF : tu donnes des informations, tu réagis, tu confirmes, tu exprimes ton avis.
- NE POSE JAMAIS DE QUESTION. C'est le candidat qui pose les questions, pas toi.
- Si le candidat te pose une question, réponds-y directement et affirmativement sans lui renvoyer une question.
- Ton registre est oral, vivant, pas scolaire.
- Tu es au tour ${tour} sur 6. Tours restants après ta réponse : ${tours_restants}.
- Si tours_restants = 0, conclus la conversation de façon naturelle en 1 phrase.
- Ne JAMAIS mentionner que tu es une IA ou un simulateur.`;

    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  }

  if (action === "correction") {
    const task = resolveTaskNumber(body);

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Aucune réponse enregistrée à corriger. Enregistrez votre prise de parole puis réessayez." },
        { status: 400 },
      );
    }

    if (!sujet || typeof sujet !== "string") {
      return NextResponse.json({ error: "Sujet manquant." }, { status: 400 });
    }

    const quotaCheck = await checkAndConsumeQuota(user.id, "oral", true);
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.error }, { status: 429 });
    }

    try {
      const result = await createCorrectionWithRetry(
        buildCorrectionPrompt(task, tours),
        `Sujet : ${sujet}\n\nDiscours/dialogue du candidat :\n${message.trim()}`,
      );

      await checkAndConsumeQuota(user.id, "oral");
      logSimulatorUsage(user.id, "oral");

      return NextResponse.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue.";
      console.error("[simulateur/oral] correction failed:", msg);

      return NextResponse.json(
        {
          error:
            "Le correcteur est momentanément indisponible. Votre enregistrement est conservé : réessayez dans 1 à 2 minutes.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
