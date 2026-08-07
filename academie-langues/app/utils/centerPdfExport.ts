import type { DocumentExportConfig } from "@/app/utils/documentConfig";
import { hexToRgb } from "@/app/utils/documentConfig";
import { amountInWordsFr } from "@/app/utils/amountInWordsFr";
import { amountInWordsEn } from "@/app/utils/amountInWordsEn";
import { localizeInstallmentLabel, localizePaymentMethod } from "@/app/utils/financeI18n";

const BLUE_RGB: [number, number, number] = [17, 34, 78];
const ORANGE_RGB: [number, number, number] = [235, 103, 14];

const PACK_LABELS: Record<string, string> = {
  ivoire: "Pack Ivoire",
  raphia: "Pack Raphia",
  ebene: "Pack Ébène",
  cauris: "Pack Cauris",
  acceleree: "Formation Accélérée",
  complete: "Formation Complète",
};

function fmtFCFA(n: number) {
  const v = Math.round(Number(n) || 0);
  const neg = v < 0;
  const abs = Math.abs(v).toString();
  const grouped = abs.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return neg ? `-${grouped}` : grouped;
}

function fmtDate(iso: string | null, locale = "fr") {
  return iso
    ? new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
}

function fmtDateTime(iso: string, locale = "fr") {
  return new Date(iso).toLocaleString(locale === "en" ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveConfig(config?: Partial<DocumentExportConfig>): DocumentExportConfig {
  const accentRgb = config?.accentRgb || (config?.accentColor ? hexToRgb(config.accentColor) : ORANGE_RGB);
  return {
    title: config?.title || "Document officiel",
    accentColor: config?.accentColor || "#eb670e",
    accentRgb,
    blueRgb: config?.blueRgb || BLUE_RGB,
    showLogo: config?.showLogo ?? true,
    showRccm: config?.showRccm ?? true,
    showNiu: config?.showNiu ?? true,
    showAddress: config?.showAddress ?? true,
    showPhone: config?.showPhone ?? true,
    footerText: config?.footerText ?? null,
    signatureIds: config?.signatureIds || [],
    legalName: config?.legalName ?? null,
    logoUrl: config?.logoUrl ?? null,
    rccmNumber: config?.rccmNumber ?? null,
    niuNumber: config?.niuNumber ?? null,
    address: config?.address ?? null,
    phone: config?.phone ?? null,
  };
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    return await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function addPdfLogo(doc: any, logoUrl: string | null, x: number, y: number, size = 14) {
  if (!logoUrl) return;
  const dataUrl = await loadImageDataUrl(logoUrl);
  if (!dataUrl) return;
  const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
  doc.addImage(dataUrl, format, x, y, size, size);
}

async function createDoc(subtitle: string, config?: Partial<DocumentExportConfig>, locale = "fr") {
  const cfg = resolveConfig(config);
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // En-tête type fiche d'inscription : logo + raison sociale + titre | mentions
  let headerX = 14;
  if (cfg.showLogo && cfg.logoUrl) {
    await addPdfLogo(doc, cfg.logoUrl, 14, 12, 14);
    headerX = 32;
  }

  doc.setTextColor(...cfg.blueRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(cfg.legalName || "Centre", headerX, 18);

  doc.setTextColor(...cfg.accentRgb);
  doc.setFontSize(9);
  doc.text((cfg.title || subtitle).toUpperCase(), headerX, 24);

  const metaLines: string[] = [];
  if (cfg.showAddress && cfg.address) metaLines.push(cfg.address);
  if (cfg.showPhone && cfg.phone) metaLines.push(`${locale === "en" ? "Phone" : "Tél"} : ${cfg.phone}`);
  if (cfg.showRccm && cfg.rccmNumber) metaLines.push(`RCCM : ${cfg.rccmNumber}`);
  if (cfg.showNiu && cfg.niuNumber) metaLines.push(`NIU : ${cfg.niuNumber}`);
  metaLines.push(`${locale === "en" ? "Generated on" : "Généré le"} ${new Date().toLocaleString(locale === "en" ? "en-US" : "fr-FR")}`);

  let metaY = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  for (const line of metaLines) {
    doc.text(line, pageWidth - 14, metaY, { align: "right" });
    metaY += 4;
  }

  // Trait de séparation (accent)
  const ruleY = Math.max(30, metaY + 2);
  doc.setDrawColor(...cfg.accentRgb);
  doc.setLineWidth(0.6);
  doc.line(14, ruleY, pageWidth - 14, ruleY);

  // Sous-titre métier sous l'en-tête (ex. Journal…, Relevé…)
  if (cfg.title && cfg.title !== subtitle) {
    doc.setTextColor(...cfg.blueRgb);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(subtitle, 14, ruleY + 8);
    return { doc, autoTable, startY: ruleY + 14, cfg };
  }

  return { doc, autoTable, startY: ruleY + 8, cfg };
}

function addPdfFooter(doc: any, cfg: DocumentExportConfig) {
  if (!cfg.footerText) return;
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(cfg.footerText, 14, pageHeight - 10, { maxWidth: 180 });
}

type JournalPayment = {
  payment_date: string;
  receipt_number: string | null;
  student_name: string;
  filiere_name: string;
  payment_method: string;
  amount: number;
};

export async function downloadJournalPdf(
  payments: JournalPayment[],
  dateFrom: string,
  dateTo: string,
  config?: Partial<DocumentExportConfig>,
  locale = "fr",
) {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const isEn = locale === "en";
  const { doc, autoTable, startY, cfg } = await createDoc(isEn ? "Collection journal" : "Journal des encaissements", config, locale);

  doc.setFontSize(10);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(`${isEn ? "Period" : "Période"} : ${dateFrom || "—"} → ${dateTo || "—"}`, 14, startY);
  doc.setFont("helvetica", "bold");
  doc.text(`Total : ${fmtFCFA(total)} FCFA`, 14, startY + 6);

  autoTable(doc, {
    startY: startY + 12,
    head: [["Date", isEn ? "Receipt no." : "N° Reçu", isEn ? "Learner" : "Apprenant", isEn ? "Program" : "Programme", isEn ? "Method" : "Mode", isEn ? "Amount" : "Montant"]],
    body: payments.map((p) => [
      fmtDateTime(p.payment_date, locale),
      p.receipt_number || "—",
      p.student_name,
      p.filiere_name,
      localizePaymentMethod(p.payment_method, locale),
      `${fmtFCFA(p.amount)} F`,
    ]),
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: cfg.blueRgb, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 32 },
      5: { halign: "right", cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  addPdfFooter(doc, cfg);
  doc.save(`journal_${dateFrom || "all"}_${dateTo || "all"}.pdf`);
}

type InstallmentRow = {
  label: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
};

type StatementPayment = {
  payment_date: string;
  receipt_number: string | null;
  payment_method: string;
  amount: number;
  recorded_by_name?: string | null;
};

export type StatementPdfParams = {
  studentName: string;
  filiereName: string;
  resteAPayer: number;
  installments: InstallmentRow[];
  payments: StatementPayment[];
  config?: Partial<DocumentExportConfig>;
  signatures?: { id: string; label: string; signatureUrl?: string | null }[];
  stampUrl?: string | null;
  locale?: "fr" | "en";
};

async function addPdfSignatures(
  doc: any,
  cfg: DocumentExportConfig,
  signatures?: { id: string; label: string; signatureUrl?: string | null }[],
  stampUrl?: string | null
) {
  if ((!signatures || signatures.length === 0) && !stampUrl) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const baseY = pageHeight - 30;
  const colWidth = 55;

  if (stampUrl) {
    const stampData = await loadImageDataUrl(stampUrl);
    if (stampData) {
      const format = stampData.includes("image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(stampData, format, 16, baseY - 22, 26, 26);
      } catch {
        /* cachet optionnel */
      }
    }
  }

  const list = (signatures || []).slice(0, 3);
  let x = pageWidth - 14 - colWidth * Math.min(list.length, 2);

  for (const s of list) {
    if (s.signatureUrl) {
      const sigData = await loadImageDataUrl(s.signatureUrl);
      if (sigData) {
        const format = sigData.includes("image/png") ? "PNG" : "JPEG";
        try {
          doc.addImage(sigData, format, x, baseY - 14, colWidth - 10, 12);
        } catch {
          /* signature optionnelle */
        }
      }
    }
    doc.setDrawColor(180, 180, 180);
    doc.line(x, baseY, x + colWidth - 6, baseY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...cfg.blueRgb);
    doc.text(s.label, x, baseY + 4, { maxWidth: colWidth - 6 });
    x += colWidth;
  }
}

/** Construit le relevé PDF sans le télécharger (pour partage natif). */
export async function buildStatementPdf(params: StatementPdfParams): Promise<{ blob: Blob; filename: string }> {
  const locale = params.locale || "fr";
  const isEn = locale === "en";
  const docTitle = params.config?.title?.trim() || (isEn ? "Account statement" : "Relevé de compte");
  const { doc, autoTable, startY, cfg } = await createDoc(docTitle, params.config, locale);

  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(params.studentName, 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(params.filiereName, 14, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(params.resteAPayer > 0 ? 220 : 5, params.resteAPayer > 0 ? 38 : 150, params.resteAPayer > 0 ? 38 : 105);
  doc.text(
    params.resteAPayer > 0 ? `${isEn ? "Remaining balance" : "Solde restant"} : ${fmtFCFA(params.resteAPayer)} FCFA` : (isEn ? "Account settled" : "Compte soldé"),
    14,
    y
  );

  if (params.resteAPayer > 0) {
    const pageWidth = doc.internal.pageSize.getWidth();
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const words = doc.splitTextToSize(
      isEn
        ? `In words: ${amountInWordsEn(params.resteAPayer)}`
        : `En lettres : ${amountInWordsFr(params.resteAPayer)}`,
      pageWidth - 28
    );
    doc.text(words, 14, y);
    y += words.length * 4;
    doc.setFont("helvetica", "normal");
  }

  if (params.installments.length > 0) {
    autoTable(doc, {
      startY: y + 8,
      head: [[isEn ? "Installment" : "Échéance", "Date", isEn ? "Due" : "Dû", isEn ? "Paid" : "Payé", isEn ? "Status" : "Statut"]],
      body: params.installments.map((inst) => [
        localizeInstallmentLabel(inst.label, locale),
        fmtDate(inst.due_date, locale),
        `${fmtFCFA(inst.amount)} F`,
        `${fmtFCFA(inst.paid_amount)} F`,
        inst.status === "paid" ? (isEn ? "Settled" : "Soldé") : inst.status === "late" ? (isEn ? "Overdue" : "Retard") : inst.status === "partial" ? (isEn ? "Partial" : "Partiel") : (isEn ? "Pending" : "En attente"),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    y += 10;
  }

  const totalPaid = params.payments.reduce((s, p) => s + p.amount, 0);
  const showAgent = params.payments.some((p) => p.recorded_by_name);
  autoTable(doc, {
    startY: y,
    head: showAgent
      ? [["Date", isEn ? "Receipt no." : "N° Reçu", isEn ? "Method" : "Mode", isEn ? "By" : "Par", isEn ? "Amount" : "Montant"]]
      : [["Date", isEn ? "Receipt no." : "N° Reçu", isEn ? "Method" : "Mode", isEn ? "Amount" : "Montant"]],
    body: [
      ...params.payments.map((p) => showAgent
        ? [
            fmtDate(p.payment_date, locale),
            p.receipt_number || "—",
            localizePaymentMethod(p.payment_method, locale),
            p.recorded_by_name || "—",
            `+${fmtFCFA(p.amount)} F`,
          ]
        : [
            fmtDate(p.payment_date, locale),
            p.receipt_number || "—",
            localizePaymentMethod(p.payment_method, locale),
            `+${fmtFCFA(p.amount)} F`,
          ]),
      ...(showAgent
        ? [["", "", isEn ? "Total paid" : "Total versé", "", `${fmtFCFA(totalPaid)} F`], ["", "", isEn ? "Remaining balance" : "Solde restant", "", `${fmtFCFA(params.resteAPayer)} F`]]
        : [["", "", isEn ? "Total paid" : "Total versé", `${fmtFCFA(totalPaid)} F`], ["", "", isEn ? "Remaining balance" : "Solde restant", `${fmtFCFA(params.resteAPayer)} F`]]),
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
    columnStyles: showAgent
      ? { 4: { halign: "right" } }
      : { 3: { halign: "right" } },
  });

  await addPdfSignatures(doc, cfg, params.signatures, params.stampUrl);
  addPdfFooter(doc, cfg);
  const safeName = params.studentName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || (isEn ? "learner" : "apprenant");
  const filename = `${isEn ? "statement" : "releve"}_${safeName}.pdf`;
  const blob = doc.output("blob") as Blob;
  return { blob, filename };
}

export async function downloadStatementPdf(params: StatementPdfParams) {
  const { blob, filename } = await buildStatementPdf(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Partage le PDF via la feuille système (WhatsApp, etc.). Retourne false si non supporté / annulé. */
export async function shareStatementPdf(params: StatementPdfParams): Promise<"shared" | "unsupported" | "aborted" | "error"> {
  try {
    const { blob, filename } = await buildStatementPdf(params);
    const file = new File([blob], filename, { type: "application/pdf" });

    const canShareFiles =
      typeof navigator !== "undefined"
      && typeof navigator.share === "function"
      && (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

    if (!canShareFiles) return "unsupported";

    await navigator.share({
      title: params.locale === "en" ? "Account statement" : "Relevé de compte",
      text: `${params.locale === "en" ? "Account statement: " : "Relevé de compte — "}${params.studentName}`,
      files: [file],
    });
    return "shared";
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return "aborted";
    console.warn("[shareStatementPdf]", err);
    return "error";
  }
}

export type TcfDossierStudent = {
  prenom: string;
  nom: string;
  email: string;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  birth_date: string | null;
  created_at: string;
  enrolled_at: string | null;
  subscription_ends_at: string | null;
  pack_name: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  duration_months: number | null;
  tuition_fee: number | null;
  catalog_tuition_fee: number | null;
  price_note: string | null;
  tuition_paid: number | null;
  financial_status: string | null;
  ee_total: number;
  ee_used: number;
  eo_total: number;
  eo_used: number;
  exam_total: number;
  exam_used: number;
};

function formatDuration(s: TcfDossierStudent): string {
  if (s.duration_value && s.duration_unit && ["day", "week", "month"].includes(s.duration_unit)) {
    const v = s.duration_value;
    const u = s.duration_unit;
    if (u === "day") return v === 1 ? "1 jour" : `${v} jours`;
    if (u === "week") return v === 1 ? "1 semaine" : `${v} semaines`;
    return v === 1 ? "1 mois" : `${v} mois`;
  }
  if (s.duration_months) return `${s.duration_months} mois`;
  return "—";
}

function packDisplayName(pack: string | null) {
  const key = (pack || "ivoire").toLowerCase();
  return PACK_LABELS[key] || `Pack ${pack || "Ivoire"}`;
}

function creditLabel(total: number, used: number) {
  const remaining = total - used;
  if (total >= 9999) return "Illimité";
  return `${remaining} / ${total}`;
}

export async function downloadTcfDossierPdf(
  student: TcfDossierStudent,
  options?: { statusLabel?: string; config?: Partial<DocumentExportConfig> }
) {
  const hasOffer = Boolean(student.enrolled_at);
  const reste = Math.max(0, (student.tuition_fee || 0) - (student.tuition_paid || 0));
  const packName = packDisplayName(student.pack_name);
  const { doc, autoTable, startY, cfg } = await createDoc(
    `Dossier — ${student.prenom} ${student.nom}`,
    options?.config
  );

  let y = startY;
  if (options?.statusLabel) {
    doc.setFontSize(9);
    doc.setTextColor(...cfg.accentRgb);
    doc.text(options.statusLabel, 14, y);
    y += 6;
  }

  const writeSection = (title: string, rows: [string, string][]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...cfg.accentRgb);
    doc.text(title, 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      body: rows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [120, 120, 120], cellWidth: 45 },
        1: { textColor: cfg.blueRgb, cellWidth: "auto" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  };

  writeSection("Inscription", [
    ["Email", student.email],
    ["Téléphone", student.phone || "—"],
    ["Localisation", [student.city, student.region, student.country].filter(Boolean).join(" · ") || "—"],
    ["Date de naissance", student.birth_date ? fmtDate(student.birth_date) : "—"],
    ["Inscrit le", fmtDate(student.created_at)],
  ]);

  if (hasOffer) {
    writeSection("Offre activée", [
      ["Pack", packName],
      ["Durée", formatDuration(student)],
      ["Validé le", fmtDate(student.enrolled_at)],
      ["Accès jusqu'au", fmtDate(student.subscription_ends_at)],
      ["Tarif convenu", student.tuition_fee != null ? `${fmtFCFA(student.tuition_fee)} FCFA` : "—"],
      ...(student.catalog_tuition_fee != null
        ? [["Tarif catalogue", `${fmtFCFA(student.catalog_tuition_fee)} FCFA`] as [string, string]]
        : []),
      ...(student.price_note ? [["Note tarif", student.price_note] as [string, string]] : []),
    ]);

    writeSection("Crédits d'entraînement", [
      ["Expression écrite (EE)", creditLabel(student.ee_total, student.ee_used)],
      ["Expression orale (EO)", creditLabel(student.eo_total, student.eo_used)],
      ["Examens blancs EE", creditLabel(student.exam_total, student.exam_used)],
    ]);

    const financeStatus: Record<string, string> = {
      pending: "À encaisser",
      current: "En cours",
      paid: "Soldé",
      late: "En retard",
      exempt: "Exonéré",
    };

    writeSection("Finance", [
      ["Payé", `${fmtFCFA(student.tuition_paid || 0)} FCFA`],
      ["Reste à payer", `${fmtFCFA(reste)} FCFA`],
      ["Statut", financeStatus[student.financial_status || ""] || student.financial_status || "—"],
    ]);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Félicitations ! Votre ${packName} a été activé avec succès. Vos crédits d'entraînement et votre accès Premium sont disponibles jusqu'au ${fmtDate(student.subscription_ends_at)}. Bon entraînement !`,
      14,
      y,
      { maxWidth: 180 }
    );
  } else {
    doc.setFontSize(9);
    doc.setTextColor(180, 120, 0);
    doc.text("Dossier en attente de validation par le centre.", 14, y);
  }

  addPdfFooter(doc, cfg);
  const safeName = `${student.prenom}_${student.nom}`.replace(/[^\w\-]+/g, "_");
  doc.save(`dossier_tcf_${safeName}.pdf`);
}

export type ProgrammePdfFee = { label: string; montant: number };
export type ProgrammePdfInstallment = { montant: number; jours: number };
export type ProgrammePdfMatiere = {
  name: string;
  niveaux: string;
  formateurs: string;
};
export type ProgrammePdfNiveau = {
  label: string;
  tuition: number;
  fees: ProgrammePdfFee[];
  total: number;
  totalWords: string;
  installments: ProgrammePdfInstallment[];
  classes: string[];
};

export type ProgrammePdfData = {
  name: string;
  description: string;
  typeLabel: string;
  modeLabel: string;
  structureLabel: string;
  programId?: string | null;
  campuses: string[];
  directeur: string;
  /** Formation courte: global pricing; cursus: reference only */
  globalTuition: number;
  globalFees: ProgrammePdfFee[];
  globalTotal: number;
  globalTotalWords: string;
  globalInstallments: ProgrammePdfInstallment[];
  niveaux: ProgrammePdfNiveau[];
  matieres: ProgrammePdfMatiere[];
  isCursus: boolean;
};

export async function downloadProgrammePdf(
  data: ProgrammePdfData,
  config?: Partial<DocumentExportConfig>,
  locale: "fr" | "en" = "fr",
) {
  const en = locale === "en";
  const { doc, autoTable, startY, cfg } = await createDoc(en ? "Program sheet" : "Fiche programme", config);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = startY;

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - 18) {
      addPdfFooter(doc, cfg);
      doc.addPage();
      y = 20;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(...cfg.blueRgb);
    doc.rect(14, y, pageWidth - 28, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, 16, y + 4.8);
    y += 11;
  };

  const kv = (label: string, value: string) => {
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...cfg.blueRgb);
    const lines = doc.splitTextToSize(value || "—", pageWidth - 70);
    doc.text(lines, 55, y);
    y += Math.max(6, lines.length * 4.5);
  };

  // Identité
  sectionTitle(en ? "1. General information" : "1. Informations générales");
  kv(en ? "Name" : "Nom", data.name);
  if (data.programId) kv(en ? "Program ID" : "ID programme", data.programId);
  kv("Type", data.typeLabel);
  kv("Structure", data.structureLabel);
  kv("Mode", data.modeLabel);
  if (data.description) {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Description", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const descLines = doc.splitTextToSize(data.description, pageWidth - 28);
    ensureSpace(descLines.length * 4.5 + 4);
    doc.text(descLines, 14, y);
    y += descLines.length * 4.5 + 4;
  }

  sectionTitle(en ? "2. Campus and management" : "2. Campus et direction");
  kv("Campus", data.campuses.length ? data.campuses.join(", ") : "—");
  kv(en ? "Director" : "Directeur", data.directeur || (en ? "Not assigned" : "Non assigné"));

  sectionTitle(en ? "3. Pricing" : "3. Tarification");
  if (data.isCursus) {
    kv(en ? "Reference price (indicative)" : "Prix de référence (indicatif)", `${fmtFCFA(data.globalTuition)} FCFA`);
    for (const niv of data.niveaux) {
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...cfg.accentRgb);
      doc.text(niv.label, 14, y);
      y += 6;
      kv(en ? "Training price" : "Prix formation", `${fmtFCFA(niv.tuition)} FCFA`);
      if (niv.fees.length) {
        autoTable(doc, {
          startY: y,
          head: [[en ? "Fees" : "Frais", en ? "Amount" : "Montant"]],
          body: niv.fees.map((f) => [f.label, `${fmtFCFA(f.montant)} FCFA`]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
          margin: { left: 14, right: 14 },
          columnStyles: { 1: { halign: "right" } },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...cfg.blueRgb);
      doc.text(`Total ${niv.label} : ${fmtFCFA(niv.total)} FCFA`, 14, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 70);
      const words = doc.splitTextToSize(
        en ? `In words: ${amountInWordsEn(niv.total)}` : `En lettres : ${niv.totalWords}`,
        pageWidth - 28,
      );
      doc.text(words, 14, y);
      y += words.length * 4 + 2;
      if (niv.installments.length) {
        autoTable(doc, {
          startY: y,
          head: [[en ? "Installment" : "Échéance", en ? "Amount" : "Montant", en ? "Days" : "Jours"]],
          body: niv.installments.map((inst, i) => [
            `${en ? "Installment" : "Échéance"} ${i + 1}`,
            `${fmtFCFA(inst.montant)} FCFA`,
            `${en ? "D" : "J"} + ${inst.jours}`,
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      } else {
        y += 4;
      }
    }
  } else {
    kv(en ? "Training price" : "Prix formation", `${fmtFCFA(data.globalTuition)} FCFA`);
    if (data.globalFees.length) {
      autoTable(doc, {
        startY: y,
        head: [[en ? "Additional fees" : "Frais supplémentaires", en ? "Amount" : "Montant"]],
        body: data.globalFees.map((f) => [f.label, `${fmtFCFA(f.montant)} FCFA`]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
        margin: { left: 14, right: 14 },
        columnStyles: { 1: { halign: "right" } },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...cfg.blueRgb);
    doc.text(`${en ? "Total due" : "Total à payer"} : ${fmtFCFA(data.globalTotal)} FCFA`, 14, y);
    y += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const gWords = doc.splitTextToSize(
      en ? `In words: ${amountInWordsEn(data.globalTotal)}` : `En lettres : ${data.globalTotalWords}`,
      pageWidth - 28,
    );
    doc.text(gWords, 14, y);
    y += gWords.length * 4.5 + 4;
    if (data.globalInstallments.length) {
      autoTable(doc, {
        startY: y,
        head: [[en ? "Installment" : "Échéance", en ? "Amount" : "Montant", en ? "Days" : "Jours"]],
        body: data.globalInstallments.map((inst, i) => [
          `${en ? "Installment" : "Échéance"} ${i + 1}`,
          `${fmtFCFA(inst.montant)} FCFA`,
          `${en ? "D" : "J"} + ${inst.jours}`,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  sectionTitle(en ? "4. Classrooms" : "4. Salles de classe");
  if (data.isCursus) {
    for (const niv of data.niveaux) {
      ensureSpace(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...cfg.blueRgb);
      doc.text(niv.label, 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const rooms = niv.classes.length ? niv.classes.join(" · ") : (en ? "No classrooms" : "Aucune salle");
      const roomLines = doc.splitTextToSize(rooms, pageWidth - 28);
      doc.text(roomLines, 14, y);
      y += roomLines.length * 4.5 + 4;
    }
  } else {
    const rooms = data.niveaux[0]?.classes || [];
    kv(en ? "Classrooms" : "Salles", rooms.length ? rooms.join(" · ") : (en ? "No classrooms" : "Aucune salle"));
  }

  sectionTitle(en ? "5. Subjects and trainers" : "5. Matières et formateurs");
  if (data.matieres.length === 0) {
    kv(en ? "Subjects" : "Matières", en ? "No subjects provided" : "Aucune matière renseignée");
  } else {
    autoTable(doc, {
      startY: y,
      head: [[en ? "Subject" : "Matière", en ? "Levels" : "Niveaux", en ? "Trainers" : "Formateurs"]],
      body: data.matieres.map((m) => [m.name, m.niveaux || "—", m.formateurs || (en ? "Optional / not assigned" : "Optionnel / non assigné")]),
      styles: { fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: cfg.blueRgb, textColor: 255, fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  ensureSpace(16);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    en ? "Document generated by Nexa Academy." : "Document généré depuis Nexa Academy. Les montants en lettres sont indicatifs et correspondent au total affiché.",
    14,
    y,
    { maxWidth: pageWidth - 28 }
  );

  addPdfFooter(doc, cfg);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: "right" });
  }

  const safe = data.name.replace(/[^\w\-]+/g, "_").slice(0, 40);
  doc.save(`programme_${safe}.pdf`);
}

export type PayslipPdfParams = {
  locale?: "fr" | "en";
  staffName: string;
  jobTitle?: string | null;
  periodYm: string;
  periodLabel: string;
  statusLabel: string;
  base: number;
  primes: number;
  retenues: number;
  brut: number;
  net: number;
  paid: number;
  reste: number;
  lines: { type: string; amount: number; reason: string; created_at: string }[];
  payments: { amount: number; payment_method: string; payment_date: string; notes?: string | null }[];
  config?: Partial<DocumentExportConfig>;
};

export async function downloadPayslipPdf(params: PayslipPdfParams) {
  const isEn = params.locale === "en";
  const payslipTitle = isEn ? "Payslip" : "Bulletin de paie";
  const { doc, autoTable, startY, cfg } = await createDoc(payslipTitle, {
    ...params.config,
    title: params.config?.title || payslipTitle,
  });

  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(params.staffName, 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (params.jobTitle) {
    doc.text(params.jobTitle, 14, y);
    y += 5;
  }
  doc.text(`${isEn ? "Period" : "Période"} : ${params.periodLabel} (${params.periodYm})`, 14, y);
  y += 5;
  doc.text(`${isEn ? "Status" : "Statut"} : ${params.statusLabel}`, 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [[isEn ? "Description" : "Libellé", isEn ? "Amount" : "Montant"]],
    body: [
      [isEn ? "Base salary" : "Salaire de base", `${fmtFCFA(params.base)} XAF`],
      [isEn ? "Bonuses / adjustments" : "Primes / ajustements", `+${fmtFCFA(params.primes)} XAF`],
      [isEn ? "Deductions" : "Retenues", `−${fmtFCFA(params.retenues)} XAF`],
      [isEn ? "Gross pay" : "Brut", `${fmtFCFA(params.brut)} XAF`],
      [isEn ? "Net payable" : "Net à payer", `${fmtFCFA(params.net)} XAF`],
      [isEn ? "Paid" : "Versé", `${fmtFCFA(params.paid)} XAF`],
      [isEn ? "Balance" : "Reste", `${fmtFCFA(params.reste)} XAF`],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (params.lines.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Type", isEn ? "Reason" : "Motif", "Date", isEn ? "Amount" : "Montant"]],
      body: params.lines.map((l) => [
        l.type === "prime" ? (isEn ? "Bonus" : "Prime") : l.type === "retenue" ? (isEn ? "Deduction" : "Retenue") : (isEn ? "Adjustment" : "Ajustement"),
        l.reason,
        fmtDate(l.created_at, isEn ? "en" : "fr"),
        `${l.type === "retenue" ? "−" : "+"}${fmtFCFA(l.amount)} XAF`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
      columnStyles: { 3: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (params.payments.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Date", isEn ? "Method" : "Mode", "Note", isEn ? "Amount" : "Montant"]],
      body: params.payments.map((p) => [
        fmtDate(p.payment_date, isEn ? "en" : "fr"),
        p.payment_method,
        p.notes || "—",
        `+${fmtFCFA(p.amount)} XAF`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: cfg.blueRgb, textColor: 255 },
      columnStyles: { 3: { halign: "right" } },
    });
  }

  addPdfFooter(doc, cfg);
  const safe = params.staffName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || (isEn ? "staff_member" : "collaborateur");
  doc.save(`${isEn ? "payslip" : "bulletin_paie"}_${safe}_${params.periodYm}.pdf`);
}

// ── Bulletin / relevé de notes (modèle Paramètres → Documents) ───────────────

export type BulletinNotesPdfParams = {
  locale?: "fr" | "en";
  studentName: string;
  enrollmentLabel: string;
  niveauLabel?: string | null;
  classeLabel?: string | null;
  moyenneGenerale: string;
  /** En-têtes colonnes après « Matière » (périodes / moy. groupes / Moy. gén.) */
  columnHeaders: string[];
  rows: {
    matiereName: string;
    coeffLabel: string;
    cells: string[];
  }[];
  config?: Partial<DocumentExportConfig>;
  signatures?: { id: string; label: string; signatureUrl?: string | null }[];
  stampUrl?: string | null;
};

export async function downloadBulletinNotesPdf(params: BulletinNotesPdfParams) {
  const isEn = params.locale === "en";
  const { doc, autoTable, startY, cfg } = await createDoc(
    params.config?.title || (isEn ? "Report card" : "Bulletin de notes"),
    params.config,
  );

  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(params.studentName || (isEn ? "Learner" : "Apprenant"), 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const meta = [
    params.enrollmentLabel,
    params.niveauLabel,
    params.classeLabel,
  ].filter(Boolean).join(" — ");
  if (meta) {
    doc.text(meta, 14, y);
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...cfg.blueRgb);
  doc.text(`${isEn ? "Overall average" : "Moyenne générale"} (/20) : ${params.moyenneGenerale}`, 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [[isEn ? "Subject" : "Matière", ...params.columnHeaders]],
    body: params.rows.map((r) => [
      `${r.matiereName}${r.coeffLabel ? `\n${r.coeffLabel}` : ""}`,
      ...r.cells,
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.8, valign: "middle" },
    headStyles: { fillColor: cfg.blueRgb, textColor: 255, fontSize: 7 },
    columnStyles: { 0: { cellWidth: 42, fontStyle: "bold" } },
  });

  await addPdfSignatures(doc, cfg, params.signatures, params.stampUrl);
  addPdfFooter(doc, cfg);
  const safe = params.studentName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || (isEn ? "learner" : "apprenant");
  doc.save(`${isEn ? "grade_report" : "releve_notes"}_${safe}.pdf`);
}

// ── Fiche générale de classe (matière + période) ─────────────────────────────

export type ClassGradeSheetPdfParams = {
  locale?: "fr" | "en";
  filiereName: string;
  niveauLabel?: string | null;
  classeName: string;
  matiereName: string;
  periodLabel: string;
  bareme: number;
  coefficient: number;
  classAverage: string;
  suplTitles: string[];
  rows: {
    studentName: string;
    principal: string;
    suplScores: string[];
    average: string;
    rank: string;
  }[];
  config?: Partial<DocumentExportConfig>;
  signatures?: { id: string; label: string; signatureUrl?: string | null }[];
  stampUrl?: string | null;
};

export async function downloadClassGradeSheetPdf(params: ClassGradeSheetPdfParams) {
  const locale = params.locale || "fr";
  const isEn = locale === "en";
  const { doc, autoTable, startY, cfg } = await createDoc(
    params.config?.title || (isEn ? "Class grade sheet" : "Relevé de classe"),
    params.config,
    locale,
  );

  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(params.matiereName, 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const meta = [
    params.filiereName,
    params.niveauLabel,
    params.classeName,
    params.periodLabel,
  ].filter(Boolean).join(" — ");
  if (meta) {
    doc.text(meta, 14, y);
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...cfg.blueRgb);
  doc.text(
    isEn
      ? `Scale /${params.bareme} · Coeff. ×${params.coefficient} · Class avg. : ${params.classAverage}/${params.bareme}`
      : `Barème /${params.bareme} · Coeff. ×${params.coefficient} · Moy. classe : ${params.classAverage}/${params.bareme}`,
    14,
    y,
  );
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [[
      "#",
      isEn ? "Name" : "Nom",
      isEn ? "Main grade" : "Note principale",
      ...params.suplTitles,
      isEn ? "Average" : "Moyenne",
      isEn ? "Rank" : "Rang",
    ]],
    body: params.rows.map((r, i) => [
      String(i + 1),
      r.studentName,
      r.principal,
      ...r.suplScores,
      r.average,
      r.rank,
    ]),
    styles: { fontSize: 8, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: cfg.blueRgb, textColor: 255, fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 45, fontStyle: "bold" },
    },
  });

  await addPdfSignatures(doc, cfg, params.signatures, params.stampUrl);
  addPdfFooter(doc, cfg);
  const safe = `${params.classeName}_${params.matiereName}`
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_") || "classe";
  doc.save(`${isEn ? "class_grades" : "releve_classe"}_${safe}.pdf`);
}

// ── Attestation de réussite ─────────────────────────────────────────────────

export type AttestationReussitePdfParams = {
  locale?: "fr" | "en";
  studentName: string;
  programName?: string | null;
  niveauLabel?: string | null;
  classeLabel?: string | null;
  academicYear?: string | null;
  issuedAt?: string | null;
  mention?: string | null;
  config?: Partial<DocumentExportConfig>;
  signatures?: { id: string; label: string; signatureUrl?: string | null }[];
  stampUrl?: string | null;
};

export async function downloadAttestationReussitePdf(params: AttestationReussitePdfParams) {
  const isEn = params.locale === "en";
  const title = params.config?.title?.trim() || (isEn ? "Certificate of achievement" : "Attestation de réussite");
  const { doc, startY, cfg } = await createDoc(title, {
    ...params.config,
    title,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY + 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  const legal = cfg.legalName || (isEn ? "the institution" : "l'établissement");
  const body = [
    isEn ? `I, the undersigned representative of ${legal}, certify that:` : `Je soussigné(e), représentant(e) de ${legal}, atteste que :`,
    "",
    `${params.studentName}`,
    "",
    isEn ? "has successfully completed the program below and is awarded this certificate of achievement." : "a suivi avec succès le programme ci-dessous et obtient la présente attestation de réussite.",
  ];

  for (const line of body) {
    if (!line) {
      y += 4;
      continue;
    }
    if (line === params.studentName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...cfg.blueRgb);
      doc.text(line.toUpperCase(), pageWidth / 2, y, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      y += 10;
      continue;
    }
    const wrapped = doc.splitTextToSize(line, pageWidth - 40);
    doc.text(wrapped, pageWidth / 2, y, { align: "center" });
    y += wrapped.length * 6 + 2;
  }

  y += 6;
  const details: string[] = [];
  if (params.programName) details.push(`${isEn ? "Program" : "Programme"} : ${params.programName}`);
  if (params.niveauLabel) details.push(`${isEn ? "Level" : "Niveau"} : ${params.niveauLabel}`);
  if (params.classeLabel) details.push(`${isEn ? "Class" : "Classe"} : ${params.classeLabel}`);
  if (params.academicYear) details.push(`${isEn ? "Academic year" : "Année académique"} : ${params.academicYear}`);
  if (params.mention) details.push(`${isEn ? "Distinction" : "Mention"} : ${params.mention}`);
  details.push(`${isEn ? "Issue date" : "Date d'émission"} : ${params.issuedAt || new Date().toLocaleDateString(isEn ? "en-GB" : "fr-FR")}`);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  for (const d of details) {
    doc.text(d, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    isEn ? "Official document issued by the center. Valid when presented with an identity document." : "Document officiel généré par le centre. Valable sur présentation d'une pièce d'identité.",
    pageWidth / 2,
    y,
    { align: "center", maxWidth: pageWidth - 40 },
  );

  await addPdfSignatures(doc, cfg, params.signatures, params.stampUrl);
  addPdfFooter(doc, cfg);
  const safe = params.studentName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || (isEn ? "learner" : "apprenant");
  doc.save(`${isEn ? "certificate_of_achievement" : "attestation_reussite"}_${safe}.pdf`);
}

