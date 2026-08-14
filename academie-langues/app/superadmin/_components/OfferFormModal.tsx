"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { superadminFetch } from "@/app/utils/superadmin-api-client";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  NEXA_OFFER_KEYS,
  NEXA_OFFERS,
  NEXA_STUDENT_QUOTAS,
  normalizeNexaOffer,
  type NexaOfferKey,
  type NexaStudentQuotas,
} from "@/app/data/nexaOffers";
import {
  TCF_OFFERS,
  TCF_PLAN_KEYS,
  normalizeTcfPlan,
  type TcfPlanKey,
} from "@/app/data/tcfOffers";

type OfferModalCenter = {
  id: string;
  name: string;
  center_type?: string | null;
  nexa_offer?: string | null;
  plan_type?: string | null;
  subscription_amount?: number | null;
  subscription_period_months?: number | null;
  quota_overrides?: Record<string, unknown> | null;
};

type CenterQuotaFields = {
  maxStudents: string;
  maxCampus: string;
  maxStaffAccounts: string;
  tutorInteractionsPerStudent: string;
  liveHoursPerStudent: string;
  aiCorrectionsPerStudent: string;
  courseBuilderPerMonth: string;
  whiteLabel: boolean;
};

type StudentQuotaFields = {
  comprehensionEcrite: string;
  comprehensionOrale: string;
  expressionEcrite: string;
  modesExamensEe: string;
  expressionOrale: string;
  examenBlanc: string;
  modulesCoursQuiz: string;
  devoirsPratiques: string;
  sessionsTuteurIa: string;
};

const CENTER_QUOTA_KEYS = [
  "maxStudents",
  "maxCampus",
  "maxStaffAccounts",
  "tutorInteractionsPerStudent",
  "liveHoursPerStudent",
  "aiCorrectionsPerStudent",
  "courseBuilderPerMonth",
] as const;

const STUDENT_QUOTA_KEYS = [
  "comprehensionEcrite",
  "comprehensionOrale",
  "expressionEcrite",
  "modesExamensEe",
  "expressionOrale",
  "examenBlanc",
  "modulesCoursQuiz",
  "devoirsPratiques",
  "sessionsTuteurIa",
] as const;

function offerI18nKey(key: NexaOfferKey): string {
  switch (key) {
    case "decouverte":
      return "centresOfferDecouverte";
    case "croissance":
      return "centresOfferCroissance";
    case "pro":
      return "centresOfferPro";
    case "entreprise":
      return "centresOfferEntreprise";
    default:
      return "centresOfferCustom";
  }
}

