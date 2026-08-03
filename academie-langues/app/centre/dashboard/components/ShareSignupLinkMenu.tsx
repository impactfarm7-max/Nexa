"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { BLUE, ORANGE } from "@/app/centre/center-page-ui";

type Props = {
  signupUrl: string;
  centerName?: string | null;
  copied: boolean;
  onCopy: () => void;
  variant?: "light" | "dark";
};

function shareMessage(centerName: string | null | undefined, url: string) {
  const label = centerName?.trim() || "notre centre";
  return `Bonjour,\n\nVoici le lien d'inscription pour ${label} :\n${url}\n\nÀ bientôt !`;
}

function openWhatsApp(text: string) {
  window.open(
    `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function openEmail(subject: string, body: string) {
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ShareSignupLinkMenu({
  signupUrl,
  centerName,
  copied,
  onCopy,
  variant = "light",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const message = shareMessage(centerName, signupUrl);
  const subject = `Inscription${centerName?.trim() ? ` — ${centerName.trim()}` : ""}`;

  const isDark = variant === "dark";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 font-semibold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-[0.98] ${
          isDark
            ? "h-8 px-2.5 rounded-lg border border-white/22 bg-white/10 text-[10px] font-bold text-white"
            : "h-9 sm:h-10 px-3.5 sm:px-4 rounded-lg text-xs bg-transparent hover:bg-[#11224E]/[0.04]"
        }`}
        style={isDark ? undefined : { color: BLUE, border: `1.5px solid ${BLUE}` }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Share2 size={isDark ? 11 : 14} strokeWidth={2.25} />
        <span className="hidden sm:inline">Partager le lien</span>
        <span className="sm:hidden">Partager</span>
        <ChevronDown
          size={isDark ? 11 : 14}
          className={`opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[100] mt-1.5 min-w-[11.5rem] rounded-lg border border-black/[0.08] bg-white py-1 shadow-lg overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03]"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} style={{ color: BLUE }} />}
            {copied ? "Lien copié !" : "Copier le lien"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              openWhatsApp(message);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03]"
          >
            <MessageCircle size={15} className="text-emerald-600" />
            WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              openEmail(subject, message);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03]"
          >
            <Mail size={15} style={{ color: ORANGE }} />
            Email
          </button>
        </div>
      )}
    </div>
  );
}
