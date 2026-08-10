"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, ChevronRight, ChevronLeft, X, Lock,
  LibraryBig, BookCopy, BookText, ScrollText, Languages, Hammer,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import { useStudentCenterContext } from "@/app/hooks/useStudentCenterContext";

import dynamic from "next/dynamic";
const PdfReader = dynamic(() => import("../bibliotheque/PdfReader"), { ssr: false });

import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

const ICONS_MAP: Record<string, typeof LibraryBig> = {
  BookOpen: LibraryBig,
  FileText: ScrollText,
  BookMarked: BookCopy,
  Languages: Languages,
  Hammer: Hammer,
  LibraryBig: LibraryBig,
  BookCopy: BookCopy,
  BookText: BookText,
  ScrollText: ScrollText,
};

export default function BibliothequePubliquePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { loading: centerLoading, isPluriannual } = useStudentCenterContext();

  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (centerLoading || isPluriannual) return;
    router.replace("/dashboard");
  }, [centerLoading, isPluriannual, router]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");

      const res = await fetch("/api/bibliotheque-publique", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setDocuments(json.documents || []);

      setLoading(false);
    };

    load();
  }, [router]);

  const openDocument = async (storagePath: string, doc: any) => {
    if (doc.is_paid) {
      alert(`Ce document est payant (${Number(doc.price || 0).toLocaleString("fr-FR")} FCFA). Contactez votre centre pour y accéder.`);
      return;
    }
    setIsLoadingPdf(true);
    setPageNumber(1);
    setNumPages(null);

    try {
      const { data, error } = await supabase
        .storage
        .from("ressources_iag")
        .createSignedUrl(storagePath, 60);

      if (error || !data) {
        alert("Impossible de charger le document.");
        return;
      }

      setViewingDoc(data.signedUrl);
    } catch {
      alert("Une erreur de connexion est survenue.");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function changePage(offset: number) {
    setPageNumber((prev) => prev + offset);
  }

  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const inTitle = doc.titre?.toLowerCase().includes(query);
    const inCategory = doc.categorie?.toLowerCase().includes(query);
    const inKeywords = doc.mots_cles?.some((mot: string) => mot.toLowerCase().includes(query));
    return inTitle || inCategory || inKeywords;
  });

  if (centerLoading || loading) return <StudentRouteSkeleton contentOnly variant="page" />;

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-neutral-900 font-sans pb-24 md:pb-12 overflow-x-hidden selection:bg-orange-500/30">

      <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60">
        <div className="nexa-student-shell py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              aria-label="Retour"
              className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition group"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="font-display font-black tracking-tight leading-none text-[clamp(1rem,0.9rem+0.55vw,1.5rem)]" style={{ color: BRAND.blue }}>
                {t("dashboard", "navPublicLibrary")}
              </h1>
              <p className={`${STUDENT_TEXT.badge} mt-0.5`} style={{ color: BRAND.orange }}>Accès libre à tous les documents</p>
            </div>
          </div>

          <div className="hidden md:flex items-center bg-white border border-orange-200 rounded-lg px-3 py-2 w-64 xl:w-80 focus-within:border-orange-400 transition-colors group">
            <Search className="w-4 h-4 text-neutral-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Chercher (ex: grammaire, culture...)"
              className="bg-transparent border-none outline-none ml-2 text-xs font-medium w-full text-neutral-700 placeholder:text-neutral-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="md:hidden nexa-student-shell pb-3">
          <div className="flex items-center bg-white border border-orange-200 rounded-lg px-3 py-2.5 focus-within:border-orange-400 transition-colors group">
            <Search className="w-4 h-4 text-neutral-400 group-focus-within:text-orange-500 transition-colors shrink-0" />
            <input
              type="text"
              placeholder="Chercher (ex: grammaire, culture...)"
              className="bg-transparent border-none outline-none ml-2 text-xs font-medium w-full text-neutral-700 placeholder:text-neutral-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="nexa-student-shell pt-6 space-y-10 xl:space-y-12">

        <section>
          <div className="flex items-center gap-3 mb-4 px-1">
            <h2 className={`${STUDENT_TEXT.cardTitle} flex items-center gap-2`} style={{ color: BRAND.blue }}>
              <LibraryBig className="w-4 h-4" style={{ color: BRAND.orange }} /> Documents disponibles
            </h2>
            <div className="h-px flex-1 bg-orange-100" />
          </div>

          <div className="grid gap-[clamp(0.75rem,0.5rem+0.8vw,1.35rem)] grid-cols-[repeat(auto-fill,minmax(clamp(9.5rem,28vw,14rem),1fr))]">
            {filteredDocs.map((doc: any) => {
              const IconComponent = ICONS_MAP[doc.icone] || LibraryBig;

              return (
                <article key={doc.id}>
                  <button
                    onClick={() => openDocument(doc.storage_path, doc)}
                    disabled={isLoadingPdf}
                    className={`w-full bg-white rounded-xl border border-orange-200 transition-colors text-left group relative overflow-hidden flex flex-col justify-between ${
                      isLoadingPdf ? "opacity-50 cursor-wait" : "hover:border-orange-400"
                    }`}
                    style={{
                      padding: "clamp(0.85rem, 0.65rem + 0.7vw, 1.35rem)",
                      minHeight: "clamp(8.5rem, 7rem + 4vw, 11rem)",
                    }}
                  >
                    {doc.is_paid && (
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                        <Lock className="w-2.5 h-2.5 text-orange-500" />
                        <span className="text-[9px] font-black text-orange-600">{Number(doc.price || 0).toLocaleString("fr-FR")} F</span>
                      </div>
                    )}
                    <div className="flex items-start gap-3 z-10 relative">
                      <div
                        className="bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors"
                        style={{ width: "clamp(2.25rem, 1.9rem + 1vw, 2.75rem)", height: "clamp(2.25rem, 1.9rem + 1vw, 2.75rem)" }}
                      >
                        <IconComponent className="text-orange-600" strokeWidth={1.75} style={{ width: "clamp(1.1rem, 0.95rem + 0.45vw, 1.35rem)", height: "clamp(1.1rem, 0.95rem + 0.45vw, 1.35rem)" }} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-display font-black block mb-0.5 text-[clamp(0.58rem,0.52rem+0.22vw,0.72rem)]" style={{ color: BRAND.orange }}>{doc.categorie}</span>
                        <h3 className="font-display font-black leading-snug pr-4 text-[clamp(0.82rem,0.74rem+0.35vw,1.05rem)]" style={{ color: BRAND.blue }}>{doc.titre}</h3>
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}

            {filteredDocs.length === 0 && (
              <div className="col-span-full py-12 text-center text-neutral-400 text-sm bg-white rounded-xl border border-dashed border-orange-200">
                Aucun document ne correspond à &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </section>

      </main>

      <AnimatePresence>
        {viewingDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#FFFBF7]/95 backdrop-blur-md z-[100] flex flex-col p-0 md:p-4"
          >
            <div className="w-full max-w-7xl 2xl:max-w-[90rem] mx-auto h-full flex flex-col bg-white rounded-none md:rounded-xl border-0 md:border border-orange-200 overflow-hidden shadow-lg shadow-orange-100/40">

              <div className="flex items-center justify-between px-4 py-3 bg-[#FFFBF7] border-b border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
                    <LibraryBig className="text-white w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className={`${STUDENT_TEXT.cardTitle} leading-tight`} style={{ color: BRAND.blue }}>Lecteur NEXA</p>
                    <p className="text-[10px] font-medium" style={{ color: BRAND.orange }}>Anti-copie activé</p>
                  </div>
                </div>

                <button
                  onClick={() => setViewingDoc(null)}
                  aria-label="Fermer le lecteur PDF"
                  className="bg-white border border-orange-200 hover:border-orange-400 hover:bg-orange-50 font-semibold p-2 md:px-3 md:py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
                  style={{ color: BRAND.blue }}
                >
                  <span className="hidden md:inline">Fermer</span> <X className="w-4 h-4" />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center bg-neutral-100/80 relative"
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitUserSelect: "none", userSelect: "none" }}
              >
                <div className="py-4 md:py-6 px-2 md:px-4 flex justify-center w-full">
                  <PdfReader
                    file={viewingDoc}
                    pageNumber={pageNumber}
                    onLoadSuccess={onDocumentLoadSuccess}
                  />
                </div>
              </div>

              <div className="bg-white border-t border-orange-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-3 flex items-center justify-center gap-4 xl:gap-6">
                <button
                  disabled={pageNumber <= 1}
                  onClick={() => changePage(-1)}
                  aria-label="Page précédente"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: BRAND.blue }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <p className="text-xs md:text-sm xl:text-base font-semibold tabular-nums" style={{ color: BRAND.blue }}>
                  Page <span style={{ color: BRAND.orange }}>{pageNumber}</span> / {numPages || "—"}
                </p>

                <button
                  disabled={pageNumber >= (numPages || 1)}
                  onClick={() => changePage(1)}
                  aria-label="Page suivante"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: BRAND.blue }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[10px] text-neutral-400 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        NEXA Library Service • © 2026
      </p>
    </div>
  );
}
