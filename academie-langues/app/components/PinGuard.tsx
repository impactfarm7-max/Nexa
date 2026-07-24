"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { loadStudentAccess, clearStudentAccessCache } from "@/app/utils/student-access-cache";
import { Lock, LogOut } from "lucide-react";

export default function PinGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [pinInput, setPinInput] = useState("");
  const [errorText, setErrorText] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      const access = await loadStudentAccess();

      if (!access?.session) {
        router.replace("/login");
        return;
      }

      const { session, profile } = access;
      setSession(session);

      // 1. Vérification de la règle des 10 jours
      const lastActive = localStorage.getItem("last_active_date");
      const now = new Date().getTime();
      
      if (lastActive) {
        const daysSinceLastActive = (now - new Date(lastActive).getTime()) / (1000 * 3600 * 24);
        if (daysSinceLastActive > 10) {
          clearStudentAccessCache();
          await supabase.auth.signOut();
          localStorage.removeItem("last_active_date");
          localStorage.removeItem("session_token");
          sessionStorage.removeItem("is_unlocked");
          router.replace("/login");
          return;
        }
      }

      // 2. L'application est-elle déjà déverrouillée pour cette session ?
      const unlocked = sessionStorage.getItem("is_unlocked");
      if (unlocked === "true") {
        setIsUnlocked(true);
        setIsLoading(false);
        return;
      }

      // 3. Profil partagé (cache) pour le PIN et le prénom
      if (profile) {
        setUserProfile(profile);
      }

      // 4. Si aucun PIN défini → forcer la création avant d'accéder à l'app
      if (!profile?.pin_hash) {
        router.replace("/pin/setup");
        return;
      }

      setIsLoading(false);
    };

    checkSecurity();
  }, [router]);

  // 🆕 REALTIME + AGGRESSIVE PERIODIC VALIDATION : Instant logout guarantee
  useEffect(() => {
    if (!session) return;

    const token = localStorage.getItem("session_token");
    if (!token) return;

    const handleLogout = async () => {
      clearStudentAccessCache();
      await supabase.auth.signOut();
      localStorage.removeItem("session_token");
      localStorage.removeItem("last_active_date");
      sessionStorage.removeItem("is_unlocked");
      router.replace("/login");
    };

    let logoutTriggered = false;

    // ✅ MECHANISM 1: Real-time listener (instant if REPLICA IDENTITY FULL enabled)
    const channel = supabase
      .channel(`session-watch-${token}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "user_sessions",
        },
        async (payload: any) => {
          if (logoutTriggered) return;
          // Verify that's OUR token which was deleted
          const deletedToken = payload.old?.token;
          if (deletedToken === token) {
            logoutTriggered = true;
            handleLogout();
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("⚠️ Realtime subscription failed for session watch - relying on periodic validation");
        }
      });

    // ✅ MECHANISM 2: AGGRESSIVE Periodic validation (every 1 second = instant logout)
    // Fallback if realtime doesn't work
    const validationInterval = setInterval(async () => {
      if (logoutTriggered) return;

      try {
        const { data: sessionExists } = await supabase
          .from("user_sessions")
          .select("id")
          .eq("token", token)
          .single();

        if (!sessionExists) {
          // Session was deleted → immediate logout
          logoutTriggered = true;
          clearInterval(validationInterval);
          handleLogout();
        }
      } catch (error) {
        // .single() throws if no row found, which is what we want
        if (!logoutTriggered) {
          logoutTriggered = true;
          clearInterval(validationInterval);
          handleLogout();
        }
      }
    }, 1000); // ✅ Every 1 second for INSTANT logout

    return () => {
      clearInterval(validationInterval);
      supabase.removeChannel(channel);
    };
  }, [session, router]);

  // Fonction quand l'étudiant tape son PIN
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    // Vérification du lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000 / 60);
      setErrorText(`Trop de tentatives. Réessayez dans ${remaining} min.`);
      setPinInput("");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/pin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();

      if (data.valid) {
        // ✅ Bon PIN — réinitialiser les tentatives
        setAttempts(0);
        setLockedUntil(null);
        sessionStorage.setItem("is_unlocked", "true");
        localStorage.setItem("last_active_date", new Date().toISOString());
        setIsUnlocked(true);
      } else {
        // ❌ Mauvais PIN
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPinInput("");

        if (newAttempts >= 3) {
          const until = Date.now() + 5 * 60 * 1000; // 5 minutes
          setLockedUntil(until);
          setAttempts(0);
          setErrorText("Compte verrouillé 5 min après 3 tentatives incorrectes.");
        } else {
          setErrorText(`Code PIN incorrect. ${3 - newAttempts} tentative(s) restante(s).`);
        }
      }
    } catch {
      setErrorText("Erreur réseau. Réessayez.");
      setPinInput("");
    } finally {
      setIsVerifying(false);
    }
  };

  const forceLogout = async () => {
    clearStudentAccessCache();
    await supabase.auth.signOut();
    localStorage.removeItem("last_active_date");
    localStorage.removeItem("session_token");
    sessionStorage.removeItem("is_unlocked");
    router.replace("/login");
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Si c'est verrouillé, on affiche le magnifique écran de verrouillage
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
        
        {/* Décoration sombre */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-xs text-center">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          
          <h1 className="text-2xl font-black mb-1">Rebonjour, {userProfile?.prenom || "Étudiant"}</h1>
          <p className="text-sm text-slate-400 font-medium mb-8">Entrez votre code PIN pour accéder à l'Académie.</p>

          <form onSubmit={handlePinSubmit} className="space-y-6">
            <input
              autoFocus
              required
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="• • • •"
              className={`w-full h-16 bg-slate-900 border ${errorText ? 'border-red-500' : 'border-slate-800'} rounded-2xl outline-none focus:border-orange-500 font-black text-center text-3xl tracking-[0.5em] text-white shadow-inner transition-colors`}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, ""));
                setErrorText("");
              }}
            />

            {errorText && <p className="text-red-400 text-xs font-bold animate-pulse">{errorText}</p>}

            <button
              disabled={pinInput.length !== 4 || isVerifying || (lockedUntil !== null && Date.now() < lockedUntil)}
              className="w-full h-14 rounded-2xl bg-orange-600 text-white font-bold tracking-widest uppercase text-xs hover:bg-orange-500 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-orange-500/20"
            >
              {isVerifying ? "Vérification..." : "Déverrouiller"}
            </button>
          </form>

          <button onClick={forceLogout} className="mt-8 flex items-center justify-center gap-2 text-[10px] uppercase font-bold text-slate-500 hover:text-slate-300 transition-colors mx-auto tracking-widest">
            <LogOut size={14} /> Se connecter avec un autre compte
          </button>
        </div>
      </div>
    );
  }

  // Si tout est bon et déverrouillé, on affiche le contenu de l'application !
  return <>{children}</>;
}