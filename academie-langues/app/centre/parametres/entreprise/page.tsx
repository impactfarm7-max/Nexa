"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera, Loader2, CheckCircle2, FileUp, X, Plus, Trash2,
  ChevronUp, ChevronDown, PenLine, Stamp, Building2, ScrollText,
  Globe2, Signature,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import SetupBanner from "@/app/components/SetupBanner";
import SetupFooter from "@/app/components/SetupFooter";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";
const ORANGE = "#F87B1B";

// ---------------------------------------------------------------------------
// Référentiels contextualisés Afrique francophone (OHADA / CEMAC)
// ---------------------------------------------------------------------------

// Pays -> indicatif + devise + fuseau (les 3 se pré-remplissent à la sélection)
const COUNTRIES = [
  { code: "CM", name: "Cameroun", flag: "🇨🇲", dial: "+237", currency: "XAF", tz: "Africa/Douala" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", dial: "+225", currency: "XOF", tz: "Africa/Abidjan" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", dial: "+221", currency: "XOF", tz: "Africa/Abidjan" },
  { code: "GA", name: "Gabon", flag: "🇬🇦", dial: "+241", currency: "XAF", tz: "Africa/Douala" },
  { code: "CG", name: "Congo", flag: "🇨🇬", dial: "+242", currency: "XAF", tz: "Africa/Douala" },
  { code: "CD", name: "RD Congo", flag: "🇨🇩", dial: "+243", currency: "CDF", tz: "Africa/Kinshasa" },
  { code: "TD", name: "Tchad", flag: "🇹🇩", dial: "+235", currency: "XAF", tz: "Africa/Douala" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", dial: "+226", currency: "XOF", tz: "Africa/Abidjan" },
  { code: "ML", name: "Mali", flag: "🇲🇱", dial: "+223", currency: "XOF", tz: "Africa/Abidjan" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", dial: "+229", currency: "XOF", tz: "Africa/Abidjan" },
  { code: "TG", name: "Togo", flag: "🇹🇬", dial: "+228", currency: "XOF", tz: "Africa/Abidjan" },
  { code: "NE", name: "Niger", flag: "🇳🇪", dial: "+227", currency: "XOF", tz: "Africa/Abidjan" },
  { code: "GN", name: "Guinée", flag: "🇬🇳", dial: "+224", currency: "GNF", tz: "Africa/Abidjan" },
  { code: "CF", name: "Centrafrique", flag: "🇨🇫", dial: "+236", currency: "XAF", tz: "Africa/Douala" },
  { code: "GQ", name: "Guinée Équatoriale", flag: "🇬🇶", dial: "+240", currency: "XAF", tz: "Africa/Douala" },
  { code: "MA", name: "Maroc", flag: "🇲🇦", dial: "+212", currency: "MAD", tz: "Africa/Casablanca" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿", dial: "+213", currency: "DZD", tz: "Africa/Algiers" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳", dial: "+216", currency: "TND", tz: "Africa/Tunis" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "+234", currency: "NGN", tz: "Africa/Lagos" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dial: "+233", currency: "GHS", tz: "Africa/Abidjan" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dial: "+254", currency: "KES", tz: "Africa/Nairobi" },
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦", dial: "+27", currency: "ZAR", tz: "Africa/Johannesburg" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬", dial: "+261", currency: "MGA", tz: "Indian/Antananarivo" },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "+33", currency: "EUR", tz: "Europe/Paris" },
];
const countryOf = (code: string) => COUNTRIES.find((c) => c.code === code);
const dialOf = (code: string) => countryOf(code)?.dial || "";

const COMPANY_SIZES = [
  { value: "", label: "Non précisé" },
  { value: "auto", label: "Auto-entrepreneur / Promoteur individuel" },
  { value: "1-10", label: "1 à 10 employés" },
  { value: "11-50", label: "11 à 50 employés" },
  { value: "51-200", label: "51 à 200 employés" },
  { value: "200+", label: "Plus de 200 employés" },
];

// Régimes fiscaux usuels en zone OHADA/CEMAC (l'enseignement est souvent exonéré)
const TAX_REGIMES = [
  { value: "", label: "Non précisé" },
  { value: "exonere", label: "Exonéré (enseignement)" },
  { value: "impot_liberatoire", label: "Impôt libératoire" },
  { value: "reel_simplifie", label: "Régime simplifié (RSI)" },
  { value: "reel_normal", label: "Régime du réel normal" },
  { value: "assujetti_tva", label: "Assujetti à la TVA" },
];