function numOrEmpty(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return String(Math.trunc(Number(value)));
  }
  return "";
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed.replace(/\s/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function defaultCenterQuotas(overrides?: Record<string, unknown> | null): CenterQuotaFields {
  const base = NEXA_OFFERS.entreprise;
  return {
    maxStudents: numOrEmpty(overrides?.maxStudents ?? base.maxStudents),
    maxCampus: numOrEmpty(overrides?.maxCampus ?? base.maxCampus),
    maxStaffAccounts: numOrEmpty(overrides?.maxStaffAccounts ?? base.maxStaffAccounts),
    tutorInteractionsPerStudent: numOrEmpty(
      overrides?.tutorInteractionsPerStudent ?? base.tutorInteractionsPerStudent,
    ),
    liveHoursPerStudent: numOrEmpty(overrides?.liveHoursPerStudent ?? base.liveHoursPerStudent),
    aiCorrectionsPerStudent: numOrEmpty(overrides?.aiCorrectionsPerStudent ?? base.aiCorrectionsPerStudent),
    courseBuilderPerMonth: numOrEmpty(overrides?.courseBuilderPerMonth ?? base.courseBuilderPerMonth),
    whiteLabel: Boolean(overrides?.whiteLabel ?? true),
  };
}

function defaultStudentQuotas(overrides?: Record<string, unknown> | null): StudentQuotaFields {
  const nested =
    overrides?.studentQuotas && typeof overrides.studentQuotas === "object"
      ? (overrides.studentQuotas as Record<string, unknown>)
      : {};
  const base = NEXA_STUDENT_QUOTAS;
  return {
    comprehensionEcrite: numOrEmpty(nested.comprehensionEcrite ?? base.comprehensionEcrite),
    comprehensionOrale: numOrEmpty(nested.comprehensionOrale ?? base.comprehensionOrale),
    expressionEcrite: numOrEmpty(nested.expressionEcrite ?? base.expressionEcrite),
    modesExamensEe: numOrEmpty(nested.modesExamensEe ?? base.modesExamensEe),
    expressionOrale: numOrEmpty(nested.expressionOrale ?? base.expressionOrale),
    examenBlanc: numOrEmpty(nested.examenBlanc ?? base.examenBlanc),
    modulesCoursQuiz: numOrEmpty(nested.modulesCoursQuiz ?? base.modulesCoursQuiz),
    devoirsPratiques: numOrEmpty(nested.devoirsPratiques ?? base.devoirsPratiques),
    sessionsTuteurIa: numOrEmpty(nested.sessionsTuteurIa ?? base.sessionsTuteurIa),
  };
}

function buildQuotaOverrides(
  centerQuotas: CenterQuotaFields,
  studentQuotas: StudentQuotaFields,
  includeStudentQuotas: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    maxStudents: parseOptionalInt(centerQuotas.maxStudents),
    maxCampus: parseOptionalInt(centerQuotas.maxCampus),
    maxStaffAccounts: parseOptionalInt(centerQuotas.maxStaffAccounts),
    tutorInteractionsPerStudent: parseOptionalInt(centerQuotas.tutorInteractionsPerStudent),
    liveHoursPerStudent: parseOptionalInt(centerQuotas.liveHoursPerStudent),
    aiCorrectionsPerStudent: parseOptionalInt(centerQuotas.aiCorrectionsPerStudent),
    courseBuilderPerMonth: parseOptionalInt(centerQuotas.courseBuilderPerMonth),
    whiteLabel: centerQuotas.whiteLabel,
  };

  if (includeStudentQuotas) {
    const student: Partial<NexaStudentQuotas> = {};
    for (const key of STUDENT_QUOTA_KEYS) {
      const n = parseOptionalInt(studentQuotas[key]);
      if (n != null) student[key] = n;
    }
    student.ressources2026 = true;
    out.studentQuotas = student;
  }

  return out;
}

function QuotaInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint || "∞"}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-400"
      />
    </div>
  );
}

