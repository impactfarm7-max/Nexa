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
  BadgeCheck,
  Crown,
  Clock,
  AlertCircle,
  Phone,
  Edit2,
  Save,
  Trash2,
  Camera,
  ShieldCheck,
  Zap,
  Leaf,
  Star,
  Target,
  Layers
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { logClientActivity } from "../utils/client-activity";
import { logoutAndClearSession } from "../utils/session";
import { useSimulationLimit } from "@/app/hooks/useSimulationLimit";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import { AFRICA_54, findAfricaCountry } from "@/app/data/africa-54";

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

// ✅ Tous les mois à exactement 3 lettres
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

  const [profileMode, setProfileMode] = useState<"unknown" | "center" | "b2c">("unknown");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // 🎯 GESTION DU MODE ÉDITION
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

  // 📸 GESTION DE L'AVATAR
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🟢 IMPORT DU VIGILE DES PACKS
  const { 
    packType, 
    isSubValid, 
    eeLeft, 
    examLeft, 
    dailyCount 
  } = useSimulationLimit();

  // ==========================================
  // 🎨 CONFIGURATION DES THEMES DE PACKS
  // ==========================================
  const PACK_THEMES: Record<string, any> = {
    ivoire: {
      name: "MEMBRE IVOIRE",
      bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      border: "border-yellow-500",
      text: "text-white",
      iconBg: "bg-white/20",
      iconText: "text-white",
      icon: Crown
    },
    cauris: {
      name: "MEMBRE CAURIS",
      bg: "bg-gradient-to-br from-blue-500 to-blue-700",
      border: "border-blue-600",
      text: "text-white",
      iconBg: "bg-white/20",
      iconText: "text-white",
      icon: ShieldCheck
    },
    ebene: {
      name: "MEMBRE ÉBÈNE",
      bg: "bg-gradient-to-br from-slate-800 to-slate-950",
      border: "border-slate-800",
      text: "text-white",
      iconBg: "bg-white/10",
      iconText: "text-white",
      icon: Zap
    },
    raphia: {
      name: "MEMBRE RAPHIA",
      bg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
      border: "border-emerald-500",
      text: "text-white",
      iconBg: "bg-white/20",
      iconText: "text-white",
      icon: Leaf
    },
    acceleree: {
      name: "FORMATION ACCÉLÉRÉE",
      bg: "bg-gradient-to-br from-indigo-500 to-indigo-700",
      border: "border-indigo-600",
      text: "text-white",
      iconBg: "bg-white/20",
      iconText: "text-white",
      icon: Zap
    },
    complete: {
      name: "FORMATION COMPLÈTE",
      bg: "bg-gradient-to-br from-purple-500 to-purple-700",
      border: "border-purple-600",
      text: "text-white",
      iconBg: "bg-white/20",
      iconText: "text-white",
      icon: Star
    },
    admin: {
      name: "ADMINISTRATEUR",
      bg: "bg-gradient-to-br from-slate-900 to-slate-700",
      border: "border-slate-700",
      text: "text-white",
      iconBg: "bg-white/10",
      iconText: "text-white",
      icon: ShieldCheck
    },
    aucun: {
      name: "ÉTUDIANT CLASSIQUE",
      bg: "bg-neutral-50",
      border: "border-neutral-200/60",
      text: "text-neutral-900",
      iconBg: "bg-neutral-900",
      iconText: "text-white",
      icon: GraduationCap
    }
  };

  // Si abonnement actif mais pack non encore assigné → thème générique "Accès Premium"
  const resolvedPackType = (isSubValid && packType === "aucun") ? "_premium_actif" : packType;
  const PREMIUM_FALLBACK_THEME = {
    name: "ACCÈS PREMIUM",
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    border: "border-orange-500",
    text: "text-white",
    iconBg: "bg-white/20",
    iconText: "text-white",
    icon: Crown
  };
  const currentTheme = resolvedPackType === "_premium_actif"
    ? PREMIUM_FALLBACK_THEME
    : (PACK_THEMES[packType] || PACK_THEMES.aucun);
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
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, [profile, user]);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

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
      const { data: created } = await supabase
        .from("profiles")
        .upsert(fallback)
        .select("*")
        .single();
      setProfile((created as Profile) ?? null);
    } else {
      const fullData = { ...data };
      if (!fullData.ville && session.user.user_metadata?.ville)
        fullData.ville = session.user.user_metadata.ville;
      if (!fullData.phone && session.user.user_metadata?.phone)
        fullData.phone = session.user.user_metadata.phone;
      setProfile(fullData as Profile);
    }
    logClientActivity("Ouverture profil", "Page Mon compte consultee");

    setLoading(false);
  };

  // Chargement initial
  useEffect(() => { loadProfile(); }, []);

  // Recharge les données quand l'onglet redevient visible (ex: retour depuis /admin)
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === "visible") loadProfile(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // 📸 UPLOAD AVATAR
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Vérification taille (max 2MB) et type
    if (file.size > 2 * 1024 * 1024) {
      alert("Image trop lourde. Maximum 2 Mo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Fichier non supporté. Choisissez une image.");
      return;
    }

    setAvatarUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload dans le bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Récupération de l'URL publique
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache busting

      // Sauvegarde dans profiles
      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      setProfile((prev) =>
        prev ? { ...prev, avatar_url: publicUrl } : null
      );
      logClientActivity("Avatar modifie", "Photo de profil mise a jour");
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + err.message);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 🎯 FONCTION POUR ENREGISTRER LES MODIFICATIONS
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
      alert("Profil mis à jour avec succès !");
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
    const token = localStorage.getItem("session_token") || "";
    await logoutAndClearSession(token);
    router.replace("/login");
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront perdues.",
    );
    if (!confirmDelete) return;

    try {
      if (!user) return;

      // 1. Supprimer de la table profiles
      await supabase.from("profiles").delete().eq("id", user.id);

      // 2. Supprimer du compte Auth Supabase
      const { error: authError } = await supabase.auth.admin.deleteUser(
        user.id,
      );

      if (authError) {
        // Si l'admin API échoue, utiliser la méthode standard
        await supabase.auth.signOut();
        localStorage.clear();
        router.replace("/login");
        alert("Compte supprimé.");
        return;
      }

      // 3. Déconnecter et nettoyer
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

  return (
    <div className="min-h-[100dvh] bg-[#FFFBF7] text-neutral-900 font-sans pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-10 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
        <div className="nexa-student-shell py-3 md:py-4 xl:py-5 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            aria-label="Retour au tableau de bord"
            className="inline-flex min-w-[44px] min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full md:rounded-2xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition group md:px-4 md:py-2"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8] group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:inline text-[10px] font-extrabold uppercase tracking-wider">
              Dashboard
            </span>
          </button>

          <div className="flex-1 min-w-0 text-center md:text-right">
            <p className="hidden md:block text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
              Profil Étudiant
            </p>
            <p className={`${STUDENT_TEXT.pageTitle} truncate`} style={{ color: BRAND.blue }}>
              <span className="md:hidden">Mon profil</span>
              <span className="hidden md:inline">Dossier Académique</span>
            </p>
            <p className="md:hidden text-xs font-bold text-neutral-500 truncate mt-0.5">{displayName}</p>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors text-[10px] font-extrabold uppercase tracking-wider"
              >
                <Edit2 size={14} /> Modifier le profil
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-[10px] font-extrabold uppercase tracking-wider"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-[10px] font-extrabold uppercase tracking-wider disabled:opacity-50"
                >
                  <Save size={14} />{" "}
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            )}
          </div>

          <div className="w-11 shrink-0 md:hidden" aria-hidden />
        </div>
      </header>

      <div className="nexa-student-shell pt-6 md:pt-10 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 xl:gap-10">

          {/* COLONNE GAUCHE */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6 text-center lg:text-left overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />

              <div className="flex flex-col items-center lg:items-start">
                {/* 📸 AVATAR AVEC BOUTON UNIQUE */}
                <div className="mb-4">

                  {/* Input unique — sur mobile le système propose galerie ou caméra nativement */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />

                  {/* Photo ou icône par défaut */}
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] overflow-hidden bg-orange-500/10 border border-orange-200/40 flex items-center justify-center mx-auto lg:mx-0">
                    {avatarUploading ? (
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
                    ) : profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 md:w-12 md:h-12 text-orange-600 stroke-[1.5]" />
                    )}
                  </div>

                  {/* Bouton modifier la photo */}
                  {!avatarUploading ? (
                    <div className="flex justify-center lg:justify-start mt-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-orange-50 hover:text-orange-600 text-neutral-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-neutral-200 hover:border-orange-200"
                      >
                        <Camera size={11} /> Modifier la photo
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-orange-500 font-bold text-center lg:text-left mt-2 animate-pulse">
                      Upload en cours...
                    </p>
                  )}
                </div>

                <div className="mb-4 w-full">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    {/* 🎯 PRÉNOM ÉDITABLE */}
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.prenom}
                        onChange={(e) =>
                          setEditForm({ ...editForm, prenom: e.target.value })
                        }
                        className="text-xl md:text-2xl font-black text-neutral-900 leading-tight bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-orange-500 w-full text-center lg:text-left"
                        placeholder="Votre prénom"
                      />
                    ) : (
                      <p className="text-xl md:text-2xl xl:text-3xl font-black text-neutral-900 leading-tight">
                        {displayName}
                      </p>
                    )}
                    {!isEditing && (
                      <BadgeCheck className="w-5 h-5 text-orange-500 fill-orange-500/10 shrink-0" />
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center justify-center lg:justify-start gap-1.5 px-3 py-1 mt-3 rounded-full text-[10px] font-extrabold border uppercase mx-auto lg:mx-0 ${
                      isSubValid ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-700"
                    }`}
                  >
                    {isSubValid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {isSubValid ? <ThemeIcon size={12} /> : <AlertCircle size={12} />}
                    {isSubValid ? currentTheme.name : "Abonnement Inactif"}
                  </span>
                </div>
              </div>

              {/* 🎯 BOUTONS MOBILE POUR L'ÉDITION */}
              <div className="md:hidden mt-6 space-y-3">
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="w-full rounded-2xl px-5 py-4 font-extrabold text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 transition items-center justify-center gap-2 flex"
                  >
                    <Edit2 size={16} /> Modifier mon profil
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full rounded-2xl px-5 py-4 font-extrabold text-sm text-white bg-emerald-500 hover:bg-emerald-600 transition items-center justify-center gap-2 flex disabled:opacity-50"
                    >
                      <Save size={16} />{" "}
                      {saving
                        ? "Enregistrement..."
                        : "Enregistrer les modifications"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="w-full rounded-2xl px-5 py-3 font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition items-center justify-center flex"
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="hidden lg:flex w-full mt-6 rounded-2xl px-5 py-4 font-extrabold text-sm text-white shadow-lg transition bg-neutral-900 hover:bg-orange-600 items-center justify-center gap-2 group"
              >
                <LogOut className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                Se déconnecter
              </button>
              <button
                onClick={handleDeleteAccount}
                className="hidden lg:flex w-full mt-3 rounded-2xl px-5 py-4 font-extrabold text-sm text-white shadow-lg transition bg-red-600 hover:bg-red-700 items-center justify-center gap-2 group"
              >
                <Trash2 className="w-4 h-4 text-white" />
                Supprimer le compte
              </button>
            </section>

            {/* SECTION INFORMATIONS PERSONNELLES */}
            <section className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Informations Personnelles
                </h3>
                {isEditing && (
                  <span className="text-[10px] font-bold text-orange-500 animate-pulse bg-orange-50 px-2 py-1 rounded-md">
                    Mode édition
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <InfoRow
                  icon={<Mail className="w-4 h-4 text-neutral-700 stroke-[1.8]" />}
                  label="Email"
                  value={profile?.email || user?.email || "—"}
                  isEditing={false}
                />
                <InfoRow
                  icon={<MapPin className="w-4 h-4 text-neutral-700 stroke-[1.8]" />}
                  label="Pays"
                  value={profile?.country || "—"}
                  isEditing={false}
                />
                <InfoRow
                  icon={<MapPin className="w-4 h-4 text-neutral-700 stroke-[1.8]" />}
                  label="Région"
                  value={profile?.region || "—"}
                  isEditing={isEditing}
                  editValue={editForm.region}
                  onEditChange={(val) =>
                    setEditForm({ ...editForm, region: val })
                  }
                  placeholder="Ex: Littoral"
                />
                <InfoRow
                  icon={<MapPin className="w-4 h-4 text-neutral-700 stroke-[1.8]" />}
                  label="Ville"
                  value={profile?.city || profile?.ville || "—"}
                  isEditing={isEditing}
                  editValue={editForm.ville}
                  onEditChange={(val) =>
                    setEditForm({ ...editForm, ville: val })
                  }
                  placeholder="Ex: Douala"
                />
                {isEditing && (
                  <div className="flex items-center gap-4 rounded-2xl bg-white border border-orange-300 p-4 ring-2 ring-orange-500/10">
                    <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center shrink-0 shadow-sm">
                      <MapPin className="w-4 h-4 text-neutral-700 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest mb-1">Pays</p>
                      <select
                        value={editForm.countryCode}
                        onChange={(e) => setEditForm({ ...editForm, countryCode: e.target.value, region: "" })}
                        className="w-full bg-transparent text-sm font-bold text-neutral-900 outline-none border-b border-orange-200 pb-1"
                      >
                        {AFRICA_54.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <InfoRow
                  icon={<Calendar className="w-4 h-4 text-neutral-700 stroke-[1.8]" />}
                  label="Date de naissance"
                  value={profile?.birth_date ? formatDateCourte(profile.birth_date) : "—"}
                  isEditing={isEditing}
                  editValue={editForm.birth_date}
                  onEditChange={(val) =>
                    setEditForm({ ...editForm, birth_date: val })
                  }
                  placeholder=""
                  inputType="date"
                />
                <InfoRow
                  icon={<Phone className="w-4 h-4 text-neutral-700 stroke-[1.8]" />}
                  label="Téléphone"
                  value={profile?.phone || "—"}
                  isEditing={isEditing}
                  editValue={editForm.phone}
                  onEditChange={(val) =>
                    setEditForm({ ...editForm, phone: val })
                  }
                  placeholder="Ex: +237 600 000 000"
                />
                <InfoRow
                  icon={<Calendar className="w-4 h-4 text-neutral-700 stroke-[1.8]" />}
                  label="Inscrit depuis"
                  value={dateInscription}
                  isEditing={false}
                />
              </div>
            </section>
          </div>

          {/* COLONNE DROITE : LE STATUT DU PACK ET LES QUOTAS */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-3xl border border-neutral-200/60 shadow-sm p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 ml-1 mb-4">
                Statut de l'abonnement
              </h3>

              {/* 💳 GRANDE CARTE DU PACK */}
              <div className={`${currentTheme.bg} rounded-2xl border ${currentTheme.border} p-5 md:p-6 mb-4 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 transition-all duration-300`}>
                <div className={`w-16 h-16 rounded-2xl ${currentTheme.iconBg} flex items-center justify-center shrink-0`}>
                  <ThemeIcon className={`w-8 h-8 ${currentTheme.iconText} stroke-[1.8]`} />
                </div>
                <div className="min-w-0 w-full sm:w-auto">
                  <p className={`text-lg sm:text-xl md:text-2xl xl:text-3xl font-black ${currentTheme.text} tracking-tight break-words`}>
                    {currentTheme.name}
                  </p>
                  <p
                    className={`text-xs sm:text-sm font-bold uppercase mt-1 ${
                      isSubValid ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {isSubValid
                      ? (packType !== "aucun" ? `${currentTheme.name} — Actif` : "Abonnement Actif")
                      : (profile?.subscription_ends_at ? "Abonnement Expiré" : "Aucun Abonnement")}
                  </p>
                </div>
              </div>

              {/* 📊 GRILLE DES QUOTAS ET DATES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Carte Jours restants */}
                <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 p-4 group hover:bg-white hover:border-orange-100 transition-all">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform shadow-sm group-hover:scale-110 ${isSubValid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <Clock className={`w-4 h-4 stroke-[1.8] ${isSubValid ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Jours restants</p>
                    <p className="text-sm font-bold text-neutral-900 truncate mt-0.5">
                      {profile?.subscription_ends_at && profile.subscription_ends_at !== "null"
                        ? Math.max(0, Math.ceil((new Date(profile.subscription_ends_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
                        : "—"} jours
                    </p>
                  </div>
                </div>

                {/* 2. Carte Simulations EE */}
                <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 p-4 group hover:bg-white hover:border-orange-100 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 transition-transform shadow-sm group-hover:scale-110">
                    <Target className="w-4 h-4 text-orange-500 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">
                      {packType === "aucun" ? "Essai Gratuit / Jour" : "Simulations EE (Restant)"}
                    </p>
                    <p className="text-sm font-bold text-neutral-900 truncate mt-0.5">
                      {packType !== "aucun" 
                        ? (eeLeft > 1000 ? "Illimité (∞)" : `${eeLeft} restantes`) 
                        : `${Math.max(0, 1 - dailyCount)} essai restant`}
                    </p>
                  </div>
                </div>

                {/* 3. Carte Examens Complets (Caché pour Raphia et Classique) */}
                {["ivoire", "cauris", "ebene"].includes(packType) && (
                  <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 p-4 group hover:bg-white hover:border-orange-100 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 transition-transform shadow-sm group-hover:scale-110">
                      <Layers className="w-4 h-4 text-blue-500 stroke-[1.8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Examens Complets (4M)</p>
                      <p className="text-sm font-bold text-neutral-900 truncate mt-0.5">
                        {examLeft} restants
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Carte Date de début / fin */}
                <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 p-4 group hover:bg-white hover:border-orange-100 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center shrink-0 transition-transform shadow-sm group-hover:scale-110">
                    <Calendar className="w-4 h-4 text-neutral-700 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">
                      Date de fin
                    </p>
                    <p className="text-sm font-bold text-neutral-900 truncate mt-0.5">
                      {profile?.subscription_ends_at && profile.subscription_ends_at !== "null"
                        ? formatDateCourte(profile.subscription_ends_at)
                        : "—"}
                    </p>
                  </div>
                </div>

              </div>
            </section>

            <button
              onClick={handleLogout}
              className="lg:hidden w-full rounded-[2rem] px-5 py-5 font-black text-base text-white shadow-xl transition bg-neutral-900 active:scale-95 inline-flex items-center justify-center gap-3"
            >
              <LogOut className="w-5 h-5 text-white stroke-[2]" />
              Se déconnecter
            </button>
            <button
              onClick={handleDeleteAccount}
              className="lg:hidden w-full mt-3 rounded-[2rem] px-5 py-5 font-black text-base text-white shadow-xl transition bg-red-600 active:scale-95 inline-flex items-center justify-center gap-3"
            >
              <Trash2 className="w-5 h-5 text-white stroke-[2]" />
              Supprimer le compte
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-neutral-400 font-bold uppercase tracking-[0.2em] pt-10 opacity-50">
          NEXA • Système Synchronisé v2.6
        </p>
      </div>
    </div>
  );
}

// 🎯 COMPOSANT INFOROW AVEC SUPPORT ÉDITION
function InfoRow({
  icon,
  label,
  value,
  isEditing = false,
  editValue = "",
  onEditChange,
  placeholder = "",
  inputType = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (val: string) => void;
  placeholder?: string;
  inputType?: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl bg-neutral-50 border p-4 transition-all group ${
        isEditing
          ? "border-orange-300 bg-white shadow-sm ring-2 ring-orange-500/10"
          : "border-neutral-200/60 hover:bg-white hover:border-orange-100"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl bg-white border border-neutral-200/60 flex items-center justify-center shrink-0 transition-transform shadow-sm ${
          !isEditing && "group-hover:scale-110"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">
          {label}
        </p>

        {isEditing && onEditChange ? (
          <input
            type={inputType}
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            placeholder={placeholder}
            className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-sm font-bold text-neutral-900 outline-none focus:border-orange-500 transition-colors"
          />
        ) : (
          <p className="text-sm font-bold text-neutral-900 truncate mt-0.5">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
