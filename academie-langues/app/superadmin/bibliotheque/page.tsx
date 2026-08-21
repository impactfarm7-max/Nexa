"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { BookOpen, CheckCircle2, Eye, FilePlus2, Info, Pencil, RefreshCcw, Search, Trash2, Upload, XCircle } from "lucide-react";
import { superadminFetch } from "../../utils/superadmin-api-client";
import { useI18n } from "../../i18n/I18nProvider";

type DocumentRow = {
  id: number; titre: string; categorie: string | null; storage_path: string;
  visibility: string | null; is_paid: boolean; price: number | null;
  status: "pending_review" | "approved" | "rejected"; rejection_reason: string | null;
  created_at: string; center_id: string | null; centers: { name: string } | null;
};
type Filter = "all" | DocumentRow["status"];

export default function SuperadminBibliothequePage() {
  const { locale } = useI18n();
  const en = locale === "en";
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | "upload" | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DocumentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const json = await superadminFetch<{ documents: DocumentRow[] }>("/api/superadmin/bibliotheque");
      setDocs(json.documents ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Erreur de chargement."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => docs.filter((doc) => {
    if (filter !== "all" && doc.status !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || `${doc.titre} ${doc.categorie || ""} ${doc.centers?.name || "Nexa"}`.toLowerCase().includes(q);
  }), [docs, filter, search]);

  const update = async (id: number, patch: Record<string, unknown>) => {
    setBusy(id);
    try {
      const json = await superadminFetch<{ document: DocumentRow }>(`/api/superadmin/bibliotheque/${id}`, {
        method: "PATCH", body: JSON.stringify(patch),
      });
      setDocs((rows) => rows.map((row) => row.id === id ? { ...row, ...json.document } : row));
      setEditing(null);
    } catch (cause) { alert(cause instanceof Error ? cause.message : "Action impossible."); }
    finally { setBusy(null); }
  };

  const preview = async (id: number) => {
    try {
      const { url } = await superadminFetch<{ url: string }>(`/api/superadmin/bibliotheque/${id}`);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (cause) { alert(cause instanceof Error ? cause.message : "Aperçu impossible."); }
  };

  const remove = async (doc: DocumentRow) => {
    if (!confirm(en ? `Permanently delete “${doc.titre}” and its PDF?` : `Supprimer définitivement « ${doc.titre} » et son fichier PDF ?`)) return;
    setBusy(doc.id);
    try {
      await superadminFetch(`/api/superadmin/bibliotheque/${doc.id}`, { method: "DELETE" });
      setDocs((rows) => rows.filter((row) => row.id !== doc.id));
    } catch (cause) { alert(cause instanceof Error ? cause.message : "Suppression impossible."); }
    finally { setBusy(null); }
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("upload");
    try {
      const json = await superadminFetch<{ document: DocumentRow }>("/api/superadmin/bibliotheque", { method: "POST", body: form });
      setDocs((rows) => [json.document, ...rows]); setShowAdd(false);
    } catch (cause) { alert(cause instanceof Error ? cause.message : "Ajout impossible."); }
    finally { setBusy(null); }
  };

  const counts = (status: DocumentRow["status"]) => docs.filter((doc) => doc.status === status).length;
  const badge = (status: DocumentRow["status"]) => status === "approved"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
    : status === "rejected" ? "border-red-500/25 bg-red-500/10 text-red-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-black text-white">{en ? "Library management" : "Gestion de la bibliothèque"}</h1>
          <p className="mt-1 text-sm text-slate-400">{en ? `${docs.length} document(s), all statuses included.` : `${docs.length} document(s), tous statuts confondus.`}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white"><FilePlus2 className="h-4 w-4" />{en ? "Add a book" : "Ajouter un livre"}</button>
          <button onClick={() => void load()} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300"><RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-orange-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-orange-300">{en ? "How this works" : "Comment ça marche"}</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{en
          ? "This is the Nexa-wide library: books here are visible to every center's students, unlike a center's own private documents."
          : "Ceci est la bibliothèque commune Nexa : les livres ajoutés ici sont visibles par les apprenants de tous les centres, contrairement aux documents propres à un centre."}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{en
          ? "\"Publish\" makes a document visible to students immediately; \"Withdraw\" hides it again without deleting the file, so you can republish later. \"Delete\" permanently removes the PDF."
          : "« Publier » rend le document visible aux apprenants immédiatement ; « Retirer » le cache à nouveau sans supprimer le fichier, vous pouvez donc le republier plus tard. « Supprimer » efface définitivement le PDF."}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{en
          ? "Uploads start as \"Pending\" until you publish them — nothing goes live automatically."
          : "Chaque ajout démarre « En attente » tant que vous ne l'avez pas publié — rien ne devient visible automatiquement."}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["pending_review", en ? "Pending" : "En attente", counts("pending_review")], ["approved", en ? "Published" : "Publiés", counts("approved")], ["rejected", en ? "Withdrawn" : "Retirés", counts("rejected")]].map(([key, label, count]) => (
          <button key={String(key)} onClick={() => setFilter(key as Filter)} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-4 text-left"><p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{count}</p></button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={en ? "Search by title, category or center…" : "Rechercher par titre, catégorie ou centre…"} className="w-full rounded-xl border border-white/10 bg-[#0a0f1c] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-orange-500/50" /></div>
        <button onClick={() => setFilter("all")} className={`rounded-xl border px-4 text-xs font-black ${filter === "all" ? "border-orange-500 bg-orange-500 text-white" : "border-white/10 text-slate-400"}`}>{en ? "All" : "Tous"}</button>
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      {loading ? <p className="py-12 text-center text-slate-500">{en ? "Loading…" : "Chargement…"}</p> : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-12 text-center"><BookOpen className="mx-auto h-10 w-10 text-slate-700" /><p className="mt-3 font-bold text-slate-400">{en ? "No matching documents." : "Aucun document correspondant."}</p></div>
      ) : <div className="grid gap-4">{visible.map((doc) => (
        <article key={doc.id} className="rounded-2xl border border-white/10 bg-[#0a0f1c] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-black text-white">{doc.titre}</h2><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${badge(doc.status)}`}>{doc.status === "approved" ? (en ? "Published" : "Publié") : doc.status === "rejected" ? (en ? "Withdrawn" : "Retiré") : (en ? "Pending" : "En attente")}</span></div>
              <p className="mt-1 text-xs text-slate-500">{doc.center_id ? doc.centers?.name || (en ? "Unknown center" : "Centre inconnu") : "Nexa"} · {doc.categorie || "—"} · {new Date(doc.created_at).toLocaleDateString(locale)}</p>
              {doc.rejection_reason && <p className="mt-2 text-xs text-red-300">{doc.rejection_reason}</p>}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void preview(doc.id)} className="action"><Eye className="h-3.5 w-3.5" />{en ? "View" : "Voir"}</button>
              <button onClick={() => setEditing(doc)} className="action"><Pencil className="h-3.5 w-3.5" />{en ? "Edit" : "Modifier"}</button>
              {doc.status !== "approved" && <button disabled={busy === doc.id} onClick={() => void update(doc.id, { status: "approved" })} className="action text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />{en ? "Publish" : "Publier"}</button>}
              {doc.status === "approved" && <button disabled={busy === doc.id} onClick={() => void update(doc.id, { status: "rejected", rejection_reason: en ? "Withdrawn by an administrator." : "Retiré par un administrateur." })} className="action text-amber-300"><XCircle className="h-3.5 w-3.5" />{en ? "Withdraw" : "Retirer"}</button>}
              <button disabled={busy === doc.id} onClick={() => void remove(doc)} className="action text-red-300"><Trash2 className="h-3.5 w-3.5" />{en ? "Delete" : "Supprimer"}</button>
            </div>
          </div>
        </article>
      ))}</div>}

      {(showAdd || editing) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0f1c] p-6">
        <h2 className="text-lg font-black text-white">{editing ? (en ? "Edit document" : "Modifier le document") : (en ? "Add a book" : "Ajouter un livre")}</h2>
        <form className="mt-5 space-y-4" onSubmit={editing ? (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void update(editing.id, { titre: f.get("titre"), categorie: f.get("categorie"), is_paid: f.get("is_paid") === "on", price: f.get("price") }); } : upload}>
          <input name="titre" required defaultValue={editing?.titre} placeholder={en ? "Title" : "Titre"} className="field" />
          <input name="categorie" defaultValue={editing?.categorie || ""} placeholder={en ? "Category" : "Catégorie"} className="field" />
          {!editing && <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400"><Upload className="h-5 w-5" /><input name="file" type="file" accept="application/pdf" required className="min-w-0" /></label>}
          <label className="flex items-center gap-2 text-sm text-slate-300"><input name="is_paid" type="checkbox" defaultChecked={editing?.is_paid} />{en ? "Paid document" : "Document payant"}</label>
          <input name="price" type="number" min="0" defaultValue={editing?.price || ""} placeholder={en ? "Price (FCFA)" : "Prix (FCFA)"} className="field" />
          <div className="flex justify-end gap-2"><button type="button" onClick={() => { setShowAdd(false); setEditing(null); }} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400">{en ? "Cancel" : "Annuler"}</button><button disabled={busy !== null} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white">{editing ? (en ? "Save" : "Enregistrer") : (en ? "Upload and publish" : "Téléverser et publier")}</button></div>
        </form>
      </div></div>}

      <style jsx>{`.action{display:inline-flex;align-items:center;gap:.375rem;border:1px solid rgba(255,255,255,.1);border-radius:.75rem;padding:.55rem .7rem;font-size:.625rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.field{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:.75rem;background:rgba(255,255,255,.04);padding:.75rem;color:white;outline:none}`}</style>
    </div>
  );
}
