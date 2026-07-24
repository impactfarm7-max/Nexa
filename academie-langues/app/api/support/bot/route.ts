import { NextResponse } from "next/server";
import { getAuthUser } from "@/app/utils/auth-server";
import { runSupportBot } from "@/app/utils/support-bot";

// Déclenché par le client (étudiant connecté) après l'envoi d'un message au support.
export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  try {
    const result = await runSupportBot({ kind: "account", studentId: user.id });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[support/bot]", err);
    return NextResponse.json({ error: "Erreur bot." }, { status: 500 });
  }
}
