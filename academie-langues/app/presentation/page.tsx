"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  Building2, ArrowRight,
  Smartphone, ShieldCheck, Sparkles,
  TrendingDown, TrendingUp, Award,
  Headphones, ScrollText, PenTool, Mic, BrainCircuit,
  Mail, Globe, Phone, CreditCard,
} from "lucide-react";
import DemoSection from "./components/DemoSection";
import IPhone17ProMaxMock from "./components/IPhone17ProMaxMock";
import {
  CenterDashboardMock,
  FinanceMock,
  CourseMock,
  ExamMock,
  SimulatorMock,
  CommunityMock,
  LiveMock,
  LibraryMock,
} from "./components/Mockups";
import { BRAND } from "@/app/utils/brand";

const BLUE = BRAND.blue;
const ORANGE = BRAND.orange;
const WHATSAPP = "237621105640";
const CONTACT_EMAIL = "contact@nexa-edu.com";
const SITE_URL = "https://nexa-edu.com";
const PHONE_DISPLAY = "621 10 56 40";
const EASE = [0.22, 1, 0.36, 1] as const;

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

const FLOAT_DOTS = [
  { left: "8%", top: "18%", size: 6, duration: 5 },
  { left: "85%", top: "12%", size: 4, duration: 7 },
  { left: "72%", top: "55%", size: 5, duration: 6 },
  { left: "15%", top: "70%", size: 3, duration: 8 },
  { left: "50%", top: "35%", size: 4, duration: 9 },
];

const AUDIENCES = [
  {
    icon: Building2,
    title: "Espace centre",
    text: "Direction, formateurs et staff pilotent inscriptions, cours, planning, finances et examens depuis un back-office complet. Les apprenants accèdent à leur formation via les identifiants créés par le centre.",
    href: "/ouvrir-centre",
    cta: "Créer un centre",
  },
] as const;

const NAV_SECTIONS = [
  { id: "centre", label: "Dashboard" },
  { id: "finance", label: "Finance" },
  { id: "cours", label: "Cours" },
  { id: "tuteur", label: "IA" },
  { id: "bibliotheque", label: "Bibliothèque" },
  { id: "tcf-canada", label: "Preuve" },
  { id: "pourquoi", label: "Pourquoi" },
  { id: "tarifs", label: "Tarifs" },
];

const WHY_NEXA = [
  {
    icon: TrendingDown,
    title: "Optimisation budgétaire",
    text: "Réduisez les coûts fixes liés à la formation physique : infrastructures, logistique et heures de présentiel multipliées.",
  },
  {
    icon: TrendingUp,
    title: "Croissance illimitée",
    text: "Que vous gériez 50 ou 10 000 apprenants, la plateforme supporte la charge sans surcoût structurel.",
  },
  {
    icon: Award,
    title: "Image institutionnelle",
    text: "Offrez à vos équipes un écosystème digital haut de gamme, rapide et aligné sur les meilleurs standards mondiaux.",
  },
];

const TCF_PILLARS = [
  {
    icon: ScrollText,
    title: "Compréhension écrite",
    prepare: "Lire, analyser et répondre sous la pression du chronomètre.",
    deploy: "80 séries d'entraînement intensives, standardisées et en autonomie complète.",
    stat: "39 Q / série",
  },
  {
    icon: Headphones,
    title: "Compréhension orale",
    prepare: "Comprendre des enregistrements variés, du quotidien au académique.",
    deploy: "Banques audio calibrées TCF avec reprise automatique en cas de coupure.",
    stat: "Audio HD",
  },
  {
    icon: PenTool,
    title: "Expression écrite",
    prepare: "Rédiger des textes structurés, du B2 au C2.",
    deploy: "Mode Zen pour la méthode, mode Examen (mercredi & samedi) en conditions réelles.",
    stat: "Correction IA",
  },
  {
    icon: Mic,
    title: "Expression orale",
    prepare: "Structurer sa parole et tenir une argumentation fluide.",
    deploy: "Simulateur vocal avec examinateur IA, transcription et feedback instantané.",
    stat: "Coach vocal",
  },
];

