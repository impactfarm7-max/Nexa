"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/app/utils/supabase";
import { isCenterStaff, CENTER_HOME } from "@/app/utils/student-routes";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BRAND } from "@/app/utils/brand";
import {
  NexaScrollShowcase,
  PersonaTabs,
  FourPillarCards,
  SuiteModulesGrid,
} from "@/app/components/landing";
import TypewriterHeroTitle from "@/app/components/landing/TypewriterHeroTitle";

const ORANGE = BRAND.orange;
const WHATSAPP = "237621105640";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* ── Redirection session (inchangé — routes préservées) ── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const authError = hashParams.get("error");
      const errorCode = hashParams.get("error_code");
      if (authError || errorCode) {
        const resetError =
          errorCode === "otp_expired" ||
          hashParams.get("error_description")?.toLowerCase().includes("expired")
            ? "expired" : "invalid";
        router.replace(`/login?reset_error=${resetError}`);
        return;
      }
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setChecking(false); return; }
      const [{ data: profile }, { data: centerMembership }] = await Promise.all([
        supabase.from("profiles").select("role, center_id").eq("id", session.user.id).maybeSingle(),
        supabase.from("center_users").select("center_id").eq("user_id", session.user.id).maybeSingle(),
      ]);
      if (profile?.role === "admin") router.replace("/admin");
      else if (isCenterStaff(profile) || centerMembership?.center_id) router.replace(CENTER_HOME);
      else router.replace("/dashboard");
    });
  }, [router]);

  const talkToAgent = () =>
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Bonjour NEXA, je souhaite en savoir plus sur la plateforme.")}`,
      "_blank",
    );

  if (checking) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ORANGE, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    // overflow-x-hidden on this root breaks position:sticky for the showcase pin
    <div className="min-h-screen bg-[#FFFBF7] text-neutral-900 font-sans antialiased scroll-smooth">

      {/* Fond mesh subtil */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{ background: `radial-gradient(circle, ${ORANGE}, transparent 70%)` }} />
        <div className="absolute bottom-[-10%] left-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background: `radial-gradient(circle, ${BRAND.blue}, transparent 70%)` }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(${BRAND.blue} 1px, transparent 1px), linear-gradient(90deg, ${BRAND.blue} 1px, transparent 1px)`, backgroundSize: "64px 64px" }} />
      </div>

      {/* ══ NAV ══ */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#FFFBF7]/80 backdrop-blur-xl">
        <div className="nexa-marketing-shell h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image
                src={BRAND.logo}
                alt="NEXA"
                width={40}
                height={40}
                priority
                className="rounded-lg w-9 h-9 sm:w-10 sm:h-10 object-cover"
              />
              <span className="font-black text-base sm:text-lg tracking-tight" style={{ color: BRAND.blue }}>
                NEXA
              </span>
            </Link>

            {/* Programmes / Valeurs — pages dédiées */}
            <nav className="hidden sm:flex items-center gap-1" aria-label="Navigation principale">
              <Link
                href="/programmes"
                className="px-2.5 py-1.5 text-[12px] xl:text-[13px] font-bold text-neutral-600 hover:text-[#11224E] transition"
              >
                Nos programmes
              </Link>
              <Link
                href="/valeurs"
                className="px-2.5 py-1.5 text-[12px] xl:text-[13px] font-bold text-neutral-600 hover:text-[#11224E] transition"
              >
                Nos valeurs
              </Link>
            </nav>
          </div>

          {/* E3 — actions à droite */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/presentation" className="hidden md:flex items-center h-10 px-4 rounded-xl text-[12px] xl:text-[13px] font-bold border border-black/10 bg-white hover:border-black/20 transition whitespace-nowrap">
              Découvrir la plateforme
            </Link>
            <button onClick={talkToAgent} className="hidden md:flex items-center h-10 px-4 rounded-xl text-[12px] xl:text-[13px] font-bold border border-black/10 bg-white hover:border-black/20 transition whitespace-nowrap">
              Discuter avec un agent
            </button>
            <Link href="/login" className="flex items-center h-10 px-4 sm:px-5 rounded-xl text-[12px] xl:text-[13px] font-black text-white transition hover:opacity-90 whitespace-nowrap" style={{ backgroundColor: BRAND.blue }}>
              Se connecter
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="sm:hidden w-10 h-10 rounded-xl border border-black/10 bg-white flex items-center justify-center text-neutral-700"
            aria-label="Menu"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden overflow-hidden border-t border-black/6 bg-[#FFFBF7]"
            >
              <div className="px-4 py-4 flex flex-col gap-2">
                <Link
                  href="/programmes"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center h-11 px-4 rounded-xl text-sm font-bold text-neutral-700"
                >
                  Nos programmes
                </Link>
                <Link
                  href="/valeurs"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center h-11 px-4 rounded-xl text-sm font-bold text-neutral-700"
                >
                  Nos valeurs
                </Link>
                <div className="h-px bg-black/[0.06] my-1" />
                <Link href="/presentation" onClick={() => setMobileNavOpen(false)} className="flex items-center h-11 px-4 rounded-xl text-sm font-bold border border-black/10 bg-white">
                  Découvrir la plateforme
                </Link>
                <button onClick={() => { setMobileNavOpen(false); talkToAgent(); }} className="flex items-center h-11 px-4 rounded-xl text-sm font-bold border border-black/10 bg-white text-left">
                  Discuter avec un agent
                </button>
                <Link href="/login" onClick={() => setMobileNavOpen(false)} className="flex items-center justify-center h-11 px-4 rounded-xl text-sm font-black text-white" style={{ backgroundColor: BRAND.blue }}>
                  Se connecter
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══ HERO ══ */}
      <section className="relative z-10 nexa-marketing-shell pt-6 sm:pt-8 md:pt-10 pb-5 sm:pb-6">
        <motion.div {...fadeUp(0)} className="max-w-4xl xl:max-w-5xl mx-auto text-center">
          <TypewriterHeroTitle />

          <div
            className="mx-auto mb-5 sm:mb-6 h-px w-12 sm:w-14"
            style={{ background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)` }}
            aria-hidden
          />

          <p className="text-[15px] sm:text-lg xl:text-xl text-neutral-500 font-medium leading-relaxed max-w-2xl mx-auto mb-7 sm:mb-8">
            Nous déployons une technologie qui façonne des expériences enrichissantes
            pour ceux qui transmettent le savoir — et pour ceux qui le reçoivent.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/presentation"
              className="inline-flex items-center justify-center min-h-12 px-7 sm:px-8 py-3.5 rounded-2xl text-[13px] sm:text-sm font-black text-white transition hover:opacity-95 active:scale-[0.98]"
              style={{ backgroundColor: BRAND.blue, boxShadow: `0 12px 32px ${BRAND.blue}28` }}
            >
              Découvrir la plateforme
            </Link>
            <Link
              href="/ouvrir-centre"
              className="inline-flex items-center justify-center min-h-12 px-7 sm:px-8 py-3.5 rounded-2xl text-[13px] sm:text-sm font-bold border border-black/10 bg-white text-neutral-700 transition hover:border-black/20 hover:bg-[#FFFBF7] active:scale-[0.98]"
            >
              Demander un espace centre
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ══ SHOWCASE SCROLL ══ */}
      <div className="relative z-10">
        <NexaScrollShowcase />
      </div>

      <PersonaTabs />
      <FourPillarCards />
      <SuiteModulesGrid />

      {/* Pont soft vers pages dédiées */}
      <section className="relative z-10 border-y border-black/6 bg-white py-10 sm:py-12">
        <div className="nexa-marketing-shell flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <h2 className="nexa-marketing-title" style={{ color: BRAND.blue }}>
              Programmes, mission et valeurs NEXA
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/programmes"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-[13px] font-bold border border-black/10 bg-white hover:border-black/20 transition"
            >
              Nos programmes →
            </Link>
            <Link
              href="/valeurs"
              className="inline-flex items-center justify-center h-11 px-5 rounded-xl text-[13px] font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: BRAND.blue }}
            >
              Nos valeurs →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ CENTRES B2B ══ */}
      <section className="relative z-10 py-14 sm:py-16 overflow-hidden" style={{ backgroundColor: BRAND.blue }}>
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 80% 20%, ${ORANGE}, transparent 50%)` }} />
        <div className="relative nexa-marketing-shell grid lg:grid-cols-2 gap-8 xl:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: ORANGE }}>Vous êtes un centre ?</p>
            <h2 className="nexa-marketing-title text-white leading-tight mb-4">NEXA est fait<br />pour vous.</h2>
            <p className="text-white/60 font-medium leading-relaxed mb-6 max-w-md">
              Gérez vos filières, vos campus, vos formateurs et vos finances.
              Un agent NEXA vous accompagne dès la validation de votre demande.
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-7 text-[13px] font-semibold text-white/75">
              {[
                "Gestion multi-campus",
                "Bulletins & périodes",
                "Planning intelligent",
                "Communauté intégrée",
                "Finance & encaissements",
                "Constructeur de cours",
              ].map((c) => (
                <li key={c} className="flex items-center gap-2.5">
                  <span className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: ORANGE }} aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
            <Link href="/ouvrir-centre" className="inline-flex items-center h-12 px-7 rounded-2xl text-sm font-black text-white transition hover:opacity-90" style={{ backgroundColor: ORANGE }}>
              Faire une demande — Centre
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="border border-white/10 bg-white/[0.06] backdrop-blur p-6 sm:p-8">
            <div className="space-y-0 divide-y divide-white/10">
              {[
                { step: "01", text: "Remplissez le formulaire de demande" },
                { step: "02", text: "Validation — un agent vous contacte très bientôt" },
                { step: "03", text: "Configuration de votre espace centre" },
                { step: "04", text: "Formation de votre équipe & lancement" },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <span className="text-[11px] font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: ORANGE }}>{s.step}</span>
                  <p className="text-sm font-semibold text-white/80 pt-1.5">{s.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ CTA FINAL ══ */}
      <section className="relative z-10 max-w-3xl mx-auto px-5 pb-14 sm:pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative px-6 py-10 sm:px-10 sm:py-12 border border-black/[0.08] bg-white"
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-16"
            style={{ backgroundColor: ORANGE }}
            aria-hidden
          />
          <h2 className="nexa-marketing-title mb-3" style={{ color: BRAND.blue }}>
            L&apos;éducation pour tous.
          </h2>
          <p className="text-neutral-500 font-medium mb-6 max-w-md mx-auto">
            Rejoignez la révolution EdTech qui transforme la formation en Afrique.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={talkToAgent} className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-2xl text-sm font-bold border-2 transition hover:bg-neutral-50" style={{ borderColor: ORANGE, color: ORANGE }}>
              Discuter avec un agent
            </button>
            <Link href="/ouvrir-centre" className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-2xl text-sm font-black text-white transition hover:opacity-90" style={{ backgroundColor: BRAND.blue }}>
              Créer un centre
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="relative z-10 border-t border-black/6 bg-white py-6 sm:py-8">
        <div className="nexa-marketing-shell flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src={BRAND.logo} alt="NEXA" width={28} height={28} className="rounded-lg object-cover" />
            <span className="font-black text-sm" style={{ color: BRAND.blue }}>NEXA</span>
            <span className="text-[10px] text-neutral-400 font-bold">NEXT × AFRICA</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-[11px] font-bold text-neutral-400">
            <Link href="/programmes" className="hover:text-neutral-700 transition">Programmes</Link>
            <Link href="/valeurs" className="hover:text-neutral-700 transition">Valeurs</Link>
            <Link href="/presentation" className="hover:text-neutral-700 transition">Présentation</Link>
            <Link href="/ouvrir-centre" className="hover:text-neutral-700 transition">Ouvrir un centre</Link>
            <Link href="/cgu" className="hover:text-neutral-700 transition">CGU</Link>
          </div>
          <p className="text-[10px] text-neutral-300 font-bold">© {new Date().getFullYear()} NEXA</p>
        </div>
      </footer>
    </div>
  );
}
