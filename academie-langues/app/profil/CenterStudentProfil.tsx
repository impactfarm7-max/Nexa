"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  PauseCircle,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  User,
  Wallet,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { logoutAndClearSession } from "@/app/utils/session";
import {
  centerAccessStatusLabel,
  financeStatusLabel,
  formatDateFr,
  formatEnrollmentDuration,
  packDisplayName,
} from "@/app/utils/student-profile";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import DownloadAppButton from "@/app/components/DownloadAppButton";
import { LogoutConfirmDialog } from "@/app/components/LogoutConfirmDialog";
import { BRAND } from "@/app/utils/brand";
import { centerNotoSans } from "@/app/centre/center-page-ui";
import { AFRICA_54, findAfricaCountry, resolveAfricaCountry } from "@/app/data/africa-54";
import { checkPasswordStrength, PASSWORD_POLICY_HINT } from "@/app/utils/password-policy";
import { initPwaInstallCapture, isIosDevice, isPwaInstalled, promptPwaInstall } from "@/app/utils/pwa-install";
import {
  NEXA_STUDENT_QUOTA_LABELS,
  NEXA_STUDENT_QUOTAS,
  type NexaStudentQuotas,
} from "@/app/data/nexaOffers";
import { useI18n } from "@/app/i18n/I18nProvider";
import { isTcfCanadaCenter } from "@/app/data/tcf-teaching-subjects";
import { localizeInstallmentLabel, localizePaymentMethod } from "@/app/utils/financeI18n";
import {
  IdCard,
  MetaLine,
  Group,
  Row,
  EditableRow,
  AccordionRow,
  ButtonRow,
  PField,
  PButton,
  useAccordion,
} from "@/app/components/profile/ProfileKit";

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
  const { t, locale } = useI18n();
  const td = (key: string, values?: Record<string, string | number>) => t("dashboard", key, values);
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
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const acc = useAccordion();
  const financeEn = locale === "en" && !isTcfCanadaCenter(account?.center.center_type);
  const financeLocale = financeEn ? "en-US" : "fr-FR";
  const financeDate = (value?: string | null) => value
    ? new Date(value).toLocaleString(financeLocale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const localizedFinanceStatus = (status?: string | null) =>
    financeStatusLabel(status, financeEn ? "en" : "fr");

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
      setLoadError(json.error || td("profilOpenError"));
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

  useEffect(() => {
    initPwaInstallCapture();
    const sync = () => setCanInstallApp(!isPwaInstalled());
    sync();
    window.addEventListener("nexa-pwa-install-ready", sync);
    return () => window.removeEventListener("nexa-pwa-install-ready", sync);
  }, []);

  const handleInstallRow = async () => {
    if (installBusy || isPwaInstalled()) return;
    if (isIosDevice()) {
      document.querySelector<HTMLButtonElement>('button[aria-label="Télécharger l\'app"]')?.click();
      return;
    }
    setInstallBusy(true);
    try {
      await promptPwaInstall();
      setCanInstallApp(!isPwaInstalled());
    } finally {
      setInstallBusy(false);
    }
  };

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
    return account?.profile?.email || account?.user.email || td("profilMyProfile");
  }, [account, t]);

  const statusLabel = centerAccessStatusLabel(
    account?.profile?.center_status,
    account?.profile?.tag_status,
    td,
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
    td,
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
      if (!res.ok) throw new Error(json.error || td("profilUpdateError"));

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
      alert(error instanceof Error ? error.message : td("profilUpdateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account?.user.id) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(td("profilImageTooHeavy2Mb"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert(td("profilUnsupportedImage"));
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
      if (!res.ok) throw new Error(json.error || td("profilUpdateError"));

      setAccount((current) =>
        current
          ? {
              ...current,
              profile: { ...current.profile, ...json.profile, avatar_url: publicUrl },
            }
          : current,
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : td("profilUploadError"));
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
      setPasswordError(td("profilPasswordsMismatch"));
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      setPasswordForm({ password: "", confirm: "" });
      setPasswordMessage(td("profilPasswordUpdated"));
      acc.close();
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : td("profilPasswordUpdateError"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const signOut = async () => {
    setLogoutBusy(true);
    try {
      const token = localStorage.getItem("session_token") || "";
      await logoutAndClearSession(token);
      router.replace("/login");
    } finally {
      setLogoutBusy(false);
      setLogoutConfirmOpen(false);
    }
  };

  if (loading) {
    return <StudentRouteSkeleton contentOnly variant="page" />;
  }

  if (loadError || !account) {
    return (
      <div className="min-h-[100dvh] bg-[#FFFBF7] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-6 text-center shadow-sm">
          <p className="text-xl font-black" style={{ color: BRAND.blue }}>{td("profilUnavailable")}</p>
          <p className="mt-2 text-sm font-bold text-slate-500">{loadError || td("profilAccountNotFound")}</p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl px-5 text-xs font-black uppercase tracking-widest text-white hover:opacity-90"
            style={{ backgroundColor: BRAND.orange }}
          >
            {td("profilBackDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  const emptyValue = "—";

  return (
    <div className={`platform-profile-page ${centerNotoSans.className} min-h-[100dvh] bg-[#FFFBF7] text-[#11224E] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10 overflow-x-hidden`}>
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#FFFBF7] pt-[env(safe-area-inset-top,0px)]">
        <div className="nexa-student-shell flex items-center gap-2 sm:gap-3 h-[68px]">
          <Link
            href="/dashboard"
            aria-label={td("profilBackAria")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] text-neutral-600 hover:bg-black/[0.03]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight"
              style={{ color: BRAND.blue }}
            >
              {td("profilMyProfile")}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="flex h-9 sm:h-10 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold"
                style={{ color: BRAND.blue, border: `1.5px solid ${BRAND.blue}` }}
              >
                <span className="hidden sm:inline">{td("profilEdit")}</span>
                <span className="sm:hidden">✎</span>
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEditing}
                  className="hidden sm:flex h-9 sm:h-10 items-center rounded-lg border border-black/[0.08] px-3.5 text-xs font-semibold text-neutral-600"
                >
                  {td("profilCancel")}
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex h-9 sm:h-10 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: BRAND.blue }}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{saving ? td("profilSaving") : td("profilSave")}</span>
                </button>
              </>
            )}
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
                {td("profilPausedTitle")}
              </p>
              <p className="mt-0.5 text-xs font-medium text-blue-800/80 leading-relaxed">
                {td("profilPausedBodyPrefix")}
                {account.center?.name ? (
                  <> {td("profilPausedBy")} <strong>{account.center.name}</strong></>
                ) : (
                  <> {td("profilPausedByYourCenter")}</>
                )}
                . {td("profilPausedContact")} {td("profilPausedProgressKept")}
              </p>
              {account.profile?.access_pause_reason && (
                <div className="mt-3 rounded-xl border border-blue-200/80 bg-white/70 px-3 py-2 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">{td("profilPausedReasonLabel")}</p>
                  <p className="mt-0.5 text-xs font-bold text-blue-900 leading-relaxed">
                    {account.profile.access_pause_reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="nexa-student-shell pt-5 md:pt-8 pb-6 max-w-5xl space-y-4">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
        <IdCard
          photoUrl={account.profile.avatar_url}
          photoIcon={User}
          photoUploading={avatarUploading}
          onPhotoClick={() => fileInputRef.current?.click()}
          name={displayName}
          tags={[
            {
              label: account.isPluriannual
                ? td("profilStudentPluriannual")
                : isTcfCanadaCenter(account.center.center_type)
                  ? td("profilStudentTcf")
                  : td("profilStudentCenter"),
            },
            { label: statusLabel, tone: isPaused ? "warning" : isRevoked ? "warning" : "positive" },
          ]}
        >
          <MetaLine icon={Mail}>{account.profile.email || account.user.email || emptyValue}</MetaLine>
          <MetaLine icon={Building2}>{displayCountry}</MetaLine>
          <MetaLine icon={Calendar}>{formatDateFr(account.profile.created_at || account.user.created_at, locale)}</MetaLine>
        </IdCard>

        <Group title={td("profilPersonalInfo")}>
          <EditableRow icon={User} label={td("profilFirstName")} value={account.profile.prenom || emptyValue}
            editing={isEditing} editValue={form.prenom} onEditChange={(v) => setForm((c) => ({ ...c, prenom: v }))} />
          <EditableRow icon={User} label={td("profilLastName")} value={account.profile.nom || emptyValue}
            editing={isEditing} editValue={form.nom} onEditChange={(v) => setForm((c) => ({ ...c, nom: v }))} />
          <Row icon={Mail} label={td("profilEmail")} value={account.profile.email || account.user.email || emptyValue} />
          <EditableRow icon={Phone} label={td("profilPhoneWhatsapp")} value={savedForm.phone || emptyValue}
            editing={isEditing} editValue={form.phone} onEditChange={(v) => setForm((c) => ({ ...c, phone: v }))} />
          {isEditing ? (
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
              <Building2 size={16} className="shrink-0" style={{ color: "#eb670e" }} strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold mb-1" style={{ color: "rgba(17,34,78,0.4)" }}>{td("profilCountry")}</p>
                <select
                  value={form.countryCode}
                  onChange={(e) => setForm((c) => ({ ...c, countryCode: e.target.value }))}
                  className="w-full h-8 -mt-1 bg-transparent text-[13.5px] font-bold outline-none border-b"
                  style={{ color: "#11224E", borderColor: "rgba(235,103,14,0.4)" }}
                >
                  <option value="">{td("profilSelectCountry")}</option>
                  {AFRICA_54.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <Row icon={Building2} label={td("profilCountry")} value={displayCountry} />
          )}
          <EditableRow icon={MapPin} label={td("profilCity")} value={savedForm.ville || account.profile.city || emptyValue}
            editing={isEditing} editValue={form.ville} onEditChange={(v) => setForm((c) => ({ ...c, ville: v }))} />
          <EditableRow icon={Calendar} label={td("profilBirthDate")} value={formatDateFr(account.profile.birth_date, locale)}
            editing={isEditing} editValue={form.birth_date} onEditChange={(v) => setForm((c) => ({ ...c, birth_date: v }))} type="date" />
          {account.profile.genre ? <Row icon={User} label={td("profilGender")} value={account.profile.genre} /> : null}
          <Row icon={Calendar} label={td("profilMemberSince")} value={formatDateFr(account.profile.created_at || account.user.created_at, locale)} />
        </Group>
        </div>

        <div className="space-y-4 min-w-0">
        <Group title={td("profilSecurityTitle")}>
          <AccordionRow
            icon={Lock}
            label={td("profilPassword")}
            description={td("profilPasswordHelp")}
            open={acc.isOpen("password")}
            onToggle={() => acc.toggle("password")}
          >
            {passwordMessage && (
              <p className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{passwordMessage}</p>
            )}
            <p className="text-[12px] font-medium mb-3" style={{ color: "rgba(17,34,78,0.5)" }}>{PASSWORD_POLICY_HINT}</p>
            {passwordError && (
              <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{passwordError}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <PField label={td("profilNewPassword")} value={passwordForm.password} onChange={(v) => setPasswordForm((c) => ({ ...c, password: v }))} type="password" />
              <PField label={td("profilConfirmPassword")} value={passwordForm.confirm} onChange={(v) => setPasswordForm((c) => ({ ...c, confirm: v }))} type="password" />
            </div>
            <div className="flex gap-2 justify-end">
              <PButton variant="ghost" onClick={() => { acc.close(); setPasswordForm({ password: "", confirm: "" }); setPasswordError(null); }} disabled={passwordSaving}>
                {td("profilCancel")}
              </PButton>
              <PButton onClick={handlePasswordChange} busy={passwordSaving}>
                <ShieldCheck size={14} />
                {td("profilConfirm")}
              </PButton>
            </div>
          </AccordionRow>
        </Group>

        <Group title={td("profilSessionTitle")}>
          {canInstallApp && (
            <ButtonRow
              icon={Smartphone}
              label={installBusy ? td("profilInstalling") : td("profilDownloadApp")}
              onClick={() => void handleInstallRow()}
              busy={installBusy}
              tone="brand"
            />
          )}
          <ButtonRow icon={LogOut} label={td("profilSignOut")} onClick={() => setLogoutConfirmOpen(true)} tone="danger" />
        </Group>
        <div className="hidden"><DownloadAppButton /></div>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6 flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.orange }}>
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black">
                  {account.isPluriannual ? td("profilMyPath") : td("profilMyOffer")}
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-400">
                  {account.isPluriannual ? td("profilPathDetails") : td("profilOfferDetails")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                {account.isPluriannual ? td("profilActivePath") : td("profilActivePack")}
              </p>
              <p className="mt-1 break-words text-xl sm:text-2xl font-black" style={{ color: BRAND.blue }}>
                {account.isPluriannual ? td("pluriannualProgram") : packLabel}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                <Stat label={td("profilDuration")} value={durationLabel} />
                <Stat label={td("profilAccessEnds")} value={formatDateFr(account.profile.subscription_ends_at, locale)} />
                <Stat label={td("profilDaysLeft")} value={subscriptionDaysLeft != null ? td("profilDaysCount", { count: subscriptionDaysLeft }) : "—"} />
                <Stat label={td("profilValidatedOn")} value={formatDateFr(account.enrollment?.enrolled_at, locale)} />
              </div>
              {account.enrollment?.price_note ? (
                <p className="mt-4 text-xs font-bold text-slate-500 break-words">{account.enrollment.price_note}</p>
              ) : null}
            </div>

            {!account.isPluriannual && account.nexaQuotas !== null && (
            <div className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{td("profilNexaQuotas")}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                {td("profilNexaQuotasHint")}
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
                        ? td("profilIncluded")
                        : "—"
                      : usage || String(allocated);
                  return <Stat key={key} label={label} value={value} />;
                })}
              </div>
            </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm">
            <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start sm:items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BRAND.blue }}>
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-black">{td("profilFinance")}</p>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-400">{td("profilFinanceHint")}</p>
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
                  <FinanceCard label={td("profilProgramCost")} value={`${account.finance.tuition_fee.toLocaleString(financeLocale)} FCFA`} />
                  <FinanceCard label={td("profilPaid")} value={`${account.finance.tuition_paid.toLocaleString(financeLocale)} FCFA`} accent="emerald" />
                  <FinanceCard label={td("profilBalanceDue")} value={`${account.finance.remaining.toLocaleString(financeLocale)} FCFA`} accent="red" />
                </div>

                {(account.finance.discount_amount || 0) > 0 && (
                  <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{td("profilDiscount")}</p>
                    <p className="mt-1 text-sm font-black text-amber-900">
                      −{(account.finance.discount_amount || 0).toLocaleString(financeLocale)} FCFA
                      {account.finance.discount_reason ? `${financeEn ? ": " : " — "}${account.finance.discount_reason}` : ""}
                    </p>
                  </div>
                )}

                <div className="mb-5 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 sm:px-4 py-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{td("profilFinancialStatus")}</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{localizedFinanceStatus(account.finance.financial_status)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{td("profilProgress")}</p>
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
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{td("profilPaymentSchedule")}</p>
                    <div className="space-y-2">
                      {account.installments!.map((inst) => {
                        const deferred = !!inst.original_due_date && inst.original_due_date !== inst.due_date;
                        const sold = inst.status === "paid" || inst.paid_amount >= inst.amount;
                        return (
                          <div key={inst.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3 sm:p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-black text-slate-900">{localizeInstallmentLabel(inst.label, financeEn ? "en" : "fr") || td("profilInstallment")}</p>
                                  {deferred && (
                                    <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
                                      {td("profilDeferred")}
                                    </span>
                                  )}
                                  {sold && (
                                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                      {localizedFinanceStatus("paid")}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs font-bold text-slate-500">
                                  {td("profilInstallment")} : {financeDate(inst.due_date)}
                                  {deferred && inst.original_due_date
                                    ? ` · ${td("profilInitially")} ${financeDate(inst.original_due_date)}`
                                    : ""}
                                </p>
                                {inst.deferral_reason && (
                                  <p className="mt-0.5 text-[11px] font-medium text-blue-600">{td("profilPausedReasonLabel")} : {inst.deferral_reason}</p>
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
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{td("profilPaymentHistory")}</p>
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
                              {td("profilPaymentRecorded")}
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
                      {td("profilNoPaymentsYet")}
                    </p>
                  )}
                </div>

                {(account.financeEvents?.length || 0) > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{td("profilDeferralsDiscounts")}</p>
                    <div className="space-y-2">
                      {account.financeEvents!.map((ev) => (
                        <div key={ev.id} className="rounded-2xl border border-neutral-100 bg-white px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {ev.type === "deferral"
                              ? td("profilDeferral")
                              : ev.type === "discount"
                                ? td("profilDiscount")
                                : ev.type === "payment_note"
                                  ? td("profilPaymentNote")
                                  : ev.type}
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
                {td("profilFinanceUnavailable")}
              </p>
            )}
          </section>
        </div>
        </div>
      </div>

      {logoutConfirmOpen && (
        <LogoutConfirmDialog
          title={td("profilLogoutConfirmTitle")}
          message={td("profilLogoutConfirmMessage")}
          confirmLabel={td("profilSignOut")}
          cancelLabel={td("profilCancel")}
          busy={logoutBusy}
          onConfirm={() => void signOut()}
          onCancel={() => {
            if (!logoutBusy) setLogoutConfirmOpen(false);
          }}
        />
      )}
    </div>
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
