"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, MessageCircle, GraduationCap, LogOut } from "lucide-react";
import { supabase } from "@/app/utils/supabase";

const NEXA_WHATSAPP = "+237683375069";

function normalizeWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits.replace(/\D/g, "");
  const raw = digits.replace(/\D/g, "");
  if (raw.startsWith("00")) return raw.slice(2);
  return raw;
}

export default function RevoquePage() {
  const router = useRouter();
  const [centerName, setCenterName] = useState<string | null>(null);
  const [centerPhone, setCenterPhone] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile?.center_id) {
        const { data: center } = await supabase
          .from("centers")
          .select("name, phone")
          .eq("id", profile.center_id)
          .maybeSingle();
        setCenterName(center?.name?.trim() || null);
        setCenterPhone(center?.phone?.trim() || null);
      }

      setReady(true);
    };

    void check();
  }, [router]);

  const displayName = centerName || "NEXA";

  const handleContact = () => {
    const wa = normalizeWhatsApp(centerPhone) || normalizeWhatsApp(NEXA_WHATSAPP);
    const msg = encodeURIComponent(
      centerName
        ? `Bonjour ${centerName}, mon accès à la plateforme a été révoqué. Je souhaite régulariser ma situation. Pouvez-vous m'aider ?`
        : "Bonjour NEXA, mon accès à la plateforme a été révoqué. Je souhaite régulariser ma situation. Pouvez-vous m'aider ?",
    );
    window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/8 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 blur-[100px] rounded-full -ml-24 -mb-24 pointer-events-none" />

      <div className="flex items-center gap-2 mb-10 z-10 max-w-md px-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-black text-lg tracking-tight truncate">{displayName}</span>
      </div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm z-10">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-black text-white mb-3">Accès révoqué</h1>
        <p className="text-neutral-400 text-sm leading-relaxed mb-2">
          Ton accès à la plateforme a été révoqué
          {centerName ? " par ton centre." : " par l'administration."}
        </p>
        {centerName ? (
          <p className="text-white font-black text-base mb-4 break-words">{centerName}</p>
        ) : null}
        <p className="text-neutral-500 text-sm leading-relaxed mb-2">
          Si tu penses qu&apos;il s&apos;agit d&apos;une erreur ou si tu souhaites régulariser ta situation,
          contacte directement :
        </p>
        <p className="text-white font-black text-base mb-8 break-words">{displayName}</p>

        <button
          onClick={handleContact}
          className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 mb-3"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span className="truncate">Contacter {displayName}</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
