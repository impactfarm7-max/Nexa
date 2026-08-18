"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CenterStudentProfil from "./CenterStudentProfil";
import { isCenterStudent } from "@/app/utils/student-routes";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Calendar,
  User,
  GraduationCap,
  LogOut,
  Crown,
  Clock,
  Phone,
  Save,
  Trash2,
  ShieldCheck,
  Zap,
  Leaf,
  Star,
  Target,
  Layers,
  Globe2,
  Smartphone,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { logClientActivity } from "../utils/client-activity";
import { logoutAndClearSession } from "../utils/session";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit";
import { useI18n } from "@/app/i18n/I18nProvider";
import { BRAND } from "@/app/utils/brand";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import { LogoutConfirmDialog } from "@/app/components/LogoutConfirmDialog";
import { AFRICA_54, findAfricaCountry } from "@/app/data/africa-54";
import { initPwaInstallCapture, isIosDevice, isPwaInstalled, promptPwaInstall } from "@/app/utils/pwa-install";
import DownloadAppButton from "@/app/components/DownloadAppButton";
import { centerNotoSans } from "@/app/centre/center-page-ui";
import {
  IdCard,
  MetaLine,
  Group,
  Row,
  EditableRow,
  ButtonRow,
} from "@/app/components/profile/ProfileKit";

type Profile = {
  id: string;
  prenom: string | null;
  nom: string | null;
  ville: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  region: string | null;
  birth_date: string | null;
  genre: string | null;
  email: string | null;
  phone: string | null;
  formation: string | null;
  created_at: string | null;
  subscription_ends_at: string | null;
  avatar_url: string | null;
};

const MOIS_3 = [
  "jan", "fév", "mar", "avr", "mai", "jun",
  "jul", "aoû", "sep", "oct", "nov", "déc",
];

const formatDateCourte = (dateStr: string) => {
  const d = new Date(dateStr);
  const jour = String(d.getDate()).padStart(2, "0");
  const mois = MOIS_3[d.getMonth()];
  const annee = d.getFullYear();
  return `${jour} ${mois} ${annee}`;
};

