"use client";

import Link from "next/link";
import {
  Users, BookOpen, Briefcase, Wallet, ClipboardCheck, ArrowRight, Lock,
} from "lucide-react";
import { Label, ORANGE } from "@/app/centre/dashboard/dashboard-ui";
import { hubCardsBySection, type HubCard, type HubSection } from "../config/report-hub";
import { useI18n } from "@/app/i18n/I18nProvider";

const SECTION_ICON: Record<HubSection, typeof Users> = {
  apprenants: Users,
  offre: BookOpen,
  rh: Briefcase,
  finance: Wallet,
  activite: ClipboardCheck,
};

const SECTION_ACCENT: Record<HubSection, string> = {
  apprenants: "from-blue-500/10 to-blue-50/30 border-blue-100",
  offre: "from-emerald-500/10 to-emerald-50/30 border-emerald-100",
  rh: "from-purple-500/10 to-purple-50/30 border-purple-100",
  finance: "from-amber-500/10 to-amber-50/30 border-amber-100",
  activite: "from-indigo-500/10 to-indigo-50/30 border-indigo-100",
};

function HubCardItem({ card, querySuffix }: { card: HubCard; querySuffix: string }) {
  const { t } = useI18n();
  const live = card.status === "live" && card.href;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-black text-neutral-300 tabular-nums">
          {String(card.id).padStart(2, "0")}
        </span>
        {card.priority && (
          <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-500">
            {card.priority}
          </span>
        )}
        {!live && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-neutral-400">
            <Lock size={10} /> {t("centre", "reportsPhase2")}
          </span>
        )}
      </div>
      <p className="text-sm font-black text-[#11224E] mt-2 leading-snug">{t("centre", `reportsHubCard${card.id}Title`)}</p>
      <p className="text-[11px] text-neutral-500 leading-snug mt-1 line-clamp-2">{t("centre", `reportsHubCard${card.id}Description`)}</p>
      {live && (
        <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: ORANGE }}>
          {t("centre", "hubOpen")} <ArrowRight size={11} />
        </span>
      )}
    </>
  );

  if (live) {
    return (
      <Link
        href={`${card.href}${querySuffix}`}
        className="group bg-white rounded-2xl border border-neutral-200/80 p-4 hover:shadow-md hover:border-neutral-300 transition-all min-h-[120px]"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className="bg-neutral-50/80 rounded-2xl border border-dashed border-neutral-200 p-4 opacity-75 min-h-[120px]"
      aria-disabled
    >
      {inner}
    </div>
  );
}

type Props = {
  centerType?: string | null;
  querySuffix?: string;
  /** Sur la synthèse : grille complète en tête de page */
  compact?: boolean;
};

export default function ReportsHub({ centerType = null, querySuffix = "", compact = false }: Props) {
  const { t } = useI18n();
  const groups = hubCardsBySection(centerType);

  if (compact) {
    return (
      <section className="space-y-4" id="hub-rapports">
        <div>
          <Label>{t("centre", "reportsHubEntry")}</Label>
          <p className="text-[11px] text-neutral-500 mt-1">
            {t("centre", "reportsHubCompactDescription")}
          </p>
        </div>
        <div className="space-y-5">
          {groups.map(({ section, cards }) => {
            const Icon = SECTION_ICON[section];
            return (
              <div key={section}>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${SECTION_ACCENT[section]} border flex items-center justify-center`}>
                    <Icon size={14} className="text-[#11224E]" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#11224E]">{t("centre", `reportsHubSection_${section}`)}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3">
                  {cards.map((card) => (
                    <HubCardItem key={card.id} card={card} querySuffix={querySuffix} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5" id="hub-rapports">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <Label>{t("centre", "reportsHubTitle")}</Label>
          <p className="text-[11px] text-neutral-500 mt-1">
            {t("centre", "reportsHubDescription")}
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          {groups.reduce((n, g) => n + g.cards.length, 0)} {t("centre", "reportsSectionsCount")}
        </span>
      </div>

      <div className="space-y-6">
        {groups.map(({ section, cards }) => {
          const Icon = SECTION_ICON[section];
          return (
            <div key={section}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${SECTION_ACCENT[section]} border flex items-center justify-center`}>
                  <Icon size={14} className="text-[#11224E]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#11224E]">{t("centre", `reportsHubSection_${section}`)}</h3>
                <span className="text-[10px] font-semibold text-neutral-400">({cards.length})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
                {cards.map((card) => (
                  <HubCardItem key={card.id} card={card} querySuffix={querySuffix} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
