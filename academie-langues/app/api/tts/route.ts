import { EdgeTTS } from "edge-tts-universal";

import { NextRequest, NextResponse } from "next/server";

import { checkSubscription } from "@/app/utils/auth-server";

import {

  EXAMINER_TTS_PITCH,

  EXAMINER_TTS_RATE,

  EXAMINER_VOICE,

} from "@/app/config/examiner-tts";



export const maxDuration = 30;



const MAX_TTS_LENGTH = 600;



export async function POST(req: NextRequest) {

  const { user, error, status } = await checkSubscription(req);

  if (!user) return NextResponse.json({ error }, { status });



  try {

    const body = await req.json();

    const text = typeof body.text === "string" ? body.text.trim() : "";



    if (!text) {

      return NextResponse.json({ error: "Texte vide." }, { status: 400 });

    }



    if (text.length > MAX_TTS_LENGTH) {

      return NextResponse.json({ error: "Texte trop long pour la synthèse vocale." }, { status: 413 });

    }



    const tts = new EdgeTTS(text, EXAMINER_VOICE, {

      rate: EXAMINER_TTS_RATE,

      pitch: EXAMINER_TTS_PITCH,

      volume: "+0%",

    });



    const result = await tts.synthesize();

    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());



    return new Response(audioBuffer, {

      headers: {

        "Content-Type": "audio/mpeg",

        "Cache-Control": "private, max-age=300",

      },

    });

  } catch (err: unknown) {

    const msg = err instanceof Error ? err.message : "Erreur TTS";

    console.error("[api/tts]", msg);

    return NextResponse.json(

      { error: "Synthèse vocale indisponible pour le moment." },

      { status: 502 },

    );

  }

}


