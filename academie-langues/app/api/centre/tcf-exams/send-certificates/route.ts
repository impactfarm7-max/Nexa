import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/app/utils/auth-server";
import { sendEmail } from "@/app/utils/email-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STAFF_ROLES = ["admin", "center_manager", "campus_manager", "trainer", "staff"];

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("center_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.center_id || !STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json();
  const { certificate_ids, session_id, exam_session_ids, force_resend = false } = body;

  let certQuery = supabaseAdmin
    .from("exam_certificates")
    .select("id, pdf_url, certificate_code, user_id, score_summary, emailed_at, session_id")
    .eq("session_table", "exam_sessions");

  if (certificate_ids?.length) {
    certQuery = certQuery.in("id", certificate_ids);
  } else if (exam_session_ids?.length) {
    const { data: sessions } = await supabaseAdmin
      .from("exam_sessions")
      .select("id")
      .in("id", exam_session_ids)
      .eq("center_id", profile.center_id);
    const validIds = (sessions ?? []).map((s) => s.id);
    if (validIds.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, message: "Aucun certificat trouvé." });
    }
    certQuery = certQuery.in("session_id", validIds);
  } else if (session_id) {
    const { data: assignments } = await supabaseAdmin
      .from("tcf_exam_assignments")
      .select("exam_session_id")
      .eq("session_id", session_id)
      .not("exam_session_id", "is", null);
    const examSessionIds = (assignments ?? []).map((a) => a.exam_session_id);
    if (examSessionIds.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, message: "Aucun certificat pour cette séance." });
    }
    certQuery = certQuery.in("session_id", examSessionIds);
  } else {
    return NextResponse.json({ error: "certificate_ids, exam_session_ids ou session_id requis." }, { status: 400 });
  }

  const { data: certs } = await certQuery;

  const { data: centerStudents } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("center_id", profile.center_id)
    .eq("role", "student");

  const studentSet = new Set((centerStudents ?? []).map((s) => s.id));

  let sent = 0;
  let skipped = 0;

  for (const cert of certs ?? []) {
    if (!studentSet.has(cert.user_id)) continue;
    if (!cert.pdf_url) {
      skipped++;
      continue;
    }
    if (cert.emailed_at && !force_resend) {
      skipped++;
      continue;
    }

    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("email, prenom")
      .eq("id", cert.user_id)
      .maybeSingle();

    if (!student?.email) {
      skipped++;
      continue;
    }

    const examLabel = (cert.score_summary as any)?.examLabel || "Examen TCF Canada";
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://nexa.app";
    const verifyUrl = `${origin}/certificat/${cert.certificate_code}`;

    const text = [
      `Bonjour ${student.prenom || "Élève"},`,
      "",
      `Votre centre vous transmet votre certificat de résultat : ${examLabel}.`,
      "",
      `Téléchargez-le ici : ${cert.pdf_url}`,
      "",
      `Code de vérification : ${cert.certificate_code}`,
      `Vérifiable sur : ${verifyUrl}`,
      "",
      "L'équipe NEXA",
    ].join("\n");

    const result = await sendEmail({
      to: student.email,
      subject: `Certificat TCF — ${examLabel}`,
      text,
    });

    if (result.sent) {
      await supabaseAdmin
        .from("exam_certificates")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", cert.id);
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped });
}
