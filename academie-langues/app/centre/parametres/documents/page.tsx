"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Receipt, Award, Loader2, CheckCircle2,
  ChevronRight, MapPin, Check, PenLine, Lock,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";

const BLUE = "#11224E";
const ORANGE = "#F87B1B";

const DEFAULT_DOC_KEY = "document";

const DOCUMENT_TYPES = [
  { key: DEFAULT_DOC_KEY, label: "Type de document", icon: FileText, defaultTitle: "Document officiel", available: true },
  { key: "facture",     label: "Facture / Reçu",     icon: Receipt,       defaultTitle: "Reçu de Paiement", available: true },
  { key: "attestation", label: "Attestation",        icon: Award,         defaultTitle: "Attestation de Scolarité", available: false },
];

type DocConfig = {
  title: string;
  accent_color: string;
  show_logo: boolean;
  show_rccm: boolean;
  show_niu: boolean;
  show_address: boolean;
  show_phone: boolean;
  footer_text: string;
  signature_ids: string[];
};

const defaultConfig = (title: string): DocConfig => ({
  title, accent_color: BLUE,
  show_logo: true, show_rccm: true, show_niu: true, show_address: true, show_phone: true,
  footer_text: "", signature_ids: [],
});

type SignatureOpt = { id: string; name: string; title: string | null };
type Branding = { legal_name: string | null; logo_url: string | null; rccm_number: string | null; niu_number: string | null };

function legacyDocKey(key: string): string {
  return key === DEFAULT_DOC_KEY ? "bulletin" : key;
}

