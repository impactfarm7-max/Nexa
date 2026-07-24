"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, Hammer, Sparkles, Send, Bot, Languages,
  Lock, Crown, ChevronRight, ChevronLeft, X, AlertCircle,
  LibraryBig, BookCopy, BookText, ScrollText,
} from 'lucide-react';
import { supabase } from "@/app/utils/supabase";
import StudentRouteSkeleton from "@/app/components/StudentRouteSkeleton";
import { useStudentCenterContext } from "@/app/hooks/useStudentCenterContext";

// ✅ LE SECRET EST ICI : Importation dynamique pour éviter l'erreur Vercel (DOMMatrix is not defined)
import dynamic from 'next/dynamic';
const PdfReader = dynamic(() => import('./PdfReader'), { ssr: false });

import { BRAND, STUDENT_TEXT } from "@/app/utils/brand";

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

export default function BibliothequePage() {
  const router = useRouter();
  const { loading: centerLoading, isPluriannual } = useStudentCenterContext();
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const [searchSession, setSearchSession] = useState<any>(null);

  // --- ÉTATS POUR L'IA ---
  const [aiQuery, setAiQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<"dictionnaire" | "traduction" | null>(null);

  // --- ÉTATS POUR L'ABONNEMENT ET LE CHARGEMENT ---
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // ✅ MODIFICATION 2/3 : L'état pour stocker la liste des documents de Supabase
  const [documents, setDocuments] = useState<any[]>([]);

  // ✅ NOUVEAUX ÉTATS POUR LA PAGINATION DU PDF
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (centerLoading || !isPluriannual) return;
    router.replace("/tcf-canada/cours?tab=centre");
  }, [centerLoading, isPluriannual, router]);

  useEffect(() => {
    const checkPremiumStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/login");
      setSearchSession(session);

      await supabase.from('profiles').update({ current_activity: 'Dans la Bibliothèque 📚' }).eq('id', session.user.id);

      const { data: profile } = await supabase.from('profiles').select('subscription_ends_at').eq('id', session.user.id).single();
      
      if (profile?.subscription_ends_at) {
        const endDate = new Date(profile.subscription_ends_at).getTime();
        const now = new Date().getTime();
        if (endDate > now) setIsPremium(true);
      }
      
      // ✅ MODIFICATION 3/3 : On télécharge les documents depuis la BDD au démarrage
      const { data: docsData } = await supabase.from('bibliotheque_documents').select('*').order('id', { ascending: true });
      if (docsData) {
        setDocuments(docsData);
      }

      setLoading(false);
    };

    checkPremiumStatus();
  }, [router]);

  const openSecureDocument = async (storagePath: string) => {
    setIsLoadingPdf(true);
    setPageNumber(1); // On remet à la page 1 à chaque ouverture
    setNumPages(null);
    
    try {
      const { data, error } = await supabase
        .storage
        .from('ressources_iag')
        .createSignedUrl(storagePath, 60);

      if (error || !data) {
        console.error("Erreur de sécurisation du document:", error?.message);
        alert("Impossible de charger le document sécurisé.");
        return;
      }

      setViewingDoc(data.signedUrl);
      
    } catch (err) {
      console.error("Erreur inattendue:", err);
      alert("Une erreur de connexion est survenue.");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleAction = (callback: () => void) => {
    if (!isPremium) {
      setShowPremiumModal(true);
    } else {
      callback();
    }
  };

  const handleAISearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!aiQuery.trim()) return;
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    setIsSearching(true);
    setAiResponse(null);
    setAiError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/bibliotheque", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ query: aiQuery }),
      });

      const data = await res.json();
      if (!res.ok || data.error) setAiError(data.error || "Une erreur est survenue.");
      else setAiResponse(data.result);
    } catch {
      setAiError("Impossible de contacter le service IA. Vérifiez votre connexion.");
    } finally {
      setIsSearching(false);
    }
  };

  // ✅ FONCTIONS DE CONTRÔLE DU PDF
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  // Recherche dans le contenu des livres via API (debounced 400ms)
  useEffect(() => {
    if (!searchQuery.trim() || !searchSession) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingContent(true);
      try {
        const res = await fetch("/api/bibliotheque/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${searchSession.access_token}` },
          body: JSON.stringify({ query: searchQuery.trim() }),
        });
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearchingContent(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchSession]);

  // Si recherche active → utiliser les résultats API, sinon filtre local
  const filteredDocs = searchResults !== null ? searchResults : documents.filter(doc => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const inTitle = doc.titre.toLowerCase().includes(query);
    const inCategory = doc.categorie.toLowerCase().includes(query);
    const inKeywords = doc.mots_cles?.some((mot: string) => mot.toLowerCase().includes(query));
    return inTitle || inCategory || inKeywords;
  });

  if (loading) return <StudentRouteSkeleton contentOnly variant="page" />;

  return (
    <div className="min-h-screen bg-[#FFFBF7] text-neutral-900 font-sans pb-24 md:pb-12 overflow-x-hidden selection:bg-orange-500/30">
      
      <header className="sticky top-0 z-40 bg-[#FFFBF7]/95 backdrop-blur-xl border-b border-orange-100/60">
        <div className="nexa-student-shell py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              aria-label="Retour au tableau de bord"
              className="p-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-50 transition group"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-600 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="font-display font-black tracking-tight leading-none text-[clamp(1rem,0.9rem+0.55vw,1.5rem)]" style={{ color: BRAND.blue }}>Bibliothèque</h1>
              <p className={`${STUDENT_TEXT.badge} mt-0.5`} style={{ color: BRAND.orange }}>La Grande Bibliothèque d&apos;Afrique</p>
            </div>
          </div>

          <div className="hidden md:flex items-center bg-white border border-orange-200 rounded-lg px-3 py-2 w-64 xl:w-80 focus-within:border-orange-400 transition-colors group relative">
            <Search className="w-4 h-4 text-neutral-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Chercher (ex: clavier, grammaire...)"
              className="bg-transparent border-none outline-none ml-2 text-xs font-medium w-full text-neutral-700 placeholder:text-neutral-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={() => { if(!isPremium) setShowPremiumModal(true); }}
            />
            {!isPremium && <Lock className="absolute right-3 w-3 h-3 text-neutral-300" />}
          </div>
        </div>

        <div className="md:hidden nexa-student-shell pb-3">
          <div className="flex items-center bg-white border border-orange-200 rounded-lg px-3 py-2.5 focus-within:border-orange-400 transition-colors group relative">
            <Search className="w-4 h-4 text-neutral-400 group-focus-within:text-orange-500 transition-colors shrink-0" />
            <input
              type="text"
              placeholder="Chercher (ex: clavier, grammaire...)"
              className="bg-transparent border-none outline-none ml-2 text-xs font-medium w-full text-neutral-700 placeholder:text-neutral-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={() => { if (!isPremium) setShowPremiumModal(true); }}
            />
            {!isPremium && <Lock className="absolute right-3 w-3 h-3 text-neutral-300" />}
          </div>
        </div>
      </header>

      <main className="nexa-student-shell pt-6 space-y-10 xl:space-y-12">
        
        <section>
          <div className="space-y-1 mb-5 text-center">
            <h2 className="font-display font-black tracking-tight text-[clamp(1.125rem,1rem+0.9vw,1.875rem)] leading-tight" style={{ color: BRAND.blue }}>
              Que cherchez-vous aujourd&apos;hui ?
            </h2>
            <p className="text-neutral-500 font-medium text-[clamp(0.8rem,0.72rem+0.35vw,1rem)] max-w-lg mx-auto px-4">
              Sélectionnez un outil pour activer l&apos;assistant IA.
            </p>
          </div>

          <div className="flex justify-center gap-[clamp(0.5rem,0.3rem+0.6vw,0.85rem)] max-w-[min(100%,28rem)] mx-auto mb-[clamp(1rem,0.6rem+1.2vw,1.5rem)]">
            <button
              onClick={() => handleAction(() => {
                const next = selectedTool === "dictionnaire" ? null : "dictionnaire";
                setSelectedTool(next);
                setAiQuery(next ? "Définition : " : "");
                setAiResponse(null);
                setAiError(null);
                if (next) setTimeout(() => document.getElementById('ai-search-input')?.focus(), 100);
              })}
              className={`flex-1 p-[clamp(0.65rem,0.5rem+0.5vw,0.9rem)] min-h-[44px] rounded-xl border-2 transition-colors flex items-center gap-[clamp(0.5rem,0.35rem+0.4vw,0.75rem)] group relative ${
                selectedTool === "dictionnaire"
                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/25"
                  : "bg-orange-50 border-orange-300 text-orange-700 hover:border-orange-400 hover:bg-orange-100/80"
              }`}
            >
              <div className={`rounded-lg flex items-center justify-center shrink-0 ${
                selectedTool === "dictionnaire"
                  ? "bg-white/20 text-white"
                  : "bg-orange-100 text-orange-600 border border-orange-200"
              }`} style={{ width: "clamp(2rem, 1.6rem + 1.2vw, 2.75rem)", height: "clamp(2rem, 1.6rem + 1.2vw, 2.75rem)" }}>
                <BookCopy size={18} strokeWidth={1.75} className="w-[clamp(1rem,0.85rem+0.5vw,1.25rem)] h-[clamp(1rem,0.85rem+0.5vw,1.25rem)]" />
              </div>
              <div className="text-left min-w-0">
                <h4 className={`font-display font-black leading-tight text-[clamp(0.75rem,0.68rem+0.35vw,0.95rem)] ${selectedTool === "dictionnaire" ? "text-white" : "text-orange-700"}`}>
                  Dictionnaire
                </h4>
                <p className={`text-[clamp(0.6rem,0.55rem+0.25vw,0.72rem)] mt-0.5 hidden sm:block ${selectedTool === "dictionnaire" ? "text-orange-100" : "text-orange-600/80"}`}>
                  Sens & synonymes
                </p>
              </div>
              {!isPremium && <Lock className="absolute top-2 right-2 w-3 h-3 text-orange-300" />}
            </button>

            <button
              onClick={() => handleAction(() => {
                const next = selectedTool === "traduction" ? null : "traduction";
                setSelectedTool(next);
                setAiQuery(next ? "Traduction : " : "");
                setAiResponse(null);
                setAiError(null);
                if (next) setTimeout(() => document.getElementById('ai-search-input')?.focus(), 100);
              })}
              className={`flex-1 p-[clamp(0.65rem,0.5rem+0.5vw,0.9rem)] min-h-[44px] rounded-xl border-2 transition-colors flex items-center gap-[clamp(0.5rem,0.35rem+0.4vw,0.75rem)] group relative ${
                selectedTool === "traduction"
                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/25"
                  : "bg-orange-50 border-orange-300 text-orange-700 hover:border-orange-400 hover:bg-orange-100/80"
              }`}
            >
              <div className={`rounded-lg flex items-center justify-center shrink-0 ${
                selectedTool === "traduction"
                  ? "bg-white/20 text-white"
                  : "bg-orange-100 text-orange-600 border border-orange-200"
              }`} style={{ width: "clamp(2rem, 1.6rem + 1.2vw, 2.75rem)", height: "clamp(2rem, 1.6rem + 1.2vw, 2.75rem)" }}>
                <Languages size={18} strokeWidth={1.75} className="w-[clamp(1rem,0.85rem+0.5vw,1.25rem)] h-[clamp(1rem,0.85rem+0.5vw,1.25rem)]" />
              </div>
              <div className="text-left min-w-0">
                <h4 className={`font-display font-black leading-tight text-[clamp(0.75rem,0.68rem+0.35vw,0.95rem)] ${selectedTool === "traduction" ? "text-white" : "text-orange-700"}`}>
                  Traducteur
                </h4>
                <p className={`text-[clamp(0.6rem,0.55rem+0.25vw,0.72rem)] mt-0.5 hidden sm:block ${selectedTool === "traduction" ? "text-orange-100" : "text-orange-600/80"}`}>
                  Texte multilingue
                </p>
              </div>
              {!isPremium && <Lock className="absolute top-2 right-2 w-3 h-3 text-orange-300" />}
            </button>
          </div>

          {/* Chat IA — apparaît uniquement si un outil est sélectionné */}
          <AnimatePresence>
            {selectedTool && (
              <motion.div
                key="chat-ia"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative mb-4">
                  <form onSubmit={handleAISearch} className="bg-white rounded-xl border border-orange-200 flex items-center p-1.5 focus-within:border-orange-400 transition-colors">
                    <div className="pl-3 pr-1 text-neutral-400">
                      <Sparkles className={`w-5 h-5 ${isSearching ? "animate-pulse text-orange-500" : ""}`} strokeWidth={1.5} />
                    </div>
                    <input
                      id="ai-search-input"
                      type="text"
                      autoComplete="off"
                      placeholder={
                        selectedTool === "dictionnaire"
                          ? "Ex: Définition : ambivalent..."
                          : "Ex: Traduction : je suis heureux..."
                      }
                      className="flex-1 bg-transparent border-none outline-none h-11 md:h-12 text-sm text-neutral-800 font-medium placeholder:text-neutral-400"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                    />
                    <button
                      type="submit"
                      aria-label="Envoyer à l'IA"
                      disabled={!aiQuery.trim() || isSearching}
                      className="w-11 h-11 md:w-12 md:h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {isSearching
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Send className="w-4 h-4 ml-0.5" strokeWidth={2} />
                      }
                    </button>
                  </form>
                </div>

                <AnimatePresence mode="wait">
                  {isSearching && (
                    <motion.div key="loading" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="bg-white p-4 rounded-xl border border-orange-200 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center border border-orange-100">
                          <Bot size={16} className="text-orange-500" />
                        </div>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {aiResponse && !isSearching && (
                    <motion.div key="response" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-white p-4 rounded-xl border border-orange-200 text-left relative"
                    >
                      <div className="absolute -top-2.5 -left-2.5 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
                        <Bot size={12} className="text-white" />
                      </div>
                      <p className="text-neutral-700 leading-relaxed text-sm whitespace-pre-wrap">{aiResponse}</p>
                    </motion.div>
                  )}

                  {aiError && !isSearching && (
                    <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="bg-red-50 border border-red-200 p-4 rounded-xl text-left flex items-start gap-2"
                    >
                      <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-600 text-sm font-medium">{aiError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4 px-1">
            <h2 className={`${STUDENT_TEXT.cardTitle} flex items-center gap-2`} style={{ color: BRAND.blue }}>
              <LibraryBig className="w-4 h-4" style={{ color: BRAND.orange }} /> Documents exclusifs
            </h2>
            <div className="h-px flex-1 bg-orange-100" />
          </div>

          {isSearchingContent && (
            <div className="flex items-center gap-2 text-xs text-orange-500 font-bold mb-4 animate-pulse">
              <Search className="w-3.5 h-3.5" /> Recherche dans le contenu des livres…
            </div>
          )}

          <div
            className={`grid gap-[clamp(0.75rem,0.5rem+0.8vw,1.35rem)] ${
              searchResults !== null && searchResults.some((d: any) => d.snippet)
                ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-[repeat(auto-fill,minmax(clamp(9.5rem,28vw,14rem),1fr))]"
            }`}
          >
            {filteredDocs.map((doc: any) => {
              const IconComponent = ICONS_MAP[doc.icone] || LibraryBig;
              const hasSnippet = !!doc.snippet;

              return (
                <article key={doc.id}>
                  <button
                    onClick={() => handleAction(() => openSecureDocument(doc.storage_path))}
                    disabled={isLoadingPdf}
                    className={`w-full bg-white rounded-xl border border-orange-200 transition-colors text-left group relative overflow-hidden ${
                      isLoadingPdf ? "opacity-50 cursor-wait" : "hover:border-orange-400"
                    } ${hasSnippet ? "flex flex-col gap-3" : "flex flex-col justify-between"}`}
                    style={{
                      padding: "clamp(0.85rem, 0.65rem + 0.7vw, 1.35rem)",
                      minHeight: hasSnippet ? undefined : "clamp(8.5rem, 7rem + 4vw, 11rem)",
                    }}
                  >
                    {!isPremium && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <Lock className="w-3.5 h-3.5 text-neutral-300" />
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

                    {hasSnippet && (
                      <div className="z-10 relative bg-orange-50/80 border border-orange-100 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-semibold mb-1 flex items-center gap-1" style={{ color: BRAND.orange }}>
                          <Search className="w-2.5 h-2.5" /> Extrait trouvé
                        </p>
                        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">{doc.snippet}</p>
                      </div>
                    )}
                  </button>
                </article>
              );
            })}

            {filteredDocs.length === 0 && !isSearchingContent && (
              <div className="col-span-full py-12 text-center text-neutral-400 text-sm bg-white rounded-xl border border-dashed border-orange-200">
                Aucun document ne correspond à &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </section>

      </main>

      {/* MODALE PREMIUM */}
      <AnimatePresence>
        {showPremiumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setShowPremiumModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-sm bg-white rounded-xl border border-orange-200 overflow-hidden text-center p-6 z-10"
            >
              <button 
                onClick={() => setShowPremiumModal(false)} 
                aria-label="Fermer la fenêtre"
                className="absolute top-3 right-3 p-1.5 bg-orange-50 text-neutral-400 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-200">
                <Crown className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: BRAND.blue }}>Accès réservé</h3>
              <p className="text-xs text-neutral-500 mb-6 leading-relaxed px-2">
                Passez à un abonnement supérieur pour débloquer le dictionnaire IA, le traducteur et lire nos documents exclusifs.
              </p>
              <button 
                onClick={() => { setShowPremiumModal(false); router.push("/profil"); }} 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                Débloquer l&apos;accès <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingDoc && isPremium && (
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
                style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
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
                  Page <span style={{ color: BRAND.orange }}>{pageNumber}</span> / {numPages || '—'}
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