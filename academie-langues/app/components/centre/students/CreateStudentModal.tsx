"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, X, Loader2, CheckCircle2, AlertTriangle,
  ChevronRight, Globe, Phone, Lock, MapPin
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { AFRICA_54, findAfricaCountry } from "@/app/data/africa-54";
import {
  catalogTotalShort,
  durationLabelShort,
  isShortPricingMode,
  sumPaymentPlanFees,
  type ShortPricingMode,
} from "@/app/utils/short-pricing";
import {
  defaultAcademicYear,
  isCursusFeeMode,
  resolveCursusTuition,
  type CursusFeeMode,
} from "@/app/utils/cursus-passage";
import { isPluriannualCenter } from "@/app/data/center-types";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

const FIELD_LABEL = "text-sm font-semibold text-neutral-600 block mb-1.5";
const FIELD_LABEL_INLINE = "text-sm font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5";
const FIELD_INPUT =
  "w-full h-12 px-4 rounded-lg border border-black/[0.08] bg-white font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";

const MONTH_PRESETS = [1, 2, 3, 6] as const;

// ============================================================
// TYPES
// ============================================================
type FiliereOption = {
  id: string;
  name: string;
  type: "cursus" | "formation_courte";
  default_tuition_fee: number | null;
  pricing_mode: ShortPricingMode | null;
  cursus_fee_mode: CursusFeeMode | null;
  duree_valeur: number | null;
  duree_unite: string | null;
  payment_plan: unknown;
};
type NiveauOption = { id: string; annee: number; tuition_fee: number | null; payment_plan?: unknown };
type GroupeOption = { id: string; nom: string };
type CampusOption = { id: string; name: string; city: string | null };

