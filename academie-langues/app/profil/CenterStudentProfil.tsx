"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Camera,
  CreditCard,
  Edit2,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Package,
  PauseCircle,
  Phone,
  Save,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { logoutAndClearSession } from "@/app/utils/session";
import {
  centerAccessStatusLabel,
  financeStatusLabel,
  formatDateFr,
  formatDateTimeFr,
  formatEnrollmentDuration,
  packDisplayName,
} from "@/app/utils/student-profile";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import DownloadAppButton from "@/app/components/DownloadAppButton";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { AFRICA_54, findAfricaCountry, resolveAfricaCountry } from "@/app/data/africa-54";
import { checkPasswordStrength, PASSWORD_POLICY_HINT } from "@/app/utils/password-policy";
import {
  NEXA_STUDENT_QUOTA_LABELS,
  NEXA_STUDENT_QUOTAS,
  type NexaStudentQuotas,
} from "@/app/data/nexaOffers";
import { useI18n } from "@/app/i18n/I18nProvider";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import { localizeInstallmentLabel, localizePaymentMethod } from "@/app/utils/financeI18n";

type StudentAccount = {
  user: { id: string; email: string | null; created_at: string | null };
  profile: {
    id: string;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    phone: string | null;
    ville: string | null;
    city: string | null;
    country: string | null;
    country_code: string | null;
    region: string | null;
    birth_date: string | null;
    genre: string | null;
    avatar_url: string | null;
    created_at: string | null;
    center_status: string | null;
    tag_status: string | null;
    access_pause_reason?: string | null;
    pack_name: string | null;
    subscription_ends_at: string | null;
    ee_total: number | null;
    ee_used: number | null;
    exam_total: number | null;
    exam_used: number | null;
    exam_4m_total?: number | null;
    exam_4m_used?: number | null;
    eo_total?: number | null;
    eo_used?: number | null;
    tutor_ia_total?: number | null;
    tutor_ia_used?: number | null;
  };
  center: {
    id: string;
    name: string;
    code: string | null;
    city: string | null;
    status: string;
    center_type?: string | null;
  };
  nexaQuotas?: NexaStudentQuotas | null;
  nexaOffer?: string;
  isPluriannual?: boolean;
  enrollment: {
    id: string;
    status: string;
    tuition_fee: number | null;
    catalog_tuition_fee: number | null;
    duration_value: number | null;
    duration_unit: string | null;
    duration_months: number | null;
    enrolled_at: string | null;
    price_note: string | null;
  } | null;
  finance: {
    tuition_fee: number;
    tuition_paid: number;
    financial_status: string | null;
    remaining: number;
    discount_amount?: number;
    discount_reason?: string | null;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    payment_method: string | null;
    payment_date: string | null;
    receipt_number: string | null;
  }>;
  installments?: Array<{
    id: string;
    label: string | null;
    amount: number;
    due_date: string | null;
    status: string | null;
    paid_amount: number;
    original_due_date: string | null;
    deferral_reason: string | null;
  }>;
  financeEvents?: Array<{
    id: string;
    type: string;
    amount: number | null;
    reason: string | null;
    created_at: string;
    payload: Record<string, unknown> | null;
  }>;
};