export function OfferFormModal({
  center,
  mode,
  onClose,
  onSuccess,
}: {
  center: OfferModalCenter;
  mode: "activate" | "change";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, locale } = useI18n();
  const feedback = useActionFeedback();
  const isTcf = center.center_type === "tcf_canada";
  const initialNexaOffer = normalizeNexaOffer(center.nexa_offer) ?? "decouverte";
  const initialTcfPlan = normalizeTcfPlan(center.plan_type) ?? "pro";
  const [offer, setOffer] = useState<NexaOfferKey>(initialNexaOffer);
  const [tcfPlan, setTcfPlan] = useState<TcfPlanKey>(initialTcfPlan);
  const [amount, setAmount] = useState("");
  const [periodMonths, setPeriodMonths] = useState(String(center.subscription_period_months ?? 1));
  const [centerQuotas, setCenterQuotas] = useState<CenterQuotaFields>(() =>
    defaultCenterQuotas(center.quota_overrides),
  );
  const [studentQuotas, setStudentQuotas] = useState<StudentQuotaFields>(() =>
    defaultStudentQuotas(center.quota_overrides),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isCustom = !isTcf && offer === "custom";
  const en = locale === "en";

  useEffect(() => {
    if (isTcf) {
      setAmount(center.subscription_amount != null ? String(center.subscription_amount) : "");
      return;
    }
    const cfg = offer !== "custom" ? NEXA_OFFERS[offer as Exclude<NexaOfferKey, "custom">] : null;
    if (center.subscription_amount != null && mode === "change" && normalizeNexaOffer(center.nexa_offer) === offer) {
      setAmount(String(center.subscription_amount));
    } else if (cfg) {
      setAmount(String(cfg.monthlyFeeMin));
    } else if (center.subscription_amount != null && offer === "custom") {
      setAmount(String(center.subscription_amount));
    } else {
      setAmount("");
    }

    if (offer === "custom") {
      setCenterQuotas(defaultCenterQuotas(center.quota_overrides));
      setStudentQuotas(defaultStudentQuotas(center.quota_overrides));
    }
  }, [offer, isTcf, center.subscription_amount, center.nexa_offer, center.quota_overrides, mode]);

  const offerLabel = isTcf
    ? (en ? TCF_OFFERS[tcfPlan].nameEn : TCF_OFFERS[tcfPlan].nameFr)
    : t("superadmin", offerI18nKey(offer));
  const period = Math.max(1, parseInt(periodMonths, 10) || 1);
  const parsedAmount = parseInt(amount.replace(/\s/g, ""), 10);
  const amountLabel = Number.isFinite(parsedAmount)
    ? parsedAmount.toLocaleString()
    : t("superadmin", "centresCustomQuoteLabel");

  const centerQuotaLabels = useMemo(
    () =>
      ({
        maxStudents: t("superadmin", "centresQuotaMaxStudents"),
        maxCampus: t("superadmin", "centresQuotaCampus"),
        maxStaffAccounts: t("superadmin", "centresQuotaStaff"),
        tutorInteractionsPerStudent: t("superadmin", "centresQuotaTutor"),
        liveHoursPerStudent: t("superadmin", "centresQuotaLive"),
        aiCorrectionsPerStudent: t("superadmin", "centresQuotaAi"),
        courseBuilderPerMonth: t("superadmin", "centresQuotaCourseBuilder"),
      }) as Record<(typeof CENTER_QUOTA_KEYS)[number], string>,
    [t],
  );

  const studentQuotaLabels = useMemo(
    () =>
      ({
        comprehensionEcrite: t("superadmin", "centresQuotaCe"),
        comprehensionOrale: t("superadmin", "centresQuotaCo"),
        expressionEcrite: t("superadmin", "centresQuotaEe"),
        modesExamensEe: t("superadmin", "centresQuotaExamEe"),
        expressionOrale: t("superadmin", "centresQuotaEo"),
        examenBlanc: t("superadmin", "centresQuotaBlanc"),
        modulesCoursQuiz: t("superadmin", "centresQuotaModules"),
        devoirsPratiques: t("superadmin", "centresQuotaDevoirs"),
        sessionsTuteurIa: t("superadmin", "centresQuotaTutorIa"),
      }) as Record<(typeof STUDENT_QUOTA_KEYS)[number], string>,
    [t],
  );

  const execute = async () => {
    setConfirmOpen(false);
    const body: Record<string, unknown> = {
      subscription_period_months: period,
    };
    if (isTcf) {
      body.plan_type = tcfPlan;
      body.nexa_offer = null;
    } else {
      body.nexa_offer = offer;
    }
    if (Number.isFinite(parsedAmount)) body.subscription_amount = parsedAmount;
    if (isCustom) {
      body.quota_overrides = buildQuotaOverrides(centerQuotas, studentQuotas, isTcf);
    } else if (mode === "change" && !isTcf) {
      body.quota_overrides = null;
    }

    const result = await feedback.run(
      async () => {
        if (mode === "activate") {
          await superadminFetch(`/api/superadmin/centers/${center.id}/activate`, {
            method: "POST",
            body: JSON.stringify(body),
          });
        } else {
          await superadminFetch(`/api/superadmin/centers/${center.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        }
        onSuccess();
      },
      {
        successTitle: t(
          "superadmin",
          mode === "activate" ? "centresActivateSuccess" : "centresChangeOfferSuccess",
        ),
        successMessage: t(
          "superadmin",
          mode === "activate" ? "centresActivateSuccessMsg" : "centresChangeOfferSuccessMsg",
          { name: center.name, offer: offerLabel },
        ),
        errorTitle: t("superadmin", "requestsActionImpossible"),
      },
    );
    if (result.ok) onClose();
  };

  const selectableKeys: NexaOfferKey[] = [...NEXA_OFFER_KEYS, "custom"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <div
        className={`custom-scrollbar w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1c] p-6 shadow-2xl ${
          isCustom ? "max-h-[92vh] max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/80">
              {mode === "activate"
                ? t("superadmin", "centresModalActivateTitle")
                : t("superadmin", "centresModalChangeOfferTitle")}
            </p>
            <h2 className="mt-1 text-lg font-black text-white">{center.name}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {isTcf
                ? t("superadmin", "centresTcfOfferHint")
                : t("superadmin", "centresOfferSelectHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {isTcf
            ? TCF_PLAN_KEYS.map((key) => {
                const cfg = TCF_OFFERS[key];
                const selected = tcfPlan === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTcfPlan(key)}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-orange-500/60 bg-orange-500/15 ring-1 ring-orange-500/40"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <p className={`text-xs font-black uppercase tracking-wide ${selected ? "text-orange-300" : "text-white"}`}>
                      {en ? cfg.nameEn : cfg.nameFr}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {en ? cfg.priceEn : cfg.priceFr}
                    </p>
                  </button>
                );
              })
            : selectableKeys.map((key) => {
            const cfg = key !== "custom" ? NEXA_OFFERS[key] : null;
            const selected = offer === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setOffer(key)}
                className={`rounded-2xl border p-3 text-left transition-colors ${
                  selected
                    ? "border-orange-500/60 bg-orange-500/15 ring-1 ring-orange-500/40"
                    : "border-white/10 bg-black/20 hover:border-white/20"
                }`}
              >
                <p className={`text-xs font-black uppercase tracking-wide ${selected ? "text-orange-300" : "text-white"}`}>
                  {t("superadmin", offerI18nKey(key))}
                </p>
                {cfg ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    {cfg.maxStudents == null
                      ? t("superadmin", "centresOfferStudentsUnlimited")
                      : t("superadmin", "centresOfferStudentsUpTo", { count: String(cfg.maxStudents) })}
                    · {cfg.monthlyFeeMin.toLocaleString()} FCFA
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-500">{t("superadmin", "centresCustomHint")}</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "centresModalAmountLabel")}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
              placeholder="FCFA"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {t("superadmin", "centresModalPeriodLabel")}
            </label>
            <input
              type="number"
              min={1}
              value={periodMonths}
              onChange={(e) => setPeriodMonths(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
        </div>

        {isCustom && (
          <div className="mt-5 space-y-5 rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/90">
                {t("superadmin", "centresCustomCenterQuotas")}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{t("superadmin", "centresCustomUnlimitedHint")}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CENTER_QUOTA_KEYS.map((key) => (
                  <QuotaInput
                    key={key}
                    label={centerQuotaLabels[key]}
                    value={centerQuotas[key]}
                    onChange={(v) => setCenterQuotas((prev) => ({ ...prev, [key]: v }))}
                  />
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={centerQuotas.whiteLabel}
                  onChange={(e) => setCenterQuotas((prev) => ({ ...prev, whiteLabel: e.target.checked }))}
                  className="rounded border-white/20 bg-black/30 text-orange-500 focus:ring-orange-500"
                />
                {t("superadmin", "centresQuotaWhiteLabel")}
              </label>
            </div>

            {isTcf ? (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/90">
                  {t("superadmin", "centresCustomStudentQuotas")}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{t("superadmin", "centresCustomStudentQuotasHint")}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {STUDENT_QUOTA_KEYS.map((key) => (
                    <QuotaInput
                      key={key}
                      label={studentQuotaLabels[key]}
                      value={studentQuotas[key]}
                      onChange={(v) => setStudentQuotas((prev) => ({ ...prev, [key]: v }))}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">{t("superadmin", "centresCustomNativeNote")}</p>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
          >
            {t("superadmin", "centresConfirmCancel")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white hover:opacity-90"
          >
            {mode === "activate"
              ? t("superadmin", "centresActionActivate")
              : t("superadmin", "centresModalConfirmChange")}
          </button>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title={
            mode === "activate"
              ? t("superadmin", "centresConfirmActivateTitle")
              : t("superadmin", "centresModalChangeOfferTitle")
          }
          message={t(
            "superadmin",
            mode === "activate" ? "centresConfirmActivateMessage" : "centresConfirmChangeOfferMessage",
            { name: center.name, offer: offerLabel, amount: amountLabel, period: String(period) },
          )}
          confirmLabel={
            mode === "activate"
              ? t("superadmin", "centresActionActivate")
              : t("superadmin", "centresModalConfirmChange")
          }
          cancelLabel={t("superadmin", "centresConfirmCancel")}
          variant="primary"
          onConfirm={() => void execute()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
