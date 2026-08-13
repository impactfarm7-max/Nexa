"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  Camera,
  Edit2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import DownloadAppButton from "@/app/components/DownloadAppButton";
import { LogoutConfirmDialog } from "@/app/components/LogoutConfirmDialog";
import type { PinSettings } from "@/app/utils/pin-crypto";
import { canManagePinProtectedZones } from "@/app/utils/student-routes";
import { checkPasswordStrength, PASSWORD_POLICY_HINT } from "@/app/utils/password-policy";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  BLUE,
  ORANGE,
  PAGE_BG,
  SURFACE,
  CenterBrandMark,
  CenterPageHeader,
  CenterPageLayout,
  OutlineHeaderButton,
  BackButton,
} from "@/app/centre/center-page-ui";

type CenterAccount = {
  user: { id: string; email: string | null; created_at: string | null };
  profile: {
    id: string;
    prenom: string | null;
    nom: string | null;
    email: string | null;
    phone: string | null;
    ville: string | null;
    genre: string | null;
    role: string | null;
    avatar_url: string | null;
    created_at: string | null;
    tag_status: string | null;
  } | null;
  hasPin?: boolean;
  membership: { role: string | null } | null;
  center: {
    id: string;
    name: string;
    code: string | null;
    city: string | null;
    status: string;
  };
};

const STAFF_ROLE_KEYS: Record<string, string> = {
  admin: "profileRoleAdministrator", center_manager: "profileRoleCenterDirector", campus_manager: "profileRoleCampusDirector",
  trainer: "accountRoleTrainer", staff: "profileRoleAdministrativeAgent",
};

const PIN_TOGGLES: { key: keyof PinSettings; labelKey: string; descriptionKey: string }[] = [
  { key: "secure_programme", labelKey: "profileSecureProgram", descriptionKey: "profileSecureProgramHelp" },
  { key: "secure_etudiants", labelKey: "profileSecureStudents", descriptionKey: "profileSecureStudentsHelp" },
  { key: "block_downloads", labelKey: "profileBlockDownloads", descriptionKey: "profileBlockDownloadsHelp" },
];

