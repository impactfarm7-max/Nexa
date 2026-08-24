"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

const PERSONAS = [
  {
    id: "chef",
    key: "leader",
    href: "/ouvrir-centre",
    photo: "/personna-chef.jpeg",
    objectPosition: "50% 30%",
    veil: `linear-gradient(135deg, ${BRAND.blue}22 0%, transparent 50%)`,
  },
  {
    id: "enseignant",
    key: "teacher",
    href: "/presentation",
    photo: "/personna-enseignant.jpeg",
    objectPosition: "50% 25%",
    veil: `linear-gradient(160deg, ${BRAND.orange}18 0%, transparent 45%)`,
  },
  {
    id: "apprenant",
    key: "learner",
    href: "/presentation",
    photo: "/persona-apprenants.jpeg",
    objectPosition: "50% 35%",
    veil: `linear-gradient(200deg, ${BRAND.blue}18 0%, ${BRAND.orange}12 100%)`,
  },
] as const;

export default function PersonaTabs() {
  const { locale, t } = useI18n();
  const [active, setActive] = useState(0);
  const baseId = useId();
  const personas = useMemo(() => PERSONAS.map((persona) => ({
    ...persona,
    label: t("landing", `${persona.key}Label`),
    title: t("landing", `${persona.key}Title`),
    description: t("landing", `${persona.key}Description`),
    cta: t("landing", `${persona.key}Cta`),
  })), [locale, t]);
  const persona = personas[active];

  return (
    <section className="relative z-10 py-12 sm:py-14 xl:py-16">
      <div className="nexa-marketing-shell">
        <div className="mb-7 sm:mb-8 max-w-3xl">
          <h2 className="nexa-marketing-title max-w-3xl" style={{ color: BRAND.blue }}>
            {t("landing", "personasTitle")}
          </h2>
        </div>

        {/* C3 — onglets épurés */}
        <div
          role="tablist"
          aria-label={t("landing", "personasLabel")}
          className="flex gap-0 border-b border-black/[0.08] mb-0 overflow-x-auto"
        >
          {personas.map((p, i) => {
            const selected = i === active;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${p.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${p.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const dir = e.key === "ArrowRight" ? 1 : -1;
                    setActive((cur) => (cur + dir + personas.length) % personas.length);
                  }
                }}
                className="relative shrink-0 px-4 sm:px-5 py-3.5 text-[13px] sm:text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  color: selected ? BRAND.blue : "rgba(17,34,78,0.45)",
                }}
              >
                {p.label}
                {selected && (
                  <motion.span
                    layoutId="persona-tab-underline"
                    className="absolute left-4 right-4 sm:left-5 sm:right-5 bottom-0 h-[2.5px] rounded-full"
                    style={{ backgroundColor: BRAND.orange }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* C1/C2 — panneau large : photo | texte (mobile : photo au-dessus) */}
      <div className="nexa-marketing-shell">
        <AnimatePresence mode="wait">
          <motion.div
            key={persona.id}
            role="tabpanel"
            id={`${baseId}-panel-${persona.id}`}
            aria-labelledby={`${baseId}-tab-${persona.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="grid lg:grid-cols-2 gap-0 border border-t-0 border-black/[0.08] bg-white overflow-hidden min-h-[420px] lg:min-h-[480px]"
          >
            {/* Photo — gauche desktop / haut mobile */}
            <div className="relative order-1 aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[480px] bg-[#E8E4DE]">
              <Image
                src={persona.photo}
                alt={`${t("landing", "illustration")}: ${persona.label}`}
                fill
                priority={active === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                style={{ objectPosition: persona.objectPosition }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: persona.veil }}
                aria-hidden
              />
              {/* Caption discrète placeholder */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4">
                <span className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 bg-black/35 backdrop-blur-sm px-2.5 py-1.5">
                  {persona.label}
                </span>
              </div>
            </div>

            {/* Texte — droite desktop / dessous mobile */}
            <div className="order-2 flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-12">
              <h3
                className="text-xl sm:text-2xl md:text-3xl xl:text-[2rem] font-black tracking-tight leading-[1.2] mb-4 sm:mb-5"
                style={{ color: BRAND.blue }}
              >
                {persona.title}
              </h3>
              <p className="text-neutral-500 font-medium leading-relaxed text-[15px] sm:text-lg md:text-[1.125rem] mb-6 sm:mb-8 max-w-md">
                {persona.description}
              </p>
              <Link
                href={persona.href}
                className="inline-flex items-center gap-2 text-[13px] sm:text-[14px] font-bold transition hover:gap-3"
                style={{ color: BRAND.orange }}
              >
                {persona.cta}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
