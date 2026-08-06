"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { resolvePostLoginPath } from "@/app/utils/student-routes";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function PinSetupPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prenom, setPrenom] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      setSessionToken(session.access_token);

      const { data: profile } = await supabase
        .from("profiles")
        .select("prenom, pin_hash, center_id, role, center_status, tag_status")
        .eq("id", session.user.id)
        .single();

      if (profile?.pin_hash) {
        const isPending =
          profile.center_status === "pending_center_approval" ||
          profile.tag_status === "pending_center_approval";
        if (isPending) {
          await supabase.auth.signOut();
          sessionStorage.clear();
          localStorage.removeItem("session_token");
          router.replace("/login?reason=pending_validation");
          return;
        }
        // PIN déjà défini → accès normal
        sessionStorage.setItem("is_unlocked", "true");
        router.replace(resolvePostLoginPath(profile));
        return;
      }

      setPrenom(profile?.prenom || "");
    };
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!/^\d{4}$/.test(pin)) {
      setErr(t("auth", "pinSetupCodeMustBe4Digits"));
      return;
    }
    if (pin !== confirm) {
      setErr(t("auth", "pinSetupCodesDontMatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/pin/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || t("auth", "pinSetupSaveError"));
        return;
      }

      sessionStorage.setItem("is_unlocked", "true");
      localStorage.setItem("last_active_date", new Date().toISOString());
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id, role, center_status, tag_status")
        .eq("id", user?.id)
        .single();
      const isPending =
        profile?.center_status === "pending_center_approval" ||
        profile?.tag_status === "pending_center_approval";
      if (isPending) {
        await supabase.auth.signOut();
        sessionStorage.clear();
        localStorage.removeItem("session_token");
        router.replace("/login?reason=pending_validation");
        return;
      }
      router.replace(resolvePostLoginPath(profile));
    } catch {
      setErr(t("auth", "pinSetupNetworkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden font-sans">

      {/* SECTION GAUCHE */}
      <section className="hidden lg:flex lg:w-1/2 bg-slate-950 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-600/10 via-transparent to-transparent" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-md">
          <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-center mb-10">
            <ShieldCheck className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-6">
            {t("auth", "pinSetupHeroTitlePart1")} <span className="text-orange-500">{t("auth", "pinSetupHeroTitlePart2")}</span>
          </h2>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            {t("auth", "pinSetupHeroDescription")}
          </p>
          <ul className="mt-8 space-y-3">
            {[t("auth", "pinSetupFeature1"), t("auth", "pinSetupFeature2"), t("auth", "pinSetupFeature3")].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SECTION DROITE */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">

          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 rounded-[1.5rem] bg-orange-50 border border-orange-100 flex items-center justify-center mb-5">
              <KeyRound className="w-8 h-8 text-orange-600 stroke-[1.8]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              {prenom ? `${t("auth", "pinSetupWelcome")}, ${prenom} !` : t("auth", "pinSetupWelcomeNoName")}
            </h1>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              {t("auth", "pinSetupSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">
                {t("auth", "pinSetupChooseLabel")}
              </label>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={4}
                placeholder="• • • •"
                className={`w-full h-16 bg-slate-50 border rounded-2xl px-4 outline-none font-black text-center text-3xl tracking-[0.5em] transition-all shadow-inner ${
                  err ? "border-red-300 bg-red-50 text-red-600" : "border-slate-100 focus:border-orange-500 text-slate-900"
                }`}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(null); }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">
                {t("auth", "pinSetupConfirmLabel")}
              </label>
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder="• • • •"
                className={`w-full h-16 bg-slate-50 border rounded-2xl px-4 outline-none font-black text-center text-3xl tracking-[0.5em] transition-all shadow-inner ${
                  err ? "border-red-300 bg-red-50 text-red-600" : "border-slate-100 focus:border-orange-500 text-slate-900"
                }`}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "")); setErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(e as any); }}
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 4 || confirm.length !== 4}
              className="w-full h-14 rounded-2xl bg-slate-950 text-white font-black uppercase tracking-widest text-sm hover:bg-orange-600 transition-all disabled:opacity-40 active:scale-95 shadow-xl mt-4"
            >
              {loading ? t("auth", "pinSetupSaving") : t("auth", "pinSetupSubmit")}
            </button>
          </form>

          <p className="mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center opacity-50">
            {t("auth", "pinSetupFooter")}
          </p>
        </div>
      </section>
    </div>
  );
}
