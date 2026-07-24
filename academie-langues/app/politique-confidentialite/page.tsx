"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Shield, Database, Users, Globe, Clock, Cookie, Eye, Lock, Bell, Mail, FileText } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    id: "preambule",
    icon: Shield,
    title: "Préambule",
    content: `La présente Politique de Confidentialité décrit la manière dont NEXA (ci-après « l'Opérateur »), en qualité de responsable de traitement, collecte, utilise, conserve et protège les données personnelles des utilisateurs de sa plateforme éducative numérique.\n\nL'Opérateur s'engage à traiter vos données personnelles dans le strict respect du Règlement Général sur la Protection des Données (RGPD – UE 2016/679), de la loi camerounaise N°2010/012 du 21 décembre 2010, ainsi que des normes sectorielles EdTech applicables à la protection des données des apprenants.`,
  },
  {
    id: "responsable",
    icon: Users,
    title: "Article 1 – Responsable du traitement",
    content: "NEXA, immatriculée sous le numéro RC/YAE/2022/A/1410, dont le siège social est à Yaoundé – Cameroun, face au stade Sapeur Mimboman, est le responsable du traitement de vos données personnelles.",
    extra: "Délégué à la Protection des Données (DPO) : MBOUZEKO MAFOUO ELISEE LEO · Contact : eliseeleo@yahoo.ca",
  },
  {
    id: "donnees",
    icon: Database,
    title: "Article 2 – Données collectées",
    subsections: [
      {
        title: "2.1 Lors de la création du compte",
        bullets: [
          "Nom et prénom(s)",
          "Adresse email",
          "Numéro de téléphone (optionnel)",
          "Date de naissance (pour vérifier l'âge et appliquer les protections applicables aux mineurs)",
          "Rôle sur la Plateforme (étudiant, enseignant, formateur, représentant d'entreprise)",
          "Pour les mineurs : informations du représentant légal (nom, email, consentement)",
        ],
      },
      {
        title: "2.2 Lors de l'utilisation",
        bullets: [
          "Données de navigation et d'activité (pages visitées, temps de connexion, progression pédagogique)",
          "Résultats aux quiz et évaluations",
          "Contenu des échanges via la messagerie interne",
          "Données de paiement (traitées par notre prestataire sécurisé — nous ne conservons pas les données bancaires complètes)",
          "Adresse IP, type d'appareil et système d'exploitation",
          "Cookies et traceurs (voir Article 8)",
        ],
      },
      {
        title: "2.3 Données que nous ne collectons pas",
        content: "L'Opérateur ne collecte pas de données biométriques, de données génétiques, ni de données sensibles (origines ethniques, opinions politiques, croyances religieuses, données de santé) sauf obligation légale expresse ou consentement explicite de l'utilisateur.",
      },
    ],
  },
  {
    id: "bases",
    icon: FileText,
    title: "Article 3 – Bases légales du traitement",
    content: "Conformément au RGPD, chaque traitement de données repose sur une base légale spécifique :",
    bullets: [
      "Exécution du contrat : création et gestion de votre compte, fourniture des services éducatifs, traitement des paiements.",
      "Consentement : envoi de communications marketing, utilisation de cookies non essentiels, traitement des données des mineurs.",
      "Intérêt légitime : amélioration de la Plateforme, prévention des fraudes, sécurité du service.",
      "Obligation légale : conservation des données de transaction conformément à la législation fiscale camerounaise.",
    ],
  },
  {
    id: "finalites",
    icon: Eye,
    title: "Article 4 – Finalités du traitement",
    content: "Vos données personnelles sont traitées aux fins suivantes :",
    bullets: [
      "Création, gestion et sécurisation de votre compte utilisateur ;",
      "Fourniture des services pédagogiques (cours, quiz, évaluations, messagerie) ;",
      "Personnalisation de l'expérience d'apprentissage ;",
      "Traitement des paiements et gestion des abonnements ;",
      "Communication avec les utilisateurs (assistance, notifications pédagogiques) ;",
      "Amélioration continue de la Plateforme par analyse des données d'usage (anonymisées) ;",
      "Respect des obligations légales et réglementaires ;",
      "Prévention et détection des fraudes et usages abusifs.",
    ],
  },
  {
    id: "mineurs",
    icon: Users,
    title: "Article 5 – Traitement des données des mineurs apprenants",
    content: "Les mineurs constituent un public apprenant à part entière de la Plateforme. Le traitement de leurs données personnelles fait l'objet d'une attention particulière, conformément au RGPD (Article 8), aux standards EdTech internationaux (COPPA, FERPA) :",
    bullets: [
      "Le consentement du représentant légal est obligatoire et vérifié avant tout traitement des données d'un mineur ;",
      "Les données des mineurs ne sont jamais partagées avec des tiers à des fins commerciales ou publicitaires ;",
      "Les données issues de la messagerie des mineurs sont conservées uniquement à des fins pédagogiques et de sécurité ; les mineurs ne peuvent être contactés que par leurs enseignants certifiés inscrits sur la Plateforme ;",
      "Les données pédagogiques des mineurs (résultats, progression, temps de connexion) sont partagées automatiquement et en temps réel avec le représentant légal via son espace dédié ;",
      "La suppression du compte d'un mineur entraîne la suppression immédiate et définitive de toutes ses données personnelles ;",
      "Les données collectées auprès des mineurs peuvent être utilisées, sous forme anonymisée et agrégée, pour améliorer les parcours pédagogiques ; en aucun cas elles ne sont utilisées à des fins de profilage commercial, de publicité ciblée ou de revente à des tiers.",
    ],
    highlight: true,
  },
  {
    id: "partage",
    icon: Globe,
    title: "Article 6 – Partage et transfert des données",
    subsections: [
      { title: "6.1 Destinataires internes", content: "Vos données sont accessibles uniquement aux membres du personnel de l'Opérateur ayant besoin d'y accéder dans le cadre de leurs fonctions (équipes technique, pédagogique et support)." },
      {
        title: "6.2 Prestataires tiers",
        content: "L'Opérateur peut partager certaines données avec des sous-traitants choisis avec soin :",
        bullets: [
          "Prestataires d'hébergement et de cloud computing (serveurs sécurisés) ;",
          "Prestataires de paiement agréés (ex. : Orange Money, MTN MoMo, prestataires de paiement par carte) ;",
          "Outils d'analyse d'usage (données anonymisées uniquement).",
        ],
      },
      { title: "6.3 Transferts internationaux", content: "Si des données sont transférées en dehors du Cameroun ou de l'Union Européenne, l'Opérateur s'assure que ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types, décision d'adéquation ou consentement explicite)." },
      { title: "6.4 Données non partagées", content: "L'Opérateur ne vend, ne loue ni ne commercialise jamais vos données personnelles à des tiers." },
    ],
  },
  {
    id: "conservation",
    icon: Clock,
    title: "Article 7 – Durée de conservation des données",
    bullets: [
      "Données de compte actif : conservées pendant toute la durée de la relation contractuelle.",
      "Données après clôture du compte : supprimées sous 30 jours, sauf obligations légales contraires.",
      "Données de paiement et transactions : conservées 10 ans conformément à la législation fiscale camerounaise.",
      "Données de navigation et cookies : conservées au maximum 13 mois.",
      "Données des mineurs : supprimées immédiatement sur demande du représentant légal ou à la clôture du compte.",
    ],
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Article 8 – Cookies et traceurs",
    content: "La Plateforme utilise des cookies pour assurer son bon fonctionnement et améliorer l'expérience utilisateur :",
    bullets: [
      "Cookies essentiels : nécessaires au fonctionnement de la Plateforme (authentification, sécurité). Pas de consentement requis.",
      "Cookies analytiques : permettent de mesurer l'audience et d'analyser l'utilisation (données anonymisées). Soumis à consentement.",
      "Cookies de préférences : mémorisent vos préférences linguistiques et d'affichage. Soumis à consentement.",
    ],
    extra: "Vous pouvez à tout moment modifier vos préférences via le panneau de gestion des cookies accessible depuis la Plateforme.",
  },
  {
    id: "droits",
    icon: Shield,
    title: "Article 9 – Vos droits",
    content: "Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :",
    bullets: [
      "Droit d'accès : obtenir une copie de vos données personnelles que nous détenons.",
      "Droit de rectification : corriger vos données inexactes ou incomplètes.",
      "Droit à l'effacement (« droit à l'oubli ») : demander la suppression de vos données.",
      "Droit à la limitation du traitement : suspendre temporairement l'utilisation de vos données.",
      "Droit à la portabilité : recevoir vos données dans un format structuré et lisible par machine.",
      "Droit d'opposition : vous opposer à certains traitements, notamment à des fins de prospection.",
      "Droit de retirer votre consentement à tout moment.",
    ],
    extra: "Pour exercer ces droits, contactez-nous : eliseeleo@yahoo.ca — Nous répondrons dans un délai maximum de 30 jours.",
  },
  {
    id: "securite",
    icon: Lock,
    title: "Article 10 – Sécurité des données",
    content: "L'Opérateur met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :",
    bullets: [
      "Chiffrement des données en transit (protocole HTTPS/TLS) et au repos ;",
      "Contrôle d'accès strict aux données (authentification multi-facteurs pour les administrateurs) ;",
      "Audits de sécurité réguliers et tests d'intrusion ;",
      "Plan de réponse aux incidents et notification des violations dans les délais légaux (72 heures pour le RGPD) ;",
      "Formation du personnel aux bonnes pratiques en matière de protection des données.",
    ],
  },
  {
    id: "modifications",
    icon: Bell,
    title: "Article 11 – Modifications de la politique",
    content: "L'Opérateur peut être amené à modifier la présente Politique de Confidentialité pour refléter les évolutions légales, réglementaires ou technologiques. Toute modification substantielle sera communiquée aux utilisateurs par notification sur la Plateforme et/ou par email au moins 15 jours avant son entrée en vigueur.",
  },
  {
    id: "contact",
    icon: Mail,
    title: "Article 12 – Contact et DPO",
    content: "Pour toute question relative à la présente Politique de Confidentialité ou à l'exercice de vos droits, contactez notre Délégué à la Protection des Données :",
    bullets: [
      "DPO : MBOUZEKO MAFOUO ELISEE LEO",
      "Email : eliseeleo@yahoo.ca",
      "Adresse : BP : 6937, Yaoundé, Cameroun — face au stade Sapeur Mimboman",
      "Via le formulaire de contact disponible dans la rubrique « Confidentialité » de la Plateforme",
    ],
  },
];

