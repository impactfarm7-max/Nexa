"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../utils/supabase";
import { Building2, Mail, Lock, Phone, Eye, EyeOff, MessageCircle, X, CheckCircle2, ArrowRight, Clock, Globe, MapPin, ShieldOff } from "lucide-react";
import { computeTutorUnlockAt } from "@/app/utils/tutor-unlock";
import { TUTOR_EXCHANGE_QUOTA } from "@/app/utils/tutor-quota";
import { getTcfCenterQuotas } from "@/app/data/packOffers";
import { logClientActivity } from "../utils/client-activity";
import { resolvePostLoginPath, isCenterStaff, isSuperAdmin, isPrivilegedRole } from "../utils/student-routes";
import { prepareForLogin, isRefreshTokenError } from "../utils/supabase-auth";
import { SIGNUP_COUNTRIES_FALLBACK, type SignupCountry } from "../data/signup-countries";
import { checkPasswordStrength } from "@/app/utils/password-policy";
import { useI18n } from "@/app/i18n/I18nProvider";

type Step = "LOGIN" | "SIGNUP_FORM" | "SIGNUP_SUCCESS" | "RESET_PWD" | "SUPERADMIN_MFA";

type PendingAuthUser = { id: string; email?: string | null };
type PendingAuthProfile = {
  pin_hash?: string | null;
  tag_status?: string | null;
  center_status?: string | null;
  role?: string | null;
  center_id?: string | null;
  must_change_password?: boolean | null;
};

type LinkedCenter = {
  id: string;
  name: string;
  code: string;
  programName?: string | null;
};

