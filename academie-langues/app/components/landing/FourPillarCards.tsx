"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

const PILLARS = [
  {
    id: "admin",
    tile: "#E8EEF8",
    ink: BRAND.blue,
    key: "pillarAdmin",
    mediaSrc: "/demos/finance.mp4",
    layout: "md:col-span-7 md:row-span-2",
    mediaMinH: "min-h-[200px] sm:min-h-[260px] md:min-h-[320px]",
    mediaObject: "object-top",
  },
  {
    id: "planner",
    tile: "#FFF0E4",
    ink: BRAND.blue,
    key: "pillarPlanner",
    mediaSrc: "/demos/cours.mp4",
    layout: "md:col-span-5 md:row-span-1 md:translate-y-2",
    mediaMinH: "min-h-[180px] sm:min-h-[200px]",
    mediaObject: "object-[center_20%]",
  },
  {
    id: "community",
    tile: "#EEF6F0",
    ink: BRAND.blue,
    key: "pillarCommunity",
    mediaSrc: "/demos/communaute.mp4",
    layout: "md:col-span-5 md:row-span-1 md:-translate-y-4",
    mediaMinH: "min-h-[180px] sm:min-h-[220px]",
    mediaObject: "object-top",
  },
  {
    id: "tutor",
    tile: "#F3EDE6",
    ink: BRAND.blue,
    key: "pillarTutor",
    mediaSrc: "/demos/simulateur.mp4",
    layout: "md:col-span-7 md:row-span-1",
    mediaMinH: "min-h-[180px] sm:min-h-[220px]",
    mediaObject: "object-top",
  },
] as const;

function PillarMedia({
  src,
  label,
  minHClass,
  objectClass,
}: {
  src: string;
  label: string;
  minHClass: string;
  objectClass: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          setInView(true);
        } else {
          setInView(false);
        }
      },
      { rootMargin: "120px", threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    if (inView) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inView, shouldLoad]);

  return (
    <div
      ref={rootRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white/70 shadow-[0_16px_40px_rgba(17,34,78,0.10)] ${minHClass}`}
    >
      {shouldLoad ? (
        <video
          ref={videoRef}
          src={src}
          className={`absolute inset-0 h-full w-full ${objectClass}`}
          muted
          loop
          playsInline
          preload="none"
          aria-label={label}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8EEF8] to-[#F0F3F8]" aria-hidden />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.06] via-transparent to-transparent"
        aria-hidden
      />
    </div>
  );
}

export default function FourPillarCards() {
  const { t } = useI18n();
  return (
    <section className="relative z-10 py-12 sm:py-14 xl:py-16">
      <div className="nexa-marketing-shell">
        <div className="mb-8 sm:mb-10 max-w-2xl">
          <h2 className="nexa-marketing-title mb-3" style={{ color: BRAND.blue }}>
            {t("landing", "pillarsTitle")}
          </h2>
          <p className="text-neutral-500 font-medium leading-relaxed text-[15px] sm:text-base">
            {t("landing", "pillarsDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 xl:gap-6 md:auto-rows-min">
          {PILLARS.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-48px" }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className={`flex flex-col overflow-hidden rounded-sm transition-transform duration-500 ease-out hover:scale-[1.008] ${p.layout}`}
              style={{ backgroundColor: p.tile }}
            >
              <div className="flex flex-col flex-1 px-5 pt-6 sm:px-7 sm:pt-7 pb-4 sm:pb-5">
                <h3
                  className="text-xl sm:text-2xl xl:text-[1.65rem] font-black tracking-tight leading-[1.15] mb-2.5 sm:mb-3"
                  style={{ color: p.ink }}
                >
                  {t("landing", `${p.key}Title`)}
                </h3>
                <p className="text-[15px] sm:text-base xl:text-lg font-medium leading-relaxed text-neutral-600 mb-5 sm:mb-6 max-w-xl">
                  {t("landing", `${p.key}Text`)}
                </p>
                <PillarMedia
                  src={p.mediaSrc}
                  label={t("landing", `${p.key}Media`)}
                  minHClass={p.mediaMinH}
                  objectClass={p.mediaObject}
                />
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