function AccordionItem({ section, index }: { section: typeof sections[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.4 }}
      className={`border rounded-2xl overflow-hidden mb-3 shadow-sm hover:shadow-md transition-shadow ${(section as any).highlight ? "border-orange-200 bg-orange-50/30" : "border-slate-200 bg-white"}`}
    >
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left group">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${(section as any).highlight ? "bg-orange-100 group-hover:bg-orange-200" : "bg-orange-50 group-hover:bg-orange-100"}`}>
            <Icon size={18} className="text-orange-500" />
          </div>
          <span className="font-semibold text-slate-800 text-sm md:text-base">{section.title}</span>
          {(section as any).highlight && <span className="hidden md:inline text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">Protection mineurs</span>}
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
                  {(section as any).bullets.map((b: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" /><span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {(section as any).extra && <p className="text-slate-500 text-sm italic border-l-2 border-orange-300 pl-3">{(section as any).extra}</p>}
              {(section as any).subsections?.map((sub: any, i: number) => (
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/10 to-slate-50">
      <div className="bg-slate-950 sticky top-0 z-10">
  <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
    <Link href="/" className="flex items-center gap-2 bg-slate-800 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
      ← Retour
    </Link>
    <Link href="/cgu" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95">
      ← Voir les CGU
    </Link>
  </div>
</div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-bold mb-6">
            <Shield size={14} />Protection des données
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            Politique de <span className="text-orange-500">Confidentialité</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">NEXA · Version 1.0 · 10 mars 2026</p>
          <p className="text-slate-400 text-xs mt-1">Conforme RGPD · Loi N°2010/012 du Cameroun · COPPA · FERPA</p>
        </motion.div>

        <div>{sections.map((section, index) => <AccordionItem key={section.id} section={section} index={index} />)}</div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 p-6 bg-slate-100 rounded-2xl text-center">
          <p className="text-slate-500 text-sm">
            DPO : <a href="mailto:eliseeleo@yahoo.ca" className="text-orange-500 font-bold hover:underline">eliseeleo@yahoo.ca</a>
            {" · "}
            <Link href="/cgu" className="text-orange-500 font-bold hover:underline">CGU</Link>
          </p>
          <p className="text-slate-400 text-xs mt-2">NEXA © 2026 · BP : 6937, Yaoundé, Cameroun · face au stade Sapeur Mimboman</p>
        </motion.div>
      </div>
    </div>
  );
}