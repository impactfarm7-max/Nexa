"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { fetchDocumentExportConfig, type DocumentExportConfig } from "@/app/utils/documentConfig";
import DocumentOfficialHeader from "@/app/components/centre/DocumentOfficialHeader";
import { useI18n } from "@/app/i18n/I18nProvider";
import { localizeInstallmentLabel } from "@/app/utils/financeI18n";
import { localizeCountryName } from "@/app/utils/countryI18n";
import { getStudentCountryOptions, resolveStudentCountryCode } from "@/app/data/studentLocalisation";

const BLUE = "#11224E";
const ORANGE = "#eb670e";
const COUNTRY_OPTIONS = getStudentCountryOptions();

function localizedCountryName(country: string | null, dial: string | null, locale: "fr" | "en") {
  if (!country) return "—";
  const code = resolveStudentCountryCode(COUNTRY_OPTIONS, { country, country_code: dial });
  return localizeCountryName(code, country, locale);
}

function enrollmentStatusLabel(status: string, locale: "fr" | "en") {
  if (locale === "fr") return status === "active" ? "Actif" : status === "draft" ? "En attente" : status;
  const labels: Record<string, string> = {
    active: "Active", draft: "Pending", completed: "Completed",
    cancelled: "Canceled", paused: "Suspended", revoked: "Removed",
  };
  return labels[status] || status;
}

type Props = {
  studentId: string;
  enrollmentId: string;
  onClose: () => void;
};

type FicheData = {
  prenom: string;
  nom: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;

  country: string | null;
  country_code: string | null;
  region: string | null;
  id_type: string | null;
  id_number: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;

  filiere_name: string;
  niveau_annee: number | null;
  duration_label: string | null;
  groupe_nom: string | null;
  campus_name: string | null;
  tuition_fee: number;
  enrolled_at: string | null;
  enrollment_status: string;

  modalitesLines: string[];

  center_name: string;
  center_address: string | null;
  center_phone: string | null;
  center_logo: string | null;
  center_rccm: string | null;
  center_niu: string | null;
};

const ID_TYPE_LABELS: Record<string, string> = {
  cni: "Carte Nationale d'Identité",
  passeport: "Passeport",
  carte_sejour: "Carte de Séjour",
  autre: "Autre Document",
};

function guardianRelationLabel(value: string | null, locale: "fr" | "en") {
  if (!value || locale === "fr") return value || "—";
  return ({ "Père": "Father", "Mère": "Mother", Tuteur: "Guardian", Oncle: "Uncle", Tante: "Aunt", "Frère": "Brother", "Sœur": "Sister", Autre: "Other" } as Record<string, string>)[value] || value;
}

type InstallmentItem = {
  id?: string;
  label?: string | null;
  amount: number;
  due_date?: string | null;
  status?: string | null;
  paid_amount?: number | null;
  position?: number | null;
};

function dedupeInstallments(list: InstallmentItem[]): InstallmentItem[] {
  if (!list || list.length <= 1) return list;

  const map = new Map<string, InstallmentItem>();
  for (const inst of list) {
    const dStr = inst.due_date ? inst.due_date.slice(0, 10) : "nodate";
    const amt = Math.round(Number(inst.amount) || 0);

    const key = (inst.position && inst.position > 0)
      ? `pos_${inst.position}`
      : `date_${dStr}_amt_${amt}`;

    if (!map.has(key)) {
      map.set(key, inst);
    } else {
      const existing = map.get(key)!;
      const existingPaid = existing.status === "paid" || (existing.paid_amount || 0) >= existing.amount;
      const currentPaid = inst.status === "paid" || (inst.paid_amount || 0) >= inst.amount;

      if (!existingPaid && currentPaid) {
        map.set(key, inst);
      } else {
        const isGeneric = (lbl?: string | null) =>
          !lbl || /^échéance \d+$/i.test(lbl.trim()) || /^echeance \d+$/i.test(lbl.trim()) || lbl.trim().toLowerCase() === "échéance";
        if (isGeneric(existing.label) && !isGeneric(inst.label)) {
          map.set(key, inst);
        }
      }
    }
  }

  const result = Array.from(map.values());
  const finalMap = new Map<string, InstallmentItem>();
  for (const inst of result) {
    const dStr = inst.due_date ? inst.due_date.slice(0, 10) : "nodate";
    const amt = Math.round(Number(inst.amount) || 0);
    const key = `date_${dStr}_amt_${amt}`;
    if (!finalMap.has(key)) {
      finalMap.set(key, inst);
    } else {
      const existing = finalMap.get(key)!;
      const isGeneric = (lbl?: string | null) =>
        !lbl || /^échéance \d+$/i.test(lbl.trim()) || /^echeance \d+$/i.test(lbl.trim()) || lbl.trim().toLowerCase() === "échéance";
      if (isGeneric(existing.label) && !isGeneric(inst.label)) {
        finalMap.set(key, inst);
      }
    }
  }

  return Array.from(finalMap.values()).sort((a, b) => {
    if (a.position != null && b.position != null) return a.position - b.position;
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    return 0;
  });
}

