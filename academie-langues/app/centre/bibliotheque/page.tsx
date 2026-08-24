"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, Trash2, Loader2, FileText, Globe, Building2, CheckCircle2, Clock, XCircle, X, Banknote } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, ORANGE, CenterPageLayout, CenterPageHeader, CenterPageBody } from "../center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

type Doc = {
  id: number;
  titre: string;
  categorie: string;
  visibility: "center" | "public";
  is_paid: boolean;
  price: number | null;
  status: "pending_review" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

type Purchase = {
  id: string; amount: number; currency: string; payment_method: string; payment_reference: string | null;
  buyer_note: string | null; status: "pending" | "paid" | "rejected" | "refunded"; requested_at: string;
  bibliotheque_documents: { titre: string } | null;
  profiles: { prenom: string | null; nom: string | null; email: string | null } | null;
};

async function authedFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${session?.access_token ?? ""}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Erreur ${res.status}`);
  return json;
}

const StatusBadge = ({ status, en }: { status: Doc["status"]; en: boolean }) => {
  const map = {
    approved: { icon: CheckCircle2, label: en ? "Published" : "Publié", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    pending_review: { icon: Clock, label: en ? "Pending review" : "En attente de validation", cls: "text-amber-600 bg-amber-50 border-amber-200" },
    rejected: { icon: XCircle, label: en ? "Rejected" : "Rejeté", cls: "text-red-600 bg-red-50 border-red-200" },
  } as const;
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide ${cls}`}>
      <Icon size={11} /> {label}
    </span>
  );
};

