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
import {
  TCF_OFFERS,
  TCF_PLAN_KEYS,
  normalizeTcfPlan,
  type TcfPlanKey,
} from "@/app/data/tcfOffers";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, ORANGE, CenterPageLayout, CenterPageHeader, CenterPageBody } from "../center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

function offerDisplayName(key: Exclude<NexaOfferKey, "custom">, t: ReturnType<typeof useI18n>["t"]): string {
  switch (key) {
    case "decouverte":
      return t("centre", "offerNameDecouverte");
    case "croissance":
      return t("centre", "offerNameCroissance");
    case "pro":
      return t("centre", "offerNamePro");
    case "entreprise":
      return t("centre", "offerNameEntreprise");
  }
}

function offerDisplayTagline(key: Exclude<NexaOfferKey, "custom">, t: ReturnType<typeof useI18n>["t"]): string {
  switch (key) {
    case "decouverte":
      return t("centre", "offerTaglineDecouverte");
    case "croissance":
      return t("centre", "offerTaglineCroissance");
    case "pro":
      return t("centre", "offerTaglinePro");
    case "entreprise":
      return t("centre", "offerTaglineEntreprise");
  }
}

function tcfStudentsLabel(
  offer: { minStudents: number; maxStudents: number | null },
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (offer.maxStudents == null) return t("centre", "abonnementsStudentsFrom", { min: offer.minStudents });
  return offer.minStudents > 1
    ? t("centre", "abonnementsStudentsRange", { min: offer.minStudents, max: offer.maxStudents })
    : t("centre", "abonnementsStudentsUpTo", { max: offer.maxStudents });
}

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

const TCF_CORE_FEATURE_KEYS = [
  "abonnementsTcfCoreDashboard",
  "abonnementsTcfCoreProgram",
  "abonnementsTcfCoreCompEcrite",
  "abonnementsTcfCoreCompOrale",
  "abonnementsTcfCoreExpEcrite",
  "abonnementsTcfCoreExpOrale",
  "abonnementsTcfCoreExamBlanc",
  "abonnementsTcfCoreSimulateurs",
  "abonnementsTcfCoreCours",
  "abonnementsTcfCoreDevoirs",
  "abonnementsTcfCoreQuiz",
  "abonnementsTcfCoreTuteur",
  "abonnementsTcfCoreLive",
  "abonnementsTcfCoreBibliotheque",
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
    offer.maxCampus === 1
      ? t("centre", "abonnementsCampusOne")
      : t("centre", "abonnementsCampus", { count: fmtLimit(offer.maxCampus, unlimited) }),
    t("centre", "abonnementsStaffUnlimited"),
    t("centre", "abonnementsTutor", { count: fmtLimit(offer.tutorInteractionsPerStudent, unlimited) }),
    t("centre", "abonnementsLive", { count: fmtLimit(offer.liveHoursPerStudent, unlimited) }),
    t("centre", "abonnementsCorrections", { count: fmtLimit(offer.aiCorrectionsPerStudent, unlimited) }),
    t("centre", "abonnementsCourseBuilder", { count: fmtLimit(offer.courseBuilderPerMonth, unlimited) }),
    whiteLabel,
  ];
}

