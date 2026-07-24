"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BRAND } from "@/app/utils/brand";
import MarketingChrome from "@/app/components/landing/MarketingChrome";

const ORANGE = BRAND.orange;

const VALUES = [
  {
    title: "Accessibilité",
    text: "L’éducation de qualité ne doit plus être un luxe. NEXA démocratise une formation moderne et mesurable pour les centres et les apprenants partout en Afrique.",
  },
  {
    title: "Excellence pédagogique",
    text: "Chaque outil — planificateur, communauté, examens, tuteur — est conçu pour servir l’acte d’enseigner et d’apprendre, pas pour complexifier le quotidien.",
  },
  {
    title: "Amplification",
    text: "Le X de NEXA est le multiplicateur. Nous ne digitalisons pas seulement : nous amplifions chaque centre, chaque formateur, chaque apprenant.",
  },
  {
    title: "Confiance & continuité",
    text: "Une plateforme unique, une vision claire pour les équipes, un accompagnement agent pour démarrer — de la demande centre au suivi des parcours.",
  },
] as const;

export default function ValeursPage() {
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
          L&apos;accès à l&apos;éducation de qualité
          <br className="hidden sm:block" /> ne sera plus un luxe
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
          NEXA construit une techno éducative au service des centres, des enseignants et des apprenants —
          pour démocratiser une formation moderne, mesurable et accessible partout en Afrique.
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
            Notre mission
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
            Le <strong className="text-neutral-800">X</strong> est le multiplicateur — l&apos;infini des possibles.
            NEXA ne se contente pas de digitaliser : elle amplifie chaque centre, chaque formateur, chaque apprenant.
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
          Construisons l&apos;avenir de la formation ensemble
        </h2>
        <p className="text-neutral-500 font-medium mb-7 max-w-md mx-auto">
          Découvrez la plateforme ou explorez les programmes adaptés à votre centre.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/presentation"
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-black text-white transition hover:opacity-90"
            style={{ backgroundColor: BRAND.blue }}
          >
            Découvrir la plateforme
          </Link>
          <Link
            href="/programmes"
            className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-7 rounded-2xl text-sm font-bold border border-black/10 bg-white text-neutral-700 hover:border-black/20 transition"
          >
            Voir nos programmes
          </Link>
        </div>
      </section>
    </MarketingChrome>
  );
}