export default function CentreBibliothequePage() {
  const { t, locale } = useI18n();
  const en = locale === "en";

  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseReasons, setPurchaseReasons] = useState<Record<string, string>>({});
  const [purchaseBusy, setPurchaseBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("");
  const [visibility, setVisibility] = useState<"center" | "public">("center");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");

  const load = useCallback(async () => {
    try {
      const [json, sales] = await Promise.all([
        authedFetch("/api/centre/bibliotheque"),
        authedFetch("/api/centre/bibliotheque/purchases"),
      ]);
      setDocs(json.documents || []);
      setPurchases(sales.purchases || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setFile(null);
    setTitre("");
    setCategorie("");
    setVisibility("center");
    setIsPaid(false);
    setPrice("");
    setShowForm(false);
  };

  const updatePurchase = async (id: string, action: "confirm" | "reject" | "refund") => {
    setPurchaseBusy(id);
    setError(null);
    try {
      const json = await authedFetch(`/api/centre/bibliotheque/purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: purchaseReasons[id] || "" }),
      });
      setPurchases((current) => current.map((purchase) => purchase.id === id ? { ...purchase, ...json.purchase } : purchase));
      setPurchaseReasons((current) => ({ ...current, [id]: "" }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPurchaseBusy(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !titre.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("titre", titre.trim());
      form.append("categorie", categorie.trim());
      form.append("visibility", visibility);
      form.append("is_paid", String(isPaid));
      form.append("price", price || "0");

      await authedFetch("/api/centre/bibliotheque", { method: "POST", body: form });
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(en ? "Delete this document?" : "Supprimer ce document ?")) return;
    try {
      await authedFetch(`/api/centre/bibliotheque/${id}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <CenterPageLoading />;

  return (
    <CenterPageLayout
      header={
        <CenterPageHeader
          title={t("centre", "navBibliotheque")}
          actions={
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm text-white transition-colors"
              style={{ backgroundColor: ORANGE }}
            >
              <Upload size={15} /> {en ? "Add a document" : "Ajouter un document"}
            </button>
          }
        />
      }
    >
      <CenterPageBody>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleUpload} className="bg-white rounded-2xl border border-black/[0.08] p-5 space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm" style={{ color: BLUE }}>{en ? "New document" : "Nouveau document"}</h3>
              <button type="button" onClick={resetForm} className="p-1.5 rounded-lg hover:bg-black/[0.04]">
                <X size={16} style={{ color: "rgba(17,34,78,0.5)" }} />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.5)" }}>
                {en ? "PDF file" : "Fichier PDF"}
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="mt-1.5 w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-black/[0.05] file:cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.5)" }}>
                  {en ? "Title" : "Titre"}
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  required
                  className="mt-1.5 w-full px-3 py-2 rounded-lg border border-black/[0.1] text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.5)" }}>
                  {en ? "Category" : "Catégorie"}
                </label>
                <input
                  type="text"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  placeholder={en ? "e.g. Grammar" : "ex. Grammaire"}
                  className="mt-1.5 w-full px-3 py-2 rounded-lg border border-black/[0.1] text-sm outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.5)" }}>
                {en ? "Visibility" : "Visibilité"}
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("center")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
                    visibility === "center" ? "text-white" : "hover:bg-black/[0.03]"
                  }`}
                  style={visibility === "center" ? { backgroundColor: BLUE, borderColor: BLUE } : { borderColor: "rgba(17,34,78,0.15)", color: "rgba(17,34,78,0.65)" }}
                >
                  <Building2 size={14} /> {en ? "My center only" : "Mon centre uniquement"}
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
                    visibility === "public" ? "text-white" : "hover:bg-black/[0.03]"
                  }`}
                  style={visibility === "public" ? { backgroundColor: BLUE, borderColor: BLUE } : { borderColor: "rgba(17,34,78,0.15)", color: "rgba(17,34,78,0.65)" }}
                >
                  <Globe size={14} /> {en ? "All independent centers" : "Tous les centres libres"}
                </button>
              </div>
              {visibility === "public" && (
                <p className="mt-1.5 text-[11px]" style={{ color: "rgba(17,34,78,0.5)" }}>
                  {en ? "Requires NEXA superadmin validation before publishing." : "Nécessite une validation NEXA avant publication."}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold" style={{ color: "rgba(17,34,78,0.7)" }}>
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                {en ? "Paid document" : "Document payant"}
              </label>
              {isPaid && (
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={en ? "Price (FCFA)" : "Prix (FCFA)"}
                  className="w-40 px-3 py-1.5 rounded-lg border border-black/[0.1] text-sm outline-none focus:border-orange-400"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={uploading || !file || !titre.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: ORANGE }}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {en ? "Publish" : "Publier"}
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
          {docs.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: "rgba(17,34,78,0.4)" }}>
              {en ? "No documents yet." : "Aucun document pour l'instant."}
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-black/[0.04] flex items-center justify-center shrink-0">
                    <FileText size={16} style={{ color: "rgba(17,34,78,0.4)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black truncate" style={{ color: BLUE }}>{doc.titre}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={doc.status} en={en} />
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.4)" }}>
                        {doc.visibility === "public" ? (en ? "Public" : "Publique") : (en ? "Center only" : "Mon centre")}
                      </span>
                      {doc.is_paid && (
                        <span className="text-[10px] font-black" style={{ color: ORANGE }}>
                          {doc.price?.toLocaleString(en ? "en-GB" : "fr-FR")} FCFA
                        </span>
                      )}
                    </div>
                    {doc.status === "rejected" && doc.rejection_reason && (
                      <p className="text-[11px] text-red-500 mt-1">{doc.rejection_reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 shrink-0"
                    aria-label={en ? "Delete" : "Supprimer"}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <section className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.06] flex items-center gap-2">
            <Banknote size={17} style={{ color: ORANGE }} />
            <h2 className="font-black text-sm" style={{ color: BLUE }}>{en ? "Document sales" : "Ventes de documents"}</h2>
          </div>
          {purchases.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: "rgba(17,34,78,0.4)" }}>{en ? "No sale request." : "Aucune demande d'achat."}</div>
          ) : (
            <div className="divide-y divide-black/[0.06]">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="p-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="font-black text-sm" style={{ color: BLUE }}>{purchase.bibliotheque_documents?.titre || "Document"}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {[purchase.profiles?.prenom, purchase.profiles?.nom].filter(Boolean).join(" ") || purchase.profiles?.email || "Acheteur"} · {Number(purchase.amount).toLocaleString(en ? "en-GB" : "fr-FR")} FCFA · {purchase.payment_method}
                    </p>
                    {purchase.payment_reference && <p className="mt-1 text-xs text-neutral-500">Référence : {purchase.payment_reference}</p>}
                    <span className="mt-2 inline-flex rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase">{purchase.status}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    {(purchase.status === "pending" || purchase.status === "paid") && (
                      <input value={purchaseReasons[purchase.id] || ""} onChange={(event) => setPurchaseReasons((current) => ({ ...current, [purchase.id]: event.target.value }))} placeholder={purchase.status === "paid" ? "Motif du remboursement" : "Motif si refus"} className="rounded-lg border border-black/[0.1] px-3 py-2 text-xs" />
                    )}
                    {purchase.status === "pending" && <button disabled={purchaseBusy === purchase.id} onClick={() => updatePurchase(purchase.id, "confirm")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Confirmer</button>}
                    {purchase.status === "pending" && <button disabled={!purchaseReasons[purchase.id] || purchaseBusy === purchase.id} onClick={() => updatePurchase(purchase.id, "reject")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-40">Refuser</button>}
                    {purchase.status === "paid" && <button disabled={!purchaseReasons[purchase.id] || purchaseBusy === purchase.id} onClick={() => updatePurchase(purchase.id, "refund")} className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-black text-orange-700 disabled:opacity-40">Rembourser</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </CenterPageBody>
    </CenterPageLayout>
  );
}
