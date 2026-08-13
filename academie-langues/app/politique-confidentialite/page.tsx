"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Shield, Database, Users, Globe, Clock, Cookie, Eye, Lock, Bell, Mail, FileText } from "lucide-react";
import Link from "next/link";
import MarketingChrome from "@/app/components/landing/MarketingChrome";
import { useI18n } from "@/app/i18n/I18nProvider";

type Subsection = {
  title: string;
  content?: string;
  bullets?: string[];
};

type Section = {
  id: string;
  icon: any;
  title: string;
  content?: string;
  bullets?: string[];
  extra?: string;
  subsections?: Subsection[];
  highlight?: boolean;
};

function AccordionItem({ section, index, minorsBadge }: { section: Section; index: number; minorsBadge: string }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.4 }}
      className={`border rounded-2xl overflow-hidden mb-3 shadow-sm hover:shadow-md transition-shadow ${section.highlight ? "border-orange-200 bg-orange-50/30" : "border-slate-200 bg-white"}`}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left group">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${section.highlight ? "bg-orange-100 group-hover:bg-orange-200" : "bg-orange-50 group-hover:bg-orange-100"}`}>
            <Icon size={18} className="text-orange-500" />
          </div>
          <span className="font-semibold text-slate-800 text-sm md:text-base">{section.title}</span>
          {section.highlight && <span className="hidden md:inline text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">{minorsBadge}</span>}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-6 pb-6 border-t border-slate-100 pt-4 space-y-4">
              {section.content && <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{section.content}</p>}
              {section.bullets && (
                <ul className="space-y-2">
                  {section.bullets.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" /><span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.extra && <p className="text-slate-500 text-sm italic border-l-2 border-orange-300 pl-3">{section.extra}</p>}
              {section.subsections?.map((sub, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-slate-700">{sub.title}</h4>
                  {sub.content && <p className="text-sm leading-relaxed text-slate-600">{sub.content}</p>}
                  {sub.bullets && (
                    <ul className="space-y-1 mt-2">
                      {sub.bullets.map((b: string, j: number) => (
                        <li key={j} className="flex gap-3 text-sm text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PolitiqueConfidentialitePage() {
  const { t } = useI18n();
  const minorsBadge = t("marketing", "confidentialiteMineursBadge");

  const sections: Section[] = [
    {
      id: "preambule",
      icon: Shield,
      title: t("marketing", "confidentialitePreambuleTitle"),
      content: t("marketing", "confidentialitePreambuleContent"),
    },
    {
      id: "responsable",
      icon: Users,
      title: t("marketing", "confidentialiteResponsableTitle"),
      content: t("marketing", "confidentialiteResponsableContent"),
      extra: t("marketing", "confidentialiteResponsableExtra"),
    },
    {
      id: "donnees",
      icon: Database,
      title: t("marketing", "confidentialiteDonneesTitle"),
      subsections: [
        {
          title: t("marketing", "confidentialiteDonnees21Title"),
          bullets: [
            t("marketing", "confidentialiteDonnees21Bullet1"),
            t("marketing", "confidentialiteDonnees21Bullet2"),
            t("marketing", "confidentialiteDonnees21Bullet3"),
            t("marketing", "confidentialiteDonnees21Bullet4"),
            t("marketing", "confidentialiteDonnees21Bullet5"),
            t("marketing", "confidentialiteDonnees21Bullet6"),
          ],
        },
        {
          title: t("marketing", "confidentialiteDonnees22Title"),
          bullets: [
            t("marketing", "confidentialiteDonnees22Bullet1"),
            t("marketing", "confidentialiteDonnees22Bullet2"),
            t("marketing", "confidentialiteDonnees22Bullet3"),
            t("marketing", "confidentialiteDonnees22Bullet4"),
            t("marketing", "confidentialiteDonnees22Bullet5"),
            t("marketing", "confidentialiteDonnees22Bullet6"),
          ],
        },
        {
          title: t("marketing", "confidentialiteDonnees23Title"),
          content: t("marketing", "confidentialiteDonnees23Content"),
        },
        {
          title: t("marketing", "confidentialiteDonnees24Title"),
          content: t("marketing", "confidentialiteDonnees24Content"),
        },
      ],
    },
    {
      id: "bases",
      icon: FileText,
      title: t("marketing", "confidentialiteBasesTitle"),
      content: t("marketing", "confidentialiteBasesIntro"),
      bullets: [
        t("marketing", "confidentialiteBasesBullet1"),
        t("marketing", "confidentialiteBasesBullet2"),
        t("marketing", "confidentialiteBasesBullet3"),
        t("marketing", "confidentialiteBasesBullet4"),
      ],
    },
    {
      id: "finalites",
      icon: Eye,
      title: t("marketing", "confidentialiteFinalitesTitle"),
      content: t("marketing", "confidentialiteFinalitesIntro"),
      bullets: [
        t("marketing", "confidentialiteFinalitesBullet1"),
        t("marketing", "confidentialiteFinalitesBullet2"),
        t("marketing", "confidentialiteFinalitesBullet3"),
        t("marketing", "confidentialiteFinalitesBullet4"),
        t("marketing", "confidentialiteFinalitesBullet5"),
        t("marketing", "confidentialiteFinalitesBullet6"),
        t("marketing", "confidentialiteFinalitesBullet7"),
        t("marketing", "confidentialiteFinalitesBullet8"),
        t("marketing", "confidentialiteFinalitesBullet9"),
      ],
    },
    {
      id: "mineurs",
      icon: Users,
      title: t("marketing", "confidentialiteMineursTitle"),
      content: t("marketing", "confidentialiteMineursIntro"),
      bullets: [
        t("marketing", "confidentialiteMineursBullet1"),
        t("marketing", "confidentialiteMineursBullet2"),
        t("marketing", "confidentialiteMineursBullet3"),
        t("marketing", "confidentialiteMineursBullet4"),
        t("marketing", "confidentialiteMineursBullet5"),
        t("marketing", "confidentialiteMineursBullet6"),
      ],
      highlight: true,
    },
    {
      id: "partage",
      icon: Globe,
      title: t("marketing", "confidentialitePartageTitle"),
      subsections: [
        {
          title: t("marketing", "confidentialitePartage61Title"),
          content: t("marketing", "confidentialitePartage61Content"),
        },
        {
          title: t("marketing", "confidentialitePartage62Title"),
          content: t("marketing", "confidentialitePartage62Content"),
          bullets: [
            t("marketing", "confidentialitePartage62Bullet1"),
            t("marketing", "confidentialitePartage62Bullet2"),
            t("marketing", "confidentialitePartage62Bullet3"),
            t("marketing", "confidentialitePartage62Bullet4"),
          ],
        },
        {
          title: t("marketing", "confidentialitePartage63Title"),
          content: t("marketing", "confidentialitePartage63Content"),
        },
        {
          title: t("marketing", "confidentialitePartage64Title"),
          content: t("marketing", "confidentialitePartage64Content"),
        },
      ],
    },
    {
      id: "conservation",
      icon: Clock,
      title: t("marketing", "confidentialiteConservationTitle"),
      bullets: [
        t("marketing", "confidentialiteConservationBullet1"),
        t("marketing", "confidentialiteConservationBullet2"),
        t("marketing", "confidentialiteConservationBullet3"),
        t("marketing", "confidentialiteConservationBullet4"),
        t("marketing", "confidentialiteConservationBullet5"),
        t("marketing", "confidentialiteConservationBullet6"),
      ],
    },
    {
      id: "cookies",
      icon: Cookie,
      title: t("marketing", "confidentialiteCookiesTitle"),
      content: t("marketing", "confidentialiteCookiesIntro"),
      bullets: [
        t("marketing", "confidentialiteCookiesBullet1"),
        t("marketing", "confidentialiteCookiesBullet2"),
        t("marketing", "confidentialiteCookiesBullet3"),
      ],
      extra: t("marketing", "confidentialiteCookiesExtra"),
    },
    {
      id: "droits",
      icon: Shield,
      title: t("marketing", "confidentialiteDroitsTitle"),
      content: t("marketing", "confidentialiteDroitsIntro"),
      bullets: [
        t("marketing", "confidentialiteDroitsBullet1"),
        t("marketing", "confidentialiteDroitsBullet2"),
        t("marketing", "confidentialiteDroitsBullet3"),
        t("marketing", "confidentialiteDroitsBullet4"),
        t("marketing", "confidentialiteDroitsBullet5"),
        t("marketing", "confidentialiteDroitsBullet6"),
        t("marketing", "confidentialiteDroitsBullet7"),
      ],
      extra: t("marketing", "confidentialiteDroitsExtra"),
    },
    {
      id: "securite",
      icon: Lock,
      title: t("marketing", "confidentialiteSecuriteTitle"),
      content: t("marketing", "confidentialiteSecuriteIntro"),
      bullets: [
        t("marketing", "confidentialiteSecuriteBullet1"),
        t("marketing", "confidentialiteSecuriteBullet2"),
        t("marketing", "confidentialiteSecuriteBullet3"),
        t("marketing", "confidentialiteSecuriteBullet4"),
        t("marketing", "confidentialiteSecuriteBullet5"),
      ],
    },
    {
      id: "modifications",
      icon: Bell,
      title: t("marketing", "confidentialiteModificationsTitle"),
      content: t("marketing", "confidentialiteModificationsContent"),
    },
    {
      id: "contact",
      icon: Mail,
      title: t("marketing", "confidentialiteContactTitle"),
      content: t("marketing", "confidentialiteContactIntro"),
      bullets: [
        t("marketing", "confidentialiteContactBullet1"),
        t("marketing", "confidentialiteContactBullet2"),
        t("marketing", "confidentialiteContactBullet3"),
        t("marketing", "confidentialiteContactBullet4"),
      ],
    },
  ];

  return (
    <MarketingChrome>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/10 to-slate-50">
        <div className="bg-slate-950 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 bg-slate-800 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
              {t("marketing", "confidentialiteBackButton")}
            </Link>
            <Link href="/cgu" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
              {t("marketing", "confidentialiteCguLink")}
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Shield size={14} />{t("marketing", "confidentialiteBadge")}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
              {t("marketing", "confidentialiteTitleMain")} <span className="text-orange-500">{t("marketing", "confidentialiteTitleHighlight")}</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">{t("marketing", "confidentialiteVersion")}</p>
            <p className="text-slate-400 text-xs mt-1">{t("marketing", "confidentialiteLegalInfo")}</p>
          </motion.div>

          <div>{sections.map((section, index) => <AccordionItem key={section.id} section={section} index={index} minorsBadge={minorsBadge} />)}</div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 p-6 bg-slate-100 rounded-2xl text-center">
            <p className="text-slate-500 text-sm">
              {t("marketing", "confidentialiteFooterDpoLabel")} <a href="mailto:eliseeleo@yahoo.ca" className="text-orange-500 font-bold hover:underline">eliseeleo@yahoo.ca</a>
              {" · "}
              <Link href="/cgu" className="text-orange-500 font-bold hover:underline">{t("marketing", "confidentialiteFooterCguLink")}</Link>
            </p>
            <p className="text-slate-400 text-xs mt-2">{t("marketing", "confidentialiteFooterAddress")}</p>
          </motion.div>
        </div>
      </div>
    </MarketingChrome>
  );
}