const CURRENCIES = [
  { value: "XAF", label: "FCFA – BEAC (Afrique centrale)" },
  { value: "XOF", label: "FCFA – BCEAO (Afrique de l'Ouest)" },
  { value: "MAD", label: "Dirham marocain (MAD)" },
  { value: "DZD", label: "Dinar algérien (DZD)" },
  { value: "TND", label: "Dinar tunisien (TND)" },
  { value: "NGN", label: "Naira nigérian (NGN)" },
  { value: "GHS", label: "Cedi ghanéen (GHS)" },
  { value: "GNF", label: "Franc guinéen (GNF)" },
  { value: "CDF", label: "Franc congolais (CDF)" },
  { value: "KES", label: "Shilling kényan (KES)" },
  { value: "ZAR", label: "Rand sud-africain (ZAR)" },
  { value: "MGA", label: "Ariary malgache (MGA)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dollar US ($)" },
];

const TIMEZONES = [
  { value: "Africa/Douala", label: "Afrique centrale – UTC+1 (Cameroun, Gabon, Tchad…)" },
  { value: "Africa/Lagos", label: "Nigeria – UTC+1" },
  { value: "Africa/Abidjan", label: "Afrique de l'Ouest – UTC+0 (Côte d'Ivoire, Sénégal, Mali…)" },
  { value: "Africa/Casablanca", label: "Maroc – UTC+1" },
  { value: "Africa/Algiers", label: "Algérie – UTC+1" },
  { value: "Africa/Tunis", label: "Tunisie – UTC+1" },
  { value: "Africa/Kinshasa", label: "RDC (ouest) – UTC+1" },
  { value: "Africa/Nairobi", label: "Afrique de l'Est – UTC+3 (Kenya, Tanzanie…)" },
  { value: "Africa/Johannesburg", label: "Afrique australe – UTC+2" },
  { value: "Indian/Antananarivo", label: "Madagascar – UTC+3" },
  { value: "Europe/Paris", label: "France – UTC+1" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "JJ/MM/AAAA (31/12/2025)" },
  { value: "DD-MM-YYYY", label: "JJ-MM-AAAA (31-12-2025)" },
  { value: "YYYY-MM-DD", label: "AAAA-MM-JJ (2025-12-31)" },
  { value: "MM/DD/YYYY", label: "MM/JJ/AAAA (12/31/2025)" },
];

const TITRE_SUGGESTIONS = [
  "Directeur", "Directrice", "Directeur Général", "Fondateur", "Promoteur",
  "Proviseur", "Principal", "Censeur", "Surveillant Général",
  "Comptable", "Économe", "Secrétaire Général",
];
const TITRE_SUGGESTIONS_EN = [
  "Director", "Director", "Managing Director", "Founder", "Promoter",
  "Principal", "Headteacher", "Dean of Studies", "Head Supervisor",
  "Accountant", "Bursar", "Secretary General",
];

type Signataire = {
  id: string;
  name: string;
  title: string;
  signature_url: string | null;
};

