// app/utils/pdfExport.ts

type Task = 1 | 2 | 3;

export async function downloadTaskPDF({
  taskNum,
  sujet,
  travail,
  resultat,
}: {
  taskNum: Task;
  sujet: string;
  travail: string;
  resultat: any | null;
}) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const mL = 16;
  const mR = 16;
  const cW = W - mL - mR;
  let y = 0;

  // ── Palette ─────────────────────────────────────────────────────
  const C = {
    orange:    [234, 88,  12]  as [number, number, number],
    slate900:  [15,  23,  42]  as [number, number, number],
    slate700:  [51,  65,  85]  as [number, number, number],
    slate500:  [100, 116, 139] as [number, number, number],
    slate200:  [226, 232, 240] as [number, number, number],
    slate50:   [248, 250, 252] as [number, number, number],
    white:     [255, 255, 255] as [number, number, number],
    blue:      [37,  99,  235] as [number, number, number],
    emerald:   [5,   150, 105] as [number, number, number],
    amber:     [217, 119, 6]   as [number, number, number],
    red:       [220, 38,  38]  as [number, number, number],
    emeraldBg: [236, 253, 245] as [number, number, number],
    amberBg:   [255, 251, 235] as [number, number, number],
    redBg:     [254, 242, 242] as [number, number, number],
    blueBg:    [239, 246, 255] as [number, number, number],
  };

  // ── Helpers ──────────────────────────────────────────────────────
  const setFill = (c: [number, number, number]) => doc.setFillColor(...c);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(...c);
  const setTxt  = (c: [number, number, number]) => doc.setTextColor(...c);

  const pageBreak = (need: number) => {
    if (y + need > H - 14) { doc.addPage(); y = 22; drawPageBg(); }
  };

  const wrap = (text: string, x: number, maxW: number, lh: number): number => {
    const lines = doc.splitTextToSize(text || "", maxW);
    lines.forEach((line: string) => { pageBreak(lh); doc.text(line, x, y); y += lh; });
    return y;
  };

  // ── Arrière-plan de page (bande latérale décorative) ─────────────
  const drawPageBg = () => {
    setFill(C.slate50);
    doc.rect(0, 0, 6, H, "F");
    setFill(C.orange);
    doc.rect(0, 0, 6, 60, "F");
  };

  // ── En-tête ──────────────────────────────────────────────────────
  drawPageBg();

  setFill(C.orange);
  doc.rect(0, 0, W, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setTxt(C.white);
  doc.text("NEXA", mL + 2, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTxt([255, 200, 150]);
  doc.text("Simulateur Zen — Rapport de correction", mL + 2, 16.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setTxt(C.white);
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.text(`Tache 0${taskNum}`, W - mR, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt([255, 200, 150]);
  doc.text(dateStr, W - mR, 15.5, { align: "right" });

  y = 28;

  // ── Section header ───────────────────────────────────────────────
  const sectionHeader = (
    label: string,
    accent: [number, number, number],
    bg: [number, number, number]
  ) => {
    pageBreak(14);
    setFill(bg);
    doc.roundedRect(mL, y - 5, cW, 11, 2, 2, "F");
    setFill(accent);
    doc.roundedRect(mL, y - 5, 3, 11, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setTxt(accent);
    doc.text(label.toUpperCase(), mL + 7, y + 2.5);
    y += 10;
  };

  // ── Séparateur ───────────────────────────────────────────────────
  const divider = (gap = 4) => {
    y += gap;
    setDraw(C.slate200);
    doc.setLineWidth(0.2);
    doc.line(mL, y, W - mR, y);
    y += gap;
  };

  // ── SECTION 1 — SUJET ────────────────────────────────────────────
  sectionHeader("Sujet de la tache", C.orange, [255, 247, 237]);
  y += 3;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  setTxt(C.slate700);
  wrap(sujet, mL + 4, cW - 12, 5.8);
  y += 4;

  divider();

  // ── SECTION 2 — REDACTION ────────────────────────────────────────
  sectionHeader("Votre redaction", C.blue, C.blueBg);
  y += 3;

  if (travail.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTxt(C.slate700);
    wrap(travail.trim(), mL + 4, cW - 12, 5.8);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setTxt(C.slate500);
    doc.text("(Aucune redaction saisie pour cette tache)", mL + 4, y);
    y += 6;
  }
  y += 6;

  // ── SECTION 3 — CORRECTION IA ────────────────────────────────────
  if (resultat) {
    divider();
    sectionHeader("Correction NEXA Coach", C.emerald, C.emeraldBg);
    y += 4;

    // Score Card
    pageBreak(28);
    setFill(C.slate900);
    doc.roundedRect(mL, y, cW, 24, 3, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    setTxt(C.white);
    doc.text(`${resultat.note}`, mL + 10, y + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTxt(C.slate500);
    doc.text("/ 20", mL + 24, y + 15);

    setDraw([60, 80, 100]);
    doc.setLineWidth(0.3);
    doc.line(mL + 52, y + 4, mL + 52, y + 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(C.slate500);
    doc.text("NIVEAU ESTIME", mL + 57, y + 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setTxt(C.orange);
    doc.text(resultat.niveau, mL + 57, y + 18);

    const scoreLabel =
      parseFloat(resultat.note) >= 16 ? "Excellent"
      : parseFloat(resultat.note) >= 12 ? "Satisfaisant"
      : "A ameliorer";
    const badgeColor =
      parseFloat(resultat.note) >= 16 ? C.emerald
      : parseFloat(resultat.note) >= 12 ? C.blue
      : C.amber;
    setFill(badgeColor);
    doc.roundedRect(W - mR - 32, y + 5, 30, 10, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(C.white);
    doc.text(scoreLabel, W - mR - 17, y + 11.5, { align: "center" });

    y += 30;

    // Avis examinateur
    pageBreak(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(C.slate500);
    doc.text("AVIS DE L'EXAMINATEUR", mL, y);
    y += 5;

    setFill(C.slate50);
    setDraw(C.slate200);
    doc.setLineWidth(0.3);
    const commentLines = doc.splitTextToSize(resultat.commentaire_global, cW - 16);
    const commentH = commentLines.length * 5.5 + 13; // 5 top + 8 bottom padding
    pageBreak(commentH);
    doc.roundedRect(mL, y, cW, commentH, 2, 2, "FD");
    setFill(C.emerald);
    doc.rect(mL, y, 2.5, commentH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTxt(C.slate700);
    y += 5;
    commentLines.forEach((line: string) => { doc.text(line, mL + 6, y); y += 5.5; });
    y += 8;

    // Axes d'amélioration
    if (resultat.erreurs && resultat.erreurs.length > 0) {
      pageBreak(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setTxt(C.amber);
      doc.text("AXES D'AMELIORATION", mL, y);
      y += 5;

      resultat.erreurs.forEach((err: any) => {
        if (typeof err === "string") {
          const lines = doc.splitTextToSize(err, cW - 14);
          const blockH = lines.length * 5.2 + 8;
          pageBreak(blockH + 4);
          setFill(C.amberBg);
          setDraw([253, 230, 138]);
          doc.setLineWidth(0.2);
          doc.roundedRect(mL, y, cW, blockH, 2, 2, "FD");
          setFill(C.amber);
          doc.rect(mL, y, 2.5, blockH, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          setTxt(C.slate700);
          y += 5;
          lines.forEach((line: string) => { doc.text(line, mL + 6, y); y += 5.2; });
          y += 6;
        } else {
          const fauteLines = doc.splitTextToSize(err.faute ?? "", cW - 14);
          const corrLines  = doc.splitTextToSize(err.correction ?? "", cW - 14);
          const explLines  = err.explication
            ? doc.splitTextToSize(err.explication, cW - 16)
            : [];
          const blockH =
            (fauteLines.length + corrLines.length) * 5.2 +
            (explLines.length > 0 ? explLines.length * 4.8 + 4 : 0) +
            16;
          pageBreak(blockH + 4);

          setFill([249, 250, 251]);
          setDraw(C.slate200);
          doc.setLineWidth(0.2);
          doc.roundedRect(mL, y, cW, blockH, 2, 2, "FD");

          y += 6;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          setTxt(C.red);
          doc.text("FAUTE", mL + 5, y);
          y += 4.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          setTxt([180, 50, 50]);
          fauteLines.forEach((line: string) => { doc.text(line, mL + 5, y); y += 5.2; });
          y += 2;

          setDraw(C.slate200);
          doc.setLineWidth(0.1);
          doc.line(mL + 5, y, W - mR - 5, y);
          y += 3;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          setTxt(C.emerald);
          doc.text("CORRECTION", mL + 5, y);
          y += 4.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          setTxt([5, 120, 80]);
          corrLines.forEach((line: string) => { doc.text(line, mL + 5, y); y += 5.2; });

          if (explLines.length > 0) {
            y += 3;
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8.5);
            setTxt(C.slate500);
            explLines.forEach((line: string) => { doc.text(line, mL + 7, y); y += 4.8; });
          }
          y += 7;
        }
      });
    }

    // Conseil du coach
    y += 2;
    const conseilLines = doc.splitTextToSize(resultat.conseil_coach, cW - 22);
    const conseilH = conseilLines.length * 5.5 + 26;
    pageBreak(conseilH + 2); // vérifier la vraie hauteur avant de dessiner
    setFill(C.slate900);
    doc.roundedRect(mL, y, cW, conseilH, 3, 3, "F");

    setFill(C.orange);
    doc.roundedRect(mL, y, cW, 1.5, 0, 0, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTxt(C.orange);
    doc.text("CONSEIL POUR LE JOUR J", mL + 6, y + 10);

    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTxt([203, 213, 225]);
    conseilLines.forEach((line: string) => { doc.text(line, mL + 6, y); y += 5.5; });
    y += 8;

  } else {
    divider();
    pageBreak(18);
    setFill(C.slate50);
    setDraw(C.slate200);
    doc.setLineWidth(0.3);
    doc.roundedRect(mL, y, cW, 14, 2, 2, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setTxt(C.slate500);
    doc.text(
      "Correction IA non disponible — soumettez votre redaction pour obtenir une analyse.",
      mL + 5,
      y + 8.5
    );
    y += 18;
  }

  // ── Pied de page sur toutes les pages ────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setDraw(C.slate200);
    doc.setLineWidth(0.2);
    doc.line(mL, H - 10, W - mR, H - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setTxt(C.slate500);
    doc.text("NEXA  •  Simulateur Zen", mL, H - 5.5);
    doc.text(`Tache 0${taskNum}  |  Page ${p} / ${totalPages}`, W - mR, H - 5.5, { align: "right" });
    setFill(C.orange);
    doc.circle(W / 2, H - 5.5, 0.8, "F");
  }

  doc.save(`NEXA_Tache0${taskNum}_${new Date().toISOString().slice(0, 10)}.pdf`);
}