const BLUE = "#11224E";
const ORANGE = "#eb670e";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, setLocale } = useI18n();

  const [step, setStep] = useState<Step>("LOGIN");
  const [loading, setLoading] = useState(false);
  const [resolvingCenterLink, setResolvingCenterLink] = useState(() => {
    const isSignupLink = searchParams.get("signup") === "1" || searchParams.get("mode") === "signup";
    const hasCenterRef = Boolean(
      searchParams.get("centerCode") ||
      searchParams.get("code") ||
      searchParams.get("centre") ||
      searchParams.get("center") ||
      searchParams.get("ref"),
    );
    return isSignupLink && hasCenterRef;
  });
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [revokedPopup, setRevokedPopup] = useState<{ reason: string | null } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [phone, setPhone] = useState("");
  const [ville, setVille] = useState("");
  const [age, setAge] = useState("");
  const [countryCode, setCountryCode] = useState("CM");
  const [countries, setCountries] = useState<SignupCountry[]>(SIGNUP_COUNTRIES_FALLBACK);
  const [centerCode, setCenterCode] = useState("");
  const [centerLinkLabel, setCenterLinkLabel] = useState<string | null>(null);
  const [linkedCenter, setLinkedCenter] = useState<LinkedCenter | null>(null);
  const [programName, setProgramName] = useState<string | null>(null);
  const [successCenterName, setSuccessCenterName] = useState<string | null>(null);
  const [acceptCGU, setAcceptCGU] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSupportMenu, setShowSupportMenu] = useState(false);

  const supportPhone = "+237683375069";

  useEffect(() => {
    const linkLocale = searchParams.get("lang");
    if (linkLocale === "fr" || linkLocale === "en") setLocale(linkLocale);

    supabase
      .from("countries_ref")
      .select("code, name, phone_code")
      .order("name")
      .then(({ data }) => {
        if (data?.length) {
          setCountries(
            data.map((c) => ({
              code: c.code,
              name: c.name,
              phone_code: c.phone_code,
            })),
          );
        }
      });
  }, []);

  const selectedCountry = countries.find((c) => c.code === countryCode) || countries[0];

  const applyCenterInfo = (center: {
    id: string;
    name: string;
    code?: string | null;
    program_name?: string | null;
  }) => {
    setCenterCode(center.code || "");
    setCenterLinkLabel(center.name);
    setProgramName(center.program_name || null);
    setLinkedCenter({
      id: center.id,
      name: center.name,
      code: center.code || "",
      programName: center.program_name || null,
    });
  };

  useEffect(() => {
    if (searchParams.get("reason") === "pending_validation") {
      setMsg({
        type: "info",
        text: t("auth", "loginAccountPendingValidation"),
      });
    }

    const codeFromLink = (searchParams.get("centerCode") || searchParams.get("code") || "").trim().toUpperCase();
    const slugFromLink = (searchParams.get("centre") || searchParams.get("center") || searchParams.get("ref") || "").trim().toLowerCase();
    const openCenterSignup = searchParams.get("signup") === "1" || searchParams.get("mode") === "signup";

    if (openCenterSignup && (slugFromLink || codeFromLink)) {
      setResolvingCenterLink(true);
    }

    const loadCenter = (payload: { slug?: string; code?: string }) =>
      fetch("/api/center/resolve-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json.error || t("auth", "loginInvalidCenter"));
          applyCenterInfo(json.center);
          if (openCenterSignup) {
            setStep("SIGNUP_FORM");
            setMsg(null);
          }
        })
        .catch((err: unknown) => {
          setCenterCode("");
          setCenterLinkLabel(null);
          setLinkedCenter(null);
          setProgramName(null);
          const detail = err instanceof Error ? err.message : "";
          setMsg({
            type: "error",
            text: detail && detail !== t("auth", "loginInvalidCenter")
              ? detail
              : t("auth", "loginInvalidCenterLink"),
          });
        })
        .finally(() => setResolvingCenterLink(false));

    if (slugFromLink) {
      loadCenter({ slug: slugFromLink });
    } else if (codeFromLink) {
      setCenterCode(codeFromLink);
      loadCenter({ code: codeFromLink });
    }

  }, [searchParams, setLocale]);

  const handleCallSupport = () => {
    setShowSupportMenu(false);
    window.location.href = `tel:${supportPhone}`;
  };

  const handleWriteSupport = () => {
    setShowSupportMenu(false);
    router.push("/support?guest=1");
  };

  const SupportButton = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowSupportMenu((prev) => !prev)}
        className="h-11 px-4 rounded-full bg-orange-50 border border-orange-100 text-orange-600 font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-orange-100 transition-colors shadow-md"
      >
        <MessageCircle className="w-4 h-4" />
        {t("auth", "loginSupportButton")}
      </button>

      {showSupportMenu && (
        <>
          <button
            type="button"
            aria-label={t("auth", "loginCloseSupport")}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setShowSupportMenu(false)}
          />
          <div className="absolute bottom-14 right-0 z-50 w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
            <div className="flex items-start gap-3 border-b border-slate-100 bg-orange-50/70 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900">{t("auth", "loginNeedHelp")}</p>
                <p className="mt-0.5 text-xs font-medium leading-snug text-slate-500">{t("auth", "loginContactSupportDesc")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportMenu(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2">
              <button
                type="button"
                onClick={handleCallSupport}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-emerald-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </span>
                <span>
                  <span className="block text-sm font-black text-slate-900">{t("auth", "loginCallSupport")}</span>
                  <span className="block text-xs font-medium text-slate-400">{t("auth", "loginImmediateAssistance")}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={handleWriteSupport}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-orange-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-orange-50">
                  <MessageCircle className="h-5 w-5 text-orange-600" />
                </span>
                <span>
                  <span className="block text-sm font-black text-slate-900">{t("auth", "loginWriteSupport")}</span>
                  <span className="block text-xs font-medium text-slate-400">{t("auth", "loginOpenChatSupport")}</span>
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetError = params.get("reset_error");

    if (resetError === "expired") {
      setStep("RESET_PWD");
      setMsg({
        type: "error",
        text: t("auth", "loginResetLinkExpired"),
      });
      window.history.replaceState(null, "", "/login");
    }

    if (resetError === "invalid") {
      setStep("RESET_PWD");
      setMsg({
        type: "error",
        text: t("auth", "loginResetLinkInvalid"),
      });
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  // Gestion limite appareils
  const [deviceStep, setDeviceStep] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null); // 🆕

  // Vérification MFA obligatoire pour les comptes superadmin
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{
    user: PendingAuthUser;
    profile: PendingAuthProfile;
  } | null>(null);

  const showError = (text: string) => setMsg({ type: "error", text });
  const showSuccess = (text: string) => setMsg({ type: "success", text });
  const showInfo = (text: string) => setMsg({ type: "info", text });

  const resolveCenterCode = async (codeValue: string) => {
    const code = String(codeValue ?? "").trim().toUpperCase();
    if (!code) return null;
    const res = await fetch("/api/center/resolve-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Code centre invalide.");
    return json.center as { id: string; name: string; code: string; program_name?: string | null };
  };

  const validateCenterLogin = async (profile: any) => {
    const loginCenterCode = centerCode.trim().toUpperCase();
    const isCenterAccount = Boolean(profile?.center_id && profile?.role !== "admin");

    // Compte B2C : pas de code centre requis
    if (!isCenterAccount) {
      if (!loginCenterCode) return true;
      return false;
    }

    // Compte centre : email + mot de passe suffisent (center_id déjà sur le profil)
    if (!loginCenterCode) return true;

    const centerContext = await resolveCenterCode(loginCenterCode);
    return Boolean(centerContext?.id && profile?.center_id === centerContext.id);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    await prepareForLogin();

    const normalizedEmail = email.trim().toLowerCase();
    const rawEmail = email.trim();
    // Copier-coller (espaces, caractères invisibles) → sinon "Invalid login credentials"
    const normalizedPassword = password
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    let authResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });

    // Comptes anciens créés avec une casse mixte dans auth.users
    if (authResult.error?.message.includes("Invalid login credentials") && rawEmail !== normalizedEmail) {
      authResult = await supabase.auth.signInWithPassword({
        email: rawEmail,
        password: normalizedPassword,
      });
    }

    const { error, data } = authResult;

    if (error) {
      setLoading(false);
      if (isRefreshTokenError(error.message)) {
        await prepareForLogin();
        return showError(t("auth", "loginSessionExpired"));
      }
      if (error.message.includes("Invalid login credentials")) {
        try {
          const hintRes = await fetch("/api/auth/login-hint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail }),
          });
          const hint = await hintRes.json().catch(() => ({}));
          if (hint.revoked) {
            setRevokedPopup({ reason: typeof hint.reason === "string" ? hint.reason : null });
            return;
          }
          if (hint.hasProfile && !hint.hasAuth) {
            return showError(
              "Votre fiche existe mais l'acces n'est pas actif. Demandez a votre centre de regenerer vos identifiants."
            );
          }
          if (hint.hasProfile && hint.isCenterStudent) {
            return showError(
              "Mot de passe incorrect. Verifiez les identifiants envoyes par votre centre (e-mail en minuscules, mot de passe exact)."
            );
          }
        } catch {
          // ignore hint errors
        }
        return showError("E-mail ou mot de passe incorrect.");
      }
      return showError(error.message);
    }

    const user = data.user;

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("pin_hash, tag_status, center_status, role, center_id, must_change_password")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        await supabase.auth.signOut();
        return showError("Profil introuvable. Contactez le support ou votre centre.");
      }

      const validCenterLogin = await validateCenterLogin(profile);
      if (!validCenterLogin) {
        setLoading(false);
        await supabase.auth.signOut();
        return showError(centerCode.trim() ? "Ce compte n'est pas rattache a ce code centre." : "Code centre requis pour ce compte centre.");
      }

      // Un étudiant en attente ne doit jamais entrer dans le parcours d'accès
      // (contrôle d'appareil, dashboard, modules) avant la validation du centre.
      if (
        profile.role === "student" &&
        profile.center_id &&
        (profile.center_status === "pending_center_approval" || profile.tag_status === "pending_center_approval")
      ) {
        setLoading(false);
        await supabase.auth.signOut();
        showInfo(t("auth", "loginAccountPendingValidation"));
        return;
      }

      // Mot de passe temporaire : forcer le changement avant MFA / dashboard.
      if (isSuperAdmin(profile) && profile.must_change_password) {
        setLoading(false);
        router.replace("/superadmin/change-password");
        return;
      }

      // Les comptes superadmin doivent obligatoirement valider un second facteur
      // (TOTP) avant d'accéder à quoi que ce soit — c'est le cœur de la sécurité
      // de l'espace /superadmin.
      if (isSuperAdmin(profile)) {
        const mfaOutcome = await evaluateSuperadminMfa();
        if (mfaOutcome.outcome === "setup_required") {
          setLoading(false);
          router.replace("/superadmin/mfa-setup");
          return;
        }
        if (mfaOutcome.outcome === "challenge_required") {
          setPendingAuth({ user, profile });
          setMfaFactorId(mfaOutcome.factorId);
          setStep("SUPERADMIN_MFA");
          setLoading(false);
          return;
        }
      }

      // Admin B2C : MFA optionnelle — challenge si déjà enrôlé.
      if (profile.role === "admin") {
        const mfaOutcome = await evaluateSuperadminMfa();
        if (mfaOutcome.outcome === "challenge_required") {
          setPendingAuth({ user, profile });
          setMfaFactorId(mfaOutcome.factorId);
          setStep("SUPERADMIN_MFA");
          setLoading(false);
          return;
        }
      }

      await finalizeLogin(user, profile);
    } catch (error) {
      console.error("❌ Login error:", error);
      setLoading(false);
      await supabase.auth.signOut();
      showError("Erreur de connexion. Veuillez réessayer.");
    }
  };

  /** Évalue si la session courante satisfait le niveau MFA requis pour un superadmin. */
  const evaluateSuperadminMfa = async (): Promise<
    { outcome: "satisfied" } | { outcome: "setup_required" } | { outcome: "challenge_required"; factorId: string }
  > => {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") return { outcome: "satisfied" };
    if (aal?.nextLevel !== "aal2") return { outcome: "setup_required" };

    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.[0];
    if (!totpFactor) return { outcome: "setup_required" };
    return { outcome: "challenge_required", factorId: totpFactor.id };
  };

  /** Termine la connexion : contrôle des sessions/appareils, statut du compte, redirection. */
  const finalizeLogin = async (user: PendingAuthUser, profile: PendingAuthProfile) => {
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    const accessToken = activeSession?.access_token;
    if (!accessToken) {
      setLoading(false);
      await supabase.auth.signOut();
      return showError("Session expirée. Réessayez de vous connecter.");
    }

    const res = await fetch("/api/sessions/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        device: navigator.userAgent,
        ip: "",
      }),
    });

    const result = await res.json();

    // 🔍 Log response for debugging (iPhone can view this)
    const debugLog = {
      timestamp: new Date().toISOString(),
      device: navigator.userAgent.substring(0, 100),
      statusCode: res.status,
      response: result,
      ok: result.ok,
      error: result.error,
    };
    const logs = JSON.parse(localStorage.getItem("session_debug_logs") || "[]");
    logs.push(debugLog);
    localStorage.setItem("session_debug_logs", JSON.stringify(logs.slice(-10))); // Keep last 10

    // ✅ Check if session creation failed
    if (!result.ok && result.error) {
      setLoading(false);
      // Sign out the current auth session
      await supabase.auth.signOut();
      return showError(`Erreur lors de la création de session: ${result.error}`);
    }

    setLoading(false);

    if (result.limitReached) {
      // Ne pas déconnecter ici — on garde la session active pour autoriser la suppression
      setActiveSessions(result.activeSessions);
      setDeviceStep(true);
      return;
    }

    if (!result.token) {
      await supabase.auth.signOut();
      return showError("Erreur: aucun token de session reçu.");
    }

    localStorage.setItem("session_token", result.token);

    // ✅ Mise à jour non-bloquante de la date de connexion en arrière-plan
    void supabase
      .from("profiles")
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq("id", user.id);
    logClientActivity("Connexion", "Connexion reussie");

    if (typeof window !== "undefined") {
      localStorage.setItem("last_active_date", new Date().toISOString());
    }

    sessionStorage.setItem("is_unlocked", "true");

    const destination = resolvePostLoginPath(profile);

    // Vérifier si le PIN a été défini — si non, forcer la création
    if (!isPrivilegedRole(profile) && profile?.tag_status === "revoque") {
      window.location.assign("/revoque");
      return;
    }

    if (!isPrivilegedRole(profile) && profile?.tag_status === "termine") {
      window.location.assign("/termine");
      return;
    }

    if (!profile?.pin_hash && !isCenterStaff(profile) && !isSuperAdmin(profile)) {
      window.location.assign("/pin/setup");
      return;
    }

    if (isSuperAdmin(profile) && profile.must_change_password) {
      window.location.assign("/superadmin/change-password");
      return;
    }

    if (isSuperAdmin(profile)) {
      void logSuperadminLoginAudit();
    }

    // 🚀 Redirection directe et instantanée par le navigateur vers le tableau de bord
    window.location.assign(destination);
  };

  /** Journalise la connexion superadmin côté serveur (non bloquant). */
  const logSuperadminLoginAudit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/superadmin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "login" }),
      });
    } catch {
      // ne doit jamais bloquer la connexion
    }
  };

  /** Vérifie le code TOTP saisi et termine la connexion superadmin. */
  const handleVerifySuperadminMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !pendingAuth) return;
    setMfaVerifying(true);
    setMsg(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode.trim(),
    });

    if (verifyError) {
      setMfaVerifying(false);
      return showError("Code invalide ou expiré. Réessayez.");
    }

    setMfaVerifying(false);
    setMfaCode("");
    const { user, profile } = pendingAuth;
    setLoading(true);
    await finalizeLogin(user, profile);
  };

  // FORCE LOGIN : suppression via API + removingId
  const handleForceLogin = async (sessionIdToRemove: string) => {
    setRemovingId(sessionIdToRemove);
    setMsg(null);

    try {
      // Step 1: Récupérer le token de la session active (l'utilisateur est toujours connecté)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setRemovingId(null);
        return showError("Session expirée. Veuillez vous reconnecter.");
      }

      // Step 2: Supprimer la session sélectionnée (avec auth)
      const deleteRes = await fetch("/api/sessions/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({ sessionId: sessionIdToRemove }),
      });

      const deleteData = await deleteRes.json();
      if (!deleteData.ok) {
        setRemovingId(null);
        return showError(
          deleteData.error || "Erreur lors de la suppression de l'appareil."
        );
      }

      // Step 3: Enregistrer la nouvelle session sur cet appareil
      const res = await fetch("/api/sessions/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: JSON.stringify({
          device: navigator.userAgent,
          ip: "",
        }),
      });

      const result = await res.json();
      if (!result.ok || !result.token) {
        setRemovingId(null);
        return showError("Erreur lors de la création de la session.");
      }

      // Step 4: Sauvegarder et rediriger
      localStorage.setItem("session_token", result.token);
      localStorage.setItem("last_active_date", new Date().toISOString());
      sessionStorage.setItem("is_unlocked", "true");

      await supabase
        .from("profiles")
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq("id", currentSession.user.id);
      logClientActivity("Connexion", "Connexion apres deconnexion d'un appareil");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tag_status, center_status, role, center_id")
        .eq("id", currentSession.user.id)
        .single();

      const validCenterLogin = await validateCenterLogin(profile);
      if (!validCenterLogin) {
        setRemovingId(null);
        await supabase.auth.signOut();
        return showError(centerCode.trim() ? "Ce compte n'est pas rattache a ce code centre." : "Code centre requis pour ce compte centre.");
      }

      if (!isPrivilegedRole(profile) && profile?.tag_status === "revoque") {
        setRemovingId(null);
        router.replace("/revoque");
        return;
      }

      if (!isPrivilegedRole(profile) && profile?.tag_status === "termine") {
        setRemovingId(null);
        router.replace("/termine");
        return;
      }

      if (isSuperAdmin(profile)) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel !== "aal2") {
          setRemovingId(null);
          await supabase.auth.signOut();
          setStep("LOGIN");
          return showInfo("Reconnectez-vous pour valider votre second facteur d'authentification.");
        }
      }

      setRemovingId(null);
      window.location.assign(resolvePostLoginPath(profile));
    } catch (error) {
      console.error("Force login error:", error);
      setRemovingId(null);
      showError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const handleEnterAcademy = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        setStep("LOGIN");
        return showInfo("Connectez-vous avec vos identifiants pour acceder a l'academie.");
      }

      const res = await fetch("/api/sessions/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          device: navigator.userAgent,
          ip: "",
        }),
      });
      const result = await res.json();
      if (result.token) {
        localStorage.setItem("session_token", result.token);
      }

      localStorage.setItem("last_active_date", new Date().toISOString());
      sessionStorage.setItem("is_unlocked", "true");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tag_status, center_status, role, center_id, pin_hash")
        .eq("id", session.user.id)
        .single();

      if (!isPrivilegedRole(profile) && profile?.tag_status === "revoque") {
        window.location.assign("/revoque");
        return;
      }
      if (!isPrivilegedRole(profile) && profile?.tag_status === "termine") {
        window.location.assign("/termine");
        return;
      }
      if (!profile?.pin_hash && !isCenterStaff(profile) && !isSuperAdmin(profile)) {
        window.location.assign("/pin/setup");
        return;
      }

      if (isSuperAdmin(profile)) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel !== "aal2") {
          await supabase.auth.signOut();
          setStep("LOGIN");
          return showInfo("Reconnectez-vous pour valider votre second facteur d'authentification.");
        }
      }

      window.location.assign(resolvePostLoginPath(profile));
    } catch {
      showError("Impossible d'acceder a l'academie. Reessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptCGU) {
      return showError(t("auth", "loginMustAcceptTerms"));
    }

    const pwdCheck = checkPasswordStrength(password);
    if (!pwdCheck.ok) {
      return showError(t("auth", "loginPasswordPolicyHint"));
    }

    setLoading(true);
    setMsg(null);

    let centerContext: LinkedCenter | null = null;
    // Priorité au centre détecté via le lien d'inscription (a déjà l'id, même sans code)
    if (linkedCenter?.id) {
      centerContext = linkedCenter;
    } else {
      try {
        const resolved = await resolveCenterCode(centerCode);
        if (resolved) {
          centerContext = {
            id: resolved.id,
            name: resolved.name,
            code: resolved.code || "",
            programName: resolved.program_name || null,
          };
        }
      } catch (error: any) {
        setLoading(false);
        return showError(error.message || t("auth", "loginInvalidCenterCode"));
      }
    }

    const dial = selectedCountry?.phone_code || "";
    const fullPhone = phone.trim() ? `${dial} ${phone.trim()}`.trim() : "";
    const parsedAge = parseInt(age, 10);
    const birthDate =
      !Number.isNaN(parsedAge) && parsedAge >= 10 && parsedAge <= 99
        ? `${new Date().getFullYear() - parsedAge}-01-01`
        : null;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          prenom: prenom.trim(),
          nom: nom.trim(),
          phone: fullPhone,
          center_id: centerContext?.id || null,
        },
      },
    });

    if (error) {
      setLoading(false);
      if (error.message.includes("already registered"))
        return showError(t("auth", "loginEmailAlreadyRegistered"));
      if (
        error.message.includes("Password should be at least")
        || /weak|uppercase|lowercase|digit|character/i.test(error.message)
      )
        return showError(t("auth", "loginPasswordPolicyHint"));
      return showError(error.message);
    }

    if (data.user) {
      const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("profiles").upsert({
        id: data.user.id,
        prenom: prenom.trim(),
        nom: nom.trim() || null,
        phone: fullPhone || null,
        email: email.trim(),
        ville: ville.trim() || null,
        city: ville.trim() || null,
        country: selectedCountry?.name || null,
        country_code: dial || null,
        birth_date: birthDate,
        role: "student",
        ...(centerContext ? {
          center_id: centerContext.id,
          created_by_center_id: centerContext.id,
          center_status: "pending_center_approval",
          subscription_ends_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          tutor_unlock_at: computeTutorUnlockAt(new Date()),
          ...getTcfCenterQuotas(3),
          tag_status: "pending_center_approval",
        } : {
          pack_name: "essai",
          subscription_ends_at: trialEndsAt,
          tag_status: "actif",
          ee_total: 9999,
          ee_used: 0,
          exam_total: 9999,
          exam_used: 0,
          exam_4m_total: 4,
          exam_4m_used: 0,
          eo_total: 9999,
          eo_used: 0,
          coaching_total: 9999,
          coaching_used: 0,
          tutor_ia_total: TUTOR_EXCHANGE_QUOTA,
          tutor_ia_used: 0,
        }),
        simulations_completed: 0,
        last_sign_in_at: new Date().toISOString(),
      });

      // Ensure center signup status sticks even if an auth trigger wrote a default first.
      if (centerContext) {
        const { error: statusErr } = await supabase.from("profiles").update({
          center_id: centerContext.id,
          created_by_center_id: centerContext.id,
          center_status: "pending_center_approval",
          tag_status: "pending_center_approval",
        }).eq("id", data.user.id);
        if (statusErr) console.error("center signup status update:", statusErr.message);
      }

      if (centerContext || selectedCountry) {
        await supabase.from("student_details").upsert({
          student_id: data.user.id,
          country: selectedCountry?.name || null,
          country_code: dial || null,
        });
      }

      if (centerContext && data.session) {
        try {
          await fetch("/api/center/student-classroom", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ centerId: centerContext.id }),
          });
        } catch {
          // Non bloquant : le centre pourra assigner la salle à l'activation
        }
      }

      logClientActivity("Creation de compte", "Compte client cree depuis la page login");

      if (typeof window !== "undefined") {
        localStorage.setItem("last_active_date", new Date().toISOString());
        localStorage.setItem("nexa_trial_welcome", trialEndsAt);
        sessionStorage.setItem("is_unlocked", "true");
      }

      if (centerContext) {
        // Compte etudiant de centre = en attente d'approbation du centre.
        // On deconnecte immediatement et on renvoie vers le login (aucun apercu
        // du dashboard). L'etudiant se connecte une fois le centre l'a active.
        setSuccessCenterName(centerContext.name);
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          localStorage.removeItem("session_token");
          sessionStorage.removeItem("is_unlocked");
        }
        showSuccess(`Compte cree chez ${centerContext.name}. Connectez-vous pour acceder a l'academie.`);
        setStep("LOGIN");
      } else if (data.session) {
        router.replace("/onboarding");
      } else {
        showSuccess("Compte cree ! Verifiez vos e-mails pour confirmer.");
        setStep("LOGIN");
      }
    }
    setLoading(false);
  };

  const handleResetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    setLoading(false);
    if (error) return showError("Erreur lors de l'envoi du lien.");

    showSuccess("Lien de récupération envoyé par e-mail !");
    setStep("LOGIN");
  };

  const academyName = linkedCenter?.name || centerLinkLabel || "NEXA Academy";
  const displayProgram = programName || linkedCenter?.programName || "Préparation TCF & formations digitales";
  const isSignupFlow = step === "SIGNUP_FORM" || step === "SIGNUP_SUCCESS";
  const brandOnLeft = isSignupFlow;
  const showBrand = !deviceStep && step !== "RESET_PWD";

  const fieldWrap =
    "flex h-[52px] items-center overflow-hidden rounded-2xl border border-slate-200/70 bg-white px-1 transition-all focus-within:border-orange-400 focus-within:shadow-[0_0_0_4px_rgba(235,103,14,0.08)]";
  const fieldInput =
    "h-full w-full min-w-0 bg-transparent px-3 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm";
  const fieldStandalone =
    "h-[52px] w-full rounded-2xl border border-slate-200/70 bg-white px-4 text-base font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-orange-400 focus:shadow-[0_0_0_4px_rgba(235,103,14,0.08)] sm:text-sm";
  const formTitle = "text-2xl font-bold tracking-tight text-slate-900";
  const formSubtitle = "mt-2 text-sm font-normal leading-relaxed text-slate-500";

  const BrandPanel = ({
    mode,
    compact = false,
    hideFooter = false,
  }: {
    mode: "signup" | "login";
    compact?: boolean;
    hideFooter?: boolean;
  }) => (
    <div
        className={`relative flex w-full flex-col overflow-hidden text-center ${
        compact ? "px-5 py-5 sm:px-6 sm:py-6" : "h-full px-10 pt-16 pb-14 lg:px-16 lg:pb-20"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 20%, rgba(235,103,14,0.2) 0%, transparent 58%)",
        }}
      />

      <div className={`relative z-10 flex flex-col ${compact ? "" : "flex-1 justify-center"}`}>
        <div className={`mx-auto w-full max-w-md ${compact ? "space-y-4" : "space-y-7"}`}>
          {mode === "signup" ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  Bienvenue à
                </p>
                <h2
                  className={`font-bold leading-tight ${compact ? "text-xl" : "text-3xl lg:text-4xl"}`}
                  style={{ color: ORANGE }}
                >
                  {academyName}
                </h2>
                <div
                  className="mx-auto h-0.5 w-12 rounded-full"
                  style={{ backgroundColor: ORANGE }}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  Programme
                </p>
                <p className={`font-semibold text-white ${compact ? "text-sm" : "text-lg"}`}>
                  {displayProgram}
                </p>
              </div>

              {!compact && (
                <p className="mx-auto max-w-sm text-base font-normal leading-relaxed text-white/60">
                  {t("auth", "loginSignupStepsDesc")}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                  {t("auth", "loginWelcomeBack")}
                </p>
                <h2
                  className={`font-bold leading-tight ${compact ? "text-xl" : "text-3xl lg:text-4xl"}`}
                  style={{ color: linkedCenter || centerLinkLabel ? ORANGE : "white" }}
                >
                  {linkedCenter || centerLinkLabel ? academyName : t("auth", "loginGladToSeeYou")}
                </h2>
                {(linkedCenter || centerLinkLabel) && (
                  <div
                    className="mx-auto h-0.5 w-12 rounded-full"
                    style={{ backgroundColor: ORANGE }}
                  />
                )}
              </div>
              {!compact && (
                <p className="mx-auto max-w-sm text-base font-normal leading-relaxed text-white/60">
                  {t("auth", "loginConnectDesc")}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {!hideFooter && !compact && (
        <div className="relative z-10 mx-auto mt-auto w-full max-w-sm border-t border-white/10 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            {t("auth", "loginPoweredBy")}
          </p>
          <p className="mt-2 text-sm font-normal leading-relaxed text-white/50">
            {t("auth", "loginEducationTagline")}
          </p>
        </div>
      )}
    </div>
  );

  const switchAuthLink = (target: Step) => (
    <p className="pt-2 text-center text-sm font-medium text-slate-500">
      {target === "SIGNUP_FORM" ? (
        <>
          {t("auth", "loginNoAccountYet")}{" "}
          <button
            type="button"
            onClick={() => { setStep("SIGNUP_FORM"); setMsg(null); }}
            className="font-black hover:underline"
            style={{ color: ORANGE }}
          >
            {t("auth", "loginCreateAccount")}
          </button>
        </>
      ) : (
        <>
          {t("auth", "loginAlreadyHaveAccount")}{" "}
          <button
            type="button"
            onClick={() => { setStep("LOGIN"); setMsg(null); }}
            className="font-black hover:underline"
            style={{ color: BLUE }}
          >
            {t("auth", "loginSignIn")}
          </button>
        </>
      )}
    </p>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#FAFAFA] font-sans lg:grid lg:grid-cols-5 lg:overflow-hidden">
      {resolvingCenterLink && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#FAFAFA] px-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
              <Clock className="h-7 w-7 animate-pulse" style={{ color: ORANGE }} />
            </div>
            <h1 className="mt-5 text-xl font-black" style={{ color: BLUE }}>{t("auth", "loginPreparingSignup")}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{t("auth", "loginVerifyingCenterLink")}</p>
          </div>
        </div>
      )}
      {/* Panneau brand — desktop (fixe, pleine hauteur) */}
      {showBrand && (
        <section
          className={`relative hidden h-full w-full overflow-hidden lg:col-span-2 lg:flex ${
            brandOnLeft ? "lg:order-1" : "lg:order-2"
          }`}
          style={{ background: `linear-gradient(135deg, #0A1628 0%, ${BLUE} 52%, #1A3366 100%)` }}
        >
          <BrandPanel mode={isSignupFlow ? "signup" : "login"} />
        </section>
      )}

      {/* Colonne formulaire — scroll indépendant */}
      <section
        className={`relative flex min-h-0 w-full flex-1 flex-col ${
          showBrand ? "lg:col-span-3" : "lg:col-span-5"
        } ${brandOnLeft ? "lg:order-2" : "lg:order-1"}`}
      >
        <div className="pointer-events-none absolute bottom-4 right-3 z-30 sm:bottom-6 sm:right-6">
          <div className="pointer-events-auto">
            <SupportButton />
          </div>
        </div>

        {/* Bandeau brand mobile — compact, sans scroll */}
        {showBrand && (
          <div
            className="shrink-0 overflow-hidden lg:hidden"
            style={{ background: `linear-gradient(135deg, #0A1628 0%, ${BLUE} 100%)` }}
          >
            <BrandPanel mode={isSignupFlow ? "signup" : "login"} compact hideFooter />
          </div>
        )}

        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          <div className={`mx-auto flex w-full flex-col px-4 py-6 pb-20 sm:min-h-full sm:justify-center sm:px-8 sm:py-10 sm:pb-24 lg:justify-center lg:py-12 ${isSignupFlow ? "max-w-[520px]" : "max-w-[420px]"}`}>
          {msg && (
            <div
              className={`mb-6 rounded-2xl border p-4 text-xs font-bold ${
                msg.type === "success"
                  ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                  : msg.type === "error"
                    ? "border-red-100 bg-red-50 text-red-600"
                    : "border-orange-100 bg-orange-50 text-orange-700"
              }`}
            >
              {msg.text}
            </div>
          )}

          {revokedPopup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <ShieldOff className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900">{t("auth", "loginAccessRevoked")}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                  {t("auth", "loginAccessRevokedDesc")}
                </p>
                {revokedPopup.reason && (
                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">{t("auth", "loginReasonLabel")}</p>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-red-700">{revokedPopup.reason}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setRevokedPopup(null)}
                  className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800"
                >
                  {t("auth", "loginUnderstood")}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {deviceStep && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{t("auth", "loginDeviceLimitTitle")}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {t("auth", "loginDeviceLimitDesc")}
                  </p>
                </div>
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate text-xs font-bold text-slate-700">
                        {session.device?.substring(0, 50) || t("auth", "loginUnknownDevice")}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {t("auth", "loginLastActivity")} {new Date(session.lastSeen).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleForceLogin(session.id)}
                      disabled={removingId === session.id}
                      className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: ORANGE }}
                    >
                      {removingId === session.id ? "..." : t("auth", "loginDisconnect")}
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => { setDeviceStep(false); setMsg(null); }}
                  className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
                >
                  {t("auth", "loginCancel")}
                </button>
              </div>
            )}

            {!deviceStep && step === "LOGIN" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h2 className={formTitle}>{t("auth", "loginConnectionTitle")}</h2>
                  <p className={formSubtitle}>{t("auth", "loginEnterCredentialsDesc")}</p>
                </div>

                <div className={fieldWrap}>
                  <div className="pl-3 text-slate-400"><Mail className="h-5 w-5" /></div>
                  <input
                    required
                    type="email"
                    placeholder={t("auth", "loginEmailPlaceholder")}
                    className={fieldInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className={`${fieldWrap} relative`}>
                  <div className="pl-3 text-slate-400"><Lock className="h-5 w-5" /></div>
                  <input
                    required
                    type={showLoginPassword ? "text" : "password"}
                    placeholder={t("auth", "loginPasswordPlaceholder")}
                    className={`${fieldInput} pr-12 ${!showLoginPassword && password.length > 0 ? "tracking-widest" : ""}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500"
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setStep("RESET_PWD")}
                    className="text-xs font-black hover:underline"
                    style={{ color: ORANGE }}
                  >
                    {t("auth", "loginForgotPassword")}
                  </button>
                </div>

                <button
                  disabled={loading}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: BLUE }}
                >
                  {loading ? t("auth", "loginVerifying") : t("auth", "loginEnterAcademy")}
                  {!loading && <ArrowRight size={16} />}
                </button>

              </form>
            )}

            {!deviceStep && step === "SUPERADMIN_MFA" && (
              <form onSubmit={handleVerifySuperadminMfa} className="space-y-5">
                <div>
                  <h2 className={formTitle}>{t("auth", "loginTwoStepVerification")}</h2>
                  <p className={formSubtitle}>
                    {t("auth", "loginEnterMfaCode")}
                  </p>
                </div>

                <div className={fieldWrap}>
                  <div className="pl-3 text-slate-400"><Lock className="h-5 w-5" /></div>
                  <input
                    required
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className={`${fieldInput} tracking-[0.5em]`}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </div>

                <button
                  disabled={mfaVerifying || mfaCode.length !== 6}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: BLUE }}
                >
                  {mfaVerifying ? t("auth", "loginVerifying") : t("auth", "loginValidate")}
                  {!mfaVerifying && <ArrowRight size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("LOGIN");
                    setMfaCode("");
                    setPendingAuth(null);
                    setMfaFactorId(null);
                    supabase.auth.signOut();
                  }}
                  className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
                >
                  {t("auth", "loginCancel")}
                </button>
              </form>
            )}

            {!deviceStep && step === "SIGNUP_FORM" && (
              <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
                <div>
                  <h2 className={formTitle}>{t("auth", "loginCreateAccount")}</h2>
                  <p className={formSubtitle}>{t("auth", "loginCompleteInfoBelow")}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    required
                    placeholder={t("auth", "loginFirstNamePlaceholder")}
                    className={fieldStandalone}
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                  />
                  <input
                    required
                    placeholder={t("auth", "loginLastNamePlaceholder")}
                    className={fieldStandalone}
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>

                <div className={fieldWrap}>
                  <div className="pl-3 text-slate-400"><Globe className="h-4 w-4" /></div>
                  <select
                    required
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className={`${fieldInput} cursor-pointer`}
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className={fieldWrap}>
                  <span className="shrink-0 pl-3 text-sm font-semibold text-slate-500">
                    {selectedCountry?.phone_code || "+"}
                  </span>
                  <input
                    required
                    type="tel"
                    placeholder={t("auth", "loginPhonePlaceholder")}
                    className={fieldInput}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  />
                </div>

                <div className={fieldWrap}>
                  <div className="pl-3 text-slate-400"><MapPin className="h-4 w-4" /></div>
                  <input
                    required
                    placeholder={t("auth", "loginCityPlaceholder")}
                    className={fieldInput}
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                  />
                </div>

                <input
                  required
                  type="number"
                  min={10}
                  max={99}
                  placeholder={t("auth", "loginAgePlaceholder")}
                  className={fieldStandalone}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />

                <div className={fieldWrap}>
                  <div className="pl-3 text-slate-400"><Mail className="h-4 w-4" /></div>
                  <input
                    required
                    type="email"
                    placeholder={t("auth", "loginEmailPlaceholder")}
                    className={fieldInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {!centerLinkLabel && !linkedCenter && (
                  <div className={fieldWrap}>
                    <div className="pl-3 text-slate-400"><Building2 className="h-4 w-4" /></div>
                    <input
                      type="text"
                      placeholder={t("auth", "loginCenterCodePlaceholder")}
                      className={`${fieldInput} uppercase`}
                      value={centerCode}
                      onChange={(e) => {
                        setCenterLinkLabel(null);
                        setCenterCode(e.target.value.toUpperCase());
                      }}
                    />
                  </div>
                )}

                <div className={`${fieldWrap} relative`}>
                  <div className="pl-3 text-slate-400"><Lock className="h-4 w-4" /></div>
                  <input
                    required
                    type={showSignupPassword ? "text" : "password"}
                    placeholder={t("auth", "loginPasswordExamplePlaceholder")}
                    className={`${fieldInput} pr-12 ${!showSignupPassword && password.length > 0 ? "tracking-widest" : ""}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500"
                  >
                    {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="px-1 text-[10px] font-medium leading-relaxed text-slate-400">
                  {t("auth", "loginPasswordPolicyHint")}
                </p>

                <label className="flex cursor-pointer items-start gap-3 select-none">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={acceptCGU}
                      onChange={(e) => setAcceptCGU(e.target.checked)}
                    />
                    <div className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-slate-200 bg-white transition-all peer-checked:border-orange-500 peer-checked:bg-orange-500">
                      {acceptCGU && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium leading-relaxed text-slate-500">
                    {t("auth", "loginAcceptThe")}{" "}
                    <a href="/cgu" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: ORANGE }} onClick={(e) => e.stopPropagation()}>
                      {t("auth", "loginCguLabel")}
                    </a>{" "}
                    {t("auth", "loginAndThe")}{" "}
                    <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: ORANGE }} onClick={(e) => e.stopPropagation()}>
                      {t("auth", "loginPrivacyPolicyLabel")}
                    </a>.
                  </span>
                </label>

                <button
                  disabled={loading || !acceptCGU}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: ORANGE }}
                >
                  {loading ? t("auth", "loginCreatingAccount") : t("auth", "loginCreateMyAccount")}
                  {!loading && <ArrowRight size={16} />}
                </button>

                {switchAuthLink("LOGIN")}
              </form>
            )}

            {!deviceStep && step === "SIGNUP_SUCCESS" && (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <Clock size={12} />
                  {t("auth", "loginPendingValidationBadge")}
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-emerald-100 bg-emerald-50">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>

                <div>
                  <h2 className={formTitle}>{t("auth", "loginCongratulations")}</h2>
                  <p className={formSubtitle}>
                    {t("auth", "loginAccountCreatedSuccessAt")}{" "}
                    <span className="font-semibold text-slate-800">{successCenterName || academyName}</span>.
                    {" "}{t("auth", "loginCenterWillValidate")}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleEnterAcademy}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-xl transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: BLUE }}
                >
                  {loading ? t("auth", "loginPreparing") : t("auth", "loginConfigurePinCode")}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </div>
            )}

            {!deviceStep && step === "RESET_PWD" && (
              <form onSubmit={handleResetPwd} className="space-y-5">
                <div>
                  <h2 className={formTitle}>{t("auth", "loginForgotPasswordTitle")}</h2>
                  <p className={formSubtitle}>{t("auth", "loginResetLinkDesc")}</p>
                </div>

                <div className={fieldWrap}>
                  <div className="pl-3 text-slate-400"><Mail className="h-5 w-5" /></div>
                  <input
                    required
                    type="email"
                    placeholder={t("auth", "loginEmailPlaceholder")}
                    className={fieldInput}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button
                  disabled={loading}
                  className="flex h-[52px] w-full items-center justify-center rounded-2xl text-sm font-black text-white transition-all hover:opacity-95 disabled:opacity-50"
                  style={{ backgroundColor: ORANGE }}
                >
                  {loading ? t("auth", "loginSendingInProgress") : t("auth", "loginSendResetLink")}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("LOGIN")}
                  className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
                >
                  {t("auth", "loginBackToLogin")}
                </button>
              </form>
            )}
          </div>

          <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
            NEXA © 2026
          </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