export default function EntrepriseSettingsPage() {
  const { t, locale } = useI18n();
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
  const currencyNames = new Intl.DisplayNames([locale], { type: "currency" });
  const companySizeOptions = COMPANY_SIZES.map((option) => ({
    ...option,
    label: locale === "fr" ? option.label : t("centre", `companySize_${(option.value || "unspecified").replaceAll("-", "_").replace("+", "plus")}`),
  }));
  const taxRegimeOptions = TAX_REGIMES.map((option) => ({
    ...option,
    label: locale === "fr" ? option.label : t("centre", `companyTax_${option.value || "unspecified"}`),
  }));
  const currencyOptions = CURRENCIES.map((option) => ({
    ...option,
    label: locale === "fr" ? option.label : `${currencyNames.of(option.value) || option.value} (${option.value})`,
  }));
  const timezoneOptions = TIMEZONES.map((option) => ({
    ...option,
    label: locale === "fr" ? option.label : option.value.replace("_", " "),
  }));
  const dateFormatOptions = DATE_FORMATS.map((option) => ({
    ...option,
    label: locale === "fr" ? option.label : option.label.replaceAll("JJ", "DD").replaceAll("AAAA", "YYYY"),
  }));
  const searchParams = useSearchParams();
  const isSetup = searchParams.get("setup") === "1";
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerType, setCenterType] = useState("generic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [uploadingAgrement, setUploadingAgrement] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: boolean; raisonSociale?: boolean }>({});

  // --- Identité ---
  const [displayName, setDisplayName] = useState("");
  const [shortName, setShortName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [raisonSociale, setRaisonSociale] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [companySize, setCompanySize] = useState("");
  const [documentColor, setDocumentColor] = useState(BLUE);

  // --- Identifiants légaux ---
  const [agrementNumber, setAgrementNumber] = useState("");
  const [agrementFileUrl, setAgrementFileUrl] = useState<string | null>(null);
  const [ministryMatricule, setMinistryMatricule] = useState("");
  const [rccm, setRccm] = useState("");
  const [niu, setNiu] = useState("");
  const [taxRegime, setTaxRegime] = useState("");

  // --- Localisation & préférences régionales ---
  const [country, setCountry] = useState("CM");
  const [siegeAddress, setSiegeAddress] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [timezone, setTimezone] = useState("Africa/Douala");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  // --- Signataires ---
  const [signataires, setSignataires] = useState<Signataire[]>([]);
  const [removedSigIds, setRemovedSigIds] = useState<string[]>([]);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("center_id").eq("id", session.user.id).single();
    if (pErr) console.error("profiles:", pErr.message);

    const cId = profile?.center_id || null;
    setCenterId(cId);
    if (!cId) { setLoading(false); return; }

    const { data: center, error: cErr } = await supabase
      .from("centers").select("name, center_type").eq("id", cId).single();
    if (cErr) console.error("centers:", cErr.message);
    if (center) { setDisplayName(center.name || ""); setCenterType(center.center_type || "generic"); }

    const { data: b, error: bErr } = await supabase
      .from("center_branding").select("*").eq("center_id", cId).maybeSingle();
    if (bErr) console.error("center_branding:", bErr.message);
    if (b) {
      setRaisonSociale(b.legal_name || "");
      setLogoUrl(b.logo_url);
      setFaviconUrl(b.favicon_url);
      setShortName(b.short_name || "");
      setSlogan(b.slogan || "");
      setCompanySize(b.company_size || "");
      setDocumentColor(b.document_color || BLUE);
      setAgrementNumber(b.agrement_number || "");
      setAgrementFileUrl(b.agrement_file_url);
      setMinistryMatricule(b.ministry_matricule || "");
      setRccm(b.rccm_number || "");
      setNiu(b.niu_number || "");
      setTaxRegime(b.tax_regime || "");
      setSiegeAddress(b.siege_address || "");
      setInstitutionalEmail(b.institutional_email || "");
      setCurrency(b.default_currency || "XAF");
      setTimezone(b.timezone || "Africa/Douala");
      setDateFormat(b.date_format || "DD/MM/YYYY");
      setStampUrl(b.stamp_url);

      const c = b.country || "CM";
      setCountry(c);
      const dial = dialOf(c);
      const full = b.siege_phone || "";
      setPhoneLocal(dial && full.startsWith(dial) ? full.slice(dial.length).trim() : full);

      // Données déjà configurées : verrouiller pour affichage
      setIsLocked(true);
    }

    const { data: sigs, error: sErr } = await supabase
      .from("bulletin_signatures").select("*")
      .eq("center_id", cId).order("display_order", { ascending: true });
    if (sErr) console.error("bulletin_signatures:", sErr.message);
    if (sigs) {
      setSignataires(sigs.map((s) => ({
        id: s.id, name: s.name || "", title: s.title || "",
        signature_url: s.signature_url,
      })));
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sélection d'un pays -> pré-remplit indicatif (affiché), devise et fuseau
  const onCountryChange = (code: string) => {
    setCountry(code);
    const c = countryOf(code);
    if (c) { setCurrency(c.currency); setTimezone(c.tz); }
  };

  // -------------------------------------------------------------------------
  // Uploads (erreurs jamais silencieuses — piège #3)
  // -------------------------------------------------------------------------
  const extOf = (f: File) => f.name.split(".").pop() || "png";

  const uploadTo = async (
    bucket: string, path: string, file: File,
    setUrl: (u: string) => void, setBusy: (b: boolean) => void,
  ) => {
    setBusy(true);
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { alert("Erreur lors de l'envoi : " + error.message); setBusy(false); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setUrl(data.publicUrl + "?t=" + Date.now());
    setBusy(false);
  };

  const uploadLogo = (f: File) =>
    centerId && uploadTo("center-logos", `${centerId}/logo.${extOf(f)}`, f, setLogoUrl, setUploadingLogo);
  const uploadFavicon = (f: File) =>
    centerId && uploadTo("center-logos", `${centerId}/favicon.${extOf(f)}`, f, setFaviconUrl, setUploadingFavicon);
  const uploadStamp = (f: File) =>
    centerId && uploadTo("center-logos", `${centerId}/stamp.${extOf(f)}`, f, setStampUrl, setUploadingStamp);

  const uploadAgrement = async (file: File) => {
    if (!centerId) return;
    setUploadingAgrement(true);
    const path = `${centerId}/agrement.${extOf(file)}`;

    // Supprime les anciennes versions avec une autre extension (sinon "agrement.pdf"
    // + "agrement.jpg" coexistent et l'affichage peut retomber sur l'ancien fichier).
    const { data: existing } = await supabase.storage.from("center-documents").list(centerId);
    const staleFiles = (existing || []).filter((f) => f.name.startsWith("agrement.") && f.name !== `agrement.${extOf(file)}`);
    if (staleFiles.length > 0) {
      await supabase.storage.from("center-documents").remove(staleFiles.map((f) => `${centerId}/${f.name}`));
    }

    const { error } = await supabase.storage.from("center-documents").upload(path, file, { upsert: true });
    if (error) { alert("Erreur lors de l'envoi : " + error.message); setUploadingAgrement(false); return; }
    const { data } = supabase.storage.from("center-documents").getPublicUrl(path);
    // Persiste immediatement : sinon la valeur ne vit qu'en memoire locale et
    // disparait si l'utilisateur actualise avant de cliquer "Enregistrer".
    const { error: saveError } = await supabase
      .from("center_branding")
      .upsert({ center_id: centerId, agrement_file_url: data.publicUrl });
    if (saveError) { alert("Document televerse mais non enregistre : " + saveError.message); setUploadingAgrement(false); return; }
    setAgrementFileUrl(data.publicUrl);
    setUploadingAgrement(false);
  };

  const removeAgrement = async () => {
    if (!centerId) return;
    const { error } = await supabase
      .from("center_branding")
      .upsert({ center_id: centerId, agrement_file_url: null });
    if (error) { alert("Erreur lors de la suppression : " + error.message); return; }
    setAgrementFileUrl(null);
  };

  // Ouvre le document via un blob authentifie (evite d'exposer l'URL Supabase
  // brute dans la barre d'adresse du navigateur).
  const openAgrementDocument = async () => {
    if (!centerId) return;
    const { data: files, error: listError } = await supabase.storage.from("center-documents").list(centerId);
    const file = files?.find((f) => f.name.startsWith("agrement."));
    if (listError || !file) { alert("Document introuvable."); return; }
    const { data, error } = await supabase.storage.from("center-documents").download(`${centerId}/${file.name}`);
    if (error || !data) { alert("Impossible d'ouvrir le document."); return; }
    const url = URL.createObjectURL(data);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // -------------------------------------------------------------------------
  // Signataires
  // -------------------------------------------------------------------------
  const addSignataire = () => setSignataires((p) => [
    ...p, { id: crypto.randomUUID(), name: "", title: "", signature_url: null },
  ]);
  const updateSignataire = (id: string, patch: Partial<Signataire>) =>
    setSignataires((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSignataire = (id: string) => {
    setRemovedSigIds((p) => [...p, id]);
    setSignataires((p) => p.filter((s) => s.id !== id));
  };
  const moveSignataire = (index: number, dir: -1 | 1) => {
    setSignataires((p) => {
      const next = [...p];
      const j = index + dir;
      if (j < 0 || j >= next.length) return p;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };
  const uploadSignatureImg = async (sigId: string, file: File) => {
    if (!centerId) return;
    const path = `${centerId}/signatures/${sigId}.${extOf(file)}`;
    const { error } = await supabase.storage.from("center-logos").upload(path, file, { upsert: true });
    if (error) { alert("Erreur signature : " + error.message); return; }
    const { data } = supabase.storage.from("center-logos").getPublicUrl(path);
    updateSignataire(sigId, { signature_url: data.publicUrl + "?t=" + Date.now() });
  };

  // -------------------------------------------------------------------------
  // Enregistrement
  // -------------------------------------------------------------------------
  const save = async () => {
    if (!centerId) return;

    // Champs obligatoires : identité documentaire minimale
    const nextErrors = {
      displayName: !displayName.trim(),
      raisonSociale: !raisonSociale.trim(),
    };
    if (nextErrors.displayName || nextErrors.raisonSociale) {
      setErrors(nextErrors);
      alert("Merci de renseigner au moins le nom affiché et la raison sociale.");
      return;
    }
    setErrors({});
    setSaving(true);

    const fullPhone = phoneLocal.trim() ? `${dialOf(country)} ${phoneLocal.trim()}`.trim() : null;

    const { error: e1 } = await supabase
      .from("centers").update({ name: displayName.trim() }).eq("id", centerId);
    if (e1) { alert("Erreur (nom affiché) : " + e1.message); setSaving(false); return; }

    const { error: e2 } = await supabase.from("center_branding").upsert({
      center_id: centerId,
      legal_name: raisonSociale.trim() || null,
      short_name: shortName.trim() || null,
      slogan: slogan.trim() || null,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      company_size: companySize || null,
      document_color: documentColor || null,
      agrement_number: agrementNumber.trim() || null,
      agrement_file_url: agrementFileUrl,
      ministry_matricule: ministryMatricule.trim() || null,
      rccm_number: rccm.trim() || null,
      niu_number: niu.trim() || null,
      tax_regime: taxRegime || null,
      country: country || null,
      siege_address: siegeAddress.trim() || null,
      siege_phone: fullPhone,
      institutional_email: institutionalEmail.trim() || null,
      default_currency: currency || null,
      timezone: timezone || null,
      date_format: dateFormat || null,
      stamp_url: stampUrl,
    });
    if (e2) { alert("Erreur (branding) : " + e2.message); setSaving(false); return; }

    const rows = signataires
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        id: s.id, center_id: centerId, name: s.name.trim(),
        title: s.title.trim() || null, signature_url: s.signature_url, display_order: i,
      }));
    if (rows.length) {
      const { error: e3 } = await supabase.from("bulletin_signatures").upsert(rows);
      if (e3) { alert("Erreur (signataires) : " + e3.message); setSaving(false); return; }
    }
    if (removedSigIds.length) {
      const { error: e4 } = await supabase.from("bulletin_signatures").delete().in("id", removedSigIds);
      if (e4) { alert("Erreur (suppression signataire) : " + e4.message); setSaving(false); return; }
      setRemovedSigIds([]);
    }

    setSaving(false);
    setIsLocked(true);
    setShowSuccessAnim(true);
    setTimeout(() => setShowSuccessAnim(false), 2200);
  };

  if (loading) return <CenterPageLoading embedded />;

  return (
    <div className="relative w-full min-w-0">
      <SetupBanner step="settings" centerType={centerType} />
      {/* Animation coche verte centrale */}
      {showSuccessAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-3 border border-neutral-200">
            <CheckCircle2 size={60} className="text-emerald-500" />
            <p className="text-lg font-black text-emerald-700">{t("centre", "liveSavedSuccessfully")}</p>
          </div>
        </div>
      )}

      <div className={isSetup
        ? "w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14 py-5 sm:py-8"
        : "w-full min-w-0"
      }>
      {/* ============================= IDENTITÉ ============================= */}
      <Section icon={Building2} title={t("centre", "companyIdentityTitle")}
        description={t("centre", "companyIdentityDescription")}>
        <div className="flex flex-wrap items-end gap-6 sm:gap-8">
          <LogoUpload label={t("centre", "documentsLogo")} url={logoUrl} busy={uploadingLogo} accent={BLUE}
            accept="image/png,image/jpeg" onPick={uploadLogo} fit="cover" disabled={isLocked} />
          <LogoUpload label="Favicon" url={faviconUrl} busy={uploadingFavicon} accent={ORANGE}
            accept="image/png,image/x-icon,image/svg+xml" onPick={uploadFavicon} fit="contain" disabled={isLocked} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t("centre", "companyDisplayName")} value={displayName} required error={errors.displayName} errorMessage={t("centre", "companyRequiredField")} disabled={isLocked}
            onChange={(v) => { setDisplayName(v); errors.displayName && setErrors((e) => ({ ...e, displayName: false })); }}
            placeholder="Ex: CSIC" />
          <Field label={t("centre", "companyShortName")} hint="SMS & mobile" value={shortName} onChange={setShortName} placeholder="Ex: CSIC" disabled={isLocked} />
        </div>
        <Field label={t("centre", "companyLegalName")} value={raisonSociale} required error={errors.raisonSociale} errorMessage={t("centre", "companyRequiredField")} disabled={isLocked}
          onChange={(v) => { setRaisonSociale(v); errors.raisonSociale && setErrors((e) => ({ ...e, raisonSociale: false })); }}
          placeholder="Ex: Complexe Scolaire International Les Champions" />
        <Field label={t("centre", "companySlogan")} value={slogan} onChange={setSlogan} placeholder={t("centre", "companySloganPlaceholder")} disabled={isLocked} />

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField label={t("centre", "companySize")} value={companySize} onChange={setCompanySize} options={companySizeOptions} disabled={isLocked} />
          <div>
            <FieldLabel label={t("centre", "companyDocumentColor")} />
            <div className={`flex items-center gap-3 h-11 px-3 rounded-xl border border-neutral-200 ${isLocked ? "bg-neutral-50" : "bg-white"}`}>
              <input type="color" value={documentColor} onChange={(e) => setDocumentColor(e.target.value)}
                disabled={isLocked} className="w-7 h-7 rounded-md border cursor-pointer p-0 disabled:cursor-default disabled:opacity-60" />
              <span className="text-sm font-semibold text-neutral-500">{documentColor}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ===================== IDENTIFIANTS LÉGAUX ===================== */}
      <Section icon={ScrollText} title={t("centre", "companyLegalIdsTitle")}
        description={t("centre", "companyLegalIdsDescription")}>
        <Field label={t("centre", "companyApprovalNumber")} value={agrementNumber} onChange={setAgrementNumber}
          placeholder={t("centre", "companyApprovalPlaceholder")} disabled={isLocked} />

        <div>
          <FieldLabel label={t("centre", "companyApprovalDocument")} />
          {agrementFileUrl ? (
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-3">
              <button
                onClick={openAgrementDocument}
                className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white hover:opacity-90 transition"
                style={{ backgroundColor: BLUE }}
              >
                <ScrollText size={14} /> {t("centre", "companyViewDocument")}
              </button>
              <span className="flex-1" />
              <label className="flex items-center gap-1 p-1 text-neutral-400 hover:text-blue-600 cursor-pointer" title={t("centre", "companyReplace")}>
                {uploadingAgrement ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAgrement(e.target.files[0])} />
              </label>
              <button onClick={removeAgrement} className="p-1 text-neutral-400 hover:text-red-500" title={t("centre", "companyDelete")}><X size={15} /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-neutral-300 cursor-pointer text-sm font-semibold text-neutral-400 hover:border-orange-300 hover:text-neutral-600 transition">
              {uploadingAgrement ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
              {t("centre", "companyUploadDocument")}
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAgrement(e.target.files[0])} />
            </label>
          )}
        </div>

        <Field label={t("centre", "companyMinistryId")} value={ministryMatricule} onChange={setMinistryMatricule}
          placeholder={t("centre", "companyMinistryIdPlaceholder")} disabled={isLocked} />

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="N° RCCM" hint="Registre du Commerce" value={rccm} onChange={setRccm} disabled={isLocked} />
          <Field label="NIU" hint="N° contribuable" value={niu} onChange={setNiu} disabled={isLocked} />
        </div>
        <SelectField label={t("centre", "companyTaxRegime")} value={taxRegime} onChange={setTaxRegime} options={taxRegimeOptions} disabled={isLocked} />
      </Section>

      {/* ============== LOCALISATION & PRÉFÉRENCES RÉGIONALES ============== */}
      <Section icon={Globe2} title={t("centre", "companyRegionalTitle")}
        description={t("centre", "companyRegionalDescription")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel label={t("centre", "settingsCountry")} />
            <div className="relative">
              <select value={country} onChange={(e) => onCountryChange(e.target.value)} disabled={isLocked}
                className={`w-full h-11 pl-3.5 pr-9 rounded-xl border border-neutral-200 text-sm font-semibold outline-none appearance-none transition focus:border-[#11224E] focus:ring-4 focus:ring-[#11224E]/5 ${isLocked ? "bg-neutral-50 text-neutral-500 cursor-default" : "bg-white"}`}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag}  {locale === "fr" ? c.name : countryNames.of(c.code) || c.name} ({c.dial})</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <FieldLabel label={t("centre", "companyOfficialPhone")} />
            <div className={`flex items-stretch rounded-xl border border-neutral-200 overflow-hidden focus-within:border-[#11224E] focus-within:ring-4 focus-within:ring-[#11224E]/5 transition ${isLocked ? "bg-neutral-50" : "bg-white"}`}>
              <span className="flex items-center gap-1.5 px-3 bg-neutral-50 border-r border-neutral-200 text-sm font-bold text-neutral-600 shrink-0">
                {countryOf(country)?.flag} {dialOf(country)}
              </span>
              <input value={phoneLocal} onChange={(e) => setPhoneLocal(e.target.value)} placeholder="6 XX XX XX XX"
                disabled={isLocked}
                className="flex-1 h-11 px-3 text-sm font-medium outline-none bg-transparent disabled:text-neutral-500 disabled:cursor-default" />
            </div>
          </div>
        </div>

        <Field label={t("centre", "companyHeadOfficeAddress")} value={siegeAddress} onChange={setSiegeAddress} placeholder={t("centre", "companyAddressPlaceholder")} disabled={isLocked} />
        <Field label={t("centre", "companyInstitutionalEmail")} type="email" value={institutionalEmail} onChange={setInstitutionalEmail} placeholder="info@ecole.cm" disabled={isLocked} />

        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField label={t("centre", "companyDefaultCurrency")} value={currency} onChange={setCurrency} options={currencyOptions} disabled={isLocked} />
          <SelectField label={t("centre", "companyDateFormat")} value={dateFormat} onChange={setDateFormat} options={dateFormatOptions} disabled={isLocked} />
        </div>
        <SelectField label={t("centre", "companyTimezone")} value={timezone} onChange={setTimezone} options={timezoneOptions} disabled={isLocked} />
      </Section>

      {/* ===================== SIGNATAIRES OFFICIELS ===================== */}
      <Section icon={Signature} title={t("centre", "companySignatoriesTitle")}
        description={t("centre", "companySignatoriesDescription")}>
        {!isLocked && (
          <div className="flex justify-end">
            <button onClick={addSignataire} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide px-3.5 h-9 rounded-lg text-white transition hover:opacity-90" style={{ backgroundColor: ORANGE }}>
              <Plus size={14} /> {t("centre", "companyAddSignatory")}
            </button>
          </div>
        )}

        {signataires.length === 0 && (
          <p className="text-sm text-neutral-400 italic">{t("centre", "companyNoSignatory")}</p>
        )}

        <div className="space-y-3">
          {signataires.map((s, i) => (
            <div key={s.id} className="border border-neutral-200 rounded-2xl p-4 space-y-3 bg-neutral-50/50">
              <div className="flex items-start gap-3">
                {!isLocked && (
                  <div className="flex flex-col gap-0.5 pt-6">
                    <button onClick={() => moveSignataire(i, -1)} disabled={i === 0} className="p-1 text-neutral-400 disabled:opacity-30 hover:text-slate-900"><ChevronUp size={15} /></button>
                    <button onClick={() => moveSignataire(i, 1)} disabled={i === signataires.length - 1} className="p-1 text-neutral-400 disabled:opacity-30 hover:text-slate-900"><ChevronDown size={15} /></button>
                  </div>
                )}
                <div className="flex-1 grid sm:grid-cols-2 gap-3">
                  <Field label={t("centre", "companyFullName")} value={s.name} onChange={(v) => updateSignataire(s.id, { name: v })} placeholder={t("centre", "companyFullNamePlaceholder")} disabled={isLocked} />
                  <div>
                    <FieldLabel label={t("centre", "companyOfficialTitle")} />
                    <input list="titre-suggestions" value={s.title}
                      onChange={(e) => updateSignataire(s.id, { title: e.target.value })} placeholder={t("centre", "companyTitlePlaceholder")}
                      disabled={isLocked}
                      className={`w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-sm font-medium outline-none transition focus:border-[#11224E] focus:ring-4 focus:ring-[#11224E]/5 ${isLocked ? "bg-neutral-50 text-neutral-500 cursor-default" : "bg-white"}`} />
                  </div>
                </div>
                {!isLocked && (
                  <button onClick={() => removeSignataire(s.id)} className="p-1.5 text-neutral-300 hover:text-red-500 pt-6"><Trash2 size={16} /></button>
                )}
              </div>
              <div className="flex items-center gap-3 sm:pl-9">
                {s.signature_url ? (
                  <div className="flex items-center gap-2">
                    <img src={s.signature_url} alt="signature" className="h-10 object-contain border rounded bg-white px-2" />
                    {!isLocked && <button onClick={() => updateSignataire(s.id, { signature_url: null })} className="p-1 text-neutral-400 hover:text-red-500"><X size={13} /></button>}
                  </div>
                ) : !isLocked ? (
                  <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-dashed border-neutral-300 cursor-pointer text-xs font-semibold text-neutral-400 hover:border-orange-300 transition">
                    <PenLine size={13} /> {t("centre", "companyScannedSignature")}
                    <input type="file" accept="image/png,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadSignatureImg(s.id, e.target.files[0])} />
                  </label>
                ) : (
                  <span className="text-xs text-neutral-400 italic">{t("centre", "companyNoDigitalSignature")}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <datalist id="titre-suggestions">
          {(locale === "fr" ? TITRE_SUGGESTIONS : TITRE_SUGGESTIONS_EN).map((title) => <option key={title} value={title} />)}
        </datalist>

        <div className="pt-2">
          <FieldLabel label={t("centre", "companyOfficialStamp")} />
          {stampUrl ? (
            <div className="flex items-center gap-2">
              <img src={stampUrl} alt="cachet" className="h-16 object-contain border rounded-xl bg-white p-2" />
              {!isLocked && <button onClick={() => setStampUrl(null)} className="p-1 text-neutral-400 hover:text-red-500"><X size={14} /></button>}
            </div>
          ) : !isLocked ? (
            <label className="flex items-center justify-center gap-2 h-11 w-full rounded-xl border border-dashed border-neutral-300 cursor-pointer text-sm font-semibold text-neutral-400 hover:border-orange-300 hover:text-neutral-600 transition">
              {uploadingStamp ? <Loader2 size={15} className="animate-spin" /> : <Stamp size={15} />}
              {t("centre", "companyUploadStamp")}
              <input type="file" accept="image/png,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadStamp(e.target.files[0])} />
            </label>
          ) : (
            <div className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center px-3.5 text-sm text-neutral-400">{t("centre", "companyNoStamp")}</div>
          )}
        </div>
      </Section>

      {/* Barre d'action collante */}
      <div
        className={`sticky bottom-0 z-20 py-4 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent ${
          isSetup
            ? "-mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-14 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14"
            : "-mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10"
        }`}
      >
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          {isLocked ? (
            <button onClick={() => setIsLocked(false)}
              className="h-12 w-full sm:w-auto px-8 rounded-xl text-xs font-black uppercase tracking-widest border border-neutral-200 text-neutral-600 bg-white flex items-center justify-center gap-2 shadow-sm hover:border-[#11224E] hover:text-[#11224E] transition">
              <PenLine size={16} /> {t("centre", "liveEdit")}
            </button>
          ) : (
            <button onClick={save} disabled={saving}
              className="h-12 w-full sm:w-auto px-8 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition hover:opacity-95"
              style={{ backgroundColor: BLUE }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saving ? t("centre", "liveSaving") : t("centre", "liveSave")}
            </button>
          )}
        </div>
      </div>

      {/* Footer setup (fixé en bas, visible uniquement en mode ?setup=1) */}
      <SetupFooter step="settings" centerType={centerType} onSave={save} saving={saving} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers UI
// ---------------------------------------------------------------------------
function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] xl:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] gap-5 sm:gap-6 lg:gap-10 xl:gap-12 py-8 sm:py-10 border-b border-neutral-200/70 first:pt-0 last:border-b-0">
      <div className="lg:sticky lg:top-24 self-start min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: BLUE }}>
            <Icon size={16} className="text-white" />
          </div>
          <h2 className="text-base font-black" style={{ color: BLUE }}>{title}</h2>
        </div>
        <p className="text-[13px] text-neutral-500 mt-2.5 leading-relaxed">{description}</p>
      </div>
      <div className="space-y-5 w-full min-w-0">{children}</div>
    </section>
  );
}

function FieldLabel({ label, hint, required }: { label: string; hint?: string; required?: boolean }) {
  return (
    <label className="flex items-center gap-2 mb-1.5">
      <span className="text-xs font-bold text-neutral-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      {hint && <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-300">{hint}</span>}
    </label>
  );
}

function Field({ label, value, onChange, placeholder, required, error, errorMessage, hint, type = "text", disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  required?: boolean; error?: boolean; errorMessage?: string; hint?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} required={required} />
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className={`w-full h-11 px-3.5 rounded-xl border text-sm font-medium outline-none transition focus:ring-4 ${disabled ? "bg-neutral-50 text-neutral-500 cursor-default" : "bg-white"} ${error ? "border-red-400 focus:ring-red-100" : "border-neutral-200 focus:border-[#11224E] focus:ring-[#11224E]/5"}`} />
      {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{errorMessage}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
          className={`w-full h-11 pl-3.5 pr-9 rounded-xl border border-neutral-200 text-sm font-medium outline-none appearance-none transition focus:border-[#11224E] focus:ring-4 focus:ring-[#11224E]/5 ${disabled ? "bg-neutral-50 text-neutral-500 cursor-default" : "bg-white"}`}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      </div>
    </div>
  );
}

function LogoUpload({ label, url, busy, accent, accept, onPick, fit, disabled }: {
  label: string; url: string | null; busy: boolean; accent: string; accept: string;
  onPick: (f: File) => void; fit: "cover" | "contain"; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20 shrink-0">
        {url ? (
          <img src={url} alt={label} className={`w-20 h-20 rounded-2xl border ${fit === "cover" ? "object-cover" : "object-contain bg-neutral-50 p-2.5"}`} />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 border border-dashed border-neutral-300 flex items-center justify-center text-neutral-300 text-[10px] font-semibold uppercase">{label}</div>
        )}
        {!disabled && (
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow" style={{ backgroundColor: accent }}>
            <Camera size={12} className="text-white" />
            <input type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
          </label>
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{busy ? "Envoi…" : label}</span>
    </div>
  );
}