function formatDate(value?: string | null, locale = "fr") {
  if (!value) return locale === "en" ? "Not set" : "Non renseigné";
  return new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function CenterProfilPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const staffRoleLabel = (profileRole?: string | null, membershipRole?: string | null) => {
    if (profileRole && STAFF_ROLE_KEYS[profileRole]) return t("centre", STAFF_ROLE_KEYS[profileRole]);
    if (membershipRole === "owner") return t("centre", "accountRoleOwner");
    if (membershipRole === "manager") return t("centre", "accountRoleAdmin");
    if (membershipRole === "staff") return t("centre", "accountRoleTrainer");
    return t("centre", "profileCenterStaff");
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [account, setAccount] = useState<CenterAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ prenom: "", nom: "", phone: "", ville: "" });
  const [savedForm, setSavedForm] = useState({ prenom: "", nom: "", phone: "", ville: "" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [hasPin, setHasPin] = useState(false);
  const [pinSettings, setPinSettings] = useState<PinSettings>({
    secure_programme: false,
    secure_etudiants: false,
    block_downloads: false,
  });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [createPin, setCreatePin] = useState({ pin: "", confirm: "" });
  const [changePin, setChangePin] = useState({ oldPin: "", newPin: "", confirm: "" });
  const [showChangePin, setShowChangePin] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const readJson = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(t("centre", "profileNonJsonResponse", { status: res.status, text: text.slice(0, 160) }));
    }
  };

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const loadPinState = async (headers: Record<string, string>) => {
    const res = await fetch("/api/center/pin", { headers });
    const json = await readJson(res);
    if (res.ok) {
      setHasPin(Boolean(json.hasPin));
      setPinSettings(json.pinSettings || pinSettings);
    }
  };

  const loadAccount = async () => {
    const headers = await authHeaders();
    if (!headers) {
      router.replace("/login");
      return;
    }

    const [accountRes] = await Promise.all([
      fetch("/api/center/account", { headers }),
    ]);
    const json = await readJson(accountRes);
    if (!accountRes.ok) {
      setLoadError(json.error || t("centre", "profileOpenError"));
      setLoading(false);
      return;
    }

    const nextForm = {
      prenom: json.profile?.prenom || "",
      nom: json.profile?.nom || "",
      phone: json.profile?.phone || "",
      ville: json.profile?.ville || "",
    };

    setAccount(json);
    setForm(nextForm);
    setSavedForm(nextForm);
    setHasPin(Boolean(json.hasPin));
    await loadPinState(headers);
    setLoading(false);
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const displayName = useMemo(() => {
    const prenom = account?.profile?.prenom?.trim();
    const nom = account?.profile?.nom?.trim();
    if (prenom && nom) return `${prenom} ${nom}`;
    if (prenom) return prenom;
    if (nom) return nom;
    return account?.profile?.email || account?.user.email || t("centre", "profileMyProfile");
  }, [account, t]);

  const roleLabel = staffRoleLabel(account?.profile?.role, account?.membership?.role);
  const canManageProtectedZones = canManagePinProtectedZones(account?.profile?.role);
  const statusLabel = account?.profile?.tag_status || (account?.center.status === "active" ? t("centre", "campusActive") : t("centre", "summarySuspended"));

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
      const res = await fetch("/api/center/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(form),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || t("centre", "accountUpdateError"));
      setAccount((current) => current ? { ...current, profile: json.profile } : current);
      const nextForm = {
        prenom: json.profile?.prenom || "",
        nom: json.profile?.nom || "",
        phone: json.profile?.phone || "",
        ville: json.profile?.ville || "",
      };
      setSavedForm(nextForm);
      setForm(nextForm);
      setIsEditing(false);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : t("centre", "accountUpdateError"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordMessage(null);
    const pwdCheck = checkPasswordStrength(passwordForm.password);
    if (!pwdCheck.ok) {
      setPasswordError(locale === "en" ? t("centre", "profileWeakPassword") : (pwdCheck.message || PASSWORD_POLICY_HINT));
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError(t("centre", "profilePasswordsMismatch"));
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      setPasswordForm({ password: "", confirm: "" });
      setPasswordMessage(t("centre", "profilePasswordUpdated"));
      setPasswordOpen(false);
    } catch (error: unknown) {
      setPasswordError(error instanceof Error ? error.message : t("centre", "profilePasswordUpdateError"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account?.user.id) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t("centre", "profileImageTooLarge"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert(t("centre", "profileUnsupportedFile"));
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

      const res = await fetch("/api/center/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ avatar_url: urlData.publicUrl }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || t("centre", "accountUpdateError"));

      setAccount((current) =>
        current ? { ...current, profile: { ...current.profile!, ...json.profile, avatar_url: publicUrl } } : current
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("centre", "profileUploadError"));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreatePin = async () => {
    setPinError(null);
    setPinMessage(null);
    if (!/^\d{4}$/.test(createPin.pin)) {
      setPinError(t("centre", "profilePinFourDigits"));
      return;
    }
    if (createPin.pin !== createPin.confirm) {
      setPinError(t("centre", "profilePinsMismatch"));
      return;
    }

    const headers = await authHeaders();
    if (!headers) return;
    setPinSaving(true);
    try {
      const res = await fetch("/api/center/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "create", pin: createPin.pin, confirmPin: createPin.confirm }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || t("centre", "profilePinCreateError"));
      setHasPin(true);
      setCreatePin({ pin: "", confirm: "" });
      setPinMessage(t("centre", "profilePinCreated"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("centre", "profilePinError");
      if (/existe d[eé]j[aà]/i.test(msg)) {
        setHasPin(true);
        setCreatePin({ pin: "", confirm: "" });
        setPinError(null);
        setPinMessage(t("centre", "profilePinAlreadyExists"));
      } else {
        setPinError(msg);
      }
    } finally {
      setPinSaving(false);
    }
  };

  const handleChangePin = async () => {
    setPinError(null);
    setPinMessage(null);
    if (!/^\d{4}$/.test(changePin.oldPin) || !/^\d{4}$/.test(changePin.newPin)) {
      setPinError(t("centre", "profileEachPinFourDigits"));
      return;
    }
    if (changePin.newPin !== changePin.confirm) {
      setPinError(t("centre", "profileNewPinsMismatch"));
      return;
    }

    const headers = await authHeaders();
    if (!headers) return;
    setPinSaving(true);
    try {
      const res = await fetch("/api/center/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "change",
          oldPin: changePin.oldPin,
          newPin: changePin.newPin,
          confirmPin: changePin.confirm,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || t("centre", "profilePinChangeError"));
      setChangePin({ oldPin: "", newPin: "", confirm: "" });
      setShowChangePin(false);
      setPinMessage(t("centre", "profilePinChanged"));
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : t("centre", "profilePinError"));
    } finally {
      setPinSaving(false);
    }
  };

  const savePinSettings = async (next: PinSettings) => {
    setPinError(null);
    setPinMessage(null);
    const headers = await authHeaders();
    if (!headers) return;
    setPinSaving(true);
    try {
      const res = await fetch("/api/center/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ pinSettings: next }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error || t("centre", "profileSettingsSaveError"));
      setPinSettings(json.pinSettings || next);
      setPinMessage(t("centre", "profileSecuritySaved"));
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : t("centre", "profileSettingsError"));
      await loadPinState(headers);
    } finally {
      setPinSaving(false);
    }
  };

  const togglePinSetting = (key: keyof PinSettings) => {
    const next = { ...pinSettings, [key]: !pinSettings[key] };
    setPinSettings(next);
    void savePinSettings(next);
  };

  const signOut = async () => {
    setLogoutBusy(true);
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      router.replace("/login");
    } finally {
      setLogoutBusy(false);
      setLogoutConfirmOpen(false);
    }
  };

  if (loading) {
    return <CenterPageLoading />;
  }

  if (loadError || !account) {
    return (
      <CenterPageLayout
        header={
          <CenterPageHeader
            title={t("centre", "profileUnavailable")}
            backButton={<BackButton onClick={() => router.push("/centre/dashboard")} />}
          />
        }
      >
        <div className="nexa-center-shell py-10 flex items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-6 text-center">
            <p className="text-lg font-extrabold" style={{ color: BLUE }}>{t("centre", "profileUnavailable")}</p>
            <p className="mt-2 text-sm font-medium text-neutral-500">{loadError || t("centre", "profileAccountNotFound")}</p>
            <button
              type="button"
              onClick={() => router.push("/centre/dashboard")}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              {t("centre", "accountBackDashboardShort")}
            </button>
          </div>
        </div>
      </CenterPageLayout>
    );
  }

  const emptyValue = t("centre", "accountNotProvided");

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={t("centre", "profileMyProfile")}
          backButton={<BackButton onClick={() => router.push("/centre/dashboard")} />}
          actions={
            <>
              <DownloadAppButton />
              {!isEditing ? (
                <OutlineHeaderButton onClick={startEditing}>
                  <Edit2 size={14} />
                  <span className="hidden sm:inline">{t("centre", "profileEdit")}</span>
                </OutlineHeaderButton>
              ) : (
                <>
                  <OutlineHeaderButton onClick={cancelEditing}>{t("centre", "periodCancel")}</OutlineHeaderButton>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex h-9 sm:h-10 items-center justify-center gap-2 rounded-lg px-3.5 sm:px-4 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: BLUE }}
                  >
                    <Save size={14} />
                    {saving ? "..." : t("centre", "accountSave")}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                className="flex h-9 sm:h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 text-xs font-semibold text-red-600 hover:bg-red-100"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">{t("centre", "profileLogout")}</span>
              </button>
            </>
          }
        />
      }
    >
        <section className="nexa-center-shell grid gap-5 py-6 lg:grid-cols-[0.95fr_1.25fr]">
          <aside className="space-y-4">
            <section className="relative overflow-hidden rounded-xl border border-black/[0.08] bg-white p-5">
              <div className="absolute top-0 left-0 h-1 w-full" style={{ backgroundColor: ORANGE }} />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />

              <div className="mx-auto mb-4 flex justify-center">
                {avatarUploading ? (
                  <div className="h-20 w-20 rounded-lg border border-black/[0.08] bg-white flex items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-200 border-t-[#11224E]" />
                  </div>
                ) : account.profile?.avatar_url ? (
                  <CenterBrandMark src={account.profile.avatar_url} alt="Avatar" size={80} />
                ) : (
                  <CenterBrandMark icon={User} size={80} />
                )}
              </div>

              {!avatarUploading && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mx-auto flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-600 hover:bg-black/[0.03]"
                >
                  <Camera size={12} style={{ color: BLUE }} /> {t("centre", "profileChangePhoto")}
                </button>
              )}

              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-lg font-extrabold" style={{ color: BLUE }}>{displayName}</p>
                  <BadgeCheck className="h-4 w-4" style={{ color: ORANGE }} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center rounded-lg border border-black/[0.08] bg-[#F7F7F6] px-2.5 py-1 text-[12px] font-semibold text-neutral-700">
                    {roleLabel}
                  </span>
                  <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700">
                    {statusLabel}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-black/[0.06] pt-5 text-left">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-extrabold" style={{ color: BLUE }}>{t("centre", "accountPersonalInfo")}</p>
                    <p className="mt-0.5 text-[13px] font-medium text-neutral-400">
                      {isEditing ? t("centre", "profileEditInfoHelp") : t("centre", "profileInfoHelp")}
                    </p>
                  </div>
                  {isEditing && (
                    <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                      {t("centre", "profileEditingBadge")}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <Field label={t("centre", "enrollmentFirstName")} value={form.prenom} onChange={(value) => setForm((c) => ({ ...c, prenom: value }))} />
                    <Field label={t("centre", "enrollmentLastName")} value={form.nom} onChange={(value) => setForm((c) => ({ ...c, nom: value }))} />
                  </div>
                )}

                <div className="grid gap-3 text-sm font-medium text-neutral-600 sm:grid-cols-2 lg:grid-cols-1">
                  <InfoLine icon={Mail} label={t("centre", "accountEmail")} value={account.profile?.email || account.user.email || emptyValue} />
                  {isEditing ? (
                    <Field label={t("centre", "accountPhoneWhatsapp")} value={form.phone} onChange={(value) => setForm((c) => ({ ...c, phone: value }))} />
                  ) : (
                    <InfoLine icon={Phone} label={t("centre", "accountPhoneWhatsapp")} value={savedForm.phone || emptyValue} />
                  )}
                  {isEditing ? (
                    <Field label={t("centre", "settingsCity")} value={form.ville} onChange={(value) => setForm((c) => ({ ...c, ville: value }))} />
                  ) : (
                    <InfoLine icon={MapPin} label={t("centre", "settingsCity")} value={savedForm.ville || emptyValue} />
                  )}
                  <InfoLine icon={Calendar} label={t("centre", "profileMemberSince")} value={formatDate(account.profile?.created_at || account.user.created_at, locale)} />
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:hidden">
                  {!isEditing ? (
                    <OutlineHeaderButton onClick={startEditing} className="w-full">
                      <Edit2 size={14} />
                      {t("centre", "profileEdit")}
                    </OutlineHeaderButton>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={saveProfile}
                        disabled={saving}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: BLUE }}
                      >
                        <Save size={14} />
                        {saving ? t("centre", "accountSaving") : t("centre", "accountSave")}
                      </button>
                      <OutlineHeaderButton onClick={cancelEditing} className="w-full">{t("centre", "periodCancel")}</OutlineHeaderButton>
                    </>
                  )}
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white lg:hidden"
              style={{ backgroundColor: BLUE }}
            >
              <LogOut size={14} />
              {t("centre", "profileSignOut")}
            </button>
          </aside>

          <div className="space-y-4">
            <section className="rounded-xl border border-black/[0.08] bg-white p-4">
              <div className="flex items-center gap-3">
                <CenterBrandMark icon={Lock} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold" style={{ color: BLUE }}>{t("centre", "profilePassword")}</p>
                  <p className="truncate text-[13px] font-medium text-neutral-400">{t("centre", "profilePasswordHelp")}</p>
                </div>
                {!passwordOpen && (
                  <OutlineHeaderButton
                    onClick={() => {
                      setPasswordOpen(true);
                      setPasswordError(null);
                      setPasswordMessage(null);
                    }}
                  >
                    <Edit2 size={14} /> {t("centre", "profileEdit")}
                  </OutlineHeaderButton>
                )}
              </div>

              {passwordMessage && !passwordOpen && (
                <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{passwordMessage}</p>
              )}

              {passwordOpen && (
                <div className="mt-5 border-t border-black/[0.06] pt-5">
                  <div className="mb-4">
                    <p className="text-sm font-extrabold" style={{ color: BLUE }}>{t("centre", "profileSetNewPassword")}</p>
                    <p className="mt-1 text-[13px] font-medium text-neutral-400">{locale === "en" ? t("centre", "profilePasswordPolicy") : PASSWORD_POLICY_HINT}</p>
                  </div>
                  {passwordError && (
                    <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{passwordError}</p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("centre", "profileNewPassword")} value={passwordForm.password} onChange={(value) => setPasswordForm((c) => ({ ...c, password: value }))} type="password" />
                    <Field label={t("centre", "profileConfirmPassword")} value={passwordForm.confirm} onChange={(value) => setPasswordForm((c) => ({ ...c, confirm: value }))} type="password" />
                  </div>
                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <OutlineHeaderButton
                      onClick={() => {
                        setPasswordOpen(false);
                        setPasswordForm({ password: "", confirm: "" });
                        setPasswordError(null);
                      }}
                      disabled={passwordSaving}
                    >
                      {t("centre", "periodCancel")}
                    </OutlineHeaderButton>
                    <button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={passwordSaving}
                      className="flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-xs font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: ORANGE }}
                    >
                      <ShieldCheck size={14} />
                      {passwordSaving ? t("centre", "profileUpdating") : t("centre", "membersConfirm")}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-black/[0.08] bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <CenterBrandMark icon={KeyRound} size={40} />
                <div>
                  <p className="text-[15px] font-extrabold" style={{ color: BLUE }}>{t("centre", "profilePersonalPin")}</p>
                  <p className="text-[13px] font-medium text-neutral-400">
                    {t("centre", "profilePinDescription")}
                  </p>
                </div>
              </div>

              {pinMessage && (
                <p className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {pinMessage}
                </p>
              )}
              {pinError && (
                <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {pinError}
                </p>
              )}

              {!hasPin ? (
                <div className="space-y-4 rounded-xl border border-dashed border-orange-200 p-5" style={{ backgroundColor: SURFACE }}>
                  <p className="text-sm font-medium text-neutral-600">
                    {t("centre", "profileNoPin")}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <PinField label={t("centre", "profileNewPin")} value={createPin.pin} onChange={(v) => setCreatePin((c) => ({ ...c, pin: v }))} />
                    <PinField label={t("centre", "profileConfirmPin")} value={createPin.confirm} onChange={(v) => setCreatePin((c) => ({ ...c, confirm: v }))} />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePin}
                    disabled={pinSaving}
                    className="flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <KeyRound size={14} />
                    {pinSaving ? t("centre", "profilePinCreating") : t("centre", "profileConfigurePin")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">{t("centre", "profilePinActive")}</p>
                  </div>

                  {!showChangePin ? (
                    <OutlineHeaderButton onClick={() => { setShowChangePin(true); setPinError(null); setPinMessage(null); }}>
                      <KeyRound size={14} />
                      {t("centre", "profileChangePin")}
                    </OutlineHeaderButton>
                  ) : (
                    <div className="space-y-4 rounded-xl border border-black/[0.08] p-5" style={{ backgroundColor: SURFACE }}>
                      <PinField label={t("centre", "profileOldPin")} value={changePin.oldPin} onChange={(v) => setChangePin((c) => ({ ...c, oldPin: v }))} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <PinField label={t("centre", "profileNewPin")} value={changePin.newPin} onChange={(v) => setChangePin((c) => ({ ...c, newPin: v }))} />
                        <PinField label={t("centre", "profileConfirmNewPin")} value={changePin.confirm} onChange={(v) => setChangePin((c) => ({ ...c, confirm: v }))} />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleChangePin}
                          disabled={pinSaving}
                          className="flex h-10 items-center gap-2 rounded-lg px-5 text-xs font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: BLUE }}
                        >
                          {pinSaving ? "..." : t("centre", "profileSaveNewPin")}
                        </button>
                        <OutlineHeaderButton onClick={() => { setShowChangePin(false); setChangePin({ oldPin: "", newPin: "", confirm: "" }); }}>
                          {t("centre", "periodCancel")}
                        </OutlineHeaderButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {canManageProtectedZones && (
              <section className="rounded-xl border border-black/[0.08] bg-white p-5">
                <div className="mb-5 flex items-center gap-3">
                  <CenterBrandMark icon={ShieldCheck} size={40} />
                  <div>
                    <p className="text-[15px] font-extrabold" style={{ color: BLUE }}>{t("centre", "profileProtectedZones")}</p>
                    <p className="text-[13px] font-medium text-neutral-400">
                      {t("centre", "profileProtectedZonesHelp")}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {PIN_TOGGLES.map((toggle) => (
                    <label
                      key={toggle.key}
                      className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors ${
                        pinSettings[toggle.key]
                          ? "border-orange-200 bg-orange-50/60"
                          : "border-black/[0.06]"
                      } ${!hasPin ? "opacity-60 cursor-not-allowed" : ""}`}
                      style={!pinSettings[toggle.key] ? { backgroundColor: SURFACE } : undefined}
                    >
                      <input
                        type="checkbox"
                        checked={pinSettings[toggle.key]}
                        disabled={!hasPin || pinSaving}
                        onChange={() => togglePinSetting(toggle.key)}
                        className="mt-1 h-4 w-4 rounded accent-[#eb670e]"
                      />
                      <span>
                        <span className="block text-sm font-extrabold text-neutral-900">{t("centre", toggle.labelKey)}</span>
                        <span className="mt-1 block text-[13px] font-medium text-neutral-500">{t("centre", toggle.descriptionKey)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {!hasPin && (
                  <p className="mt-4 text-[13px] font-semibold text-orange-600">
                    {t("centre", "profileCreatePinFirst")}
                  </p>
                )}
              </section>
            )}
          </div>
        </section>

      {logoutConfirmOpen && (
        <LogoutConfirmDialog
          title={t("centre", "profileLogoutConfirmTitle")}
          message={t("centre", "profileLogoutConfirmMessage")}
          confirmLabel={t("centre", "profileSignOut")}
          cancelLabel={t("centre", "periodCancel")}
          busy={logoutBusy}
          onConfirm={() => void signOut()}
          onCancel={() => {
            if (!logoutBusy) setLogoutConfirmOpen(false);
          }}
        />
      )}
    </CenterPageLayout>
  );
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] px-3.5 py-3" style={{ backgroundColor: SURFACE }}>
      <Icon className="h-4 w-4 shrink-0" style={{ color: BLUE }} strokeWidth={1.75} />
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-neutral-500">{label}</span>
        <span className="block truncate text-sm font-semibold text-neutral-900">{value}</span>
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
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        className={`h-11 w-full rounded-lg border px-3.5 text-sm font-semibold outline-none transition-colors ${
          readOnly
            ? "cursor-default border-black/[0.06] bg-[#F7F7F6] text-neutral-500"
            : "border-black/[0.08] bg-white text-neutral-900 focus:border-[#11224E]"
        }`}
      />
    </label>
  );
}

function PinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        className="h-11 w-full rounded-lg border border-black/[0.08] bg-white px-3.5 text-center text-lg font-extrabold tracking-[0.35em] text-neutral-900 outline-none focus:border-[#11224E]"
      />
    </label>
  );
}
