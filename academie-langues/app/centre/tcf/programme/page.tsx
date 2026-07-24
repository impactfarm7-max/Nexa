"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Tag, Users, MapPin, Plus, X, Trash2, Loader2, CheckCircle2,
  Lock, Pencil, ArrowRight, Sparkles, Copy, Check, Link2,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import SetupBanner from "@/app/components/SetupBanner";
import SetupFooter from "@/app/components/SetupFooter";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  buildCenterSignupUrl,
  type CenterSignupRef,
} from "@/app/utils/center-signup-link";

const BLUE   = "#11224E";
const ORANGE = "#eb670e";

type Campus   = { id: string; name: string; city: string | null; is_main: boolean };
type Groupe   = { id: string; nom: string; is_default_signup?: boolean };
type ExtraFee = { id: string; name: string; amount: string };
type Section  = "price" | "fees" | "classes" | null;
type PublishStep = "editing" | "published";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function serializeExtraFees(fees: ExtraFee[]) {
  return fees
    .filter(f => f.name.trim() && Number(f.amount) > 0)
    .map(f => ({ id: f.id, name: f.name.trim(), amount: Number(f.amount) }));
}

export default function TCFProgrammePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [centerSignup, setCenterSignup] = useState<CenterSignupRef | null>(null);
  const [centerName, setCenterName] = useState("");

  // Filière TCF
  const [filiereId, setFiliereId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [priceLocked, setPriceLocked] = useState(false);

  // Campus
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);

  // Salles
  const [classes, setClasses] = useState<Groupe[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [classesLoading, setClassesLoading] = useState(false);

  // Tarifs supplémentaires
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [savingFees, setSavingFees] = useState(false);
  const [feesLocked, setFeesLocked] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [openSection, setOpenSection] = useState<Section>("price");
  const [publishStep, setPublishStep] = useState<PublishStep>("editing");

  // ──────────────────────────────────────────────────────────
  // CHARGEMENT
  // ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    setUserId(session.user.id);

    const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
    if (!profile?.center_id) { setLoading(false); return; }
    setCenterId(profile.center_id);

    const { data: center } = await supabase
      .from("centers")
      .select("signup_slug, code, name")
      .eq("id", profile.center_id)
      .single();
    setCenterSignup(center ? { signup_slug: center.signup_slug, code: center.code } : null);
    setCenterName(center?.name || "");

    let { data: filiere } = await supabase
      .from("filieres")
      .select("id, default_tuition_fee, status, extra_fees")
      .eq("center_id", profile.center_id)
      .eq("name", "TCF Canada")
      .maybeSingle();

    if (!filiere) {
      try {
        const { data: { session: sess } } = await supabase.auth.getSession();
        const res = await fetch("/api/centre/init-tcf-filiere", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess?.access_token ?? ""}`,
          },
          body: JSON.stringify({ centerId: profile.center_id }),
        });
        if (res.ok) {
          const { filiereId: newId } = await res.json();
          if (newId) {
            filiere = { id: newId, default_tuition_fee: null, status: "draft", extra_fees: null };
          }
        }
      } catch {}
    }

    if (filiere) {
      setFiliereId(filiere.id);
      const published = filiere.status === "published";
      setIsPublished(published);
      if (published) setPublishStep("editing"); // déjà publié, mode édition normale

      if (filiere.default_tuition_fee && filiere.default_tuition_fee > 0) {
        setMonthlyPrice(filiere.default_tuition_fee.toString());
        setPriceLocked(true);
      }
      if ((filiere as any).extra_fees && Array.isArray((filiere as any).extra_fees)) {
        const fees = ((filiere as any).extra_fees as ExtraFee[]).map(f => ({ ...f, id: f.id || uid(), amount: String(f.amount) }));
        setExtraFees(fees);
        if (fees.length > 0) setFeesLocked(true);
      }

      const { data: grpData } = await supabase
        .from("groupes")
        .select("id, nom, is_default_signup")
        .eq("filiere_id", filiere.id)
        .order("created_at");
      setClasses(grpData || []);

      if (!published) {
        // Ouvrir la première section incomplète
        if (!filiere.default_tuition_fee) setOpenSection("price");
        else if (!grpData || grpData.length === 0) setOpenSection("classes");
        else setOpenSection("price");
      }
    }

    const { data: campusData } = await supabase
      .from("campuses")
      .select("id, name, city, is_main")
      .eq("center_id", profile.center_id)
      .eq("status", "actif")
      .order("is_main", { ascending: false });
    setCampuses(campusData || []);

    if (filiere) {
      const { data: fcData } = await supabase
        .from("filiere_campus")
        .select("campus_id")
        .eq("filiere_id", filiere.id);
      setSelectedCampusIds((fcData || []).map((fc: any) => fc.campus_id));
    }

    if (campusData && campusData.length === 1 && filiere) {
      const { data: existingFC } = await supabase
        .from("filiere_campus")
        .select("id")
        .eq("filiere_id", filiere.id)
        .eq("campus_id", campusData[0].id);
      if (!existingFC || existingFC.length === 0) {
        setSelectedCampusIds([campusData[0].id]);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ──────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────
  const savePrice = async () => {
    if (!filiereId || !monthlyPrice.trim()) return;
    setSaving(true); setError("");
    const price = Number(monthlyPrice);
    if (isNaN(price) || price <= 0) { setError("Le prix mensuel doit être supérieur à 0."); setSaving(false); return; }
    const { error: err } = await supabase.from("filieres").update({ default_tuition_fee: price }).eq("id", filiereId);
    if (err) setError(err.message);
    else { setPriceLocked(true); setOpenSection("fees"); }
    setSaving(false);
  };

  const saveCampus = async () => {
    if (!filiereId) return;
    await supabase.from("filiere_campus").delete().eq("filiere_id", filiereId);
    for (const cId of selectedCampusIds) {
      await supabase.from("filiere_campus").insert({ filiere_id: filiereId, campus_id: cId });
    }
  };

  const addClass = async () => {
    if (!filiereId || !newClassName.trim() || !userId) return;
    setClassesLoading(true);
    const { data: newGroupe, error: err } = await supabase
      .from("groupes")
      .insert({ filiere_id: filiereId, nom: newClassName.trim(), created_by: userId })
      .select("id, nom")
      .single();
    if (err) { setError(err.message); }
    else if (newGroupe) {
      const isFirstClass = classes.length === 0;
      setClasses(prev => [...prev, { ...newGroupe, is_default_signup: isFirstClass }]);
      setNewClassName("");
      if (centerId) {
        await supabase.rpc("ensure_groupe_room", { p_groupe_id: newGroupe.id, p_center_id: centerId });
      }
      if (isFirstClass) {
        await supabase.from("groupes").update({ is_default_signup: true }).eq("id", newGroupe.id);
      }
    }
    setClassesLoading(false);
  };

  const removeClass = async (groupeId: string) => {
    if (!confirm("Supprimer cette salle de classe ?")) return;
    await supabase.from("groupes").delete().eq("id", groupeId);
    setClasses(prev => prev.filter(c => c.id !== groupeId));
  };

  const renameClass = async (groupeId: string, newName: string) => {
    await supabase.from("groupes").update({ nom: newName }).eq("id", groupeId);
    setClasses(prev => prev.map(c => c.id === groupeId ? { ...c, nom: newName } : c));
  };

  const setDefaultClass = async (groupeId: string) => {
    if (!filiereId) return;
    await supabase.from("groupes").update({ is_default_signup: false }).eq("filiere_id", filiereId);
    await supabase.from("groupes").update({ is_default_signup: true }).eq("id", groupeId);
    setClasses(prev => prev.map(c => ({ ...c, is_default_signup: c.id === groupeId })));
  };

  const addExtraFee = () => {
    setExtraFees(prev => [...prev, { id: uid(), name: "", amount: "" }]);
  };

  const updateExtraFee = (id: string, field: "name" | "amount", value: string) => {
    setExtraFees(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeExtraFee = (id: string) => {
    setExtraFees(prev => prev.filter(f => f.id !== id));
  };

  const saveExtraFees = async (): Promise<boolean> => {
    if (!filiereId) return false;
    setSavingFees(true);
    const clean = serializeExtraFees(extraFees);
    const { error: err } = await supabase.from("filieres").update({ extra_fees: clean }).eq("id", filiereId);
    setSavingFees(false);
    if (err) {
      setError(err.message);
      return false;
    }
    setExtraFees(clean.map(f => ({ ...f, amount: String(f.amount) })));
    setFeesLocked(true);
    return true;
  };

  const toggleCampus = (campusId: string) => {
    setSelectedCampusIds(prev =>
      prev.includes(campusId) ? prev.filter(id => id !== campusId) : [...prev, campusId]
    );
  };

  const publishProgramme = async () => {
    if (!filiereId) return;
    if (!priceLocked || Number(monthlyPrice) <= 0) { setError("Fixez le prix mensuel avant de publier."); return; }
    if (classes.length === 0) { setError("Créez au moins une salle de classe."); return; }

    setPublishing(true); setError("");
    await saveCampus();
    const cleanFees = serializeExtraFees(extraFees);

    const { error: err } = await supabase.from("filieres").update({
      status: "published",
      extra_fees: cleanFees,
    }).eq("id", filiereId);
    if (err) { setError(err.message); setPublishing(false); }
    else {
      setExtraFees(cleanFees.map(f => ({ ...f, amount: String(f.amount) })));
      setIsPublished(true);
      setPublishStep("published");
      // Affiche brièvement l'écran de confirmation puis redirige vers setup-done
      setTimeout(() => router.push("/centre/setup-done"), 1200);
    }
  };

  const copyInscriptionLink = () => {
    const url = buildCenterSignupUrl(window.location.origin, centerSignup);
    if (!url) return;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const signupLink =
    typeof window !== "undefined"
      ? buildCenterSignupUrl(window.location.origin, centerSignup)
      : null;

  const fmtFCFA = (n: number) => n.toLocaleString("fr-FR");

  const toggleSection = (s: Section) => {
    setOpenSection(prev => prev === s ? null : s);
  };

  if (loading) return <CenterPageLoading />;

  if (!filiereId) return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center p-8">
        <div className="max-w-md text-center bg-white rounded-2xl border p-8 shadow-sm">
          <div className="text-3xl mb-4">⚠️</div>
          <h2 className="text-lg font-black mb-2" style={{ color: BLUE }}>Programme TCF introuvable</h2>
          <p className="text-sm text-neutral-500 mb-5">La filière TCF Canada n'a pas pu être initialisée.</p>
          <button onClick={loadData} className="h-11 px-6 rounded-xl text-xs font-black uppercase text-white hover:opacity-90 transition-all" style={{ backgroundColor: ORANGE }}>
            Réessayer
          </button>
        </div>
    </div>
  );

  const priceOk   = priceLocked && Number(monthlyPrice) > 0;
  const classesOk = classes.length > 0;
  const readyToPublish = priceOk && classesOk;

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-white text-[#11224E] pb-28 overflow-x-hidden">
        <SetupBanner step="programme" />

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 py-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🇨🇦</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Programme TCF Canada</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: BLUE }}>
            {publishStep === "editing" && isPublished ? "Configuration du programme" : "Complétez votre programme"}
          </h1>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-4">

          {/* ══════════════════════════════════════════════
              ÉCRAN PUBLICATION RÉUSSIE
          ══════════════════════════════════════════════ */}
          {publishStep === "published" && (
            <div className="bg-white border rounded-2xl p-8 text-center shadow-sm space-y-6">
              <CheckCircle2 size={44} className="text-emerald-500 mx-auto" />
              <div>
                <h2 className="text-xl font-black mb-2" style={{ color: BLUE }}>
                  Votre programme a été publié avec succès
                </h2>
                {centerName && (
                  <p className="text-lg font-black mt-2" style={{ color: ORANGE }}>{centerName}</p>
                )}
                <p className="text-sm text-neutral-500 mt-3">
                  Redirection vers votre espace…
                </p>
              </div>
              <Loader2 size={20} className="animate-spin mx-auto text-neutral-300" />
            </div>
          )}

          {/* ══════════════════════════════════════════════
              SECTIONS ACCORDÉON (masquées après publication)
          ══════════════════════════════════════════════ */}
          {publishStep === "editing" && (
            <>
              {/* ── MATIÈRES (lecture seule, toujours visible) ── */}
              <div className="bg-white rounded-2xl border p-5 opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Matières</span>
                    <span className="text-[9px] bg-neutral-100 text-neutral-400 font-bold px-2 py-0.5 rounded-full">Pré-configurées</span>
                  </div>
                  <Lock size={12} className="text-neutral-300" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {["Compréhension Écrite", "Compréhension Orale", "Expression Écrite", "Expression Orale"].map(m => (
                    <div key={m} className="flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-neutral-50">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-neutral-300" />
                      <span className="text-[11px] font-semibold text-neutral-500 leading-tight">{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ACCORDION: TARIFICATION ── */}
              <AccordionSection
                open={openSection === "price"}
                onToggle={() => toggleSection("price")}
                icon={<Tag size={14} style={{ color: ORANGE }} />}
                title="Tarification"
                badge={priceOk ? `${fmtFCFA(Number(monthlyPrice))} FCFA/mois` : undefined}
                done={priceOk}
              >
                <p className="text-[11px] text-neutral-400 mb-4">
                  Fixez le prix mensuel. À l'inscription, le total sera calculé selon la durée choisie par l'étudiant.
                </p>

                {priceLocked ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-12 px-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                      <Lock size={14} className="text-emerald-600" />
                      <span className="font-black text-sm text-emerald-800">{fmtFCFA(Number(monthlyPrice))} FCFA / mois</span>
                    </div>
                    <button onClick={() => setPriceLocked(false)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg border text-[10px] font-black uppercase text-neutral-500 hover:bg-neutral-50">
                      <Pencil size={12} /> Modifier
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-full sm:w-64">
                      <input
                        type="number" min={0} value={monthlyPrice}
                        onChange={(e) => setMonthlyPrice(e.target.value)}
                        placeholder="Ex : 150000"
                        className="w-full h-12 px-4 pr-20 rounded-xl border bg-neutral-50 font-black text-sm outline-none focus:border-orange-400"
                        style={{ color: BLUE }}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400">FCFA/mois</span>
                    </div>
                    <button onClick={savePrice} disabled={saving || !monthlyPrice.trim()} className="h-12 px-6 rounded-xl text-[11px] font-black uppercase text-white disabled:opacity-40 hover:opacity-90 transition-all" style={{ backgroundColor: ORANGE }}>
                      {saving ? <Loader2 size={14} className="animate-spin" /> : "Valider"}
                    </button>
                  </div>
                )}

                {priceOk && (
                  <div className="mt-4 bg-neutral-50 rounded-xl p-4 border">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-2">Aperçu tarifs</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[1, 2, 3, 6].map(m => (
                        <div key={m} className="bg-white rounded-lg p-3 border text-center">
                          <p className="text-xs font-bold text-neutral-500">{m} mois</p>
                          <p className="text-sm font-black mt-0.5" style={{ color: BLUE }}>{fmtFCFA(Number(monthlyPrice) * m)}</p>
                          <p className="text-[9px] text-neutral-400">FCFA</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionSection>

              {/* ── ACCORDION: TARIFS SUPPLÉMENTAIRES ── */}
              <AccordionSection
                open={openSection === "fees"}
                onToggle={() => toggleSection("fees")}
                icon={<Sparkles size={14} style={{ color: ORANGE }} />}
                title="Tarifs supplémentaires"
                badge={extraFees.length > 0 ? `${extraFees.length} tarif${extraFees.length > 1 ? "s" : ""}` : undefined}
                done={feesLocked}
              >
                <p className="text-[11px] text-neutral-400 mb-4">
                  Frais optionnels en sus de la mensualité (ex : frais d&apos;inscription, matériel pédagogique…).
                </p>

                {feesLocked ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-12 px-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="font-black text-sm text-emerald-800">
                        {extraFees.length === 0
                          ? "Aucun tarif supplémentaire"
                          : `${extraFees.length} tarif${extraFees.length > 1 ? "s" : ""} enregistré${extraFees.length > 1 ? "s" : ""}`}
                      </span>
                    </div>
                    <button
                      onClick={() => setFeesLocked(false)}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-lg border text-[10px] font-black uppercase text-neutral-500 hover:bg-neutral-50"
                    >
                      <Pencil size={12} /> Modifier
                    </button>
                  </div>
                ) : (
                  <>
                    {extraFees.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {extraFees.map(fee => (
                          <div key={fee.id} className="flex items-center gap-2">
                            <input
                              value={fee.name}
                              onChange={e => updateExtraFee(fee.id, "name", e.target.value)}
                              placeholder="Nom du tarif (ex : Frais d'inscription)"
                              className="flex-1 h-11 px-4 rounded-xl border bg-neutral-50 text-xs font-semibold outline-none focus:border-orange-400 min-w-0"
                              style={{ color: BLUE }}
                            />
                            <div className="relative w-36 sm:w-44 shrink-0">
                              <input
                                type="number" min={0}
                                value={fee.amount}
                                onChange={e => updateExtraFee(fee.id, "amount", e.target.value)}
                                placeholder="Montant"
                                className="w-full h-11 px-4 pr-14 rounded-xl border bg-neutral-50 text-xs font-black outline-none focus:border-orange-400"
                                style={{ color: BLUE }}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-semibold">FCFA</span>
                            </div>
                            <button onClick={() => removeExtraFee(fee.id)} className="p-2.5 text-neutral-300 hover:text-red-500 transition-colors shrink-0">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 flex-wrap">
                      <button onClick={addExtraFee} className="flex items-center gap-1.5 h-9 px-4 rounded-lg border text-xs font-semibold hover:bg-neutral-50 transition-colors" style={{ color: BLUE }}>
                        <Plus size={13} /> Ajouter un tarif
                      </button>
                      <button
                        onClick={saveExtraFees}
                        disabled={savingFees}
                        className="h-9 px-5 rounded-xl text-xs font-black uppercase text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        style={{ backgroundColor: ORANGE }}
                      >
                        {savingFees ? <Loader2 size={14} className="animate-spin" /> : "Valider"}
                      </button>
                    </div>
                  </>
                )}
              </AccordionSection>

              {/* ── ACCORDION: SALLES DE CLASSE ── */}
              <AccordionSection
                open={openSection === "classes"}
                onToggle={() => toggleSection("classes")}
                icon={<Users size={14} style={{ color: ORANGE }} />}
                title="Salles de classe"
                badge={classes.length > 0 ? `${classes.length} salle${classes.length > 1 ? "s" : ""}` : undefined}
                done={classesOk}
              >
                <p className="text-[11px] text-neutral-400 mb-4">
                  Créez vos salles (ex : &quot;Cours du matin&quot;, &quot;Cours du soir&quot;). Marquez une salle par défaut pour les inscriptions en ligne.
                </p>

                {classes.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {classes.map(c => (
                      <div key={c.id} className="flex items-center gap-2 bg-neutral-50 border rounded-xl px-4 h-11">
                        <input
                          value={c.nom}
                          onChange={(e) => setClasses(prev => prev.map(cl => cl.id === c.id ? { ...cl, nom: e.target.value } : cl))}
                          onBlur={() => renameClass(c.id, c.nom)}
                          className="flex-1 bg-transparent text-xs font-bold outline-none min-w-0"
                          style={{ color: BLUE }}
                        />
                        {classes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDefaultClass(c.id)}
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-colors ${
                              c.is_default_signup
                                ? "bg-orange-100 text-orange-700 border border-orange-200"
                                : "bg-white text-neutral-400 border hover:border-orange-200 hover:text-orange-600"
                            }`}
                          >
                            {c.is_default_signup ? "Par défaut" : "Définir par défaut"}
                          </button>
                        )}
                        {classes.length === 1 && (
                          <span className="shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                            Par défaut
                          </span>
                        )}
                        <button onClick={() => removeClass(c.id)} className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addClass()}
                    placeholder="Nom de la salle…"
                    className="flex-1 h-11 px-4 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-orange-400"
                    style={{ color: BLUE }}
                  />
                  <button onClick={addClass} disabled={classesLoading || !newClassName.trim()} className="h-11 px-4 rounded-xl text-xs font-black uppercase text-white disabled:opacity-40 hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0" style={{ backgroundColor: ORANGE }}>
                    {classesLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Ajouter
                  </button>
                </div>
              </AccordionSection>

              {/* ── CAMPUS (multi-campus uniquement) ── */}
              {campuses.length > 1 && (
                <AccordionSection
                  open={openSection === null ? false : openSection === ("campus" as any)}
                  onToggle={() => toggleSection("campus" as any)}
                  icon={<MapPin size={14} style={{ color: ORANGE }} />}
                  title="Campus"
                  badge={selectedCampusIds.length > 0 ? `${selectedCampusIds.length} sélectionné${selectedCampusIds.length > 1 ? "s" : ""}` : undefined}
                >
                  <p className="text-[11px] text-neutral-400 mb-4">Sélectionnez où le programme TCF sera dispensé.</p>
                  <div className="flex flex-wrap gap-2.5">
                    {campuses.map(c => {
                      const selected = selectedCampusIds.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => toggleCampus(c.id)} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all ${selected ? "border-orange-400 bg-orange-50/70" : "border-neutral-200 hover:border-neutral-300"}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selected ? "border-orange-500" : "border-neutral-300 bg-white"}`} style={selected ? { backgroundColor: ORANGE } : undefined}>
                            {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-black" style={{ color: BLUE }}>{c.name}</p>
                            {c.city && <p className="text-[10px] text-neutral-400">{c.city}{c.is_main ? " · Principal" : ""}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </AccordionSection>
              )}

              {/* ── ERREUR ── */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
              )}

              {/* ── BOUTON PUBLIER (si pas encore publié) ── */}
              {!isPublished && (
                <button
                  onClick={publishProgramme}
                  disabled={publishing || !readyToPublish}
                  className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest text-white disabled:opacity-30 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg"
                  style={{ backgroundColor: ORANGE }}
                >
                  {publishing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Publier le programme TCF
                </button>
              )}

              {/* ── LIEN D'INSCRIPTION (si déjà publié) ── */}
              {isPublished && signupLink && (
                <section className="bg-white rounded-2xl border p-5">
                  <h2 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: BLUE }}>
                    <Link2 size={14} style={{ color: ORANGE }} /> Lien d'inscription étudiant
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-11 px-4 rounded-xl bg-neutral-50 border flex items-center overflow-hidden">
                      <p className="text-[11px] font-mono font-bold text-neutral-500 truncate">
                        {signupLink}
                      </p>
                    </div>
                    <button onClick={copyInscriptionLink} className={`h-11 px-4 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all shrink-0 ${linkCopied ? "bg-emerald-500 text-white" : "border hover:bg-neutral-50"}`}>
                      {linkCopied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer setup — masqué après publication */}
        <SetupFooter
          step="programme"
          hidden={publishStep === "published"}
          onSave={async () => {
            await saveExtraFees();
          }}
          saving={publishing}
        />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Accordion Section Component
// ──────────────────────────────────────────────────────────────────
function AccordionSection({
  open, onToggle, icon, title, badge, done, children,
}: {
  open: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-shadow ${open ? "shadow-sm" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-neutral-50 border flex items-center justify-center shrink-0">
            {done
              ? <Check size={14} className="text-emerald-500" />
              : icon
            }
          </div>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: "#11224E" }}>{title}</p>
            {badge && <p className="text-[10px] font-semibold text-neutral-400">{badge}</p>}
          </div>
        </div>
        {open
          ? <ChevronDown size={16} className="text-neutral-400 shrink-0" />
          : <ChevronRight size={16} className="text-neutral-300 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-neutral-100">
          {children}
        </div>
      )}
    </div>
  );
}
