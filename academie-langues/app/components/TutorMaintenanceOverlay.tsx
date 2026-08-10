"use client";

import { Lock, Clock, Wrench } from "lucide-react";
import type { TutorLockState } from "@/app/utils/tutor-unlock";
import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

type Props = {
  lock: TutorLockState;
  compact?: boolean;
};

export default function TutorMaintenanceOverlay({ lock, compact = false }: Props) {
  const { t } = useI18n();

  if (!lock.locked) return null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-200">
        <Clock className="h-3 w-3" />
        {t("dashboard", "tutorCountdownDay")}-{lock.daysRemaining}
      </span>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#FFFBF7]/95 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-orange-200 bg-white p-6 md:p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-orange-200 bg-orange-50">
          <Wrench className="h-8 w-8" style={{ color: BRAND.orange }} />
        </div>
        <h2 className={`mt-4 ${STUDENT_TEXT.sectionTitle}`} style={{ color: BRAND.blue }}>
          {t("dashboard", "tutorComingSoonTitle")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          {lock.unlockAt
            ? t("dashboard", "tutorComingSoonDated", { date: lock.unlockDateLabel })
            : t("dashboard", "tutorComingSoonBody")}
        </p>

        {lock.unlockAt && (
          <div
            className="mt-6 grid grid-cols-4 gap-2 rounded-xl border border-orange-100 bg-orange-50/50 p-3"
            aria-live="polite"
          >
            {[
              { value: lock.daysRemaining, label: t("dashboard", "tutorDays") },
              { value: lock.hoursRemaining, label: t("dashboard", "tutorHours") },
              { value: lock.minutesRemaining, label: t("dashboard", "tutorMinutes") },
              { value: lock.secondsRemaining, label: t("dashboard", "tutorSeconds") },
            ].map((unit) => (
              <div key={unit.label} className="rounded-lg bg-white px-2 py-2.5 border border-orange-100">
                <p className="text-xl font-bold tabular-nums" style={{ color: BRAND.blue }}>
                  {String(unit.value).padStart(2, "0")}
                </p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
                  {unit.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5">
          <Lock className="h-4 w-4" style={{ color: BRAND.orange }} />
          <span className="text-xs font-semibold text-orange-700">
            {lock.countdownLabel || t("dashboard", "tutorSoon")}
          </span>
        </div>
      </div>
    </div>
  );
}
