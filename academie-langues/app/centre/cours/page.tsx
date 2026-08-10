"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Calendar, FileText, ArrowRight, Video } from "lucide-react";
import {
  BLUE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
} from "../center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

type ModuleCardProps = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactElement<any>;
};

export default function CentreHubDashboard() {
  const { t } = useI18n();
  const trainerModules: ModuleCardProps[] = [
    { title: t("centre", "hubCoursesQuiz"), description: t("centre", "hubCoursesQuizDescription"), href: "/centre/cours/gestion-cours", icon: <BookOpen /> },
    { title: t("centre", "hubAssignmentsMissions"), description: t("centre", "hubAssignmentsDescription"), href: "/centre/cours/devoirs", icon: <FileText /> },
    { title: t("centre", "hubLiveSessions"), description: t("centre", "hubLiveDescription"), href: "/centre/lives", icon: <Video /> },
  ];
  const adminModules: ModuleCardProps[] = [
    { title: t("centre", "hubSchedule"), description: t("centre", "hubScheduleDescription"), href: "/centre/cours/planning", icon: <Calendar /> },
  ];
  return (
    <CenterPageLayout header={<CenterPageHeader title={t("centre", "hubTitle")} />}>
      <CenterPageBody className="space-y-10">
        <section>
          <SectionLabel badge={t("centre", "hubTrainer")} description={t("centre", "hubTrainerDescription")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {trainerModules.map((m) => <ModuleCard key={m.href} {...m} openLabel={t("centre", "hubOpen")} />)}
          </div>
        </section>

        <section>
          <SectionLabel badge={t("centre", "hubAdministration")} description={t("centre", "hubAdministrationDescription")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {adminModules.map((m) => <ModuleCard key={m.href} {...m} openLabel={t("centre", "hubOpen")} />)}
          </div>
        </section>
      </CenterPageBody>
    </CenterPageLayout>
  );
}

function SectionLabel({ badge, description }: { badge: string; description: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-[#11224E]/15 bg-[#11224E]/[0.04] w-fit" style={{ color: BLUE }}>
        {badge}
      </span>
      <p className="text-xs text-neutral-500 font-medium">{description}</p>
    </div>
  );
}

function ModuleCard({ title, description, href, icon, openLabel }: ModuleCardProps & { openLabel: string }) {
  return (
    <Link href={href} className="group block">
      <div className="relative bg-white border border-black/[0.08] rounded-lg p-6 h-full flex flex-col justify-between transition-all duration-200 hover:border-[#11224E]/20 hover:shadow-md hover:shadow-[#11224E]/5">
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg border transition-colors duration-200 bg-[#F7F7F6] border-black/[0.06] group-hover:bg-[#11224E]/[0.06]">
              {React.cloneElement(icon, {
                className: "w-5 h-5 transition-colors duration-200",
                style: { color: BLUE },
              })}
            </div>
          </div>

          <h3 className="text-base font-extrabold" style={{ color: BLUE }}>{title}</h3>
          <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{description}</p>
        </div>

        <div className="mt-5 flex items-center text-[11px] font-semibold" style={{ color: BLUE }}>
          <span>{openLabel}</span>
          <ArrowRight className="ml-1 w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-200" />
        </div>
      </div>
    </Link>
  );
}
