"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BRAND } from "@/app/utils/brand";

const ORANGE = BRAND.orange;

type Segment =
  | { type: "text"; value: string; highlight?: boolean }
  | { type: "br" };

const SEGMENTS: Segment[] = [
  { type: "text", value: "Accompagner", highlight: true },
  { type: "text", value: " les écoles," },
  { type: "br" },
  { type: "text", value: "les enseignants et les élèves" },
];

const FULL_TEXT = SEGMENTS.filter((s): s is { type: "text"; value: string } => s.type === "text")
  .map((s) => s.value)
  .join("");

const CHAR_MS = 38;

function segmentCharCount(seg: Segment): number {
  return seg.type === "text" ? seg.value.length : 0;
}

export default function TypewriterHeroTitle() {
  const reduceMotion = useReducedMotion();
  const totalChars = useMemo(() => SEGMENTS.reduce((n, s) => n + segmentCharCount(s), 0), []);
  const [charIndex, setCharIndex] = useState(reduceMotion ? totalChars : 0);
  const [highlightReady, setHighlightReady] = useState(!!reduceMotion);

  useEffect(() => {
    if (reduceMotion) {
      setCharIndex(totalChars);
      setHighlightReady(true);
      return;
    }
    if (charIndex >= totalChars) return;
    const id = window.setTimeout(() => setCharIndex((c) => c + 1), CHAR_MS);
    return () => window.clearTimeout(id);
  }, [charIndex, totalChars, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const hlLen = SEGMENTS[0].type === "text" ? SEGMENTS[0].value.length : 0;
    if (charIndex >= hlLen) setHighlightReady(true);
  }, [charIndex, reduceMotion]);

  let consumed = 0;

  const nodes = SEGMENTS.map((seg, i) => {
    if (seg.type === "br") {
      return <br key={`br-${i}`} />;
    }
    const start = consumed;
    const end = start + seg.value.length;
    consumed = end;
    const visible = Math.max(0, Math.min(seg.value.length, charIndex - start));
    const slice = seg.value.slice(0, visible);
    if (!slice) return null;

    if (seg.highlight) {
      return (
        <span key={`t-${i}`} className="relative inline-block z-0">
          {slice}
          {highlightReady && visible >= seg.value.length && (
            <motion.span
              aria-hidden
              className="absolute inset-x-0 top-[0.08em] bottom-[0.06em] -z-10 origin-left rounded-[3px]"
              style={{ backgroundColor: `${ORANGE}48` }}
              initial={{ scaleX: reduceMotion ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
              }
            />
          )}
        </span>
      );
    }

    return <span key={`t-${i}`}>{slice}</span>;
  });

  return (
    <h1
      className="font-display font-black tracking-[-0.035em] text-balance text-[2.35rem] leading-[1.08] sm:text-5xl sm:leading-[1.06] md:text-6xl md:leading-[1.05] xl:text-[4.25rem] xl:leading-[1.04] 2xl:text-[4.75rem] mb-5 sm:mb-6"
      style={{ color: BRAND.blue }}
      aria-label={FULL_TEXT}
    >
      {nodes}
      {!reduceMotion && charIndex < totalChars && (
        <span
          className="inline-block w-[2px] sm:w-[3px] h-[0.85em] align-middle ml-0.5 animate-pulse"
          style={{ backgroundColor: ORANGE }}
          aria-hidden
        />
      )}
    </h1>
  );
}
