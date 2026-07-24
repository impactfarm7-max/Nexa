"use client";

import { motion } from "framer-motion";
import { BRAND } from "@/app/utils/brand";

const MODULES = [
  "Communauté",
  "Finances",
  "Étudiants",
  "Vidéo / coaching",
  "Cours",
  "Staff",
  "Planificateur",
  "Tuteur",
] as const;

export default function SuiteModulesGrid() {
  return (
    <section className="relative z-10 border-y border-black/6 bg-white py-12 sm:py-14 xl:py-16">
      <div className="nexa-marketing-shell">
        <div className="mb-8 sm:mb-9 max-w-2xl">
          <h2 className="nexa-marketing-title mb-3" style={{ color: BRAND.blue }}>
            Une suite personnalisée
          </h2>
          <p className="text-neutral-500 font-medium leading-relaxed text-[15px] sm:text-base">
            Activez les modules dont votre centre a besoin — sans complexité inutile.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-black/[0.06] border border-black/[0.06]">
          {MODULES.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
              className="flex items-center px-4 py-4 sm:px-5 sm:py-5 bg-[#FFFBF7] hover:bg-white transition-colors"
            >
              <span
                className="text-[12px] sm:text-[13px] font-black tracking-tight"
                style={{ color: BRAND.blue }}
              >
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
