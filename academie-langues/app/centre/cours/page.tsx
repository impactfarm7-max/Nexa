"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Calendar, FileText, ArrowRight, UserCheck, Lock, Video } from "lucide-react";
import {
  BLUE,
  CenterPageLayout,
  CenterPageHeader,
  CenterPageBody,
} from "../center-page-ui";

type ModuleCardProps = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactElement<any>;
  dev?: boolean;
};

const TRAINER_MODULES: ModuleCardProps[] = [
  {
    title: "Cours & Quiz",
    description: "Créez vos leçons, ajoutez des médias et construisez des quiz interactifs pour vos apprenants.",
    href: "/centre/cours/gestion-cours",
    icon: <BookOpen />,
  },
  {
    title: "Devoirs & Missions",
    description: "Assignez des devoirs par matière ou par classe. Planifiez les déblocages et les échéances.",
    href: "/centre/cours/devoirs",
    icon: <FileText />,
  },
  {
    title: "Sessions Live",
    description: "Planifiez une visioconférence, invitez étudiants ou staff, et rejoignez la salle en direct.",
    href: "/centre/lives",
    icon: <Video />,
  },
];

const ADMIN_MODULES: ModuleCardProps[] = [
  {
    title: "Emploi du temps",
    description: "Gérez la grille horaire hebdomadaire, programmez les cours par filière, niveau et salle.",
    href: "/centre/cours/planning",
    icon: <Calendar />,
  },
  {
    title: "Portail Administratif",
    description: "Suivi des présences, émargements, conformité et statistiques d'heures.",
    href: "/centre/cours/administration",
    icon: <UserCheck />,
    dev: true,
  },
];

export default function CentreHubDashboard() {
  return (
    <CenterPageLayout header={<CenterPageHeader title="Hub Pédagogique" />}>
      <CenterPageBody className="space-y-10">
        <section>
          <SectionLabel badge="Formateur" description="Modules accessibles aux formateurs et enseignants du centre." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {TRAINER_MODULES.map((m) => <ModuleCard key={m.href} {...m} />)}
          </div>
        </section>

        <section>
          <SectionLabel badge="Administration" description="Modules de gestion réservés à l'équipe d'administration." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {ADMIN_MODULES.map((m) => <ModuleCard key={m.href} {...m} />)}
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

function ModuleCard({ title, description, href, icon, dev = false }: ModuleCardProps) {
  const Wrapper = dev ? "div" : Link;

  return (
    <Wrapper href={dev ? "#" : href} className={`group block ${dev ? "cursor-not-allowed" : ""}`}>
      <div
        className={`relative bg-white border border-black/[0.08] rounded-lg p-6 h-full flex flex-col justify-between transition-all duration-200 ${
          dev ? "opacity-50" : "hover:border-[#11224E]/20 hover:shadow-md hover:shadow-[#11224E]/5"
        }`}
      >
        <div>
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg border transition-colors duration-200 ${dev ? "bg-neutral-100 border-neutral-200" : "bg-[#F7F7F6] border-black/[0.06] group-hover:bg-[#11224E]/[0.06]"}`}>
              {React.cloneElement(icon, {
                className: `w-5 h-5 transition-colors duration-200 ${dev ? "text-neutral-400" : ""}`,
                style: dev ? undefined : { color: BLUE },
              })}
            </div>
            {dev && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-neutral-100 text-neutral-400 border border-neutral-200 flex items-center gap-1">
                <Lock size={8} /> Bientôt
              </span>
            )}
          </div>

          <h3 className="text-base font-extrabold" style={{ color: dev ? "#9CA3AF" : BLUE }}>{title}</h3>
          <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{description}</p>
        </div>

        {!dev && (
          <div className="mt-5 flex items-center text-[11px] font-semibold" style={{ color: BLUE }}>
            <span>Ouvrir</span>
            <ArrowRight className="ml-1 w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-200" />
          </div>
        )}
      </div>
    </Wrapper>
  );
}