function fmtPdfFCFA(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  const formatted = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} FCFA`;
}

function formatFicheModalitesLines(enr: any, instRows: any[] | null, locale: "fr" | "en"): string[] {
  const isEn = locale === "en";
  const deduped = dedupeInstallments(
    (instRows || []).map((r) => ({
      ...r,
      amount: Number(r.amount) || 0,
    }))
  );

  if (deduped && deduped.length > 0) {
    return deduped.map((inst, idx) => {
      const posName = `${isEn ? "Installment" : "Échéance"} ${inst.position || idx + 1}`;
      const label = inst.label && inst.label.trim() && !/^échéance \d+$/i.test(inst.label.trim())
        ? localizeInstallmentLabel(inst.label, locale)
        : posName;
      const amtStr = fmtPdfFCFA(inst.amount);
      const dateStr = inst.due_date
        ? new Date(inst.due_date).toLocaleDateString(isEn ? "en-GB" : "fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "";
      if (dateStr && amtStr) return `${label} : ${amtStr} (${dateStr})`;
      if (amtStr) return `${label} : ${amtStr}`;
      return label;
    });
  }

  const plan = enr?.niveaux?.payment_plan || enr?.filieres?.payment_plan;
  if (plan) {
    if (typeof plan === "string" && plan.trim().length > 0) {
      return [plan.trim()];
    }
    if (typeof plan === "object") {
      const obj = plan as any;
      if (Array.isArray(obj.installments) && obj.installments.length > 0) {
        return obj.installments.map((item: any, idx: number) => {
          const lbl = item.label
            ? localizeInstallmentLabel(String(item.label), locale)
            : (idx === 0 ? (isEn ? "Installment 1 (Deposit)" : "Échéance 1 (Acompte)") : `${isEn ? "Installment" : "Échéance"} ${idx + 1}`);
          const amt = Number(item.montant || item.amount) || 0;
          const amtFormatted = amt > 0 ? fmtPdfFCFA(amt) : "";
          const jours = Number(item.jours) || 0;
          const delayStr = jours > 0 ? `+${jours} ${isEn ? "days" : "jours"}` : (isEn ? "Upon enrollment" : "À l'inscription");
          return `${lbl}${amtFormatted ? ` : ${amtFormatted}` : ""}${delayStr ? ` (${delayStr})` : ""}`;
        });
      }
      if (obj.description) return [String(obj.description)];
    }
  }

  const fee = Number(enr?.tuition_fee) || 0;
  if (fee > 0) {
    return [`${isEn ? "Training fees" : "Frais de formation"} : ${fmtPdfFCFA(fee)} (${isEn ? "Installments according to the program" : "Échéances selon programme"})`];
  }

  return [isEn ? "Payment in installments according to the program" : "Paiement en tranches selon le programme"];
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

async function downloadFicheInscriptionPdf(data: FicheData, config: DocumentExportConfig | null, locale: "fr" | "en") {
  const isEn = locale === "en";
  const labels = isEn ? {
    institution: "INSTITUTION", title: "ACADEMIC ENROLLMENT FORM", phone: "Phone", issued: "Issued on",
    identity: "1. LEARNER IDENTITY", lastName: "Last name:", firstName: "First name:", email: "Email:", country: "Country:", region: "Region:",
    documentGuardian: "2. IDENTITY DOCUMENT & GUARDIAN", documentType: "Document type:", documentNumber: "Document No.:", guardian: "Guardian:", relationshipPhone: "Relationship / Phone:", notProvided: "Not provided",
    enrollmentFinance: "3. ACADEMIC ENROLLMENT & FINANCIAL COMMITMENT", program: "Program:", levelDuration: "Level/Duration:", campus: "Campus:", classroom: "Class:", totalAmount: "Total Amount:", enrollmentStatus: "Enrollment Status:", terms: "Payment terms:", active: "Active", pending: "Pending", year: "Year",
    learner: "The Learner", guardianSignature: "The Guardian", director: "The Director", signature: "Signature", stampSignature: "Stamp & Signature",
  } : {
    institution: "ÉTABLISSEMENT", title: "FICHE D'INSCRIPTION ACADÉMIQUE", phone: "Tél", issued: "Édité le",
    identity: "1. IDENTITÉ DE L'APPRENANT", lastName: "Nom :", firstName: "Prénom :", email: "Email :", country: "Pays :", region: "Région :",
    documentGuardian: "2. PIÈCE D'IDENTITÉ & TUTEUR", documentType: "Type pièce :", documentNumber: "N° Pièce :", guardian: "Tuteur :", relationshipPhone: "Lien / Tél :", notProvided: "Non renseigné",
    enrollmentFinance: "3. INSCRIPTION ACADÉMIQUE & ENGAGEMENT FINANCIER", program: "Programme :", levelDuration: "Niveau/Durée :", campus: "Campus :", classroom: "Classe :", totalAmount: "Montant Total :", enrollmentStatus: "Statut Inscription :", terms: "Modalités :", active: "Actif", pending: "En attente", year: "Année",
    learner: "L'Apprenant", guardianSignature: "Le Tuteur", director: "Le Directeur", signature: "Signature", stampSignature: "Cachet & Signature",
  };
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const blueRgb: [number, number, number] = config?.blueRgb || [17, 34, 78];
  const accentRgb: [number, number, number] = config?.accentRgb || [235, 103, 14];

  let headerX = 14;
  if (config?.showLogo && config?.logoUrl) {
    const dataUrl = await loadImageDataUrl(config.logoUrl);
    if (dataUrl) {
      const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(dataUrl, format, 14, 12, 14, 14);
      headerX = 32;
    }
  }

  doc.setTextColor(...blueRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(config?.legalName || data.center_name || labels.institution, headerX, 18);

  doc.setTextColor(...accentRgb);
  doc.setFontSize(9);
  doc.text(labels.title, headerX, 24);

  const metaLines: string[] = [];
  if (config?.showAddress && config?.address) metaLines.push(config.address);
  if (config?.showPhone && config?.phone) metaLines.push(`${labels.phone} : ${config.phone}`);
  if (config?.showRccm && config?.rccmNumber) metaLines.push(`RCCM : ${config.rccmNumber}`);
  if (config?.showNiu && config?.niuNumber) metaLines.push(`NIU : ${config.niuNumber}`);
  metaLines.push(`${labels.issued} ${new Date().toLocaleDateString(isEn ? "en-GB" : "fr-FR")}`);

  let metaY = 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  for (const line of metaLines) {
    doc.text(line, pageWidth - 14, metaY, { align: "right" });
    metaY += 4;
  }

  const ruleY = Math.max(30, metaY + 2);
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.6);
  doc.line(14, ruleY, pageWidth - 14, ruleY);

  let currentY = ruleY + 8;

  // 1. Identité
  doc.setTextColor(...blueRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(labels.identity, 14, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: [
      [labels.lastName, (data.nom || "").toUpperCase(), labels.firstName, (data.prenom || "").toUpperCase()],
      [labels.email, data.email || "", `${labels.phone} :`, data.phone ? `${data.country_code ?? ""} ${data.phone}` : "—"],
      [labels.country, localizedCountryName(data.country, data.country_code, locale), labels.region, data.region || "—"],
    ],
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 25 },
      1: { textColor: [20, 20, 20], cellWidth: 65 },
      2: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 25 },
      3: { textColor: [20, 20, 20], cellWidth: 65 },
    },
    theme: "plain",
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 2. Pièce d'identité & Tuteur
  doc.setTextColor(...blueRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(labels.documentGuardian, 14, currentY);
  currentY += 4;

  const idTypeLabel = data.id_type === "cni" ? (isEn ? "National Identity Card" : "Carte Nationale d'Identité") : data.id_type === "passeport" ? (isEn ? "Passport" : "Passeport") : data.id_type || labels.notProvided;

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: [
      [labels.documentType, idTypeLabel, labels.documentNumber, data.id_number || labels.notProvided],
      [labels.guardian, data.guardian_name || "—", labels.relationshipPhone, `${guardianRelationLabel(data.guardian_relation, locale)} (${data.guardian_phone || "—"})`],
    ],
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 25 },
      1: { textColor: [20, 20, 20], cellWidth: 65 },
      2: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 25 },
      3: { textColor: [20, 20, 20], cellWidth: 65 },
    },
    theme: "plain",
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 3. Inscription & Finances
  doc.setTextColor(...blueRgb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(labels.enrollmentFinance, 14, currentY);
  currentY += 4;

  const statusLabel = enrollmentStatusLabel(data.enrollment_status, locale);
  const niveauOrDuree = data.niveau_annee ? `${labels.year} ${data.niveau_annee}` : (data.duration_label || "—");

  const modalitesFormatted = data.modalitesLines.join("\n");

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: [
      [labels.program, data.filiere_name.toUpperCase(), labels.levelDuration, niveauOrDuree],
      [labels.campus, data.campus_name || "—", labels.classroom, data.groupe_nom || "—"],
      [labels.totalAmount, fmtPdfFCFA(data.tuition_fee), labels.enrollmentStatus, statusLabel],
      [labels.terms, modalitesFormatted, "", ""],
    ],
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, textColor: [20, 20, 20] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 25 },
      1: { textColor: [20, 20, 20], cellWidth: 65 },
      2: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 25 },
      3: { textColor: [20, 20, 20], cellWidth: 65 },
    },
    theme: "plain",
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Clause
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const clause = isEn
    ? `I, the undersigned, ${(data.prenom || "").toUpperCase()} ${(data.nom || "").toUpperCase()}, declare that I have read the institution's internal regulations and agree to comply with the enrollment, education and payment conditions defined by ${data.center_name}. The information provided above is accurate and complete.`
    : `Je soussigné(e), ${(data.prenom || "").toUpperCase()} ${(data.nom || "").toUpperCase()}, déclare avoir pris connaissance du règlement intérieur de l'établissement et m'engage à respecter les conditions d'inscription, de scolarité et de paiement définies par ${data.center_name}. Les informations fournies ci-dessus sont exactes et complètes.`;
  doc.text(clause, 14, currentY, { maxWidth: pageWidth - 28 });

  currentY += 12;

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...blueRgb);

  doc.text(labels.learner, 25, currentY);
  if (data.guardian_name) doc.text(labels.guardianSignature, 95, currentY);
  doc.text(labels.director, 160, currentY);

  currentY += 18;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(labels.signature, 25, currentY);
  if (data.guardian_name) doc.text(labels.signature, 95, currentY);
  doc.text(labels.stampSignature, 160, currentY);

  currentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const todayStr = new Date().toLocaleDateString(isEn ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(isEn ? `Signed at __________________, on ${todayStr}` : `Fait à __________________, le ${todayStr}`, pageWidth - 14, currentY, { align: "right" });

  if (config?.footerText) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(config.footerText, 14, pageHeight - 10, { maxWidth: 180 });
  }

  const safeNom = (data.nom || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePrenom = (data.prenom || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`${isEn ? "enrollment-form" : "fiche-inscription"}-${safeNom}-${safePrenom}.pdf`);
}

