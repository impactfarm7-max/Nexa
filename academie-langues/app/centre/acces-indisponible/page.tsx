"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShieldOff, MessageCircle, GraduationCap, LogOut } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { isCenterOperational } from "@/app/utils/center-trial";
import { useI18n } from "@/app/i18n/I18nProvider";

type Reason = "checking" | "trial_expired" | "suspended" | "rejected" | "unknown";

export default function CenterAccessUnavailablePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [reason, setReason] = useState<Reason>("checking");
  const [centerName, setCenterName] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/center/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
      const json = await res?.json().catch(() => null);
      const center = json?.center as { name?: string; status?: string; created_at?: string } | undefined;

      if (!center) {
        setReason("unknown");
        return;
      }
      if (isCenterOperational(center)) {
        // La situation a ete regularisee entre-temps (ex. activation superadmin) : on repart.
        router.replace("/centre/dashboard");
        return;
      }

      setCenterName(center.name || null);
      if (center.status === "rejected") setReason("rejected");
      else if (center.status === "suspended") setReason("suspended");
      else setReason("trial_expired");
    };

    check();
  }, [router]);

  const handleContact = () => {
    const msg = encodeURIComponent(
      centerName
        ? t("centre", "accessContactNamed", { name: centerName })
        : t("centre", "accessContactGeneric")
    );
    window.open(`https://wa.me/+237683375069?text=${msg}`, "_blank");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (reason === "checking") return null;

  const copy = {
    trial_expired: {
      title: t("centre", "accessTrialExpiredTitle"),
      icon: <Clock className="w-8 h-8 text-amber-400" />,
      tone: "bg-amber-500/20 border-amber-500/30",
      lead: centerName ? t("centre", "accessTrialExpiredNamed", { name: centerName }) : t("centre", "accessTrialExpiredGeneric"),
      detail: t("centre", "accessTrialExpiredDetail"),
    },
    suspended: {
      title: t("centre", "accessSuspendedTitle"),
      icon: <ShieldOff className="w-8 h-8 text-red-400" />,
      tone: "bg-red-500/20 border-red-500/30",
      lead: centerName ? t("centre", "accessSuspendedNamed", { name: centerName }) : t("centre", "accessSuspendedGeneric"),
      detail: t("centre", "accessSuspendedDetail"),
    },
    rejected: {
      title: t("centre", "accessRejectedTitle"),
      icon: <ShieldOff className="w-8 h-8 text-red-400" />,
      tone: "bg-red-500/20 border-red-500/30",
      lead: centerName ? t("centre", "accessRejectedNamed", { name: centerName }) : t("centre", "accessRejectedGeneric"),
      detail: t("centre", "accessRejectedDetail"),
    },
    unknown: {
      title: t("centre", "accessUnavailableTitle"),
      icon: <ShieldOff className="w-8 h-8 text-red-400" />,
      tone: "bg-red-500/20 border-red-500/30",
      lead: t("centre", "accessUnavailableLead"),
      detail: t("centre", "accessUnavailableDetail"),
    },
  }[reason];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/8 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/5 blur-[100px] rounded-full -ml-24 -mb-24 pointer-events-none" />

      <div className="flex items-center gap-2 mb-10 z-10">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-black text-lg tracking-tight">NEXA</span>
      </div>

      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm z-10">
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-5 ${copy.tone}`}>
          {copy.icon}
        </div>

        <h1 className="text-2xl font-black text-white mb-3">{copy.title}</h1>

        <p className="text-neutral-400 text-sm leading-relaxed mb-4">{copy.lead}</p>
        <p className="text-neutral-500 text-sm leading-relaxed mb-8">{copy.detail}</p>

        <button
          onClick={handleContact}
          className="w-full flex items-center justify-center gap-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 mb-3"
        >
          <MessageCircle className="w-5 h-5" />
          {t("centre", "accessContactButton")}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t("centre", "accessSignOut")}
        </button>
      </div>
    </div>
  );
}
