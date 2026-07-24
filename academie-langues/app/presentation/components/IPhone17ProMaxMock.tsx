"use client";

import {
  Bell,
  FileText,
  Flame,
  Headphones,
  LayoutDashboard,
  MessageCircle,
  Mic,
  NotebookPen,
  PenTool,
  ScrollText,
  Sparkles,
  Users,
  Plus,
  FileWarning,
} from "lucide-react";

const BLUE = "#11224E";
const ORANGE = "#eb670e";

const TRAINING = [
  { icon: ScrollText, title: "Cours théoriques", sub: "Modules & PDF" },
  { icon: Headphones, title: "Vidéos & audio", sub: "Leçons en ligne" },
  { icon: PenTool, title: "Devoirs", sub: "À rendre" },
  { icon: Mic, title: "Sessions live", sub: "Visio intégrée" },
];

function IOSCellularSignal() {
  const bars = [3, 5, 7, 9];
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden className="shrink-0 text-neutral-900">
      {bars.map((h, i) => (
        <rect key={i} x={i * 3.2 + 0.5} y={10 - h} width={2.2} height={h} rx={0.6} fill="currentColor" />
      ))}
    </svg>
  );
}

function IOSWifi() {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" aria-hidden className="shrink-0 text-neutral-900">
      <circle cx="6.5" cy="9" r="1" fill="currentColor" />
      <path
        d="M5.35 7.45c.65-.55 1.75-.55 2.4 0l-.55.65c-.35-.28-.9-.28-1.25 0l-.6-.65z"
        fill="currentColor"
      />
      <path
        d="M3.55 5.55c1.55-1.3 4.05-1.3 5.6 0l-.65.75c-1.25-1.05-3.45-1.05-4.7 0l-.65-.75z"
        fill="currentColor"
      />
      <path
        d="M1.55 3.45c2.45-2.05 6.45-2.05 8.9 0l-.7.8c-2.15-1.75-5.95-1.75-8.1 0l-.7-.8z"
        fill="currentColor"
      />
    </svg>
  );
}

function IOSBattery({ level = 0.82 }: { level?: number }) {
  const fillW = Math.max(1.2, 13.5 * level);
  return (
    <svg width="21" height="10" viewBox="0 0 21 10" aria-hidden className="shrink-0 text-neutral-900">
      <rect x="0.5" y="0.5" width="17" height="9" rx="2.4" stroke="currentColor" strokeWidth="0.9" fill="none" opacity={0.38} />
      <rect x="2" y="2" width={fillW} height="6" rx="1.1" fill="currentColor" />
      <rect x="18.2" y="3.2" width="1.6" height="3.6" rx="0.6" fill="currentColor" opacity={0.38} />
    </svg>
  );
}

function StatusBar() {
  return (
    <div className="relative flex items-center justify-between px-3 pb-0.5 pt-[18px]">
      <span className="text-[7px] font-semibold tabular-nums tracking-tight text-neutral-900">14:32</span>
      <div className="flex items-center gap-[3px]">
        <IOSCellularSignal />
        <IOSWifi />
        <IOSBattery />
      </div>
    </div>
  );
}

