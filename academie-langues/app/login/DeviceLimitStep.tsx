"use client";

import type { useI18n } from "@/app/i18n/I18nProvider";

type TFunc = ReturnType<typeof useI18n>["t"];

type DeviceLimitStepProps = {
  t: TFunc;
  ORANGE: string;
  activeSessions: any[];
  handleForceLogin: (sessionId: string) => void | Promise<void>;
  removingId: string | null;
  onCancel: () => void;
};

export default function DeviceLimitStep({
  t,
  ORANGE,
  activeSessions,
  handleForceLogin,
  removingId,
  onCancel,
}: DeviceLimitStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{t("auth", "loginDeviceLimitTitle")}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {t("auth", "loginDeviceLimitDesc")}
        </p>
      </div>
      {activeSessions.map((session) => (
        <div
          key={session.id}
          className="flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 pr-3">
            <p className="truncate text-xs font-bold text-slate-700">
              {session.device?.substring(0, 50) || t("auth", "loginUnknownDevice")}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {t("auth", "loginLastActivity")} {new Date(session.lastSeen).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => handleForceLogin(session.id)}
            disabled={removingId === session.id}
            className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: ORANGE }}
          >
            {removingId === session.id ? "..." : t("auth", "loginDisconnect")}
          </button>
        </div>
      ))}
      <button
        onClick={onCancel}
        className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
      >
        {t("auth", "loginCancel")}
      </button>
    </div>
  );
}
