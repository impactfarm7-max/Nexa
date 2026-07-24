"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogOut, LayoutDashboard, Building2, Inbox, Users, ScrollText } from "lucide-react";
import { supabase } from "../utils/supabase";

// Cette route gère elle-même son propre contrôle (rôle + éventuelle redirection
// si le MFA est déjà actif) : elle ne doit PAS être bloquée par l'exigence
// aal2 ci-dessous, sinon on obtient une boucle bloquante (impossible d'activer
// le MFA puisque la page pour l'activer est elle-même gated par le MFA).
const MFA_SETUP_PATH = "/superadmin/mfa-setup";

const NAV_ITEMS = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/centres", label: "Centres", icon: Building2 },
  { href: "/superadmin/etudiants", label: "Étudiants", icon: Users },
  { href: "/superadmin/demandes", label: "Demandes", icon: Inbox },
  { href: "/superadmin/audit", label: "Journal", icon: ScrollText },
];

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isMfaSetupRoute = pathname === MFA_SETUP_PATH;
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.backgroundColor = "#05070d";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAuthorized(false);

    const checkSuperadmin = async () => {
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

      if (isMfaSetupRoute) {
        // La page mfa-setup vérifie elle-même le niveau aal et redirige vers
        // le dashboard si le MFA est déjà validé pour cette session.
        if (cancelled) return;
        setEmail(session.user.email ?? null);
        setAuthorized(true);
        return;
      }

      // Le rôle seul ne suffit pas : la session courante doit avoir complété
      // le second facteur (aal2). Sans ça, retour au login pour rejouer le MFA.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        if (aal?.nextLevel !== "aal2") {
          router.replace(MFA_SETUP_PATH);
          return;
        }
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (cancelled) return;
      setEmail(session.user.email ?? null);
      setAuthorized(true);
    };

    checkSuperadmin();
    return () => {
      cancelled = true;
    };
  }, [router, isMfaSetupRoute]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!authorized) return null;

  // La page mfa-setup gère sa propre mise en page plein écran (carte centrée) —
  // pas besoin du header applicatif tant que le compte n'est pas pleinement actif.
  if (isMfaSetupRoute) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100">
      <header className="flex flex-col gap-3 border-b border-white/10 bg-[#0a0f1c] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-orange-400" />
          <span className="text-sm font-black uppercase tracking-widest text-white">
            Nexa · Superadmin
          </span>
        </div>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  active ? "bg-orange-500/15 text-orange-300" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-4">
          {email && <span className="hidden text-xs font-medium text-slate-400 md:inline">{email}</span>}
          <button
            onClick={handleSignOut}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
