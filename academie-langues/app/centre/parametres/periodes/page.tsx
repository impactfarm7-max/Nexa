"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Trash2, Loader2, Check, X,
  Layers, FolderOpen, FileText,
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import {
  type GradePeriodDbType,
  isGradeGroupPeriod,
  isGradeLeafPeriod,
} from "@/app/utils/gradePeriods";
import { BLUE, SURFACE } from "@/app/centre/center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

const inputCls =
  "w-full h-10 px-3.5 rounded-lg border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";
const btnPrimary =
  "h-9 px-3.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90";
const btnGhost =
  "h-9 px-3.5 rounded-lg border border-black/[0.08] bg-white text-xs font-semibold text-neutral-600 hover:bg-black/[0.03]";

type Period = {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  type: string;
  position: number;
  coefficient: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

type TemplateKey = "trimestrial" | "semestrial" | "simple";

type BuiltPeriod =
  | { name: string; type: Extract<GradePeriodDbType, "trimestre" | "semestre">; children: { name: string; coefficient: number }[] }
  | { name: string; type: "autre"; children: [] };

type TemplateConfig = {
  groups: number;
  childrenPerGroup: number;
  includeRattrapage: boolean;
  evalCount: number;
  coefficient: number;
};

const TEMPLATE_META: Record<TemplateKey, {
  label: string;
  description: string;
  defaults: TemplateConfig;
}> = {
  trimestrial: {
    label: "",
    description: "",
    defaults: { groups: 3, childrenPerGroup: 2, includeRattrapage: false, evalCount: 2, coefficient: 1 },
  },
  semestrial: {
    label: "",
    description: "",
    defaults: { groups: 2, childrenPerGroup: 1, includeRattrapage: true, evalCount: 2, coefficient: 1 },
  },
  simple: {
    label: "",
    description: "",
    defaults: { groups: 0, childrenPerGroup: 0, includeRattrapage: false, evalCount: 2, coefficient: 1 },
  },
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Construit la hiérarchie grade_periods (types DB : trimestre/semestre/autre) */
function buildPeriodsFromConfig(key: TemplateKey, cfg: TemplateConfig, name: (key: string, values?: Record<string, string | number>) => string): BuiltPeriod[] {
  const coeff = cfg.coefficient > 0 ? cfg.coefficient : 1;

  if (key === "simple") {
    const n = clamp(cfg.evalCount, 1, 12);
    return Array.from({ length: n }, (_, i) => ({
      name: i === 0 ? name("periodGeneratedContinuous") : i === 1 ? name("periodGeneratedFinalExam") : name("periodGeneratedEvaluation", { number: i + 1 }),
      type: "autre" as const,
      children: [] as [],
    }));
  }

  if (key === "trimestrial") {
    const groups = clamp(cfg.groups, 1, 6);
    const per = clamp(cfg.childrenPerGroup, 1, 6);
    const out: BuiltPeriod[] = [];
    let seq = 1;
    for (let g = 1; g <= groups; g++) {
      const children = Array.from({ length: per }, () => {
        const child = { name: name("periodGeneratedSequence", { number: seq }), coefficient: coeff };
        seq += 1;
        return child;
      });
      out.push({ name: name("periodGeneratedQuarter", { number: g }), type: "trimestre", children });
    }
    return out;
  }

  // semestrial
  const groups = clamp(cfg.groups, 1, 4);
  const sessions = clamp(cfg.childrenPerGroup, 1, 4);
  const out: BuiltPeriod[] = [];
  let sessionNum = 1;
  for (let g = 1; g <= groups; g++) {
    const children: { name: string; coefficient: number }[] = [];
    for (let s = 0; s < sessions; s++) {
      children.push({ name: name("periodGeneratedSession", { number: sessionNum }), coefficient: coeff });
      sessionNum += 1;
    }
    if (cfg.includeRattrapage) {
      children.push({ name: name("periodGeneratedRetake", { number: g }), coefficient: coeff });
    }
    out.push({ name: name("periodGeneratedSemester", { number: g }), type: "semestre", children });
  }
  return out;
}

function previewLines(built: BuiltPeriod[]): string[] {
  const lines: string[] = [];
  for (const p of built) {
    if (p.children.length > 0) {
      lines.push(`${p.name} → ${p.children.map((c) => c.name).join(", ")}`);
    } else {
      lines.push(p.name);
    }
  }
  return lines;
}

export default function PeriodConfigPage() {
  const { t } = useI18n();
  const generatedName = useCallback((key: string, values?: Record<string, string | number>) => t("centre", key, values), [t]);
  const templateLabel = (key: TemplateKey) => t("centre", `periodTemplate_${key}`);
  const templateDescription = (key: TemplateKey) => t("centre", `periodTemplateDescription_${key}`);
  const [loading, setLoading] = useState(true);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [saving, setSaving] = useState(false);
  const [applyError, setApplyError] = useState("");

  // Config modèle
  const [configKey, setConfigKey] = useState<TemplateKey | null>(null);
  const [config, setConfig] = useState<TemplateConfig>(TEMPLATE_META.trimestrial.defaults);

  // Formulaire d'ajout manuel
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<GradePeriodDbType>("autre");
  const [newParentId, setNewParentId] = useState("");
  const [newCoefficient, setNewCoefficient] = useState("1");
  const [addError, setAddError] = useState("");

  const loadPeriods = useCallback(async (cId: string) => {
    const { data, error } = await supabase.rpc("get_center_periods", { p_center_id: cId });
    if (error) console.error("get_center_periods:", error.message);
    setPeriods(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
      const cId = profile?.center_id || null;
      setCenterId(cId);
      if (cId) await loadPeriods(cId);
      setLoading(false);
    })();
  }, [loadPeriods]);

  const openTemplateConfig = (key: TemplateKey) => {
    setApplyError("");
    setConfigKey(key);
    setConfig({ ...TEMPLATE_META[key].defaults });
  };

  const closeTemplateConfig = () => {
    if (saving) return;
    setConfigKey(null);
    setApplyError("");
  };

  const builtPreview = useMemo(
    () => (configKey ? buildPeriodsFromConfig(configKey, config, generatedName) : []),
    [configKey, config, generatedName],
  );

  /** Applique la config → écrit grade_periods (même schéma qu’avant) */
  const applyConfiguredTemplate = async () => {
    if (!configKey) return;
    if (!centerId) {
      setApplyError(t("centre", "periodCenterNotFound"));
      return;
    }
    if (periods.length > 0 && !confirm(t("centre", "periodReplaceConfirm"))) return;

    const built = buildPeriodsFromConfig(configKey, config, generatedName);
    if (built.length === 0) {
      setApplyError(t("centre", "periodInvalidConfiguration"));
      return;
    }

    setSaving(true);
    setApplyError("");

    const { error: delErr } = await supabase.from("grade_periods").delete().eq("center_id", centerId);
    if (delErr) {
      setApplyError(delErr.message);
      setSaving(false);
      return;
    }

    let position = 0;
    for (const group of built) {
      if (group.children.length > 0) {
        const { data: parent, error: pErr } = await supabase
          .from("grade_periods")
          .insert({
            center_id: centerId,
            name: group.name,
            type: group.type, // trimestre | semestre
            position: position++,
            coefficient: 1,
          })
          .select("id")
          .single();

        if (pErr || !parent) {
          setApplyError(pErr?.message || t("centre", "periodCreateGroupError"));
          setSaving(false);
          await loadPeriods(centerId);
          return;
        }

        for (const child of group.children) {
          const { error: cErr } = await supabase.from("grade_periods").insert({
            center_id: centerId,
            name: child.name,
            type: "autre", // saisie de notes
            parent_id: parent.id,
            position: position++,
            coefficient: child.coefficient,
          });
          if (cErr) {
            setApplyError(cErr.message);
            setSaving(false);
            await loadPeriods(centerId);
            return;
          }
        }
      } else {
        const { error: eErr } = await supabase.from("grade_periods").insert({
          center_id: centerId,
          name: group.name,
          type: "autre",
          position: position++,
          coefficient: config.coefficient > 0 ? config.coefficient : 1,
        });
        if (eErr) {
          setApplyError(eErr.message);
          setSaving(false);
          await loadPeriods(centerId);
          return;
        }
      }
    }

    await loadPeriods(centerId);
    setSaving(false);
    setConfigKey(null);
  };

  const addPeriod = async () => {
    if (!newName.trim()) { setAddError(t("centre", "periodNameRequired")); return; }
    if (!centerId) return;
    setAddError(""); setSaving(true);

    const maxPos = periods.length > 0 ? Math.max(...periods.map((p) => p.position)) + 1 : 0;

    const { error } = await supabase.from("grade_periods").insert({
      center_id: centerId,
      name: newName.trim(),
      type: newType,
      parent_id: isGradeLeafPeriod(newType) ? (newParentId || null) : null,
      position: maxPos,
      coefficient: Number(newCoefficient) || 1,
    });

    if (error) {
      setAddError(error.message);
    } else {
      setNewName(""); setNewParentId(""); setNewCoefficient("1"); setShowAddForm(false);
      await loadPeriods(centerId);
    }
    setSaving(false);
  };

  const deletePeriod = async (id: string) => {
    if (!centerId) return;
    const period = periods.find((p) => p.id === id);
    const hasChildren = periods.some((p) => p.parent_id === id);

    if (hasChildren && !confirm(t("centre", "periodDeleteWithChildren", { name: period?.name || "" }))) return;
    if (!hasChildren && !confirm(t("centre", "periodDeleteConfirm", { name: period?.name || "" }))) return;

    await supabase.from("grade_periods").delete().eq("id", id);
    await loadPeriods(centerId);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("grade_periods").update({ is_active: !current }).eq("id", id);
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)));
  };

  const renamePeriod = async (id: string, nextName: string) => {
    if (!nextName.trim()) return;
    await supabase.from("grade_periods").update({ name: nextName.trim() }).eq("id", id);
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, name: nextName.trim() } : p)));
  };

  if (loading) return <CenterPageLoading embedded />;

  const aggregates = periods.filter((p) => isGradeGroupPeriod(p.type));
  const topLevelEvals = periods.filter((p) => isGradeLeafPeriod(p.type) && !p.parent_id);
  const childrenOf = (parentId: string) =>
    periods.filter((p) => p.parent_id === parentId).sort((a, b) => a.position - b.position);

  const isEmpty = periods.length === 0;
  const meta = configKey ? TEMPLATE_META[configKey] : null;

  return (
    <div className="space-y-8 max-w-3xl">
      <section>
        <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>
          {t("centre", "periodSchoolYearBreakdown")}
        </h2>
        <p className="text-[12px] text-neutral-500 font-medium mt-0.5 leading-relaxed">
          {t("centre", "periodSchoolYearDescription")}
        </p>
      </section>

      {/* Cartes modèles */}
      {isEmpty && (
        <section>
          <div className="mb-3">
            <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>
              {t("centre", "periodQuickStart")}
            </h2>
            <p className="text-[12px] text-neutral-500 font-medium mt-0.5">
              {t("centre", "periodQuickStartDescription")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(Object.keys(TEMPLATE_META) as TemplateKey[]).map((key) => {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => openTemplateConfig(key)}
                  disabled={saving}
                  className="text-left rounded-lg border border-black/[0.08] bg-white px-4 py-4 hover:bg-[#FFF5EE] hover:border-[#eb670e]/35 transition-colors disabled:opacity-50"
                >
                  <FolderOpen size={18} className="text-neutral-400 mb-2.5" />
                  <h3 className="text-sm font-bold" style={{ color: BLUE }}>{templateLabel(key)}</h3>
                  <p className="text-[12px] text-neutral-500 font-medium mt-1 leading-relaxed">{templateDescription(key)}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Liste */}
      {!isEmpty && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>{t("centre", "periodYourPeriods")}</h2>
              <p className="text-[12px] text-neutral-500 font-medium mt-0.5">
                {t("centre", "periodManageDescription")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className={btnPrimary}
              style={{ backgroundColor: BLUE }}
            >
              <Plus size={14} /> {t("centre", "periodAdd")}
            </button>
          </div>

          <div className="rounded-lg border border-black/[0.06] bg-white overflow-hidden divide-y divide-black/[0.05]">
            {aggregates.sort((a, b) => a.position - b.position).map((agg) => {
              const children = childrenOf(agg.id);
              return (
                <div key={agg.id}>
                  <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ backgroundColor: SURFACE }}>
                    <Layers size={14} className="text-neutral-400 shrink-0" />
                    <PeriodNameEditor name={agg.name} onRename={(n) => renamePeriod(agg.id, n)} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 shrink-0 hidden sm:inline">
                      {t("centre", "periodAutomaticAverage")}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleActive(agg.id, agg.is_active)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                        agg.is_active
                          ? "border-transparent text-white"
                          : "border-black/[0.08] text-neutral-400 bg-white"
                      }`}
                      style={agg.is_active ? { backgroundColor: BLUE } : undefined}
                    >
                      {agg.is_active ? t("centre", "campusActive") : t("centre", "periodInactive")}
                    </button>
                    <button type="button" onClick={() => deletePeriod(agg.id)} className="p-1.5 text-neutral-300 hover:text-red-500 ml-auto shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-black/[0.04]">
                    {children.map((child) => (
                      <div key={child.id} className="flex items-center gap-2.5 px-3.5 py-2.5 pl-10 hover:bg-black/[0.015]">
                        <FileText size={13} className="text-neutral-300 shrink-0" />
                        <PeriodNameEditor name={child.name} onRename={(n) => renamePeriod(child.id, n)} />
                        <span className="text-[11px] text-neutral-400 font-medium shrink-0">{t("centre", "periodCoefficientShort")} {child.coefficient}</span>
                        <button
                          type="button"
                          onClick={() => toggleActive(child.id, child.is_active)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                            child.is_active
                              ? "border-transparent text-white"
                              : "border-black/[0.08] text-neutral-400 bg-white"
                          }`}
                          style={child.is_active ? { backgroundColor: BLUE } : undefined}
                        >
                          {child.is_active ? t("centre", "campusActive") : t("centre", "periodInactive")}
                        </button>
                        <button type="button" onClick={() => deletePeriod(child.id)} className="p-1.5 text-neutral-300 hover:text-red-500 ml-auto shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {children.length === 0 && (
                      <p className="px-10 py-2.5 text-[12px] text-neutral-400 italic">{t("centre", "periodNoSubperiod")}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {topLevelEvals.length > 0 && (
              <div>
                <div className="px-3.5 py-2" style={{ backgroundColor: SURFACE }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {t("centre", "periodIndependentPeriods")}
                  </span>
                </div>
                <div className="divide-y divide-black/[0.04]">
                  {topLevelEvals.sort((a, b) => a.position - b.position).map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-black/[0.015]">
                      <FileText size={13} className="text-neutral-300 shrink-0" />
                      <PeriodNameEditor name={p.name} onRename={(n) => renamePeriod(p.id, n)} />
                      <span className="text-[11px] text-neutral-400 font-medium shrink-0">{t("centre", "periodCoefficientShort")} {p.coefficient}</span>
                      <button
                        type="button"
                        onClick={() => toggleActive(p.id, p.is_active)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                          p.is_active
                            ? "border-transparent text-white"
                            : "border-black/[0.08] text-neutral-400 bg-white"
                        }`}
                        style={p.is_active ? { backgroundColor: BLUE } : undefined}
                      >
                        {p.is_active ? t("centre", "campusActive") : t("centre", "periodInactive")}
                      </button>
                      <button type="button" onClick={() => deletePeriod(p.id)} className="p-1.5 text-neutral-300 hover:text-red-500 ml-auto shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              {t("centre", "periodResetWithTemplate")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TEMPLATE_META) as TemplateKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => openTemplateConfig(key)}
                  disabled={saving}
                  className={btnGhost}
                >
                  {templateLabel(key)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ajout manuel */}
      {showAddForm && (
        <div className="rounded-lg border border-black/[0.06] bg-white p-4 sm:p-5 space-y-3 max-w-xl">
          <h3 className="text-sm font-extrabold" style={{ color: BLUE }}>{t("centre", "periodNewPeriod")}</h3>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">{t("centre", "settingsName")}</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("centre", "periodNamePlaceholder")}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">{t("centre", "periodType")}</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as GradePeriodDbType)}
                className={inputCls}
              >
                <option value="autre">{t("centre", "periodTypeEvaluation")}</option>
                <option value="trimestre">{t("centre", "periodTypeQuarter")}</option>
                <option value="semestre">{t("centre", "periodTypeSemester")}</option>
                <option value="annee">{t("centre", "periodTypeYear")}</option>
                <option value="mois">{t("centre", "periodTypeMonth")}</option>
                <option value="semaine">{t("centre", "periodTypeWeek")}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">{t("centre", "periodCoefficient")}</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={newCoefficient}
                onChange={(e) => setNewCoefficient(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {isGradeLeafPeriod(newType) && aggregates.length > 0 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                {t("centre", "periodAttachToGroup")}
              </label>
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("centre", "periodNoGroup")}</option>
                {aggregates.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          {addError && <p className="text-sm text-red-600 font-medium">{addError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={addPeriod}
              disabled={saving}
              className={btnPrimary}
              style={{ backgroundColor: BLUE }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {t("centre", "periodAdd")}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddError(""); }}
              className={btnGhost}
            >
              {t("centre", "periodCancel")}
            </button>
          </div>
        </div>
      )}

      {/* Modale config modèle */}
      {configKey && meta && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/25" onClick={closeTemplateConfig} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-xl sm:rounded-xl border border-black/[0.08] shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-black/[0.06]">
              <div>
                <h3 className="text-base font-extrabold tracking-tight" style={{ color: BLUE }}>{templateLabel(configKey)}</h3>
                <p className="text-[12px] text-neutral-500 font-medium mt-0.5">{templateDescription(configKey)}</p>
              </div>
              <button
                type="button"
                onClick={closeTemplateConfig}
                className="h-8 w-8 rounded-lg hover:bg-black/[0.04] flex items-center justify-center text-neutral-500"
                aria-label={t("centre", "periodClose")}
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {configKey === "trimestrial" && (
                <>
                  <Field label={t("centre", "periodQuarterCount")} hint={t("centre", "periodQuarterCountHint")}>
                    <NumberInput
                      value={config.groups}
                      min={1}
                      max={6}
                      onChange={(n) => setConfig((c) => ({ ...c, groups: n }))}
                    />
                  </Field>
                  <Field label={t("centre", "periodSequencesPerQuarter")} hint={t("centre", "periodSequencesPerQuarterHint")}>
                    <NumberInput
                      value={config.childrenPerGroup}
                      min={1}
                      max={6}
                      onChange={(n) => setConfig((c) => ({ ...c, childrenPerGroup: n }))}
                    />
                  </Field>
                </>
              )}

              {configKey === "semestrial" && (
                <>
                  <Field label={t("centre", "periodSemesterCount")} hint={t("centre", "periodSemesterCountHint")}>
                    <NumberInput
                      value={config.groups}
                      min={1}
                      max={4}
                      onChange={(n) => setConfig((c) => ({ ...c, groups: n }))}
                    />
                  </Field>
                  <Field label={t("centre", "periodSessionsPerSemester")} hint={t("centre", "periodSessionsPerSemesterHint")}>
                    <NumberInput
                      value={config.childrenPerGroup}
                      min={1}
                      max={4}
                      onChange={(n) => setConfig((c) => ({ ...c, childrenPerGroup: n }))}
                    />
                  </Field>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300"
                      checked={config.includeRattrapage}
                      onChange={(e) => setConfig((c) => ({ ...c, includeRattrapage: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-neutral-700">{t("centre", "periodAddRetake")}</span>
                  </label>
                </>
              )}

              {configKey === "simple" && (
                <Field label={t("centre", "periodEvaluationCount")} hint={t("centre", "periodEvaluationCountHint")}>
                  <NumberInput
                    value={config.evalCount}
                    min={1}
                    max={12}
                    onChange={(n) => setConfig((c) => ({ ...c, evalCount: n }))}
                  />
                </Field>
              )}

              <Field label={t("centre", "periodEvaluationCoefficient")} hint={t("centre", "periodEvaluationCoefficientHint")}>
                <NumberInput
                  value={config.coefficient}
                  min={0.5}
                  max={10}
                  step={0.5}
                  onChange={(n) => setConfig((c) => ({ ...c, coefficient: n }))}
                />
              </Field>

              <div className="rounded-lg border border-black/[0.06] p-3" style={{ backgroundColor: SURFACE }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">{t("centre", "periodPreview")}</p>
                <ul className="space-y-1">
                  {previewLines(builtPreview).map((line) => (
                    <li key={line} className="text-[13px] font-medium text-neutral-700">{line}</li>
                  ))}
                </ul>
              </div>

              {applyError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{applyError}</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-black/[0.06] flex gap-2 justify-end">
              <button type="button" onClick={closeTemplateConfig} disabled={saving} className={btnGhost}>
                {t("centre", "periodCancel")}
              </button>
              <button
                type="button"
                onClick={applyConfiguredTemplate}
                disabled={saving}
                className={btnPrimary}
                style={{ backgroundColor: BLUE }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {t("centre", "periodCreatePeriods")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-neutral-400 font-medium mt-1.5">{hint}</p>}
    </div>
  );
}

function NumberInput({
  value, min, max, step = 1, onChange,
}: {
  value: number; min: number; max: number; step?: number; onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        const raw = Number(e.target.value);
        if (Number.isNaN(raw)) return;
        onChange(clamp(raw, min, max));
      }}
      className={inputCls}
    />
  );
}

function PeriodNameEditor({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  useEffect(() => { setValue(name); }, [name]);

  const save = () => {
    if (value.trim() && value.trim() !== name) onRename(value.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setValue(name); setEditing(false); }
        }}
        className="flex-1 h-8 px-2 rounded-md border border-black/[0.08] bg-white text-sm font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex-1 text-left text-sm font-semibold truncate hover:opacity-70"
      style={{ color: BLUE }}
    >
      {name}
    </button>
  );
}