export default function FicheInscriptionModal({ studentId, enrollmentId, onClose }: Props) {
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FicheData | null>(null);
  const [docConfig, setDocConfig] = useState<DocumentExportConfig | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("prenom, nom, email, phone, avatar_url, created_at, center_id")
        .eq("id", studentId)
        .single();

      if (!profile) { setLoading(false); return; }

      const { data: details } = await supabase
        .from("student_details")
        .select("country, country_code, region, id_type, id_number, guardian_name, guardian_relation, guardian_phone")
        .eq("student_id", studentId)
        .maybeSingle();

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select(`
          tuition_fee, enrolled_at, status, filiere_id, niveau_id,
          duration_value, duration_unit, duration_months,
          filieres(name, type, duree_valeur, duree_unite, payment_plan),
          niveaux(annee, mois, semaines, jours, payment_plan),
          groupes(nom),
          campuses(name)
        `)
        .eq("id", enrollmentId)
        .single();

      const { data: instRows } = await supabase
        .from("enrollment_installments")
        .select("label, amount, due_date, position")
        .eq("enrollment_id", enrollmentId)
        .order("position", { ascending: true })
        .order("due_date", { ascending: true });

      const [exportConfig, { data: center }] = await Promise.all([
        fetchDocumentExportConfig(supabase, profile.center_id),
        supabase.from("centers").select("name").eq("id", profile.center_id).single(),
      ]);
      setDocConfig(exportConfig);

      const enr = enrollment as any;
      const nivAnnee = enr?.niveaux?.annee ?? null;
      let durationLabel: string | null = null;
      if (!nivAnnee) {
        if (enr?.duration_months) durationLabel = `${enr.duration_months} ${locale === "en" ? "months" : "mois"}`;
        else if (enr?.duration_value && enr?.duration_unit === "month") durationLabel = `${enr.duration_value} ${locale === "en" ? "months" : "mois"}`;
        else if (enr?.duration_value && enr?.duration_unit === "week") durationLabel = `${enr.duration_value} ${locale === "en" ? "weeks" : "sem."}`;
        else if (enr?.duration_value && enr?.duration_unit === "day") durationLabel = `${enr.duration_value} ${locale === "en" ? "days" : "j"}`;
        else if (enr?.filieres?.duree_valeur && enr?.filieres?.duree_unite) {
          const u = enr.filieres.duree_unite;
          durationLabel = `${enr.filieres.duree_valeur} ${locale === "en" ? (u === "mois" ? "months" : u === "semaines" ? "weeks" : "days") : (u === "mois" ? "mois" : u === "semaines" ? "sem." : "j")}`;
        } else if (enr?.niveaux?.mois) durationLabel = `${enr.niveaux.mois} ${locale === "en" ? "months" : "mois"}`;
      }

      const modalitesLines = formatFicheModalitesLines(enr, instRows || [], locale);

      setData({
        prenom: profile.prenom,
        nom: profile.nom,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,

        country: details?.country ?? null,
        country_code: details?.country_code ?? null,
        region: details?.region ?? null,
        id_type: details?.id_type ?? null,
        id_number: details?.id_number ?? null,
        guardian_name: details?.guardian_name ?? null,
        guardian_relation: details?.guardian_relation ?? null,
        guardian_phone: details?.guardian_phone ?? null,

        filiere_name: enr?.filieres?.name ?? "—",
        niveau_annee: nivAnnee,
        duration_label: durationLabel,
        groupe_nom: enr?.groupes?.nom ?? null,
        campus_name: enr?.campuses?.name ?? null,
        tuition_fee: Number(enr?.tuition_fee) || 0,
        enrolled_at: enr?.enrolled_at ?? null,
        enrollment_status: enr?.status ?? "—",

        modalitesLines: modalitesLines,

        center_name: exportConfig.legalName ?? center?.name ?? t("centre", "bulletinInstitution"),
        center_address: exportConfig.address ?? null,
        center_phone: exportConfig.phone ?? null,
        center_logo: exportConfig.logoUrl ?? null,
        center_rccm: exportConfig.rccmNumber ?? null,
        center_niu: exportConfig.niuNumber ?? null,
      });

      setLoading(false);
    })();
  }, [studentId, enrollmentId, locale, t]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloadingPdf(true);
    try {
      await downloadFicheInscriptionPdf(data, docConfig, locale);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      {/* Barre fixe — toujours visible */}
      <div className="print:hidden shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 py-3 bg-white border-b border-neutral-200 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">{t("centre", "enrollmentFormBack")}</span>
        </button>
        <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400 truncate min-w-0">
          {t("centre", "enrollmentFormPreview")}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
            title={t("centre", "enrollmentFormPrintTitle")}
          >
            <Printer size={14} />
            <span className="hidden sm:inline">{t("centre", "enrollmentFormPrint")}</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={downloadingPdf}
            className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-xl text-[11px] font-black uppercase text-white shrink-0 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: ORANGE }}
            title={t("centre", "enrollmentFormDownloadTitle")}
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{t("centre", "enrollmentFormDownloadPdf")}</span>
          </button>
        </div>
      </div>

      {/* Zone scrollable — reste dans le viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-black/75 p-3 sm:p-6 md:p-8 print:bg-white print:p-0 print:overflow-visible">
        <div
          className="bg-white max-w-[700px] w-full mx-auto p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl text-slate-900 print:shadow-none print:rounded-none print:max-w-none"
          id="fiche-content"
        >
          {/* EN-TÊTE CENTRE */}
          <DocumentOfficialHeader
            config={docConfig}
            fallbackName={data.center_name}
            fallbackTitle={t("centre", "enrollmentFormFallbackTitle")}
          />

          {/* PHOTO + IDENTITÉ */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 mb-5 sm:mb-6">
            <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl border-2 border-neutral-200 overflow-hidden bg-neutral-50 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
              {data.avatar_url ? (
                <img src={data.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <p className="text-3xl font-black" style={{ color: BLUE }}>
                    {data.prenom[0]}{data.nom[0]}
                  </p>
                  <p className="text-[8px] text-neutral-400 mt-1">{t("centre", "enrollmentFormPhoto")}</p>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <SectionTitle title={t("centre", "enrollmentFormLearnerIdentity")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 mt-2">
                <Field label={t("centre", "enrollmentFormLastName")} value={(data.nom || "").toUpperCase()} />
                <Field label={t("centre", "enrollmentFormFirstName")} value={(data.prenom || "").toUpperCase()} />
                <Field label={t("centre", "enrollmentFormEmail")} value={data.email} />
                <Field label={t("centre", "enrollmentFormPhone")} value={data.phone ? `${data.country_code ?? ""} ${data.phone}` : "—"} />
                <Field label={t("centre", "enrollmentFormCountry")} value={localizedCountryName(data.country, data.country_code, locale)} />
                <Field label={t("centre", "enrollmentFormRegion")} value={data.region ?? "—"} />
              </div>
            </div>
          </div>

          {/* PIÈCE D'IDENTITÉ */}
          <div className="mb-5 sm:mb-6">
            <SectionTitle title={t("centre", "enrollmentFormIdentityDocument")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
              <Field label={t("centre", "enrollmentFormDocumentType")} value={data.id_type ? (locale === "fr" ? (ID_TYPE_LABELS[data.id_type] ?? data.id_type) : ({ cni: t("centre", "identityTypeNationalCard"), passeport: t("centre", "identityTypePassport"), carte_sejour: t("centre", "identityTypeResidenceCard"), autre: t("centre", "identityTypeOther") }[data.id_type] ?? data.id_type)) : t("centre", "enrollmentFormNotProvided")} />
              <Field label={t("centre", "enrollmentFormNumber")} value={data.id_number ?? t("centre", "enrollmentFormNotProvided")} />
            </div>
          </div>

          {/* RESPONSABLE LÉGAL */}
          <div className="mb-5 sm:mb-6">
            <SectionTitle title={t("centre", "enrollmentFormGuardian")} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 mt-2">
              <Field label={t("centre", "enrollmentFormFullName")} value={data.guardian_name ?? t("centre", "enrollmentFormNotProvided")} />
              <Field label={t("centre", "enrollmentFormRelationship")} value={guardianRelationLabel(data.guardian_relation, locale)} />
              <Field label={t("centre", "enrollmentFormPhone")} value={data.guardian_phone ?? "—"} />
            </div>
          </div>

          {/* INSCRIPTION */}
          <div className="mb-5 sm:mb-6">
            <SectionTitle title={t("centre", "enrollmentFormAcademicEnrollment")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
              <Field label={t("centre", "enrollmentFormProgramTrack")} value={data.filiere_name} bold />
              <Field
                label={data.niveau_annee ? t("centre", "enrollmentFormLevel") : t("centre", "enrollmentFormDuration")}
                value={
                  data.niveau_annee
                    ? t("centre", "enrollmentFormYear", { year: data.niveau_annee })
                    : (data.duration_label || "—")
                }
              />
              <Field label={t("centre", "identityClassroom")} value={data.groupe_nom ?? "—"} />
              <Field label={t("centre", "enrollmentFormCampus")} value={data.campus_name ?? "—"} />
              <Field label={t("centre", "enrollmentFormEnrollmentDate")} value={formatDate(data.enrolled_at)} />
              <Field
                label={t("centre", "enrollmentFormStatus")}
                value={
                  enrollmentStatusLabel(data.enrollment_status, locale)
                }
              />
            </div>
          </div>

          {/* FINANCES */}
          <div className="mb-6 sm:mb-8">
            <SectionTitle title={t("centre", "enrollmentFormFinancialCommitment")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2">
              <Field label={t("centre", "enrollmentFormTrainingAmount")} value={fmtPdfFCFA(data.tuition_fee)} bold />
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider">{t("centre", "enrollmentFormPaymentTerms")}</p>
                <div className="space-y-1 mt-1">
                  {data.modalitesLines.map((line, idx) => (
                    <p key={idx} className="text-xs font-bold leading-snug" style={{ color: BLUE }}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CLAUSE */}
          <div className="border-t-2 pt-4 sm:pt-5 mb-6 sm:mb-8" style={{ borderColor: BLUE }}>
            <p className="text-[10px] text-neutral-600 leading-relaxed">
              {t("centre", "enrollmentFormClauseStart")} <span className="font-bold">{(data.prenom || "").toUpperCase()} {(data.nom || "").toUpperCase()}</span>,{" "}
              {t("centre", "enrollmentFormClauseBody", { center: data.center_name })}
            </p>
          </div>

          {/* SIGNATURES */}
          <div className="flex flex-wrap justify-between gap-6 sm:gap-4 items-end mt-8 sm:mt-12">
            <div className="w-[42%] sm:w-44 md:w-52 text-center min-w-[120px]">
              <p className="text-[10px] font-black uppercase mb-1" style={{ color: BLUE }}>{t("centre", "enrollmentFormLearner")}</p>
              <div className="h-14 sm:h-16 border-b border-dashed border-neutral-300" />
              <p className="text-[9px] text-neutral-400 mt-1">{t("centre", "enrollmentFormSignature")}</p>
            </div>
            {data.guardian_name && (
              <div className="w-[42%] sm:w-44 md:w-52 text-center min-w-[120px]">
                <p className="text-[10px] font-black uppercase mb-1" style={{ color: BLUE }}>{t("centre", "enrollmentFormResponsible")}</p>
                <div className="h-14 sm:h-16 border-b border-dashed border-neutral-300" />
                <p className="text-[9px] text-neutral-400 mt-1">{t("centre", "enrollmentFormSignature")}</p>
              </div>
            )}
            <div className="w-[42%] sm:w-44 md:w-52 text-center min-w-[120px] sm:ml-auto">
              <p className="text-[10px] font-black uppercase mb-1" style={{ color: BLUE }}>{t("centre", "enrollmentFormDirector")}</p>
              <div className="h-14 sm:h-16 border-b border-dashed border-neutral-300" />
              <p className="text-[9px] text-neutral-400 mt-1">{t("centre", "enrollmentFormStampSignature")}</p>
            </div>
          </div>

          {/* DATE + LIEU */}
          <div className="mt-6 sm:mt-8 text-right">
            <p className="text-[10px] text-neutral-500">
              {t("centre", "enrollmentFormMadeAt", { date: new Date().toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" }) })}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          #fiche-content {
            margin: 0 !important;
            padding: 24px !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[10px] font-black uppercase tracking-widest" style={{ color: BLUE }}>{title}</h2>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider">{label}</p>
      <p className={`text-xs mt-0.5 break-words ${bold ? "font-black" : "font-medium"}`} style={{ color: BLUE }}>{value}</p>
    </div>
  );
}
