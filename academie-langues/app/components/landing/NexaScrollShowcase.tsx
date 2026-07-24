"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { BRAND } from "@/app/utils/brand";

const BLUE = BRAND.blue;
const ORANGE = BRAND.orange;

/** Sticky pin + scroll scrub (Google Education pattern). */
const TRACK_VH = 300;
/** Device expands to fullscreen — longer = zoom plus progressif */
const EXPAND_END = 0.28;
/**
 * In-frame screen morphs finish here — short tail so the last screen
 * doesn't linger before PersonaTabs scrolls in.
 */
const SCRUB_END = 0.96;
/** Matches sticky nav in page.tsx (h-14 sm:h-16 → 4rem from sm+) */
const HEADER_H = "4rem";

function ProductShell({
  children,
  chromeOpacity,
  chromeHeight,
  radius,
  shadow,
}: {
  children: ReactNode;
  chromeOpacity: MotionValue<number>;
  chromeHeight: MotionValue<string>;
  radius: MotionValue<number>;
  shadow: MotionValue<string>;
}) {
  return (
    <motion.div
      className="relative overflow-hidden bg-white h-full w-full flex flex-col"
      style={{
        borderRadius: radius,
        border: "1px solid rgba(17,34,78,0.08)",
        boxShadow: shadow,
      }}
    >
      <motion.div
        className="flex items-center gap-1.5 px-4 border-b border-black/[0.06] bg-[#FAFAF8] shrink-0 overflow-hidden"
        style={{
          opacity: chromeOpacity,
          height: chromeHeight,
        }}
      >
        <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
        <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
        <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
        <span className="ml-2 text-[10px] font-bold text-neutral-400 truncate">nexa.app</span>
      </motion.div>
      <div className="bg-[#FCFCFA] flex-1 min-h-0 overflow-hidden">{children}</div>
    </motion.div>
  );
}

function MockSkeleton() {
  return (
    <div className="min-h-[280px] p-5 animate-pulse space-y-3">
      <div className="h-3 w-1/4 rounded bg-neutral-100" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-28 rounded-xl bg-neutral-100/80" />
        <div className="h-28 rounded-xl bg-neutral-100/80" />
        <div className="h-28 rounded-xl bg-neutral-100/80" />
        <div className="h-28 rounded-xl bg-neutral-100/80" />
      </div>
    </div>
  );
}

