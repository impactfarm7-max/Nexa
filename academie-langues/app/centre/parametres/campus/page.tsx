"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Star, Trash2, Camera, MapPin,
  Loader2, ChevronRight, Lock, Boxes, Wallet, Check,
  Rocket, PenLine, CheckCircle2, Phone,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { BLUE, SURFACE } from "@/app/centre/center-page-ui";

const STATUS_OPTIONS = [
  { value: "actif", label: "Actif" },
  { value: "en_construction", label: "En construction" },
];
const statusMeta = (s: string) => STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];

/** Pays, drapeau et indicatif téléphonique */
const COUNTRY_DATA: { name: string; flag: string; dial: string }[] = [
  { name: "Cameroun",       flag: "🇨🇲", dial: "+237" },
  { name: "Côte d'Ivoire",  flag: "🇨🇮", dial: "+225" },
  { name: "Sénégal",        flag: "🇸🇳", dial: "+221" },
  { name: "Gabon",          flag: "🇬🇦", dial: "+241" },
  { name: "Congo",          flag: "🇨🇬", dial: "+242" },
  { name: "RD Congo",       flag: "🇨🇩", dial: "+243" },
  { name: "Tchad",          flag: "🇹🇩", dial: "+235" },
  { name: "Burkina Faso",   flag: "🇧🇫", dial: "+226" },
  { name: "Mali",           flag: "🇲🇱", dial: "+223" },
  { name: "Bénin",          flag: "🇧🇯", dial: "+229" },
  { name: "Togo",           flag: "🇹🇬", dial: "+228" },
  { name: "Niger",          flag: "🇳🇪", dial: "+227" },
  { name: "Guinée",         flag: "🇬🇳", dial: "+224" },
  { name: "Centrafrique",   flag: "🇨🇫", dial: "+236" },
  { name: "Maroc",          flag: "🇲🇦", dial: "+212" },
  { name: "Algérie",        flag: "🇩🇿", dial: "+213" },
  { name: "Tunisie",        flag: "🇹🇳", dial: "+216" },
  { name: "Nigeria",        flag: "🇳🇬", dial: "+234" },
  { name: "Ghana",          flag: "🇬🇭", dial: "+233" },
  { name: "Kenya",          flag: "🇰🇪", dial: "+254" },
  { name: "France",         flag: "🇫🇷", dial: "+33"  },
];

const COUNTRIES = COUNTRY_DATA.map((c) => c.name);
const countryMeta = (name: string | null | undefined) => COUNTRY_DATA.find((c) => c.name === name);

type Campus = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  logo_url: string | null;
  is_main: boolean;
};

