"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Languages, Timer, Route } from "lucide-react";
import { BRAND } from "@/app/utils/brand";
import MarketingChrome from "@/app/components/landing/MarketingChrome";
import { useI18n } from "@/app/i18n/I18nProvider";

const WHATSAPP = "237621105640";
const ORANGE = BRAND.orange;

const PROGRAM_META = [
  {
    id: "natif",
    icon: Languages,
    tint: "#E8EEF8",
    accent: BRAND.blue,
  },
  {
    id: "court",
    icon: Timer,
    tint: "#FFF0E4",
    accent: ORANGE,
  },
  {
    id: "pluriannuel",
    icon: Route,
    tint: "#F3EDE6",
    accent: BRAND.blue,
  },
] as const;

export default function ProgrammesPage() {
  const reduceMotion = useReducedMotion();
  const { t } = useI18n();

  const PROGRAMS = [
    {
      ...PROGRAM_META[0],
      eyebrow: t("marketing", "programmesNativeEyebrow"),
      title: t("marketing", "programmesNativeTitle"),
      subtitle: t("marketing", "programmesNativeSubtitle"),
      lead: t("marketing", "programmesNativeLead"),
      body: [
        t("marketing", "programmesNativeBody1"),
        t("marketing", "programmesNativeBody2"),
      ],
      points: [
        t("marketing", "programmesNativePoint1"),
        t("marketing", "programmesNativePoint2"),
        t("marketing", "programmesNativePoint3"),
      ],
    },
    {
      ...PROGRAM_META[1],
      eyebrow: t("marketing", "programmesCourtEyebrow"),
      title: t("marketing", "programmesCourtTitle"),
      subtitle: t("marketing", "programmesCourtSubtitle"),
      lead: t("marketing", "programmesCourtLead"),
      body: [
        t("marketing", "programmesCourtBody1"),
        t("marketing", "programmesCourtBody2"),
      ],
      points: [
        t("marketing", "programmesCourtPoint1"),
        t("marketing", "programmesCourtPoint2"),
        t("marketing", "programmesCourtPoint3"),
      ],
    },
    {
      ...PROGRAM_META[2],
      eyebrow: t("marketing", "programmesPluriEyebrow"),
      title: t("marketing", "programmesPluriTitle"),
      subtitle: t("marketing", "programmesPluriSubtitle"),
      lead: t("marketing", "programmesPluriLead"),
      body: [
        t("marketing", "programmesPluriBody1"),
        t("marketing", "programmesPluriBody2"),
      ],
      points: [
        t("marketing", "programmesPluriPoint1"),
        t("marketing", "programmesPluriPoint2"),
        t("marketing", "programmesPluriPoint3"),
      ],
    },
  ];

  const talkToAgent = () =>
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t("marketing", "programmesWhatsappMessage"))}`,
      "_blank",
    );

  return (
    <MarketingChrome active="programmes">
      {/* Hero */}
      <section className="nexa-marketing-shell pt-10 sm:pt-14 pb-10 sm:pb-12">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="nexa-marketing-title mb-5 text-balance max-w-4xl"
          style={{ color: BRAND.blue }}
        >
          <span className="relative inline z-0">
            {t("marketing", "programmesHeroTitle")}
            <motion.span
              aria-hidden
              className="absolute inset-0 -z-10 origin-left rounded-[3px]"
              style={{ backgroundColor: `${ORANGE}48` }}
              initial={{ scaleX: reduceMotion ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { delay: 0.45, duration: 0.75, ease: [0.22, 1, 0.36, 1] }
              }
            />
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-neutral-500 font-medium text-base sm:text-lg leading-relaxed max-w-2xl"
        >
          {t("marketing", "programmesHeroSubtitle")}
        </motion.p>
      </section>

      {/* Programmes détaillés */}
      <section className="border-y border-black/6 bg-white py-12 sm:py-16">
        <div className="nexa-marketing-shell space-y-10 sm:space-y-14">
          {PROGRAMS.map((p, i) => (
            <motion.article
              key={p.id}
              id={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] gap-0 border border-black/[0.08] overflow-hidden scroll-mt-24"
            >
              <div
                className="flex flex-col justify-between p-6 sm:p-8 lg:p-10 min-h-[220px]"
                style={{ backgroundColor: p.tint }}
              >
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: p.accent }}>
                    {p.eyebrow}
                  </p>
                  <div
                    className="h-11 w-11 rounded-xl bg-white/90 border border-black/[0.04] flex items-center justify-center mb-5"
                    aria-hidden
                  >
                    <p.icon size={20} style={{ color: p.accent }} />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2" style={{ color: BRAND.blue }}>
                    {p.title}
                  </h2>
                  <p className="text-sm font-bold" style={{ color: p.accent }}>
                    {p.subtitle}
                  </p>
                </div>
                <p className="mt-6 text-[14px] sm:text-[15px] font-medium leading-relaxed text-neutral-700">
                  {p.lead}
                </p>
              </div>

              <div className="bg-[#FFFBF7] p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                <div className="space-y-4 mb-6">
                  {p.body.map((para) => (
                    <p key={para.slice(0, 32)} className="text-[14px] sm:text-[15px] text-neutral-600 font-medium leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
                <ul className="space-y-2.5">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-[13px] sm:text-[14px] font-semibold" style={{ color: BRAND.blue }}>
                      <span className="mt-2 h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: ORANGE }} aria-hidden />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-5 py-12 sm:py-16 text-center">
        <h2 className="nexa-marketing-title mb-3" style={{ color: BRAND.blue }}>
          {t("marketing", "programmesCtaTitle")}
        </h2>
        <p className="text-neutral-500 font-medium mb-7 max-w-md mx-auto">
          {t("marketing", "programmesCtaSubtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={talkToAgent}
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-black text-white transition hover:opacity-90"
            style={{ backgroundColor: ORANGE }}
          >
            {t("marketing", "programmesCtaTalkToAgent")}
          </button>
          <Link
            href="/ouvrir-centre"
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-bold border border-black/10 bg-white text-neutral-700 hover:border-black/20 transition"
          >
            {t("marketing", "programmesCtaRequestSpace")}
          </Link>
        </div>
      </section>
    </MarketingChrome>
  );
}
