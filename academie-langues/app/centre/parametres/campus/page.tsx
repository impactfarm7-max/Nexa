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
import { useI18n } from "@/app/i18n/I18nProvider";

const STATUS_OPTIONS = [
  { value: "actif" },
  { value: "en_construction" },
];

/** Pays, drapeau et indicatif téléphonique */
const COUNTRY_DATA: { name: string; code: string; flag: string; dial: string }[] = [
  { name: "Cameroun",       code: "CM", flag: "🇨🇲", dial: "+237" },
  { name: "Côte d'Ivoire",  code: "CI", flag: "🇨🇮", dial: "+225" },
  { name: "Sénégal",        code: "SN", flag: "🇸🇳", dial: "+221" },
  { name: "Gabon",          code: "GA", flag: "🇬🇦", dial: "+241" },
  { name: "Congo",          code: "CG", flag: "🇨🇬", dial: "+242" },
  { name: "RD Congo",       code: "CD", flag: "🇨🇩", dial: "+243" },
  { name: "Tchad",          code: "TD", flag: "🇹🇩", dial: "+235" },
  { name: "Burkina Faso",   code: "BF", flag: "🇧🇫", dial: "+226" },
  { name: "Mali",           code: "ML", flag: "🇲🇱", dial: "+223" },
  { name: "Bénin",          code: "BJ", flag: "🇧🇯", dial: "+229" },
  { name: "Togo",           code: "TG", flag: "🇹🇬", dial: "+228" },
  { name: "Niger",          code: "NE", flag: "🇳🇪", dial: "+227" },
  { name: "Guinée",         code: "GN", flag: "🇬🇳", dial: "+224" },
  { name: "Centrafrique",   code: "CF", flag: "🇨🇫", dial: "+236" },
  { name: "Maroc",          code: "MA", flag: "🇲🇦", dial: "+212" },
  { name: "Algérie",        code: "DZ", flag: "🇩🇿", dial: "+213" },
  { name: "Tunisie",        code: "TN", flag: "🇹🇳", dial: "+216" },
  { name: "Nigeria",        code: "NG", flag: "🇳🇬", dial: "+234" },
  { name: "Ghana",          code: "GH", flag: "🇬🇭", dial: "+233" },
  { name: "Kenya",          code: "KE", flag: "🇰🇪", dial: "+254" },
  { name: "France",         code: "FR", flag: "🇫🇷", dial: "+33"  },
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
  const { t, locale } = useI18n();
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });
  const countryLabel = (name: string | null | undefined) => {
    if (!name) return name;
    if (locale === "fr") return name;
    const meta = COUNTRY_DATA.find((c) => c.name === name);
    return (meta && countryNames.of(meta.code)) || name;
  };
  const statusLabel = (status: string) => t("centre", status === "en_construction" ? "campusUnderConstruction" : "campusActive");
  const [centerId, setCenterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiEnabled, setMultiEnabled] = useState(false);
  const [campusMax, setCampusMax] = useState<number | null>(null);
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

    const quotaResponse = await fetch("/api/center/campuses", {
      headers: { Authorization: `Bearer ${session.access_token}`, "X-Nexa-Locale": locale },
      cache: "no-store",
    });
    if (quotaResponse.ok) {
      const quota = await quotaResponse.json();
      setCampusMax(typeof quota.max === "number" ? quota.max : null);
    }

    const { data: rows, error: campErr } = await supabase
      .from("campuses").select("*").eq("center_id", cId)
      .order("is_main", { ascending: false }).order("created_at", { ascending: true });
    if (campErr) console.error("campuses:", campErr.message);
    const list = (rows || []) as Campus[];
    setCampuses(list);
    if (list.length && !selectedId) setSelectedId(list[0].id);
    setLockedCampuses(new Set(list.map((c) => c.id)));

    setLoading(false);
  }, [selectedId, locale]);

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
        alert(json.error || t("centre", "campusAssignmentError"));
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
    if (campusMax !== null && campuses.length >= campusMax) {
      alert(t("centre", "campusQuotaReached", { max: campusMax }));
      return;
    }
    setActivating(true);
    const main = campuses.find((c) => c.is_main);
    const { error } = await supabase
      .from("centers").update({ multi_campus_enabled: true }).eq("id", centerId);
    if (error) { alert(t("centre", "campusError") + " : " + error.message); setActivating(false); return; }
    setMultiEnabled(true);
    setActivating(false);
    if (main) setSelectedId(main.id);
  };

  const addCampus = async () => {
    if (!newName.trim() || !centerId) return;
    if (campusMax !== null && campuses.length >= campusMax) {
      alert(t("centre", "campusQuotaReached", { max: campusMax }));
      return;
    }
    setAdding(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAdding(false); return; }
    const response = await fetch("/api/center/campuses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        "X-Nexa-Locale": locale,
      },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const json = await response.json().catch(() => ({}));
    setAdding(false);
    if (!response.ok) { alert(json.error || t("centre", "campusError")); return; }
    const newCampus = json.campus as Campus;
    setCampuses((p) => [...p, newCampus]);
    setSelectedId(newCampus.id);
    setLockedCampuses((p) => { const s = new Set(p); s.delete(newCampus.id); return s; });
    setNewName("");
  };

  const patchCampus = async (id: string, patch: Partial<Campus>) => {
    setCampuses((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("campuses").update(patch).eq("id", id);
    if (error) { alert(t("centre", "documentsSaveError") + " : " + error.message); load(); }
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
    if (e1 || e2) { alert(t("centre", "campusError") + " : " + (e1 || e2)!.message); return; }
    setCampuses((p) => p.map((c) => ({ ...c, is_main: c.id === id })));
  };

  const removeCampus = async (c: Campus) => {
    if (c.is_main) return alert(t("centre", "campusCannotDeleteMain"));
    if (!window.confirm(t("centre", "campusDeleteConfirm", { name: c.name }))) return;
    const { error } = await supabase.from("campuses").delete().eq("id", c.id);
    if (error) { alert(t("centre", "campusError") + " : " + error.message); return; }
    setCampuses((p) => p.filter((x) => x.id !== c.id));
    if (selectedId === c.id) setSelectedId(campuses.find((x) => x.id !== c.id)?.id || null);
  };

  const uploadLogo = async (id: string, file: File) => {
    if (!centerId) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${centerId}/campus-${id}.${ext}`;
    const { error } = await supabase.storage.from("center-logos").upload(path, file, { upsert: true });
    if (error) { alert(t("centre", "campusLogoError") + " : " + error.message); setUploadingLogo(false); return; }
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
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "campusMulti")}</h2>
          <p className="text-[12px] text-neutral-500 font-medium mt-0.5 leading-relaxed max-w-xl">
            {t("centre", "campusMultiDescription")}
          </p>
        </div>
        <ul className="space-y-2 text-sm text-neutral-600 font-medium">
          {[t("centre", "campusFeatureIsolation"), t("centre", "campusFeatureDirectors"), t("centre", "campusFeatureSelector")].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check size={14} className="text-neutral-400 shrink-0" /> {feature}
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
          {t("centre", "campusActivateMulti")}
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
          <span className="text-xs font-medium text-neutral-500">{t("centre", "campusCount")}</span>
        </div>
        <span className="text-neutral-300">·</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-neutral-700">{activeCampuses}</span>
          <span className="text-xs font-medium text-neutral-500">{t("centre", activeCampuses !== 1 ? "campusActivePlural" : "campusActiveLower")}</span>
        </div>
        <span className="text-neutral-300">·</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">{t("centre", "campusMain")} :</span>
          <span className="text-sm font-bold text-neutral-700">{mainCampus?.name || "—"}</span>
        </div>
      </div>

      {/* ── Rubrique 1 : Créer ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "campusCreateTitle")}</h2>
          <p className="text-[12px] text-neutral-500 font-medium mt-0.5">
            {t("centre", "campusCreateDescription")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCampus()}
            placeholder={t("centre", "campusNamePlaceholder")}
            className="flex-1 h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
          />
          <button
            type="button"
            onClick={addCampus}
            disabled={adding || !newName.trim() || (campusMax !== null && campuses.length >= campusMax)}
            className="h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40 inline-flex items-center justify-center gap-2 shrink-0"
            style={{ backgroundColor: BLUE }}
          >
            {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {t("centre", "campusCreate")}
          </button>
        </div>
        {campusMax !== null && campuses.length >= campusMax && (
          <p className="mt-2 max-w-xl text-xs font-semibold text-amber-700">
            {t("centre", "campusQuotaReached", { max: campusMax })}
          </p>
        )}
      </section>

      {/* ── Rubrique 2 : Visualiser / modifier ── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "campusViewEdit")}</h2>
          <p className="text-[12px] text-neutral-500 font-medium mt-0.5">
            {t("centre", "campusSelectDescription")}
          </p>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-4 sm:gap-5">
          <div className="rounded-lg border border-black/[0.06] bg-white overflow-hidden divide-y divide-black/[0.05]">
            {campuses.length === 0 ? (
              <div className="p-8 text-center text-neutral-400">
                <Building2 size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold uppercase tracking-wider">{t("centre", "campusNone")}</p>
              </div>
            ) : (
              campuses.map((c) => {
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
                          {meta ? `${meta.flag} ` : ""}{locationParts.join(", ") || "—"} · {statusLabel(c.status)}
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
                <p className="text-xs font-semibold uppercase tracking-wider">{t("centre", "campusSelect")}</p>
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
                      title={t("centre", "campusChangeLogo")}
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
                          {t("centre", "campusMain")}
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
                      title={t("centre", "campusSetAsMain")}
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
                    { k: "general" as const, label: t("centre", "campusGeneral"), icon: MapPin, locked: false },
                    { k: "infra" as const, label: t("centre", "campusInfrastructure"), icon: Boxes, locked: true },
                    { k: "finance" as const, label: t("centre", "campusFinances"), icon: Wallet, locked: true },
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
                            <ReadField label={t("centre", "campusName")} value={selected.name} />
                            <ReadField label={t("centre", "settingsCode")} value={selected.code || "—"} />
                          </div>
                          <ReadField label={t("centre", "settingsStatus")}>
                            <span className="inline-flex items-center text-xs font-semibold text-neutral-600 border border-black/[0.08] px-2.5 py-1 rounded-md">
                              {statusLabel(selected.status)}
                            </span>
                          </ReadField>
                          <ReadField label={t("centre", "settingsAddress")} value={selected.address || "—"} />
                          <div className="grid sm:grid-cols-2 gap-4">
                            <ReadField label={t("centre", "settingsCountry")}>
                              <p className="text-sm font-semibold text-neutral-700 py-2 px-3.5 rounded-lg border border-black/[0.06] flex items-center gap-2" style={{ backgroundColor: SURFACE }}>
                                {countryMeta(selected.country)?.flag || ""} {countryLabel(selected.country) || "—"}
                              </p>
                            </ReadField>
                            <ReadField label={t("centre", "settingsCity")} value={selected.city || "—"} />
                          </div>
                          <ReadField label={t("centre", "settingsPhone")}>
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
                          <ReadField label={t("centre", "campusDirector")}>
                            <p className="text-sm font-semibold text-neutral-700 py-2 px-3.5 rounded-lg border border-black/[0.06]" style={{ backgroundColor: SURFACE }}>
                              {directorLoading ? "…" : director?.label || t("centre", "campusUnassigned")}
                            </p>
                          </ReadField>
                          <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
                            {savedCampusId === selected.id ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
                                <CheckCircle2 size={14} /> {t("centre", "documentsSaved")}
                              </span>
                            ) : <span />}
                            <button
                              type="button"
                              onClick={() => unlockCampus(selected.id)}
                              className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-black/[0.08] text-xs font-semibold text-neutral-600 hover:bg-black/[0.03] transition"
                            >
                              <PenLine size={13} /> {t("centre", "liveEdit")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── EDIT MODE ── */
                        <div className="space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <BlurField label={t("centre", "campusName")} defaultValue={selected.name} onCommit={(v) => v.trim() && patchCampus(selected.id, { name: v.trim() })} />
                            <BlurField label={t("centre", "settingsCode")} hint={t("centre", "campusCodeHint")} defaultValue={selected.code || ""} onCommit={(v) => patchCampus(selected.id, { code: v.trim().toUpperCase() || null })} />
                          </div>
                          <div>
                            <FieldLabel label={t("centre", "settingsStatus")} />
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
                                  {statusLabel(o.value)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <BlurField label={t("centre", "settingsAddress")} defaultValue={selected.address || ""} onCommit={(v) => patchCampus(selected.id, { address: v.trim() || null })} />

                          {/* Pays AVANT Ville — indicatif auto */}
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <FieldLabel label={t("centre", "settingsCountry")} />
                              <select
                                defaultValue={selected.country || ""}
                                onChange={(e) => handleCountryChange(selected.id, e.target.value || null)}
                                className="w-full h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                              >
                                <option value="">—</option>
                                {COUNTRY_DATA.map((c) => <option key={c.name} value={c.name}>{c.flag} {countryLabel(c.name)}</option>)}
                              </select>
                            </div>
                            <BlurField label={t("centre", "settingsCity")} defaultValue={selected.city || ""} onCommit={(v) => patchCampus(selected.id, { city: v.trim() || null })} />
                          </div>

                          {/* Téléphone avec indicatif auto */}
                          <div>
                            <FieldLabel label={t("centre", "settingsPhone")} />
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
                                placeholder={t("centre", "campusPhonePlaceholder")}
                                className="flex-1 h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
                              />
                            </div>
                          </div>

                          <div>
                            <FieldLabel label={t("centre", "campusDirector")} />
                            <div className="flex items-center gap-2">
                              <select
                                value={director?.id || ""}
                                disabled={directorLoading || directorSaving}
                                onChange={(e) => void assignDirector(selected.id, e.target.value || null)}
                                className="flex-1 h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10 disabled:opacity-50"
                              >
                                <option value="">— {t("centre", "campusUnassigned")} —</option>
                                {staffOptions.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}{s.role === "campus_manager" ? ` · ${t("centre", "campusDirectorShort")}` : ""}
                                  </option>
                                ))}
                              </select>
                              {directorSaving && <Loader2 size={16} className="animate-spin text-neutral-400 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-1.5">
                              {t("centre", "campusDirectorHelp")}
                            </p>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-black/[0.06]">
                            <button
                              type="button"
                              onClick={() => lockCampus(selected.id)}
                              className="h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 hover:opacity-90 transition"
                              style={{ backgroundColor: BLUE }}
                            >
                              <Check size={14} /> {t("centre", "campusSave")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTab === "infra" && (
                    <LockedPanel
                      icon={Boxes}
                      title={t("centre", "campusInfrastructureTitle")}
                      text={t("centre", "campusInfrastructureText")}
                      comingSoon={t("centre", "documentsComingSoon")}
                    />
                  )}

                  {detailTab === "finance" && (
                    <LockedPanel
                      icon={Wallet}
                      title={t("centre", "campusPaymentTitle")}
                      text={t("centre", "campusPaymentText")}
                      comingSoon={t("centre", "documentsComingSoon")}
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

function LockedPanel({ icon: Icon, title, text, comingSoon }: { icon: React.ElementType; title: string; text: string; comingSoon: string }) {
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
        {comingSoon}
      </span>
    </div>
  );
}
