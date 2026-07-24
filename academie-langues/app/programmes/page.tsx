"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Languages, Timer, Route } from "lucide-react";
import { BRAND } from "@/app/utils/brand";
import MarketingChrome from "@/app/components/landing/MarketingChrome";

const WHATSAPP = "237621105640";
const ORANGE = BRAND.orange;

const PROGRAMS = [
  {
    id: "natif",
    icon: Languages,
    tint: "#E8EEF8",
    accent: BRAND.blue,
    eyebrow: "Programme 01",
    title: "Programme natif",
    subtitle: "En collaboration avec IAG Academy",
    lead:
      "Une technologie complète pour les disciplines de langue et de certification — conçue pour des parcours exigeants, mesurables et immersifs.",
    body: [
      "Le programme natif s’adresse aux centres qui préparent TCF Canada, TEF, IELTS et d’autres parcours d’immersion linguistique. Il s’appuie sur l’expertise IAG Academy et sur la plateforme NEXA : contenus, entraînements, examens sécurisés, communauté et tuteur.",
      "Objectif : offrir une expérience « native » de la discipline — de la pédagogie au suivi — sans empiler des outils disparates. Une seule plateforme, une seule vérité sur la progression de chaque apprenant.",
    ],
    points: [
      "Parcours langues & certifications (TCF, TEF, IELTS…)",
      "Techno pédagogique intégrée : cours, quiz, simulateurs, live",
      "Suivi mesurable pour le centre et l’équipe pédagogique",
    ],
  },
  {
    id: "court",
    icon: Timer,
    tint: "#FFF0E4",
    accent: ORANGE,
    eyebrow: "Programme 02",
    title: "Programme court",
    subtitle: "Cursus de moins d’un an",
    lead:
      "Le meilleur de NEXA pour les formations intensives : rythme soutenu, suivi serré, résultats visibles rapidement.",
    body: [
      "Idéal pour les bootcamps, préparations accélérées et offres professionnelles courtes. Le programme court concentre planification, publication de contenus, évaluations et communication apprenant dans un flux simple.",
      "Vos équipes gardent le contrôle du calendrier et de la qualité pédagogique ; vos apprenants voient clairement où ils en sont — semaine après semaine.",
    ],
    points: [
      "Intensité et clarté du parcours (< 12 mois)",
      "Planification, devoirs et feedback en un même lieu",
      "Pilotage centre sans complexité d’un cursus long",
    ],
  },
  {
    id: "pluriannuel",
    icon: Route,
    tint: "#F3EDE6",
    accent: BRAND.blue,
    eyebrow: "Programme 03",
    title: "Programme pluri-annuel",
    subtitle: "De l’entrée à la sortie",
    lead:
      "La gestion complète du cycle de vie de l’apprenant : filières, périodes, bulletins, progression et administration.",
    body: [
      "Conçu pour les écoles et centres qui forment sur plusieurs années. Le programme pluri-annuel structure filières et campus, périodes académiques, notes et bulletins, tout en conservant la collaboration pédagogique au quotidien.",
      "NEXA devient le système nerveux de votre établissement : moins d’outils éparpillés, plus de continuité pour les équipes et les familles.",
    ],
    points: [
      "Filières, périodes et bulletins sur le long terme",
      "Vision centre multi-campus et multi-promotions",
      "Continuité pédagogique de l’inscription à la sortie",
    ],
  },
] as const;

export default function ProgrammesPage() {
  const reduceMotion = useReducedMotion();

  const talkToAgent = () =>
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Bonjour NEXA, je souhaite en savoir plus sur les programmes.")}`,
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
            03 programmes · 03 cibles · 01 plateforme
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
          Une seule plateforme NEXA, trois formats adaptés à votre offre.
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
          Quel programme pour votre centre ?
        </h2>
        <p className="text-neutral-500 font-medium mb-7 max-w-md mx-auto">
          Un agent NEXA vous aide à choisir le format adapté à votre offre — sans engagement complexe.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={talkToAgent}
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-black text-white transition hover:opacity-90"
            style={{ backgroundColor: ORANGE }}
          >
            Parler à un agent
          </button>
          <Link
            href="/ouvrir-centre"
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-bold border border-black/10 bg-white text-neutral-700 hover:border-black/20 transition"
          >
            Demander un espace centre
          </Link>
        </div>
      </section>
    </MarketingChrome>
  );
}
