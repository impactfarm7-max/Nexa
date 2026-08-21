import { createClient } from "@supabase/supabase-js";
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { readFile } from "fs/promises";
import nodePath from "path";
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

    // 4. Construction du PDF (A5 paysage, mise en page type diplôme)
    const PAGE_W = 595.28;
    const PAGE_H = 419.53;
    const MARGIN = 24;
    const LIGHT_BLUE = rgb(0.93, 0.94, 0.97);
    const GREY = rgb(0.42, 0.44, 0.5);
    const LIGHT_GREY = rgb(0.72, 0.73, 0.77);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const centerText = (text: string, y: number, size: number, font: typeof fontBold, color = BRAND_BLUE) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: (PAGE_W - w) / 2, y, size, font, color });
    };

    // Fond + double cadre décoratif
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(1, 1, 1) });
    page.drawRectangle({
      x: 10, y: 10, width: PAGE_W - 20, height: PAGE_H - 20,
      borderColor: BRAND_BLUE, borderWidth: 1.4,
    });
    page.drawRectangle({
      x: 16, y: 16, width: PAGE_W - 32, height: PAGE_H - 32,
      borderColor: BRAND_ORANGE, borderWidth: 0.7,
    });

    // Filigrane discret
    page.drawText("NEXA", {
      x: PAGE_W / 2 - 140, y: PAGE_H / 2 - 60, size: 100, font: fontSerif,
      color: rgb(0.96, 0.96, 0.98), rotate: degrees(18),
    });

    // En-tête : logo + nom de plateforme
    try {
      const logoPath = nodePath.join(process.cwd(), "public", "logo-nexa.jpeg");
      const logoBytes = await readFile(logoPath);
      const logoImage = await pdfDoc.embedJpg(logoBytes);
      const logoDim = logoImage.scale(34 / logoImage.height);
      page.drawImage(logoImage, { x: MARGIN + 16, y: PAGE_H - 62, width: logoDim.width, height: logoDim.height });
    } catch {
      // Logo optionnel — le certificat reste valide sans lui.
    }
    page.drawText("NEXA", { x: MARGIN + 56, y: PAGE_H - 52, size: 16, font: fontBold, color: BRAND_BLUE });
    page.drawText("NEXT × AFRICA", { x: MARGIN + 56, y: PAGE_H - 65, size: 6.5, font: fontRegular, color: GREY });

    // Titre
    centerText("CERTIFICAT DE RÉSULTAT", PAGE_H - 88, 20, fontSerif, BRAND_BLUE);
    page.drawLine({
      start: { x: PAGE_W / 2 - 90, y: PAGE_H - 98 }, end: { x: PAGE_W / 2 + 90, y: PAGE_H - 98 },
      thickness: 1.4, color: BRAND_ORANGE,
    });

    // Bloc apprenant
    centerText("Ce certificat est décerné à", PAGE_H - 130, 10, fontOblique, GREY);
    centerText(input.studentName.toUpperCase(), PAGE_H - 160, 24, fontSerif, BRAND_BLUE);
    centerText(`pour l'obtention des résultats suivants — ${input.disciplineLabel}`, PAGE_H - 180, 10.5, fontRegular, GREY);
    centerText(input.examLabel, PAGE_H - 196, 11, fontBold, BRAND_ORANGE);

    // Tableau des scores, centré
    const cols = input.sections.length || 1;
    const tableW = Math.min(440, cols * 100);
    const tableX = (PAGE_W - tableW) / 2;
    const colW = tableW / cols;
    const tableTop = PAGE_H - 222;
    page.drawRectangle({ x: tableX, y: tableTop - 44, width: tableW, height: 44, color: LIGHT_BLUE });
    input.sections.forEach((s, i) => {
      const cx = tableX + i * colW + colW / 2;
      const labelW = fontBold.widthOfTextAtSize(s.label, 8.5);
      page.drawText(s.label, { x: cx - labelW / 2, y: tableTop - 16, size: 8.5, font: fontBold, color: BRAND_BLUE });
      const scoreText = `${s.score}${s.niveau ? " · " + s.niveau : ""}`;
      const scoreW = fontRegular.widthOfTextAtSize(scoreText, 11);
      page.drawText(scoreText, { x: cx - scoreW / 2, y: tableTop - 34, size: 11, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      if (i > 0) {
        page.drawLine({
          start: { x: tableX + i * colW, y: tableTop - 44 }, end: { x: tableX + i * colW, y: tableTop },
          thickness: 0.6, color: rgb(1, 1, 1),
        });
      }
    });

    // Pied de page : date + signature à gauche, QR à droite
    const footerY = 58;
    page.drawLine({ start: { x: MARGIN + 16, y: footerY }, end: { x: MARGIN + 16 + 130, y: footerY }, thickness: 0.6, color: LIGHT_GREY });
    page.drawText("Signature autorisée", { x: MARGIN + 16, y: footerY - 12, size: 7.5, font: fontRegular, color: GREY });
    page.drawText(`Délivré le ${new Date().toLocaleDateString("fr-FR")}`, {
      x: MARGIN + 16, y: footerY + 8, size: 8.5, font: fontRegular, color: GREY,
    });

    const qrSize = 68;
    const qrImage = await pdfDoc.embedPng(qrBytes);
    page.drawImage(qrImage, { x: PAGE_W - MARGIN - 16 - qrSize, y: footerY - 12, width: qrSize, height: qrSize });
    const qrLabel = "Scannez pour vérifier l'authenticité";
    const qrLabelW = fontRegular.widthOfTextAtSize(qrLabel, 6.5);
    page.drawText(qrLabel, {
      x: PAGE_W - MARGIN - 16 - qrSize / 2 - qrLabelW / 2, y: footerY - 22, size: 6.5, font: fontRegular, color: GREY,
    });
    const codeW = fontRegular.widthOfTextAtSize(code, 7.5);
    page.drawText(code, {
      x: PAGE_W - MARGIN - 16 - qrSize / 2 - codeW / 2, y: footerY + qrSize - 8, size: 7.5, font: fontBold, color: BRAND_BLUE,
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