export default function AbonnementsPage() {
  const { t, locale } = useI18n();
  const en = locale === "en";
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState<CenterTypeCode | null>(null);
  const [currentOfferKey, setCurrentOfferKey] = useState<NexaOfferKey | null>(null);
  const [currentTcfPlan, setCurrentTcfPlan] = useState<TcfPlanKey | null>(null);

  useEffect(() => {
    (async () => {
      const bootstrap = await loadCenterBootstrap();
      const center = (
        bootstrap?.me as {
          center?: {
            center_type?: string;
            nexa_offer?: string | null;
            plan_type?: string | null;
          };
        } | undefined
      )?.center;
      const type = normalizeCenterType(center?.center_type);
      setCenterType(type);
      if (type === "tcf_canada") {
        setCurrentTcfPlan(normalizeTcfPlan(center?.plan_type));
        setCurrentOfferKey(null);
      } else {
        setCurrentOfferKey(normalizeNexaOffer(center?.nexa_offer));
        setCurrentTcfPlan(null);
      }
      setLoading(false);
    })();
  }, []);

  const currentPlanLabel = useMemo(() => {
    if (centerType === "tcf_canada") {
      if (!currentTcfPlan) return t("centre", "abonnementsTrial");
      return en ? TCF_OFFERS[currentTcfPlan].nameEn : TCF_OFFERS[currentTcfPlan].nameFr;
    }
    if (!currentOfferKey) return t("centre", "abonnementsTrial");
    if (currentOfferKey === "custom") return t("centre", "offerNameCustom");
    return offerDisplayName(currentOfferKey, t);
  }, [centerType, currentOfferKey, currentTcfPlan, en, t]);

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

        {isTCF ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl mx-auto pb-8">
            {TCF_PLAN_KEYS.map((key) => {
              const offer = TCF_OFFERS[key];
              const isCurrent = currentTcfPlan === key;
              const isMostChosen = key === "advance";
              const features = en ? offer.featuresEn : offer.featuresFr;
              const name = en ? offer.nameEn : offer.nameFr;
              const tagline = en ? offer.taglineEn : offer.taglineFr;
              const price = en ? offer.priceEn : offer.priceFr;
              const isQuote = offer.pricePerUser == null;
              const perUserLabel = offer.pricePerUser != null
                ? offer.pricePerUser.toLocaleString(en ? "en-US" : "fr-FR")
                : null;
              const entryPriceLabel = offer.entryPrice != null
                ? offer.entryPrice.toLocaleString(en ? "en-US" : "fr-FR")
                : null;

              return (
                <div
                  key={key}
                  className="group relative rounded-2xl border-2 p-6 flex flex-col bg-white shadow-lg transition-all duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:shadow-[0_16px_40px_-12px_rgba(235,103,14,0.28)]"
                  style={{
                    borderColor: isCurrent ? BLUE : ORANGE,
                    boxShadow: `0 8px 24px ${(isCurrent ? BLUE : ORANGE)}22`,
                  }}
                >
                  <div className="mb-3 flex min-h-[26px] flex-wrap gap-2">
                    {isCurrent && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                        style={{ backgroundColor: BLUE }}
                      >
                        {t("centre", "abonnementsCurrentBadge")}
                      </span>
                    )}
                    {isMostChosen && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white"
                        style={{ backgroundColor: ORANGE }}
                      >
                        <Sparkles size={11} /> {t("centre", "abonnementsMostChosen")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black transition-colors duration-300 group-hover:text-[#eb670e]" style={{ color: BLUE }}>{name}</h3>
                  <p className="text-[12px] mt-1 font-medium" style={{ color: "rgba(17,34,78,0.55)" }}>
                    {tagline}
                  </p>
                  {isQuote ? (
                    <p className="mt-4 whitespace-nowrap text-[clamp(1.15rem,1.45vw,1.5rem)] font-black leading-none" style={{ color: BLUE }}>
                      {price}
                    </p>
                  ) : (
                    <div className="mt-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.45)" }}>
                        {t("centre", "abonnementsPricePerUserLabel")}
                      </p>
                      <p className="mt-0.5 text-2xl font-black leading-none tabular-nums transition-transform duration-300 group-hover:scale-[1.03] origin-left" style={{ color: BLUE }}>
                        {perUserLabel}
                      </p>
                      <p className="mt-1 text-xs font-bold" style={{ color: "rgba(17,34,78,0.55)" }}>
                        {t("centre", "abonnementsPricePerUser")}
                      </p>
                    </div>
                  )}
                  {entryPriceLabel && (
                    <p className="mt-1.5 whitespace-nowrap text-[11px] font-bold tabular-nums" style={{ color: "rgba(17,34,78,0.55)" }}>
                      {t("centre", "abonnementsPriceFrom")} {entryPriceLabel} {t("centre", "abonnementsPricePerMonth")}
                    </p>
                  )}
                  <p className="mt-3 text-xs font-bold" style={{ color: "rgba(17,34,78,0.55)" }}>
                    {tcfStudentsLabel(offer, t)}
                  </p>
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
                      {TCF_CORE_FEATURE_KEYS.map((keyName) => (
                        <li key={keyName} className="flex items-start gap-2 text-[11px]" style={{ color: "rgba(17,34,78,0.6)" }}>
                          <Check size={12} className="shrink-0 mt-0.5" style={{ color: BLUE }} />
                          {t("centre", keyName)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={contact}
                    className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all duration-300 group-hover:brightness-110 group-hover:scale-[1.02]"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <MessageCircle size={16} />
                    {t("centre", "abonnementsContact")}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl mx-auto pb-4">
            {NEXA_OFFER_KEYS.map((key) => {
              const offer = NEXA_OFFERS[key];
              const isCurrent = currentOfferKey === key;
              const isMostChosen = key === "croissance";
              const features = buildOfferFeatures(offer, t);
              const isQuote = offer.pricePerUser == null;
              const perUserLabel = offer.pricePerUser != null
                ? offer.pricePerUser.toLocaleString(en ? "en-US" : "fr-FR")
                : null;
              const entryPriceLabel = offer.entryPrice != null
                ? offer.entryPrice.toLocaleString(en ? "en-US" : "fr-FR")
                : null;

              return (
                <div
                  key={key}
                  className="group relative rounded-2xl border-2 p-6 flex flex-col bg-white shadow-lg transition-all duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:shadow-[0_16px_40px_-12px_rgba(235,103,14,0.28)]"
                  style={{
                    borderColor: ORANGE,
                    boxShadow: `0 8px 24px ${ORANGE}22`,
                  }}
                >
                  <div className="mb-3 flex min-h-[26px] flex-wrap gap-2">
                    {isCurrent && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                        style={{ backgroundColor: BLUE }}
                      >
                        {t("centre", "abonnementsCurrentBadge")}
                      </span>
                    )}
                    {isMostChosen && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white"
                        style={{ backgroundColor: ORANGE }}
                      >
                        <Sparkles size={11} /> {t("centre", "abonnementsMostChosen")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black transition-colors duration-300 group-hover:text-[#eb670e]" style={{ color: BLUE }}>
                    {offerDisplayName(key, t)}
                  </h3>
                  <p className="text-[12px] mt-1 font-medium" style={{ color: "rgba(17,34,78,0.55)" }}>
                    {offerDisplayTagline(key, t)}
                  </p>
                  {isQuote ? (
                    <p className="mt-4 whitespace-nowrap text-[clamp(1.15rem,1.45vw,1.5rem)] font-black leading-none" style={{ color: BLUE }}>
                      {t("centre", "abonnementsPriceQuote")}
                    </p>
                  ) : (
                    <div className="mt-4">
                      <p className="whitespace-nowrap text-[clamp(1rem,1.25vw,1.3rem)] font-black leading-none tabular-nums transition-transform duration-300 group-hover:scale-[1.03] origin-left" style={{ color: BLUE }}>
                        {perUserLabel} {t("centre", "abonnementsPricePerUser")}
                      </p>
                    </div>
                  )}
                  {entryPriceLabel && (
                    <p className="mt-1.5 whitespace-nowrap text-[11px] font-bold tabular-nums" style={{ color: "rgba(17,34,78,0.55)" }}>
                      {t("centre", "abonnementsPriceFrom")} {entryPriceLabel} {t("centre", "abonnementsPricePerMonth")}
                    </p>
                  )}
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
                    className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all duration-300 group-hover:brightness-110 group-hover:scale-[1.02]"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <MessageCircle size={16} />
                    {t("centre", "abonnementsContact")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CenterPageBody>
    </CenterPageLayout>
  );
}
