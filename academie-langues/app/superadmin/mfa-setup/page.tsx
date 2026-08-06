"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useI18n } from "../../i18n/I18nProvider";

const BLUE = "#11224E";

export default function SuperadminMfaSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const enrollStarted = useRef(false);

  const [checking, setChecking] = useState(true);
  const [preparing, setPreparing] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prepare = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!profile || profile.role !== "superadmin") {
        router.replace("/login");
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace("/superadmin/dashboard");
        return;
      }

      setChecking(false);

      if (enrollStarted.current) return;
      enrollStarted.current = true;

      // Nettoie tout facteur TOTP incomplet d'une tentative précédente : un
      // secret non vérifié ne peut pas être ré-affiché, il faut repartir propre.
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const stale = factorsData?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const factor of stale) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "NEXA Superadmin",
      });

      if (enrollError || !data) {
        setError(t("superadmin", "mfaPrepareError"));
        setPreparing(false);
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setPreparing(false);
    };

    prepare();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setVerifying(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });

    if (verifyError) {
      setVerifying(false);
      setError(t("superadmin", "mfaInvalidCode"));
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch("/api/superadmin/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "mfa_enrolled" }),
        });
      }
    } catch {
      // non bloquant
    }

    router.replace("/superadmin/dashboard");
  };

  if (checking) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070d] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-8 text-slate-100 shadow-2xl">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-orange-400" />
          <h1 className="text-lg font-black uppercase tracking-widest text-white">
            {t("superadmin", "mfaTitle")}
          </h1>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-slate-400">
          {t("superadmin", "mfaDescription")}
        </p>

        {preparing && (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t("superadmin", "mfaPreparing")}</span>
          </div>
        )}

        {!preparing && qrCode && (
          <form onSubmit={handleVerify} className="space-y-5">
            <div className="flex justify-center rounded-2xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt={t("superadmin", "mfaQrAlt")} className="h-44 w-44" />
            </div>

            {secret && (
              <p className="text-center text-xs text-slate-500">
                {t("superadmin", "mfaManualEntry")} : <span className="font-mono text-slate-300">{secret}</span>
              </p>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <input
              required
              autoFocus
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-center text-lg font-bold tracking-[0.5em] text-white outline-none focus:border-orange-400"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />

            <button
              disabled={verifying || code.length !== 6}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: BLUE }}
            >
              {verifying ? t("superadmin", "mfaVerifying") : t("superadmin", "mfaActivate")}
              {!verifying && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {!preparing && !qrCode && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error || t("superadmin", "mfaGenericError")}
          </div>
        )}
      </div>
    </div>
  );
}
