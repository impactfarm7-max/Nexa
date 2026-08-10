"use client";

import { useEffect, useState } from "react";
import { Clock, Shield, Ban } from "lucide-react";
import {
  loadStudentAccess,
  peekStudentAccess,
  resolveCenterGuardStatus,
  type CenterGuardStatus,
} from "@/app/utils/student-access-cache";
import { useI18n } from "@/app/i18n/I18nProvider";
import { isViewAsStudentPreview } from "@/app/utils/view-as";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

interface Props {
  children: React.ReactNode;
  overlayMode?: boolean;
}

export default function StudentCenterGuard({ children, overlayMode = false }: Props) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [status, setStatus] = useState<CenterGuardStatus>("none");
  const [centerName, setCenterName] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isViewAsStudentPreview()) {
      setStatus("none");
      setLoaded(true);
      return;
    }

    const initial = peekStudentAccess();
    if (initial) {
      const resolved = resolveCenterGuardStatus(initial.profile, initial.centerInfo);
      setStatus(resolved.status);
      setDaysLeft(resolved.daysLeft);
      setCenterName(initial.centerName);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const access = await loadStudentAccess();
      if (cancelled) return;

      if (!access?.profile.center_id) {
        setStatus("none");
        setCenterName(null);
        setDaysLeft(null);
        setLoaded(true);
        return;
      }

      const resolved = resolveCenterGuardStatus(access.profile, access.centerInfo);
      setStatus(resolved.status);
      setDaysLeft(resolved.daysLeft);
      setCenterName(access.centerName);
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return <>{children}</>;
  }

  if (!status || status === "none" || status === "active") return <>{children}</>;

  if (status === "center_unavailable") {
    const content = (
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-red-50">
          <Ban size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black mb-3 text-red-600">{en ? "Access temporarily unavailable" : "Accès temporairement indisponible"}</h1>
        <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-6">
          {en ? <>
            The space for {centerName ? <strong>{centerName}</strong> : "your center"} is currently unavailable
            (pending approval or suspension). Contact your center or the NEXA team for more information.
          </> : <>
            L&apos;espace de {centerName ? <strong>{centerName}</strong> : "votre centre"} est actuellement
            indisponible (validation en attente ou suspension). Contactez votre centre ou l&apos;équipe NEXA pour
            plus d&apos;informations.
          </>}
        </p>
      </div>
    );

    if (overlayMode) {
      return (
        <div className="relative">
          <div className="select-none pointer-events-none opacity-30 blur-[1px]" aria-hidden>
            {children}
          </div>
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm px-4">
            {content}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#FAFAFA] px-4">{content}</div>
    );
  }

  if (status === "pending_center_approval") {
    if (overlayMode) {
      return (
        <div className="relative">
          <div className="select-none pointer-events-none opacity-30 blur-[1px]" aria-hidden>
            {children}
          </div>
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="max-w-sm mx-auto px-6 py-8 text-center">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${ORANGE}18` }}
              >
                <Clock size={28} style={{ color: ORANGE }} />
              </div>
              <h2 className="text-lg font-black mb-2" style={{ color: BLUE }}>
                {en ? "Approval pending" : "Validation en attente"}
              </h2>
              <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                {centerName
                  ? en
                    ? <>Your access to this module will be activated as soon as <strong>{centerName}</strong> approves your registration.</>
                    : <>Votre accès à ce module sera activé dès que <strong>{centerName}</strong> valide votre inscription.</>
                  : en
                    ? "Your access will be activated as soon as your center approves your registration."
                    : "Votre accès sera activé dès que votre centre valide votre inscription."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#FAFAFA] px-4">
        <div className="max-w-md w-full text-center">
          <div
            className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${ORANGE}12` }}
          >
            <Clock size={32} style={{ color: ORANGE }} />
          </div>
          <h1 className="text-2xl font-black mb-3" style={{ color: BLUE }}>
            {en ? "Approval pending" : "Validation en attente"}
          </h1>
          <p className="text-sm text-neutral-500 font-medium leading-relaxed">
            {centerName
              ? en
                ? <>Your registration is being reviewed by <strong>{centerName}</strong>.</>
                : <>Votre inscription est en cours de validation par <strong>{centerName}</strong>.</>
              : en
                ? "Your registration is being reviewed by your center."
                : "Votre inscription est en cours de validation par votre centre."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "paused") {
    // Accès partiel : l'étudiant peut naviguer (UI grisée ailleurs) et ouvrir son profil.
    // Le verrouillage plein écran est géré dans ClientLayout + bandeau profil.
    return <>{children}</>;
  }

  if (status === "revoked") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#FAFAFA] px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center bg-red-50">
            <Ban size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black mb-3 text-red-600">{en ? "Access revoked" : "Accès révoqué"}</h1>
          <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-6">
            {en ? <>
              Your access to this platform has been revoked
              {centerName ? <> by <strong>{centerName}</strong></> : ""}.
              {" "}Contact your center to resolve the situation.
            </> : <>
              Votre accès à cette plateforme a été révoqué
              {centerName ? <> par <strong>{centerName}</strong></> : ""}.
              {" "}Contactez votre centre pour régulariser votre situation.
            </>}
          </p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#FAFAFA] px-4">
        <div className="max-w-md w-full text-center">
          <div
            className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${ORANGE}12` }}
          >
            <Shield size={32} style={{ color: ORANGE }} />
          </div>
          <h1 className="text-2xl font-black mb-3" style={{ color: BLUE }}>{en ? "Access expired" : "Accès expiré"}</h1>
          <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-6">
            {en ? <>
              Your access period has ended
              {centerName ? <> at <strong>{centerName}</strong></> : ""}.
              {" "}Contact your center to renew your registration.
            </> : <>
              Votre période d&apos;accès est terminée
              {centerName ? <> à <strong>{centerName}</strong></> : ""}.
              {" "}Contactez votre centre pour renouveler votre inscription.
            </>}
          </p>
          {daysLeft !== null && daysLeft > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
              <p className="text-xs font-bold text-green-700">
                {en
                  ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining`
                  : `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
