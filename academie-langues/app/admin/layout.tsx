"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../utils/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMfaSetup = pathname === "/admin/mfa-setup";
  const [authorized, setAuthorized] = useState(false);
  const [mfaHint, setMfaHint] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = "#0a0f1a";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAuthorized(false);
    const checkAdmin = async () => {
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
        router.replace("/dashboard");
        return;
      }

      if (isMfaSetup) {
        if (!cancelled) setAuthorized(true);
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerified = (factors?.totp || []).some((f) => f.status === "verified");

      // Si MFA déjà enrôlé mais session aal1 → renvoyer vers login pour challenge
      if (hasVerified && aal?.currentLevel !== "aal2") {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!cancelled) {
        setMfaHint(!hasVerified);
        setAuthorized(true);
      }
    };

    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [router, isMfaSetup]);

  if (!authorized) return null;

  if (isMfaSetup) return <>{children}</>;

  return (
    <>
      {mfaHint && (
        <div className="sticky top-0 z-[100] border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-bold text-amber-200">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          MFA recommandé pour sécuriser l’admin B2C.{" "}
          <Link href="/admin/mfa-setup" className="underline hover:text-white">
            Configurer maintenant
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
