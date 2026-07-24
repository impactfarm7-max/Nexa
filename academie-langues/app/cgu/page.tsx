"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, Shield, CreditCard, Users, AlertTriangle, FileText, Mail, Scale, RefreshCw } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    id: "preambule",
    icon: BookOpen,
    title: "Préambule",
    content: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme éducative numérique (ci-après « la Plateforme »), accessible via application web et application mobile, développée et exploitée par NEXA (ci-après « l'Opérateur »), société immatriculée au Registre du Commerce et du Crédit Mobilier RC/YAE/2022/A/1410 de Yaoundé, République du Cameroun.\n\nEn créant un compte ou en utilisant la Plateforme, l'utilisateur reconnaît avoir lu, compris et accepté sans réserve les présentes CGU. L'utilisation de la Plateforme est conditionnée à cette acceptation.`,
  },
  {
    id: "definitions",
    icon: FileText,
    title: "Article 1 – Définitions",
    content: "Aux fins des présentes CGU, les termes suivants ont la signification qui leur est attribuée ci-après :",
    bullets: [
      { term: "« Plateforme »", def: "désigne l'ensemble des services numériques (application web et mobile) proposés par l'Opérateur dans le domaine de l'éducation en ligne." },
      { term: "« Utilisateur »", def: "toute personne physique ou morale qui accède à la Plateforme, qu'il soit étudiant, enseignant, formateur ou représentant d'une entreprise." },
      { term: "« Mineur »", def: "tout apprenant de moins de 18 ans résidant au Cameroun ou dans tout pays où la majorité légale est fixée à un âge supérieur. Les mineurs constituent un public cible de la Plateforme et bénéficient à ce titre de parcours pédagogiques adaptés à leur âge, ainsi que de mesures de protection renforcées." },
      { term: "« Contenu »", def: "désigne tous les cours, vidéos, quiz, évaluations, documents, et tout autre matériel pédagogique disponible sur la Plateforme." },
      { term: "« Compte »", def: "espace personnel créé par l'utilisateur permettant l'accès aux services de la Plateforme." },
      { term: "« Données personnelles »", def: "toute information permettant d'identifier directement ou indirectement un utilisateur, conformément au RGPD et à la loi camerounaise applicable." },
    ],
  },
  {
    id: "acces",
    icon: Users,
    title: "Article 2 – Accès à la Plateforme",
    subsections: [
      {
        title: "2.1 Conditions d'accès",
        content: "La Plateforme est ouverte à tous les utilisateurs, y compris les mineurs, qui constituent un public cible à part entière de l'offre pédagogique. L'accès des mineurs est néanmoins conditionné au consentement explicite et préalable de leur représentant légal (parent ou tuteur), conformément au RGPD et aux normes EdTech applicables.",
        bullets: [
          "Le consentement écrit du représentant légal lors de la création du compte ;",
          "La fourniture d'une adresse email appartenant au représentant légal ;",
          "La vérification de l'identité du représentant légal selon les modalités définies par l'Opérateur.",
        ],
      },
      {
        title: "2.2 Création de compte",
        content: "La création d'un compte nécessite la fourniture d'informations exactes, complètes et à jour. L'utilisateur s'engage à maintenir ces informations actualisées. Tout compte créé avec de fausses informations pourra être suspendu ou supprimé sans préavis.",
      },
      {
        title: "2.3 Sécurité du compte",
        content: "L'utilisateur est seul responsable de la confidentialité de ses identifiants de connexion. Il s'engage à notifier immédiatement l'Opérateur de toute utilisation non autorisée via : contact@iag-academy.com",
      },
    ],
  },
  {
    id: "services",
    icon: BookOpen,
    title: "Article 3 – Services proposés",
    content: "La Plateforme propose les services suivants :",
    bullets: [
      "Accès à des cours en ligne sous format vidéo et documents pédagogiques ;",
      "Réalisation de quiz et d'évaluations pédagogiques ;",
      "Messagerie interne entre utilisateurs dans un cadre strictement éducatif ;",
      "Paiement en ligne pour l'accès à des contenus premium ou des formations payantes.",
    ],
    extra: "L'Opérateur se réserve le droit de modifier, suspendre ou supprimer tout ou partie des services à tout moment, sous réserve d'en informer les utilisateurs dans un délai raisonnable.",
  },
  {
    id: "obligations",
    icon: Shield,
    title: "Article 4 – Obligations de l'utilisateur",
    content: "L'utilisateur s'engage à :",
    bullets: [
      "Utiliser la Plateforme dans un but exclusivement éducatif et licite ;",
      "Ne pas partager, reproduire, distribuer ou revendre les contenus pédagogiques sans autorisation préalable écrite de l'Opérateur ;",
      "Ne pas tenir de propos offensants, discriminatoires, diffamatoires ou contraires à l'ordre public dans la messagerie interne ;",
      "Ne pas utiliser la messagerie à des fins commerciales, de démarchage ou de harcèlement ;",
      "Respecter les droits de propriété intellectuelle de l'Opérateur et des tiers ;",
      "Ne pas tenter de contourner les mesures de sécurité de la Plateforme ;",
      "Signaler tout contenu inapproprié ou illicite à l'Opérateur.",
    ],
  },
  {
    id: "mineurs",
    icon: Users,
    title: "Article 5 – Formation et protection des mineurs",
    content: "La Plateforme intègre nativement la formation des mineurs comme l'un de ses objectifs pédagogiques principaux. Des parcours de formation adaptés à chaque tranche d'âge sont proposés, dans le respect des normes EdTech et des exigences du RGPD :",
    bullets: [
      "Des contenus pédagogiques spécifiquement conçus et validés pour les mineurs sont disponibles, organisés par niveau scolaire et tranche d'âge, en cohérence avec les programmes éducatifs camerounais et les standards internationaux ;",
      "La messagerie interne des comptes mineurs est encadrée et limitée aux échanges avec les enseignants et formateurs certifiés inscrits sur la Plateforme, dans un cadre strictement pédagogique ;",
      "Aucun contenu inapproprié (contenu adulte, violence, etc.) n'est accessible aux comptes mineurs ; tous les contenus font l'objet d'une modération préalable par l'équipe pédagogique de l'Opérateur ;",
      "Le représentant légal dispose d'un tableau de bord dédié lui permettant de suivre en temps réel la progression pédagogique de l'enfant, de consulter les résultats aux évaluations, et de contrôler les accès ;",
      "Des enseignants et formateurs spécialisés dans la pédagogie pour mineurs sont mobilisés sur les parcours dédiés ; l'Opérateur s'assure que ces intervenants disposent des qualifications et des habilitations requises ;",
      "Les paiements relatifs aux formations de mineurs doivent être effectués exclusivement par le représentant légal ; aucune transaction ne peut être initiée directement par un utilisateur mineur.",
    ],
  },
  {
    id: "paiements",
    icon: CreditCard,
    title: "Article 6 – Paiements en ligne",
    content: "Les paiements effectués sur la Plateforme sont sécurisés et traités par des prestataires de paiement agréés (Mobile Money, carte bancaire, etc.). Les transactions sont libellées en Francs CFA (XAF). L'Opérateur ne stocke pas les données bancaires complètes de l'utilisateur.",
    subsections: [
      {
        title: "6.1 Politique de remboursement",
        content: "Sauf dispositions contraires prévues au moment de l'achat, aucun remboursement n'est accordé après l'accès effectif au contenu numérique acheté. Toutefois, l'Opérateur pourra étudier toute demande de remboursement formulée dans les 48 heures suivant l'achat et avant tout accès au contenu.",
      },
    ],
  },
  {
    id: "propriete",
    icon: Shield,
    title: "Article 7 – Propriété intellectuelle",
    content: "L'ensemble des contenus disponibles sur la Plateforme (cours, vidéos, quiz, interface, logo, charte graphique, etc.) sont la propriété exclusive de l'Opérateur ou de ses partenaires et sont protégés par les lois camerounaises et internationales relatives à la propriété intellectuelle. L'utilisateur bénéficie d'un droit d'usage personnel, non exclusif et non transférable des contenus. Toute reproduction, représentation, modification ou exploitation commerciale sans autorisation préalable est strictement interdite.",
  },
  {
    id: "responsabilite",
    icon: AlertTriangle,
    title: "Article 8 – Responsabilité",
    subsections: [
      {
        title: "8.1 Limitation de responsabilité",
        content: "L'Opérateur s'engage à mettre en œuvre tous les moyens nécessaires pour assurer la continuité et la qualité du service. Toutefois, il ne saurait être tenu responsable des interruptions de service liées à des cas de force majeure, des pannes techniques indépendantes de sa volonté, ou des actes de tiers malveillants.",
      },
      {
        title: "8.2 Contenu tiers",
        content: "La Plateforme peut contenir des liens vers des sites ou des contenus tiers. L'Opérateur ne saurait être tenu responsable du contenu, de la qualité ou de la disponibilité de ces ressources externes.",
      },
      {
        title: "8.3 Non-responsabilité quant aux résultats aux examens et concours officiels",
        content: "La Plateforme a pour vocation exclusive de former, accompagner et soutenir les apprenants dans leur parcours éducatif. L'Opérateur met en œuvre tous les moyens pédagogiques dont il dispose pour optimiser les chances de réussite de chaque apprenant.\n\nToutefois, l'Opérateur ne saurait en aucun cas être tenu responsable de l'échec d'un apprenant à un examen officiel, un concours, une certification ou toute autre évaluation organisée par une institution tierce (établissement scolaire, université, organisme public ou privé), et ce, quelle qu'en soit la cause.\n\nEn conséquence, aucune demande de remboursement, d'indemnisation ou de recours fondée sur l'échec à un examen officiel ne pourra être adressée à l'Opérateur. L'utilisateur reconnaît et accepte expressément cette limitation lors de son inscription.",
        highlight: true,
      },
    ],
  },
  {
    id: "resiliation",
    icon: RefreshCw,
    title: "Article 9 – Suspension et résiliation",
    content: "L'Opérateur se réserve le droit de suspendre ou résilier l'accès d'un utilisateur en cas de :",
    bullets: [
      "Violation des présentes CGU ;",
      "Comportement frauduleux ou illicite ;",
      "Non-paiement des sommes dues ;",
      "Fourniture d'informations fausses lors de l'inscription.",
    ],
    extra: "L'utilisateur peut à tout moment désactiver son compte en adressant une demande à contact@iag-academy.com",
  },
  {
    id: "droit",
    icon: Scale,
    title: "Article 10 – Droit applicable et règlement des litiges",
    content: "Les présentes CGU sont soumises au droit camerounais, notamment à la loi N°2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité, ainsi qu'aux règlements de la CEMAC applicables au commerce électronique.\n\nEn cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut d'accord, le litige sera soumis aux juridictions compétentes de Yaoundé, République du Cameroun.",
  },
  {
    id: "modifications",
    icon: RefreshCw,
    title: "Article 11 – Modifications des CGU",
    content: "L'Opérateur se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par notification sur la Plateforme et/ou par email au moins 15 jours avant l'entrée en vigueur des nouvelles conditions.",
  },
  {
    id: "contact",
    icon: Mail,
    title: "Article 12 – Contact",
    content: "Pour toute question relative aux présentes CGU, l'utilisateur peut contacter l'Opérateur :",
    bullets: [
      "Par email : contact@iag-academy.com",
      "Par courrier : BP : 6937, Cameroun",
      "Via le formulaire de contact disponible sur la Plateforme.",
    ],
  },
];

