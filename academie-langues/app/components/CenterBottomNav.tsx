"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { peekCenterBootstrap } from "@/app/utils/center-me-cache";
import {
  getCenterBottomBarItems,
  getCenterBottomSheetItems,
  type CenterNavItem,
} from "@/app/utils/centerNavItems";
import { BRAND } from "@/app/utils/brand";

const BLUE = BRAND.blue;
const ORANGE = BRAND.orange;

export default function CenterBottomNav() {
  const pathname = usePathname();
  const [isTCF, setIsTCF] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const bootstrap = peekCenterBootstrap();
    const center = bootstrap?.me?.center as { center_type?: string } | undefined;
    setIsTCF(center?.center_type === "tcf_canada");
  }, [pathname]);

  if (pathname?.includes("/quiz") || pathname?.startsWith("/centre/communaute")) {
    return null;
  }

  const { left, right } = getCenterBottomBarItems(isTCF);
  const sheetItems = getCenterBottomSheetItems(isTCF);

  const renderLink = (item: CenterNavItem) => {
    const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        href={item.path}
        className="relative flex flex-col items-center justify-center w-full min-w-0 px-0.5 active:scale-95 transition-transform"
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? BLUE : "#94a3b8" }} />
        <span
          className={`text-[10px] mt-1 text-center leading-tight truncate max-w-full ${
            isActive ? "font-bold" : "font-medium text-slate-400"
          }`}
          style={isActive ? { color: BLUE } : undefined}
        >
          {item.shortLabel ?? item.label}
        </span>
      </Link>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-[#11224E]/60 backdrop-blur-sm z-[45]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="md:hidden fixed bottom-[calc(70px+env(safe-area-inset-bottom))] left-3 right-3 max-h-[min(70vh,520px)] overflow-y-auto bg-white rounded-3xl shadow-2xl p-4 z-[50] border border-slate-100"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-sm font-black" style={{ color: BLUE }}>
                Navigation centre
              </p>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                aria-label="Fermer le menu"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {sheetItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + "/");
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                      isActive ? "bg-[#11224E]/10 ring-2 ring-[#11224E]/20" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center ${
                        isActive ? "text-white" : "text-[#11224E]"
                      }`}
                      style={{ backgroundColor: isActive ? BLUE : "rgba(17,34,78,0.08)" }}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href="/centre/profil"
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${
                  pathname === "/centre/profil" ? "bg-[#11224E]/10 ring-2 ring-[#11224E]/20" : "bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#11224E]" style={{ backgroundColor: "rgba(17,34,78,0.08)" }}>
                  <User size={20} />
                </div>
                <span className="text-[11px] font-bold text-slate-700">Mon profil</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[60]">
        <nav className="flex justify-between items-center h-[70px] pb-[env(safe-area-inset-bottom)] px-1 sm:px-2">
          <div className="flex flex-1 justify-around min-w-0">{left.map(renderLink)}</div>

          <div className="relative -top-5 flex justify-center w-[72px] sm:w-[80px] shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white transition-transform active:scale-90"
              style={{ backgroundColor: ORANGE, boxShadow: `0 10px 25px ${ORANGE}66` }}
              aria-label="Ouvrir le menu de navigation"
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Plus size={28} className="text-white" strokeWidth={3} />
              </motion.div>
            </button>
          </div>

          <div className="flex flex-1 justify-around min-w-0">{right.map(renderLink)}</div>
        </nav>
      </div>
    </>
  );
}
