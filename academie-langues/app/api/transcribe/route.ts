// app/api/transcribe/route.ts
// ✅ Groq Whisper — plus rapide qu'OpenAI, même qualité, gère l'accent camerounais

import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { checkSubscription } from "@/app/utils/auth-server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Limite à 10 MB (Whisper accepte jusqu'à 25 MB, on prend une marge)
const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { user, error, status } = await checkSubscription(req);
  if (!user) return NextResponse.json({ error }, { status });

  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "Fichier audio manquant" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Fichier audio trop volumineux (max 10 MB)." },
        { status: 413 }
      );
    }

    // ✅ whisper-large-v3-turbo : meilleur rapport vitesse/qualité sur Groq
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3-turbo",
      language: "fr",
      response_format: "json",
      prompt:
        "Transcription d'un candidat au TCF Canada. Expression orale en français. " +
        "Inclure la ponctuation correcte.",
    });

    return NextResponse.json({ transcript: transcription.text });
  } catch (err: unknown) {
    console.error("[Transcription Groq Whisper]", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { error: "Erreur de transcription. Réessayez." },
      { status: 500 }
    );
  }
}
