"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, MessageCircle } from "lucide-react";
import { loadCenterBootstrap } from "@/app/utils/center-me-cache";
import { normalizeCenterType, type CenterTypeCode } from "@/app/data/center-types";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, ORANGE, CenterPageLayout, CenterPageHeader, CenterPageBody } from "../center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

type Offer = {
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  features: string[];
};

const TCF_OFFERS_FR: Offer[] = [
  { name: "Starter", price: "Sur devis", period: "", features: ["Accès plateforme TCF Canada", "Gestion étudiants & staff", "Examens blancs universels"] },
  { name: "Pro", price: "Sur devis", period: "", highlight: true, features: ["Tout Starter", "Sessions Live illimitées", "Rapports & statistiques avancés"] },
  { name: "Ultra", price: "Sur devis", period: "", features: ["Tout Pro", "Communauté & campus multiples", "Accompagnement dédié NEXA"] },
];

const LIBRE_OFFERS_FR: Offer[] = [
  { name: "Starter", price: "Sur devis", period: "", features: ["Gestion étudiants & staff", "Planning & cours", "Bibliothèque publique"] },
  { name: "Pro", price: "Sur devis", period: "", highlight: true, features: ["Tout Starter", "Sessions Live illimitées", "Rapports & statistiques avancés"] },
  { name: "Ultra", price: "Sur devis", period: "", features: ["Tout Pro", "Communauté & campus multiples", "Accompagnement dédié NEXA"] },
];

const TCF_OFFERS_EN: Offer[] = [
  { name: "Starter", price: "Custom quote", period: "", features: ["TCF Canada platform access", "Student & staff management", "Universal mock exams"] },
  { name: "Pro", price: "Custom quote", period: "", highlight: true, features: ["Everything in Starter", "Unlimited Live sessions", "Advanced reports & analytics"] },
  { name: "Ultra", price: "Custom quote", period: "", features: ["Everything in Pro", "Community & multi-campus", "Dedicated NEXA support"] },
];

const LIBRE_OFFERS_EN: Offer[] = [
  { name: "Starter", price: "Custom quote", period: "", features: ["Student & staff management", "Schedule & courses", "Public library"] },
  { name: "Pro", price: "Custom quote", period: "", highlight: true, features: ["Everything in Starter", "Unlimited Live sessions", "Advanced reports & analytics"] },
  { name: "Ultra", price: "Custom quote", period: "", features: ["Everything in Pro", "Community & multi-campus", "Dedicated NEXA support"] },
];

export default function AbonnementsPage() {
  const { t, locale } = useI18n();
  const en = locale === "en";
  const [loading, setLoading] = useState(true);
  const [centerType, setCenterType] = useState<CenterTypeCode | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const bootstrap = await loadCenterBootstrap();
      const center = (bootstrap?.me as { center?: { center_type?: string; plan_type?: string; nexa_offer?: string | null } } | undefined)?.center;
      setCenterType(normalizeCenterType(center?.center_type));
      setPlanType(
        center?.nexa_offer
          ? String(center.nexa_offer).charAt(0).toUpperCase() + String(center.nexa_offer).slice(1)
          : center?.plan_type || null,
      );
      setLoading(false);
    })();
  }, []);

  if (loading) return <CenterPageLoading />;

  const isTCF = centerType === "tcf_canada";
  const offers = isTCF ? (en ? TCF_OFFERS_EN : TCF_OFFERS_FR) : (en ? LIBRE_OFFERS_EN : LIBRE_OFFERS_FR);

  const contact = () => {
    const msg = encodeURIComponent(
      en ? "Hello NEXA, I'd like more information about your subscription offers." : "Bonjour NEXA, je souhaite en savoir plus sur vos offres d'abonnement.",
    );
    window.open(`https://wa.me/+237683375069?text=${msg}`, "_blank");
  };

  return (
    <CenterPageLayout header={<CenterPageHeader title={t("centre", "navAbonnements")} />}>
      <CenterPageBody>
        <div className="max-w-4xl mx-auto text-center pt-2 pb-4">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>
            {isTCF ? (en ? "TCF Canada offers" : "Offres Centre TCF Canada") : (en ? "Independent center offers" : "Offres Centre Libre")}
          </p>
          {planType && (
            <p className="text-[13px] mt-1" style={{ color: "rgba(17,34,78,0.55)" }}>
              {en ? "Current plan: " : "Offre actuelle : "}
              <span className="font-black" style={{ color: BLUE }}>{planType}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto pb-8">
          {offers.map((offer) => (
            <div
              key={offer.name}
              className={`rounded-2xl border p-6 flex flex-col bg-white transition-all ${
                offer.highlight ? "border-2 shadow-lg" : "border-black/[0.08]"
              }`}
              style={offer.highlight ? { borderColor: ORANGE, boxShadow: `0 8px 24px ${ORANGE}22` } : undefined}
            >
              {offer.highlight && (
                <span
                  className="self-start mb-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  <Sparkles size={11} /> {en ? "Recommended" : "Recommandé"}
                </span>
              )}
              <h3 className="text-lg font-black" style={{ color: BLUE }}>{offer.name}</h3>
              <p className="text-2xl font-black mt-2" style={{ color: BLUE }}>{offer.price}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {offer.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(17,34,78,0.75)" }}>
                    <Check size={15} className="shrink-0 mt-0.5" style={{ color: ORANGE }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={contact}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-colors"
                style={{ backgroundColor: offer.highlight ? ORANGE : BLUE }}
              >
                <MessageCircle size={16} />
                {en ? "Contact NEXA" : "Contacter NEXA"}
              </button>
            </div>
          ))}
        </div>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
