"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles, MessageCircle } from "lucide-react";
import { loadCenterBootstrap } from "@/app/utils/center-me-cache";
import { normalizeCenterType, type CenterTypeCode } from "@/app/data/center-types";
import {
  NEXA_OFFER_KEYS,
  NEXA_OFFERS,
  normalizeNexaOffer,
  type NexaOfferConfig,
  type NexaOfferKey,
} from "@/app/data/nexaOffers";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, ORANGE, CenterPageLayout, CenterPageHeader, CenterPageBody } from "../center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

const OFFER_NAME_KEYS: Record<Exclude<NexaOfferKey, "custom">, string> = {
  decouverte: "offerNameDecouverte",
  croissance: "offerNameCroissance",
  pro: "offerNamePro",
  entreprise: "offerNameEntreprise",
};

const OFFER_TAGLINE_KEYS: Record<Exclude<NexaOfferKey, "custom">, string> = {
  decouverte: "offerTaglineDecouverte",
  croissance: "offerTaglineCroissance",
  pro: "offerTaglinePro",
  entreprise: "offerTaglineEntreprise",
};

const CORE_FEATURE_KEYS = [
  "abonnementsCoreDashboard",
  "abonnementsCorePlanner",
  "abonnementsCoreClasses",
  "abonnementsCoreCourses",
  "abonnementsCoreHomework",
  "abonnementsCoreQuiz",
  "abonnementsCoreTracking",
  "abonnementsCoreCommunity",
  "abonnementsCoreLibrary",
  "abonnementsCoreNotes",
  "abonnementsCoreFinance",
  "abonnementsCoreLive",
  "abonnementsCoreInterfaces",
] as const;

function fmtLimit(value: number | null, unlimited: string): string {
  if (value == null) return unlimited;
  return String(value);
}

function buildOfferFeatures(
  offer: NexaOfferConfig,
  t: (ns: "centre", key: string, values?: Record<string, string | number>) => string,
): string[] {
  const unlimited = t("centre", "abonnementsUnlimited");
  const students =
    offer.maxStudents == null
      ? t("centre", "abonnementsStudentsFrom", { min: offer.minStudents })
      : t("centre", "abonnementsStudentsRange", { min: offer.minStudents, max: offer.maxStudents });

  const whiteLabel =
    offer.whiteLabel === true
      ? t("centre", "abonnementsWhiteLabelYes")
      : offer.whiteLabel === "option"
        ? t("centre", "abonnementsWhiteLabelOption")
        : t("centre", "abonnementsWhiteLabelNo");

  return [
    students,
    t("centre", "abonnementsCampus", { count: fmtLimit(offer.maxCampus, unlimited) }),
    t("centre", "abonnementsStaff", { count: fmtLimit(offer.maxStaffAccounts, unlimited) }),
    t("centre", "abonnementsTutor", { count: fmtLimit(offer.tutorInteractionsPerStudent, unlimited) }),
    t("centre", "abonnementsLive", { count: fmtLimit(offer.liveHoursPerStudent, unlimited) }),
    t("centre", "abonnementsCorrections", { count: fmtLimit(offer.aiCorrectionsPerStudent, unlimited) }),
    t("centre", "abonnementsCourseBuilder", { count: fmtLimit(offer.courseBuilderPerMonth, unlimited) }),
    whiteLabel,
  ];
}

