import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendEmail } from "@/app/utils/email-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: adminProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux admins." }, { status: 403 });
  }

  const { studentId, packName, days } = await req.json();
  if (!studentId || !packName) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const { data: student, error } = await supabaseAdmin
    .from("profiles")
    .select("prenom, email, center_id")
    .eq("id", studentId)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: "Étudiant introuvable." }, { status: 404 });
  }

  if (!student.email) {
    return NextResponse.json({ error: "Cet étudiant n'a pas d'email." }, { status: 400 });
  }

  if (student.center_id) {
    return NextResponse.json({ error: "Compte centre non visible dans IAG Academy." }, { status: 403 });
  }

  const result = await sendEmail({
    to: student.email,
    subject: `Activation de votre ${packName} - NEXA`,
    text: `Bonjour ${student.prenom || ""},\n\nNous vous confirmons l'activation de votre ${packName}${days ? ` pour une durée de ${days} jours` : ""}.\n\nVos crédits d'entraînement et votre accès Premium sont désormais disponibles sur votre compte.\n\nConnectez-vous ici : https://iag-academy.com/login\n\nBon entraînement !\n\nL'équipe NEXA`,
  });

  if (!result.sent) {
    return NextResponse.json(
      { error: result.skipped ? "Gmail n'est pas configuré." : "L'email n'a pas pu être envoyé." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