type Props = {
  centerId: string;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateStudentModal({ centerId, onClose, onCreated }: Props) {
  const { locale, t } = useI18n();
  const relationLabel = (relation: string) => {
    const keys: Record<string, string> = { "Père": "identityRelationFather", "Mère": "identityRelationMother", Tuteur: "identityRelationGuardian", Oncle: "identityRelationUncle", Tante: "identityRelationAunt", "Frère": "identityRelationBrother", "Sœur": "identityRelationSister", Autre: "identityRelationOther" };
    return keys[relation] ? t("centre", keys[relation]) : relation;
  };
  const [step, setStep] = useState(1);
  /** Centres libres (generic) uniquement — ne pas imposer aux TCF / courte */
  const [isLibreCenter, setIsLibreCenter] = useState(false);

  // --- Étape 1 : Identité ---
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [genre, setGenre] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [countryCode, setCountryCode] = useState("CM");
  const [phoneCode, setPhoneCode] = useState("+237");
  const [region, setRegion] = useState("");

  // --- Responsable légal ---
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [guardianCountryCode, setGuardianCountryCode] = useState("CM");
  const [guardianPhoneCode, setGuardianPhoneCode] = useState("+237");
  const [guardianPhone, setGuardianPhone] = useState("");

  // --- Étape 2 : Inscription ---
  const [filieres, setFilieres] = useState<FiliereOption[]>([]);
  const [filiereId, setFiliereId] = useState("");
  const [niveaux, setNiveaux] = useState<NiveauOption[]>([]);
  const [niveauId, setNiveauId] = useState("");
  const [groupes, setGroupes] = useState<GroupeOption[]>([]);
  const [groupeId, setGroupeId] = useState("");
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [campusId, setCampusId] = useState("");
  const [tuitionFee, setTuitionFee] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [durationMonths, setDurationMonths] = useState(3);
  const [customMonths, setCustomMonths] = useState("");
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());

  // --- État global ---
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ emailSent: boolean; temporaryPassword?: string } | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<{ id: string; code: string; type: string; value: number }[]>([]);

  const selectedCountry = findAfricaCountry(countryCode);
  const regions = selectedCountry?.regions ?? [];

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================
  useEffect(() => {
    (async () => {
      const [{ data: filiereRows }, { data: centerRow }, { data: coupRows }] = await Promise.all([
        supabase
          .from("filieres")
          .select("id, name, type, default_tuition_fee, pricing_mode, cursus_fee_mode, duree_valeur, duree_unite, payment_plan")
          .eq("center_id", centerId)
          .eq("status", "published"),
        supabase.from("centers").select("center_type").eq("id", centerId).maybeSingle(),
        supabase
          .from("coupons")
          .select("id, code, type, value, expires_at, max_uses, uses_count, is_active")
          .eq("center_id", centerId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);
      setIsLibreCenter(isPluriannualCenter(centerRow?.center_type));
      if (coupRows?.length) {
        const valid = coupRows.filter((c: any) => {
          if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
          if (c.max_uses != null && c.uses_count >= c.max_uses) return false;
          return true;
        });
        setAvailableCoupons(valid);
      }
      setFilieres(
        (filiereRows || []).map((f: any) => ({
          ...f,
          pricing_mode: isShortPricingMode(f.pricing_mode) ? f.pricing_mode : null,
          cursus_fee_mode: isCursusFeeMode(f.cursus_fee_mode) ? f.cursus_fee_mode : null,
        })),
      );
    })();
  }, [centerId]);

  // ============================================================
  // QUAND LE PAYS CHANGE → indicatif auto (modèle staff / AFRICA_54)
  // ============================================================
  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setRegion("");
    const country = findAfricaCountry(code);
    if (country) setPhoneCode(country.dial);
  };

  const handleGuardianCountryChange = (code: string) => {
    setGuardianCountryCode(code);
    const country = findAfricaCountry(code);
    if (country) setGuardianPhoneCode(country.dial);
  };

  // ============================================================
  // QUAND LA FILIÈRE CHANGE → niveaux + campus + prix
  // ============================================================
  const selectedFiliere = filieres.find((f) => f.id === filiereId);
  const isShort = selectedFiliere?.type === "formation_courte";
  const shortMode: ShortPricingMode =
    isShort && isShortPricingMode(selectedFiliere?.pricing_mode)
      ? selectedFiliere!.pricing_mode!
      : "forfaitaire";

  const shortExtras = useMemo(
    () => (isShort ? sumPaymentPlanFees(selectedFiliere?.payment_plan) : 0),
    [isShort, selectedFiliere?.payment_plan],
  );

  const shortCatalogTotal = useMemo(() => {
    if (!isShort || !selectedFiliere) return 0;
    const monthlyOrFee = Number(selectedFiliere.default_tuition_fee) || 0;
    return catalogTotalShort({
      pricingMode: shortMode,
      defaultTuitionFee: monthlyOrFee,
      months: shortMode === "mensuel" ? durationMonths : undefined,
      extraFees: shortExtras,
    });
  }, [isShort, selectedFiliere, shortMode, durationMonths, shortExtras]);

  useEffect(() => {
    if (!filiereId) {
      setNiveaux([]); setGroupes([]); setCampuses([]);
      setNiveauId(""); setGroupeId(""); setCampusId("");
      setTuitionFee("");
      return;
    }

    (async () => {
      // Charger les campus liés via filiere_campus
      const { data: linkedCampuses } = await supabase
        .from("filiere_campus")
        .select("campus_id, campuses(id, name, city)")
        .eq("filiere_id", filiereId);

      const campusList: CampusOption[] = (linkedCampuses || [])
        .map((lc: any) => lc.campuses)
        .filter(Boolean);

      setCampuses(campusList);

      // Auto-sélection si un seul campus
      if (campusList.length === 1) {
        setCampusId(campusList[0].id);
      } else {
        setCampusId("");
      }

      // Charger les niveaux ou groupes selon le type
      if (selectedFiliere?.type === "cursus") {
        const { data } = await supabase
          .from("niveaux")
          .select("id, annee, tuition_fee, payment_plan")
          .eq("filiere_id", filiereId)
          .order("annee");
        setNiveaux(data || []);
        setGroupes([]);
        setNiveauId(""); setGroupeId("");
        setAcademicYear(defaultAcademicYear());
        const feeMode = isCursusFeeMode(selectedFiliere.cursus_fee_mode)
          ? selectedFiliere.cursus_fee_mode
          : "par_niveau";
        const initialExtras =
          feeMode === "uniforme"
            ? sumPaymentPlanFees(selectedFiliere.payment_plan)
            : 0;
        setTuitionFee(String(resolveCursusTuition({
          feeMode,
          filiereDefault: selectedFiliere.default_tuition_fee,
          niveauTuition: null,
          extraFees: initialExtras,
        })));
      } else {
        // Formation courte : salles via filiere_id (et niveau fantôme si présent)
        const { data: phantom } = await supabase
          .from("niveaux")
          .select("id")
          .eq("filiere_id", filiereId)
          .is("annee", null)
          .maybeSingle();

        let query = supabase.from("groupes").select("id, nom, is_default_signup");
        if (phantom?.id) {
          query = query.or(`filiere_id.eq.${filiereId},niveau_id.eq.${phantom.id}`);
        } else {
          query = query.eq("filiere_id", filiereId);
        }
        const { data } = await query;
        setGroupes(data || []);
        setNiveaux([]);
        setNiveauId("");
        setGroupeId(
          data?.find((g) => g.is_default_signup)?.id
          || (data && data.length === 1 ? data[0].id : ""),
        );

        const mode = isShortPricingMode(selectedFiliere?.pricing_mode)
          ? selectedFiliere!.pricing_mode!
          : "forfaitaire";
        const monthsDefault =
          selectedFiliere?.duree_unite === "mois" && selectedFiliere?.duree_valeur
            ? selectedFiliere.duree_valeur
            : 3;
        setDurationMonths(monthsDefault);
        setCustomMonths("");

        if (mode === "forfaitaire") {
          const fee = Number(selectedFiliere?.default_tuition_fee) || 0;
          const extras = sumPaymentPlanFees(selectedFiliere?.payment_plan);
          setTuitionFee(String(fee + extras));
        }
        // mensuel : recalculé via effect shortCatalogTotal
      }
    })();
  }, [filiereId, selectedFiliere?.type, selectedFiliere?.pricing_mode]);

  // Recalcule le total affiché pour formation courte mensuelle
  useEffect(() => {
    if (!isShort) return;
    if (shortMode === "mensuel") {
      setTuitionFee(String(shortCatalogTotal));
    } else {
      setTuitionFee(String(shortCatalogTotal));
    }
  }, [isShort, shortMode, shortCatalogTotal]);

  // ============================================================
  // QUAND LE NIVEAU CHANGE → groupes + prix du niveau
  // ============================================================
  useEffect(() => {
    if (!niveauId) { setGroupes([]); setGroupeId(""); return; }

    (async () => {
      const { data } = await supabase
        .from("groupes")
        .select("id, nom, is_default_signup")
        .eq("niveau_id", niveauId);
      setGroupes(data || []);
      setGroupeId(
        data?.find((g) => g.is_default_signup)?.id
        || (data && data.length === 1 ? data[0].id : ""),
      );
    })();

    // Prix : formation + frais d'inscription du niveau / filière
    const niveau = niveaux.find((n) => n.id === niveauId);
    const feeMode = isCursusFeeMode(selectedFiliere?.cursus_fee_mode)
      ? selectedFiliere!.cursus_fee_mode!
      : "par_niveau";
    const extras =
      feeMode === "par_niveau"
        ? sumPaymentPlanFees(niveau?.payment_plan)
        : sumPaymentPlanFees(selectedFiliere?.payment_plan);
    setTuitionFee(String(resolveCursusTuition({
      feeMode,
      filiereDefault: selectedFiliere?.default_tuition_fee ?? null,
      niveauTuition: niveau?.tuition_fee ?? null,
      extraFees: extras,
    })));
  }, [niveauId, niveaux, selectedFiliere]);

  // ============================================================
  // VALIDATION
  // ============================================================
  const canGoStep2 = Boolean(
    prenom.trim() && nom.trim() && email.trim()
    && (!isLibreCenter || (
      (genre === "Homme" || genre === "Femme" || genre === "Autre")
      && /^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())
    )),
  );
  const canSubmit = canGoStep2 && filiereId
    && (selectedFiliere?.type !== "cursus" || niveauId)
    && (campuses.length <= 1 || campusId)
    && (!isShort || shortMode !== "mensuel" || durationMonths >= 1);

  // ============================================================
  // SOUMISSION
  // ============================================================
  const handleSubmit = async () => {
    setError(""); setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));

      const fullPhone = phone.trim() ? `${phoneCode} ${phone.trim()}` : null;

      const body: Record<string, unknown> = {
        prenom: prenom.trim().toUpperCase(),
        nom: nom.trim().toUpperCase(),
        email: email.trim(),
        phone: fullPhone,
        filiere_id: filiereId,
        niveau_id: niveauId || null,
        groupe_id: groupeId || null,
        campus_id: campusId || null,
        tuition_fee: parseFloat(tuitionFee) || 0,
      };
      if (isLibreCenter) {
        body.genre = genre.trim();
        body.birth_date = birthDate.trim();
      }

      if (isShort) {
        body.pricing_mode = shortMode;
        body.catalog_tuition_fee = shortCatalogTotal;
        if (shortMode === "mensuel") {
          body.duration_value = durationMonths;
          body.duration_unit = "month";
          body.duration_months = durationMonths;
        } else if (selectedFiliere?.duree_valeur && selectedFiliere?.duree_unite) {
          body.duration_value = selectedFiliere.duree_valeur;
          body.duration_unit =
            selectedFiliere.duree_unite === "mois"
              ? "month"
              : selectedFiliere.duree_unite === "semaines"
                ? "week"
                : "day";
        }
      }

      if (selectedFiliere?.type === "cursus" && academicYear.trim()) {
        body.academic_year = academicYear.trim();
      }

      if (couponCode.trim()) {
        body.coupon_code = couponCode.trim().toUpperCase();
      }

      const res = await fetch("/api/etudiants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(locale === "en" ? t("centre", "createStudentCreateError") : (data.error || t("centre", "createStudentCreateError")));

      // Créer les détails complémentaires (pays, indicatif, responsable)
      if (data.studentId) {
        const fullGuardianPhone = guardianPhone.trim() ? `${guardianPhoneCode} ${guardianPhone.trim()}` : null;
        await supabase.from("student_details").upsert({
          student_id: data.studentId,
          country: selectedCountry?.name || null,
          country_code: phoneCode,
          region: region.trim() || null,
          guardian_name: guardianName.trim() || null,
          guardian_relation: guardianRelation.trim() || null,
          guardian_phone: fullGuardianPhone,
        });
      }

      setResult({ emailSent: data.emailSent, temporaryPassword: data.temporaryPassword });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ÉCRAN DE SUCCÈS
  // ============================================================
  if (result) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl text-center border border-black/[0.06]">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "createStudentAccountCreated")}</h3>
          {result.emailSent ? (
            <p className="text-sm text-neutral-500 mt-2">{t("centre", "createStudentAccessSent")} <span className="font-semibold">{email}</span>.</p>
          ) : (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5"><AlertTriangle size={14} /> {t("centre", "createStudentEmailFailed")}</p>
              <p className="text-sm text-amber-700 mt-2">{t("centre", "createStudentSharePassword")}</p>
              <p className="font-mono font-semibold text-sm bg-white border rounded-lg p-2 mt-2 text-center select-all">{result.temporaryPassword}</p>
            </div>
          )}
          <button type="button" onClick={onCreated} className="w-full mt-6 h-12 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: BLUE }}>{t("centre", "createStudentDone")}</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // FORMULAIRE
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto border border-black/[0.06]" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors" aria-label={t("centre", "bulletinClose")}><X size={20} /></button>

        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "createStudentTitle")}</h3>
          <p className="text-sm text-neutral-500 mt-1">{t("centre", "createStudentStep", { step, label: step === 1 ? t("centre", "createStudentPersonalInfo") : t("centre", "createStudentProgramSchooling") })}</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* ══════════ ÉTAPE 1 : IDENTITÉ ══════════ */}
        {step === 1 && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={FIELD_LABEL}>{t("centre", "createStudentFirstName")}</label>
                <input type="text" placeholder="ex. Jean" value={prenom} onChange={(e) => setPrenom(e.target.value)} className={FIELD_INPUT} />
              </div>
              <div>
                <label className={FIELD_LABEL}>{t("centre", "createStudentLastName")}</label>
                <input type="text" placeholder="ex. Dupont" value={nom} onChange={(e) => setNom(e.target.value)} className={FIELD_INPUT} />
              </div>
            </div>

            <div>
              <label className={FIELD_LABEL}>Email *</label>
              <input type="email" placeholder="jean.dupont@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_INPUT} />
            </div>

            {isLibreCenter && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={FIELD_LABEL}>{t("centre", "createStudentGender")}</label>
                  <select value={genre} onChange={(e) => setGenre(e.target.value)} className={FIELD_INPUT}>
                    <option value="">{t("centre", "identityChoose")}</option>
                    <option value="Homme">{t("centre", "studentsBoyMan")}</option>
                    <option value="Femme">{t("centre", "studentsGirlWoman")}</option>
                    <option value="Autre">{t("centre", "studentsOther")}</option>
                  </select>
                </div>
                <div>
                  <label className={FIELD_LABEL}>{t("centre", "createStudentBirthDate")}</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={FIELD_INPUT}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={FIELD_LABEL_INLINE}><Globe size={14} /> {t("centre", "identityCountry")}</label>
              <select value={countryCode} onChange={(e) => handleCountryChange(e.target.value)} className={FIELD_INPUT}>
                <option value="">{t("centre", "createStudentSelectCountry")}</option>
                {AFRICA_54.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>
                ))}
              </select>
            </div>

            {regions.length > 0 && (
              <div>
                <label className={FIELD_LABEL_INLINE}><MapPin size={14} /> {t("centre", "identityRegion")}</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={FIELD_INPUT}>
                  <option value="">{t("centre", "identitySelect")}</option>
                  {regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={FIELD_LABEL_INLINE}><Phone size={14} /> {t("centre", "accountPhone")}</label>
              <div className="flex gap-2">
                <div className="h-12 px-3 rounded-lg border border-black/[0.08] bg-[#FFF5EE] flex items-center shrink-0">
                  <span className="text-sm font-semibold" style={{ color: BLUE }}>{phoneCode}</span>
                </div>
                <input type="tel" placeholder="6XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))} className={`flex-1 ${FIELD_INPUT}`} />
              </div>
            </div>

            {/* Responsable légal / Tuteur — entièrement optionnel */}
            <div className="pt-3 border-t border-black/[0.06] space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{t("centre", "createStudentLegalGuardian")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={FIELD_LABEL}>{t("centre", "identityGuardianName")} <span className="font-normal text-neutral-400">{t("centre", "createStudentOptional")}</span></label>
                  <input type="text" placeholder="ex. Jean Dupont" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className={FIELD_INPUT} />
                </div>
                <div>
                  <label className={FIELD_LABEL}>{t("centre", "identityRelationship")} <span className="font-normal text-neutral-400">{t("centre", "createStudentOptional")}</span></label>
                  <select value={guardianRelation} onChange={(e) => setGuardianRelation(e.target.value)} className={FIELD_INPUT}>
                    <option value="">{t("centre", "identitySelect")}</option>
                    {["Père", "Mère", "Tuteur", "Oncle", "Tante", "Frère", "Sœur", "Autre"].map((r) => (
                      <option key={r} value={r}>{relationLabel(r)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={FIELD_LABEL_INLINE}><Globe size={14} /> {t("centre", "identityGuardianCountry")}</label>
                  <select value={guardianCountryCode} onChange={(e) => handleGuardianCountryChange(e.target.value)} className={FIELD_INPUT}>
                    {AFRICA_54.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dial})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={FIELD_LABEL_INLINE}><Phone size={14} /> {t("centre", "identityGuardianPhone")}</label>
                  <div className="flex gap-2">
                    <div className="h-12 px-3 rounded-lg border border-black/[0.08] bg-[#FFF5EE] flex items-center shrink-0">
                      <span className="text-sm font-semibold" style={{ color: BLUE }}>{guardianPhoneCode}</span>
                    </div>
                    <input type="tel" placeholder="6XX XXX XXX" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value.replace(/[^\d\s]/g, ""))} className={`flex-1 ${FIELD_INPUT}`} />
                  </div>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setStep(2)} disabled={!canGoStep2} className="w-full h-12 mt-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: BLUE }}>
              {t("centre", "createStudentNext")} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ══════════ ÉTAPE 2 : PROGRAMME ══════════ */}
        {step === 2 && (
          <div className="space-y-3.5">
            <div>
              <label className={FIELD_LABEL}>{t("centre", "createStudentProgramRequired")}</label>
              <select value={filiereId} onChange={(e) => setFiliereId(e.target.value)} className={FIELD_INPUT}>
                <option value="">{t("centre", "createStudentChooseProgram")}</option>
                {filieres.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {filieres.length === 0 && (
                <p className="text-sm text-amber-600 font-medium mt-1.5">{t("centre", "createStudentNoPublishedProgram")}</p>
              )}
            </div>

            {campuses.length > 1 && (
              <div>
                <label className={FIELD_LABEL_INLINE}><MapPin size={14} /> {t("centre", "createStudentCampusRequired")}</label>
                <select value={campusId} onChange={(e) => setCampusId(e.target.value)} className={FIELD_INPUT}>
                  <option value="">{t("centre", "createStudentChooseCampus")}</option>
                  {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ""}</option>)}
                </select>
              </div>
            )}

            {campuses.length === 1 && (
              <div className="flex items-center gap-2 bg-[#FFF5EE] border border-[#eb670e]/20 rounded-lg px-3 py-2.5">
                <MapPin size={14} className="text-[#eb670e]" />
                <span className="text-sm font-semibold text-neutral-700">{t("centre", "createStudentCampus", { name: campuses[0].name })}</span>
              </div>
            )}

            {selectedFiliere?.type === "cursus" && niveaux.length > 0 && (
              <div>
                <label className={FIELD_LABEL}>{t("centre", "createStudentLevelRequired")}</label>
                <select value={niveauId} onChange={(e) => setNiveauId(e.target.value)} className={FIELD_INPUT}>
                  <option value="">{t("centre", "createStudentChooseLevel")}</option>
                  {niveaux.map((n) => <option key={n.id} value={n.id}>{t("centre", "identityLevel")} {n.annee}</option>)}
                </select>
              </div>
            )}

            {selectedFiliere?.type === "cursus" && (
              <div>
                <label className={FIELD_LABEL}>{t("centre", "identityAcademicYear")}</label>
                <input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025-2026"
                  className={FIELD_INPUT}
                />
              </div>
            )}

            {isShort && shortMode === "mensuel" && (
              <div>
                <label className={FIELD_LABEL}>{t("centre", "createStudentDurationMonths")}</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {MONTH_PRESETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setDurationMonths(m); setCustomMonths(""); }}
                      className={`h-10 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                        durationMonths === m && !customMonths
                          ? "border-[#eb670e]/40 bg-[#FFF5EE] text-[#c95508]"
                          : "border-black/[0.08] text-neutral-500 hover:bg-black/[0.03]"
                      }`}
                    >
                      {t("centre", "createStudentMonths", { count: m })}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t("centre", "createStudentOtherDuration")}
                    value={customMonths}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setCustomMonths(raw);
                      const n = parseInt(raw, 10);
                      if (n >= 1) setDurationMonths(n);
                    }}
                    className="w-28 h-12 px-4 rounded-lg border border-black/[0.08] bg-white font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                  />
                  <span className="text-sm font-medium text-neutral-400">{t("centre", "createStudentCustomMonths")}</span>
                </div>
                <p className="text-sm text-neutral-500 font-medium mt-1.5">
                  {(Number(selectedFiliere?.default_tuition_fee) || 0).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} {t("centre", "createStudentPerMonth")}
                  {" × "}
                  {durationMonths}
                  {" = "}
                  <span className="font-semibold text-neutral-700">
                    {(
                      (Number(selectedFiliere?.default_tuition_fee) || 0) * durationMonths
                    ).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")}{" "}
                    FCFA
                  </span>
                  {shortExtras > 0 && (
                    <> + {shortExtras.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} {t("centre", "createStudentFees")}</>
                  )}
                </p>
              </div>
            )}

            {isShort && shortMode === "forfaitaire" && selectedFiliere?.duree_valeur && (
              <div className="flex items-center gap-2 bg-neutral-50 border border-black/[0.08] rounded-lg px-3 py-2.5">
                <span className="text-sm font-medium text-neutral-600">
                  {t("centre", "createStudentDuration")} {locale === "fr" ? durationLabelShort(selectedFiliere.duree_valeur, selectedFiliere.duree_unite || "mois") : `${selectedFiliere.duree_valeur} ${selectedFiliere.duree_unite === "semaines" ? "weeks" : selectedFiliere.duree_unite === "jours" ? "days" : "months"}`}
                </span>
              </div>
            )}

            {groupes.length > 1 && (
              <div>
                <label className={FIELD_LABEL}>{t("centre", "createStudentClassroom")}</label>
                <select value={groupeId} onChange={(e) => setGroupeId(e.target.value)} className={FIELD_INPUT}>
                  <option value="">{t("centre", "createStudentChooseClassroom")}</option>
                  {groupes.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
                </select>
              </div>
            )}

            {groupes.length === 1 && (
              <div className="flex items-center gap-2 bg-neutral-50 border border-black/[0.08] rounded-lg px-3 py-2.5">
                <span className="text-sm font-medium text-neutral-600">{t("centre", "createStudentAutoClassroom", { name: groupes[0].nom })}</span>
              </div>
            )}

            {filiereId && (
              <div>
                <label className={FIELD_LABEL_INLINE}><Lock size={14} /> {t("centre", "createStudentTrainingAmount")}</label>
                <div className="h-12 px-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-emerald-600" />
                    <span className="font-semibold text-base text-emerald-800">
                      {Number(tuitionFee || 0).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} FCFA
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">
                    {isShort && shortMode === "mensuel" ? t("centre", "createStudentCalculated") : t("centre", "createStudentDefinedByProgram")}
                  </span>
                </div>
              </div>
            )}

            {filiereId && (
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">{t("centre", "createStudentCouponCode")}</label>
                {availableCoupons.length > 0 ? (
                  <select
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full h-11 px-3 bg-neutral-50 rounded-xl border text-xs font-black uppercase outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="">{t("centre", "createStudentNoCoupon")}</option>
                    {availableCoupons.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code} ({c.type === "percentage" ? `${c.value}%` : `${c.value.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB")} FCFA`})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="RENTRÉE25"
                    className="w-full h-11 px-3 bg-neutral-50 rounded-xl border text-xs font-black uppercase outline-none focus:border-blue-500 transition-colors"
                  />
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep(1)} className="h-12 px-5 rounded-lg text-sm font-semibold bg-neutral-100 hover:bg-neutral-200 transition-colors">{t("centre", "createStudentBack")}</button>
              <button type="button" onClick={handleSubmit} disabled={!canSubmit || saving} className="flex-1 h-12 rounded-lg text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ backgroundColor: ORANGE }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {t("centre", "createStudentCreateSend")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
