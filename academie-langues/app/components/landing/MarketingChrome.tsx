"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BRAND } from "@/app/utils/brand";

const WHATSAPP = "237621105640";

type ActiveNav = "programmes" | "valeurs" | null;

export default function MarketingChrome({
  children,
  active,
  hideFooter = false,
}: {
  children: ReactNode;
  active?: ActiveNav;
  /** Masque le footer (ex. wizard /ouvrir-centre). */
  hideFooter?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const talkToAgent = () =>
    window.open(
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Bonjour NEXA, je souhaite en savoir plus sur la plateforme.")}`,
      "_blank",
    );

  const navLink = (href: string, label: string, key: ActiveNav) => {
    const isActive = active === key;
    return (
      <Link
        href={href}
        className="px-2.5 py-1.5 text-[12px] xl:text-[13px] font-bold transition"
        style={{ color: isActive ? BRAND.blue : "rgba(17,34,78,0.55)" }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-neutral-900 font-sans antialiased">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle, ${BRAND.orange}, transparent 70%)` }}
        />
        <div
          className="absolute bottom-[-10%] left-[-15%] w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: `radial-gradient(circle, ${BRAND.blue}, transparent 70%)` }}
        />
      </div>

      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#FFFBF7]/80 backdrop-blur-xl">
        <div className="nexa-marketing-shell h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image
                src={BRAND.logo}
                alt="NEXA"
                width={40}
                height={40}
                className="rounded-lg w-9 h-9 sm:w-10 sm:h-10 object-cover"
              />
              <span className="font-black text-base sm:text-lg tracking-tight" style={{ color: BRAND.blue }}>
                NEXA
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1" aria-label="Navigation principale">
              {navLink("/programmes", "Nos programmes", "programmes")}
              {navLink("/valeurs", "Nos valeurs", "valeurs")}
            </nav>
          </div>

          <div className="hidden sm:flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/presentation"
              className="hidden md:flex items-center h-10 px-4 rounded-xl text-[12px] xl:text-[13px] font-bold border border-black/10 bg-white hover:border-black/20 transition whitespace-nowrap"
            >
              Découvrir la plateforme
            </Link>
            <button
              type="button"
              onClick={talkToAgent}
              className="hidden md:flex items-center h-10 px-4 rounded-xl text-[12px] xl:text-[13px] font-bold border border-black/10 bg-white hover:border-black/20 transition whitespace-nowrap"
            >
              Discuter avec un agent
            </button>
            <Link
              href="/login"
              className="flex items-center h-10 px-4 sm:px-5 rounded-xl text-[12px] xl:text-[13px] font-black text-white transition hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: BRAND.blue }}
            >
              Se connecter
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="sm:hidden w-10 h-10 rounded-xl border border-black/10 bg-white flex items-center justify-center text-neutral-700"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sm:hidden overflow-hidden border-t border-black/6 bg-[#FFFBF7]"
            >
              <div className="px-4 py-4 flex flex-col gap-2">
                <Link href="/programmes" onClick={() => setMobileOpen(false)} className="flex items-center h-11 px-4 rounded-xl text-sm font-bold text-neutral-700">
                  Nos programmes
                </Link>
                <Link href="/valeurs" onClick={() => setMobileOpen(false)} className="flex items-center h-11 px-4 rounded-xl text-sm font-bold text-neutral-700">
                  Nos valeurs
                </Link>
                <div className="h-px bg-black/[0.06] my-1" />
                <Link href="/presentation" onClick={() => setMobileOpen(false)} className="flex items-center h-11 px-4 rounded-xl text-sm font-bold border border-black/10 bg-white">
                  Découvrir la plateforme
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    talkToAgent();
                  }}
                  className="flex items-center h-11 px-4 rounded-xl text-sm font-bold border border-black/10 bg-white text-left"
                >
                  Discuter avec un agent
                </button>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center h-11 px-4 rounded-xl text-sm font-black text-white"
                  style={{ backgroundColor: BRAND.blue }}
                >
                  Se connecter
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10">{children}</main>

      {!hideFooter && (
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
          </div>
          <p className="text-[10px] text-neutral-300 font-bold">© {new Date().getFullYear()} NEXA</p>
        </div>
      </footer>
      )}
    </div>
  );
}
