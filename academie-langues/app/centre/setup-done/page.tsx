"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";

const BLUE  = "#11224E";
const ORANGE = "#eb670e";

export default function SetupDonePage() {
  const router = useRouter();
  const [centerName, setCenterName] = useState("");
  const [centerType, setCenterType] = useState("generic");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.center_id) { router.push("/centre/dashboard"); return; }

      const { data: center } = await supabase
        .from("centers")
        .select("name, center_type")
        .eq("id", profile.center_id)
        .single();

      setCenterName(center?.name || "");
      setCenterType(center?.center_type || "generic");
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: `linear-gradient(160deg, ${BLUE} 0%, #0d1b3e 100%)` }}>
        <Loader2 size={24} className="text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-6"
      style={{ background: `linear-gradient(160deg, ${BLUE} 0%, #0d1b3e 100%)` }}
    >
      <div className="w-full max-w-md space-y-10 text-center">

        {/* Identité */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
            {centerType === "tcf_canada"
              ? "Formation TCF Canada"
              : centerType === "formation_courte"
                ? "Formation courte"
                : "Centre de formation"}
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
            Félicitations,
          </h1>
          <h2 className="text-3xl font-black tracking-tight" style={{ color: ORANGE }}>
            {centerName}
          </h2>
        </div>

        {/* Message */}
        <p className="text-white/50 text-[15px] leading-relaxed font-medium max-w-sm mx-auto">
          Votre espace est configuré. Notre équipe NEXA étudie votre demande d'activation —
          {" "}vous pouvez commencer à explorer votre tableau de bord dès maintenant.
        </p>

        {/* CTA */}
        <div className="pt-2">
          <button
            onClick={() => router.push("/centre/dashboard")}
            className="w-full py-3.5 rounded-xl text-[13px] font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: ORANGE }}
          >
            Entrer dans mon espace
          </button>
        </div>

        <p className="text-[11px] text-white/20">
          Vous recevrez un email dès l'activation de votre compte.
        </p>
      </div>
    </div>
  );
}
