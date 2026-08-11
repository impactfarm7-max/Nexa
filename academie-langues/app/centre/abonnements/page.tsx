"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles, MessageCircle } from "lucide-react";
import { loadCenterBootstrap } from "@/app/utils/center-me-cache";
import { normalizeCenterType, type CenterTypeCode } from "@/app/data/center-types";
import {
  NEXA_OFFER_KEYS,
  NEXA_OFFERS,
  nexaOfferLabel,
  normalizeNexaOffer,
  type NexaOfferConfig,
  type NexaOfferKey,
} from "@/app/data/nexaOffers";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, ORANGE, CenterPageLayout, CenterPageHeader, CenterPageBody } from "../center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

function fmtLimit(value: number | null, en: boolean): string {
  if (value == null) return en ? "Unlimited" : "Illimité";
  return String(value);
}

function fmtPrice(offer: NexaOfferConfig, en: boolean): string {
  if (offer.monthlyFeeMax == null && offer.key === "entreprise") {
    return en ? "Custom quote" : "Sur devis";
  }
  const min = offer.monthlyFeeMin.toLocaleString(en ? "en-US" : "fr-FR");
  return en ? `From ${min} FCFA/mo` : `À partir de ${min} FCFA/mois`;
}

function buildOfferFeatures(offer: NexaOfferConfig, en: boolean): string[] {
  const students =
    offer.maxStudents == null
      ? en
        ? `${offer.minStudents}+ students`
        : `${offer.minStudents}+ apprenants`
      : en
        ? `${offer.minStudents}–${offer.maxStudents} students`
        : `${offer.minStudents}–${offer.maxStudents} apprenants`;

  return [
    students,
    en
      ? `${fmtLimit(offer.maxCampus, en)} campus`
      : `${fmtLimit(offer.maxCampus, en)} campus`,
    en
      ? `${fmtLimit(offer.maxStaffAccounts, en)} staff accounts`
      : `${fmtLimit(offer.maxStaffAccounts, en)} comptes staff`,
    en
      ? `${fmtLimit(offer.tutorInteractionsPerStudent, en)} tutor interactions / student`
      : `${fmtLimit(offer.tutorInteractionsPerStudent, en)} interactions tuteur / apprenant`,
    en
      ? `${fmtLimit(offer.liveHoursPerStudent, en)} live hours / student`
      : `${fmtLimit(offer.liveHoursPerStudent, en)} h live / apprenant`,
    en
      ? `${fmtLimit(offer.aiCorrectionsPerStudent, en)} AI corrections / student`
      : `${fmtLimit(offer.aiCorrectionsPerStudent, en)} corrections IA / apprenant`,
    en
      ? `${fmtLimit(offer.courseBuilderPerMonth, en)} course builder / month`
      : `${fmtLimit(offer.courseBuilderPerMonth, en)} constructeur cours / mois`,
    offer.whiteLabel === true
      ? en ? "White label included" : "Marque blanche incluse"
      : offer.whiteLabel === "option"
        ? en ? "White label optional" : "Marque blanche en option"
        : en ? "NEXA branding" : "Marque NEXA",
  ];
}

export default function AbonnementsPage() {
  const { t, locale } = useI18n();
  const en = locale === "en";
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

  const currentPlanLabel = useMemo(
    () => (currentOfferKey ? nexaOfferLabel(currentOfferKey) : en ? "Trial" : "Essai"),
    [currentOfferKey, en],
  );

  if (loading) return <CenterPageLoading />;

  const isTCF = centerType === "tcf_canada";

  const contact = () => {
    const msg = encodeURIComponent(
      en ? "Hello NEXA, I'd like more information about your subscription offers." : "Bonjour NEXA, je souhaite en savoir plus sur vos offres d'abonnement.",
    );
    window.open(`https://wa.me/+237683375069?text=${msg}`, "_blank");
  };

  return (
    <CenterPageLayout header={<CenterPageHeader title={t("centre", "navAbonnements")} />}>
      <CenterPageBody>
        <div className="max-w-5xl mx-auto text-center pt-2 pb-4">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>
            {isTCF ? (en ? "TCF Canada offers" : "Offres Centre TCF Canada") : (en ? "Independent center offers" : "Offres Centre Libre")}
          </p>
          <p className="text-[13px] mt-1" style={{ color: "rgba(17,34,78,0.55)" }}>
            {en ? "Current plan: " : "Offre actuelle : "}
            <span className="font-black" style={{ color: BLUE }}>{currentPlanLabel}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 max-w-6xl mx-auto pb-8">
          {NEXA_OFFER_KEYS.map((key) => {
            const offer = NEXA_OFFERS[key];
            const isCurrent = currentOfferKey === key;
            const isRecommended = !currentOfferKey && key === "pro";
            const highlighted = isCurrent || isRecommended;
            const features = buildOfferFeatures(offer, en);

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
                    {en ? "Current plan" : "Offre actuelle"}
                  </span>
                )}
                {!isCurrent && isRecommended && (
                  <span
                    className="self-start mb-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <Sparkles size={11} /> {en ? "Recommended" : "Recommandé"}
                  </span>
                )}
                <h3 className="text-lg font-black" style={{ color: BLUE }}>{offer.name}</h3>
                <p className="text-[12px] mt-1 font-medium" style={{ color: "rgba(17,34,78,0.55)" }}>{offer.tagline}</p>
                <p className="text-xl font-black mt-3" style={{ color: BLUE }}>{fmtPrice(offer, en)}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(17,34,78,0.75)" }}>
                      <Check size={15} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={contact}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-colors"
                  style={{ backgroundColor: highlighted ? ORANGE : BLUE }}
                >
                  <MessageCircle size={16} />
                  {en ? "Contact NEXA" : "Contacter NEXA"}
                </button>
              </div>
            );
          })}
        </div>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
