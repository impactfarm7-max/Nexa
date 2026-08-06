"use client";

import { ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";

const WHATSAPP = "237621105640";
const PHONE = "+237621105640";
const EMAIL = "contact@nexa-edu.com";

export default function AgentContactMenu({ mobile = false, cta = false }: { mobile?: boolean; cta?: boolean }) {
  const { t } = useI18n();
  const whatsappUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t("landing", "whatsappMessage"))}`;
  const summaryClass = cta
    ? "w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl border-2 px-8 text-sm font-bold transition hover:bg-neutral-50"
    : mobile
      ? "flex h-11 w-full items-center justify-between rounded-xl border border-black/10 bg-white px-4 text-sm font-bold"
      : "hidden md:flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-[12px] font-bold whitespace-nowrap transition hover:border-black/20 xl:text-[13px]";

  return (
    <details className={`group relative ${cta ? "w-full sm:w-auto" : ""}`}>
      <summary
        className={`${summaryClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
        style={cta ? { borderColor: "#EB670E", color: "#EB670E" } : undefined}
      >
        {t("landing", "talkToAgent")}
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className={`z-[70] mt-2 min-w-52 overflow-hidden rounded-xl border border-black/10 bg-white p-1.5 shadow-xl ${mobile ? "relative w-full" : "absolute right-0"}`}>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          <MessageCircle className="h-4 w-4 text-emerald-600" /> {t("landing", "contactWhatsapp")}
        </a>
        <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          <Mail className="h-4 w-4 text-red-500" /> {t("landing", "contactEmail")}
        </a>
        <a href={`tel:${PHONE}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          <Phone className="h-4 w-4 text-blue-600" /> {t("landing", "contactCall")}
        </a>
      </div>
    </details>
  );
}