export default function AbonnementsPage() {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState<CenterTypeCode | null>(null);
  const [currentOfferKey, setCurrentOfferKey] = useState<NexaOfferKey | null>(null);

  useEffect(() => {
    (async () => {
      const bootstrap = await loadCenterBootstrap();
      const center = (bootstrap?.me as { center?: { center_type?: string; nexa_offer?: string | null } } | undefined)?.center;
      setCenterType(normalizeCenterType(center?.center_type));
      setCurrentOfferKey(normalizeNexaOffer(center?.nexa_offer));
      setLoading(false);
    })();
  }, []);

  const currentPlanLabel = useMemo(() => {
    if (!currentOfferKey) return t("centre", "abonnementsTrial");
    if (currentOfferKey === "custom") return t("centre", "offerNameCustom");
    return t("centre", OFFER_NAME_KEYS[currentOfferKey]);
  }, [currentOfferKey, t]);

  if (loading) return <CenterPageLoading />;

  const isTCF = centerType === "tcf_canada";

  const contact = () => {
    const msg = encodeURIComponent(t("centre", "abonnementsContactMsg"));
    window.open(`https://wa.me/+237683375069?text=${msg}`, "_blank");
  };

  return (
    <CenterPageLayout header={<CenterPageHeader title={t("centre", "navAbonnements")} />}>
      <CenterPageBody>
        <div className="max-w-5xl mx-auto text-center pt-2 pb-4">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>
            {isTCF ? t("centre", "abonnementsOffersTcf") : t("centre", "abonnementsOffersLibre")}
          </p>
          <p className="text-[13px] mt-1" style={{ color: "rgba(17,34,78,0.55)" }}>
            {t("centre", "abonnementsCurrentPlan")}{" "}
            <span className="font-black" style={{ color: BLUE }}>{currentPlanLabel}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl mx-auto pb-4">
          {NEXA_OFFER_KEYS.map((key) => {
            const offer = NEXA_OFFERS[key];
            const isCurrent = currentOfferKey === key;
            const isRecommended = !currentOfferKey && key === "pro";
            const highlighted = isCurrent || isRecommended;
            const features = buildOfferFeatures(offer, t);
            const price =
              offer.monthlyFeeMax == null && offer.key === "entreprise"
                ? t("centre", "abonnementsPriceQuote")
                : t("centre", "abonnementsPriceFrom", {
                    amount: offer.monthlyFeeMin.toLocaleString(locale === "en" ? "en-US" : "fr-FR"),
                  });

            return (
              <div
                key={key}
                className={`rounded-2xl border p-6 flex flex-col bg-white transition-all ${
                  highlighted ? "border-2 shadow-lg" : "border-black/[0.08]"
                }`}
                style={highlighted ? { borderColor: isCurrent ? BLUE : ORANGE, boxShadow: `0 8px 24px ${isCurrent ? BLUE : ORANGE}22` } : undefined}
              >
                {isCurrent && (
                  <span
                    className="self-start mb-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                    style={{ backgroundColor: BLUE }}
                  >
                    {t("centre", "abonnementsCurrentBadge")}
                  </span>
                )}
                {!isCurrent && isRecommended && (
                  <span
                    className="self-start mb-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <Sparkles size={11} /> {t("centre", "abonnementsRecommended")}
                  </span>
                )}
                <h3 className="text-lg font-black" style={{ color: BLUE }}>
                  {t("centre", OFFER_NAME_KEYS[key])}
                </h3>
                <p className="text-[12px] mt-1 font-medium" style={{ color: "rgba(17,34,78,0.55)" }}>
                  {t("centre", OFFER_TAGLINE_KEYS[key])}
                </p>
                <p className="text-xl font-black mt-3" style={{ color: BLUE }}>{price}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(17,34,78,0.75)" }}>
                      <Check size={15} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-black/[0.06]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                    {t("centre", "abonnementsIncludedTitle")}
                  </p>
                  <ul className="space-y-1.5">
                    {CORE_FEATURE_KEYS.map((keyName) => (
                      <li key={keyName} className="flex items-start gap-2 text-[11px]" style={{ color: "rgba(17,34,78,0.6)" }}>
                        <Check size={12} className="shrink-0 mt-0.5" style={{ color: BLUE }} />
                        {t("centre", keyName)}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={contact}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-colors"
                  style={{ backgroundColor: highlighted ? ORANGE : BLUE }}
                >
                  <MessageCircle size={16} />
                  {t("centre", "abonnementsContact")}
                </button>
              </div>
            );
          })}
        </div>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