export default function DocumentsSettingsPage() {
  const [centerId, setCenterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  const [branding, setBranding] = useState<Branding | null>(null);
  const [signatures, setSignatures] = useState<SignatureOpt[]>([]);
  const [configs, setConfigs] = useState<Record<string, DocConfig>>({});
  const [selectedKey, setSelectedKey] = useState<string>(DEFAULT_DOC_KEY);

  const [lockedDocs, setLockedDocs] = useState<Set<string>>(new Set());

  const selected = configs[selectedKey];
  const selectedMeta = DOCUMENT_TYPES.find((d) => d.key === selectedKey)!;
  const isLocked = lockedDocs.has(selectedKey);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("center_id").eq("id", session.user.id).single();
    if (pErr) console.error("profiles:", pErr.message);
    const cId = profile?.center_id || null;
    setCenterId(cId);
    if (!cId) { setLoading(false); return; }

    const { data: b, error: bErr } = await supabase
      .from("center_branding").select("legal_name, logo_url, rccm_number, niu_number, default_document_type")
      .eq("center_id", cId).maybeSingle();
    if (bErr) console.error("center_branding:", bErr.message);
    setBranding(b);

    const { data: sigs, error: sErr } = await supabase
      .from("bulletin_signatures").select("id, name, title")
      .eq("center_id", cId).order("display_order");
    if (sErr) console.error("bulletin_signatures:", sErr.message);
    setSignatures(sigs || []);

    const { data: rows, error: dErr } = await supabase
      .from("document_titles").select("*").eq("center_id", cId);
    if (dErr) console.error("document_titles:", dErr.message);

    const map: Record<string, DocConfig> = {};
    const initialLocked = new Set<string>();
    for (const dt of DOCUMENT_TYPES) {
      const row = (rows || []).find((r: { document_type: string }) =>
        r.document_type === dt.key || r.document_type === legacyDocKey(dt.key));
      map[dt.key] = row ? {
        title: row.title || dt.defaultTitle,
        accent_color: row.accent_color || BLUE,
        show_logo: row.show_logo ?? true,
        show_rccm: row.show_rccm ?? true,
        show_niu: row.show_niu ?? true,
        show_address: row.show_address ?? true,
        show_phone: row.show_phone ?? true,
        footer_text: row.footer_text || "",
        signature_ids: row.signature_ids || [],
      } : defaultConfig(dt.defaultTitle);
      if (row && dt.available) initialLocked.add(dt.key);
    }
    setConfigs(map);
    setLockedDocs(initialLocked);
    setSelectedKey(DEFAULT_DOC_KEY);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (p: Partial<DocConfig>) =>
    setConfigs((c) => ({ ...c, [selectedKey]: { ...c[selectedKey], ...p } }));

  const toggleSignature = (id: string) => {
    if (isLocked) return;
    const ids = selected.signature_ids.includes(id)
      ? selected.signature_ids.filter((x) => x !== id)
      : [...selected.signature_ids, id];
    patch({ signature_ids: ids });
  };

  const save = async () => {
    if (!centerId || isLocked) return;
    setSaving(true);
    const c = configs[selectedKey];
    const dbDocType = legacyDocKey(selectedKey);
    const { error } = await supabase.from("document_titles").upsert({
      center_id: centerId,
      document_type: dbDocType,
      title: c.title.trim() || selectedMeta.defaultTitle,
      accent_color: c.accent_color,
      show_logo: c.show_logo, show_rccm: c.show_rccm, show_niu: c.show_niu,
      show_address: c.show_address, show_phone: c.show_phone,
      footer_text: c.footer_text.trim() || null,
      signature_ids: c.signature_ids,
    }, { onConflict: "center_id,document_type" });

    if (!error) {
      await supabase.from("center_branding")
        .update({ default_document_type: DEFAULT_DOC_KEY })
        .eq("center_id", centerId);
    }

    setSaving(false);
    if (error) { alert("Erreur d'enregistrement : " + error.message); return; }
    setLockedDocs((p) => new Set([...p, selectedKey]));
    setShowSuccessAnim(true);
    setTimeout(() => setShowSuccessAnim(false), 2000);
  };

  if (loading) return <CenterPageLoading embedded />;
  if (!selected) return null;

  const inputClass = (locked: boolean) =>
    `w-full h-11 px-3.5 rounded-xl border border-neutral-200 text-sm font-medium outline-none transition focus:ring-4 ${
      locked ? "bg-neutral-50 text-neutral-500 cursor-default" : "bg-white focus:border-[#11224E] focus:ring-[#11224E]/5"
    }`;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      {showSuccessAnim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-3 border border-neutral-200 animate-pulse">
            <CheckCircle2 size={52} className="text-emerald-500" />
            <p className="text-base font-black text-emerald-700">Enregistré</p>
          </div>
        </div>
      )}

      {/* MASTER — types de documents */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 px-1 pb-1">Modèles de documents</p>
        {DOCUMENT_TYPES.map((dt) => {
          const isSel = selectedKey === dt.key;
          const cfg = configs[dt.key];
          const isDocLocked = lockedDocs.has(dt.key);
          const disabled = !dt.available;

          return (
            <button
              key={dt.key}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setSelectedKey(dt.key)}
              className={`w-full text-left rounded-2xl border p-4 flex items-center gap-3 transition ${
                disabled
                  ? "border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed"
                  : isSel
                    ? "border-[#11224E] ring-4 ring-[#11224E]/5 bg-white"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: disabled ? "#d4d4d4" : cfg.accent_color }}
              >
                <dt.icon size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-black text-xs" style={{ color: disabled ? "#a3a3a3" : BLUE }}>{dt.label}</p>
                  {dt.key === DEFAULT_DOC_KEY && !disabled && (
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: ORANGE }}>
                      Défaut
                    </span>
                  )}
                  {disabled && (
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-neutral-200 text-neutral-500">
                      Bientôt disponible
                    </span>
                  )}
                  {isDocLocked && !disabled && <Check size={11} className="text-emerald-500 shrink-0" />}
                </div>
                <p className="text-[11px] text-neutral-400 truncate">{cfg.title}</p>
              </div>
              {!disabled && <ChevronRight size={15} className="text-neutral-300 shrink-0" />}
              {disabled && <Lock size={13} className="text-neutral-300 shrink-0" />}
            </button>
          );
        })}

        <p className="text-[11px] text-neutral-400 pt-4 leading-relaxed px-1">
          Le <span className="font-bold">Type de document</span> sert aux bulletins et documents généraux. Le modèle <span className="font-bold">Facture / Reçu</span> est utilisé pour les relevés et reçus dans Finances.
        </p>
        <p className="text-[11px] text-neutral-400 leading-relaxed px-1">
          L&apos;identité (logo, RCCM, NIU) est commune à tous les documents.
        </p>
      </div>

      {/* DETAIL — configuration + aperçu */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-5 py-2.5 border-b border-neutral-100 bg-neutral-50/60 flex items-center gap-2">
            <FileText size={13} className="text-neutral-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Aperçu de l&apos;en-tête</span>
          </div>
          <div className="p-6">
            <div className="border-b-2 pb-4 flex items-start justify-between gap-4" style={{ borderColor: selected.accent_color }}>
              <div className="flex items-center gap-3">
                {selected.show_logo && (branding?.logo_url
                  ? <img src={branding.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  : <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center text-[8px] text-neutral-300 font-bold">LOGO</div>)}
                <div>
                  <p className="font-black text-sm uppercase" style={{ color: BLUE }}>{branding?.legal_name || "Raison sociale"}</p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: selected.accent_color }}>{selected.title}</p>
                </div>
              </div>
              <div className="text-right text-[9px] text-neutral-500 space-y-0.5">
                {selected.show_address && <p className="italic text-neutral-400">[Adresse du campus émetteur]</p>}
                {selected.show_phone && <p className="italic text-neutral-400">[Tél. du campus]</p>}
                {selected.show_rccm && <p>RCCM : {branding?.rccm_number || "—"}</p>}
                {selected.show_niu && <p>NIU : {branding?.niu_number || "—"}</p>}
              </div>
            </div>
            <p className="text-[10px] text-neutral-300 mt-3 flex items-center gap-1.5">
              <MapPin size={11} /> L&apos;adresse et le téléphone proviennent du campus qui émet le document.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: selected.accent_color }}>
                <selectedMeta.icon size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: BLUE }}>{selectedMeta.label}</p>
                <p className="text-[10px] text-neutral-400">
                  {isLocked ? "Consultation — cliquez sur Modifier pour éditer." : "Mode édition actif"}
                </p>
              </div>
            </div>
            {isLocked ? (
              <button
                type="button"
                onClick={() => setLockedDocs((p) => { const s = new Set(p); s.delete(selectedKey); return s; })}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-neutral-200 text-xs font-black text-neutral-600 hover:border-[#11224E] hover:text-[#11224E] transition"
              >
                <PenLine size={13} /> Modifier
              </button>
            ) : (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
                Édition
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <FieldLabel label={`Titre du document — ${selectedMeta.label}`} />
                <input
                  value={selected.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder={selectedMeta.defaultTitle}
                  disabled={isLocked}
                  readOnly={isLocked}
                  className={inputClass(isLocked)}
                />
              </div>
              <div>
                <FieldLabel label="Couleur d'accent" />
                <div className={`flex items-center gap-2 h-11 px-3 rounded-xl border border-neutral-200 ${isLocked ? "bg-neutral-50" : "bg-white"}`}>
                  <input
                    type="color"
                    value={selected.accent_color}
                    onChange={(e) => patch({ accent_color: e.target.value })}
                    disabled={isLocked}
                    className="w-7 h-7 rounded-md border cursor-pointer p-0 disabled:cursor-default disabled:opacity-60"
                  />
                  <span className="text-xs font-semibold text-neutral-500">{selected.accent_color}</span>
                </div>
              </div>
            </div>

            <div>
              <FieldLabel label="Champs affichés sur ce document" />
              <div className="grid sm:grid-cols-2 gap-2">
                {([
                  ["show_logo", "Logo"],
                  ["show_address", "Adresse du campus"],
                  ["show_phone", "Téléphone du campus"],
                  ["show_rccm", "N° RCCM"],
                  ["show_niu", "NIU"],
                ] as [keyof DocConfig, string][]).map(([k, lbl]) => (
                  <Toggle key={k} label={lbl} checked={selected[k] as boolean} disabled={isLocked} onChange={(v) => patch({ [k]: v } as Partial<DocConfig>)} />
                ))}
              </div>
            </div>

            <div>
              <FieldLabel label="Signataires apposés sur ce document" />
              {signatures.length === 0 ? (
                <p className="text-xs text-neutral-400 italic bg-neutral-50 border border-dashed rounded-xl p-3">
                  Aucun signataire. Configurez-les d&apos;abord dans l&apos;onglet <span className="font-bold">Entreprise</span>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {signatures.map((s) => {
                    const on = selected.signature_ids.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => toggleSignature(s.id)}
                        className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-bold transition disabled:cursor-default disabled:opacity-60 ${
                          on ? "border-transparent text-white" : "border-neutral-200 text-neutral-500 bg-white"
                        }`}
                        style={on ? { backgroundColor: ORANGE } : {}}
                      >
                        {on && <Check size={13} />}
                        {s.name}{s.title ? ` · ${s.title}` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <FieldLabel label="Mentions de bas de page" hint="optionnel" />
              <textarea
                value={selected.footer_text}
                onChange={(e) => patch({ footer_text: e.target.value })}
                rows={2}
                disabled={isLocked}
                readOnly={isLocked}
                placeholder="Ex : Document officiel — toute reproduction est interdite."
                className={`w-full p-3.5 rounded-xl border border-neutral-200 text-sm font-medium outline-none resize-none transition focus:ring-4 ${
                  isLocked ? "bg-neutral-50 text-neutral-500 cursor-default" : "bg-white focus:border-[#11224E] focus:ring-[#11224E]/5"
                }`}
              />
            </div>
          </div>

          {!isLocked && (
            <div className="px-6 py-4 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="h-11 px-7 rounded-xl text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 flex items-center gap-2 hover:opacity-90 transition"
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Valider et enregistrer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <label className="flex items-center gap-2 mb-1.5">
      <span className="text-xs font-bold text-neutral-700">{label}</span>
      {hint && <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-300">{hint}</span>}
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-center justify-between gap-2 h-11 px-3.5 rounded-xl border transition disabled:cursor-default disabled:opacity-60 ${
        checked ? "border-[#11224E]/30 bg-[#11224E]/5" : "border-neutral-200 bg-white"
      }`}
    >
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <span className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${checked ? "" : "bg-neutral-300"}`} style={checked ? { backgroundColor: BLUE } : {}}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${checked ? "left-4.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}