export default function PresentationPage() {
  const { scrollYProgress } = useScroll();
  const progressWidth = useSpring(useTransform(scrollYProgress, [0, 1], ["0%", "100%"]), {
    stiffness: 120,
    damping: 30,
  });

  const talkToAgent = () =>
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Bonjour NEXA, je souhaite une démo de la plateforme de formation.")}`,
      "_blank",
    );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F7F6] font-sans text-[#0a0a0a] antialiased">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        @keyframes nexa-slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nexa-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>

      {/* Barre de progression scroll */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[60] h-0.5 origin-left"
        style={{ width: progressWidth, backgroundColor: ORANGE }}
      />

      {/* Fond animé */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {FLOAT_DOTS.map((dot, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              backgroundColor: i % 2 === 0 ? `${ORANGE}30` : `${BLUE}20`,
            }}
            animate={{ y: [0, -24, 0], opacity: [0.3, 0.8, 0.3], scale: [1, 1.4, 1] }}
            transition={{ duration: dot.duration, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}
        <motion.div
          className="absolute top-[-15%] right-[-8%] h-[550px] w-[550px] rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle, ${ORANGE}, transparent 70%)` }}
          animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-8%] left-[-12%] h-[480px] w-[480px] rounded-full opacity-[0.05]"
          style={{ background: `radial-gradient(circle, ${BLUE}, transparent 70%)` }}
          animate={{ x: [0, -20, 0], y: [0, 14, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Nav */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#F7F7F6]/85 backdrop-blur-xl"
      >
        <div className="nexa-marketing-shell flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src={BRAND.logo} alt="NEXA" width={40} height={40} className="rounded-lg w-9 h-9 object-cover" />
            <span className="text-lg font-black tracking-tight" style={{ color: BLUE }}>NEXA</span>
          </Link>
          <div className="hidden max-w-[50vw] items-center gap-1 overflow-x-auto md:flex">
            {NAV_SECTIONS.map((s, i) => (
              <motion.a
                key={s.id}
                href={`#${s.id}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                className="whitespace-nowrap px-2 py-1 text-[10px] font-bold text-neutral-400 transition hover:text-neutral-700"
                whileHover={{ y: -2, color: BLUE, scale: 1.05 }}
              >
                {s.label}
              </motion.a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden px-3 py-2 text-[11px] font-bold text-neutral-400 transition hover:text-neutral-700 sm:flex">
              Accueil
            </Link>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/ouvrir-centre"
                className="flex h-10 items-center rounded-xl px-4 text-[11px] font-black text-white transition hover:opacity-90"
                style={{ backgroundColor: ORANGE }}
              >
                Ouvrir un centre
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 nexa-marketing-shell pb-14 pt-12 md:pb-20 md:pt-16">
        <motion.div variants={heroStagger} initial="hidden" animate="show" className="max-w-3xl">
          <motion.p
            variants={heroItem}
            className="mb-4 text-[11px] font-black uppercase tracking-[0.28em]"
            style={{ color: ORANGE }}
          >
            NEXA · L&apos;éducation de demain
          </motion.p>
          <motion.h1
            variants={heroItem}
            className="mb-5 text-[2.15rem] font-black leading-[1.05] tracking-tight sm:text-5xl md:text-[3.25rem]"
            style={{ color: BLUE }}
          >
            Formez 10 fois plus,{" "}
            <motion.span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(90deg, ${ORANGE}, #f59e0b, ${ORANGE})`,
                backgroundSize: "200% auto",
              }}
              animate={{ backgroundPosition: ["0% center", "200% center", "0% center"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            >
              sans recruter 10 fois plus.
            </motion.span>
          </motion.h1>
          <motion.p variants={heroItem} className="mb-3 max-w-2xl text-base font-semibold leading-relaxed text-neutral-700 sm:text-lg">
            La plateforme qui automatise et démultiplie vos capacités de formation.
          </motion.p>
          <motion.p variants={heroItem} className="mb-8 max-w-xl text-[15px] font-medium leading-relaxed text-neutral-500 sm:text-base">
            Pilotez, formez, évaluez et accompagnez à grande échelle — gestion, pédagogie et IA dans un seul espace, pensé pour les centres, écoles et universités.
          </motion.p>
          <motion.div variants={heroItem} className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
            <motion.a
              href="#centre"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 text-[12px] font-black text-white sm:h-12 sm:px-6 sm:text-sm"
              style={{ backgroundColor: BLUE }}
              whileHover={{ scale: 1.04, boxShadow: `0 12px 32px ${BLUE}33` }}
              whileTap={{ scale: 0.97 }}
            >
              Voir la plateforme <ArrowRight size={14} className="shrink-0" />
            </motion.a>
            <motion.button
              type="button"
              onClick={talkToAgent}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border-2 bg-white px-4 text-[12px] font-bold sm:h-12 sm:px-6 sm:text-sm"
              style={{ borderColor: ORANGE, color: ORANGE }}
              whileHover={{ scale: 1.04, backgroundColor: "#fff7f2" }}
              whileTap={{ scale: 0.97 }}
            >
              Demander une démo
            </motion.button>
          </motion.div>
          <motion.div
            variants={heroItem}
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-neutral-400"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={12} style={{ color: ORANGE }} /> Gestion · Formation · IA
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Smartphone size={12} style={{ color: BLUE }} /> App installable · réseau faible
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* Audiences */}
      <section className="relative z-10 border-y border-black/6 bg-white py-16">
        <div className="nexa-marketing-shell">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: ORANGE }}
          >
            Pour qui ?
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mb-10 text-center text-2xl font-black tracking-tight md:text-3xl"
            style={{ color: BLUE }}
          >
            Un espace centre, une plateforme
          </motion.h2>
          <div className="mx-auto grid max-w-lg gap-4">
            {AUDIENCES.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: EASE }}
                whileHover={{ y: -10, scale: 1.02, boxShadow: "0 24px 48px rgba(0,0,0,0.08)" }}
                className="flex flex-col rounded-2xl border border-black/6 p-6 transition-shadow"
                style={{ backgroundColor: `${BLUE}04` }}
              >
                <motion.span
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${BLUE}12` }}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.12 }}
                >
                  <a.icon size={20} style={{ color: BLUE }} />
                </motion.span>
                <h3 className="mb-2 text-lg font-black" style={{ color: BLUE }}>{a.title}</h3>
                <p className="mb-4 flex-1 text-[13px] font-medium leading-relaxed text-neutral-500">{a.text}</p>
                <Link href={a.href} className="text-[12px] font-black hover:underline" style={{ color: ORANGE }}>
                  {a.cta} →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demos */}
      <div className="relative z-10 nexa-marketing-shell space-y-28 py-20">
        <DemoSection
          index={0}
          id="centre"
          eyebrow="Module 01"
          title="Tableau de bord unique pour piloter votre organisation"
          description="Pas besoin d'être expert en informatique. Les décideurs et directeurs disposent d'une vision claire, immédiate et chiffrée de leur investissement."
          bullets={[
            "Contrôle en un coup d'œil : qui étudie, qui stagne, qui a terminé son parcours",
            "Rapports détaillés : notes, exercices effectués, temps de connexion et ROI",
            "Sécurité des accès : droits, validation et blocage des profils en un clic",
            "Vue financière : apprenants soldés vs versements en cours",
            "Suivi du staff enseignant et administratif, avancée des tâches assignées",
            "Cours et devoirs programmés sur plusieurs semaines",
          ]}
          mock={<CenterDashboardMock />}
        />

        <DemoSection
          index={1}
          id="finance"
          eyebrow="Module 02"
          title="Finance et documents officiels"
          description="Encaissez les frais de formation, suivez les échéances et générez reçus, bulletins et attestations aux couleurs de votre centre."
          bullets={[
            "Mobile Money, espèces, virement : saisie simple",
            "Échéanciers et relances automatiques",
            "Reçus, factures, bulletins de paie et attestations personnalisés",
          ]}
          mock={<FinanceMock />}
          reversed
        />

        <DemoSection
          index={2}
          id="cours"
          eyebrow="Module 03"
          title="Cours, devoirs et parcours pédagogiques"
          description="Créez des formations riches avec l'éditeur intégré. Protégez vos contenus et distribuez devoirs et quiz à vos groupes."
          bullets={[
            "Éditeur visuel avec texte, quiz et vidéos",
            "Devoirs ciblés par filière, groupe ou étudiant",
            "Correction assistée par intelligence artificielle",
          ]}
          mock={<CourseMock />}
          demoLink="/demo/cours"
        />

        <DemoSection
          index={3}
          id="examens"
          eyebrow="Module 04"
          title="Examens et évaluations en ligne"
          description="Programmez vos épreuves, convoquez vos apprenants et récupérez les résultats. Reprise automatique en cas de coupure réseau."
          bullets={[
            "QCM, questions ouvertes et devoirs surveillés",
            "Sessions planifiées par le centre",
            "Notes, certificats et relevés générés automatiquement",
          ]}
          mock={<ExamMock />}
          reversed
        />

        <DemoSection
          index={4}
          id="tuteur"
          eyebrow="Module 05"
          title="Intelligence artificielle au service de votre rentabilité"
          description="Le plus grand goulot d'étranglement, c'est le temps passé à corriger. NEXA automatise les processus lourds pour libérer vos formateurs."
          bullets={[
            "Correction instantanée écrite et orale selon les grilles internationales",
            "Le formateur valide et ajoute son commentaire en un clic",
            "Quiz personnalisés générés en fin de semaine selon les lacunes de chaque apprenant",
            "Tuteur IA disponible 24h/24 pour répondre aux questions entre les cours",
          ]}
          mock={<SimulatorMock />}
        />

        <DemoSection
          index={5}
          id="communaute"
          eyebrow="Module 06"
          title="Communauté et messagerie"
          description="Créez le lien entre vos classes : forums par filière, discussions par groupe et messagerie privée sécurisée."
          bullets={[
            "Salons par promotion, groupe ou filière",
            "Messagerie privée entre apprenants et formateurs",
            "Notifications et rappels planifiés",
          ]}
          mock={<CommunityMock />}
          reversed
        />

        <DemoSection
          index={6}
          id="live"
          eyebrow="Module 07"
          title="Sessions live et classes virtuelles"
          description="Animez vos cours à distance comme en salle : visio intégrée, partage d'écran et suivi de présence."
          bullets={[
            "Cours collectifs avec un formateur et toute la classe",
            "Rappels automatiques avant chaque session",
            "Planning formateur synchronisé avec le centre",
          ]}
          mock={<LiveMock />}
        />

        <DemoSection
          index={7}
          id="bibliotheque"
          eyebrow="Module 08"
          title="La Grande Bibliothèque d'Afrique"
          description="Ressources exclusives, assistant IA intégré et documents sécurisés. Vos apprenants accèdent aux livres au programme sans outil externe."
          bullets={[
            "Dictionnaire et traducteur IA activables en un clic",
            "Recherche intelligente dans titres, catégories et contenus",
            "Documents exclusifs protégés (PDF sécurisés, accès premium)",
            "Accès égalitaire aux ressources, même sans moyens d'achat",
          ]}
          mock={<LibraryMock />}
          reversed
        />
      </div>

      {/* Cas TCF Canada */}
      <section id="tcf-canada" className="relative z-10 scroll-mt-24 border-y border-black/6 bg-white py-16 md:py-20">
        <div className="nexa-marketing-shell">
          <div className="mb-10 max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-3 text-[11px] font-black uppercase tracking-[0.3em]"
              style={{ color: ORANGE }}
            >
              Preuve de concept
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="mb-4 text-2xl font-black tracking-tight md:text-3xl"
              style={{ color: BLUE }}
            >
              Le cas TCF Canada : notre démonstration d&apos;excellence
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 }}
              className="font-medium leading-relaxed text-neutral-500"
            >
              Pour prouver la robustesse de notre architecture, nous l&apos;avons appliquée à l&apos;évaluation la plus exigeante du marché linguistique : le TCF Canada, visant les niveaux C1 et C2. NEXA reste une plateforme généraliste — le TCF en est la vitrine technique.
            </motion.p>
          </div>

          {/* 4 épreuves — grille bento */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
            {TCF_PILLARS.map((pillar, i) => (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 28, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
                whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 40px rgba(235,103,14,0.12)" }}
                className="group relative overflow-hidden rounded-2xl border border-black/6 bg-[#FAFAF9] p-5 sm:p-6"
              >
                <motion.div
                  className="absolute top-0 right-0 h-24 w-24 rounded-full opacity-[0.07]"
                  style={{ background: `radial-gradient(circle, ${ORANGE}, transparent 70%)` }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.07, 0.14, 0.07] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "200%" }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
                <div className="relative flex items-start justify-between gap-3 mb-4">
                  <motion.div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${ORANGE}12` }}
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                  >
                    <pillar.icon size={20} style={{ color: ORANGE }} />
                  </motion.div>
                  <motion.span
                    className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider"
                    style={{ color: BLUE, backgroundColor: `${BLUE}08` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 400 }}
                  >
                    {pillar.stat}
                  </motion.span>
                </div>
                <h3 className="relative mb-3 text-base font-black tracking-tight" style={{ color: BLUE }}>
                  {pillar.title}
                </h3>
                <div className="relative space-y-3">
                  <div>
                    <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-neutral-400">L&apos;apprenant prépare</p>
                    <p className="text-[12px] font-medium leading-relaxed text-neutral-600">{pillar.prepare}</p>
                  </div>
                  <div className="h-px bg-black/6" />
                  <div>
                    <p className="mb-1 text-[9px] font-black uppercase tracking-wider" style={{ color: ORANGE }}>NEXA déploie</p>
                    <p className="text-[12px] font-medium leading-relaxed text-neutral-700">{pillar.deploy}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Bandeau IA */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
            whileHover={{ scale: 1.01, y: -4 }}
            className="relative overflow-hidden rounded-2xl border shadow-lg"
            style={{ borderColor: `${BLUE}15`, background: `linear-gradient(135deg, ${BLUE} 0%, #1B3370 100%)` }}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
            />
            <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <motion.div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"
                  animate={{ boxShadow: ["0 0 0 0 rgba(251,146,60,0.4)", "0 0 0 12px rgba(251,146,60,0)", "0 0 0 0 rgba(251,146,60,0)"] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                    <BrainCircuit size={22} className="text-orange-400" />
                  </motion.div>
                </motion.div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mb-1">Intelligence artificielle</p>
                  <h3 className="text-lg font-black text-white mb-2">L&apos;impact de l&apos;IA après chaque simulation</h3>
                  <p className="max-w-xl text-[13px] font-medium leading-relaxed text-white/70">
                    Score prédictif immédiat et rapport d&apos;audit complet selon les critères officiels du CECRL : erreurs exactes, suggestions de correction et pistes de progression téléchargeables.
                  </p>
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.05, x: 4 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/demo/comprehension-ecrite"
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-white px-5 py-3 text-sm font-black transition hover:bg-orange-50 sm:self-center"
                  style={{ color: BLUE }}
                >
                  Essayer la démo <ArrowRight size={16} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pourquoi NEXA */}
      <section id="pourquoi" className="relative z-10 scroll-mt-24 py-16 md:py-20">
        <div className="nexa-marketing-shell">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: ORANGE }}
          >
            Avantages
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mb-10 text-center text-2xl font-black tracking-tight md:text-3xl"
            style={{ color: BLUE }}
          >
            Pourquoi choisir NEXA ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-10 max-w-2xl text-center text-[13px] font-medium leading-relaxed text-neutral-500 sm:text-sm"
          >
            Moins de temps perdu sur l&apos;administratif. Plus de capacité pour former — avec un standard d&apos;exigence constant, de 10 à plusieurs milliers d&apos;apprenants.
          </motion.p>
          <div className="grid gap-4 md:grid-cols-3">
            {WHY_NEXA.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.55, ease: EASE }}
                whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 44px rgba(17,34,78,0.1)" }}
                className="rounded-2xl border border-black/6 bg-white p-6"
              >
                <motion.span
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${BLUE}10` }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2.2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ rotate: 360, scale: 1.15 }}
                >
                  <item.icon size={20} style={{ color: i === 1 ? ORANGE : BLUE }} />
                </motion.span>
                <h3 className="mb-2 text-base font-black" style={{ color: BLUE }}>{item.title}</h3>
                <p className="text-[13px] font-medium leading-relaxed text-neutral-500">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="relative z-10 border-y border-black/6 bg-white py-16">
        <div className="nexa-marketing-shell grid items-center gap-10 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: ORANGE }}>
              Mobile et terrain
            </p>
            <h2 className="mb-4 text-2xl font-black tracking-tight md:text-3xl" style={{ color: BLUE }}>
              Une app qui s&apos;installe. Même en réseau faible.
            </h2>
            <p className="mb-6 font-medium leading-relaxed text-neutral-500">
              Application installable sur téléphone, code PIN de sécurité, notifications et accès pensés pour le terrain. Vos apprenants avancent sans dépendre d&apos;une connexion parfaite.
            </p>
            <div className="flex flex-row flex-nowrap items-center gap-1.5 sm:gap-2">
              {[Smartphone, ShieldCheck].map((Icon, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.1 }}
                  whileHover={{ y: -3 }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-black/6 bg-neutral-50 px-2 py-1.5 text-[10px] font-bold whitespace-nowrap sm:gap-2 sm:px-3 sm:py-2 sm:text-[11px]"
                >
                  <Icon size={13} className="shrink-0 sm:h-3.5 sm:w-3.5" style={{ color: i ? BLUE : ORANGE }} />
                  {i === 0 ? "PWA installable" : "Sécurisé par code PIN"}
                </motion.span>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 2 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: EASE }}
            className="flex justify-center md:justify-end"
          >
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [0, 1, -1, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.03 }}
            >
              <IPhone17ProMaxMock />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Tarifs — rubrique réservée */}
      <section id="tarifs" className="relative z-10 scroll-mt-24 py-16 md:py-20">
        <div className="nexa-marketing-shell">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: ORANGE }}
          >
            Tarification
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mb-4 text-center text-2xl font-black tracking-tight md:text-3xl"
            style={{ color: BLUE }}
          >
            Des offres adaptées à votre structure
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="mx-auto mb-10 max-w-xl text-center text-[13px] font-medium leading-relaxed text-neutral-500"
          >
            La grille tarifaire est en cours de finalisation. Contactez-nous pour une proposition sur mesure selon votre taille et vos programmes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.55, ease: EASE }}
            className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-dashed border-black/15 bg-white p-8 text-center sm:p-12"
          >
            <motion.span
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${ORANGE}12` }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <CreditCard size={26} style={{ color: ORANGE }} />
            </motion.span>
            <p className="mb-2 text-lg font-black" style={{ color: BLUE }}>
              Bientôt disponible
            </p>
            <p className="mb-6 text-[13px] font-medium leading-relaxed text-neutral-500">
              Centres · Écoles · Universités · Formateurs indépendants — une offre claire arrivera ici. En attendant, une démo et un devis personnalisé sur simple demande.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <motion.a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Demande de tarification NEXA")}`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-[12px] font-black text-white"
                style={{ backgroundColor: BLUE }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Mail size={14} /> {CONTACT_EMAIL}
              </motion.a>
              <motion.button
                type="button"
                onClick={talkToAgent}
                className="inline-flex h-11 items-center rounded-2xl border-2 bg-white px-5 text-[12px] font-bold"
                style={{ borderColor: ORANGE, color: ORANGE }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                WhatsApp
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 w-full py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: EASE }}
            whileHover={{ y: -6, boxShadow: "0 28px 56px rgba(0,0,0,0.1)" }}
            className="relative mx-auto w-full overflow-hidden rounded-3xl border border-black/6 bg-white p-8 text-center shadow-xl sm:p-12 md:p-14"
          >
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-orange-50/50 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 5, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
            />
            <div className="relative mx-auto flex w-full max-w-xl flex-col items-center">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: ORANGE }}>
                NEXA · L&apos;éducation de demain
              </p>
              <h2 className="mb-3 text-xl font-black leading-snug tracking-tight sm:mb-4 sm:text-2xl md:text-3xl" style={{ color: BLUE }}>
                Prêt à démultiplier
                <span className="mt-1 block" style={{ color: ORANGE }}>votre capacité de formation ?</span>
              </h2>
              <p className="mb-6 max-w-md text-sm font-medium leading-relaxed text-neutral-500 sm:mb-8 sm:text-base">
                Demandez une démonstration personnalisée. Yaoundé · Cameroun.
              </p>
              <div className="mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] font-bold text-neutral-500">
                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-1.5 transition hover:opacity-80" style={{ color: BLUE }}>
                  <Mail size={13} /> {CONTACT_EMAIL}
                </a>
                <a href={`tel:+237${PHONE_DISPLAY.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 transition hover:opacity-80">
                  <Phone size={13} style={{ color: ORANGE }} /> {PHONE_DISPLAY}
                </a>
                <a href={SITE_URL} className="inline-flex items-center gap-1.5 transition hover:opacity-80" target="_blank" rel="noreferrer">
                  <Globe size={13} style={{ color: BLUE }} /> nexa-edu.com
                </a>
              </div>
              <div className="flex w-full flex-row flex-wrap items-center justify-center gap-3">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/ouvrir-centre"
                    className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl px-6 text-sm font-black text-white transition hover:opacity-95"
                    style={{ backgroundColor: ORANGE }}
                  >
                    Demander un espace centre
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <button
                    type="button"
                    onClick={talkToAgent}
                    className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border-2 bg-white px-6 text-sm font-bold transition hover:bg-neutral-50"
                    style={{ borderColor: BLUE, color: BLUE }}
                  >
                    Démo WhatsApp
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-t border-black/6 bg-white py-8 sm:py-10"
      >
        <div className="nexa-marketing-shell flex flex-col items-center gap-5 sm:gap-6 md:flex-row md:justify-between">
          <Link href="/" className="flex shrink-0 flex-col items-center gap-0.5 sm:items-start">
            <span className="flex items-center gap-2">
              <Image src={BRAND.logo} alt="" width={28} height={28} className="rounded-lg object-cover" aria-hidden />
              <span className="text-sm font-black" style={{ color: BLUE }}>NEXA</span>
            </span>
            <span className="text-[10px] font-bold text-neutral-400">L&apos;éducation de demain</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-neutral-400">
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition hover:text-neutral-700">{CONTACT_EMAIL}</a>
            <a href={SITE_URL} className="transition hover:text-neutral-700" target="_blank" rel="noreferrer">nexa-edu.com</a>
            <Link href="/ouvrir-centre" className="transition hover:text-neutral-700">Ouvrir un centre</Link>
            <a href="#tarifs" className="transition hover:text-neutral-700">Tarifs</a>
          </nav>
          <p className="shrink-0 text-[10px] font-bold text-neutral-300">© {new Date().getFullYear()} NEXA · Yaoundé</p>
        </div>
      </motion.footer>
    </div>
  );
}
