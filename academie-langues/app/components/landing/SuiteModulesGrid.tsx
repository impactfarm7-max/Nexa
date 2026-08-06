"use client";

import { motion } from "framer-motion";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

const MODULES = [
  "moduleCommunity",
  "moduleFinance",
  "moduleStudents",
  "moduleVideo",
  "moduleCourses",
  "moduleStaff",
  "modulePlanner",
  "moduleTutor",
] as const;

export default function SuiteModulesGrid() {
  const { t } = useI18n();
  return (
    <section className="relative z-10 border-y border-black/6 bg-white py-12 sm:py-14 xl:py-16">
      <div className="nexa-marketing-shell">
        <div className="mb-8 sm:mb-9 max-w-2xl">
          <h2 className="nexa-marketing-title mb-3" style={{ color: BRAND.blue }}>
            {t("landing", "suiteTitle")}
          </h2>
          <p className="text-neutral-500 font-medium leading-relaxed text-[15px] sm:text-base">
            {t("landing", "suiteDescription")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-black/[0.06] border border-black/[0.06]">
          {MODULES.map((key, i) => (
            <motion.div
              key={key}
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
                {t("landing", key)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
