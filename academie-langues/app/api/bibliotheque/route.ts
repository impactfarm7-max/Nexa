import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkSubscription } from "@/app/utils/auth-server";

// On passe à 60 secondes pour exploiter le maximum du plan gratuit Vercel
export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
  maxRetries: 2,
  timeout: 25000,
});

export async function POST(req: Request) {
  const { user, error, status } = await checkSubscription(req);
  if (!user) return NextResponse.json({ error }, { status });

  try {
    const { query } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Requête vide." }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Clé API Anthropic manquante.");
    }

    const systemPrompt = `
      Tu es l'assistant linguistique d'NEXA, spécialisé dans le français avancé (niveau TCF Canada C1/C2).
      Tu aides les étudiants avec des définitions, traductions, synonymes, et explications grammaticales.

      RÈGLES DE FORMAT — TRÈS IMPORTANT :
      - Réponds en texte brut uniquement. AUCUN markdown : pas de **, pas de *, pas de #, pas de tirets de liste.
      - Utilise uniquement des emojis pour structurer visuellement ta réponse.
      - Structure tes réponses ainsi :

      Pour une définition :
      📌 [mot] : [définition claire en une phrase]
      ✍️ Synonymes : [liste séparée par des virgules]
      💡 Exemple : [une phrase d'exemple naturelle]

      Pour une traduction :
      🔁 [mot/phrase original] → [traduction]
      💡 Contexte : [précision utile si nécessaire]

      Pour toute autre question linguistique :
      Réponds directement en texte clair, sans mise en forme.

      - Sois concis : maximum 80 mots.
      - Ton chaleureux et pédagogique.
    `;

    const response = await anthropic.messages.create({
      // 1. CORRECTION : Le vrai nom officiel du modèle Haiku 3.5
      model: "claude-haiku-4-5-20251001", 
      max_tokens: 300,
      
      // 2. MAGIE DU CACHE : On active le Prompt Caching ici (-90% sur la facture de ce texte !)
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" }
        } as any
      ],
      
      messages: [{ role: "user", content: query }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ result: content });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue.";
    console.error("🔥 ERREUR BIBLIOTHÈQUE IA :", msg);
    return NextResponse.json(
      { error: "Le service IA est temporairement indisponible. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}