"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { fetchDocumentExportConfig, type DocumentExportConfig } from "@/app/utils/documentConfig";
import DocumentOfficialHeader from "@/app/components/centre/DocumentOfficialHeader";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

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

function formatFicheModalitesLines(enr: any, instRows: any[] | null): string[] {
  const deduped = dedupeInstallments(
    (instRows || []).map((r) => ({
      ...r,
      amount: Number(r.amount) || 0,
    }))
  );

  if (deduped && deduped.length > 0) {
    return deduped.map((inst, idx) => {
      const posName = inst.position ? `Échéance ${inst.position}` : `Échéance ${idx + 1}`;
      const label = inst.label && inst.label.trim() && !/^échéance \d+$/i.test(inst.label.trim())
        ? inst.label.trim()
        : posName;
      const amtStr = fmtPdfFCFA(inst.amount);
      const dateStr = inst.due_date
        ? new Date(inst.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
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
          const lbl = item.label || (idx === 0 ? "Échéance 1 (Acompte)" : `Échéance ${idx + 1}`);
          const amt = Number(item.montant || item.amount) || 0;
          const amtFormatted = amt > 0 ? fmtPdfFCFA(amt) : "";
          const jours = Number(item.jours) || 0;
          const delayStr = jours > 0 ? `+${jours} jours` : "À l'inscription";
          return `${lbl}${amtFormatted ? ` : ${amtFormatted}` : ""}${delayStr ? ` (${delayStr})` : ""}`;
        });
      }
      if (obj.description) return [String(obj.description)];
    }
  }

  const fee = Number(enr?.tuition_fee) || 0;
  if (fee > 0) {
    return [`Frais de formation : ${fmtPdfFCFA(fee)} (Échéances selon programme)`];
  }

  return ["Paiement en tranches selon le programme"];
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

