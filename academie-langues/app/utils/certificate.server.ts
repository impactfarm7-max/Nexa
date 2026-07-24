import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { sendEmail } from "@/app/utils/email-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type CertificateSection = {
  label: string;
  score: string;
  niveau?: string;
};

type CertificateInput = {
  sessionId: string;
  userId: string;
  disciplineCode: string; // ex: "tcf_canada"
  disciplineLabel: string; // ex: "TCF Canada"
  studentName: string;
  examLabel: string; // ex: "Examen Officiel 03"
  sections: CertificateSection[];
};

const BRAND_BLUE = rgb(17 / 255, 34 / 255, 78 / 255);
const BRAND_ORANGE = rgb(248 / 255, 123 / 255, 27 / 255);

/**
 * Génère le certificat (ligne en base + PDF avec QR code + upload), puis
 * envoie un email avec le lien de téléchargement. Chaque étape est
 * résiliente : si l'email échoue, le certificat existe déjà et reste
 * accessible depuis l'app -- l'échec d'envoi n'efface jamais le travail
 * déjà fait.
 */
export async function generateCertificate(input: CertificateInput) {
  try {
    // 1. Code unique, vérifiable publiquement
    const { data: code, error: codeErr } = await supabaseAdmin.rpc("generate_certificate_code");
    if (codeErr || !code) throw new Error(codeErr?.message || "Code de certificat non généré.");

    const scoreSummary = { sections: input.sections, examLabel: input.examLabel };

    // 2. Ligne en base AVANT le PDF -- on ne perd jamais le code, même si
    // la génération du PDF ou l'envoi de l'email échoue ensuite.
    const { data: cert, error: insertErr } = await supabaseAdmin
      .from("exam_certificates")
      .insert({
        session_table: "exam_sessions",
        session_id: input.sessionId,
        user_id: input.userId,
        discipline_code: input.disciplineCode,
        certificate_code: code,
        score_summary: scoreSummary,
      })
      .select("id")
      .single();
    if (insertErr || !cert) throw new Error(insertErr?.message || "Insertion certificat échouée.");

    // 3. QR code -> pointe vers la page de vérification publique
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://nexa.app";
    const verifyUrl = `${origin}/certificat/${code}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
    const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");

    // 4. Construction du PDF (A5 paysage)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 419.53]);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawRectangle({ x: 0, y: 380, width: 595.28, height: 40, color: BRAND_BLUE });
    page.drawText("NEXA", { x: 30, y: 392, size: 18, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("CERTIFICAT DE RÉSULTAT", { x: 130, y: 393, size: 13, font: fontBold, color: BRAND_ORANGE });

    page.drawText(input.studentName, { x: 30, y: 330, size: 22, font: fontBold, color: BRAND_BLUE });
    page.drawText(`${input.disciplineLabel} — ${input.examLabel}`, {
      x: 30, y: 305, size: 12, font: fontRegular, color: rgb(0.3, 0.3, 0.3),
    });

    let y = 270;
    for (const s of input.sections) {
      page.drawText(s.label, { x: 30, y, size: 11, font: fontBold, color: BRAND_BLUE });
      page.drawText(`${s.score}${s.niveau ? "  ·  Niveau " + s.niveau : ""}`, {
        x: 220, y, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2),
      });
      y -= 22;
    }

    const qrImage = await pdfDoc.embedPng(qrBytes);
    page.drawImage(qrImage, { x: 460, y: 40, width: 100, height: 100 });
    page.drawText(code, { x: 460, y: 28, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    page.drawText("Scannez pour vérifier l'authenticité", {
      x: 340, y: 150, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`Délivré le ${new Date().toLocaleDateString("fr-FR")}`, {
      x: 30, y: 25, size: 9, font: fontRegular, color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();

    // 5. Upload vers le bucket "certificates"
    const path = `${code}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("certificates")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: urlData } = supabaseAdmin.storage.from("certificates").getPublicUrl(path);

    // 6. Met à jour la ligne avec l'URL finale du PDF
    await supabaseAdmin.from("exam_certificates").update({ pdf_url: urlData.publicUrl }).eq("id", cert.id);

    // 7. Email avec le lien de téléchargement -- best-effort, ne fait
    // jamais échouer la génération du certificat si ça rate.
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", input.userId)
        .maybeSingle();

      if (profile?.email) {
        const text = [
          `Bonjour ${input.studentName},`,
          "",
          `Votre certificat de résultat pour ${input.disciplineLabel} (${input.examLabel}) est prêt.`,
          "",
          `Téléchargez-le ici : ${urlData.publicUrl}`,
          "",
          `Code de vérification : ${code}`,
          `Vérifiable à tout moment sur : ${verifyUrl}`,
          "",
          "Félicitations pour avoir terminé votre examen !",
          "",
          "L'équipe NEXA",
        ].join("\n");

        const result = await sendEmail({
          to: profile.email,
          subject: `Votre certificat NEXA est prêt — ${input.examLabel}`,
          text,
        });

        if (result.sent) {
          await supabaseAdmin.from("exam_certificates").update({ emailed_at: new Date().toISOString() }).eq("id", cert.id);
        } else if (!result.skipped) {
          console.warn("[certificate] envoi email échoué pour", input.userId);
        }
      }
    } catch (emailErr) {
      console.error("[certificate] erreur envoi email (non bloquant):", emailErr);
    }

    return { code, pdfUrl: urlData.publicUrl };
  } catch (err: any) {
    console.error("[certificate] generation failed:", err);
    return null;
  }
}