"use client";

import Link from "next/link";
import { filterReportHub, type HubSection } from "../config/report-hub";
import type { ReportSlug } from "../config/p0-reports";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";

type Props = {
  activeSlug: ReportSlug;
  centerType?: string | null;
  querySuffix?: string;
};

const SECTION_ORDER: HubSection[] = ["apprenants", "offre", "rh", "finance", "activite"];

const linkClass = (active: boolean) =>
  `shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
    active
      ? "text-white"
      : "bg-[#F7F7F6] text-neutral-600 hover:bg-neutral-200/80 border border-black/[0.06]"
  }`;

export default function ReportsHubNav({ activeSlug, centerType = null, querySuffix = "" }: Props) {
  const { t } = useI18n();
  const sectionKeys: Record<HubSection, string> = { apprenants: "reportsSectionLearners", offre: "reportsSectionOffering", rh: "reportsSectionHr", finance: "reportsSectionFinance", activite: "reportsSectionActivity" };
  const itemKeys: Partial<Record<ReportSlug, { label: string; description: string }>> = {
    "effectifs-apprenants": { label: "reportsNavEnrollments", description: "reportsDescEnrollments" },
    "filieres-programmes": { label: "reportsNavPrograms", description: "reportsDescPrograms" },
    "effectifs-personnel": { label: "reportsNavStaff", description: "reportsDescStaff" },
    "masse-salariale": { label: "reportsNavPayroll", description: "reportsDescPayroll" },
    encaissements: { label: "reportsNavCollections", description: "reportsDescCollections" },
    recouvrement: { label: "reportsNavRecovery", description: "reportsDescRecovery" },
    retards: { label: "reportsNavOverdue", description: "reportsDescOverdue" },
    "reductions-coupons": { label: "reportsNavDiscounts", description: "reportsDescDiscounts" },
    examens: { label: "reportsNavExams", description: "reportsDescExams" },
  };
  const cards = filterReportHub(centerType);
  const liveBySection = SECTION_ORDER.map((section) => ({
    section,
    label: t("centre", sectionKeys[section]),
    items: cards.filter((c) => c.section === section && c.status === "live" && c.href),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="space-y-2.5" aria-label={t("centre", "reportsNavAria")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={`/centre/rapports${querySuffix}`}
          className={linkClass(activeSlug === "synthese")}
          style={activeSlug === "synthese" ? { backgroundColor: BLUE } : undefined}
        >
          {t("centre", "reportsNavSummary")}
        </Link>
      </div>

      <div className="space-y-2">
        {liveBySection.map(({ section, label, items }) => (
          <div key={section} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
            <span
              className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 sm:w-[5.5rem] sm:pt-1.5"
            >
              {label}
            </span>
            <div className="flex flex-wrap gap-1.5 min-w-0">
              {items.map((item) => {
                const active = item.slug === activeSlug;
                return (
                  <Link
                    key={item.id}
                    href={`${item.href}${querySuffix}`}
                    className={linkClass(active)}
                    style={active ? { backgroundColor: BLUE } : undefined}
                    title={item.slug && itemKeys[item.slug] ? t("centre", itemKeys[item.slug]!.description) : item.description}
                  >
                    {item.slug && itemKeys[item.slug] ? t("centre", itemKeys[item.slug]!.label) : item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
