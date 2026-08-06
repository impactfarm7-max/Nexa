"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Camera, Globe, CreditCard, Users, FileText,
  Edit3, Save, Loader2, Phone, BookOpen, Award,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import FicheInscriptionModal from "@/app/components/centre/students/FicheInscriptionModal";
import {
  buildCountryFormPatch,
  getRegionsForCountry,
  getStudentCountryOptions,
  resolveStudentCountryCode,
  type StudentCountryRef,
} from "@/app/data/studentLocalisation";
import { passageDecisionLabelFr } from "@/app/utils/cursus-passage";
import { fetchDocumentExportConfig, filterSignatures } from "@/app/utils/documentConfig";
import { downloadAttestationReussitePdf } from "@/app/utils/centerPdfExport";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";
const ORANGE = "#eb670e";
const SURFACE = "#F7F7F6";
const COUNTRY_OPTIONS: StudentCountryRef[] = getStudentCountryOptions();

const FIELD_LABEL = "text-sm font-semibold text-neutral-600 block mb-1.5";
const FIELD_INPUT =
  "w-full h-12 px-4 rounded-lg border border-black/[0.08] bg-white font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";

function DossierSection({
  icon: Icon,
  title,
  description,
  children,
  actions,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] gap-5 sm:gap-8 py-8 border-b border-black/[0.06] first:pt-2 last:border-b-0">
      <div className="lg:sticky lg:top-4 self-start min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.06]"
            style={{ backgroundColor: SURFACE }}
          >
            <Icon size={18} style={{ color: BLUE }} />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: BLUE }}>
            {title}
          </h2>
        </div>
        <p className="text-sm text-neutral-500 mt-3 leading-relaxed font-medium">{description}</p>
        {actions && <div className="mt-4">{actions}</div>}
      </div>
      <div className="space-y-5 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6" style={{ backgroundColor: SURFACE }}>
        {children}
      </div>
    </section>
  );
}

type Props = {
  studentId: string;
  enrollmentId?: string | null;
  studentName: string;
  studentEmail: string;
  studentPhone: string | null;
  avatarUrl: string | null;
  enrollmentInfo: {
    filiere_id?: string;
    filiere_name: string;
    niveau_id?: string | null;
    niveau_annee: number | null;
    duration_label?: string | null;
    academic_year?: string | null;
    passage_decision?: string | null;
    passage_reason?: string | null;
    groupe_id?: string | null;
    groupe_nom: string | null;
    enrolled_at: string | null;
    status: string;
  } | null;
  centerId: string;
  onAvatarUpdated: (url: string) => void;
  onEnrollmentUpdated?: () => void;
};

type StudentDetails = {
  country: string | null;
  country_code: string | null;
  region: string | null;
  id_type: string | null;
  id_number: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  notes: string | null;
};

const RELATION_OPTIONS = ["Père", "Mère", "Tuteur", "Oncle", "Tante", "Frère", "Sœur", "Autre"];

function parseGuardianPhone(fullPhone: string | null, countries: StudentCountryRef[]) {
  if (!fullPhone) return { phoneCode: "+237", localPhone: "", countryCode: "CM" };
  const trimmed = fullPhone.trim();
  const match = countries.find((c) => trimmed.startsWith(c.phone_code));
  if (match) {
    const local = trimmed.slice(match.phone_code.length).trim();
    return { phoneCode: match.phone_code, localPhone: local, countryCode: match.code };
  }
  return { phoneCode: "+237", localPhone: trimmed, countryCode: "CM" };
}