async function downloadFicheInscriptionPdf(data: FicheData, config: DocumentExportConfig | null) {
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
  doc.text(config?.legalName || data.center_name || "ÉTABLISSEMENT", headerX, 18);

  doc.setTextColor(...accentRgb);
  doc.setFontSize(9);
  doc.text("FICHE D'INSCRIPTION ACADÉMIQUE", headerX, 24);

  const metaLines: string[] = [];
  if (config?.showAddress && config?.address) metaLines.push(config.address);
  if (config?.showPhone && config?.phone) metaLines.push(`Tél : ${config.phone}`);
  if (config?.showRccm && config?.rccmNumber) metaLines.push(`RCCM : ${config.rccmNumber}`);
  if (config?.showNiu && config?.niuNumber) metaLines.push(`NIU : ${config.niuNumber}`);
  metaLines.push(`Édité le ${new Date().toLocaleDateString("fr-FR")}`);

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
  doc.text("1. IDENTITÉ DE L'APPRENANT", 14, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: [
      ["Nom :", (data.nom || "").toUpperCase(), "Prénom :", (data.prenom || "").toUpperCase()],
      ["Email :", data.email || "", "Téléphone :", data.phone ? `${data.country_code ?? ""} ${data.phone}` : "—"],
      ["Pays :", data.country || "—", "Région :", data.region || "—"],
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
  doc.text("2. PIÈCE D'IDENTITÉ & TUTEUR", 14, currentY);
  currentY += 4;

  const idTypeLabel = data.id_type === "cni" ? "Carte Nationale d'Identité" : data.id_type === "passeport" ? "Passeport" : data.id_type || "Non renseigné";

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: [
      ["Type pièce :", idTypeLabel, "N° Pièce :", data.id_number || "Non renseigné"],
      ["Tuteur :", data.guardian_name || "—", "Lien / Tél :", `${data.guardian_relation || "—"} (${data.guardian_phone || "—"})`],
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
  doc.text("3. INSCRIPTION ACADÉMIQUE & ENGAGEMENT FINANCIER", 14, currentY);
  currentY += 4;

  const statusLabel = data.enrollment_status === "active" ? "Actif" : data.enrollment_status === "draft" ? "En attente" : data.enrollment_status;
  const niveauOrDuree = data.niveau_annee ? `Année ${data.niveau_annee}` : (data.duration_label || "—");

  const modalitesFormatted = data.modalitesLines.join("\n");

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: [
      ["Programme :", data.filiere_name.toUpperCase(), "Niveau/Durée :", niveauOrDuree],
      ["Campus :", data.campus_name || "—", "Classe :", data.groupe_nom || "—"],
      ["Montant Total :", fmtPdfFCFA(data.tuition_fee), "Statut Inscription :", statusLabel],
      ["Modalités :", modalitesFormatted, "", ""],
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
  const clause = `Je soussigné(e), ${(data.prenom || "").toUpperCase()} ${(data.nom || "").toUpperCase()}, déclare avoir pris connaissance du règlement intérieur de l'établissement et m'engage à respecter les conditions d'inscription, de scolarité et de paiement définies par ${data.center_name}. Les informations fournies ci-dessus sont exactes et complètes.`;
  doc.text(clause, 14, currentY, { maxWidth: pageWidth - 28 });

  currentY += 12;

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...blueRgb);

  doc.text("L'Apprenant", 25, currentY);
  if (data.guardian_name) doc.text("Le Tuteur", 95, currentY);
  doc.text("Le Directeur", 160, currentY);

  currentY += 18;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Signature", 25, currentY);
  if (data.guardian_name) doc.text("Signature", 95, currentY);
  doc.text("Cachet & Signature", 160, currentY);

  currentY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const todayStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Fait à __________________, le ${todayStr}`, pageWidth - 14, currentY, { align: "right" });

  if (config?.footerText) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(config.footerText, 14, pageHeight - 10, { maxWidth: 180 });
  }

  const safeNom = (data.nom || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePrenom = (data.prenom || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`fiche-inscription-${safeNom}-${safePrenom}.pdf`);
}

export default function FicheInscriptionModal({ studentId, enrollmentId, onClose }: Props) {
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
        if (enr?.duration_months) durationLabel = `${enr.duration_months} mois`;
        else if (enr?.duration_value && enr?.duration_unit === "month") durationLabel = `${enr.duration_value} mois`;
        else if (enr?.duration_value && enr?.duration_unit === "week") durationLabel = `${enr.duration_value} sem.`;
        else if (enr?.duration_value && enr?.duration_unit === "day") durationLabel = `${enr.duration_value} j`;
        else if (enr?.filieres?.duree_valeur && enr?.filieres?.duree_unite) {
          const u = enr.filieres.duree_unite;
          durationLabel = `${enr.filieres.duree_valeur} ${u === "mois" ? "mois" : u === "semaines" ? "sem." : "j"}`;
        } else if (enr?.niveaux?.mois) durationLabel = `${enr.niveaux.mois} mois`;
      }

      const modalitesLines = formatFicheModalitesLines(enr, instRows || []);

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

        center_name: exportConfig.legalName ?? center?.name ?? "Établissement",
        center_address: exportConfig.address ?? null,
        center_phone: exportConfig.phone ?? null,
        center_logo: exportConfig.logoUrl ?? null,
        center_rccm: exportConfig.rccmNumber ?? null,
        center_niu: exportConfig.niuNumber ?? null,
      });

      setLoading(false);
    })();
  }, [studentId, enrollmentId]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloadingPdf(true);
    try {
      await downloadFicheInscriptionPdf(data, docConfig);
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
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
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
          <span className="hidden sm:inline">Retour</span>
        </button>
        <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400 truncate min-w-0">
          Aperçu — Fiche d&apos;inscription
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-neutral-200 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
            title="Imprimer le document"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={downloadingPdf}
            className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-xl text-[11px] font-black uppercase text-white shrink-0 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: ORANGE }}
            title="Télécharger la fiche en fichier PDF"
          >
            {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Télécharger (PDF)</span>
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
            fallbackTitle="Fiche d'Inscription"
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
                  <p className="text-[8px] text-neutral-400 mt-1">PHOTO</p>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <SectionTitle title="Identité de l'Apprenant" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 mt-2">
                <Field label="Nom" value={(data.nom || "").toUpperCase()} />
                <Field label="Prénom" value={(data.prenom || "").toUpperCase()} />
                <Field label="Email" value={data.email} />
                <Field label="Téléphone" value={data.phone ? `${data.country_code ?? ""} ${data.phone}` : "—"} />
                <Field label="Pays" value={data.country ?? "—"} />
                <Field label="Région" value={data.region ?? "—"} />
              </div>
            </div>
          </div>

          {/* PIÈCE D'IDENTITÉ */}
          <div className="mb-5 sm:mb-6">
            <SectionTitle title="Pièce d'Identité" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
              <Field label="Type de document" value={data.id_type ? (ID_TYPE_LABELS[data.id_type] ?? data.id_type) : "Non renseigné"} />
              <Field label="Numéro" value={data.id_number ?? "Non renseigné"} />
            </div>
          </div>

          {/* RESPONSABLE LÉGAL */}
          <div className="mb-5 sm:mb-6">
            <SectionTitle title="Responsable Légal / Tuteur" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 mt-2">
              <Field label="Nom complet" value={data.guardian_name ?? "Non renseigné"} />
              <Field label="Lien" value={data.guardian_relation ?? "—"} />
              <Field label="Téléphone" value={data.guardian_phone ?? "—"} />
            </div>
          </div>

          {/* INSCRIPTION */}
          <div className="mb-5 sm:mb-6">
            <SectionTitle title="Inscription Académique" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
              <Field label="Programme / Filière" value={data.filiere_name} bold />
              <Field
                label={data.niveau_annee ? "Niveau" : "Durée"}
                value={
                  data.niveau_annee
                    ? `Année ${data.niveau_annee}`
                    : (data.duration_label || "—")
                }
              />
              <Field label="Salle de classe" value={data.groupe_nom ?? "—"} />
              <Field label="Campus" value={data.campus_name ?? "—"} />
              <Field label="Date d'inscription" value={formatDate(data.enrolled_at)} />
              <Field
                label="Statut"
                value={
                  data.enrollment_status === "active" ? "Actif"
                  : data.enrollment_status === "draft" ? "En attente"
                  : data.enrollment_status
                }
              />
            </div>
          </div>

          {/* FINANCES */}
          <div className="mb-6 sm:mb-8">
            <SectionTitle title="Engagement Financier" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2">
              <Field label="Montant de la formation" value={fmtPdfFCFA(data.tuition_fee)} bold />
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider">Modalités de paiement</p>
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
              Je soussigné(e), <span className="font-bold">{(data.prenom || "").toUpperCase()} {(data.nom || "").toUpperCase()}</span>, déclare avoir pris
              connaissance du règlement intérieur de l&apos;établissement et m&apos;engage à respecter les conditions
              d&apos;inscription, de scolarité et de paiement définies par{" "}
              <span className="font-bold">{data.center_name}</span>. Les informations fournies ci-dessus sont
              exactes et complètes.
            </p>
          </div>

          {/* SIGNATURES */}
          <div className="flex flex-wrap justify-between gap-6 sm:gap-4 items-end mt-8 sm:mt-12">
            <div className="w-[42%] sm:w-44 md:w-52 text-center min-w-[120px]">
              <p className="text-[10px] font-black uppercase mb-1" style={{ color: BLUE }}>L&apos;Apprenant</p>
              <div className="h-14 sm:h-16 border-b border-dashed border-neutral-300" />
              <p className="text-[9px] text-neutral-400 mt-1">Signature</p>
            </div>
            {data.guardian_name && (
              <div className="w-[42%] sm:w-44 md:w-52 text-center min-w-[120px]">
                <p className="text-[10px] font-black uppercase mb-1" style={{ color: BLUE }}>Le Responsable</p>
                <div className="h-14 sm:h-16 border-b border-dashed border-neutral-300" />
                <p className="text-[9px] text-neutral-400 mt-1">Signature</p>
              </div>
            )}
            <div className="w-[42%] sm:w-44 md:w-52 text-center min-w-[120px] sm:ml-auto">
              <p className="text-[10px] font-black uppercase mb-1" style={{ color: BLUE }}>Le Directeur</p>
              <div className="h-14 sm:h-16 border-b border-dashed border-neutral-300" />
              <p className="text-[9px] text-neutral-400 mt-1">Cachet & Signature</p>
            </div>
          </div>

          {/* DATE + LIEU */}
          <div className="mt-6 sm:mt-8 text-right">
            <p className="text-[10px] text-neutral-500">
              Fait à __________________, le{" "}
              {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
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