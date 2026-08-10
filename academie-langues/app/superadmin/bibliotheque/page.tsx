"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Eye, RefreshCcw, ShieldCheck, ShieldOff, X } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { useI18n } from "../../i18n/I18nProvider";

type PendingDoc = {
  id: number;
  titre: string;
  categorie: string | null;
  storage_path: string;
  is_paid: boolean;
  price: number | null;
  created_at: string;
  center_id: string;
  centers: { name: string } | null;
};

export default function SuperadminBibliothequePage() {
  const { t, locale } = useI18n();
  const en = locale === "en";

  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const json = await superadminFetch<{ documents: PendingDoc[] }>("/api/superadmin/bibliotheque");
      setDocs(json.documents || []);
    } catch (e: any) {
      setError(e.message || (en ? "Loading error." : "Erreur de chargement."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [en]);

  useEffect(() => { load(); }, [load]);

  const preview = async (id: number) => {
    try {
      const json = await superadminFetch<{ url: string }>(`/api/superadmin/bibliotheque/${id}`);
      window.open(json.url, "_blank");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const approve = async (id: number) => {
    setActionId(id);
    try {
      await superadminFetch(`/api/superadmin/bibliotheque/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: number) => {
    setActionId(id);
    try {
      await superadminFetch(`/api/superadmin/bibliotheque/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejection_reason: rejectReason || null }),
      });
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setRejectingId(null);
      setRejectReason("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{t("superadmin", "navLibraryLabel")}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {en ? `${docs.length} document(s) pending review.` : `${docs.length} document(s) en attente de validation.`}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0f1c] px-4 py-2 text-xs font-bold text-slate-300 hover:border-orange-500/40 hover:text-orange-400"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {t("superadmin", "analyticsRefresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">{en ? "Loading…" : "Chargement…"}</p>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-700" />
          <p className="font-bold text-slate-400">{en ? "Nothing to review right now." : "Rien à valider pour l'instant."}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{doc.titre}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {doc.centers?.name || (en ? "Unknown center" : "Centre inconnu")}
                    {doc.categorie && ` · ${doc.categorie}`}
                    {doc.is_paid && ` · ${doc.price?.toLocaleString(en ? "en-GB" : "fr-FR")} FCFA`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => preview(doc.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-orange-500/40 hover:text-orange-300"
                  >
                    <Eye className="h-3.5 w-3.5" /> {en ? "Preview" : "Aperçu"}
                  </button>
                  <button
                    onClick={() => approve(doc.id)}
                    disabled={actionId === doc.id}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500 hover:text-white disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> {en ? "Approve" : "Approuver"}
                  </button>
                  <button
                    onClick={() => setRejectingId(rejectingId === doc.id ? null : doc.id)}
                    disabled={actionId === doc.id}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500 hover:text-white disabled:opacity-50"
                  >
                    <ShieldOff className="h-3.5 w-3.5" /> {en ? "Reject" : "Rejeter"}
                  </button>
                </div>
              </div>

              {rejectingId === doc.id && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={en ? "Reason (optional)" : "Motif (optionnel)"}
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                  />
                  <button
                    onClick={() => reject(doc.id)}
                    disabled={actionId === doc.id}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    {en ? "Confirm" : "Confirmer"}
                  </button>
                  <button onClick={() => setRejectingId(null)} className="rounded-lg p-1.5 text-slate-500 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