function BottomNavMock() {
  const items = [
    { icon: LayoutDashboard, label: "Accueil", active: true },
    { icon: MessageCircle, label: "Mon Tuteur" },
    { icon: null, label: "" },
    { icon: FileText, label: "Devoirs" },
    { icon: Users, label: "Communauté" },
  ];

  return (
    <div className="relative border-t border-neutral-200 bg-white px-1 pt-1 pb-1">
      <div className="flex items-end justify-between">
        {items.map((item, i) => {
          if (i === 2) {
            return (
              <div key="fab" className="relative -top-2 flex w-[22%] justify-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md" style={{ backgroundColor: ORANGE }}>
                  <Plus size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
            );
          }
          const Icon = item.icon!;
          return (
            <div key={item.label} className="flex w-[22%] flex-col items-center gap-0.5">
              <Icon size={11} strokeWidth={item.active ? 2.5 : 2} style={{ color: item.active ? BLUE : "#94a3b8" }} />
              <span className="text-[5.5px] font-bold leading-none" style={{ color: item.active ? BLUE : "#94a3b8" }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-center">
        <span className="h-[2px] w-10 rounded-full bg-neutral-900/75" />
      </div>
    </div>
  );
}

function StudentDashboardScreen() {
  return (
    <div className="flex h-full flex-col bg-[#FAFAF9] text-[#0a0a0a]">
      <StatusBar />

      {/* En-tête dashboard */}
      <div className="border-b border-neutral-200/60 bg-white/90 px-2.5 pb-2 pt-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <span
              className="inline-block rounded-full px-1.5 py-px text-[5.5px] font-bold uppercase tracking-wider"
              style={{ color: ORANGE, backgroundColor: "#FFF3E8" }}
            >
              Espace Étudiant
            </span>
            <h2 className="mt-0.5 truncate text-[10px] font-black leading-tight" style={{ color: BLUE }}>
              Bonjour, ondoa
            </h2>
            <p className="text-[6px] font-medium text-neutral-400">Voici votre semaine en un coup d&apos;œil.</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#DCE3FF] bg-[#EEF2FF]">
              <MessageCircle size={8} style={{ color: BLUE }} />
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white">
              <Bell size={8} className="text-neutral-600" />
            </span>
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 space-y-2 overflow-hidden px-2 py-2">
        {/* Mes cours */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="flex items-center gap-0.5 text-[7px] font-black" style={{ color: BLUE }}>
              <Sparkles size={7} style={{ color: ORANGE }} />
              Mes cours en cours
            </h3>
            <span className="rounded-full px-1 py-px text-[5px] font-bold uppercase tracking-wide" style={{ color: ORANGE, backgroundColor: "#FFF3E8" }}>
              Filière Management
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {TRAINING.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="rounded-lg border border-neutral-200 bg-white p-1.5">
                <div className="mb-1 flex h-4 w-4 items-center justify-center rounded-md" style={{ backgroundColor: "#FFF3E8" }}>
                  <Icon size={8} style={{ color: ORANGE }} />
                </div>
                <p className="text-[5.5px] font-black uppercase leading-tight" style={{ color: BLUE }}>
                  {title}
                </p>
                <p className="text-[5px] font-medium text-neutral-400">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-neutral-200 bg-white p-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="flex items-center gap-0.5 text-[6.5px] font-black" style={{ color: BLUE }}>
              <NotebookPen size={7} style={{ color: ORANGE }} />
              Mes notes de la semaine
            </h3>
            <span className="text-[5px] font-bold text-neutral-400">Tout voir →</span>
          </div>
          <p className="py-2 text-center text-[6px] font-medium leading-snug text-neutral-400">
            Votre prochain contrôle est prévu vendredi.
          </p>
        </div>

        {/* Devoirs */}
        <div className="rounded-xl border border-neutral-200 bg-white p-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="flex items-center gap-0.5 text-[6.5px] font-black" style={{ color: BLUE }}>
              <FileWarning size={7} style={{ color: ORANGE }} />
              Devoirs en attente
            </h3>
            <span className="text-[5px] font-bold text-neutral-400">Tout voir →</span>
          </div>
          <p className="py-1.5 text-center text-[6px] font-medium text-neutral-400">Tout est à jour, bravo ! 🎉</p>
        </div>

        {/* Discipline */}
        <div className="rounded-xl border border-neutral-200 p-2" style={{ background: `linear-gradient(135deg, ${BLUE}, #1B3370)` }}>
          <div className="mb-1 flex items-center justify-between gap-1">
            <h3 className="flex items-center gap-0.5 text-[6.5px] font-black text-white">
              <Flame size={7} className="text-orange-400" />
              Ma discipline cette semaine
            </h3>
            <span className="text-[4.5px] font-bold uppercase tracking-wide text-white/50">Continuez 💪</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { n: "4", l: "Jours actifs" },
              { n: "2", l: "Lives suivis" },
              { n: "3", l: "Devoirs rendus" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-white/10 p-1 text-center">
                <p className="text-[9px] font-black text-white">{s.n}</p>
                <p className="text-[4px] font-bold uppercase tracking-wide text-white/60">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNavMock />
    </div>
  );
}

export default function IPhone17ProMaxMock() {
  return (
    <div className="relative mx-auto w-[min(100%,210px)] sm:w-[220px]">
      <div className="absolute -inset-x-3 bottom-0 top-6 rounded-[2.2rem] bg-black/10 blur-xl" />

      <div
        className="relative rounded-[2.2rem] p-[2px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4)]"
        style={{
          background: "linear-gradient(145deg, #5a5a5c 0%, #2c2c2e 35%, #1a1a1c 70%, #3d3d3f 100%)",
        }}
      >
        <span className="absolute -left-[2px] top-[64px] h-5 w-[2px] rounded-l-sm bg-[#4a4a4c]" />
        <span className="absolute -left-[2px] top-[92px] h-9 w-[2px] rounded-l-sm bg-[#4a4a4c]" />
        <span className="absolute -left-[2px] top-[106px] h-9 w-[2px] rounded-l-sm bg-[#4a4a4c]" />
        <span className="absolute -right-[2px] top-[86px] h-12 w-[2px] rounded-r-sm bg-[#4a4a4c]" />

        <div className="relative overflow-hidden rounded-[2.1rem] bg-black">
          <div className="pointer-events-none absolute left-1/2 top-[7px] z-20 -translate-x-1/2">
            <div className="flex h-[16px] w-[56px] items-center justify-center rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <span className="mr-1.5 h-[4px] w-[4px] rounded-full bg-[#1a1a1a] ring-1 ring-white/10" />
              <span className="h-[4px] w-[16px] rounded-full bg-[#0d0d0d]" />
            </div>
          </div>

          <div className="aspect-[9/19.5] w-full">
            <StudentDashboardScreen />
          </div>

          <div
            className="pointer-events-none absolute inset-0 rounded-[2.1rem] opacity-[0.07]"
            style={{ background: "linear-gradient(135deg, white 0%, transparent 45%, transparent 100%)" }}
          />
        </div>
      </div>

      <p className="mt-3 text-center text-[9px] font-bold text-neutral-400">
        Dashboard étudiant · NEXA mobile
      </p>
    </div>
  );
}