function PlannerFrame() {
  const days = [
    {
      d: "Lun",
      n: "16",
      slots: [{ t: "09:00", label: "TCF · Expression écrite", c: ORANGE }],
    },
    {
      d: "Mar",
      n: "17",
      slots: [
        { t: "10:30", label: "Management · Module 2", c: BLUE },
        { t: "15:00", label: "Devoir · Correction", c: ORANGE },
      ],
    },
    {
      d: "Mer",
      n: "18",
      slots: [{ t: "14:00", label: "Session coaching", c: BLUE }],
    },
    {
      d: "Jeu",
      n: "19",
      slots: [{ t: "09:00", label: "Compréhension orale", c: ORANGE }],
    },
    {
      d: "Ven",
      n: "20",
      slots: [
        { t: "11:00", label: "Examen blanc", c: BLUE },
        { t: "16:30", label: "Réunion équipe", c: "#64748b" },
      ],
    },
  ];

  return (
    <div className="box-border w-full max-w-full h-full min-h-0 overflow-hidden px-3 sm:px-5 pt-10 sm:pt-12 pb-3 sm:pb-5 bg-gradient-to-b from-[#E8EEF6] via-[#F0F3F8] to-[#E4E9F2]">
      <div className="flex items-end justify-between gap-2 mb-4 min-w-0">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#11224E]/55 mb-1">
            Semaine 12
          </p>
          <p className="text-base sm:text-lg font-black tracking-tight truncate" style={{ color: BLUE }}>
            Planificateur
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="h-8 w-8 rounded-lg bg-white/80 border border-[#11224E]/10" />
          <span
            className="h-8 px-2.5 sm:px-3 rounded-lg text-[11px] font-bold text-white flex items-center shadow-sm"
            style={{ backgroundColor: BLUE }}
          >
            + Session
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full min-w-0">
        {days.map((day) => (
          <div key={day.d} className="min-w-0 overflow-hidden">
            <div className="text-center mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#11224E]/45">{day.d}</p>
              <p className="text-sm font-black tabular-nums" style={{ color: BLUE }}>
                {day.n}
              </p>
            </div>
            <div className="space-y-1.5 min-h-[140px]">
              {day.slots.map((s) => (
                <div
                  key={`${day.d}-${s.t}`}
                  className="rounded-lg px-1.5 py-2 border border-[#11224E]/08 bg-white/90 shadow-sm min-w-0 overflow-hidden"
                >
                  <p className="text-[9px] font-bold tabular-nums" style={{ color: s.c }}>
                    {s.t}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-semibold text-neutral-700 leading-snug line-clamp-3 mt-0.5 break-words">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CenterDashboardMock = dynamic(
  () =>
    import("@/app/presentation/components/Mockups").then((m) => m.CenterDashboardMock),
  { ssr: false, loading: () => <MockSkeleton /> }
);
const LiveMock = dynamic(
  () => import("@/app/presentation/components/Mockups").then((m) => m.LiveMock),
  { ssr: false, loading: () => <MockSkeleton /> }
);
const CommunityMock = dynamic(
  () =>
    import("@/app/presentation/components/Mockups").then((m) => m.CommunityMock),
  { ssr: false, loading: () => <MockSkeleton /> }
);

/** When each in-frame screen starts sliding up over the previous (0→1 scrub range) */
const COVER_START = [0, 0.12, 0.40, 0.68] as const;
/** When each cover animation finishes */
const COVER_END = [0.06, 0.34, 0.62, 0.92] as const;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

type EnterMode = "none" | "cover" | "reveal";

const SCREENS: {
  id: string;
  label: string;
  enter: EnterMode;
  node: ReactNode;
}[] = [
  { id: "admin", label: "Pilotage centre", enter: "none", node: <CenterDashboardMock embedded /> },
  { id: "live", label: "Étudiants en live", enter: "cover", node: <LiveMock embedded /> },
  { id: "planner", label: "Planificateur", enter: "reveal", node: <PlannerFrame /> },
  { id: "community", label: "Communauté", enter: "cover", node: <CommunityMock embedded /> },
];

function coverActiveIndex(v: number) {
  for (let i = COVER_START.length - 1; i >= 0; i--) {
    if (v >= COVER_START[i]) return i;
  }
  return 0;
}

/**
 * Sticky pin + scroll scrub (Google Education pattern):
 * 1) Compact device under the hero
 * 2) Zooms to fill the viewport
 * 3) Screens transition inside the pin — cover from below, or exit upward to reveal
 */
function DesktopShowcase() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  // Start readable, then fill the stage. Final size uses % of stage (not 100vw — scrollbar clips).
  const frameW = useTransform(
    scrollYProgress,
    [0, EXPAND_END * 0.35, EXPAND_END * 0.72, EXPAND_END],
    ["78vw", "86vw", "95vw", "100%"]
  );
  const frameH = useTransform(
    scrollYProgress,
    [0, EXPAND_END * 0.35, EXPAND_END * 0.72, EXPAND_END],
    ["68dvh", "82dvh", "94dvh", "100%"]
  );
  const radius = useTransform(
    scrollYProgress,
    [0, EXPAND_END * 0.5, EXPAND_END * 0.85, EXPAND_END],
    [28, 18, 6, 0]
  );
  const chromeOpacity = useTransform(
    scrollYProgress,
    [0, EXPAND_END * 0.45, EXPAND_END * 0.8, EXPAND_END],
    [1, 0.65, 0.2, 0]
  );
  const chromeHeight = useTransform(
    scrollYProgress,
    [0, EXPAND_END * 0.45, EXPAND_END * 0.8, EXPAND_END],
    ["2.5rem", "1.5rem", "0.5rem", "0rem"]
  );
  const shadow = useTransform(
    scrollYProgress,
    [0, EXPAND_END * 0.45, EXPAND_END],
    [
      "0 1px 0 rgba(255,255,255,0.85) inset, 0 32px 64px rgba(17,34,78,0.16), 0 12px 24px rgba(17,34,78,0.06)",
      "0 1px 0 rgba(255,255,255,0.85) inset, 0 40px 80px rgba(17,34,78,0.2), 0 16px 32px rgba(17,34,78,0.08)",
      "none",
    ]
  );
  const stageBg = useTransform(
    scrollYProgress,
    [0, EXPAND_END * 0.35, EXPAND_END],
    ["rgba(250,249,247,0)", "rgba(250,249,247,0.85)", "rgba(250,249,247,1)"]
  );
  const dotsOpacity = useTransform(
    scrollYProgress,
    [EXPAND_END * 0.8, EXPAND_END + 0.04, SCRUB_END - 0.04, SCRUB_END],
    [0, 1, 1, 0]
  );
  const captionOpacity = useTransform(
    scrollYProgress,
    [EXPAND_END * 0.75, EXPAND_END + 0.03, SCRUB_END - 0.06, SCRUB_END],
    [0, 1, 1, 0]
  );

  // Morph screens only until SCRUB_END — then hold last frame for the cover transition
  const screenProgress = useTransform(scrollYProgress, (v) => {
    if (v <= EXPAND_END) return 0;
    if (v >= SCRUB_END) return 1;
    return (v - EXPAND_END) / (SCRUB_END - EXPAND_END);
  });

  useMotionValueEvent(screenProgress, "change", (v) => {
    setActive(coverActiveIndex(v));
  });

  return (
    <div
      ref={trackRef}
      className="relative hidden md:block"
      style={{ height: `${TRACK_VH}vh` }}
    >
      <motion.div
        className="sticky z-10 w-full overflow-hidden"
        style={{
          top: HEADER_H,
          height: `calc(100dvh - ${HEADER_H})`,
          backgroundColor: stageBg,
        }}
      >
        <div className="relative h-full w-full flex items-center justify-center">
          <motion.div
            className="relative max-w-full max-h-full"
            style={{
              width: frameW,
              height: frameH,
            }}
          >
            <ProductShell
              chromeOpacity={chromeOpacity}
              chromeHeight={chromeHeight}
              radius={radius}
              shadow={shadow}
            >
              <div className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
                {SCREENS.map((screen, i) => (
                  <ScreenLayer
                    key={screen.id}
                    index={i}
                    progress={screenProgress}
                    expandEnd={EXPAND_END}
                    scrollYProgress={scrollYProgress}
                  >
                    {screen.node}
                  </ScreenLayer>
                ))}
              </div>
            </ProductShell>
          </motion.div>
        </div>

        <motion.p
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-[12px] sm:text-[13px] font-bold tracking-tight text-[#11224E]/70"
          style={{ opacity: captionOpacity }}
          aria-hidden
        >
          {SCREENS[active].label}
        </motion.p>

        <motion.div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20 pointer-events-none"
          style={{ opacity: dotsOpacity }}
        >
          {SCREENS.map((s, i) => (
            <span
              key={s.id}
              className="block h-1 rounded-full transition-all duration-300"
              style={{
                width: active === i ? 22 : 8,
                backgroundColor: active === i ? ORANGE : "rgba(17,34,78,0.18)",
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

function ScreenLayer({
  children,
  index,
  progress,
  expandEnd,
  scrollYProgress,
}: {
  children: ReactNode;
  index: number;
  progress: MotionValue<number>;
  expandEnd: number;
  scrollYProgress: MotionValue<number>;
}) {
  const mode = SCREENS[index]?.enter ?? "cover";
  const enterStart = COVER_START[index] ?? 0;
  const enterEnd = COVER_END[index] ?? 1;
  const nextEnter = SCREENS[index + 1]?.enter;
  const exitStart = COVER_START[index + 1] ?? 1;
  const exitEnd = COVER_END[index + 1] ?? 1;

  const y = useTransform([scrollYProgress, progress], ([sy, v]) => {
    if ((sy as number) < expandEnd) return index === 0 ? "0%" : "100%";

    // Outgoing: next screen uses reveal → this layer exits upward
    if (nextEnter === "reveal" && (v as number) >= exitStart) {
      if ((v as number) >= exitEnd) return "-100%";
      const t = ((v as number) - exitStart) / (exitEnd - exitStart);
      return `${-easeInOutCubic(t) * 100}%`;
    }

    if (mode === "none" || mode === "reveal") return "0%";

    // Incoming cover from below
    if ((v as number) < enterStart) return "100%";
    if ((v as number) >= enterEnd) return "0%";
    const t = ((v as number) - enterStart) / (enterEnd - enterStart);
    return `${(1 - easeInOutCubic(t)) * 100}%`;
  });

  const opacity = useTransform([scrollYProgress, progress], ([sy, v]) => {
    if ((sy as number) < expandEnd) return index === 0 ? 1 : 0;
    if (index === 0) return 1;
    if (mode === "reveal") return (v as number) >= enterStart ? 1 : 0;
    return (v as number) >= enterStart ? 1 : 0;
  });

  const zIndex = useTransform(progress, (v) => {
    if (nextEnter === "reveal" && v >= exitStart && v < exitEnd) return index + 20;
    return index + 1;
  });

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden bg-[#FCFCFA]"
      style={{ y, opacity, zIndex }}
      aria-hidden={index !== 0}
    >
      <div className="h-full w-full min-h-0 min-w-0 overflow-hidden">{children}</div>
    </motion.div>
  );
}

function MobileCarousel() {
  const [i, setI] = useState(0);
  const go = useCallback((n: number) => {
    setI(((n % SCREENS.length) + SCREENS.length) % SCREENS.length);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => go(i + 1), 4500);
    return () => window.clearInterval(id);
  }, [i, go]);

  return (
    <div className="md:hidden px-4 py-8">
      <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_20px_40px_rgba(17,34,78,0.08)]">
        <div className="flex items-center gap-1.5 px-3.5 h-9 border-b border-black/[0.06] bg-[#FAFAF8]">
          <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
          <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
          <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
        </div>
        <div className="relative min-h-[300px]">
          {SCREENS.map((screen, idx) => (
            <div
              key={screen.id}
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                opacity: idx === i ? 1 : 0,
                pointerEvents: idx === i ? "auto" : "none",
              }}
            >
              {screen.node}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-[13px] font-bold text-[#11224E]/65">
        {SCREENS[i].label}
      </p>
      <div className="flex justify-center gap-2 mt-3">
        {SCREENS.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Écran ${idx + 1}`}
            onClick={() => setI(idx)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: idx === i ? 22 : 8,
              backgroundColor: idx === i ? ORANGE : "rgba(17,34,78,0.18)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StaticShowcase() {
  return (
    <div className="hidden md:block max-w-5xl mx-auto px-4 py-12">
      <div className="rounded-2xl overflow-hidden border border-black/[0.06] bg-white shadow-xl">
        <div className="flex items-center gap-1.5 px-4 h-10 border-b border-black/[0.06] bg-[#FAFAF8]">
          <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
          <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
          <span className="w-2 h-2 rounded-full bg-[#E8E4DE]" />
        </div>
        <CenterDashboardMock />
      </div>
    </div>
  );
}

export default function NexaScrollShowcase({
  children,
}: {
  /** Content that should slide up over the fullscreen pin (Google-style cover). */
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const coverOverPin = reduce !== true;

  if (reduce) {
    return (
      <>
        <section aria-label="Aperçu produit NEXA" className="relative z-10 bg-[#FAF9F7]">
          <StaticShowcase />
          <MobileCarousel />
        </section>
        {children ? <div className="relative z-20 bg-[#FFFBF7]">{children}</div> : null}
      </>
    );
  }

  return (
    <>
      <section aria-label="Aperçu produit NEXA" className="relative z-10 bg-[#FAF9F7]">
        <DesktopShowcase />
        <MobileCarousel />
      </section>
      {children ? (
        <div
          className={
            coverOverPin
              ? "relative z-20 bg-[#FFFBF7] md:-mt-[100dvh]"
              : "relative z-20 bg-[#FFFBF7]"
          }
        >
          {children}
        </div>
      ) : null}
    </>
  );
}