function AccordionItem({ section, index }: { section: typeof sections[0]; index: number }) {
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
              {(section as any).bullets && (
                <ul className="space-y-2">
                  {(section as any).bullets.map((b: any, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
                      {typeof b === "string" ? <span>{b}</span> : <span><strong className="text-slate-800">{b.term}</strong> : {b.def}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {(section as any).extra && <p className="text-slate-500 text-sm italic border-l-2 border-orange-300 pl-3">{(section as any).extra}</p>}
              {(section as any).subsections?.map((sub: any, i: number) => (
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
      <div className="bg-slate-950 sticky top-0 z-10">
  <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
    <Link href="/" className="flex items-center gap-2 bg-slate-800 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
      ← Retour
    </Link>
    <Link href="/politique-confidentialite" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
      Politique de confidentialité →
    </Link>
  </div>
</div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-bold mb-6">
            <FileText size={14} />Document légal
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            Conditions Générales <span className="text-orange-500">d'Utilisation</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">NEXA · Version 1.0 · 10 mars 2026</p>
          <p className="text-slate-400 text-xs mt-1">RCCM : RC/YAE/2022/A/1410 · Conforme RGPD · Loi N°2010/012 du Cameroun</p>
        </motion.div>

        <div>{sections.map((section, index) => <AccordionItem key={section.id} section={section} index={index} />)}</div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 p-6 bg-slate-100 rounded-2xl text-center">
          <p className="text-slate-500 text-sm">
            Contact : <a href="mailto:contact@iag-academy.com" className="text-orange-500 font-bold hover:underline">contact@iag-academy.com</a>
            {" · "}
            <Link href="/politique-confidentialite" className="text-orange-500 font-bold hover:underline">Politique de Confidentialité</Link>
          </p>
          <p className="text-slate-400 text-xs mt-2">NEXA © 2026 · BP : 6937, Yaoundé, Cameroun</p>
        </motion.div>
      </div>
    </div>
  );
}