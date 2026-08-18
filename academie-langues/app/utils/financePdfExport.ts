import type { DocumentExportConfig } from "@/app/utils/documentConfig";
import { createDoc, addPdfFooter, fmtFCFA, fmtDate } from "@/app/utils/centerPdfExport";
import { financeMethodLabel } from "@/app/data/financePayments";

// TODO: compléter avant mise en prod — informations légales NEXA (adresse du siège,
// numéro RCCM, NIU, téléphone de contact). Le nom "NEXA" et le logo sont déjà corrects.
const NEXA_LEGAL_CONFIG: Partial<DocumentExportConfig> = {
  legalName: "NEXA",
  logoUrl: "/logo-nexa.jpeg",
  address: null, // TODO: adresse du siège NEXA
  phone: null, // TODO: numéro de contact NEXA
  rccmNumber: null, // TODO: numéro RCCM NEXA
  niuNumber: null, // TODO: NIU NEXA
  accentColor: "#F87B1B",
};

export type FinanceInvoicePayment = {
  document_number: string;
  amount: number;
  method: string;
  period_label: string | null;
  paid_at: string;
  note: string | null;
  center: { name: string; city: string | null; offerLabel: string };
};

async function buildFinanceDocument(payment: FinanceInvoicePayment, kind: "invoice" | "receipt", locale: "fr" | "en") {
  const isEn = locale === "en";
  const title = kind === "invoice" ? (isEn ? "Invoice" : "Facture") : isEn ? "Receipt" : "Reçu";
  const { doc, autoTable, startY, cfg } = await createDoc(title, { ...NEXA_LEGAL_CONFIG, title }, locale);

  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(`${isEn ? "Document no." : "N° document"} : ${payment.document_number}`, 14, y);
  doc.text(fmtDate(payment.paid_at, locale), 195, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(isEn ? "Billed to" : "Facturé à", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...cfg.blueRgb);
  doc.text(payment.center.name, 14, y);
  y += 4.5;
  if (payment.center.city) {
    doc.setTextColor(100, 100, 100);
    doc.text(payment.center.city, 14, y);
    y += 4.5;
  }
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [[isEn ? "Description" : "Désignation", isEn ? "Amount" : "Montant"]],
    body: [
      [
        [payment.center.offerLabel, payment.period_label].filter(Boolean).join(" — ") ||
          (isEn ? "NEXA subscription" : "Abonnement NEXA"),
        `${fmtFCFA(payment.amount)} F`,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: cfg.blueRgb, textColor: 255, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...cfg.blueRgb);
  doc.text(`Total : ${fmtFCFA(payment.amount)} F`, 14, afterTableY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`${isEn ? "Payment method" : "Méthode de paiement"} : ${financeMethodLabel(payment.method, locale)}`, 14, afterTableY + 7);
  if (payment.note) {
    doc.text(`${isEn ? "Note" : "Note"} : ${payment.note}`, 14, afterTableY + 13, { maxWidth: 180 });
  }

  addPdfFooter(doc, { ...cfg, footerText: "NEXA — nexa-edu.com" });
  return doc;
}

export async function downloadInvoicePdf(payment: FinanceInvoicePayment, locale: "fr" | "en" = "fr") {
  const doc = await buildFinanceDocument(payment, "invoice", locale);
  doc.save(`facture_${payment.document_number}.pdf`);
}

export async function downloadReceiptPdf(payment: FinanceInvoicePayment, locale: "fr" | "en" = "fr") {
  const doc = await buildFinanceDocument(payment, "receipt", locale);
  doc.save(`recu_${payment.document_number}.pdf`);
}