export default function CampusSettingsPage() {
  const [centerId, setCenterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiEnabled, setMultiEnabled] = useState(false);
  const [activating, setActivating] = useState(false);

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"general" | "infra" | "finance">("general");

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [lockedCampuses, setLockedCampuses] = useState<Set<string>>(new Set());
  const [savedCampusId, setSavedCampusId] = useState<string | null>(null);

  type StaffOpt = { id: string; label: string; role: string };
  const [director, setDirector] = useState<StaffOpt | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOpt[]>([]);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [directorSaving, setDirectorSaving] = useState(false);

  const selected = campuses.find((c) => c.id === selectedId) || null;
  const isDetailLocked = selectedId ? lockedCampuses.has(selectedId) : false;

  /* ── Derived stats ── */
  const totalCampuses = campuses.length;
  const activeCampuses = campuses.filter((c) => c.status === "actif").length;
  const mainCampus = campuses.find((c) => c.is_main);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("center_id").eq("id", session.user.id).single();
    if (pErr) console.error("profiles:", pErr.message);
    const cId = profile?.center_id || null;
    setCenterId(cId);
    if (!cId) { setLoading(false); return; }

    const { data: center, error: cErr } = await supabase
      .from("centers").select("multi_campus_enabled").eq("id", cId).single();
    if (cErr) console.error("centers:", cErr.message);
    setMultiEnabled(!!center?.multi_campus_enabled);

    const { data: rows, error: campErr } = await supabase
      .from("campuses").select("*").eq("center_id", cId)
      .order("is_main", { ascending: false }).order("created_at", { ascending: true });
    if (campErr) console.error("campuses:", campErr.message);
    const list = (rows || []) as Campus[];
    setCampuses(list);
    if (list.length && !selectedId) setSelectedId(list[0].id);
    setLockedCampuses(new Set(list.map((c) => c.id)));

    setLoading(false);
  }, [selectedId]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDirector = useCallback(async (campusId: string) => {
    setDirectorLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/center/campus-director?campus_id=${encodeURIComponent(campusId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setDirector(json.director ? { id: json.director.id, label: json.director.label, role: json.director.role } : null);
      setStaffOptions(
        (json.staffOptions || []).map((s: StaffOpt) => ({
          id: s.id,
          label: s.label,
          role: s.role,
        })),
      );
    } finally {
      setDirectorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadDirector(selectedId);
    else {
      setDirector(null);
      setStaffOptions([]);
    }
  }, [selectedId, loadDirector]);

  const assignDirector = async (campusId: string, directorId: string | null) => {
    setDirectorSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/center/campus-director", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ campus_id: campusId, director_id: directorId }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Erreur d'attribution.");
        return;
      }
      setDirector(json.director ? { id: json.director.id, label: json.director.label, role: json.director.role } : null);
      await loadDirector(campusId);
    } finally {
      setDirectorSaving(false);
    }
  };

  const activateMulti = async () => {
    if (!centerId) return;
    setActivating(true);
    const main = campuses.find((c) => c.is_main);
    const { error } = await supabase
      .from("centers").update({ multi_campus_enabled: true }).eq("id", centerId);
    if (error) { alert("Erreur : " + error.message); setActivating(false); return; }
    setMultiEnabled(true);
    setActivating(false);
    if (main) setSelectedId(main.id);
  };

  const addCampus = async () => {
    if (!newName.trim() || !centerId) return;
    setAdding(true);
    const { data, error } = await supabase.from("campuses")
      .insert({ center_id: centerId, name: newName.trim(), is_main: campuses.length === 0, status: "en_construction" })
      .select().single();
    setAdding(false);
    if (error) { alert("Erreur : " + error.message); return; }
    const newCampus = data as Campus;
    setCampuses((p) => [...p, newCampus]);
    setSelectedId(newCampus.id);
    setLockedCampuses((p) => { const s = new Set(p); s.delete(newCampus.id); return s; });
    setNewName("");
  };

  const patchCampus = async (id: string, patch: Partial<Campus>) => {
    setCampuses((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("campuses").update(patch).eq("id", id);
    if (error) { alert("Erreur d'enregistrement : " + error.message); load(); }
  };

  const lockCampus = (id: string) => {
    setLockedCampuses((p) => new Set([...p, id]));
    setSavedCampusId(id);
    setTimeout(() => setSavedCampusId(null), 2500);
  };

  const unlockCampus = (id: string) => {
    setLockedCampuses((p) => { const s = new Set(p); s.delete(id); return s; });
  };

  const setMain = async (id: string) => {
    if (!centerId) return;
    const { error: e1 } = await supabase.from("campuses").update({ is_main: false }).eq("center_id", centerId);
    const { error: e2 } = await supabase.from("campuses").update({ is_main: true }).eq("id", id);
    if (e1 || e2) { alert("Erreur : " + (e1 || e2)!.message); return; }
    setCampuses((p) => p.map((c) => ({ ...c, is_main: c.id === id })));
  };

  const removeCampus = async (c: Campus) => {
    if (c.is_main) return alert("Impossible de supprimer le campus principal. Désignez-en un autre d'abord.");
    if (!window.confirm(`Supprimer le campus « ${c.name} » ?`)) return;
    const { error } = await supabase.from("campuses").delete().eq("id", c.id);
    if (error) { alert("Erreur : " + error.message); return; }
    setCampuses((p) => p.filter((x) => x.id !== c.id));
    if (selectedId === c.id) setSelectedId(campuses.find((x) => x.id !== c.id)?.id || null);
  };

  const uploadLogo = async (id: string, file: File) => {
    if (!centerId) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${centerId}/campus-${id}.${ext}`;
    const { error } = await supabase.storage.from("center-logos").upload(path, file, { upsert: true });
    if (error) { alert("Erreur logo : " + error.message); setUploadingLogo(false); return; }
    const { data } = supabase.storage.from("center-logos").getPublicUrl(path);
    await patchCampus(id, { logo_url: data.publicUrl + "?t=" + Date.now() });
    setUploadingLogo(false);
  };

  /** Auto-assign country dial code when country changes */
  const handleCountryChange = (campusId: string, country: string | null) => {
    const meta = countryMeta(country);
    const patch: Partial<Campus> = { country };
    // Only set phone prefix if phone is currently empty or starts with +
    const campus = campuses.find((c) => c.id === campusId);
    if (meta && (!campus?.phone || campus.phone.startsWith("+"))) {
      patch.phone = meta.dial;
    }
    patchCampus(campusId, patch);
  };

  if (loading) return <CenterPageLoading embedded />;

  if (!multiEnabled && campuses.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>Multi-campus</h2>
          <p className="text-[12px] text-neutral-500 font-medium mt-0.5 leading-relaxed max-w-xl">
            Cloisonnez les données par site, attribuez des directeurs locaux et gérez plusieurs établissements.
            Vos données actuelles sont conservées.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-neutral-600 font-medium">
          {["Cloisonnement des données par campus",
            "Directeurs locaux (campus managers)",
            "Sélecteur de campus en haut du tableau de bord"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check size={14} className="text-neutral-400 shrink-0" /> {t}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={activateMulti}
          disabled={activating}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
          style={{ backgroundColor: BLUE }}
        >
          {activating ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
          Activer le mode multi-campus
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Stat Card — une seule case sans icônes ── */}
      <div
        className="rounded-lg border border-black/[0.06] bg-white p-4 sm:p-5 flex flex-wrap items-center gap-x-6 gap-y-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold tracking-tight" style={{ color: BLUE }}>{totalCampuses}</span>
          <span className="text-xs font-medium text-neutral-500">campus</span>
        </div>
        <span className="text-neutral-300">·</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-neutral-700">{activeCampuses}</span>
          <span className="text-xs font-medium text-neutral-500">actif{activeCampuses !== 1 ? "s" : ""}</span>
        </div>
        <span className="text-neutral-300">·</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Principal :</span>
          <span className="text-sm font-bold text-neutral-700">{mainCampus?.name || "—"}</span>
        </div>
      </div>

      {/* ── Rubrique 1 : Créer ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>Créer un campus</h2>
          <p className="text-[12px] text-neutral-500 font-medium mt-0.5">
            Ajoutez un nouveau site, puis sélectionnez-le pour le compléter.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCampus()}
            placeholder="Ex : Campus Akwa"
            className="flex-1 h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
          />
          <button
            type="button"
            onClick={addCampus}
            disabled={adding || !newName.trim()}
            className="h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40 inline-flex items-center justify-center gap-2 shrink-0"
            style={{ backgroundColor: BLUE }}
          >
            {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Créer
          </button>
        </div>
      </section>

      {/* ── Rubrique 2 : Visualiser / modifier ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>Visualiser et modifier</h2>
          <p className="text-[12px] text-neutral-500 font-medium mt-0.5">
            Sélectionnez un campus pour consulter ou éditer ses informations.
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-4 sm:gap-5">
          <div className="rounded-lg border border-black/[0.06] bg-white overflow-hidden divide-y divide-black/[0.05]">
            {campuses.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                <Building2 size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold uppercase tracking-wider">Aucun campus</p>
              </div>
            ) : (
              campuses.map((c) => {
                const st = statusMeta(c.status);
                const isSel = selectedId === c.id;
                const meta = countryMeta(c.country);
                const locationParts = [c.country, c.city].filter(Boolean);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="w-full text-left px-3.5 py-3 transition"
                    style={{ backgroundColor: isSel ? "#FFF5EE" : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      {c.logo_url
                        ? <img src={c.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-black/[0.06] shrink-0" />
                        : (
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border border-black/[0.06]"
                            style={{ backgroundColor: SURFACE, color: BLUE }}
                          >
                            {(c.code || c.name)[0]?.toUpperCase()}
                          </div>
                        )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm truncate" style={{ color: BLUE }}>{c.name}</p>
                          {c.is_main && <Star size={12} className="text-amber-500 shrink-0" fill="currentColor" />}
                        </div>
                        <p className="text-[11px] text-neutral-400 font-medium truncate">
                          {meta ? `${meta.flag} ` : ""}{locationParts.join(", ") || "—"} · {st.label}
                        </p>
                      </div>
                      <ChevronRight size={14} className={`shrink-0 ${isSel ? "text-neutral-500" : "text-neutral-300"}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div>
            {!selected ? (
              <div
                className="h-full min-h-[240px] flex flex-col items-center justify-center text-neutral-400 border border-dashed border-black/[0.08] rounded-lg"
                style={{ backgroundColor: SURFACE }}
              >
                <Building2 size={28} className="mb-2 opacity-40" />
                <p className="text-xs font-semibold uppercase tracking-wider">Sélectionnez un campus</p>
              </div>
            ) : (
              <div className="border border-black/[0.06] rounded-lg overflow-hidden bg-white">
                {/* ── Header ── */}
                <div className="p-4 sm:p-5 border-b border-black/[0.06] flex items-start gap-3.5">
                  <div className="relative w-12 h-12 shrink-0">
                    {selected.logo_url
                      ? <img src={selected.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-black/[0.06]" />
                      : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold border border-black/[0.06]"
                          style={{ backgroundColor: SURFACE, color: BLUE }}
                        >
                          {(selected.code || selected.name)[0]?.toUpperCase()}
                        </div>
                      )}
                    <label
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer border border-black/[0.08] bg-white hover:bg-black/[0.03]"
                      title="Changer le logo"
                    >
                      {uploadingLogo ? <Loader2 size={11} className="animate-spin text-neutral-500" /> : <Camera size={11} className="text-neutral-500" />}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadLogo(selected.id, e.target.files[0])}
                      />
                    </label>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold tracking-tight truncate" style={{ color: BLUE }}>{selected.name}</h3>
                      {selected.is_main && (
                        <span className="text-[10px] font-semibold text-neutral-500 border border-black/[0.08] px-2 py-0.5 rounded-md">
                          Principal
                        </span>
                      )}
                    </div>
                    {/* Country + City on header */}
                    {(selected.country || selected.city) && (
                      <p className="text-[11px] text-neutral-500 font-medium mt-0.5 flex items-center gap-1">
                        <span>{countryMeta(selected.country)?.flag || ""}</span>
                        <span>{[selected.country, selected.city].filter(Boolean).join(", ")}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMain(selected.id)}
                      title="Définir comme principal"
                      className={`p-2 rounded-lg ${selected.is_main ? "text-[#11224E]" : "text-neutral-300 hover:text-neutral-500"}`}
                    >
                      <Star size={16} fill={selected.is_main ? "currentColor" : "none"} />
                    </button>
                    <button type="button" onClick={() => removeCampus(selected)} className="p-2 rounded-lg text-neutral-300 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-4 px-4 sm:px-5 border-b border-black/[0.06] text-xs font-semibold overflow-x-auto">
                  {[
                    { k: "general" as const, label: "Général", icon: MapPin, locked: false },
                    { k: "infra" as const, label: "Infrastructures", icon: Boxes, locked: true },
                    { k: "finance" as const, label: "Finances", icon: Wallet, locked: true },
                  ].map((t) => (
                    <button
                      key={t.k}
                      type="button"
                      onClick={() => setDetailTab(t.k)}
                      className={`py-2.5 border-b-2 flex items-center gap-1.5 shrink-0 ${
                        detailTab === t.k ? "text-[#11224E]" : "border-transparent text-neutral-400"
                      }`}
                      style={detailTab === t.k ? { borderColor: BLUE } : {}}
                    >
                      <t.icon size={13} /> {t.label}
                      {t.locked && <Lock size={11} className="text-neutral-300" />}
                    </button>
                  ))}
                </div>

                {/* ── Tab content ── */}
                <div className="p-4 sm:p-5">
                  {detailTab === "general" && (
                    <div className="space-y-5 max-w-xl">
                      {isDetailLocked ? (
                        /* ── READ MODE ── */
                        <div className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <ReadField label="Nom du campus" value={selected.name} />
                            <ReadField label="Code" value={selected.code || "—"} />
                          </div>
                          <ReadField label="Statut">
                            <span className="inline-flex items-center text-xs font-semibold text-neutral-600 border border-black/[0.08] px-2.5 py-1 rounded-md">
                              {statusMeta(selected.status).label}
                            </span>
                          </ReadField>
                          <ReadField label="Adresse" value={selected.address || "—"} />
                          <div className="grid sm:grid-cols-2 gap-4">
                            <ReadField label="Pays">
                              <p className="text-sm font-semibold text-neutral-700 py-2 px-3.5 rounded-lg border border-black/[0.06] flex items-center gap-2" style={{ backgroundColor: SURFACE }}>
                                {countryMeta(selected.country)?.flag || ""} {selected.country || "—"}
                              </p>
                            </ReadField>
                            <ReadField label="Ville" value={selected.city || "—"} />
                          </div>
                          <ReadField label="Téléphone">
                            <p className="text-sm font-semibold text-neutral-700 py-2 px-3.5 rounded-lg border border-black/[0.06] flex items-center gap-2" style={{ backgroundColor: SURFACE }}>
                              <Phone size={13} className="text-neutral-400 shrink-0" />
                              {selected.phone || "—"}
                              {selected.country && (
                                <span className="text-[10px] text-neutral-400 font-medium ml-auto">
                                  {countryMeta(selected.country)?.flag} {countryMeta(selected.country)?.dial}
                                </span>
                              )}
                            </p>
                          </ReadField>
                          <ReadField label="Directeur de campus">
                            <p className="text-sm font-semibold text-neutral-700 py-2 px-3.5 rounded-lg border border-black/[0.06]" style={{ backgroundColor: SURFACE }}>
                              {directorLoading ? "…" : director?.label || "Non attribué"}
                            </p>
                          </ReadField>
                          <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
                            {savedCampusId === selected.id ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
                                <CheckCircle2 size={14} /> Enregistré
                              </span>
                            ) : <span />}
                            <button
                              type="button"
                              onClick={() => unlockCampus(selected.id)}
                              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-black/[0.08] text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition"
                            >
                              <PenLine size={13} /> Modifier
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── EDIT MODE ── */
                        <div className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <BlurField label="Nom du campus" defaultValue={selected.name} onCommit={(v) => v.trim() && patchCampus(selected.id, { name: v.trim() })} />
                            <BlurField label="Code" hint="ex : DLA" defaultValue={selected.code || ""} onCommit={(v) => patchCampus(selected.id, { code: v.trim().toUpperCase() || null })} />
                          </div>
                          <div>
                            <FieldLabel label="Statut" />
                            <div className="flex gap-2 flex-wrap">
                              {STATUS_OPTIONS.map((o) => (
                                <button
                                  key={o.value}
                                  type="button"
                                  onClick={() => patchCampus(selected.id, { status: o.value })}
                                  className={`h-9 px-3 rounded-lg border text-xs font-semibold transition ${
                                    selected.status === o.value
                                      ? "border-transparent text-white"
                                      : "border-black/[0.08] text-neutral-500 bg-white hover:bg-black/[0.02]"
                                  }`}
                                  style={selected.status === o.value ? { backgroundColor: BLUE } : {}}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <BlurField label="Adresse" defaultValue={selected.address || ""} onCommit={(v) => patchCampus(selected.id, { address: v.trim() || null })} />

                          {/* Pays AVANT Ville — indicatif auto */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <FieldLabel label="Pays" />
                              <select
                                defaultValue={selected.country || ""}
                                onChange={(e) => handleCountryChange(selected.id, e.target.value || null)}
                                className="w-full h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                              >
                                <option value="">—</option>
                                {COUNTRY_DATA.map((c) => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
                              </select>
                            </div>
                            <BlurField label="Ville" defaultValue={selected.city || ""} onCommit={(v) => patchCampus(selected.id, { city: v.trim() || null })} />
                          </div>

                          {/* Téléphone avec indicatif auto */}
                          <div>
                            <FieldLabel label="Téléphone" />
                            <div className="flex items-center gap-2">
                              {selected.country && countryMeta(selected.country) && (
                                <span className="h-10 px-3 rounded-lg border border-black/[0.06] bg-neutral-50 text-xs font-semibold text-neutral-500 flex items-center gap-1.5 shrink-0">
                                  {countryMeta(selected.country)!.flag} {countryMeta(selected.country)!.dial}
                                </span>
                              )}
                              <input
                                defaultValue={selected.phone || ""}
                                onBlur={(e) => {
                                  const v = e.target.value;
                                  if (v !== (selected.phone || "")) patchCampus(selected.id, { phone: v.trim() || null });
                                }}
                                placeholder="Numéro de téléphone"
                                className="flex-1 h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                              />
                            </div>
                          </div>

                          <div>
                            <FieldLabel label="Directeur de campus" />
                            <div className="flex items-center gap-2">
                              <select
                                value={director?.id || ""}
                                disabled={directorLoading || directorSaving}
                                onChange={(e) => void assignDirector(selected.id, e.target.value || null)}
                                className="flex-1 h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10 disabled:opacity-50"
                              >
                                <option value="">— Non attribué —</option>
                                {staffOptions.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}{s.role === "campus_manager" ? " · Directeur" : ""}
                                  </option>
                                ))}
                              </select>
                              {directorSaving && <Loader2 size={16} className="animate-spin text-neutral-400 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-1.5">
                              Attribue le rôle Directeur de campus et rattache ce campus au collaborateur.
                            </p>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-black/[0.06]">
                            <button
                              type="button"
                              onClick={() => lockCampus(selected.id)}
                              className="h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 hover:opacity-90 transition"
                              style={{ backgroundColor: BLUE }}
                            >
                              <Check size={14} /> Enregistrer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "infra" && (
                    <LockedPanel
                      icon={Boxes}
                      title="Infrastructures — Bâtiments & Salles"
                      text="Gérez vos bâtiments et vos salles de classe physiques (capacité, équipement). Bientôt disponible."
                    />
                  )}

                  {detailTab === "finance" && (
                    <LockedPanel
                      icon={Wallet}
                      title="Configuration de paiement du campus"
                      text="Rattachez un compte Mobile Money ou Stripe propre à ce campus pour cloisonner les encaissements. Bientôt disponible."
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <label className="flex items-center gap-2 mb-1.5">
      <span className="text-xs font-semibold text-neutral-700">{label}</span>
      {hint && <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-300">{hint}</span>}
    </label>
  );
}

function ReadField({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">{label}</label>
      {children ?? (
        <p className="text-sm font-semibold text-neutral-700 py-2 px-3.5 rounded-lg border border-black/[0.06]" style={{ backgroundColor: SURFACE }}>
          {value}
        </p>
      )}
    </div>
  );
}

function BlurField({ label, hint, defaultValue, onCommit }: {
  label: string; hint?: string; defaultValue: string; onCommit: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <input
        defaultValue={defaultValue}
        onBlur={(e) => e.target.value !== defaultValue && onCommit(e.target.value)}
        className="w-full h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
      />
    </div>
  );
}

function LockedPanel({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-black/[0.08]" style={{ backgroundColor: SURFACE }}>
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-neutral-100">
          <Icon size={24} className="text-neutral-300" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-black/[0.08] flex items-center justify-center">
          <Lock size={12} className="text-neutral-400" />
        </div>
      </div>
      <p className="font-extrabold text-sm" style={{ color: BLUE }}>{title}</p>
      <p className="text-xs text-neutral-400 mt-1.5 max-w-sm leading-relaxed font-medium">{text}</p>
      <span className="mt-4 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border border-black/[0.08] rounded-md px-3 py-1">
        Bientôt disponible
      </span>
    </div>
  );
}
