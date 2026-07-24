"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { clearCenterMeCache } from "@/app/utils/center-me-cache";

const BLUE = "#11224E";

/** Redirige directement vers la configuration — la page welcome est supprimée du flux. */
export default function CenterOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, onboarding_step, role")
        .eq("id", session.user.id)
        .single();

      if (!profile?.center_id) { router.replace("/ouvrir-centre"); return; }

      // Seul le PDG configure l'entreprise ; le reste du personnel va au dashboard.
      const isCenterOwner = profile.role === "center_manager" || profile.role === "admin";
      if (!isCenterOwner) {
        if (profile.onboarding_step !== "completed") {
          await supabase.from("profiles")
            .update({ onboarding_step: "completed" })
            .eq("id", session.user.id);
        }
        clearCenterMeCache();
        router.replace("/centre/dashboard");
        return;
      }

      if (profile.onboarding_step === "completed") {
        clearCenterMeCache();
        router.replace("/centre/dashboard");
        return;
      }

      await supabase.from("profiles")
        .update({ onboarding_step: "completed" })
        .eq("id", session.user.id);

      clearCenterMeCache();
      router.replace("/centre/parametres/entreprise?setup=1");
    })();
  }, [router]);

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: `linear-gradient(160deg, ${BLUE} 0%, #0d1b3e 100%)` }}
    >
      <Loader2 size={24} className="text-white/30 animate-spin" />
    </div>
  );
}
