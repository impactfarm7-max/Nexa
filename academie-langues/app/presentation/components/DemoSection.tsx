"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Play, ExternalLink } from "lucide-react";
import Link from "next/link";

const ORANGE = "#eb670e";
const BLUE = "#11224E";
const EASE = [0.22, 1, 0.36, 1] as const;

type DemoSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  mock: React.ReactNode;
  videoSrc?: string;
  demoLink?: string;
  reversed?: boolean;
  index?: number;
};

export default function DemoSection({
  id,
  eyebrow,
  title,
  description,
  bullets,
  mock,
  videoSrc,
  demoLink,
  reversed = false,
  index = 0,
}: DemoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [videoOk, setVideoOk] = useState(Boolean(videoSrc));
  const [playing, setPlaying] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const mockY = useTransform(scrollYProgress, [0, 1], [reversed ? 24 : -24, reversed ? -24 : 24]);
  const mockRotate = useTransform(scrollYProgress, [0, 0.5, 1], [reversed ? 1.5 : -1.5, 0, reversed ? -1 : 1]);

  const handlePlay = () => {
    if (!videoRef.current || !videoOk) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const visual = (
    <motion.div style={{ y: mockY, rotate: mockRotate }} className="relative w-full min-w-0">
      <motion.div
        className="relative w-full min-w-0"
        initial={{ opacity: 0, x: reversed ? 56 : -56, scale: 0.92, rotateY: reversed ? -6 : 6 }}
        whileInView={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.75, delay: index * 0.05, ease: EASE }}
        whileHover={{ y: -8, scale: 1.01 }}
      >
        <motion.div
          className="pointer-events-none absolute -inset-3 rounded-3xl opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(circle, ${ORANGE}22, transparent 70%)` }}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        {videoOk && videoSrc ? (
          <div className="relative overflow-hidden rounded-2xl border border-black/8 shadow-xl">
            <video
              ref={videoRef}
              src={videoSrc}
              className="aspect-video w-full bg-neutral-900 object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setVideoOk(false)}
              onEnded={() => setPlaying(false)}
            />
            {!playing && (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 transition hover:bg-black/40"
                aria-label="Lire la démo"
              >
                <motion.span
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  <Play size={22} fill={ORANGE} stroke={ORANGE} className="ml-1" />
                </motion.span>
              </button>
            )}
            {playing && (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white"
              >
                Pause
              </button>
            )}
          </div>
        ) : (
          mock
        )}
      </motion.div>
    </motion.div>
  );

  const copy = (
    <motion.div
      initial={{ opacity: 0, x: reversed ? -56 : 56 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay: 0.1 + index * 0.05, ease: EASE }}
    >
      <motion.div
        className="mb-3 flex items-center gap-3"
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15 + index * 0.04 }}
      >
        <motion.p
          className="text-[11px] font-black uppercase tracking-[0.25em]"
          style={{ color: ORANGE }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          {eyebrow}
        </motion.p>
        <motion.span
          className="h-px flex-1 max-w-[80px] origin-left"
          style={{ backgroundColor: ORANGE }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
        />
      </motion.div>
      <motion.h3
        className="mb-4 text-2xl font-black tracking-tight md:text-3xl"
        style={{ color: BLUE }}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.18, duration: 0.5 }}
      >
        {title}
      </motion.h3>
      <motion.p
        className="mb-5 font-medium leading-relaxed text-neutral-500"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.22, duration: 0.5 }}
      >
        {description}
      </motion.p>
      <ul className="mb-6 space-y-2.5">
        {bullets.map((b, i) => (
          <motion.li
            key={b}
            className="flex items-start gap-2.5 text-[13px] font-medium text-neutral-600"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.28 + i * 0.07, duration: 0.45, ease: EASE }}
            whileHover={{ x: 4 }}
          >
            <motion.span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: ORANGE }}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 500, damping: 12 }}
            />
            {b}
          </motion.li>
        ))}
      </ul>
      {demoLink && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.04, x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href={demoLink}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[12px] font-black transition hover:border-orange-200 hover:shadow-md"
            style={{ color: BLUE }}
          >
            Voir un exemple <ExternalLink size={14} />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <motion.section
      ref={sectionRef}
      id={id}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.6, delay: index * 0.04, ease: EASE }}
      className="group scroll-mt-24"
    >
      <div
        className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
          reversed ? "lg:*:[direction:ltr] lg:[direction:rtl]" : ""
        }`}
      >
        <div>{visual}</div>
        <div>{copy}</div>
      </div>
    </motion.section>
  );
}
