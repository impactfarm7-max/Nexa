"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BRAND } from "@/app/utils/brand";
import MarketingChrome from "@/app/components/landing/MarketingChrome";
import { useI18n } from "@/app/i18n/I18nProvider";

const ORANGE = BRAND.orange;

export default function ValeursPage() {
  const { t } = useI18n();

  const VALUES = [
    {
      title: t("marketing", "valeursCard1Title"),
      text: t("marketing", "valeursCard1Text"),
    },
    {
      title: t("marketing", "valeursCard2Title"),
      text: t("marketing", "valeursCard2Text"),
    },
    {
      title: t("marketing", "valeursCard3Title"),
      text: t("marketing", "valeursCard3Text"),
    },
    {
      title: t("marketing", "valeursCard4Title"),
      text: t("marketing", "valeursCard4Text"),
    },
  ] as const;

  return (
    <MarketingChrome active="valeurs">
      {/* Hero + mission */}
      <section className="nexa-marketing-shell pt-10 sm:pt-14 pb-12 sm:pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="nexa-marketing-title mb-5 max-w-3xl"
          style={{ color: BRAND.blue }}
        >
          {t("marketing", "valeursHeroTitleLine1")}
          <br className="hidden sm:block" /> {t("marketing", "valeursHeroTitleLine2")}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="mb-6 h-px w-14 origin-left"
          style={{ background: `linear-gradient(90deg, ${ORANGE}, transparent)` }}
          aria-hidden
        />
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="text-neutral-500 font-medium text-base sm:text-lg leading-relaxed max-w-2xl"
        >
          {t("marketing", "valeursHeroSubtitle")}
        </motion.p>
      </section>

      {/* Mission NEXT × AFRICA */}
      <section className="border-y border-black/6 bg-white py-12 sm:py-16">
        <div className="nexa-marketing-shell text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] font-black uppercase tracking-[0.28em] mb-3"
            style={{ color: ORANGE }}
          >
            {t("marketing", "valeursMissionEyebrow")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="nexa-marketing-title mb-5"
            style={{ color: BRAND.blue }}
          >
            NEXT <span style={{ color: ORANGE }}>×</span> AFRICA
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-neutral-500 font-medium max-w-2xl mx-auto leading-relaxed text-base sm:text-lg"
          >
            {t("marketing", "valeursMissionBodyPrefix")} <strong className="text-neutral-800">X</strong> {t("marketing", "valeursMissionBodySuffix")}
          </motion.p>
        </div>
      </section>

      {/* Valeurs grid */}
      <section className="nexa-marketing-shell py-12 sm:py-16">
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {VALUES.map((v, i) => (
            <motion.article
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="border border-black/[0.08] bg-white p-6 sm:p-7"
            >
              <h3 className="text-lg font-black tracking-tight mb-2.5" style={{ color: BRAND.blue }}>
                {v.title}
              </h3>
              <p className="text-[14px] sm:text-[15px] text-neutral-500 font-medium leading-relaxed">{v.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-5 pb-14 sm:pb-16 text-center">
        <h2 className="nexa-marketing-title mb-3" style={{ color: BRAND.blue }}>
          {t("marketing", "valeursCtaTitle")}
        </h2>
        <p className="text-neutral-500 font-medium mb-7 max-w-md mx-auto">
          {t("marketing", "valeursCtaSubtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/presentation"
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-black text-white transition hover:opacity-90"
            style={{ backgroundColor: BRAND.blue }}
          >
            {t("marketing", "valeursCtaPrimary")}
          </Link>
          <Link
            href="/programmes"
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-bold border border-black/10 bg-white text-neutral-700 hover:border-black/20 transition"
          >
            {t("marketing", "valeursCtaSecondary")}
          </Link>
        </div>
      </section>
    </MarketingChrome>
  );
}
