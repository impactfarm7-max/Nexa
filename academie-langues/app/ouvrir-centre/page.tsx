"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, ArrowRight, ArrowLeft, Check,
  Loader2, Eye, EyeOff, Award, GraduationCap, Flag,
  ChevronDown, type LucideIcon,
} from "lucide-react";
import { BRAND } from "@/app/utils/brand";
import {
  centerTypeLabel,
  type CenterTypeCode,
} from "@/app/data/center-types";
import {
  NEXA_OFFERS,
  NEXA_OFFER_KEYS,
  type NexaOfferKey,
} from "@/app/data/nexaOffers";
import MarketingChrome from "@/app/components/landing/MarketingChrome";
import { checkPasswordStrength, isPasswordStrong } from "@/app/utils/password-policy";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = BRAND.blue;
const ORANGE = BRAND.orange;
const CREAM = "#FFFBF7";

type CenterType = CenterTypeCode | null;
/** Famille UI — native ouvre une sous-carte ; libre sélectionne generic directement. */
type ProgramFamily = "native" | "generic" | null;

const NATIVE_DISCIPLINES: {
  id: Extract<CenterTypeCode, "tcf_canada">;
  titleKey: string;
  blurbKey: string;
  pointKeys: string[];
}[] = [
  {
    id: "tcf_canada",
    titleKey: "ouvrirCentreDiscTcfCanadaTitle",
    blurbKey: "ouvrirCentreDiscTcfCanadaBlurb",
    pointKeys: [
      "ouvrirCentreDiscTcfCanadaPoint1",
      "ouvrirCentreDiscTcfCanadaPoint2",
      "ouvrirCentreDiscTcfCanadaPoint3",
    ],
  },
];

const PROGRAMS: {
  family: Exclude<ProgramFamily, null>;
  /** Si défini : sélection directe de center_type. Native = null (sous-carte). */
  centerType: CenterTypeCode | null;
  icon: LucideIcon;
  titleKey: string;
  subtitleKey: string;
  blurbKey: string;
  pointKeys: string[];
  accent: string;
}[] = [
  {
    family: "native",
    centerType: null,
    icon: Award,
    titleKey: "ouvrirCentreProgramNativeTitle",
    subtitleKey: "ouvrirCentreProgramNativeSubtitle",
    blurbKey: "ouvrirCentreProgramNativeBlurb",
    pointKeys: [
      "ouvrirCentreProgramNativePoint1",
      "ouvrirCentreProgramNativePoint2",
      "ouvrirCentreProgramNativePoint3",
    ],
    accent: ORANGE,
  },
  {
    family: "generic",
    centerType: "generic",
    icon: GraduationCap,
    titleKey: "ouvrirCentreProgramGenericTitle",
    subtitleKey: "ouvrirCentreProgramGenericSubtitle",
    blurbKey: "ouvrirCentreProgramGenericBlurb",
    pointKeys: [
      "ouvrirCentreProgramGenericPoint1",
      "ouvrirCentreProgramGenericPoint2",
      "ouvrirCentreProgramGenericPoint3",
    ],
    accent: ORANGE,
  },
];