export default function ProfilPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [profileMode, setProfileMode] = useState<"unknown" | "center" | "b2c">("unknown");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    ville: "",
    phone: "",
    prenom: "",
    countryCode: "CI",
    region: "",
    birth_date: "",
  });
  const [saving, setSaving] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { packType, isSubValid, eeLeft, examLeft, dailyCount } = useSimulationLimit();

  const PACK_THEMES: Record<string, any> = {
    ivoire: { name: "MEMBRE IVOIRE", icon: Crown, tone: "positive" as const },
    cauris: { name: "MEMBRE CAURIS", icon: ShieldCheck, tone: "positive" as const },
    ebene: { name: "MEMBRE ÉBÈNE", icon: Zap, tone: "positive" as const },
    raphia: { name: "MEMBRE RAPHIA", icon: Leaf, tone: "positive" as const },
    acceleree: { name: "FORMATION ACCÉLÉRÉE", icon: Zap, tone: "positive" as const },
    complete: { name: "FORMATION COMPLÈTE", icon: Star, tone: "positive" as const },
    admin: { name: "ADMINISTRATEUR", icon: ShieldCheck, tone: "positive" as const },
    aucun: { name: "ÉTUDIANT CLASSIQUE", icon: GraduationCap, tone: "neutral" as const },
  };

  const resolvedPackType = (isSubValid && packType === "aucun") ? "_premium_actif" : packType;
  const PREMIUM_FALLBACK_THEME = { name: "ACCÈS PREMIUM", icon: Crown, tone: "positive" as const };
  const currentTheme = resolvedPackType === "_premium_actif" ? PREMIUM_FALLBACK_THEME : (PACK_THEMES[packType] || PACK_THEMES.aucun);
  const ThemeIcon = currentTheme.icon;

  const displayName = useMemo(() => {
    const prenom = profile?.prenom?.trim();
    const nom = profile?.nom?.trim();
    if (prenom && nom) return `${prenom} ${nom}`;
    if (prenom) return prenom;
    if (nom) return nom;
    if (user?.email) return user.email.split("@")[0];
    return "Étudiant";
  }, [profile, user]);

  const dateInscription = useMemo(() => {
    const raw = profile?.created_at || user?.created_at;
    if (!raw) return "—";
    const d = new Date(raw);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  }, [profile, user]);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    setUser(session.user);

    const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();

    if (isCenterStudent(data)) {
      setProfileMode("center");
      setLoading(false);
      return;
    }
    setProfileMode("b2c");

    if (error || !data) {
      const fallback: Partial<Profile> = {
        id: session.user.id,
        prenom: session.user.user_metadata?.prenom ?? null,
        nom: session.user.user_metadata?.nom ?? null,
        ville: session.user.user_metadata?.ville ?? null,
        genre: session.user.user_metadata?.genre ?? null,
        email: session.user.email ?? null,
        phone: session.user.phone ?? session.user.user_metadata?.phone ?? null,
        formation: "tcf",
        avatar_url: null,
      };
      const { data: created } = await supabase.from("profiles").upsert(fallback).select("*").single();
      setProfile((created as Profile) ?? null);
    } else {
      const fullData = { ...data };
      if (!fullData.ville && session.user.user_metadata?.ville) fullData.ville = session.user.user_metadata.ville;
      if (!fullData.phone && session.user.user_metadata?.phone) fullData.phone = session.user.user_metadata.phone;
      setProfile(fullData as Profile);
    }
    logClientActivity("Ouverture profil", "Page Mon compte consultee");
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === "visible") loadProfile(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t("dashboard", "profilImageTooLarge"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert(t("dashboard", "profilFileNotSupported"));
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : null));
      logClientActivity("Avatar modifie", "Photo de profil mise a jour");
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const selectedAfrica = findAfricaCountry(editForm.countryCode);
      const cityValue = editForm.ville.trim();
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          ville: cityValue,
          city: cityValue,
          country: selectedAfrica?.name || profile?.country || null,
          country_code: selectedAfrica?.dial || profile?.country_code || null,
          region: editForm.region.trim() || null,
          birth_date: editForm.birth_date.trim() || null,
          phone: editForm.phone.trim(),
          prenom: editForm.prenom.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ville: cityValue,
              city: cityValue,
              country: selectedAfrica?.name || prev.country,
              country_code: selectedAfrica?.dial || prev.country_code,
              region: editForm.region.trim() || null,
              birth_date: editForm.birth_date.trim() || null,
              phone: editForm.phone.trim(),
              prenom: editForm.prenom.trim(),
            }
          : null,
      );

      setIsEditing(false);
      logClientActivity("Profil modifie", "Informations personnelles mises a jour");
    } catch (err: any) {
      alert("Erreur lors de la mise à jour : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    const countryMatch = profile?.country
      ? AFRICA_54.find((c) => c.name === profile.country || c.dial === profile.country_code)
      : null;
    setEditForm({
      ville: profile?.city || profile?.ville || "",
      phone: profile?.phone || "",
      prenom: profile?.prenom || "",
      countryCode: countryMatch?.code || "CI",
      region: profile?.region || "",
      birth_date: profile?.birth_date || "",
    });
    setIsEditing(true);
  };

  const handleLogout = async () => {
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

  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront perdues.",
    );
    if (!confirmDelete) return;

    try {
      if (!user) return;
      await supabase.from("profiles").delete().eq("id", user.id);
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (authError) {
        await supabase.auth.signOut();
        localStorage.clear();
        router.replace("/login");
        alert("Compte supprimé.");
        return;
      }

      await supabase.auth.signOut();
      localStorage.clear();
      router.replace("/login");
      alert("Votre compte a été définitivement supprimé.");
    } catch (err: any) {
      alert("Erreur lors de la suppression du compte : " + err.message);
    }
  };

  if (loading || profileMode === "unknown") {
    return <StudentRouteSkeleton contentOnly variant="page" />;
  }

  if (profileMode === "center") {
    return <CenterStudentProfil />;
  }

  const emptyValue = "—";

  return (
    <div className={`platform-profile-page ${centerNotoSans.className} min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10 overflow-x-hidden`}>
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)]">
        <div className="nexa-student-shell flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 md:py-4">
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="Retour au tableau de bord"
            className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-slate-600 shadow-sm hover:bg-neutral-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-orange-600">
              Mon profil
            </span>
            <h1 className="mt-1 truncate text-base sm:text-lg md:text-xl font-black leading-tight" style={{ color: BRAND.blue }}>
              {displayName}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="flex h-9 sm:h-10 items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3.5 sm:px-4 text-xs font-black uppercase tracking-widest text-orange-600 hover:bg-orange-100"
              >
                <span className="hidden sm:inline">Modifier</span>
                <span className="sm:hidden">✎</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="hidden sm:flex h-10 items-center rounded-full border border-neutral-200 bg-neutral-50 px-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-neutral-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex h-9 sm:h-10 items-center gap-2 rounded-full px-3.5 sm:px-4 text-xs font-black uppercase tracking-widest text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: BRAND.blue }}
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">{saving ? "..." : "Enregistrer"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="nexa-student-shell pt-5 md:pt-8 pb-6 max-w-5xl space-y-4">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 items-start">
        <div className="space-y-4 min-w-0">
        <IdCard
          photoUrl={profile?.avatar_url}
          photoIcon={User}
          photoUploading={avatarUploading}
          onPhotoClick={() => fileInputRef.current?.click()}
          name={displayName}
          tags={[
            { label: isSubValid ? currentTheme.name : "Abonnement inactif", tone: isSubValid ? "positive" : "warning" },
          ]}
        >
          <MetaLine icon={Mail}>{profile?.email || user?.email || emptyValue}</MetaLine>
          <MetaLine icon={Globe2}>{profile?.country || emptyValue}</MetaLine>
          <MetaLine icon={Calendar}>{dateInscription}</MetaLine>
        </IdCard>

        <Group title="Informations personnelles">
          <EditableRow icon={User} label="Prénom" value={profile?.prenom || emptyValue}
            editing={isEditing} editValue={editForm.prenom} onEditChange={(v) => setEditForm((c) => ({ ...c, prenom: v }))} />
          <Row icon={Mail} label="Email" value={profile?.email || user?.email || emptyValue} />
          {isEditing ? (
            <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
              <Globe2 size={16} className="shrink-0" style={{ color: "#eb670e" }} strokeWidth={1.9} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold mb-1" style={{ color: "rgba(17,34,78,0.4)" }}>Pays</p>
                <select
                  value={editForm.countryCode}
                  onChange={(e) => setEditForm((c) => ({ ...c, countryCode: e.target.value, region: "" }))}
                  className="w-full h-8 -mt-1 bg-transparent text-[13.5px] font-bold outline-none border-b"
                  style={{ color: "#11224E", borderColor: "rgba(235,103,14,0.4)" }}
                >
                  {AFRICA_54.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <Row icon={Globe2} label="Pays" value={profile?.country || emptyValue} />
          )}
          <EditableRow icon={MapPin} label="Région" value={profile?.region || emptyValue}
            editing={isEditing} editValue={editForm.region} onEditChange={(v) => setEditForm((c) => ({ ...c, region: v }))} placeholder="Ex: Littoral" />
          <EditableRow icon={MapPin} label="Ville" value={profile?.city || profile?.ville || emptyValue}
            editing={isEditing} editValue={editForm.ville} onEditChange={(v) => setEditForm((c) => ({ ...c, ville: v }))} placeholder="Ex: Douala" />
          <EditableRow icon={Calendar} label="Date de naissance" value={profile?.birth_date ? formatDateCourte(profile.birth_date) : emptyValue}
            editing={isEditing} editValue={editForm.birth_date} onEditChange={(v) => setEditForm((c) => ({ ...c, birth_date: v }))} type="date" />
          <EditableRow icon={Phone} label="Téléphone" value={profile?.phone || emptyValue}
            editing={isEditing} editValue={editForm.phone} onEditChange={(v) => setEditForm((c) => ({ ...c, phone: v }))} placeholder="Ex: +237 600 000 000" />
        </Group>
        </div>

        <div className="space-y-4 min-w-0">
        <Group title="Abonnement">
          <Row icon={ThemeIcon} label="Formule" value={isSubValid ? currentTheme.name : (profile?.subscription_ends_at ? "Expiré" : "Aucun abonnement")} />
          <Row icon={Clock} label="Jours restants" value={
            profile?.subscription_ends_at && profile.subscription_ends_at !== "null"
              ? `${Math.max(0, Math.ceil((new Date(profile.subscription_ends_at).getTime() - Date.now()) / 86400000))} jours`
              : emptyValue
          } />
          <Row icon={Target} label={packType === "aucun" ? "Essai gratuit / jour" : "Simulations EE"} value={
            packType !== "aucun" ? (eeLeft > 1000 ? "Illimité" : `${eeLeft} restantes`) : `${Math.max(0, 1 - dailyCount)} essai restant`
          } />
          {["ivoire", "cauris", "ebene"].includes(packType) && (
            <Row icon={Layers} label="Examens complets (4M)" value={`${examLeft} restants`} />
          )}
          <Row icon={Calendar} label="Date de fin" value={
            profile?.subscription_ends_at && profile.subscription_ends_at !== "null" ? formatDateCourte(profile.subscription_ends_at) : emptyValue
          } />
        </Group>

        <Group title="Session">
          {canInstallApp && (
            <ButtonRow
              icon={Smartphone}
              label={installBusy ? "Installation…" : "Télécharger l'app"}
              onClick={() => void handleInstallRow()}
              busy={installBusy}
              tone="brand"
            />
          )}
          <ButtonRow icon={LogOut} label="Se déconnecter" onClick={() => setLogoutConfirmOpen(true)} tone="danger" />
          <ButtonRow icon={Trash2} label="Supprimer le compte" onClick={handleDeleteAccount} tone="danger" />
        </Group>
        </div>
        </div>
        <div className="hidden"><DownloadAppButton /></div>

        <p className="text-center text-[11px] text-neutral-400 font-bold uppercase tracking-[0.2em] pt-6 opacity-50">
          NEXA
        </p>
      </div>

      {logoutConfirmOpen && (
        <LogoutConfirmDialog
          title={t("dashboard", "profilLogoutConfirmTitle")}
          message={t("dashboard", "profilLogoutConfirmMessage")}
          confirmLabel={t("dashboard", "profilSignOut")}
          cancelLabel={t("dashboard", "profilCancel")}
          busy={logoutBusy}
          onConfirm={() => void handleLogout()}
          onCancel={() => {
            if (!logoutBusy) setLogoutConfirmOpen(false);
          }}
        />
      )}
    </div>
  );
}
