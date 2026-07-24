"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Override le bg-neutral-50 du body global
    document.body.style.backgroundColor = "#0a0f1a";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Pas connecté → login
      if (!session) {
        router.replace("/login");
        return;
      }

      // Vérifier le rôle
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      // Pas admin → dashboard
      if (!profile || profile.role !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setAuthorized(true);
    };

    checkAdmin();
  }, [router]);

  // Pendant la vérification → écran vide
  if (!authorized) return null;

  return <>{children}</>;
}