export default function CenterStudentProfil() {
  const { locale } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [account, setAccount] = useState<StudentAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    phone: "",
    ville: "",
    countryCode: "",
    birth_date: "",
  });
  const [savedForm, setSavedForm] = useState({
    prenom: "",
    nom: "",
    phone: "",
    ville: "",
    countryCode: "",
    birth_date: "",
  });

  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const financeEn = locale === "en" && !isTcfCanadaCenter(account?.center.center_type);
  const financeLocale = financeEn ? "en-US" : "fr-FR";
  const financeDate = (value?: string | null) => value
    ? new Date(value).toLocaleString(financeLocale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const localizedFinanceStatus = (status?: string | null) => financeEn
    ? ({ pending: "Awaiting payment", current: "In progress", paid: "Paid in full", late: "Overdue", exempt: "Exempt" } as Record<string, string>)[status || ""] || status || "—"
    : financeStatusLabel(status);

  const readJson = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Reponse non JSON (${res.status}) : ${text.slice(0, 160)}`);
    }
  };

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const loadAccount = async () => {
    const headers = await authHeaders();
    if (!headers) {
      router.replace("/login");
      return;
    }

    const res = await fetch("/api/student/account", { headers });
    const json = await readJson(res);
    if (!res.ok) {
      setLoadError(json.error || "Impossible d'ouvrir votre profil.");
      setLoading(false);
      return;
    }

    const resolvedCountry = resolveAfricaCountry(
      json.profile?.country_code || json.profile?.country,
    );
    const countryCode = resolvedCountry?.code || "";

    const nextForm = {
      prenom: json.profile?.prenom || "",
      nom: json.profile?.nom || "",
      phone: json.profile?.phone || "",
      ville: json.profile?.ville || json.profile?.city || "",
      countryCode,
      birth_date: (json.profile?.birth_date || "").slice(0, 10),
    };

    setAccount(json);
    setForm(nextForm);
    setSavedForm(nextForm);
    setLoading(false);
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const displayCountry =
    account?.profile?.country ||
    resolveAfricaCountry(account?.profile?.country_code)?.name ||
    "—";

  const displayName = useMemo(() => {
    const prenom = account?.profile?.prenom?.trim();
    const nom = account?.profile?.nom?.trim();
    if (prenom && nom) return `${prenom} ${nom}`;
    if (prenom) return prenom;
    if (nom) return nom;
    return account?.profile?.email || account?.user.email || "Mon profil";
  }, [account]);

  const statusLabel = centerAccessStatusLabel(
    account?.profile?.center_status,
    account?.profile?.tag_status,
  );
  const isPaused =
    account?.profile?.center_status === "paused" ||
    account?.profile?.tag_status === "paused";
  const isRevoked =
    account?.profile?.center_status === "revoked" ||
    account?.profile?.tag_status === "revoque";
  const statusBadgeClass = isPaused
    ? "border-blue-100 bg-blue-50 text-blue-700"
    : isRevoked
      ? "border-red-100 bg-red-50 text-red-600"
      : "border-emerald-100 bg-emerald-50 text-emerald-700";
  const packLabel = packDisplayName(account?.profile?.pack_name);
  const durationLabel = formatEnrollmentDuration(
    account?.enrollment?.duration_value,
    account?.enrollment?.duration_unit,
    account?.enrollment?.duration_months,
  );

  const subscriptionDaysLeft = useMemo(() => {
    const ends = account?.profile?.subscription_ends_at;
    if (!ends) return null;
    return Math.max(0, Math.ceil((new Date(ends).getTime() - Date.now()) / 86400000));
  }, [account]);

  const startEditing = () => {
    setForm(savedForm);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setForm(savedForm);
    setIsEditing(false);
  };

  const saveProfile = async () => {
    const headers = await authHeaders();
    if (!headers) return;
    setSaving(true);
    try {
      const country = form.countryCode ? findAfricaCountry(form.countryCode) : undefined;
      const res = await fetch("/api/student/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          prenom: form.prenom,
          nom: form.nom,
          phone: form.phone,
          ville: form.ville,
          country: country?.name || account?.profile?.country || null,
          country_code: country?.dial || country?.code || null,
          birth_date: form.birth_date || null,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Mise a jour impossible.");

      setAccount((current) =>
        current ? { ...current, profile: { ...current.profile, ...json.profile } } : current,
      );
      const nextCountry = resolveAfricaCountry(
        json.profile?.country_code || json.profile?.country,
      );
      const nextForm = {
        prenom: json.profile?.prenom || "",
        nom: json.profile?.nom || "",
        phone: json.profile?.phone || "",
        ville: json.profile?.ville || json.profile?.city || "",
        countryCode: nextCountry?.code || "",
        birth_date: (json.profile?.birth_date || "").slice(0, 10),
      };
      setSavedForm(nextForm);
      setForm(nextForm);
      setIsEditing(false);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Mise a jour impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account?.user.id) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image trop lourde. Maximum 2 Mo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Fichier non supporte. Choisissez une image.");
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${account.user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const headers = await authHeaders();
      if (!headers) return;

      const res = await fetch("/api/student/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ avatar_url: urlData.publicUrl }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || "Mise a jour impossible.");

      setAccount((current) =>
        current
          ? {
              ...current,
              profile: { ...current.profile, ...json.profile, avatar_url: publicUrl },
            }
          : current,
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    const pwdCheck = checkPasswordStrength(passwordForm.password);
    if (!pwdCheck.ok) {
      setPasswordError(pwdCheck.message || PASSWORD_POLICY_HINT);
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      setPasswordForm({ password: "", confirm: "" });
      setPasswordMessage("Mot de passe mis a jour avec succes.");
      setPasswordOpen(false);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Impossible de modifier le mot de passe.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const signOut = async () => {
    const token = localStorage.getItem("session_token") || "";
    await logoutAndClearSession(token);
    router.replace("/login");
  };

  if (loading) {
    return <StudentRouteSkeleton contentOnly variant="page" />;
  }

  if (loadError || !account) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFBF7] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-xl font-black" style={{ color: BRAND.blue }}>Profil indisponible</p>
          <p className="mt-2 text-sm font-bold text-slate-500">{loadError || "Compte introuvable."}</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl px-5 text-xs font-black uppercase tracking-widest text-white hover:opacity-90"
            style={{ backgroundColor: BRAND.orange }}
          >
            Retour dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="platform-profile-page min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10 overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
        <div className="nexa-student-shell flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 md:py-4">
          <Link
            href="/dashboard"
            aria-label="Retour au tableau de bord"
            className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 shadow-sm hover:bg-neutral-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-orange-600">
              Mon profil
            </span>
            <h1
              className={`mt-1 truncate text-base sm:text-lg md:text-xl font-black leading-tight ${STUDENT_TEXT.pageTitle}`}
              style={{ color: BRAND.blue }}
            >
              {displayName}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <DownloadAppButton />
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="hidden h-11 items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 text-xs font-black uppercase tracking-widest text-orange-600 hover:bg-orange-100 lg:flex"
              >
                <Edit2 className="h-4 w-4" />
                Modifier
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEditing}
                  className="hidden h-11 items-center rounded-full border border-neutral-200 bg-neutral-50 px-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-neutral-100 lg:flex"
                >
                  Annuler
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="hidden h-11 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50 lg:flex"
                  style={{ backgroundColor: BRAND.blue }}
                >
                  <Save className="h-4 w-4" />
                  {saving ? "..." : "Enregistrer"}
                </button>
              </>
            )}
            <button
              onClick={signOut}
              aria-label="Déconnexion"
              className="flex h-10 w-10 sm:h-11 sm:w-auto sm:px-4 items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-100"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {isPaused && (
        <div className="nexa-student-shell pt-4 sm:pt-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: BRAND.blue }}
            >
              <PauseCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black" style={{ color: BRAND.blue }}>
                Profil en pause
              </p>
              <p className="mt-0.5 text-xs font-medium text-blue-800/80 leading-relaxed">
                Votre formation est temporairement suspendue
                {account.center?.name ? <> par <strong>{account.center.name}</strong></> : ""}.
                {" "}Contactez votre centre pour reprendre. Votre progression est conservée.
              </p>
              {account.profile?.access_pause_reason && (
                <div className="mt-3 rounded-xl border border-blue-200/80 bg-white/70 px-3 py-2 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Motif</p>
                  <p className="mt-0.5 text-xs font-bold text-blue-900 leading-relaxed">
                    {account.profile.access_pause_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="nexa-student-shell grid gap-4 sm:gap-5 md:gap-6 py-5 sm:py-6 md:py-8 xl:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
        <aside className="min-w-0 space-y-4 sm:space-y-5">
          <section className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-neutral-200 bg-white p-4 sm:p-5 md:p-6 text-center shadow-sm">
            <div className="absolute top-0 left-0 h-1 w-full" style={{ backgroundColor: BRAND.orange }} />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="mx-auto mb-3 sm:mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-orange-200/40 bg-orange-50">
              {avatarUploading ? (
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
              ) : account.profile.avatar_url ? (
                <img src={account.profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User className="h-9 w-9 sm:h-10 sm:w-10 text-orange-600" />
              )}
            </div>

            {!avatarUploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-neutral-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              >
                <Camera size={11} /> Modifier la photo
              </button>
            )}

            <div className="mt-4 sm:mt-5">
              <div className="flex items-center justify-center gap-2 px-2">
                <p className="truncate text-lg sm:text-xl font-black">{displayName}</p>
                <BadgeCheck className="h-5 w-5 shrink-0 text-orange-500" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                  Étudiant TCF
                </span>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusBadgeClass}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 border-t border-neutral-100 pt-4 sm:pt-5 text-left">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">Informations personnelles</p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                    {isEditing ? "Modifiez vos informations." : "Vos informations de profil."}
                  </p>
                </div>
                {isEditing && (
                  <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-orange-600">
                    Edition
                  </span>
                )}
              </div>

              {isEditing && (
                <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <Field label="Prenom" value={form.prenom} onChange={(value) => setForm((c) => ({ ...c, prenom: value }))} />
                  <Field label="Nom" value={form.nom} onChange={(value) => setForm((c) => ({ ...c, nom: value }))} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 text-sm font-semibold text-slate-500 sm:grid-cols-2 lg:grid-cols-1">
                <InfoLine icon={Mail} label="Email" value={account.profile.email || account.user.email || "—"} />
                {isEditing ? (
                  <Field label="Telephone / WhatsApp" value={form.phone} onChange={(value) => setForm((c) => ({ ...c, phone: value }))} />
                ) : (
                  <InfoLine icon={Phone} label="Telephone / WhatsApp" value={savedForm.phone || "—"} />
                )}
                {isEditing ? (
                  <label className="block min-w-0">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Pays</span>
                    <select
                      value={form.countryCode}
                      onChange={(e) => setForm((c) => ({ ...c, countryCode: e.target.value }))}
                      className="h-12 w-full max-w-full rounded-2xl border border-orange-200 bg-white px-3 sm:px-4 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-orange-500"
                    >
                      <option value="">Sélectionner un pays</option>
                      {AFRICA_54.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <InfoLine icon={Building2} label="Pays" value={displayCountry} />
                )}
                {isEditing ? (
                  <Field label="Ville" value={form.ville} onChange={(value) => setForm((c) => ({ ...c, ville: value }))} />
                ) : (
                  <InfoLine icon={MapPin} label="Ville" value={savedForm.ville || account.profile.city || "—"} />
                )}
                {isEditing ? (
                  <Field
                    label="Date de naissance"
                    value={form.birth_date}
                    onChange={(value) => setForm((c) => ({ ...c, birth_date: value }))}
                    type="date"
                  />
                ) : (
                  <InfoLine icon={Calendar} label="Date de naissance" value={formatDateFr(account.profile.birth_date)} />
                )}
                {account.profile.genre ? <InfoLine icon={User} label="Genre" value={account.profile.genre} /> : null}
                <InfoLine icon={Calendar} label="Membre depuis" value={formatDateFr(account.profile.created_at || account.user.created_at)} />
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:hidden">
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 text-sm font-black uppercase tracking-widest text-orange-600"
                  >
                    <Edit2 className="h-4 w-4" />
                    Modifier
                  </button>
                ) : (
                  <>
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-50"
                      style={{ backgroundColor: BRAND.blue }}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex h-11 w-full items-center justify-center rounded-2xl bg-neutral-100 text-sm font-black uppercase tracking-widest text-slate-500"
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          <button
            onClick={signOut}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 text-sm font-black uppercase tracking-widest text-white transition hover:bg-orange-600 lg:hidden"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </aside>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="rounded-[1.25rem] sm:rounded-[1.5rem] border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-black">Mot de passe</p>
                <p className="truncate text-[11px] font-bold text-slate-400">
                  Securisez votre compte de connexion.
                </p>
              </div>
              {!passwordOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setPasswordOpen(true);
                    setPasswordError(null);
                    setPasswordMessage(null);
                  }}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-orange-100 bg-orange-50 px-2.5 sm:px-3 text-[10px] font-black uppercase tracking-wider text-orange-600 hover:bg-orange-100"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Modifier</span>
                </button>
              )}
            </div>

            {passwordMessage && !passwordOpen && (
              <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                {passwordMessage}
              </p>
            )}

            {passwordOpen && (
              <div className="mt-5 border-t border-neutral-100 pt-5">
                <div className="mb-4">
                  <p className="text-sm font-black text-slate-900">Definir un nouveau mot de passe</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {PASSWORD_POLICY_HINT}
                  </p>
                </div>

                {passwordError && (
                  <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                    {passwordError}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Nouveau mot de passe"
                    value={passwordForm.password}
                    onChange={(value) => setPasswordForm((c) => ({ ...c, password: value }))}
                    type="password"
                  />
                  <Field
                    label="Confirmer le mot de passe"
                    value={passwordForm.confirm}
                    onChange={(value) => setPasswordForm((c) => ({ ...c, confirm: value }))}
                    type="password"
                  />
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordOpen(false);
                      setPasswordForm({ password: "", confirm: "" });
                      setPasswordError(null);
                    }}
                    disabled={passwordSaving}
                    className="h-11 w-full rounded-xl bg-neutral-100 px-5 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-neutral-200 disabled:opacity-50 sm:w-auto"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={passwordSaving}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-xs font-black uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-50 sm:w-auto"
                    style={{ backgroundColor: BRAND.orange }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {passwordSaving ? "Mise a jour..." : "Confirmer"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[1.5rem] sm:rounded-[2rem] border border-neutral-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6 flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: BRAND.orange }}>
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black">
                  {account.isPluriannual ? "Mon parcours" : "Mon offre / pack"}
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400">
                  {account.isPluriannual
                    ? "Détails de votre formation pluri-annuelle."
                    : "Details de votre formation TCF Canada."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                {account.isPluriannual ? "Parcours actif" : "Pack actif"}
              </p>
              <p className="mt-1 break-words text-xl sm:text-2xl font-black" style={{ color: BRAND.blue }}>
                {account.isPluriannual ? "Formation pluri-annuelle" : packLabel}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                <Stat label="Duree" value={durationLabel} />
                <Stat label="Fin d'acces" value={formatDateFr(account.profile.subscription_ends_at)} />
                <Stat label="Jours restants" value={subscriptionDaysLeft != null ? `${subscriptionDaysLeft} jours` : "—"} />
                <Stat label="Valide le" value={formatDateFr(account.enrollment?.enrolled_at)} />
              </div>
              {account.enrollment?.price_note ? (
                <p className="mt-4 text-xs font-bold text-slate-500 break-words">{account.enrollment.price_note}</p>
              ) : null}
            </div>

            {!account.isPluriannual && account.nexaQuotas !== null && (
            <div className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vos quantités NEXA</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                Quotas inclus dans votre offre centre
                {account.nexaOffer ? ` (${String(account.nexaOffer).toUpperCase()})` : ""}.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2">
                {NEXA_STUDENT_QUOTA_LABELS.map(({ key, label }) => {
                  const quotas = account.nexaQuotas || NEXA_STUDENT_QUOTAS;
                  const allocated = quotas[key];
                  const p = account.profile;
                  let usage: string | null = null;
                  if (key === "expressionEcrite" && p.ee_total != null) {
                    usage = `${Math.max(0, (p.ee_total || 0) - (p.ee_used || 0))} / ${p.ee_total}`;
                  } else if (key === "modesExamensEe" && p.exam_total != null) {
                    usage = `${Math.max(0, (p.exam_total || 0) - (p.exam_used || 0))} / ${p.exam_total}`;
                  } else if (key === "expressionOrale" && p.eo_total != null) {
                    usage = `${Math.max(0, (p.eo_total || 0) - (p.eo_used || 0))} / ${p.eo_total}`;
                  } else if (key === "examenBlanc" && p.exam_4m_total != null) {
                    usage = `${Math.max(0, (p.exam_4m_total || 0) - (p.exam_4m_used || 0))} / ${p.exam_4m_total}`;
                  } else if (key === "sessionsTuteurIa" && p.tutor_ia_total != null) {
                    usage = `${Math.max(0, (p.tutor_ia_total || 0) - (p.tutor_ia_used || 0))} / ${p.tutor_ia_total}`;
                  }
                  const value =
                    typeof allocated === "boolean"
                      ? allocated
                        ? "Inclus"
                        : "—"
                      : usage || String(allocated);
                  return <Stat key={key} label={label} value={value} />;
                })}
              </div>
            </div>
            )}
          </section>

          <section className="rounded-[1.5rem] sm:rounded-[2rem] border border-neutral-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start sm:items-center gap-3">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: BRAND.blue }}>
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-black">Finance</p>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400">{financeEn ? "Payments, amounts and financial status." : "Paiements, montants et statut de votre dossier."}</p>
                </div>
              </div>
              {account.finance ? (
                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                    account.finance.financial_status === "paid"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : account.finance.financial_status === "late"
                        ? "border-red-100 bg-red-50 text-red-600"
                        : "border-orange-100 bg-orange-50 text-orange-600"
                  }`}
                >
                  {localizedFinanceStatus(account.finance.financial_status)}
                </span>
              ) : null}
            </div>

            {account.finance ? (
              <>
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FinanceCard label={financeEn ? "Program cost" : "Coût programme"} value={`${account.finance.tuition_fee.toLocaleString(financeLocale)} FCFA`} />
                  <FinanceCard label={financeEn ? "Paid" : "Versé"} value={`${account.finance.tuition_paid.toLocaleString(financeLocale)} FCFA`} accent="emerald" />
                  <FinanceCard label={financeEn ? "Balance due" : "Reste à payer"} value={`${account.finance.remaining.toLocaleString(financeLocale)} FCFA`} accent="red" />
                </div>

                {(account.finance.discount_amount || 0) > 0 && (
                  <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{financeEn ? "Discount" : "Réduction"}</p>
                    <p className="mt-1 text-sm font-black text-amber-900">
                      −{(account.finance.discount_amount || 0).toLocaleString(financeLocale)} FCFA
                      {account.finance.discount_reason ? `${financeEn ? ": " : " — "}${account.finance.discount_reason}` : ""}
                    </p>
                  </div>
                )}

                <div className="mb-5 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 sm:px-4 py-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{financeEn ? "Financial status" : "Statut financier"}</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{localizedFinanceStatus(account.finance.financial_status)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{financeEn ? "Progress" : "Progression"}</p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {account.finance.tuition_fee > 0
                          ? `${Math.min(100, Math.round((account.finance.tuition_paid / account.finance.tuition_fee) * 100))} %`
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${
                          account.finance.tuition_fee > 0
                            ? Math.min(100, Math.round((account.finance.tuition_paid / account.finance.tuition_fee) * 100))
                            : 0
                        }%`,
                        backgroundColor: BRAND.orange,
                      }}
                    />
                  </div>
                </div>

                {(account.installments?.length || 0) > 0 && (
                  <div className="mb-5">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{financeEn ? "Payment schedule" : "Échéancier"}</p>
                    <div className="space-y-2">
                      {account.installments!.map((inst) => {
                        const deferred = !!inst.original_due_date && inst.original_due_date !== inst.due_date;
                        const sold = inst.status === "paid" || inst.paid_amount >= inst.amount;
                        return (
                          <div key={inst.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 sm:p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black text-slate-900">{localizeInstallmentLabel(inst.label, financeEn ? "en" : "fr") || (financeEn ? "Installment" : "Échéance")}</p>
                                  {deferred && (
                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
                                      {financeEn ? "Deferred" : "Reporté"}
                                    </span>
                                  )}
                                  {sold && (
                                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                      {financeEn ? "Paid" : "Soldé"}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs font-bold text-slate-500">
                                  {financeEn ? "Due date" : "Échéance"} : {financeDate(inst.due_date)}
                                  {deferred && inst.original_due_date
                                    ? ` · ${financeEn ? "initially" : "initiale"} ${financeDate(inst.original_due_date)}`
                                    : ""}
                                </p>
                                {inst.deferral_reason && (
                                  <p className="mt-0.5 text-[11px] font-medium text-blue-600">{financeEn ? "Reason" : "Motif"} : {inst.deferral_reason}</p>
                                )}
                              </div>
                              <p className="text-sm font-black whitespace-nowrap">{inst.amount.toLocaleString(financeLocale)} FCFA</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{financeEn ? "Payment history" : "Historique des paiements"}</p>
                  {account.payments.length > 0 ? (
                    <div className="space-y-3">
                      {account.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex flex-col gap-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-black whitespace-nowrap">{payment.amount.toLocaleString(financeLocale)} FCFA</p>
                            <p className="text-xs font-bold text-slate-500 break-words">
                              {financeDate(payment.payment_date)}
                              {payment.payment_method ? ` · ${localizePaymentMethod(payment.payment_method, financeEn ? "en" : "fr")}` : ""}
                            </p>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                              {financeEn ? "Recorded" : "Enregistré"}
                            </span>
                            {payment.receipt_number ? (
                              <p className="mt-1 text-[10px] font-bold text-slate-400 break-all">{payment.receipt_number}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
                      {financeEn ? "No payment has been recorded yet." : "Aucun paiement enregistré pour le moment."}
                    </p>
                  )}
                </div>

                {(account.financeEvents?.length || 0) > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{financeEn ? "Deferrals and discounts" : "Reports & réductions"}</p>
                    <div className="space-y-2">
                      {account.financeEvents!.map((ev) => (
                        <div key={ev.id} className="rounded-2xl border border-neutral-100 bg-white px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {ev.type === "deferral" ? (financeEn ? "Deferral" : "Report") : ev.type === "discount" ? (financeEn ? "Discount" : "Réduction") : ev.type === "payment_note" ? (financeEn ? "Payment note" : "Note de paiement") : ev.type}
                            {" · "}{financeDate(ev.created_at)}
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {ev.type === "discount" && ev.amount != null
                              ? `−${Number(ev.amount).toLocaleString(financeLocale)} FCFA${financeEn ? ": " : " — "}`
                              : ""}
                            {ev.reason || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm font-bold text-slate-500">
                {financeEn ? "Your financial record will be available after the center validates your enrollment." : "Votre dossier financier sera disponible après validation de votre inscription par le centre."}
              </p>
            )}
          </section>
        </div>
      </section>

    </div>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 sm:px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-orange-600" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className="block truncate text-sm font-black text-slate-900" title={value}>{value}</span>
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        className={`h-12 w-full max-w-full rounded-2xl border px-3 sm:px-4 text-sm font-bold outline-none transition-colors ${
          readOnly
            ? "cursor-default border-neutral-100 bg-neutral-100 text-slate-500"
            : "border-orange-200 bg-white text-slate-900 focus:border-orange-500"
        }`}
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/80 bg-white/70 px-3 sm:px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function FinanceCard({
  label,
  value,
  accent = "blue",
}: {
  label: string;
  value: string;
  accent?: "blue" | "emerald" | "orange" | "red";
}) {
  const colors = {
    blue: "text-blue-700 border-blue-100 bg-blue-50",
    emerald: "text-emerald-700 border-emerald-100 bg-emerald-50",
    orange: "text-orange-700 border-orange-100 bg-orange-50",
    red: "text-red-700 border-red-100 bg-red-50",
  };

  return (
    <div className={`min-w-0 overflow-hidden rounded-2xl border p-3 sm:p-4 ${colors[accent]}`}>
      <div className="mb-2 flex items-center gap-1.5">
        <CreditCard className="h-3.5 w-3.5 shrink-0" />
        <p className="truncate text-[9px] font-black uppercase tracking-widest opacity-70">{label}</p>
      </div>
      <p className="whitespace-nowrap text-base font-black leading-tight sm:text-sm md:text-base lg:text-lg">{value}</p>
    </div>
  );
}
