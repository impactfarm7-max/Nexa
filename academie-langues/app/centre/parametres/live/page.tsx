"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { Loader2, CheckCircle2, Video, Bell, PenLine } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

export default function LiveSettingsPage() {
  const { t } = useI18n();
  const options = [
    { value: 15, label: t("centre", "live15MinutesBefore"), desc: t("centre", "liveLastMinuteReminder") },
    { value: 30, label: t("centre", "live30MinutesBefore"), desc: t("centre", "liveTimeToPrepare") },
    { value: 120, label: t("centre", "live2HoursBefore"), desc: t("centre", "liveEarlyReminder") },
  ];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  const [minutes, setMinutes] = useState<number>(120);
  const [isLocked, setIsLocked] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [error, setError] = useState("");
  const [isTCF, setIsTCF] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    setLoading(true);
    const res = await fetch("/api/centre/live-settings", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (res.ok) {
      setMinutes(json.coaching_reminder_minutes ?? 120);
      setIsTCF(json.center_type === "tcf_canada");
      setIsLocked(true);
    } else {
      setError(json.error || t("centre", "liveLoadError"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setToken(session.access_token);
      await load(session.access_token);
    })();
  }, [load]);

  const handleSave = async () => {
    if (!token || isLocked) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/centre/live-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ coaching_reminder_minutes: minutes }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || t("centre", "liveSaveError"));
      return;
    }
    setMinutes(json.coaching_reminder_minutes ?? minutes);
    setIsLocked(true);
    setShowSuccessAnim(true);
    setTimeout(() => setShowSuccessAnim(false), 2200);
  };

  const activeLabel = options.find((o) => o.value === minutes)?.label || t("centre", "liveMinutesBefore", { minutes });

  if (loading) return <CenterPageLoading embedded />;

  return (
    <div className="relative space-y-8">
      {showSuccessAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-3 border border-neutral-200">
            <CheckCircle2 size={60} className="text-emerald-500" />
            <p className="text-lg font-black text-emerald-700">{t("centre", "liveSavedSuccessfully")}</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-black" style={{ color: BLUE }}>{t("centre", "liveTitle")}</h2>
        <p className="text-sm text-neutral-500 mt-1">
          {t("centre", "liveDescription")}
        </p>
        {!isLocked && (
          <p className="text-xs text-neutral-400 mt-2">
            {t("centre", "liveDelayHelp")}
          </p>
        )}
        {isLocked && (
          <p className="text-xs font-bold mt-2" style={{ color: ORANGE }}>
            {t("centre", "liveActiveReminder")} : {activeLabel}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <Bell size={18} style={{ color: ORANGE }} />
            </div>
            <div>
              <p className="font-black text-sm" style={{ color: BLUE }}>{t("centre", "liveReminderDelay")}</p>
              <p className="text-xs text-neutral-500">
                {isLocked ? t("centre", "liveReadOnlyHint") : t("centre", "liveEditModeActive")}
              </p>
            </div>
          </div>
          {isLocked ? (
            <button
              type="button"
              onClick={() => setIsLocked(false)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-neutral-200 text-xs font-black text-neutral-600 hover:border-[#11224E] hover:text-[#11224E] transition"
            >
              <PenLine size={13} /> {t("centre", "liveEdit")}
            </button>
          ) : (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
              {t("centre", "liveEditing")}
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          <p className="text-xs text-neutral-500">
            {t("centre", "liveNotificationHelp")}
          </p>

          <div className="grid gap-3">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isLocked}
                onClick={() => !isLocked && setMinutes(opt.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all disabled:cursor-default ${
                  isLocked ? "opacity-60" : ""
                } ${
                  minutes === opt.value
                    ? "border-orange-400 bg-orange-50"
                    : "border-neutral-200 hover:border-neutral-300 disabled:hover:border-neutral-200"
                }`}
              >
                <p className="font-black text-sm" style={{ color: BLUE }}>{opt.label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          {!isLocked && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-8 h-12 rounded-xl text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 transition hover:opacity-95"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? t("centre", "liveSaving") : t("centre", "liveSave")}
              </button>
            </div>
          )}
        </div>
      </div>

      {isTCF && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
          <Video size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <p className="font-black mb-1">Séances collectives en ligne (TCF)</p>
            <p>
              Les séances planifiées en mode <strong>En ligne</strong> utilisent automatiquement la visio NEXA (LiveKit).
              Les étudiants rejoignent via le lien généré dans les notifications et le forum de classe — pas de Zoom à configurer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