// ─── 54 pays africains ────────────────────────────────────────────────────────
const AFRICA_54 = [
  { code: "DZ", name: "Algérie",             flag: "🇩🇿", dial: "+213", regions: ["Alger", "Oran", "Constantine", "Annaba", "Sétif", "Blida", "Batna", "Tlemcen", "Tizi Ouzou"] },
  { code: "AO", name: "Angola",              flag: "🇦🇴", dial: "+244", regions: ["Luanda", "Benguela", "Huíla", "Huambo", "Cabinda"] },
  { code: "BJ", name: "Bénin",               flag: "🇧🇯", dial: "+229", regions: ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi", "Natitingou"] },
  { code: "BW", name: "Botswana",            flag: "🇧🇼", dial: "+267", regions: ["Gaborone", "Francistown", "Maun", "Kasane"] },
  { code: "BF", name: "Burkina Faso",        flag: "🇧🇫", dial: "+226", regions: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora", "Ouahigouya"] },
  { code: "BI", name: "Burundi",             flag: "🇧🇮", dial: "+257", regions: ["Bujumbura", "Gitega", "Ngozi", "Rumonge"] },
  { code: "CV", name: "Cabo Verde",          flag: "🇨🇻", dial: "+238", regions: ["Praia", "Mindelo", "Santa Maria"] },
  { code: "CM", name: "Cameroun",            flag: "🇨🇲", dial: "+237", regions: ["Centre", "Littoral", "Ouest", "Sud-Ouest", "Nord-Ouest", "Nord", "Extrême-Nord", "Adamaoua", "Est", "Sud"] },
  { code: "CF", name: "Centrafrique",        flag: "🇨🇫", dial: "+236", regions: ["Bangui", "Bimbo", "Mbaïki", "Berberati"] },
  { code: "KM", name: "Comores",             flag: "🇰🇲", dial: "+269", regions: ["Moroni", "Mutsamudu", "Fomboni"] },
  { code: "CG", name: "Congo",               flag: "🇨🇬", dial: "+242", regions: ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi"] },
  { code: "CD", name: "RD Congo",            flag: "🇨🇩", dial: "+243", regions: ["Kinshasa", "Lubumbashi", "Mbuji-Mayi", "Kananga", "Kisangani", "Bukavu", "Goma"] },
  { code: "CI", name: "Côte d'Ivoire",       flag: "🇨🇮", dial: "+225", regions: ["Abidjan", "Yamoussoukro", "Bouaké", "Daloa", "San Pédro", "Man", "Korhogo"] },
  { code: "DJ", name: "Djibouti",            flag: "🇩🇯", dial: "+253", regions: ["Djibouti", "Arta", "Dikhil", "Obock"] },
  { code: "EG", name: "Égypte",              flag: "🇪🇬", dial: "+20",  regions: ["Le Caire", "Alexandrie", "Gizeh", "Louxor", "Assouan", "Port-Saïd"] },
  { code: "GQ", name: "Guinée Équatoriale",  flag: "🇬🇶", dial: "+240", regions: ["Malabo", "Bata", "Mongomo"] },
  { code: "ER", name: "Érythrée",            flag: "🇪🇷", dial: "+291", regions: ["Asmara", "Keren", "Massawa"] },
  { code: "SZ", name: "Eswatini",            flag: "🇸🇿", dial: "+268", regions: ["Mbabane", "Manzini", "Lobamba"] },
  { code: "ET", name: "Éthiopie",            flag: "🇪🇹", dial: "+251", regions: ["Addis-Abeba", "Dire Dawa", "Mekele", "Bahir Dar", "Hawassa", "Gondar"] },
  { code: "GA", name: "Gabon",               flag: "🇬🇦", dial: "+241", regions: ["Libreville", "Port-Gentil", "Franceville", "Oyem", "Lambaréné"] },
  { code: "GM", name: "Gambie",              flag: "🇬🇲", dial: "+220", regions: ["Banjul", "Serekunda", "Brikama"] },
  { code: "GH", name: "Ghana",               flag: "🇬🇭", dial: "+233", regions: ["Accra", "Kumasi", "Tamale", "Sekondi-Takoradi", "Cape Coast"] },
  { code: "GN", name: "Guinée",              flag: "🇬🇳", dial: "+224", regions: ["Conakry", "Labé", "Kankan", "Kindia", "N'Zérékoré"] },
  { code: "GW", name: "Guinée-Bissau",       flag: "🇬🇼", dial: "+245", regions: ["Bissau", "Bafatá", "Gabú"] },
  { code: "KE", name: "Kenya",               flag: "🇰🇪", dial: "+254", regions: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
  { code: "LS", name: "Lesotho",             flag: "🇱🇸", dial: "+266", regions: ["Maseru", "Teyateyaneng", "Mafeteng"] },
  { code: "LR", name: "Libéria",             flag: "🇱🇷", dial: "+231", regions: ["Monrovia", "Gbarnga", "Kakata"] },
  { code: "LY", name: "Libye",               flag: "🇱🇾", dial: "+218", regions: ["Tripoli", "Benghazi", "Misrata", "Sebha"] },
  { code: "MG", name: "Madagascar",          flag: "🇲🇬", dial: "+261", regions: ["Antananarivo", "Toamasina", "Antsirabe", "Fianarantsoa", "Mahajanga"] },
  { code: "MW", name: "Malawi",              flag: "🇲🇼", dial: "+265", regions: ["Lilongwe", "Blantyre", "Mzuzu", "Zomba"] },
  { code: "ML", name: "Mali",                flag: "🇲🇱", dial: "+223", regions: ["Bamako", "Sikasso", "Mopti", "Ségou", "Koutiala", "Kayes"] },
  { code: "MR", name: "Mauritanie",          flag: "🇲🇷", dial: "+222", regions: ["Nouakchott", "Nouadhibou", "Rosso"] },
  { code: "MU", name: "Maurice",             flag: "🇲🇺", dial: "+230", regions: ["Port-Louis", "Beau-Bassin", "Vacoas-Phoenix"] },
  { code: "MA", name: "Maroc",               flag: "🇲🇦", dial: "+212", regions: ["Casablanca", "Rabat", "Fès", "Marrakech", "Tanger", "Agadir", "Meknès", "Oujda"] },
  { code: "MZ", name: "Mozambique",          flag: "🇲🇿", dial: "+258", regions: ["Maputo", "Matola", "Beira", "Nampula"] },
  { code: "NA", name: "Namibie",             flag: "🇳🇦", dial: "+264", regions: ["Windhoek", "Rundu", "Walvis Bay", "Swakopmund"] },
  { code: "NE", name: "Niger",               flag: "🇳🇪", dial: "+227", regions: ["Niamey", "Zinder", "Maradi", "Tahoua", "Agadez"] },
  { code: "NG", name: "Nigeria",             flag: "🇳🇬", dial: "+234", regions: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Kaduna", "Enugu"] },
  { code: "RW", name: "Rwanda",              flag: "🇷🇼", dial: "+250", regions: ["Kigali", "Butare", "Gisenyi", "Ruhengeri"] },
  { code: "ST", name: "Sao Tomé-et-Príncipe",flag: "🇸🇹", dial: "+239", regions: ["São Tomé", "Trindade"] },
  { code: "SN", name: "Sénégal",             flag: "🇸🇳", dial: "+221", regions: ["Dakar", "Thiès", "Touba", "Ziguinchor", "Saint-Louis", "Kaolack"] },
  { code: "SC", name: "Seychelles",          flag: "🇸🇨", dial: "+248", regions: ["Victoria", "Anse Royale"] },
  { code: "SL", name: "Sierra Leone",        flag: "🇸🇱", dial: "+232", regions: ["Freetown", "Bo", "Kenema", "Makeni"] },
  { code: "SO", name: "Somalie",             flag: "🇸🇴", dial: "+252", regions: ["Mogadiscio", "Hargeisa", "Kismaayo"] },
  { code: "ZA", name: "Afrique du Sud",      flag: "🇿🇦", dial: "+27",  regions: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth"] },
  { code: "SS", name: "Soudan du Sud",       flag: "🇸🇸", dial: "+211", regions: ["Djouba", "Wau", "Malakal"] },
  { code: "SD", name: "Soudan",              flag: "🇸🇩", dial: "+249", regions: ["Khartoum", "Omdurman", "Port-Soudan"] },
  { code: "TZ", name: "Tanzanie",            flag: "🇹🇿", dial: "+255", regions: ["Dodoma", "Dar es Salaam", "Mwanza", "Arusha", "Zanzibar"] },
  { code: "TD", name: "Tchad",               flag: "🇹🇩", dial: "+235", regions: ["N'Djamena", "Moundou", "Sarh", "Abéché"] },
  { code: "TG", name: "Togo",                flag: "🇹🇬", dial: "+228", regions: ["Lomé", "Sokodé", "Kara", "Kpalimé", "Atakpamé"] },
  { code: "TN", name: "Tunisie",             flag: "🇹🇳", dial: "+216", regions: ["Tunis", "Sfax", "Sousse", "Bizerte", "Gabès"] },
  { code: "UG", name: "Ouganda",             flag: "🇺🇬", dial: "+256", regions: ["Kampala", "Gulu", "Lira", "Mbarara"] },
  { code: "ZM", name: "Zambie",              flag: "🇿🇲", dial: "+260", regions: ["Lusaka", "Kitwe", "Ndola", "Livingstone"] },
  { code: "ZW", name: "Zimbabwe",            flag: "🇿🇼", dial: "+263", regions: ["Harare", "Bulawayo", "Mutare", "Gweru"] },
];

const OWNER_ROLES: { value: string; labelKey: string }[] = [
  { value: "PDG", labelKey: "ouvrirCentreRolePdg" },
  { value: "Directeur Général", labelKey: "ouvrirCentreRoleDg" },
  { value: "Directeur de Campus", labelKey: "ouvrirCentreRoleCampusDirector" },
  { value: "Caissier", labelKey: "ouvrirCentreRoleCashier" },
  { value: "Autre", labelKey: "ouvrirCentreRoleOther" },
];

export default function CreerCentrePage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const welcomeCopy = (ct: CenterType) =>
    ct === "tcf_canada"
      ? t("marketing", "ouvrirCentreWelcomeTcfCanada")
      : t("marketing", "ouvrirCentreWelcomeDefault");
  const localizedCenterTypeLabel = (ct: CenterType) =>
    ct === "tcf_canada"
      ? centerTypeLabel(ct)
      : ct === "generic"
        ? t("marketing", "ouvrirCentreGenericCenterLabel")
        : centerTypeLabel(ct);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [programFamily, setProgramFamily] = useState<ProgramFamily>(null);
  const [centerType, setCenterType] = useState<CenterType>(null);
  const [nexaOffer, setNexaOffer] = useState<NexaOfferKey | null>(null);

  const [centerName, setCenterName] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [ownerPrenom, setOwnerPrenom] = useState("");
  const [ownerNom, setOwnerNom] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCountry = AFRICA_54.find(c => c.code === country);

  const handleCountryChange = (code: string) => {
    setCountry(code);
    setRegion("");
    const c = AFRICA_54.find(x => x.code === code);
    if (c) setPhone(c.dial + " ");
  };

  /** Continuer uniquement si un center_type métier est choisi (TCF sous native, ou libre → generic). */
  const canGoStep2 = centerType !== null;
  const canGoStep3 = centerName.trim().length >= 2 && city.trim().length >= 2;
  const pwdCheck = checkPasswordStrength(ownerPassword);
  const canSubmit =
    Boolean(ownerPrenom.trim() && ownerNom.trim() && ownerEmail.includes("@") && pwdCheck.ok);

  const selectProgram = (family: Exclude<ProgramFamily, null>, type: CenterTypeCode | null) => {
    setProgramFamily(family);
    if (family === "native") {
      // Ouvre la famille native ; ne valide tcf_canada que via la sous-carte
      setCenterType((prev) => (prev === "tcf_canada" ? prev : null));
      return;
    }
    setCenterType(type);
  };

  const selectNativeDiscipline = (id: Extract<CenterTypeCode, "tcf_canada">) => {
    setProgramFamily("native");
    setCenterType(id);
  };

  const handleConfigureCentre = async () => {
    const { supabase } = await import("@/app/utils/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("profiles")
        .update({ onboarding_step: "completed" })
        .eq("id", session.user.id);
    }
    router.push("/centre/parametres/entreprise?setup=1");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!pwdCheck.ok) {
      setError(t("marketing", "ouvrirCentrePasswordInvalid"));
      return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/centre/creer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerName: centerName.trim(),
          city: city.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          country: country || null,
          region: region || null,
          ownerPrenom: ownerPrenom.trim(),
          ownerNom: ownerNom.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPassword,
          ownerRole: ownerRole || null,
          centerType,
          nexaOffer,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("marketing", "ouvrirCentreErrorGeneric")); setSaving(false); return; }

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signInWithPassword({ email: ownerEmail.trim(), password: ownerPassword });

      setSaving(false);
      setStep(4);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("marketing", "ouvrirCentreErrorUnexpected");
      setError(message);
      setSaving(false);
    }
  };

  return (
    <MarketingChrome hideFooter>
    <div
      className="min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-4rem)] flex justify-center"
      style={{ backgroundColor: CREAM }}
    >
      <div
        className={`w-full max-w-[1400px] xl:max-w-[1480px] 2xl:max-w-[1560px] ${
          step === 4
            ? "flex items-center justify-center min-h-[inherit] px-5 sm:px-8"
            : "flex flex-col lg:flex-row min-h-[inherit]"
        }`}
      >
      {/* ── PANNEAU GAUCHE — Andela-style (logo = nav MarketingChrome) ───── */}
      {step !== 4 && (
        <div className="hidden lg:flex lg:w-[42%] xl:w-[44%] flex-col p-10 xl:p-12 2xl:p-14 relative overflow-hidden shrink-0 border-r border-black/[0.06]">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 70% 50% at 0% 100%, ${ORANGE}18, transparent 55%),
                radial-gradient(ellipse 55% 40% at 100% 0%, ${BLUE}10, transparent 50%)
              `,
            }}
          />

          <div className="relative z-10 max-w-lg">
            <h2
              className="font-display text-[2.75rem] xl:text-[3.5rem] 2xl:text-[3.85rem] font-black leading-[1.06] tracking-tight"
              style={{ color: BLUE }}
            >
              {t("marketing", "ouvrirCentreHeroLine1")}
              <br />
              {t("marketing", "ouvrirCentreHeroLine2")}
              <br />
              {t("marketing", "ouvrirCentreHeroLine3")}
              <br />
              {t("marketing", "ouvrirCentreHeroLine4")}
              <br />
              {t("marketing", "ouvrirCentreHeroLine5")}
              <br />
              <span style={{ color: ORANGE }}>{t("marketing", "ouvrirCentreHeroLine6")}</span>.
            </h2>
            <p className="mt-6 text-base leading-relaxed font-medium max-w-md" style={{ color: `${BLUE}99` }}>
              {t("marketing", "ouvrirCentreHeroSubtitle")}
            </p>
          </div>

          <p className="relative z-10 mt-auto pt-10 text-[10px] font-bold" style={{ color: `${BLUE}40` }}>
            © {new Date().getFullYear()} NEXA
          </p>
        </div>
      )}

      {/* ── PANNEAU DROIT — formulaire ────────────────────────────────────── */}
      <div className={`flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-10 xl:p-12 2xl:p-14 ${step === 4 ? "w-full" : ""}`}>
        <div className={`w-full ${step === 1 ? "max-w-xl mx-auto" : "max-w-lg mx-auto"}`}>

          {step !== 4 && (
            <div className="lg:hidden mb-6">
              <h2
                className="font-display text-[1.65rem] sm:text-3xl font-black leading-[1.1] tracking-tight"
                style={{ color: BLUE }}
              >
                {t("marketing", "ouvrirCentreHeroLine1")}
                <br />
                {t("marketing", "ouvrirCentreHeroLine2")}
                <br />
                {t("marketing", "ouvrirCentreHeroLine3")}
                <br />
                {t("marketing", "ouvrirCentreHeroLine4")}
                <br />
                {t("marketing", "ouvrirCentreHeroLine5")}
                <br />
                <span style={{ color: ORANGE }}>{t("marketing", "ouvrirCentreHeroLine6")}</span>.
              </h2>
            </div>
          )}

          {step <= 3 && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step >= s ? "text-white" : "bg-black/[0.06] text-neutral-400"
                    }`}
                    style={step >= s ? { backgroundColor: ORANGE } : undefined}
                  >
                    {step > s ? <Check size={13} /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-8 h-0.5 rounded ${step > s ? "" : "bg-black/[0.08]"}`}
                      style={step > s ? { backgroundColor: ORANGE } : undefined}
                    />
                  )}
                </div>
              ))}
              <span className="ml-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                {step === 1
                  ? t("marketing", "ouvrirCentreStepLabelProgram")
                  : step === 2
                  ? t("marketing", "ouvrirCentreStepLabelEstablishment")
                  : t("marketing", "ouvrirCentreStepLabelAccount")}
              </span>
            </div>
          )}

          {/* ── ÉTAPE 1 — Native (+ TCF) ou Formation libre → generic ───────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: BLUE }}>
                  {t("marketing", "ouvrirCentreStep1Title")}
                </h1>
                <p className="text-sm text-neutral-500 mt-2 font-medium">
                  {t("marketing", "ouvrirCentreStep1Subtitle")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {PROGRAMS.map((p) => {
                  const familyActive = programFamily === p.family;
                  const fullySelected =
                    p.centerType !== null
                      ? centerType === p.centerType
                      : centerType === "tcf_canada" && familyActive;
                  const Icon = p.icon;
                  const showNativeChildren = p.family === "native" && familyActive;

                  return (
                    <div key={p.family} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => selectProgram(p.family, p.centerType)}
                        className={`w-full text-left p-4 sm:p-5 border-2 transition-all bg-white ${
                          familyActive || fullySelected
                            ? "scale-[1.01]"
                            : "border-black/[0.08] hover:border-black/20"
                        }`}
                        style={
                          familyActive || fullySelected
                            ? { borderColor: p.accent, backgroundColor: `${p.accent}0d` }
                            : undefined
                        }
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${p.accent}18` }}
                            aria-hidden
                          >
                            <Icon size={18} style={{ color: p.accent }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-black text-base" style={{ color: BLUE }}>{t("marketing", p.titleKey)}</h3>
                              {fullySelected && (
                                <span
                                  className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: p.accent }}
                                >
                                  <Check size={12} className="text-white" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-wider mt-0.5" style={{ color: p.accent }}>
                              {t("marketing", p.subtitleKey)}
                            </p>
                            <p className="text-xs text-neutral-500 leading-relaxed mt-2 font-medium">
                              {t("marketing", p.blurbKey)}
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                              {p.pointKeys.map((f) => (
                                <p key={f} className="text-[10px] text-neutral-500 flex items-center gap-1 font-medium">
                                  <Check size={10} style={{ color: p.accent }} /> {t("marketing", f)}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>

                      {showNativeChildren && (
                        <div className="pl-3 sm:pl-5 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1">
                            {t("marketing", "ouvrirCentreChooseDiscipline")}
                          </p>
                          {NATIVE_DISCIPLINES.map((d) => {
                            const discSelected = centerType === d.id;
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => selectNativeDiscipline(d.id)}
                                className={`w-full text-left p-4 border-2 transition-all bg-white ${
                                  discSelected
                                    ? ""
                                    : "border-black/[0.08] hover:border-black/20"
                                }`}
                                style={
                                  discSelected
                                    ? { borderColor: ORANGE, backgroundColor: `${ORANGE}0d` }
                                    : undefined
                                }
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${ORANGE}18` }}
                                    aria-hidden
                                  >
                                    <Flag size={16} style={{ color: ORANGE }} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="font-black text-sm" style={{ color: BLUE }}>{t("marketing", d.titleKey)}</h4>
                                      {discSelected && (
                                        <span
                                          className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                                          style={{ backgroundColor: ORANGE }}
                                        >
                                          <Check size={12} className="text-white" />
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-neutral-500 leading-relaxed mt-1.5 font-medium">
                                      {t("marketing", d.blurbKey)}
                                    </p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
                                      {d.pointKeys.map((f) => (
                                        <p key={f} className="text-[10px] text-neutral-500 flex items-center gap-1 font-medium">
                                          <Check size={10} style={{ color: ORANGE }} /> {t("marketing", f)}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className="w-full py-3.5 rounded-xl text-sm font-black text-white disabled:opacity-30 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: ORANGE }}
              >
                {t("marketing", "ouvrirCentreContinueButton")} <ArrowRight size={16} />
              </button>
              <p className="text-center text-[11px] text-neutral-400 font-medium">
                {t("marketing", "ouvrirCentreAlreadyAccount")}{" "}
                <Link href="/login" className="font-bold hover:underline" style={{ color: BLUE }}>
                  {t("marketing", "ouvrirCentreLoginLink")}
                </Link>
              </p>
            </div>
          )}

          {/* ── ÉTAPE 2 — Infos du centre ──────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: BLUE }}>
                  {t("marketing", "ouvrirCentreStep2Title")}
                </h1>
                <p className="text-sm text-neutral-500 mt-1 font-medium">
                  {localizedCenterTypeLabel(centerType)}
                </p>
              </div>

              <div className="space-y-3">
                <Field label={t("marketing", "ouvrirCentreFieldCenterNameLabel")}>
                  <input
                    value={centerName}
                    onChange={e => setCenterName(e.target.value)}
                    placeholder={t("marketing", "ouvrirCentreFieldCenterNamePlaceholder")}
                    className="input-nexa"
                  />
                </Field>

                <Field label={t("marketing", "ouvrirCentreFieldCountryLabel")}>
                  <div className="relative">
                    <select
                      value={country}
                      onChange={e => handleCountryChange(e.target.value)}
                      className="input-nexa appearance-none pr-10 cursor-pointer"
                    >
                      <option value="">{t("marketing", "ouvrirCentreFieldCountryPlaceholder")}</option>
                      {AFRICA_54.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                </Field>

                {selectedCountry && selectedCountry.regions.length > 0 && (
                  <Field label={t("marketing", "ouvrirCentreFieldRegionLabel")}>
                    <div className="relative">
                      <select
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                        className="input-nexa appearance-none pr-10 cursor-pointer"
                      >
                        <option value="">{t("marketing", "ouvrirCentreFieldRegionPlaceholder")}</option>
                        {selectedCountry.regions.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    </div>
                  </Field>
                )}

                <Field label={t("marketing", "ouvrirCentreFieldCityLabel")}>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder={t("marketing", "ouvrirCentreFieldCityPlaceholder")}
                    className="input-nexa"
                  />
                </Field>

                <Field label={t("marketing", "ouvrirCentreFieldPhoneLabel")}>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={selectedCountry ? `${selectedCountry.dial} XXXXXXXXX` : "+XXX XXXXXXXXX"}
                    className="input-nexa"
                  />
                </Field>

                <Field label={t("marketing", "ouvrirCentreFieldAddressLabel")}>
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder={t("marketing", "ouvrirCentreFieldAddressPlaceholder")}
                    className="input-nexa"
                  />
                </Field>

                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-neutral-400">
                    {t("marketing", "ouvrirCentreOfferLabel")} <span className="font-medium normal-case tracking-normal text-neutral-400">({t("marketing", "ouvrirCentreOfferOptional")})</span>
                  </p>
                  <p className="text-[12px] text-neutral-500 font-medium leading-relaxed">
                    {t("marketing", "ouvrirCentreOfferHint")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNexaOffer(null)}
                      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                        nexaOffer === null
                          ? "border-orange-400 bg-orange-50"
                          : "border-black/10 bg-white hover:border-black/20"
                      }`}
                    >
                      <p className="text-sm font-black" style={{ color: BLUE }}>{t("marketing", "ouvrirCentreOfferUnknown")}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{t("marketing", "ouvrirCentreOfferUnknownHint")}</p>
                    </button>
                    {NEXA_OFFER_KEYS.map((key) => {
                      const offer = NEXA_OFFERS[key];
                      const selected = nexaOffer === key;
                      const offerNameKey =
                        key === "decouverte"
                          ? "ouvrirCentreOfferNameDecouverte"
                          : key === "croissance"
                            ? "ouvrirCentreOfferNameCroissance"
                            : key === "pro"
                              ? "ouvrirCentreOfferNamePro"
                              : "ouvrirCentreOfferNameEntreprise";
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setNexaOffer(key)}
                          className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                            selected
                              ? "border-orange-400 bg-orange-50"
                              : "border-black/10 bg-white hover:border-black/20"
                          }`}
                        >
                          <p className="text-sm font-black" style={{ color: BLUE }}>
                            {t("marketing", offerNameKey)}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {t("marketing", "ouvrirCentreOfferFrom")} {offer.monthlyFeeMin.toLocaleString(locale === "en" ? "en-US" : "fr-FR")} {t("marketing", "ouvrirCentreOfferFcfaPerMonth")}
                            {" · "}{offer.maxStudents != null ? `${t("marketing", "ouvrirCentreOfferMax")} ${offer.maxStudents} ${t("marketing", "ouvrirCentreOfferStudents")}` : t("marketing", "ouvrirCentreOfferUnlimited")}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 px-5 rounded-xl border border-black/10 bg-white text-neutral-600 text-sm font-semibold hover:border-black/20 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} /> {t("marketing", "ouvrirCentreBackButton")}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canGoStep3}
                  className="flex-1 h-12 rounded-xl text-sm font-black text-white disabled:opacity-30 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: ORANGE }}
                >
                  {t("marketing", "ouvrirCentreContinueButton")} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 — Compte administrateur ────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: BLUE }}>
                  {t("marketing", "ouvrirCentreAdminAccountTitle")}
                </h1>
                <p className="text-sm text-neutral-500 mt-1 font-medium">
                  {t("marketing", "ouvrirCentreManagerOf")} <span className="font-bold" style={{ color: BLUE }}>{centerName}</span>
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("marketing", "ouvrirCentreFirstNameLabel")}>
                    <input value={ownerPrenom} onChange={e => setOwnerPrenom(e.target.value)} className="input-nexa" />
                  </Field>
                  <Field label={t("marketing", "ouvrirCentreLastNameLabel")}>
                    <input value={ownerNom} onChange={e => setOwnerNom(e.target.value)} className="input-nexa" />
                  </Field>
                </div>

                <Field label={t("marketing", "ouvrirCentreRoleLabel")}>
                  <div className="relative">
                    <select
                      value={ownerRole}
                      onChange={e => setOwnerRole(e.target.value)}
                      className="input-nexa appearance-none pr-10 cursor-pointer"
                    >
                      <option value="">{t("marketing", "ouvrirCentreRolePlaceholder")}</option>
                      {OWNER_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>{t("marketing", role.labelKey)}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label={t("marketing", "ouvrirCentreEmailLabel")}>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    placeholder="vous@centre.com"
                    className="input-nexa"
                  />
                </Field>

                <Field label={t("marketing", "ouvrirCentrePasswordLabel")}>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={ownerPassword}
                      onChange={e => setOwnerPassword(e.target.value)}
                      placeholder="Ex. : Nexa2026"
                      className="input-nexa pr-12"
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className={`text-[10px] mt-1.5 font-medium transition-colors ${
                    ownerPassword.length > 0 && !isPasswordStrong(ownerPassword) ? "text-red-500" : "text-neutral-400"
                  }`}>
                    {ownerPassword.length > 0 && !pwdCheck.ok
                      ? t("marketing", "ouvrirCentrePasswordInvalid")
                      : t("marketing", "ouvrirCentrePasswordHint")}
                  </p>
                </Field>
              </div>

              <div className="border border-black/[0.08] bg-white p-4 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  {centerType === "tcf_canada" ? "TCF" : "NEXA"}
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: BLUE }}>{centerName}</p>
                  <p className="text-[10px] text-neutral-400 font-medium">
                    {city}{country ? ` · ${AFRICA_54.find(c => c.code === country)?.name}` : ""} ·{" "}
                    {localizedCenterTypeLabel(centerType)}
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-12 px-5 rounded-xl border border-black/10 bg-white text-neutral-600 text-sm font-semibold hover:border-black/20 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} /> {t("marketing", "ouvrirCentreBackButton")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || !canSubmit}
                  className="flex-1 h-12 rounded-xl text-sm font-black text-white disabled:opacity-30 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: ORANGE }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
                  {saving ? t("marketing", "ouvrirCentreCreating") : t("marketing", "ouvrirCentreCreateButton")}
                </button>
              </div>

              <p className="text-center text-[10px] text-neutral-400 font-medium">
                {t("marketing", "ouvrirCentreTermsPrefix")}{" "}
                <Link href="/cgu" className="underline" style={{ color: BLUE }}>{t("marketing", "ouvrirCentreTermsLink")}</Link>{" "}{t("marketing", "ouvrirCentreTermsSuffix")}
              </p>
            </div>
          )}

          {/* ── ÉTAPE 4 — Félicitations ────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-8 text-center border border-black/[0.08] bg-white p-8 sm:p-10">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  {localizedCenterTypeLabel(centerType)}
                </p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight" style={{ color: BLUE }}>
                  {t("marketing", "ouvrirCentreSuccessTitleLine1")}<br />{t("marketing", "ouvrirCentreSuccessTitleLine2")} <span style={{ color: ORANGE }}>NEXA</span>
                </h1>
              </div>

              <div className="space-y-2">
                <p className="text-neutral-500 text-[15px] leading-relaxed font-medium">
                  {welcomeCopy(centerType)}
                </p>
                <p className="text-lg font-black" style={{ color: ORANGE }}>{centerName}</p>
              </div>

              <div className="border border-black/[0.08] bg-[#FFFBF7] p-4 text-left space-y-1.5">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">{t("marketing", "ouvrirCentreRequestSent")}</p>
                <p className="text-[12px] text-neutral-500 leading-relaxed font-medium">
                  {t("marketing", "ouvrirCentreRequestReview")}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleConfigureCentre}
                  className="w-full py-3.5 rounded-xl text-[13px] font-black text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: ORANGE }}
                >
                  {t("marketing", "ouvrirCentreConfigureButton")}
                </button>
                <p className="text-[11px] text-neutral-400 font-medium">
                  {t("marketing", "ouvrirCentreConfigureHint")}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>

      <style>{`
        .input-nexa {
          width: 100%;
          height: 48px;
          padding: 0 16px;
          border-radius: 12px;
          border: 1px solid rgba(17, 34, 78, 0.12);
          background: #ffffff;
          color: ${BLUE};
          font-size: 14px;
          font-weight: 600;
          outline: none;
        }
        .input-nexa::placeholder { color: rgba(17, 34, 78, 0.35); }
        .input-nexa:focus { border-color: ${ORANGE}; box-shadow: 0 0 0 3px ${ORANGE}22; }
        .input-nexa option { background: #fff; color: ${BLUE}; }
        select.input-nexa { padding-right: 40px; }
      `}</style>
    </div>
    </MarketingChrome>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="text-[10px] font-black uppercase tracking-widest block mb-1.5"
        style={{ color: "rgba(17, 34, 78, 0.45)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
