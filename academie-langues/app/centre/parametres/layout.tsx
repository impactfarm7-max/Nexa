"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FileText, Building2, MapPin, Calendar, Video, Share2, Download, Loader2,
} from "lucide-react";
import { getCenterMeCache } from "@/app/utils/center-me-cache";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  BLUE,
  ORANGE,
  PAGE_BG,
  CenterPageLayout,
  centerNotoSans,
  OutlineHeaderButton,
} from "@/app/centre/center-page-ui";

const ALL_TABS = [
  { label: "Entreprise", short: "Entreprise", icon: Building2, path: "/centre/parametres/entreprise", hideForTCF: false },
  { label: "Campus", short: "Campus", icon: MapPin, path: "/centre/parametres/campus", hideForTCF: false },
  { label: "Documents", short: "Docs", icon: FileText, path: "/centre/parametres/documents", hideForTCF: false },
  { label: "Live & Rappels", short: "Live", icon: Video, path: "/centre/parametres/live", hideForTCF: false },
  { label: "Bulletins & Périodes", short: "Bulletins", icon: Calendar, path: "/centre/parametres/periodes", hideForTCF: true },
];

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ParametresShareMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loadCampusesCsv = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session expirée.");
    const { data: profile } = await supabase
      .from("profiles")
      .select("center_id")
      .eq("id", session.user.id)
      .single();
    if (!profile?.center_id) throw new Error("Centre introuvable.");
    const { data: rows } = await supabase
      .from("campuses")
      .select("name, code, status, city, country, phone, is_main, address")
      .eq("center_id", profile.center_id)
      .order("is_main", { ascending: false })
      .order("name");
    const header = ["Nom", "Code", "Statut", "Ville", "Pays", "Téléphone", "Principal", "Adresse"];
    const lines = (rows || []).map((c) =>
      [
        c.name,
        c.code || "",
        c.status || "",
        c.city || "",
        c.country || "",
        c.phone || "",
        c.is_main ? "oui" : "non",
        c.address || "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    return [header.join(","), ...lines].join("\n");
  };

  const run = async (kind: "csv" | "pdf" | "whatsapp") => {
    setOpen(false);
    setBusy(true);
    try {
      const csv = await loadCampusesCsv();
      if (kind === "csv") {
        downloadTextFile(`campus_nexa_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
      } else if (kind === "pdf") {
        downloadTextFile(`campus_nexa_${new Date().toISOString().slice(0, 10)}.txt`, csv.replace(/","/g, " | ").replace(/"/g, ""), "text/plain;charset=utf-8");
      } else {
        downloadTextFile(`campus_nexa_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
        const text = encodeURIComponent("Liste des campus Nexa (joignez le fichier CSV téléchargé).");
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} className="relative print:hidden shrink-0">
      <OutlineHeaderButton
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} strokeWidth={2.25} />}
        <span className="hidden sm:inline">Partager</span>
      </OutlineHeaderButton>
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-40 min-w-[11.5rem] rounded-lg border border-black/[0.08] bg-white shadow-lg overflow-hidden"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void run("pdf")}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03]"
          >
            <FileText size={14} className="text-neutral-400" /> PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void run("csv")}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03]"
          >
            <Download size={14} className="text-neutral-400" /> CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void run("whatsapp")}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.03] border-t border-black/[0.05]"
          >
            <Share2 size={14} className="text-neutral-400" /> WhatsApp (PDF)
          </button>
        </div>
      )}
    </div>
  );
}

function ParametresLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const isSetup = params.get("setup") === "1";
  const [isTCF, setIsTCF] = useState(false);

  useEffect(() => {
    const cached = getCenterMeCache();
    const center = cached?.center as { center_type?: string } | undefined;
    if (center?.center_type) {
      setIsTCF(center.center_type === "tcf_canada");
      return;
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", session.user.id)
        .single();
      if (!profile?.center_id) return;
      const { data: centerRow } = await supabase
        .from("centers")
        .select("center_type")
        .eq("id", profile.center_id)
        .single();
      setIsTCF(centerRow?.center_type === "tcf_canada");
    })();
  }, []);

  const tabs = ALL_TABS.filter((tab) => !(isTCF && tab.hideForTCF));

  if (isSetup) {
    return (
      <div
        className={`${centerNotoSans.className} w-full min-w-0 min-h-[100dvh] pb-28`}
        style={{ ...centerNotoSans.style, backgroundColor: PAGE_BG }}
      >
        {children}
      </div>
    );
  }

  return (
    <CenterPageLayout
      header={
        <header
          className="shrink-0 h-[68px] border-b border-black/[0.06] z-30"
          style={{ backgroundColor: PAGE_BG, ...centerNotoSans.style }}
        >
          <div className="nexa-center-shell h-full flex items-center justify-between gap-2 sm:gap-3">
            <h1
              className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight min-w-0 leading-tight truncate shrink-0"
              style={{ color: BLUE, ...centerNotoSans.style }}
            >
              Paramètres
            </h1>

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-end">
              <nav
                className="flex items-center gap-1 overflow-x-auto min-w-0 max-w-full scrollbar-none"
                aria-label="Rubriques paramètres"
              >
                {tabs.map((tab) => {
                  const isActive = pathname === tab.path;
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.path}
                      href={tab.path}
                      className={`h-8 px-2 sm:px-2.5 rounded-lg text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors shrink-0 ${
                        isActive
                          ? "text-white border-transparent"
                          : "bg-white text-neutral-600 border-black/[0.08] hover:bg-black/[0.03]"
                      }`}
                      style={isActive ? { backgroundColor: BLUE } : undefined}
                    >
                      <Icon size={13} style={{ color: isActive ? "#fff" : ORANGE }} />
                      <span className="hidden md:inline">{tab.label}</span>
                      <span className="md:hidden">{tab.short}</span>
                    </Link>
                  );
                })}
              </nav>
              <ParametresShareMenu />
            </div>
          </div>
        </header>
      }
    >
      <div className="nexa-center-shell py-5 sm:py-6 min-w-0" style={centerNotoSans.style}>
        {children}
      </div>
    </CenterPageLayout>
  );
}

export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<CenterPageLoading className="bg-[#FFFBF7]" />}>
      <ParametresLayoutInner>{children}</ParametresLayoutInner>
    </Suspense>
  );
}
