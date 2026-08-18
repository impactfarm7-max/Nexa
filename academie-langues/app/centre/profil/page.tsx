"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut,
  Smartphone,
  Save,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import DownloadAppButton from "@/app/components/DownloadAppButton";
import { LogoutConfirmDialog } from "@/app/components/LogoutConfirmDialog";
import type { PinSettings } from "@/app/utils/pin-crypto";
import { canManagePinProtectedZones } from "@/app/utils/student-routes";
import { checkPasswordStrength, PASSWORD_POLICY_HINT } from "@/app/utils/password-policy";
import { initPwaInstallCapture, isIosDevice, isPwaInstalled, promptPwaInstall } from "@/app/utils/pwa-install";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  BLUE,
  ORANGE,
  CenterPageHeader,
  CenterPageLayout,
  CenterPageBody,
  OutlineHeaderButton,
  BackButton,
} from "@/app/centre/center-page-ui";
import {
  IdCard,
  MetaLine,
  Group,
  EditableRow,
  Row,
  AccordionRow,
  ToggleRow,
  ButtonRow,
  PField,
  PPinField,
  PButton,
  useAccordion,
} from "@/app/components/profile/ProfileKit";

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
  const en = locale === "en";
  const acc = useAccordion();
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
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);

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
      setPasswordError(en ? t("centre", "profileWeakPassword") : (pwdCheck.message || PASSWORD_POLICY_HINT));
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
      acc.close();
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
              {!isEditing ? (
                <OutlineHeaderButton onClick={startEditing}>
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
            </>
          }
        />
      }
    >
      <CenterPageBody className="max-w-5xl">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
        <IdCard
          photoUrl={account.profile?.avatar_url}
          photoIcon={User}
          photoUploading={avatarUploading}
          onPhotoClick={() => fileInputRef.current?.click()}
          name={displayName}
          tags={[
            { label: roleLabel },
            { label: statusLabel, tone: "positive" },
          ]}
        >
          <MetaLine icon={Mail}>{account.profile?.email || account.user.email || emptyValue}</MetaLine>
          <MetaLine icon={Phone}>{savedForm.phone || emptyValue}</MetaLine>
          <MetaLine icon={Calendar}>{formatDate(account.profile?.created_at || account.user.created_at, locale)}</MetaLine>
        </IdCard>

        <Group title={t("centre", "accountPersonalInfo")}>
          <EditableRow icon={User} label={t("centre", "enrollmentFirstName")} value={savedForm.prenom || emptyValue}
            editing={isEditing} editValue={form.prenom} onEditChange={(v) => setForm((c) => ({ ...c, prenom: v }))} />
          <EditableRow icon={User} label={t("centre", "enrollmentLastName")} value={savedForm.nom || emptyValue}
            editing={isEditing} editValue={form.nom} onEditChange={(v) => setForm((c) => ({ ...c, nom: v }))} />
          <Row icon={Mail} label={t("centre", "accountEmail")} value={account.profile?.email || account.user.email || emptyValue} />
          <EditableRow icon={Phone} label={t("centre", "accountPhoneWhatsapp")} value={savedForm.phone || emptyValue}
            editing={isEditing} editValue={form.phone} onEditChange={(v) => setForm((c) => ({ ...c, phone: v }))} />
          <EditableRow icon={MapPin} label={t("centre", "settingsCity")} value={savedForm.ville || emptyValue}
            editing={isEditing} editValue={form.ville} onEditChange={(v) => setForm((c) => ({ ...c, ville: v }))} />
        </Group>
        </div>

        <div className="space-y-4 min-w-0">
        <Group title={t("centre", "profileSecurityTitle")}>
          <AccordionRow
            icon={Lock}
            label={t("centre", "profilePassword")}
            description={t("centre", "profilePasswordHelp")}
            open={acc.isOpen("password")}
            onToggle={() => acc.toggle("password")}
          >
            {passwordMessage && (
              <p className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{passwordMessage}</p>
            )}
            <p className="text-[12px] font-medium mb-3" style={{ color: "rgba(17,34,78,0.5)" }}>
              {en ? t("centre", "profilePasswordPolicy") : PASSWORD_POLICY_HINT}
            </p>
            {passwordError && (
              <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{passwordError}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <PField label={t("centre", "profileNewPassword")} value={passwordForm.password} onChange={(v) => setPasswordForm((c) => ({ ...c, password: v }))} type="password" />
              <PField label={t("centre", "profileConfirmPassword")} value={passwordForm.confirm} onChange={(v) => setPasswordForm((c) => ({ ...c, confirm: v }))} type="password" />
            </div>
            <div className="flex gap-2 justify-end">
              <PButton variant="ghost" onClick={() => { acc.close(); setPasswordForm({ password: "", confirm: "" }); setPasswordError(null); }} disabled={passwordSaving}>
                {t("centre", "periodCancel")}
              </PButton>
              <PButton onClick={handlePasswordChange} busy={passwordSaving}>
                <ShieldCheck size={14} />
                {t("centre", "membersConfirm")}
              </PButton>
            </div>
          </AccordionRow>

          <AccordionRow
            icon={KeyRound}
            label={t("centre", "profilePersonalPin")}
            description={hasPin ? t("centre", "profilePinActive") : t("centre", "profileNoPin")}
            open={acc.isOpen("pin")}
            onToggle={() => acc.toggle("pin")}
          >
            {pinMessage && (
              <p className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{pinMessage}</p>
            )}
            {pinError && (
              <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{pinError}</p>
            )}

            {!hasPin ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <PPinField label={t("centre", "profileNewPin")} value={createPin.pin} onChange={(v) => setCreatePin((c) => ({ ...c, pin: v }))} />
                  <PPinField label={t("centre", "profileConfirmPin")} value={createPin.confirm} onChange={(v) => setCreatePin((c) => ({ ...c, confirm: v }))} />
                </div>
                <PButton onClick={handleCreatePin} busy={pinSaving}>
                  <KeyRound size={14} />
                  {t("centre", "profileConfigurePin")}
                </PButton>
              </div>
            ) : !showChangePin ? (
              <PButton variant="ghost" onClick={() => { setShowChangePin(true); setPinError(null); setPinMessage(null); }}>
                <KeyRound size={14} />
                {t("centre", "profileChangePin")}
              </PButton>
            ) : (
              <div className="space-y-3">
                <PPinField label={t("centre", "profileOldPin")} value={changePin.oldPin} onChange={(v) => setChangePin((c) => ({ ...c, oldPin: v }))} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <PPinField label={t("centre", "profileNewPin")} value={changePin.newPin} onChange={(v) => setChangePin((c) => ({ ...c, newPin: v }))} />
                  <PPinField label={t("centre", "profileConfirmNewPin")} value={changePin.confirm} onChange={(v) => setChangePin((c) => ({ ...c, confirm: v }))} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PButton onClick={handleChangePin} busy={pinSaving}>{t("centre", "profileSaveNewPin")}</PButton>
                  <PButton variant="ghost" onClick={() => { setShowChangePin(false); setChangePin({ oldPin: "", newPin: "", confirm: "" }); }}>
                    {t("centre", "periodCancel")}
                  </PButton>
                </div>
              </div>
            )}
          </AccordionRow>

          {canManageProtectedZones && PIN_TOGGLES.map((toggle) => (
            <ToggleRow
              key={toggle.key}
              icon={ShieldCheck}
              label={t("centre", toggle.labelKey)}
              description={t("centre", toggle.descriptionKey)}
              checked={pinSettings[toggle.key]}
              disabled={!hasPin || pinSaving}
              onChange={() => togglePinSetting(toggle.key)}
            />
          ))}
        </Group>

        <Group title={t("centre", "profileSessionTitle")}>
          {canInstallApp && (
            <ButtonRow
              icon={Smartphone}
              label={installBusy ? t("dashboard", "profilInstalling") : t("dashboard", "profilDownloadApp")}
              onClick={() => void handleInstallRow()}
              busy={installBusy}
              tone="brand"
            />
          )}
          <ButtonRow icon={LogOut} label={t("centre", "profileSignOut")} onClick={() => setLogoutConfirmOpen(true)} tone="danger" />
        </Group>
        </div>
        </div>
        {/* Bouton caché : porte la logique + la modale iOS déjà écrites dans DownloadAppButton */}
        <div className="hidden"><DownloadAppButton /></div>
      </CenterPageBody>

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

type PayrollLikeUnused = unknown;
