"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, Loader2, SkipForward } from "lucide-react";
import { supabase } from "@/app/utils/supabase";

/** MFA optionnelle pour le rôle plateforme `admin` (B2C ops). */
export default function AdminMfaSetupPage() {
  const router = useRouter();
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

      if (!profile || profile.role !== "admin") {
        router.replace("/login");
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace("/admin");
        return;
      }

      setChecking(false);

      if (enrollStarted.current) return;
      enrollStarted.current = true;

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const stale = factorsData?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const factor of stale) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "NEXA Admin",
      });

      if (enrollError || !data) {
        setError("Impossible de préparer le MFA. Réessayez.");
        setPreparing(false);
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setPreparing(false);
    };

    void prepare();
  }, [router]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || !code.trim()) return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    setVerifying(false);
    if (verifyError) {
      setError("Code invalide ou expiré.");
      return;
    }
    router.replace("/admin");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1a] text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1a] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-2xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-black text-white">Sécuriser le compte admin</h1>
        <p className="mt-2 text-sm text-slate-400">
          Le MFA est recommandé pour l’espace admin B2C. Vous pouvez le configurer maintenant ou plus tard.
        </p>

        {preparing ? (
          <div className="mt-8 flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
          </div>
        ) : (
          <form onSubmit={(e) => void verify(e)} className="mt-6 space-y-4">
            {qrCode && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR MFA" className="mx-auto h-48 w-48" />
              </div>
            )}
            {secret && (
              <p className="break-all rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-slate-400">
                {secret}
              </p>
            )}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code à 6 chiffres"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={verifying || code.trim().length < 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Activer le MFA
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => router.replace("/admin")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <SkipForward className="h-4 w-4" />
          Plus tard
        </button>
      </div>
    </div>
  );
}
