"use client";

import Link from "next/link";
import { Building2, Check, Info } from "lucide-react";
import { NEXA_OFFERS, nexaOfferLabel, type NexaOfferKey } from "@/app/data/nexaOffers";
import { TCF_OFFERS, TCF_PLAN_KEYS } from "@/app/data/tcfOffers";
import { useI18n } from "@/app/i18n/I18nProvider";

const ORDER: Exclude<NexaOfferKey, "custom">[] = ["decouverte", "croissance", "pro", "entreprise"];

function formatRange(min: number, max: number | null, locale: string) {
  const fmt = (n: number) => new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(n);
  if (max == null) return `${fmt(min)}+ FCFA`;
  return `${fmt(min)} – ${fmt(max)} FCFA`;
}

export default function SuperadminOffresPage() {
  const { t, locale } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "offresTitle")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("superadmin", "offresSubtitle")}</p>
        </div>
        <Link
          href="/superadmin/centres"
          className="inline-flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2.5 text-xs font-bold text-orange-300 hover:bg-orange-500/15"
        >
          <Building2 className="h-3.5 w-3.5" />
          {t("superadmin", "offresAssignCta")}
        </Link>
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-orange-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-300">
            {t("superadmin", "offresHowItWorksTitle")}
          </h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{t("superadmin", "offresHowItWorksIntro")}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t("superadmin", "offresHowItWorksTypes")}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t("superadmin", "offresHowItWorksCustom")}</p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
            {t("superadmin", "centresTypeNative")}
          </span>
          <p className="text-xs text-slate-500">{t("superadmin", "offresLibreHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {ORDER.map((key) => {
          const offer = NEXA_OFFERS[key];
          return (
            <article key={key} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/90">
                    {nexaOfferLabel(key, locale === "en" ? "en" : "fr")}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-white">{offer.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{offer.tagline}</p>
                </div>
                <p className="shrink-0 text-right text-xs font-bold text-slate-300">
                  {formatRange(offer.monthlyFeeMin, offer.monthlyFeeMax, locale)}
                  <span className="block text-[10px] font-medium text-slate-500">{t("superadmin", "offresPerMonth")}</span>
                </p>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {offer.maxStudents == null
                    ? t("superadmin", "centresOfferStudentsUnlimited")
                    : t("superadmin", "centresOfferStudentsUpTo").replace("{count}", String(offer.maxStudents))}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {t("superadmin", "offresCampus")}: {offer.maxCampus == null ? "∞" : offer.maxCampus}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {t("superadmin", "offresStaff")}: {offer.maxStaffAccounts == null ? "∞" : offer.maxStaffAccounts}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {t("superadmin", "offresTutor")}:{" "}
                  {offer.tutorInteractionsPerStudent == null ? "∞" : offer.tutorInteractionsPerStudent}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {t("superadmin", "offresLive")}: {offer.liveHoursPerStudent == null ? "∞" : offer.liveHoursPerStudent}
                </li>
              </ul>
            </article>
          );
        })}

        <article className="rounded-2xl border border-dashed border-white/15 bg-[#0a0f1c]/80 p-5 xl:col-span-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t("superadmin", "centresOfferCustom")}
          </p>
          <h2 className="mt-1 text-lg font-black text-white">{t("superadmin", "offresCustomTitle")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{t("superadmin", "offresCustomHint")}</p>
        </article>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-sky-300">
            {t("superadmin", "centresTypeTcf")}
          </span>
          <p className="text-xs text-slate-500">{t("superadmin", "offresTcfHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {TCF_PLAN_KEYS.map((key) => {
            const cfg = TCF_OFFERS[key];
            const features = locale === "en" ? cfg.featuresEn : cfg.featuresFr;
            return (
              <article key={key} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-400/90">
                      {locale === "en" ? cfg.nameEn : cfg.nameFr}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-white">{locale === "en" ? cfg.nameEn : cfg.nameFr}</h2>
                    <p className="mt-1 text-sm text-slate-400">{locale === "en" ? cfg.taglineEn : cfg.taglineFr}</p>
                  </div>
                  <p className="shrink-0 text-right text-xs font-bold text-slate-300">
                    {cfg.entryPrice != null
                      ? `${cfg.entryPrice.toLocaleString(locale === "en" ? "en-US" : "fr-FR")} FCFA`
                      : locale === "en"
                        ? cfg.priceEn
                        : cfg.priceFr}
                    <span className="block text-[10px] font-medium text-slate-500">{t("superadmin", "offresPerMonth")}</span>
                  </p>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-sky-400" />
                    {cfg.maxStudents == null
                      ? t("superadmin", "centresOfferStudentsFrom").replace("{min}", String(cfg.minStudents))
                      : cfg.minStudents > 1
                        ? t("superadmin", "centresOfferStudentsRange")
                            .replace("{min}", String(cfg.minStudents))
                            .replace("{max}", String(cfg.maxStudents))
                        : t("superadmin", "centresOfferStudentsUpTo").replace("{count}", String(cfg.maxStudents))}
                  </li>
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-sky-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("superadmin", "offresTcfCustomHint")}</p>
      </div>
    </div>
  );
}
