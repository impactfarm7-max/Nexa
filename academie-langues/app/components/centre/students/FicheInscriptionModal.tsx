"use client";

import { useState, useEffect } from "react";
import { Download, Loader2, ArrowLeft } from "lucide-react";
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

export default function FicheInscriptionModal({ studentId, enrollmentId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FicheData | null>(null);
  const [docConfig, setDocConfig] = useState<DocumentExportConfig | null>(null);

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
          tuition_fee, enrolled_at, status,
          duration_value, duration_unit, duration_months,
          filieres(name, type, duree_valeur, duree_unite),
          niveaux(annee, mois, semaines, jours),
          groupes(nom),
          campuses(name)
        `)
        .eq("id", enrollmentId)
        .single();

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
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-xl text-[11px] font-black uppercase text-white shrink-0"
          style={{ backgroundColor: ORANGE }}
        >
          <Download size={14} />
          <span>Télécharger</span>
        </button>
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
                <Field label="Nom" value={data.nom} />
                <Field label="Prénom" value={data.prenom} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-2">
              <Field label="Montant de la formation" value={`${data.tuition_fee.toLocaleString("fr-FR")} FCFA`} bold />
              <Field label="Modalité" value="Selon échéancier du programme" />
            </div>
          </div>

          {/* CLAUSE */}
          <div className="border-t-2 pt-4 sm:pt-5 mb-6 sm:mb-8" style={{ borderColor: BLUE }}>
            <p className="text-[10px] text-neutral-600 leading-relaxed">
              Je soussigné(e), <span className="font-bold">{data.prenom} {data.nom}</span>, déclare avoir pris
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