export default function StudentIdentityTab({
  studentId,
  enrollmentId,
  studentName,
  studentEmail,
  studentPhone,
  avatarUrl,
  enrollmentInfo,
  centerId,
  onAvatarUpdated,
  onEnrollmentUpdated,
}: Props) {
  const { locale, t } = useI18n();
  const idTypeLabels: Record<string, string> = {
    cni: t("centre", "identityTypeNationalCard"), passeport: t("centre", "identityTypePassport"),
    carte_sejour: t("centre", "identityTypeResidenceCard"), autre: t("centre", "identityTypeOther"),
  };
  const relationLabel = (relation: string) => {
    const keys: Record<string, string> = { "Père": "identityRelationFather", "Mère": "identityRelationMother", Tuteur: "identityRelationGuardian", Oncle: "identityRelationUncle", Tante: "identityRelationAunt", "Frère": "identityRelationBrother", "Sœur": "identityRelationSister", Autre: "identityRelationOther" };
    return keys[relation] ? t("centre", keys[relation]) : relation;
  };
  const [details, setDetails] = useState<StudentDetails>({
    country: null, country_code: null, region: null,
    id_type: null, id_number: null,
    guardian_name: null, guardian_relation: null, guardian_phone: null,
    notes: null,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFiche, setShowFiche] = useState(false);
  const [attestationBusy, setAttestationBusy] = useState(false);

  // Formulaire identité
  const [form, setForm] = useState<StudentDetails>(details);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");

  // Guardian country & phone
  const [guardianCountryCode, setGuardianCountryCode] = useState("CM");
  const [guardianPhoneCode, setGuardianPhoneCode] = useState("+237");
  const [guardianPhoneNum, setGuardianPhoneNum] = useState("");

  // Édition filière / niveau / classe
  const [editingPlacement, setEditingPlacement] = useState(false);
  const [placementSaving, setPlacementSaving] = useState(false);
  const [placementError, setPlacementError] = useState("");
  const [filieres, setFilieres] = useState<{ id: string; name: string; type: string | null }[]>([]);
  const [niveaux, setNiveaux] = useState<{ id: string; annee: number | null }[]>([]);
  const [groupes, setGroupes] = useState<{ id: string; nom: string }[]>([]);
  const [placeFiliereId, setPlaceFiliereId] = useState("");
  const [placeNiveauId, setPlaceNiveauId] = useState("");
  const [placeGroupeId, setPlaceGroupeId] = useState("");
  const [placeLoadingOpts, setPlaceLoadingOpts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: detailRow } = await supabase
      .from("student_details")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    const parsed: StudentDetails = detailRow || {
      country: null, country_code: null, region: null,
      id_type: null, id_number: null,
      guardian_name: null, guardian_relation: null, guardian_phone: null,
      notes: null,
    };
    setDetails(parsed);
    setForm(parsed);
    setSelectedCountryCode(
      resolveStudentCountryCode(COUNTRY_OPTIONS, {
        country: parsed.country,
        country_code: parsed.country_code,
      }),
    );

    const parsedG = parseGuardianPhone(parsed.guardian_phone, COUNTRY_OPTIONS);
    setGuardianCountryCode(parsedG.countryCode);
    setGuardianPhoneCode(parsedG.phoneCode);
    setGuardianPhoneNum(parsedG.localPhone);

    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  // Upload photo
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(t("centre", "identityImageTooLarge")); return; }
    if (!file.type.startsWith("image/")) { alert(t("centre", "identityUnsupportedFile")); return; }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${studentId}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", studentId);
      onAvatarUpdated(`${urlData.publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      alert(t("centre", "identityUploadError", { message: err.message }));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Changement de pays dans le formulaire
  const handleFormCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    const patch = buildCountryFormPatch(COUNTRY_OPTIONS, code);
    if (patch) {
      setForm((f) => ({ ...f, ...patch }));
    } else {
      setForm((f) => ({ ...f, country: null, country_code: null, region: null }));
    }
  };

  const handleGuardianCountryChange = (code: string) => {
    setGuardianCountryCode(code);
    const found = COUNTRY_OPTIONS.find((c) => c.code === code);
    const pCode = found?.phone_code || "+237";
    setGuardianPhoneCode(pCode);
    setForm((f) => ({
      ...f,
      guardian_phone: guardianPhoneNum.trim() ? `${pCode} ${guardianPhoneNum.trim()}` : null,
    }));
  };

  const handleGuardianPhoneNumChange = (num: string) => {
    const clean = num.replace(/[^\d\s]/g, "");
    setGuardianPhoneNum(clean);
    setForm((f) => ({
      ...f,
      guardian_phone: clean.trim() ? `${guardianPhoneCode} ${clean.trim()}` : null,
    }));
  };

  // Sauvegarde
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("student_details").upsert({
      student_id: studentId,
      ...form,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      alert(t("centre", "identityGenericError", { message: error.message }));
    } else {
      setDetails(form);
      setEditing(false);
    }
    setSaving(false);
  };

  // Démarrer l'édition
  const startEdit = () => {
    setForm(details);
    setSelectedCountryCode(
      resolveStudentCountryCode(COUNTRY_OPTIONS, {
        country: details.country,
        country_code: details.country_code,
      }),
    );
    const parsedG = parseGuardianPhone(details.guardian_phone, COUNTRY_OPTIONS);
    setGuardianCountryCode(parsedG.countryCode);
    setGuardianPhoneCode(parsedG.phoneCode);
    setGuardianPhoneNum(parsedG.localPhone);
    setEditing(true);
  };

  const selectedPlaceFiliere = filieres.find((f) => f.id === placeFiliereId);
  const needsNiveau = selectedPlaceFiliere?.type === "cursus";

  const loadPlacementOptions = useCallback(async (filiereId: string, niveauId: string | null) => {
    setPlaceLoadingOpts(true);
    try {
      const { data: filRows } = await supabase
        .from("filieres")
        .select("id, name, type")
        .eq("center_id", centerId)
        .eq("status", "published")
        .order("name");
      setFilieres((filRows || []).map((f) => ({ id: f.id, name: f.name, type: f.type })));

      if (!filiereId) {
        setNiveaux([]);
        setGroupes([]);
        return;
      }

      const { data: nivRows } = await supabase
        .from("niveaux")
        .select("id, annee")
        .eq("filiere_id", filiereId)
        .order("annee");
      setNiveaux((nivRows || []).map((n) => ({ id: n.id, annee: n.annee })));

      let grpQuery = supabase.from("groupes").select("id, nom");
      if (niveauId) {
        grpQuery = grpQuery.or(`filiere_id.eq.${filiereId},niveau_id.eq.${niveauId}`);
      } else {
        grpQuery = grpQuery.eq("filiere_id", filiereId);
      }
      const { data: grpRows } = await grpQuery.order("nom");
      setGroupes((grpRows || []).map((g) => ({ id: g.id, nom: g.nom })));
    } finally {
      setPlaceLoadingOpts(false);
    }
  }, [centerId]);

  const startPlacementEdit = async () => {
    if (!enrollmentId || !enrollmentInfo) return;
    setPlacementError("");
    const fId = enrollmentInfo.filiere_id || "";
    const nId = enrollmentInfo.niveau_id || "";
    const gId = enrollmentInfo.groupe_id || "";
    setPlaceFiliereId(fId);
    setPlaceNiveauId(nId);
    setPlaceGroupeId(gId);
    setEditingPlacement(true);
    await loadPlacementOptions(fId, nId || null);
  };

  useEffect(() => {
    if (!editingPlacement || !placeFiliereId) return;
    let cancelled = false;
    (async () => {
      setPlaceLoadingOpts(true);
      try {
        const { data: nivRows } = await supabase
          .from("niveaux")
          .select("id, annee")
          .eq("filiere_id", placeFiliereId)
          .order("annee");
        if (cancelled) return;
        setNiveaux((nivRows || []).map((n) => ({ id: n.id, annee: n.annee })));

        const niveauId = placeNiveauId || null;
        let grpQuery = supabase.from("groupes").select("id, nom");
        if (niveauId) {
          grpQuery = grpQuery.or(`filiere_id.eq.${placeFiliereId},niveau_id.eq.${niveauId}`);
        } else {
          grpQuery = grpQuery.eq("filiere_id", placeFiliereId);
        }
        const { data: grpRows } = await grpQuery.order("nom");
        if (cancelled) return;
        const nextGroupes = (grpRows || []).map((g) => ({ id: g.id, nom: g.nom }));
        setGroupes(nextGroupes);
        if (placeGroupeId && !nextGroupes.some((g) => g.id === placeGroupeId)) {
          setPlaceGroupeId("");
        }
      } finally {
        if (!cancelled) setPlaceLoadingOpts(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload options when filiere/niveau change
  }, [editingPlacement, placeFiliereId, placeNiveauId]);

  const savePlacement = async () => {
    if (!enrollmentId) return;
    if (!placeFiliereId) {
      setPlacementError(t("centre", "identityChooseProgram"));
      return;
    }
    if (needsNiveau && !placeNiveauId) {
      setPlacementError(t("centre", "identityChooseLevel"));
      return;
    }
    setPlacementSaving(true);
    setPlacementError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t("centre", "passageSessionExpired"));
      const res = await fetch("/api/center/enrollment-placement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          filiere_id: placeFiliereId,
          niveau_id: placeNiveauId || null,
          groupe_id: placeGroupeId || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t("centre", "identityUpdateError"));
      setEditingPlacement(false);
      onEnrollmentUpdated?.();
    } catch (e: unknown) {
      setPlacementError(e instanceof Error ? e.message : t("centre", "passageError"));
    } finally {
      setPlacementSaving(false);
    }
  };

  const downloadAttestation = async () => {
    if (!centerId || attestationBusy) return;
    setAttestationBusy(true);
    try {
      const config = await fetchDocumentExportConfig(supabase, centerId, { documentType: "attestation" });
      const { data: sigRows } = await supabase
        .from("bulletin_signatures")
        .select("id, name, title, signature_url")
        .eq("center_id", centerId)
        .order("display_order");
      const { data: branding } = await supabase
        .from("center_branding")
        .select("stamp_url")
        .eq("center_id", centerId)
        .maybeSingle();
      const signatures = filterSignatures(sigRows || [], config.signatureIds);
      await downloadAttestationReussitePdf({
        studentName: studentName,
        programName: enrollmentInfo?.filiere_name || null,
        niveauLabel: enrollmentInfo?.niveau_annee != null ? `${t("centre", "identityLevel")} ${enrollmentInfo.niveau_annee}` : null,
        classeLabel: enrollmentInfo?.groupe_nom || null,
        academicYear: enrollmentInfo?.academic_year || null,
        issuedAt: new Date().toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB"),
        config,
        signatures,
        stampUrl: branding?.stamp_url || null,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : t("centre", "identityAttestationError"));
    } finally {
      setAttestationBusy(false);
    }
  };

  const regions = getRegionsForCountry(COUNTRY_OPTIONS, selectedCountryCode);

  if (loading) return <p className="text-sm text-neutral-400 p-8">{t("centre", "identityLoadingRecord")}</p>;

  return (
    <div className="w-full">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {editing ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5 mb-4">
          <button type="button" onClick={() => setEditing(false)} className="px-3 h-9 rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 transition-colors">{t("centre", "identityCancel")}</button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ORANGE }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {t("centre", "identitySave")}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-1.5 mb-4">
          <button
            type="button"
            onClick={startEdit}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors"
          >
            <Edit3 size={12} /> {t("centre", "identityEditRecord")}
          </button>
        </div>
      )}

      <DossierSection
        icon={BookOpen}
        title={t("centre", "identityGeneralInfo")}
        description={t("centre", "identityGeneralDescription")}
        actions={enrollmentId ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFiche(true)}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: BLUE }}
            >
              <FileText size={14} /> {t("centre", "identityEnrollmentForm")}
            </button>
            <button
              type="button"
              onClick={() => void downloadAttestation()}
              disabled={attestationBusy}
              className="inline-flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-semibold border border-black/[0.08] bg-white text-neutral-700 hover:bg-black/[0.03] disabled:opacity-50"
            >
              {attestationBusy ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
              {t("centre", "identitySuccessCertificate")}
            </button>
          </div>
        ) : undefined}
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-orange-50 border border-orange-100 flex items-center justify-center">
              {avatarUploading ? (
                <Loader2 size={24} className="text-orange-500 animate-spin" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={t("centre", "identityPhoto")} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black" style={{ color: ORANGE }}>
                  {studentName.split(" ").map((w) => w[0]).join("").substring(0, 2)}
                </span>
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-orange-50 transition-colors" aria-label={t("centre", "identityChangePhoto")}>
              <Camera size={13} style={{ color: ORANGE }} />
            </button>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-extrabold text-lg truncate" style={{ color: BLUE }}>{studentName}</p>
            <p className="text-sm text-neutral-500 font-medium truncate">{studentEmail}</p>
            {studentPhone && <p className="text-sm text-neutral-500 font-medium">{studentPhone}</p>}
            {details.country && (
              <p className="text-sm text-neutral-500 font-medium flex items-center gap-1.5 pt-1">
                <Globe size={14} className="text-neutral-400" />
                {details.country}{details.region ? `, ${details.region}` : ""}
              </p>
            )}
          </div>
        </div>

        {enrollmentInfo && (
          <div className="pt-2 border-t border-black/[0.06]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-neutral-600">{t("centre", "identityPath")}</p>
              {enrollmentId && !editingPlacement && (
                <button
                  type="button"
                  onClick={startPlacementEdit}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-black/[0.08] text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors"
                >
                  <Edit3 size={12} /> {t("centre", "identityEditPath")}
                </button>
              )}
            </div>

            {editingPlacement ? (
              <div className="space-y-3">
                <div>
                  <label className={FIELD_LABEL}>{t("centre", "identityProgramTrack")}</label>
                  <select
                    value={placeFiliereId}
                    onChange={(e) => {
                      setPlaceFiliereId(e.target.value);
                      setPlaceNiveauId("");
                      setPlaceGroupeId("");
                    }}
                    className={FIELD_INPUT}
                  >
                    <option value="">{t("centre", "identityChoose")}</option>
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
                {(needsNiveau || niveaux.length > 0) && (
                  <div>
                    <label className={FIELD_LABEL}>{t("centre", "identityLevel")}</label>
                    <select
                      value={placeNiveauId}
                      onChange={(e) => {
                        setPlaceNiveauId(e.target.value);
                        setPlaceGroupeId("");
                      }}
                      className={FIELD_INPUT}
                    >
                      <option value="">{t("centre", "identityChoose")}</option>
                      {niveaux.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.annee != null ? `${t("centre", "identityLevel")} ${n.annee}` : t("centre", "identityLevel")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className={FIELD_LABEL}>{t("centre", "identityClass")}</label>
                  <select
                    value={placeGroupeId}
                    onChange={(e) => setPlaceGroupeId(e.target.value)}
                    disabled={placeLoadingOpts}
                    className={`${FIELD_INPUT} disabled:opacity-50`}
                  >
                    <option value="">{t("centre", "identityNoneDefine")}</option>
                    {groupes.map((g) => (
                      <option key={g.id} value={g.id}>{g.nom}</option>
                    ))}
                  </select>
                </div>
                {placementError && (
                  <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {placementError}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setEditingPlacement(false); setPlacementError(""); }}
                    className="px-3 h-10 rounded-lg bg-neutral-100 text-sm font-semibold text-neutral-600 hover:bg-neutral-200"
                  >
                    {t("centre", "identityCancel")}
                  </button>
                  <button
                    type="button"
                    onClick={savePlacement}
                    disabled={placementSaving || placeLoadingOpts}
                    className="flex items-center gap-1.5 px-4 h-10 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: ORANGE }}
                  >
                    {placementSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {t("centre", "identitySave")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3 border border-black/[0.06]">
                  <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityProgram")}</p>
                  <p className="font-semibold mt-0.5" style={{ color: BLUE }}>{enrollmentInfo.filiere_name}</p>
                </div>
                {enrollmentInfo.niveau_annee != null && (
                  <div className="bg-white rounded-lg p-3 border border-black/[0.06]">
                    <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityLevel")}</p>
                    <p className="font-semibold mt-0.5" style={{ color: BLUE }}>{t("centre", "identityYear", { year: enrollmentInfo.niveau_annee })}</p>
                  </div>
                )}
                {!enrollmentInfo.niveau_annee && enrollmentInfo.duration_label && (
                  <div className="bg-white rounded-lg p-3 border border-black/[0.06]">
                    <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityDuration")}</p>
                    <p className="font-semibold mt-0.5" style={{ color: BLUE }}>{enrollmentInfo.duration_label}</p>
                  </div>
                )}
                {enrollmentInfo.academic_year && (
                  <div className="bg-white rounded-lg p-3 border border-black/[0.06]">
                    <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityAcademicYear")}</p>
                    <p className="font-semibold mt-0.5" style={{ color: BLUE }}>{enrollmentInfo.academic_year}</p>
                  </div>
                )}
                {enrollmentInfo.passage_decision && (
                  <div className="bg-white rounded-lg p-3 border border-black/[0.06] col-span-2">
                    <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityProgressionDecision")}</p>
                    <p className="font-semibold mt-0.5" style={{ color: BLUE }}>
                      {locale === "fr" ? passageDecisionLabelFr(enrollmentInfo.passage_decision) : enrollmentInfo.passage_decision === "admis" ? t("centre", "studentsPassed") : enrollmentInfo.passage_decision === "redouble" ? t("centre", "studentsRepeats") : t("centre", "studentsDeferred")}
                    </p>
                    {enrollmentInfo.passage_reason && (
                      <p className="text-sm font-medium text-neutral-600 mt-1">
                        {t("centre", "passageReason")} {enrollmentInfo.passage_reason}
                      </p>
                    )}
                  </div>
                )}
                <div className="bg-white rounded-lg p-3 border border-black/[0.06]">
                  <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityClassroom")}</p>
                  <p className="font-semibold mt-0.5" style={{ color: BLUE }}>{enrollmentInfo.groupe_nom || "—"}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-black/[0.06]">
                  <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityStatus")}</p>
                  <p className="font-semibold mt-0.5" style={{ color: BLUE }}>
                    {enrollmentInfo.status === "draft" ? t("centre", "identityDraft") : enrollmentInfo.status === "active" ? t("centre", "identityActive") : enrollmentInfo.status}
                  </p>
                </div>
                {enrollmentInfo.enrolled_at && (
                  <div className="bg-white rounded-lg p-3 border border-black/[0.06]">
                    <p className="text-xs font-semibold text-neutral-400">{t("centre", "identityEnrolledOn")}</p>
                    <p className="font-semibold mt-0.5" style={{ color: BLUE }}>{new Date(enrollmentInfo.enrolled_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DossierSection>

      <DossierSection
        icon={CreditCard}
        title={t("centre", "identityTitle")}
        description={t("centre", "identityDescription")}
      >
        <div>
          <p className="text-sm font-semibold text-neutral-600 mb-3">{t("centre", "identityDocument")}</p>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={FIELD_LABEL}>{t("centre", "identityType")}</label>
                <select value={form.id_type || ""} onChange={(e) => setForm((f) => ({ ...f, id_type: e.target.value || null }))} className={FIELD_INPUT}>
                  <option value="">{t("centre", "identitySelect")}</option>
                  {Object.entries(idTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={FIELD_LABEL}>{t("centre", "identityNumber")}</label>
                <input value={form.id_number || ""} onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value || null }))} placeholder={t("centre", "identityDocumentNumber")} className={FIELD_INPUT} />
              </div>
            </div>
          ) : details.id_type ? (
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-neutral-400 font-medium">{t("centre", "identityType")} :</span> <span className="font-semibold" style={{ color: BLUE }}>{idTypeLabels[details.id_type] || details.id_type}</span></div>
              <div><span className="text-neutral-400 font-medium">{t("centre", "identityNumber")} :</span> <span className="font-semibold font-mono" style={{ color: BLUE }}>{details.id_number || "—"}</span></div>
            </div>
          ) : (
            <p className="text-sm text-neutral-400 italic">{t("centre", "identityNotProvided")}</p>
          )}
        </div>

        <div className="pt-2 border-t border-black/[0.06]">
          <p className="text-sm font-semibold text-neutral-600 mb-3 flex items-center gap-1.5"><Globe size={14} /> {t("centre", "identityLocation")}</p>
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={FIELD_LABEL}>{t("centre", "identityCountry")}</label>
                <select value={selectedCountryCode} onChange={(e) => handleFormCountryChange(e.target.value)} className={FIELD_INPUT}>
                  <option value="">{t("centre", "identitySelect")}</option>
                  {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.phone_code})</option>)}
                </select>
              </div>
              <div>
                <label className={FIELD_LABEL}>{t("centre", "identityRegion")}</label>
                {regions.length > 0 ? (
                  <select value={form.region || ""} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value || null }))} className={FIELD_INPUT}>
                    <option value="">{t("centre", "identitySelect")}</option>
                    {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <input value={form.region || ""} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value || null }))} placeholder={t("centre", "identityEnterRegion")} className={FIELD_INPUT} />
                )}
              </div>
            </div>
          ) : details.country ? (
            <p className="text-sm font-semibold" style={{ color: BLUE }}>
              {details.country}{details.region ? ` · ${details.region}` : ""}
            </p>
          ) : (
            <p className="text-sm text-neutral-400 italic">{t("centre", "identityNotProvided")}</p>
          )}
        </div>
      </DossierSection>

      <DossierSection
        icon={Users}
        title={t("centre", "identityGuardian")}
        description={t("centre", "identityGuardianDescription")}
      >
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={FIELD_LABEL}>{t("centre", "identityFullName")}</label>
                <input value={form.guardian_name || ""} onChange={(e) => setForm((f) => ({ ...f, guardian_name: e.target.value || null }))} placeholder={t("centre", "identityGuardianName")} className={FIELD_INPUT} />
              </div>
              <div>
                <label className={FIELD_LABEL}>{t("centre", "identityRelationship")}</label>
                <select value={form.guardian_relation || ""} onChange={(e) => setForm((f) => ({ ...f, guardian_relation: e.target.value || null }))} className={FIELD_INPUT}>
                  <option value="">{t("centre", "identitySelect")}</option>
                  {RELATION_OPTIONS.map((r) => <option key={r} value={r}>{relationLabel(r)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`${FIELD_LABEL} flex items-center gap-1.5`}><Globe size={14} /> {t("centre", "identityGuardianCountry")}</label>
                <select value={guardianCountryCode} onChange={(e) => handleGuardianCountryChange(e.target.value)} className={FIELD_INPUT}>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.phone_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`${FIELD_LABEL} flex items-center gap-1.5`}><Phone size={14} /> {t("centre", "identityGuardianPhone")}</label>
                <div className="flex gap-2">
                  <div className="h-12 px-3 rounded-lg border border-black/[0.08] bg-[#FFF5EE] flex items-center shrink-0">
                    <span className="text-sm font-semibold" style={{ color: BLUE }}>{guardianPhoneCode}</span>
                  </div>
                  <input
                    type="tel"
                    value={guardianPhoneNum}
                    onChange={(e) => handleGuardianPhoneNumChange(e.target.value)}
                    placeholder="6XX XXX XXX"
                    className={`flex-1 ${FIELD_INPUT}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : details.guardian_name || details.guardian_phone ? (
          <div className="text-sm space-y-1">
            <div><span className="text-neutral-400 font-medium">{t("centre", "identityNameShort")}</span> <span className="font-semibold" style={{ color: BLUE }}>{details.guardian_name || "—"}</span>{details.guardian_relation && <span className="text-neutral-400"> ({relationLabel(details.guardian_relation)})</span>}</div>
            {details.guardian_phone && <div><span className="text-neutral-400 font-medium">{t("centre", "identityPhoneShort")}</span> <span className="font-semibold" style={{ color: BLUE }}>{details.guardian_phone}</span></div>}
          </div>
        ) : (
          <p className="text-sm text-neutral-400 italic">{t("centre", "identityNotProvided")}</p>
        )}
      </DossierSection>

      <DossierSection
        icon={FileText}
        title={t("centre", "identityNotes")}
        description={t("centre", "identityNotesDescription")}
      >
        {editing ? (
          <textarea rows={4} value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} placeholder={t("centre", "identityNotesPlaceholder")} className="w-full p-3.5 rounded-lg border border-black/[0.08] bg-white text-base font-semibold outline-none resize-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10" />
        ) : details.notes ? (
          <p className="text-sm text-neutral-700 whitespace-pre-wrap font-medium">{details.notes}</p>
        ) : (
          <p className="text-sm text-neutral-400 italic">{t("centre", "identityNoNote")}</p>
        )}
      </DossierSection>

      {showFiche && enrollmentId && (
        <FicheInscriptionModal
          studentId={studentId}
          enrollmentId={enrollmentId}
          onClose={() => setShowFiche(false)}
        />
      )}
    </div>
  );
}
