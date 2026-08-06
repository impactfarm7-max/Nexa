"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, Shield, CreditCard, Users, AlertTriangle, FileText, Mail, Scale, RefreshCw } from "lucide-react";
import Link from "next/link";
import MarketingChrome from "@/app/components/landing/MarketingChrome";
import { useI18n } from "@/app/i18n/I18nProvider";

type Bullet = string | { term: string; def: string };

type Subsection = {
  title: string;
  content?: string;
  bullets?: string[];
  highlight?: boolean;
};

type Section = {
  id: string;
  icon: any;
  title: string;
  content?: string;
  bullets?: Bullet[];
  extra?: string;
  subsections?: Subsection[];
};

function AccordionItem({ section, index }: { section: Section; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className="border border-slate-200 rounded-2xl overflow-hidden mb-3 bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
            <Icon size={18} className="text-orange-500" />
          </div>
          <span className="font-semibold text-slate-800 text-sm md:text-base">{section.title}</span>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                      {typeof b === "string" ? <span>{b}</span> : <span><strong className="text-slate-800">{b.term}</strong> : {b.def}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {section.extra && <p className="text-slate-500 text-sm italic border-l-2 border-orange-300 pl-3">{section.extra}</p>}
              {section.subsections?.map((sub, i) => (
                <div key={i} className={`rounded-xl p-4 space-y-2 ${sub.highlight ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
                  <h4 className={`font-semibold text-sm ${sub.highlight ? "text-amber-800" : "text-slate-700"}`}>{sub.highlight && "⚠️ "}{sub.title}</h4>
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${sub.highlight ? "text-amber-700" : "text-slate-600"}`}>{sub.content}</p>
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

export default function CGUPage() {
  const { t } = useI18n();

  const sections: Section[] = [
    {
      id: "preambule",
      icon: BookOpen,
      title: t("marketing", "cguPreambuleTitle"),
      content: t("marketing", "cguPreambuleContent"),
    },
    {
      id: "definitions",
      icon: FileText,
      title: t("marketing", "cguDefinitionsTitle"),
      content: t("marketing", "cguDefinitionsIntro"),
      bullets: [
        { term: t("marketing", "cguDefTerm1"), def: t("marketing", "cguDefDef1") },
        { term: t("marketing", "cguDefTerm2"), def: t("marketing", "cguDefDef2") },
        { term: t("marketing", "cguDefTerm3"), def: t("marketing", "cguDefDef3") },
        { term: t("marketing", "cguDefTerm4"), def: t("marketing", "cguDefDef4") },
        { term: t("marketing", "cguDefTerm5"), def: t("marketing", "cguDefDef5") },
        { term: t("marketing", "cguDefTerm6"), def: t("marketing", "cguDefDef6") },
      ],
    },
    {
      id: "acces",
      icon: Users,
      title: t("marketing", "cguAccesTitle"),
      subsections: [
        {
          title: t("marketing", "cguAcces21Title"),
          content: t("marketing", "cguAcces21Content"),
          bullets: [
            t("marketing", "cguAcces21Bullet1"),
            t("marketing", "cguAcces21Bullet2"),
            t("marketing", "cguAcces21Bullet3"),
          ],
        },
        {
          title: t("marketing", "cguAcces22Title"),
          content: t("marketing", "cguAcces22Content"),
        },
        {
          title: t("marketing", "cguAcces23Title"),
          content: t("marketing", "cguAcces23Content"),
        },
      ],
    },
    {
      id: "services",
      icon: BookOpen,
      title: t("marketing", "cguServicesTitle"),
      content: t("marketing", "cguServicesIntro"),
      bullets: [
        t("marketing", "cguServicesBullet1"),
        t("marketing", "cguServicesBullet2"),
        t("marketing", "cguServicesBullet3"),
        t("marketing", "cguServicesBullet4"),
      ],
      extra: t("marketing", "cguServicesExtra"),
    },
    {
      id: "obligations",
      icon: Shield,
      title: t("marketing", "cguObligationsTitle"),
      content: t("marketing", "cguObligationsIntro"),
      bullets: [
        t("marketing", "cguObligationsBullet1"),
        t("marketing", "cguObligationsBullet2"),
        t("marketing", "cguObligationsBullet3"),
        t("marketing", "cguObligationsBullet4"),
        t("marketing", "cguObligationsBullet5"),
        t("marketing", "cguObligationsBullet6"),
        t("marketing", "cguObligationsBullet7"),
      ],
    },
    {
      id: "mineurs",
      icon: Users,
      title: t("marketing", "cguMineursTitle"),
      content: t("marketing", "cguMineursIntro"),
      bullets: [
        t("marketing", "cguMineursBullet1"),
        t("marketing", "cguMineursBullet2"),
        t("marketing", "cguMineursBullet3"),
        t("marketing", "cguMineursBullet4"),
        t("marketing", "cguMineursBullet5"),
        t("marketing", "cguMineursBullet6"),
      ],
    },
    {
      id: "paiements",
      icon: CreditCard,
      title: t("marketing", "cguPaiementsTitle"),
      content: t("marketing", "cguPaiementsContent"),
      subsections: [
        {
          title: t("marketing", "cguPaiements61Title"),
          content: t("marketing", "cguPaiements61Content"),
        },
      ],
    },
    {
      id: "propriete",
      icon: Shield,
      title: t("marketing", "cguProprieteTitle"),
      content: t("marketing", "cguProprieteContent"),
    },
    {
      id: "responsabilite",
      icon: AlertTriangle,
      title: t("marketing", "cguResponsabiliteTitle"),
      subsections: [
        {
          title: t("marketing", "cguResponsabilite81Title"),
          content: t("marketing", "cguResponsabilite81Content"),
        },
        {
          title: t("marketing", "cguResponsabilite82Title"),
          content: t("marketing", "cguResponsabilite82Content"),
        },
        {
          title: t("marketing", "cguResponsabilite83Title"),
          content: t("marketing", "cguResponsabilite83Content"),
          highlight: true,
        },
      ],
    },
    {
      id: "resiliation",
      icon: RefreshCw,
      title: t("marketing", "cguResiliationTitle"),
      content: t("marketing", "cguResiliationIntro"),
      bullets: [
        t("marketing", "cguResiliationBullet1"),
        t("marketing", "cguResiliationBullet2"),
        t("marketing", "cguResiliationBullet3"),
        t("marketing", "cguResiliationBullet4"),
      ],
      extra: t("marketing", "cguResiliationExtra"),
    },
    {
      id: "droit",
      icon: Scale,
      title: t("marketing", "cguDroitTitle"),
      content: t("marketing", "cguDroitContent"),
    },
    {
      id: "modifications",
      icon: RefreshCw,
      title: t("marketing", "cguModificationsTitle"),
      content: t("marketing", "cguModificationsContent"),
    },
    {
      id: "contact",
      icon: Mail,
      title: t("marketing", "cguContactTitle"),
      content: t("marketing", "cguContactIntro"),
      bullets: [
        t("marketing", "cguContactBullet1"),
        t("marketing", "cguContactBullet2"),
        t("marketing", "cguContactBullet3"),
      ],
    },
  ];

  return (
    <MarketingChrome>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
        <div className="bg-slate-950 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 bg-slate-800 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
              {t("marketing", "cguBackButton")}
            </Link>
            <Link href="/politique-confidentialite" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
              {t("marketing", "cguPrivacyLink")}
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-bold mb-6">
              <FileText size={14} />{t("marketing", "cguBadge")}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
              {t("marketing", "cguTitleMain")} <span className="text-orange-500">{t("marketing", "cguTitleHighlight")}</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">{t("marketing", "cguVersion")}</p>
            <p className="text-slate-400 text-xs mt-1">{t("marketing", "cguLegalInfo")}</p>
          </motion.div>

          <div>{sections.map((section, index) => <AccordionItem key={section.id} section={section} index={index} />)}</div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 p-6 bg-slate-100 rounded-2xl text-center">
            <p className="text-slate-500 text-sm">
              {t("marketing", "cguFooterContactLabel")} <a href="mailto:contact@iag-academy.com" className="text-orange-500 font-bold hover:underline">contact@iag-academy.com</a>
              {" · "}
              <Link href="/politique-confidentialite" className="text-orange-500 font-bold hover:underline">{t("marketing", "cguFooterPrivacyLink")}</Link>
            </p>
            <p className="text-slate-400 text-xs mt-2">{t("marketing", "cguFooterAddress")}</p>
          </motion.div>
        </div>
      </div>
    </MarketingChrome>
  );
}
