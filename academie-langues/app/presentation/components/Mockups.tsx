"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Calendar, ClipboardList, Wallet, Copy,
  LayoutDashboard, GraduationCap, Flag, BookOpen, Lock,
  ArrowLeft, Search, Crown, BookMarked, Languages, FileText,
  PenTool, ScrollText, MessageCircle, Video,
} from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

function Frame({
  children,
  title,
  embedded = false,
}: {
  children: React.ReactNode;
  title?: string;
  /** Flat fill for scroll showcase — no motion offset / chrome that clips */
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className="h-full w-full min-h-0 min-w-0 overflow-hidden bg-white flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl border border-black/8 bg-white overflow-hidden shadow-xl"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.01, boxShadow: "0 28px 56px rgba(17,34,78,0.12)" }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/6 bg-neutral-50">
        {[
          { color: "bg-red-400", delay: 0 },
          { color: "bg-amber-400", delay: 0.3 },
          { color: "bg-emerald-400", delay: 0.6 },
        ].map((dot) => (
          <motion.span
            key={dot.color}
            className={`w-2.5 h-2.5 rounded-full ${dot.color}`}
            animate={{ opacity: [1, 0.45, 1], scale: [1, 0.9, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: dot.delay }}
          />
        ))}
        {title && (
          <motion.span
            className="ml-2 text-[10px] font-bold text-neutral-400 truncate"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {title}
          </motion.span>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <motion.div
      className="flex justify-between items-center gap-1"
      initial={{ opacity: 0, x: -6 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      whileHover={{ x: 2 }}
    >
      <span className="text-[7px] sm:text-[8px] text-neutral-500 leading-tight">{label}</span>
      <motion.span
        className="text-[9px] sm:text-[10px] font-black shrink-0"
        style={{ color: accent || BLUE }}
        initial={{ scale: 0.8 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 400, damping: 14 }}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}

function DashCard({
  title,
  icon: Icon,
  iconBg,
  iconColor,
  children,
  footer,
}: {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <motion.div
      className="rounded-xl border border-neutral-200 bg-white p-2 sm:p-2.5 shadow-sm"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.05)" }}
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className={`p-1 sm:p-1.5 rounded-lg border ${iconBg}`}>
          <Icon size={11} className={iconColor} style={iconColor.startsWith("#") ? { color: iconColor } : undefined} />
        </div>
      </div>
      <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-neutral-400 mb-1.5">{title}</p>
      <div className="space-y-1">{children}</div>
      {footer}
    </motion.div>
  );
}

export function CenterDashboardMock({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const [totalStudents, setTotalStudents] = useState(0);
  useEffect(() => {
    const target = 248;
    const id = setInterval(() => {
      setTotalStudents((v) => (v < target ? Math.min(v + 12, target) : v));
    }, 70);
    return () => clearInterval(id);
  }, []);

  const sidebarItems = [
    { icon: LayoutDashboard, active: true },
    { icon: GraduationCap, active: false },
    { icon: Users, active: false },
    { icon: Flag, active: false },
    { icon: ClipboardList, active: false },
    { icon: Wallet, active: false },
  ];

  return (
    <Frame title="nexa.app/centre/dashboard" embedded={embedded}>
      <div className={`flex bg-[#FAFAFA] min-w-0 ${embedded ? "h-full min-h-0" : "min-h-[320px] sm:min-h-[360px]"}`}>
        {/* Sidebar centre (orange) */}
        <div
          className="w-10 sm:w-12 shrink-0 flex flex-col items-center py-2 gap-1.5 border-r border-black/10"
          style={{ background: `linear-gradient(180deg, ${ORANGE} 0%, #c25010 100%)` }}
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/15 mb-1" />
          {sidebarItems.map(({ icon: Icon, active }, i) => (
            <div
              key={i}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${active ? "bg-[#11224E] shadow-sm" : "bg-white/10"}`}
            >
              <Icon size={12} className="text-white" />
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0 p-2 sm:p-3 overflow-hidden">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wide text-neutral-400 truncate">
                {t("marketing", "presentationMockInstituteLabel")}
              </p>
              <h3 className="text-[11px] sm:text-[13px] font-black truncate" style={{ color: BLUE }}>
                {t("marketing", "presentationMockGreeting")}
              </h3>
            </div>
            <div className="shrink-0 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-1.5 py-1 text-[7px] sm:text-[8px] font-bold" style={{ color: BLUE }}>
              <Copy size={9} />
              <span className="hidden sm:inline">{t("marketing", "presentationMockRegistrationLink")}</span>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1 mb-2">
            <p className="text-[6px] sm:text-[7px] font-bold uppercase tracking-wide text-amber-800 leading-snug">
              {t("marketing", "presentationMockPendingActivation")}
            </p>
          </div>

          {/* 4 cartes KPI */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <DashCard title={t("marketing", "presentationMockStudentsTitle")} icon={Users} iconBg="bg-blue-50 border-blue-100" iconColor="text-blue-600">
              <MiniStat label={t("marketing", "presentationMockEnrolledToday")} value="3" />
              <MiniStat label={t("marketing", "presentationMockThisWeek")} value="18" />
              <MiniStat label={t("marketing", "presentationMockInactive3d")} value="5" />
              <MiniStat label={t("marketing", "presentationMockActiveOnCourse")} value="142" accent="#059669" />
              <div className="mt-1.5 pt-1.5 border-t border-neutral-100 flex justify-between items-center">
                <span className="text-[7px] font-bold text-neutral-400">{t("marketing", "presentationMockTotal")}</span>
                <span className="text-sm font-black" style={{ color: BLUE }}>{totalStudents}</span>
              </div>
            </DashCard>

            <DashCard title={t("marketing", "presentationMockDailyPlanning")} icon={Calendar} iconBg="bg-purple-50 border-purple-100" iconColor="text-purple-600">
              <MiniStat label={t("marketing", "presentationMockPlannedCourses")} value="2" />
              <MiniStat label={t("marketing", "presentationMockLiveSessions")} value="1" />
              <div className="mt-1.5 rounded-lg bg-purple-50/80 p-1.5 text-center">
                <p className="text-[7px] text-purple-700 font-bold">{t("marketing", "presentationMockNextLiveAt3pm")}</p>
              </div>
            </DashCard>

            <DashCard title={t("marketing", "presentationMockExamsTitle")} icon={ClipboardList} iconBg="bg-orange-50 border-orange-100" iconColor={ORANGE}>
              <MiniStat label={t("marketing", "presentationMockScheduled")} value="4" />
              <div className="mt-1.5 rounded-lg bg-neutral-50 p-1.5 text-center">
                <p className="text-[7px] text-neutral-400 font-bold">{t("marketing", "presentationMockContinuousAssessmentFriday")}</p>
              </div>
            </DashCard>

            <DashCard title={t("marketing", "presentationMockFinanceTitle")} icon={Wallet} iconBg="bg-emerald-50 border-emerald-100" iconColor="text-emerald-600">
              <MiniStat label={t("marketing", "presentationMockCollectedToday")} value="425 000 F" accent="#059669" />
              <div className="mt-1.5 pt-1.5 border-t border-neutral-100 flex justify-between items-center">
                <span className="text-[7px] font-bold text-red-500">{t("marketing", "presentationMockOverdue")}</span>
                <span className="text-[9px] font-black text-red-600">2</span>
              </div>
            </DashCard>
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function FinanceMock() {
  const { t } = useI18n();
  const rows = [
    { name: "Amina K.", amount: "85 000", status: t("marketing", "presentationMockPaid"), color: "emerald" },
    { name: "Jean-Paul M.", amount: "42 500", status: t("marketing", "presentationMockPartial"), color: "amber" },
    { name: "Fatou D.", amount: "85 000", status: t("marketing", "presentationMockOverdue"), color: "red" },
  ];
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => (v < rows.length ? v + 1 : v)), 900);
    return () => clearInterval(id);
  }, [rows.length]);

  return (
    <Frame title="nexa.app/centre/finance">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-[11px] font-black" style={{ color: BLUE }}>{t("marketing", "presentationMockFinanceHeader")}</p>
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: ORANGE }}>{t("marketing", "presentationMockReceiptPdf")}</span>
        </div>
        <div className="space-y-2">
          {rows.slice(0, visible).map((r, i) => (
            <div
              key={r.name}
              className="flex items-center justify-between rounded-xl border border-black/6 px-3 py-2.5 animate-in"
              style={{ animation: "nexa-slide-in 0.4s ease-out", animationDelay: `${i * 100}ms` }}
            >
              <div>
                <p className="text-[11px] font-black text-neutral-800">{r.name}</p>
                <p className="text-[9px] text-neutral-400">{t("marketing", "presentationMockMobileMoneyInstallment")}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black" style={{ color: BLUE }}>{r.amount} FCFA</p>
                <p className={`text-[9px] font-bold ${r.color === "emerald" ? "text-emerald-600" : r.color === "amber" ? "text-amber-600" : "text-red-500"}`}>{r.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function ExamMock() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setProgress((p) => (p < 72 ? p + 2 : p)), 120);
    return () => clearInterval(id);
  }, []);

  return (
    <Frame title="nexa.app/centre/examens">
      <div className="p-4">
        <div className="flex justify-between mb-3">
          <p className="text-[11px] font-black" style={{ color: BLUE }}>Évaluation en ligne, session en cours</p>
          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-neutral-100">45:00</span>
        </div>
        <div className="rounded-xl border border-black/6 p-3 mb-3">
          <p className="text-[10px] font-bold text-neutral-500 mb-1">Management · Q. 8/15</p>
          <p className="text-[11px] text-neutral-700 leading-relaxed">
            Quelle est la première étape d&apos;un plan de formation efficace ?
          </p>
          <div className="mt-3 space-y-1.5">
            {[
              "A. Analyser les besoins",
              "B. Choisir la salle",
              "C. Imprimer les supports",
              "D. Fixer les horaires",
            ].map((opt, i) => (
              <div key={opt} className={`rounded-lg px-3 py-2 text-[10px] font-medium border ${i === 1 ? "border-orange-300 bg-orange-50" : "border-black/6"}`}>
                {opt}
              </div>
            ))}
          </div>
        </div>
        <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: ORANGE }} />
        </div>
        <p className="text-[9px] text-neutral-400 mt-1.5 text-right">{progress}% complété · reprise auto si coupure</p>
      </div>
    </Frame>
  );
}

export function SimulatorMock() {
  const [chars, setChars] = useState(0);
  const correction = "Bonne analyse. Pensez à illustrer votre réponse avec un exemple concret du module 3.";
  useEffect(() => {
    const id = setInterval(() => setChars((c) => (c < correction.length ? c + 2 : c)), 40);
    return () => clearInterval(id);
  }, [correction.length]);

  return (
    <Frame title="nexa.app/tuteur">
      <div className="p-4">
        <p className="text-[11px] font-black mb-2" style={{ color: BLUE }}>Tuteur IA · Correction écrite & orale</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl border border-black/6 p-2.5 bg-neutral-50">
            <p className="text-[9px] font-bold text-neutral-400 mb-1">Réponse étudiante</p>
            <p className="text-[10px] text-neutral-600 leading-relaxed">Un plan de formation commence par l&apos;identification des compétences visées…</p>
          </div>
          <div className="rounded-xl border p-2.5" style={{ borderColor: `${ORANGE}40`, backgroundColor: `${ORANGE}08` }}>
            <p className="text-[9px] font-bold mb-1" style={{ color: ORANGE }}>Feedback NEXA</p>
            <p className="text-[10px] text-neutral-700 leading-relaxed">{correction.slice(0, chars)}<span className="animate-pulse">|</span></p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["Note 14/20", "Grille CECRL ✓", "Quiz vendredi ⚡", "Validation formateur"].map((tag) => (
            <span key={tag} className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white border border-black/6">{tag}</span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function CommunityMock({ embedded = false }: { embedded?: boolean }) {
  const messages = [
    { user: "Formateur A.", text: "Rappel : devoir de management pour vendredi", delay: 0 },
    { user: "Marie L.", text: "Merci ! Question sur le module 4", delay: 400 },
    { user: "NEXA Bot", text: "Consultez le chapitre sur l'évaluation des compétences", delay: 800 },
    { user: "Paul K.", text: "Je partage mon plan de révision pour l'examen", delay: 1200 },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setShown((s) => (s < messages.length ? s + 1 : s)), 1200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <Frame title="nexa.app/communaute" embedded={embedded}>
      <div
        className={`w-full max-w-full overflow-hidden flex bg-gradient-to-br from-[#1a2d5a] via-[#11224E] to-[#0c1838] ${
          embedded ? "h-full min-h-0" : "min-h-[280px]"
        }`}
      >
        <div className="hidden sm:flex w-[26%] max-w-[200px] shrink-0 flex-col border-r border-white/10 p-3 gap-2 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Salons</p>
          {["# Promo 2026", "# Devoirs", "# Annonces"].map((ch, i) => (
            <div
              key={ch}
              className={`rounded-lg px-2.5 py-2 text-[10px] font-bold truncate ${i === 0 ? "bg-white/15 text-white" : "text-white/55"}`}
            >
              {ch}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col p-3 sm:p-4 overflow-hidden">
          <p className="text-[11px] font-black mb-3 text-white/90 truncate shrink-0"># Promo 2026 · Management</p>
          <div className="flex-1 space-y-2 overflow-hidden min-h-0">
            {messages.slice(0, shown).map((m) => (
              <div
                key={m.text}
                className="rounded-xl px-3 py-2 max-w-full border border-white/10 bg-white/10 backdrop-blur-sm shadow-sm"
              >
                <p className="text-[9px] font-black" style={{ color: m.user === "NEXA Bot" ? ORANGE : "#A8C0F0" }}>
                  {m.user}
                </p>
                <p className="text-[10px] text-white/80 break-words">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

function ParticipantTile({
  src,
  alt,
  name,
  role,
  active,
  large,
  fillCell,
  className = "",
}: {
  src: string;
  alt: string;
  name: string;
  role?: string;
  active?: boolean;
  large?: boolean;
  /** Fill grid cell (showcase embed) instead of aspect-video */
  fillCell?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg sm:rounded-xl bg-neutral-100 ${
        large
          ? "h-full min-h-[140px]"
          : fillCell
            ? "h-full w-full min-h-[72px]"
            : "aspect-video w-full"
      } ${active ? "ring-2 ring-[#eb670e] ring-offset-1 ring-offset-white" : "ring-1 ring-black/8"} ${className}`}
      animate={active ? { scale: [1, 1.015, 1] } : { scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover object-center ${large ? "object-[center_20%]" : ""}`}
        loading="lazy"
      />
      <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2 sm:right-2 flex items-end justify-between gap-1.5">
        <div className="min-w-0 rounded-md bg-black/50 px-2 py-1 backdrop-blur-[2px] sm:px-2.5 sm:py-1.5">
          <p className="truncate text-[9px] font-black leading-tight text-white sm:text-[11px]">{name}</p>
          {role && (
            <p className="text-[8px] font-bold sm:text-[10px]" style={{ color: ORANGE }}>
              {role}
            </p>
          )}
        </div>
        {active && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white sm:px-2 sm:text-[9px]"
            style={{ backgroundColor: ORANGE }}
          >
            Parle
          </span>
        )}
      </div>
      {active && large && (
        <div className="absolute top-1.5 right-1.5 flex items-end gap-0.5 h-3 sm:top-2 sm:right-2 sm:h-4">
          {[1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="w-0.5 rounded-full bg-white/90 sm:w-1"
              animate={{ height: ["3px", "12px", "5px", "10px", "3px"] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function LiveMock({ embedded = false }: { embedded?: boolean }) {
  const [activeSpeaker, setActiveSpeaker] = useState(0);

  const trainer = {
    name: "Mme Aïssatou Diallo",
    role: "Formatrice",
    photo: "/presentation/live/trainer.png",
  };

  const students = [
    { name: "Awa Koné", photo: "/presentation/live/student-1.png" },
    { name: "Koffi Adje", photo: "/presentation/live/student-2.png" },
    { name: "Fatoumata Ba", photo: "/presentation/live/student-3.png" },
    { name: "Mamadou Traoré", photo: "/presentation/live/student-4.png" },
    { name: "Jean-Baptiste T.", photo: "/presentation/live/student-5.png" },
    { name: "Aminata S.", photo: "/presentation/live/student-6.png" },
    { name: "Amadou B.", photo: "/presentation/live/student-7.png" },
  ];

  useEffect(() => {
    const id = setInterval(
      () => setActiveSpeaker((s) => (s + 1) % (students.length + 1)),
      3200,
    );
    return () => clearInterval(id);
  }, [students.length]);

  return (
    <div
      className={
        embedded
          ? "h-full w-full min-h-0 flex flex-col overflow-hidden bg-white"
          : "overflow-hidden rounded-2xl border border-black/8 bg-white shadow-lg sm:shadow-xl"
      }
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-black/6 bg-[#F7F7F6] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-[12px] font-black sm:text-[13px]" style={{ color: BLUE }}>
            Session live : cours de management
          </p>
          <p className="text-[10px] font-medium text-neutral-500 sm:text-[11px]">Promo 2026 · Filière Commerce</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600 sm:text-[11px]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          EN DIRECT
        </span>
      </div>

      {/* Formatrice hauteur 2 tuiles · 2×2 à droite · 1 sous la formatrice · 2 en bas à droite */}
      <div
        className={
          embedded
            ? "flex-1 min-h-[min(100%,520px)] grid grid-cols-3 grid-rows-3 gap-2 p-3 sm:gap-2.5 sm:p-4 md:gap-3 md:p-5 [grid-template-rows:repeat(3,minmax(96px,1fr))]"
            : "grid grid-cols-3 grid-rows-3 gap-1.5 p-2 sm:gap-2 sm:p-3 md:gap-2.5 md:p-4"
        }
      >
        <div className="col-start-1 row-start-1 row-span-2 min-h-0 h-full">
          <ParticipantTile
            src={trainer.photo}
            alt={trainer.name}
            name={trainer.name}
            role={trainer.role}
            active={activeSpeaker === 0}
            large
            fillCell={embedded}
            className="h-full"
          />
        </div>
        <div className="col-start-2 row-start-1 min-h-0 h-full">
          <ParticipantTile fillCell={embedded} src={students[0].photo} alt={students[0].name} name={students[0].name} active={activeSpeaker === 1} className="h-full" />
        </div>
        <div className="col-start-3 row-start-1 min-h-0 h-full">
          <ParticipantTile fillCell={embedded} src={students[1].photo} alt={students[1].name} name={students[1].name} active={activeSpeaker === 2} className="h-full" />
        </div>
        <div className="col-start-2 row-start-2 min-h-0 h-full">
          <ParticipantTile fillCell={embedded} src={students[2].photo} alt={students[2].name} name={students[2].name} active={activeSpeaker === 3} className="h-full" />
        </div>
        <div className="col-start-3 row-start-2 min-h-0 h-full">
          <ParticipantTile fillCell={embedded} src={students[3].photo} alt={students[3].name} name={students[3].name} active={activeSpeaker === 4} className="h-full" />
        </div>
        <div className="col-start-1 row-start-3 min-h-0 h-full">
          <ParticipantTile fillCell={embedded} src={students[4].photo} alt={students[4].name} name={students[4].name} active={activeSpeaker === 5} className="h-full" />
        </div>
        <div className="col-start-2 row-start-3 min-h-0 h-full">
          <ParticipantTile fillCell={embedded} src={students[5].photo} alt={students[5].name} name={students[5].name} active={activeSpeaker === 6} className="h-full" />
        </div>
        <div className="col-start-3 row-start-3 min-h-0 h-full">
          <ParticipantTile fillCell={embedded} src={students[6].photo} alt={students[6].name} name={students[6].name} active={activeSpeaker === 7} className="h-full" />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-black/6 bg-[#F7F7F6] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <span className="text-[10px] font-bold text-neutral-500 sm:text-[11px]">
          7 apprenants · 1 formatrice
        </span>
        <span className="text-[10px] font-bold text-neutral-400 sm:text-[11px]">
          Caméra · Micro · Partage d&apos;écran
        </span>
      </div>
    </div>
  );
}

export function CourseMock() {
  return (
    <Frame title="nexa.app/centre/cours/gestion-cours">
      <div className="p-4">
        <p className="text-[11px] font-black mb-2" style={{ color: BLUE }}>Constructeur de cours · Module 2</p>
        <div className="rounded-xl border border-black/6 p-3 bg-neutral-50 mb-2">
          <p className="text-sm font-black text-neutral-800 mb-1">Les fondamentaux du management</p>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Un bon manager sait <mark className="rounded px-0.5" style={{ backgroundColor: `${ORANGE}30` }}>planifier</mark>, <mark className="rounded px-0.5" style={{ backgroundColor: `${ORANGE}30` }}>déléguer</mark> et <mark className="rounded px-0.5" style={{ backgroundColor: `${ORANGE}30` }}>évaluer</mark> les performances de son équipe…
          </p>
        </div>
        <div className="flex gap-2">
          {["Texte", "Quiz", "Vidéo", "Anti-copie"].map((t, i) => (
            <span key={t} className="text-[9px] font-bold px-2 py-1 rounded-lg border border-black/6" style={{ backgroundColor: i === 0 ? `${BLUE}10` : "white", color: BLUE }}>{t}</span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function LibraryMock() {
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard" },
    { icon: MessageCircle, label: "Tuteur" },
    { icon: Video, label: "Live" },
    { icon: ScrollText, label: "Cours" },
    { icon: PenTool, label: "Devoirs" },
    { icon: BookOpen, label: "Bibliothèque", active: true },
    { icon: ClipboardList, label: "Examen" },
    { icon: Users, label: "Communauté" },
  ];

  const docs = [
    { cat: "Grammaire", title: "Grammaire Complète", bg: "bg-blue-50", color: "text-blue-600", icon: BookOpen },
    { cat: "Outils Pratiques", title: "Maîtriser le Clavier AZERTY", bg: "bg-emerald-50", color: "text-emerald-600", icon: FileText },
    { cat: "Méthodologie", title: "Le Guide d'Or", bg: "bg-amber-50", color: "text-amber-600", icon: BookMarked },
    { cat: "Théâtre", title: "L'Oiseau bleu", bg: "bg-violet-50", color: "text-violet-600", icon: BookOpen },
  ];

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-xl"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ boxShadow: "0 24px 48px rgba(0,0,0,0.08)" }}
    >
      <div className="flex min-h-[340px] sm:min-h-[380px]">
        {/* Sidebar apprenant */}
        <div className="hidden w-[72px] shrink-0 flex-col border-r border-white/10 sm:flex" style={{ backgroundColor: BLUE }}>
          <div className="flex flex-col items-center gap-1 px-1.5 py-2">
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
              <span className="text-[8px] font-black text-white">N</span>
            </div>
            {navItems.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                title={label}
                className={`flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 ${
                  active ? "text-white" : "text-white/45"
                }`}
                style={active ? { backgroundColor: ORANGE } : undefined}
              >
                <Icon size={11} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[5px] font-bold leading-none text-center">{label.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contenu bibliothèque */}
        <div
          className="min-w-0 flex-1 overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255,243,232,0.5) 0%, #f8fafc 45%, #f1f5f9 100%)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-black/6 bg-white/80 px-2.5 py-2 sm:px-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-black/8 bg-white">
                <ArrowLeft size={10} className="text-neutral-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-black uppercase tracking-tight text-neutral-900 sm:text-[10px]">
                  Bibliothèque
                </p>
                <p className="truncate text-[6px] font-bold uppercase tracking-widest sm:text-[7px]" style={{ color: ORANGE }}>
                  La Grande Bibliothèque d&apos;Afrique
                </p>
              </div>
            </div>
            <div className="hidden min-w-0 flex-1 max-w-[140px] items-center gap-1 rounded-xl border border-black/8 bg-white px-2 py-1 sm:flex">
              <Search size={9} className="shrink-0 text-neutral-400" />
              <span className="truncate text-[7px] text-neutral-400">Chercher (ex: grammaire…)</span>
            </div>
          </div>

          <div className="space-y-3 p-2.5 sm:p-3">
            {/* Hero IA */}
            <div className="text-center">
              <p className="text-[11px] font-black leading-tight text-neutral-900 sm:text-xs">
                Que cherchez-vous{" "}
                <span style={{ color: ORANGE }}>aujourd&apos;hui ?</span>
              </p>
              <p className="mt-0.5 text-[7px] font-medium text-neutral-500 sm:text-[8px]">
                Sélectionnez un outil pour activer l&apos;Assistant IA.
              </p>
            </div>

            {/* Dictionnaire / Traducteur */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: BookMarked, title: "Dictionnaire", sub: "Sens & Synonymes", bg: "bg-blue-50", color: "text-blue-600" },
                { icon: Languages, title: "Traducteur", sub: "Texte multilingue", bg: "bg-emerald-50", color: "text-emerald-600" },
              ].map(({ icon: Icon, title, sub, bg, color }) => (
                <motion.div
                  key={title}
                  whileHover={{ y: -2 }}
                  className="flex items-center gap-2 rounded-xl border border-black/6 bg-white p-2 shadow-sm"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                    <Icon size={12} className={color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold text-neutral-900">{title}</p>
                    <p className="truncate text-[6px] text-neutral-500">{sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Documents exclusifs */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-neutral-900 sm:text-[8px]">
                  <Crown size={9} style={{ color: ORANGE }} />
                  Documents Exclusifs
                </p>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {docs.map((doc, i) => (
                  <motion.div
                    key={doc.title}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ borderColor: `${ORANGE}60` }}
                    className="relative rounded-xl border border-black/6 bg-white p-2 shadow-sm"
                  >
                    <Lock size={8} className="absolute top-1.5 right-1.5 text-neutral-300" />
                    <div className="flex items-start gap-1.5">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/4 ${doc.bg}`}>
                        <doc.icon size={11} className={doc.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[6px] font-black uppercase tracking-wider" style={{ color: ORANGE }}>
                          {doc.cat}
                        </p>
                        <p className="text-[7px] font-bold leading-snug text-neutral-800 line-clamp-2">{doc.title}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
