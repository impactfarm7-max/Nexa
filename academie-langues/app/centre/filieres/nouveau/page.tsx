"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GitBranch, ArrowLeft, Plus, Trash2, Loader2, CheckCircle2,
  BookOpen, Layers, Clock, X, UserCheck, Tag, CalendarDays,
  MapPin, Monitor, Users, Lock, Pencil, UserPlus, Phone, Mail, Shield, Download, Gauge
} from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import CenterPageLoading from "@/app/components/CenterPageLoading";
import { filterDisciplinesForCenterProgram } from "@/app/data/tcf-teaching-subjects";
import { amountInWordsFr } from "@/app/utils/amountInWordsFr";
import { AmountInWords } from "@/app/components/AmountInWords";
import { fetchDocumentExportConfig } from "@/app/utils/documentConfig";
import { downloadProgrammePdf, type ProgrammePdfData } from "@/app/utils/centerPdfExport";
import {
  isShortPricingMode,
  type ShortPricingMode,
} from "@/app/utils/short-pricing";
import {
  isCursusFeeMode,
  type CursusFeeMode,
} from "@/app/utils/cursus-passage";
import {
  BLUE,
  ORANGE,
  PAGE_BG,
  SURFACE,
  centerNotoSans,
  OutlineHeaderButton,
} from "@/app/centre/center-page-ui";

/** Typo formulaire — alignée Informations générales (SaaS lisible) */
const FIELD_LABEL = "text-sm font-semibold text-neutral-600 block mb-1.5";
const FIELD_LABEL_INLINE = "text-sm font-semibold text-neutral-600 mb-1.5 flex items-center gap-1.5";
const FIELD_INPUT =
  "w-full h-12 px-4 rounded-lg border border-black/[0.08] bg-white font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";
const FIELD_INPUT_SM =
  "h-12 px-4 rounded-lg border border-black/[0.08] bg-white font-semibold text-base outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10";
const FIELD_HINT = "text-sm text-neutral-400 font-medium mt-1.5 leading-relaxed";
const FIELD_SELECT =
  "w-full max-w-sm h-12 px-3 rounded-lg border border-black/[0.08] bg-white text-base font-semibold outline-none focus:border-[#11224E]/40";

type ProgrammeType = "cursus" | "formation_courte";
type DureeUnite = "jours" | "semaines" | "mois";
type ModeEnseignement = "presentiel" | "en_ligne" | "hybride";
type CreateUiStep = "parcours" | "form";

/** Durée catalogue → colonnes mois/semaines/jours du niveau fantôme courte. */
function shortDureeToNiveauFields(valeur: number, unite: DureeUnite) {
  return {
    mois: unite === "mois" ? valeur : 0,
    semaines: unite === "semaines" ? valeur : 0,
    jours: unite === "jours" ? valeur : 0,
  };
}

type Trainer = { id: string; prenom: string; nom?: string };
type StaffMember = { id: string; prenom: string; nom?: string; role: string };
type Discipline = { id: string; name: string };
type Campus = { id: string; name: string; city?: string; is_main: boolean };

type PaymentInstallment = { id: string; montant: string; jours: string };
type FeeDraft = { id: string; label: string; montant: string };
type ClasseDraft = { id: string | null; nom: string };
type MatiereDraft = {
  key?: string;
  discipline_id: string;
  newDisciplineName: string;
  formateurIds: string[];
  niveauNumeros?: number[];
  fm_id?: string | null;
  initialFormateurIds?: string[];
  existingByNiveau?: Record<number, { fm_id: string; initialFormateurIds: string[] }>;
  /** Poids dans la moyenne générale */
  coefficient: number | string;
  /** Barème de notation (ex. 20, 100) */
  max_score: number | string;
};
type NiveauDraft = {
  id?: string | null;
  numero: number;
  nom?: string;
  classes: ClasseDraft[];
  matieres: MatiereDraft[];
  tuition_fee: string;
  fees: FeeDraft[];
  installments: PaymentInstallment[];
  priceLocked: boolean;
  installmentsLocked: boolean;
  feesLocked: boolean;
  /** Seuil de passage (/20). Vide = non configuré. */
  seuil_passage: string;
};

type QuickTrainerContext =
  | { type: "cursus"; numero: number; matiereIdx: number }
  | { type: "courte"; matiereIdx: number }
  | { type: "courte-draft" }
  | { type: "program"; matiereKey: string }
  | null;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}
function defaultNiveau(numero: number): NiveauDraft {
  return {
    numero,
    classes: [],
    matieres: [],
    tuition_fee: "",
    fees: [],
    installments: [],
    priceLocked: false,
    installmentsLocked: false,
    feesLocked: false,
    seuil_passage: "",
  };
}
function defaultMatiere(): MatiereDraft {
  return {
    key: generateId(),
    discipline_id: "",
    newDisciplineName: "",
    formateurIds: [],
    niveauNumeros: [],
    existingByNiveau: {},
    coefficient: 1,
    max_score: 20,
  };
}
function defaultFee(): FeeDraft {
  return { id: generateId(), label: "", montant: "" };
}
function formatFCFA(val: string | number) {
  const n = typeof val === "string" ? Number(val) : val;
  if (!n || isNaN(n)) return "0";
  return n.toLocaleString("fr-FR");
}
function parseAmount(val: string | number | null | undefined) {
  if (typeof val === "number") return Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
  const n = Number(String(val || "").replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function sumInstallments(list: PaymentInstallment[], exceptId?: string) {
  return list.reduce((acc, i) => (exceptId && i.id === exceptId ? acc : acc + parseAmount(i.montant)), 0);
}
function sumFees(fees: FeeDraft[]) {
  return fees.reduce((acc, f) => acc + parseAmount(f.montant), 0);
}
function computeTotal(tuition: string, fees: FeeDraft[]) {
  return String(parseAmount(tuition) + sumFees(fees));
}
function parsePaymentPlan(plan: unknown): { fees: FeeDraft[]; installments: PaymentInstallment[] } {
  if (Array.isArray(plan)) {
    return {
      fees: [],
      installments: plan.map((p: { montant?: number; jours?: number }) => ({
        id: generateId(),
        montant: p.montant != null ? String(p.montant) : "",
        jours: p.jours != null ? String(p.jours) : "0",
      })),
    };
  }
  if (plan && typeof plan === "object") {
    const obj = plan as { fees?: { label?: string; montant?: number }[]; installments?: { montant?: number; jours?: number }[] };
    return {
      fees: (obj.fees || []).map((f) => ({
        id: generateId(),
        label: f.label || "",
        montant: f.montant != null ? String(f.montant) : "",
      })),
      installments: (obj.installments || []).map((p) => ({
        id: generateId(),
        montant: p.montant != null ? String(p.montant) : "",
        jours: p.jours != null ? String(p.jours) : "0",
      })),
    };
  }
  return { fees: [], installments: [] };
}
function formatPaymentPlan(fees: FeeDraft[], installments: PaymentInstallment[]) {
  return {
    fees: fees
      .filter((f) => f.label.trim() && parseAmount(f.montant) > 0)
      .map((f) => ({ label: f.label.trim(), montant: parseAmount(f.montant) })),
    installments: installments
      .filter((i) => i.montant.trim() !== "")
      .map((i) => ({ montant: parseAmount(i.montant), jours: Number(i.jours || 0) })),
  };
}

function ProgramSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)] gap-5 sm:gap-8 lg:gap-12 py-8 sm:py-10 border-b border-black/[0.06] first:pt-2 last:border-b-0">
      <div className="lg:sticky lg:top-24 self-start min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/[0.06]"
            style={{ backgroundColor: SURFACE }}
          >
            <Icon size={18} style={{ color: BLUE }} />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: BLUE }}>
            {title}
          </h2>
        </div>
        <p className="text-sm text-neutral-500 mt-3 leading-relaxed font-medium">{description}</p>
      </div>
      <div className="space-y-5 w-full min-w-0 rounded-xl border border-black/[0.06] p-5 sm:p-6" style={{ backgroundColor: SURFACE }}>
        {children}
      </div>
    </section>
  );
}

/* ─── Blocs UI stables (hors page) — évite la perte de focus des inputs ─── */

function PriceBlock({ value, onChange, locked, onLock, onUnlock, placeholder, label }: {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <div>
      <label className={FIELD_LABEL_INLINE}>
        <Tag size={15} /> {label}
      </label>
      {locked ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-12 px-4 rounded-lg bg-white border border-black/[0.08] flex items-center gap-2 min-w-[160px]">
            <Lock size={14} className="text-neutral-500" />
            <span className="font-semibold text-base text-neutral-800">{formatFCFA(value)} FCFA</span>
          </div>
          <button
            type="button"
            onClick={onUnlock}
            className="flex items-center gap-1.5 px-3 h-10 rounded-lg border border-black/[0.08] text-sm font-semibold text-neutral-600 hover:bg-black/[0.03] transition-colors"
          >
            <Pencil size={14} /> Modifier
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-[15rem]">
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={placeholder || "0"}
              className={`${FIELD_INPUT} pr-16`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">FCFA</span>
          </div>
          {value.trim() && Number(value) > 0 && (
            <button
              type="button"
              onClick={onLock}
              className="px-4 h-12 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: ORANGE }}
            >
              Valider
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InstallmentsBlock({
  installments,
  totalPrice,
  locked,
  onLock,
  onUnlock,
  onAdd,
  onUpdate,
  onRemove,
  label,
}: {
  installments: PaymentInstallment[];
  /** Prix de référence (pension) — les échéances ne peuvent pas le dépasser. */
  totalPrice: string;
  locked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  onAdd: (prefillMontant: string) => void;
  onUpdate: (id: string, key: keyof PaymentInstallment, value: string) => void;
  onRemove: (id: string) => void;
  label: string;
}) {
  const total = parseAmount(totalPrice);
  const allocated = sumInstallments(installments);
  const remaining = Math.max(0, total - allocated);
  const canLock = total > 0 && installments.length > 0 && remaining === 0 && allocated === total;

  const handleMontantChange = (id: string, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits === "") {
      onUpdate(id, "montant", "");
      return;
    }
    const others = sumInstallments(installments, id);
    const max = Math.max(0, total - others);
    const next = Math.min(parseAmount(digits), max);
    onUpdate(id, "montant", String(next));
  };

  const handleAdd = () => {
    onAdd(remaining > 0 ? String(remaining) : "");
  };

  if (locked) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="text-[10px] font-black uppercase text-neutral-500 flex items-center gap-1.5">
            <Lock size={13} /> {label} — validé
          </h4>
          <button
            type="button"
            onClick={onUnlock}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:bg-white transition-colors"
          >
            <Pencil size={12} /> Modifier
          </button>
        </div>
        <div className="space-y-2">
          {installments.map((inst, idx) => (
            <div key={inst.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white border border-neutral-200">
              <span className="text-[11px] font-bold text-neutral-500">Échéance {idx + 1}</span>
              <span className="text-xs font-black" style={{ color: BLUE }}>{formatFCFA(inst.montant)} FCFA</span>
              <span className="text-[10px] font-bold text-neutral-400">J + {inst.jours || "0"}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-neutral-400 mt-3">Total : <span className="font-black text-neutral-700">{formatFCFA(allocated)} FCFA</span></p>
        <AmountInWords amount={allocated} />
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mt-4">
      <h4 className="text-[10px] font-black uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
        <CalendarDays size={13} /> {label}
      </h4>
      <p className="text-[11px] text-neutral-400 mb-3">
        Chaque montant est plafonné au reste du total à payer. La prochaine échéance propose automatiquement le solde.
      </p>

      {total <= 0 ? (
        <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          Définissez d&apos;abord le prix de la formation / du niveau.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3 mb-3 text-[11px] font-bold">
          <span className="text-neutral-500">Pension : <span style={{ color: BLUE }}>{formatFCFA(total)} FCFA</span></span>
          <span className="text-neutral-500">Réparti : <span style={{ color: BLUE }}>{formatFCFA(allocated)} FCFA</span></span>
          <span className={remaining === 0 ? "text-emerald-600" : "text-orange-600"}>
            Reste : {formatFCFA(remaining)} FCFA
          </span>
        </div>
      )}

      <div className="space-y-2 mb-3">
        {installments.map((inst, idx) => {
          const maxForRow = Math.max(0, total - sumInstallments(installments, inst.id));
          return (
            <div key={inst.id} className="flex gap-2 items-center">
              <span className="text-[10px] font-black text-neutral-300 w-4">{idx + 1}.</span>
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={maxForRow > 0 ? `Max ${formatFCFA(maxForRow)}` : "0"}
                  value={inst.montant}
                  disabled={total <= 0}
                  onChange={(e) => handleMontantChange(inst.id, e.target.value)}
                  className="w-full h-10 px-3 pr-12 rounded-lg border bg-white font-bold text-xs outline-none focus:border-[#11224E] focus:ring-4 focus:ring-[#11224E]/10 disabled:bg-neutral-100 disabled:text-neutral-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-neutral-400">FCFA</span>
              </div>
              <div className="relative w-28 shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-400">J +</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={inst.jours}
                  onChange={(e) => onUpdate(inst.id, "jours", e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full h-10 pl-8 pr-3 rounded-lg border bg-white font-bold text-xs outline-none focus:border-[#11224E] focus:ring-4 focus:ring-[#11224E]/10"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(inst.id)}
                className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={total <= 0 || remaining <= 0}
          className="h-9 px-3 rounded-lg bg-white border border-dashed border-neutral-200 text-neutral-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={12} /> Ajouter une échéance
          {remaining > 0 && total > 0 ? ` (${formatFCFA(remaining)})` : ""}
        </button>
        {canLock && (
          <button
            type="button"
            onClick={onLock}
            className="h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-all hover:opacity-90"
            style={{ backgroundColor: ORANGE }}
          >
            Valider l&apos;échéancier
          </button>
        )}
        {total > 0 && installments.length > 0 && remaining > 0 && (
          <span className="text-[10px] font-bold text-neutral-400">
            Répartissez les {formatFCFA(remaining)} FCFA restants pour valider.
          </span>
        )}
      </div>
    </div>
  );
}

function FeesBlock({
  fees,
  onAdd,
  onUpdate,
  onRemove,
  locked,
  onLock,
  onUnlock,
  label,
}: {
  fees: FeeDraft[];
  onAdd: () => void;
  onUpdate: (id: string, key: keyof FeeDraft, value: string) => void;
  onRemove: (id: string) => void;
  locked: boolean;
  onLock: () => void;
  onUnlock: () => void;
  label?: string;
}) {
  const complete = fees.filter((f) => f.label.trim() && parseAmount(f.montant) > 0);
  const incomplete = fees.some((f) => f.label.trim() || parseAmount(f.montant) > 0) && fees.some((f) => !f.label.trim() || parseAmount(f.montant) <= 0);
  const canLock = !incomplete;

  if (locked) {
    return (
      <div className="mt-4 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider flex items-center gap-1.5">
            <Lock size={12} /> {label || "Frais supplémentaires"} — validés
          </p>
          <button
            type="button"
            onClick={onUnlock}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:bg-white transition-colors"
          >
            <Pencil size={12} /> Modifier
          </button>
        </div>
        {complete.length === 0 ? (
          <p className="text-xs font-bold text-neutral-400">Aucun frais supplémentaire.</p>
        ) : (
          <ul className="space-y-1.5">
            {complete.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-neutral-600">{f.label}</span>
                <span className="font-black" style={{ color: BLUE }}>{formatFCFA(f.montant)} FCFA</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider mb-2">
        {label || "Frais supplémentaires"}
      </p>
      <p className="text-[11px] text-neutral-400 mb-3">Intitulé + montant, puis validez pour figer la liste.</p>
      <div className="space-y-2">
        {fees.map((f) => (
          <div key={f.id} className="flex flex-wrap gap-2 items-center">
            <input
              value={f.label}
              onChange={(e) => onUpdate(f.id, "label", e.target.value)}
              placeholder="Intitulé"
              className="flex-1 min-w-[8rem] h-10 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none"
            />
            <div className="relative w-32">
              <input
                value={f.montant}
                onChange={(e) => onUpdate(f.id, "montant", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                inputMode="numeric"
                className="w-full h-10 px-3 pr-12 rounded-xl border bg-neutral-50 text-xs font-black outline-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-neutral-400">FCFA</span>
            </div>
            <button type="button" onClick={() => onRemove(f.id)} className="p-2 text-neutral-400 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          type="button"
          onClick={onAdd}
          className="px-3 h-9 rounded-xl border border-dashed border-orange-200 text-[10px] font-black uppercase tracking-wider hover:bg-orange-50"
          style={{ color: ORANGE }}
        >
          <Plus size={12} className="inline mr-1" /> Ajouter un frais
        </button>
        <button
          type="button"
          onClick={onLock}
          disabled={!canLock}
          className="px-3 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40"
          style={{ backgroundColor: BLUE }}
        >
          <CheckCircle2 size={12} className="inline mr-1" /> Valider les frais
        </button>
      </div>
      {incomplete && (
        <p className="text-[10px] text-amber-600 font-bold mt-2">Complétez intitulé et montant de chaque ligne, ou retirez les lignes vides.</p>
      )}
    </div>
  );
}

function TotalDisplay({ total, label }: { total: string; label?: string }) {
  const n = parseAmount(total);
  return (
    <div className="rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase text-neutral-400">{label || "Total à payer"}</span>
        <span className="text-sm font-black" style={{ color: BLUE }}>{formatFCFA(total)} FCFA</span>
      </div>
      <AmountInWords amount={n} />
    </div>
  );
}

function ClassroomsBlock({
  classes,
  onSetCount,
  onRename,
  editLocked,
  niveauLabel,
}: {
  classes: ClasseDraft[];
  onSetCount: (n: number) => void;
  onRename: (idx: number, val: string) => void;
  editLocked?: boolean;
  niveauLabel?: string;
}) {
  const minCount = editLocked ? classes.filter((c) => c.id).length : 0;
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-600 tracking-normal mb-1">
        Salles de classe{niveauLabel ? ` — ${niveauLabel}` : ""}
      </p>
      <p className="text-sm text-neutral-400 mb-3 font-medium">
        Indiquez le nombre de salles, puis nommez-les (ex. Cours du jour, Cours du soir).
      </p>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm font-semibold text-neutral-600">Nombre</label>
        <input
          type="text"
          inputMode="numeric"
          value={String(classes.length || "")}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            if (raw === "") {
              onSetCount(minCount);
              return;
            }
            const n = Math.max(minCount, Math.min(20, parseInt(raw, 10) || 0));
            onSetCount(n);
          }}
          className="w-20 h-12 px-3 rounded-lg border border-black/[0.08] bg-white font-semibold text-base text-center outline-none focus:border-[#11224E]/40"
        />
        {editLocked && minCount > 0 && (
          <span className="text-sm text-amber-600 font-semibold">Min. {minCount} (déjà liées)</span>
        )}
      </div>
      {classes.length === 0 ? (
        <p className="text-sm font-medium text-neutral-400">Aucune salle — saisissez un nombre ci-dessus.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {classes.map((c, idx) => (
            <div key={c.id || `new-${idx}`} className="flex items-center gap-1 bg-white border border-black/[0.08] rounded-lg pl-3 pr-2 h-12">
              <input
                value={c.nom}
                onChange={(e) => onRename(idx, e.target.value)}
                className="bg-transparent text-base font-semibold outline-none w-40 text-[#11224E]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormateursBlock({ trainers, matiereData, onToggle, onOpenQuickCreate }: {
  trainers: Trainer[];
  matiereData: MatiereDraft;
  onToggle: (id: string) => void;
  onOpenQuickCreate: () => void;
}) {
  return (
    <div className="bg-white p-3 rounded-xl border border-neutral-200">
      <p className="text-[9px] font-black uppercase text-neutral-400 mb-2 tracking-wider flex items-center gap-1">
        <UserCheck size={12} /> Formateurs <span className="font-medium normal-case tracking-normal text-neutral-300">— optionnel</span>
      </p>
      <p className="text-[10px] text-neutral-400 mb-2">Complétez le profil dans Staff après création rapide.</p>
      <div className="flex gap-1.5 flex-wrap mb-2">
        {trainers.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
              matiereData.formateurIds.includes(t.id)
                ? "text-white"
                : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300"
            }`}
            style={matiereData.formateurIds.includes(t.id) ? { backgroundColor: BLUE, borderColor: BLUE } : {}}
          >
            {t.prenom}{t.nom ? ` ${t.nom[0]}.` : ""}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenQuickCreate}
        className="flex items-center gap-1.5 text-[10px] font-bold hover:opacity-80 transition-opacity mt-1"
        style={{ color: ORANGE }}
      >
        <UserPlus size={13} /> Créer un formateur
      </button>
    </div>
  );
}

export default function NouveauProgrammePage() {
  return (
    <Suspense fallback={<CenterPageLoading className="bg-[#FFFBF7]" />}>
      <NouveauProgrammeForm />
    </Suspense>
  );
}

function NouveauProgrammeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editFiliereId = searchParams.get("edit");
  const isEditMode = !!editFiliereId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [centerId, setCenterId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [includedProgrammes, setIncludedProgrammes] = useState<number | null>(null);
  const [programmeCount, setProgrammeCount] = useState(0);

  // --- Champs du formulaire ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProgrammeType>("cursus");
  /** Création : parcours d'abord, puis formulaire. Édition : formulaire direct. */
  const [uiStep, setUiStep] = useState<CreateUiStep>(isEditMode ? "form" : "parcours");
  const [mode, setMode] = useState<ModeEnseignement>("presentiel");
  const [cursusFeeMode, setCursusFeeMode] = useState<CursusFeeMode>("par_niveau");
  const [nbNiveauxStr, setNbNiveauxStr] = useState("3");
  const [dureeValeurStr, setDureeValeurStr] = useState("1");
  const [dureeUnite, setDureeUnite] = useState<DureeUnite>("mois");
  const nbNiveaux = Math.max(1, parseInt(nbNiveauxStr) || 1);
  const dureeValeur = Math.max(1, parseInt(dureeValeurStr) || 1);
  const [tuitionFee, setTuitionFee] = useState("");
  const [priceLocked, setPriceLocked] = useState(false);
  const [headTrainerId, setHeadTrainerId] = useState("");
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);

  // --- Niveaux (cursus) ---
  const [niveaux, setNiveaux] = useState<NiveauDraft[]>([defaultNiveau(1)]);
  const [expandedNiveau, setExpandedNiveau] = useState<number>(1);

  // --- Formation courte ---
  const [pricingMode, setPricingMode] = useState<ShortPricingMode>("forfaitaire");
  const [classesCourtes, setClassesCourtes] = useState<ClasseDraft[]>([]);
  const [shortInstallments, setShortInstallments] = useState<PaymentInstallment[]>([]);
  const [shortInstallmentsLocked, setShortInstallmentsLocked] = useState(false);
  const [shortFees, setShortFees] = useState<FeeDraft[]>([]);
  const [shortFeesLocked, setShortFeesLocked] = useState(false);
  const [matieresProgram, setMatieresProgram] = useState<MatiereDraft[]>([]);
  const [draftMatiereProgram, setDraftMatiereProgram] = useState<MatiereDraft | null>(() => defaultMatiere());
  const [matieresCourtes, setMatieresCourtes] = useState<MatiereDraft[]>([]);
  const [draftMatiereCourte, setDraftMatiereCourte] = useState<MatiereDraft | null>(() => defaultMatiere());
  const [matiereDraftError, setMatiereDraftError] = useState("");
  const [draftProgramIsEdit, setDraftProgramIsEdit] = useState(false);
  const [draftCourteIsEdit, setDraftCourteIsEdit] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // --- Création rapide formateur ---
  const [quickTrainerCtx, setQuickTrainerCtx] = useState<QuickTrainerContext>(null);
  const [qtPrenom, setQtPrenom] = useState("");
  const [qtNom, setQtNom] = useState("");
  const [qtEmail, setQtEmail] = useState("");
  const [qtPhone, setQtPhone] = useState("");
  const [qtSaving, setQtSaving] = useState(false);
  const [qtError, setQtError] = useState("");
  const [qtResult, setQtResult] = useState<{ emailSent: boolean; temporaryPassword?: string } | null>(null);

  const [existingFilieres, setExistingFilieres] = useState<{ id: string; name: string }[]>([]);
  const [created, setCreated] = useState<{ id: string; name: string; updated?: boolean } | null>(null);

  // --- Mode édition (réconciliation) ---
  const [editLocked, setEditLocked] = useState(false);
  const [initialNiveauIds, setInitialNiveauIds] = useState<string[]>([]);
  const [initialClasseIds, setInitialClasseIds] = useState<string[]>([]);
  const [initialMatiereIds, setInitialMatiereIds] = useState<string[]>([]);

  // Sync niveaux avec le nombre choisi
  useEffect(() => {
    if (type !== "cursus") return;
    setNiveaux((prev) => {
      const next: NiveauDraft[] = [];
      for (let i = 1; i <= nbNiveaux; i++) next.push(prev.find((n) => n.numero === i) || defaultNiveau(i));
      return next;
    });
    setMatieresProgram((prev) =>
      prev.map((m) => ({
        ...m,
        niveauNumeros: (m.niveauNumeros || []).filter((n) => n <= nbNiveaux),
      })),
    );
  }, [nbNiveaux, type]);

  // Auto-sélection campus si un seul
  useEffect(() => {
    if (campuses.length === 1 && selectedCampusIds.length === 0) {
      setSelectedCampusIds([campuses[0].id]);
    }
  }, [campuses, selectedCampusIds.length]);

  const hydrateProgramForEdit = async (filiereId: string, cId: string) => {
    const { data: f, error: fErr } = await supabase
      .from("filieres")
      .select("id, name, description, type, mode, nb_niveaux, duree_valeur, duree_unite, default_tuition_fee, payment_plan, head_trainer_id, pricing_mode, cursus_fee_mode")
      .eq("id", filiereId)
      .eq("center_id", cId)
      .single();
    if (fErr || !f) throw new Error("Programme introuvable.");

    setName(f.name || "");
    setDescription(f.description || "");
    setType(f.type as ProgrammeType);
    setMode((f.mode as ModeEnseignement) || "presentiel");
    if (f.type === "cursus") {
      setNbNiveauxStr(String(f.nb_niveaux || 1));
      setCursusFeeMode(isCursusFeeMode(f.cursus_fee_mode) ? f.cursus_fee_mode : "par_niveau");
      // Mode uniforme : frais + échéancier au niveau filière
      const parsed = parsePaymentPlan(f.payment_plan);
      setShortFees(parsed.fees);
      setShortFeesLocked(parsed.fees.length > 0);
      setShortInstallments(parsed.installments);
      if (parsed.installments.length > 0) setShortInstallmentsLocked(true);
    } else {
      setPricingMode(isShortPricingMode(f.pricing_mode) ? f.pricing_mode : "forfaitaire");
      setDureeValeurStr(String(f.duree_valeur || 1));
      setDureeUnite((f.duree_unite as DureeUnite) || "mois");
      const parsed = parsePaymentPlan(f.payment_plan);
      setShortFees(parsed.fees);
      setShortFeesLocked(parsed.fees.length > 0);
      setShortInstallments(parsed.installments);
      if (parsed.installments.length > 0) setShortInstallmentsLocked(true);
    }
    if (f.default_tuition_fee != null) {
      setTuitionFee(String(f.default_tuition_fee));
      setPriceLocked(true);
    }
    setHeadTrainerId(f.head_trainer_id || "");

    const { data: campusLinks } = await supabase.from("filiere_campus").select("campus_id").eq("filiere_id", filiereId);
    setSelectedCampusIds((campusLinks || []).map((r) => r.campus_id));

    const { count: enrollCount } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("filiere_id", filiereId);
    setEditLocked((enrollCount || 0) > 0);

    const { data: matRows } = await supabase
      .from("filiere_matieres")
      .select("id, niveau_id, annee, discipline_id, coefficient, max_score, exam_disciplines(name)")
      .eq("filiere_id", filiereId);
    const fmIds = (matRows || []).map((m: { id: string }) => m.id);
    setInitialMatiereIds(fmIds);

    const { data: formRows } = fmIds.length
      ? await supabase.from("matiere_formateurs").select("filiere_matiere_id, formateur_id").in("filiere_matiere_id", fmIds)
      : { data: [] as { filiere_matiere_id: string; formateur_id: string }[] };
    const formByFm: Record<string, string[]> = {};
    for (const row of formRows || []) {
      (formByFm[row.filiere_matiere_id] ||= []).push(row.formateur_id);
    }

    const matList = (matRows || []) as Array<{
      id: string;
      niveau_id: string | null;
      annee: number;
      discipline_id: string;
      coefficient?: number | null;
      max_score?: number | null;
    }>;

    if (f.type === "cursus") {
      const { data: nivRows } = await supabase
        .from("niveaux")
        .select("id, annee, nom, tuition_fee, payment_plan, seuil_passage")
        .eq("filiere_id", filiereId)
        .order("annee");
      const niveauIds = (nivRows || []).map((n: { id: string }) => n.id);
      setInitialNiveauIds(niveauIds);
      const { data: grpRows } = niveauIds.length
        ? await supabase.from("groupes").select("id, nom, niveau_id").in("niveau_id", niveauIds)
        : { data: [] as { id: string; nom: string; niveau_id: string }[] };
      setInitialClasseIds((grpRows || []).map((g: { id: string }) => g.id));

      const anneeByNiveauId: Record<string, number> = {};
      for (const n of nivRows || []) anneeByNiveauId[(n as { id: string }).id] = (n as { annee: number }).annee;

      const loaded: NiveauDraft[] = (nivRows || []).map((n: {
        id: string;
        annee: number;
        nom: string | null;
        tuition_fee: number | null;
        payment_plan: unknown;
        seuil_passage: number | null;
      }) => {
        const parsed = parsePaymentPlan(n.payment_plan);
        const tuition = n.tuition_fee != null ? String(n.tuition_fee) : "";
        return {
          id: n.id,
          numero: n.annee,
          nom: n.nom || "",
          classes: (grpRows || [])
            .filter((g: { niveau_id: string }) => g.niveau_id === n.id)
            .map((g: { id: string; nom: string }) => ({ id: g.id, nom: g.nom })),
          matieres: [],
          tuition_fee: tuition,
          fees: parsed.fees,
          installments: parsed.installments,
          priceLocked: !!tuition.trim(),
          installmentsLocked: parsed.installments.length > 0,
          feesLocked: parsed.fees.length > 0,
          seuil_passage: n.seuil_passage != null ? String(n.seuil_passage) : "",
        };
      });
      setNiveaux(loaded.length ? loaded : [defaultNiveau(1)]);
      setExpandedNiveau(loaded[0]?.numero || 1);

      // Group matières by discipline across levels
      const byDisc: Record<string, MatiereDraft> = {};
      for (const m of matList) {
        const annee = m.niveau_id ? anneeByNiveauId[m.niveau_id] : m.annee;
        if (!byDisc[m.discipline_id]) {
          byDisc[m.discipline_id] = {
            key: generateId(),
            discipline_id: m.discipline_id,
            newDisciplineName: "",
            formateurIds: formByFm[m.id] || [],
            niveauNumeros: [],
            existingByNiveau: {},
            coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
            max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
          };
        }
        const draft = byDisc[m.discipline_id];
        if (annee != null && !draft.niveauNumeros!.includes(annee)) draft.niveauNumeros!.push(annee);
        draft.existingByNiveau![annee] = {
          fm_id: m.id,
          initialFormateurIds: formByFm[m.id] || [],
        };
        // Union formateurs
        for (const fid of formByFm[m.id] || []) {
          if (!draft.formateurIds.includes(fid)) draft.formateurIds.push(fid);
        }
      }
      const grouped = Object.values(byDisc);
      setMatieresProgram(grouped);
      setDraftMatiereProgram(null);
    } else {
      const { data: phantom } = await supabase
        .from("niveaux")
        .select("id")
        .eq("filiere_id", filiereId)
        .is("annee", null)
        .maybeSingle();
      let grpQuery = supabase.from("groupes").select("id, nom");
      if (phantom?.id) {
        grpQuery = grpQuery.or(`filiere_id.eq.${filiereId},niveau_id.eq.${phantom.id}`);
      } else {
        grpQuery = grpQuery.eq("filiere_id", filiereId);
      }
      const { data: grpRows } = await grpQuery;
      setInitialClasseIds((grpRows || []).map((g: { id: string }) => g.id));
      setClassesCourtes((grpRows || []).map((g: { id: string; nom: string }) => ({ id: g.id, nom: g.nom })));
      setMatieresCourtes(
        matList.length
          ? matList.map((m) => ({
              key: generateId(),
              fm_id: m.id,
              discipline_id: m.discipline_id,
              newDisciplineName: "",
              formateurIds: formByFm[m.id] || [],
              initialFormateurIds: formByFm[m.id] || [],
              niveauNumeros: [],
              existingByNiveau: {},
              coefficient: Number(m.coefficient) > 0 ? Number(m.coefficient) : 1,
              max_score: Number(m.max_score) > 0 ? Number(m.max_score) : 20,
            }))
          : [],
      );
      setDraftMatiereCourte(matList.length ? null : defaultMatiere());
    }
  };

  const loadContext = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("center_id").eq("id", session.user.id).single();
    const cId = profile?.center_id || null;
    setUserId(session.user.id);
    setCenterId(cId);

    const [
      { data: trainerRows },
      { data: discRows },
      { data: filiereRows },
      { data: center },
      { data: campusRows },
      { data: allStaff },
    ] = await Promise.all([
      supabase.from("profiles").select("id, prenom, nom").eq("center_id", cId || "").eq("role", "trainer"),
      supabase
        .from("exam_disciplines")
        .select("id, name, code, is_builtin, center_id")
        .or(`is_builtin.eq.true,center_id.eq.${cId || "00000000-0000-0000-0000-000000000000"}`),
      supabase.from("filieres").select("id, name").eq("center_id", cId || ""),
      cId ? supabase.from("centers").select("plan_type, center_type").eq("id", cId).single() : Promise.resolve({ data: null }),
      supabase.from("campuses").select("id, name, city, is_main").eq("center_id", cId || "").eq("status", "actif").order("is_main", { ascending: false }),
      supabase.from("profiles").select("id, prenom, nom, role").eq("center_id", cId || "").in("role", ["trainer", "center_manager", "staff"]),
    ]);

    setTrainers(trainerRows || []);
    setDisciplines(
      filterDisciplinesForCenterProgram(discRows || [], center?.center_type, cId).map((d) => ({
        id: d.id,
        name: d.name,
      })),
    );
    setProgrammeCount((filiereRows || []).length);
    setExistingFilieres((filiereRows || []) as { id: string; name: string }[]);
    setCampuses(campusRows || []);
    setStaffMembers(allStaff || []);

    if (center?.plan_type) {
      const { data: plan } = await supabase.from("center_plans").select("included_matieres").eq("code", center.plan_type).maybeSingle();
      setIncludedProgrammes(plan?.included_matieres ?? null);
    }

    if (editFiliereId && cId) {
      try {
        await hydrateProgramForEdit(editFiliereId, cId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Impossible de charger le programme.";
        setErrorMsg(msg);
      }
    }

    setLoading(false);
  }, [editFiliereId]);

  useEffect(() => { loadContext(); }, [loadContext]);

  const isQuotaReached =
    !isEditMode && includedProgrammes !== null && programmeCount >= includedProgrammes;

  const isDuplicateProgramName = !!(
    name.trim() &&
    existingFilieres.some(
      (f) => f.name.trim().toLowerCase() === name.trim().toLowerCase() && f.id !== editFiliereId
    )
  );

  // ===================== GESTION NIVEAUX =====================
  const updateNiveau = (numero: number, patch: Partial<NiveauDraft>) =>
    setNiveaux((prev) => prev.map((n) => (n.numero === numero ? { ...n, ...patch } : n)));

  const addClasseToNiveau = (numero: number) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    const nextNum = n.classes.length + 1;
    updateNiveau(numero, { classes: [...n.classes, { id: null, nom: `Salle ${nextNum}` }] });
  };
  const setClassesCountNiveau = (numero: number, count: number) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    const min = editLocked ? n.classes.filter((c) => c.id).length : 0;
    const target = Math.max(min, count);
    let next = [...n.classes];
    while (next.length < target) next.push({ id: null, nom: `Salle ${next.length + 1}` });
    if (next.length > target) next = next.slice(0, target);
    updateNiveau(numero, { classes: next });
  };
  const renameClasse = (numero: number, idx: number, val: string) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    const next = n.classes.map((c, i) => (i === idx ? { ...c, nom: val } : c));
    updateNiveau(numero, { classes: next });
  };
  const removeClasse = (numero: number, idx: number) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    if (editLocked && n.classes[idx]?.id) return;
    updateNiveau(numero, { classes: n.classes.filter((_, i) => i !== idx) });
  };
  const addMatiereToNiveau = (numero: number) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    updateNiveau(numero, { matieres: [...n.matieres, defaultMatiere()] });
  };
  const updateMatiereNiveau = (numero: number, idx: number, patch: Partial<MatiereDraft>) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    updateNiveau(numero, { matieres: n.matieres.map((m, i) => (i === idx ? { ...m, ...patch } : m)) });
  };
  const removeMatiereNiveau = (numero: number, idx: number) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    updateNiveau(numero, { matieres: n.matieres.filter((_, i) => i !== idx) });
  };
  const toggleFormateurNiveau = (numero: number, matiereIdx: number, formateurId: string) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    const m = n.matieres[matiereIdx];
    const has = m.formateurIds.includes(formateurId);
    updateMatiereNiveau(numero, matiereIdx, { formateurIds: has ? m.formateurIds.filter((id) => id !== formateurId) : [...m.formateurIds, formateurId] });
  };

  // --- Échéances Niveau ---
  const addNiveauInstallment = (numero: number, prefillMontant = "") => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n || n.installmentsLocked) return;
    updateNiveau(numero, { installments: [...n.installments, { id: generateId(), montant: prefillMontant, jours: "0" }] });
  };
  const updateNiveauInstallment = (numero: number, id: string, key: keyof PaymentInstallment, value: string) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n || n.installmentsLocked) return;
    updateNiveau(numero, { installments: n.installments.map(i => i.id === id ? { ...i, [key]: value } : i) });
  };
  const removeNiveauInstallment = (numero: number, id: string) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n || n.installmentsLocked) return;
    updateNiveau(numero, { installments: n.installments.filter(i => i.id !== id) });
  };

  // ===================== FORMATION COURTE =====================
  const setClassesCourtesCount = (count: number) => {
    const min = editLocked ? classesCourtes.filter((c) => c.id).length : 0;
    const target = Math.max(min, count);
    setClassesCourtes((prev) => {
      let next = [...prev];
      while (next.length < target) next.push({ id: null, nom: `Salle ${next.length + 1}` });
      if (next.length > target) next = next.slice(0, target);
      return next;
    });
  };
  const addClasseCourte = () =>
    setClassesCourtes((p) => [...p, { id: null, nom: `Salle ${p.length + 1}` }]);
  const renameClasseCourte = (idx: number, val: string) =>
    setClassesCourtes((p) => p.map((c, i) => (i === idx ? { ...c, nom: val } : c)));
  const removeClasseCourte = (idx: number) => {
    if (editLocked && classesCourtes[idx]?.id) return;
    setClassesCourtes((p) => p.filter((_, i) => i !== idx));
  };
  const addMatiereCourte = () => setMatieresCourtes((p) => [...p, defaultMatiere()]);
  const updateMatiereCourte = (idx: number, patch: Partial<MatiereDraft>) => setMatieresCourtes((p) => p.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  const removeMatiereCourte = (idx: number) => setMatieresCourtes((p) => p.filter((_, i) => i !== idx));
  const toggleFormateurCourte = (idx: number, formateurId: string) => {
    const m = matieresCourtes[idx];
    const has = m.formateurIds.includes(formateurId);
    updateMatiereCourte(idx, { formateurIds: has ? m.formateurIds.filter((id) => id !== formateurId) : [...m.formateurIds, formateurId] });
  };

  // --- Échéances Formation Courte ---
  const addShortInstallment = (prefillMontant = "") => {
    if (shortInstallmentsLocked) return;
    setShortInstallments(p => [...p, { id: generateId(), montant: prefillMontant, jours: "0" }]);
  };
  const updateShortInstallment = (id: string, key: keyof PaymentInstallment, value: string) => {
    if (shortInstallmentsLocked) return;
    setShortInstallments(p => p.map(i => i.id === id ? { ...i, [key]: value } : i));
  };
  const removeShortInstallment = (id: string) => {
    if (shortInstallmentsLocked) return;
    setShortInstallments(p => p.filter(i => i.id !== id));
  };

  const addShortFee = () => {
    if (shortFeesLocked) return;
    setShortFees((p) => [...p, defaultFee()]);
  };
  const updateShortFee = (id: string, key: keyof FeeDraft, value: string) => {
    if (shortFeesLocked) return;
    setShortFees((p) => p.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };
  const removeShortFee = (id: string) => {
    if (shortFeesLocked) return;
    setShortFees((p) => p.filter((f) => f.id !== id));
  };
  const lockShortFees = () => {
    const cleaned = shortFees.filter((f) => f.label.trim() && parseAmount(f.montant) > 0);
    setShortFees(cleaned);
    setShortFeesLocked(true);
  };

  const addNiveauFee = (numero: number) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n || n.feesLocked) return;
    updateNiveau(numero, { fees: [...n.fees, defaultFee()] });
  };
  const updateNiveauFee = (numero: number, id: string, key: keyof FeeDraft, value: string) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n || n.feesLocked) return;
    updateNiveau(numero, { fees: n.fees.map((f) => (f.id === id ? { ...f, [key]: value } : f)) });
  };
  const removeNiveauFee = (numero: number, id: string) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n || n.feesLocked) return;
    updateNiveau(numero, { fees: n.fees.filter((f) => f.id !== id) });
  };
  const lockNiveauFees = (numero: number) => {
    const n = niveaux.find((x) => x.numero === numero);
    if (!n) return;
    updateNiveau(numero, {
      fees: n.fees.filter((f) => f.label.trim() && parseAmount(f.montant) > 0),
      feesLocked: true,
    });
  };

  const matiereDisplayName = (m: MatiereDraft) => {
    if (m.discipline_id) return disciplines.find((d) => d.id === m.discipline_id)?.name || "Matière";
    return m.newDisciplineName.trim() || "Nouvelle matière";
  };

  const validateDraftMatiere = (m: MatiereDraft, forCursus: boolean): string | null => {
    const rawName = m.newDisciplineName.trim();
    if (!m.discipline_id && !rawName) return "Choisissez ou saisissez une matière.";

    const existingDisc = !m.discipline_id && rawName
      ? disciplines.find((d) => d.name.trim().toLowerCase() === rawName.toLowerCase())
      : null;
    const effectiveDiscId = m.discipline_id || existingDisc?.id;
    const currentList = forCursus ? matieresProgram : matieresCourtes;

    const isAlreadyInProgram = currentList.some((other) => {
      if (other.key === m.key) return false;
      if (effectiveDiscId && other.discipline_id === effectiveDiscId) return true;
      if (rawName && (
        (other.discipline_id && disciplines.find((d) => d.id === other.discipline_id)?.name.trim().toLowerCase() === rawName.toLowerCase()) ||
        other.newDisciplineName.trim().toLowerCase() === rawName.toLowerCase()
      )) return true;
      return false;
    });

    if (isAlreadyInProgram) {
      const discName = m.discipline_id
        ? disciplines.find((d) => d.id === m.discipline_id)?.name
        : existingDisc?.name || rawName;
      return `La matière « ${discName} » est déjà présente dans ce programme.`;
    }

    if (forCursus && !(m.niveauNumeros || []).length) return "Sélectionnez au moins un niveau.";
    return null;
  };

  const confirmDraftMatiereProgram = () => {
    if (!draftMatiereProgram) return;
    const err = validateDraftMatiere(draftMatiereProgram, true);
    if (err) { setMatiereDraftError(err); return; }
    setMatiereDraftError("");

    let finalDraft = { ...draftMatiereProgram };
    if (!finalDraft.discipline_id && finalDraft.newDisciplineName.trim()) {
      const match = disciplines.find(
        (d) => d.name.trim().toLowerCase() === finalDraft.newDisciplineName.trim().toLowerCase()
      );
      if (match) {
        finalDraft.discipline_id = match.id;
        finalDraft.newDisciplineName = "";
      }
    }

    setMatieresProgram((prev) => [...prev, finalDraft]);
    setDraftMatiereProgram(null);
    setDraftProgramIsEdit(false);
  };

  const editMatiereProgram = (key: string) => {
    const m = matieresProgram.find((x) => x.key === key);
    if (!m) return;
    setDraftMatiereProgram({ ...m });
    setMatieresProgram((prev) => prev.filter((x) => x.key !== key));
    setDraftProgramIsEdit(true);
    setMatiereDraftError("");
  };

  const cancelDraftMatiereProgram = () => {
    if (draftProgramIsEdit && draftMatiereProgram) {
      setMatieresProgram((prev) => [...prev, draftMatiereProgram]);
    }
    setDraftMatiereProgram(null);
    setDraftProgramIsEdit(false);
    setMatiereDraftError("");
  };

  const confirmDraftMatiereCourte = () => {
    if (!draftMatiereCourte) return;
    const err = validateDraftMatiere(draftMatiereCourte, false);
    if (err) { setMatiereDraftError(err); return; }
    setMatiereDraftError("");

    let finalDraft = { ...draftMatiereCourte };
    if (!finalDraft.discipline_id && finalDraft.newDisciplineName.trim()) {
      const match = disciplines.find(
        (d) => d.name.trim().toLowerCase() === finalDraft.newDisciplineName.trim().toLowerCase()
      );
      if (match) {
        finalDraft.discipline_id = match.id;
        finalDraft.newDisciplineName = "";
      }
    }

    setMatieresCourtes((prev) => [...prev, finalDraft]);
    setDraftMatiereCourte(null);
    setDraftCourteIsEdit(false);
  };

  const editMatiereCourteRow = (key: string) => {
    const m = matieresCourtes.find((x) => x.key === key);
    if (!m) return;
    setDraftMatiereCourte({ ...m });
    setMatieresCourtes((prev) => prev.filter((x) => x.key !== key));
    setDraftCourteIsEdit(true);
    setMatiereDraftError("");
  };

  const cancelDraftMatiereCourte = () => {
    if (draftCourteIsEdit && draftMatiereCourte) {
      setMatieresCourtes((prev) => [...prev, draftMatiereCourte]);
    }
    setDraftMatiereCourte(null);
    setDraftCourteIsEdit(false);
    setMatiereDraftError("");
  };

  const updateMatiereProgram = (key: string, patch: Partial<MatiereDraft>) => {
    if (draftMatiereProgram?.key === key) {
      setDraftMatiereProgram((d) => (d ? { ...d, ...patch } : d));
      return;
    }
    setMatieresProgram((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  };
  const removeMatiereProgram = (key: string) => {
    if (editLocked) {
      const m = matieresProgram.find((x) => x.key === key) || (draftMatiereProgram?.key === key ? draftMatiereProgram : null);
      if (m && Object.keys(m.existingByNiveau || {}).length > 0) return;
    }
    if (draftMatiereProgram?.key === key) setDraftMatiereProgram(null);
    setMatieresProgram((p) => p.filter((m) => m.key !== key));
  };
  const toggleMatiereNiveau = (key: string, numero: number) => {
    const m = draftMatiereProgram?.key === key ? draftMatiereProgram : matieresProgram.find((x) => x.key === key);
    if (!m) return;
    const nums = m.niveauNumeros || [];
    const has = nums.includes(numero);
    if (has && editLocked && m.existingByNiveau?.[numero]) return;
    updateMatiereProgram(key, {
      niveauNumeros: has ? nums.filter((n) => n !== numero) : [...nums, numero].sort((a, b) => a - b),
    });
  };
  const toggleFormateurProgram = (key: string, formateurId: string) => {
    const m = draftMatiereProgram?.key === key ? draftMatiereProgram : matieresProgram.find((x) => x.key === key);
    if (!m) return;
    const has = m.formateurIds.includes(formateurId);
    updateMatiereProgram(key, {
      formateurIds: has ? m.formateurIds.filter((id) => id !== formateurId) : [...m.formateurIds, formateurId],
    });
  };

  const updateMatiereCourteDraft = (patch: Partial<MatiereDraft>) => {
    setDraftMatiereCourte((d) => (d ? { ...d, ...patch } : d));
  };
  const toggleFormateurCourteDraft = (formateurId: string) => {
    if (!draftMatiereCourte) return;
    const has = draftMatiereCourte.formateurIds.includes(formateurId);
    updateMatiereCourteDraft({
      formateurIds: has
        ? draftMatiereCourte.formateurIds.filter((id) => id !== formateurId)
        : [...draftMatiereCourte.formateurIds, formateurId],
    });
  };
  const removeMatiereCourteByKey = (key: string) => {
    if (editLocked) {
      const m = matieresCourtes.find((x) => x.key === key);
      if (m?.fm_id) return;
    }
    setMatieresCourtes((p) => p.filter((m) => m.key !== key));
  };

  // ===================== CAMPUS =====================
  const toggleCampus = (campusId: string) => {
    setSelectedCampusIds((prev) =>
      prev.includes(campusId) ? prev.filter((id) => id !== campusId) : [...prev, campusId]
    );
  };

  // ===================== CRÉATION RAPIDE FORMATEUR =====================
  const openQuickTrainer = (ctx: QuickTrainerContext) => {
    setQuickTrainerCtx(ctx);
    setQtPrenom(""); setQtNom(""); setQtEmail(""); setQtPhone("");
    setQtError(""); setQtSaving(false); setQtResult(null);
  };

  const submitQuickTrainer = async () => {
    if (!qtPrenom.trim()) { setQtError("Le prénom est requis."); return; }
    if (!qtNom.trim()) { setQtError("Le nom est requis."); return; }
    if (!qtEmail.trim()) { setQtError("L'email est requis."); return; }
    if (!centerId) return;
    setQtSaving(true); setQtError(""); setQtResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prenom: qtPrenom.trim(),
          nom: qtNom.trim(),
          email: qtEmail.trim(),
          phone: qtPhone.trim() || null,
          role: "trainer",
          job_title: "Formateur",
          genre: "Autre",
          birth_date: "2000-01-01",
          campus_ids: [],
          permissions: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Création échouée.");
      const newId = data.id as string;
      if (!newId) throw new Error("Identifiant formateur manquant.");
      const newTrainer: Trainer = { id: newId, prenom: qtPrenom.trim(), nom: qtNom.trim() };
      setTrainers((prev) => [...prev, newTrainer]);
      if (quickTrainerCtx?.type === "cursus") {
        toggleFormateurNiveau(quickTrainerCtx.numero, quickTrainerCtx.matiereIdx, newId);
      } else if (quickTrainerCtx?.type === "courte") {
        toggleFormateurCourte(quickTrainerCtx.matiereIdx, newId);
      } else if (quickTrainerCtx?.type === "courte-draft") {
        toggleFormateurCourteDraft(newId);
      } else if (quickTrainerCtx?.type === "program") {
        toggleFormateurProgram(quickTrainerCtx.matiereKey, newId);
      }
      setQtResult({
        emailSent: !!data.emailSent,
        temporaryPassword: data.temporaryPassword as string | undefined,
      });
    } catch (e: any) {
      setQtError(e.message || "Erreur lors de la création.");
    } finally {
      setQtSaving(false);
    }
  };

  // ===================== VALIDATION =====================
  function validate(): string | null {
    if (!name.trim()) return "Le nom du programme est requis.";
    if (isDuplicateProgramName) {
      return `Un programme nommé « ${name.trim()} » existe déjà dans votre centre. Veuillez choisir un autre nom.`;
    }
    if (campuses.length > 0 && selectedCampusIds.length === 0) return "Sélectionnez au moins un campus pour ce programme.";
    if (type === "cursus") {
      if (!nbNiveaux || nbNiveaux < 1) return "Indique le nombre de niveaux.";
      for (const n of niveaux) {
        if (n.classes.length === 0) return `Le niveau ${n.numero} n'a aucune salle de classe. Créez-en au moins une.`;
        if (n.classes.some((c) => !c.nom.trim())) return `Le niveau ${n.numero} a une salle sans nom.`;
      }
    } else {
      if (pricingMode === "forfaitaire" && (!dureeValeur || dureeValeur < 1)) {
        return "Indique la durée de la formation (tarif forfaitaire).";
      }
      if (classesCourtes.length === 0) return "Ajoutez au moins une salle de classe.";
      if (classesCourtes.some((c) => !c.nom.trim())) return "Une salle de classe n'a pas de nom.";
    }
    return null;
  }

  /** Niveau technique unique (annee null) pour lier matières / salles / inscriptions courtes. */
  async function ensureShortPhantomNiveau(filiereId: string): Promise<string> {
    const dur =
      pricingMode === "forfaitaire"
        ? shortDureeToNiveauFields(dureeValeur, dureeUnite)
        : { mois: 0, semaines: 0, jours: 0 };

    const { data: existing } = await supabase
      .from("niveaux")
      .select("id")
      .eq("filiere_id", filiereId)
      .is("annee", null)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("niveaux").update(dur).eq("id", existing.id);
      return existing.id as string;
    }

    const { data: created, error } = await supabase
      .from("niveaux")
      .insert({ filiere_id: filiereId, annee: null, ...dur })
      .select("id")
      .single();
    if (error || !created) throw new Error(`Niveau programme : ${error?.message || "échec"}`);
    return created.id as string;
  }

  async function saveExistingProgram(filiereId: string) {
    // Formation courte + cursus uniforme : frais/échéancier sur filieres.payment_plan
    const filierePaymentPlan =
      type === "formation_courte" || (type === "cursus" && cursusFeeMode === "uniforme")
        ? formatPaymentPlan(shortFees, shortInstallments)
        : formatPaymentPlan([], []);

    const { error: e1 } = await supabase.from("filieres").update({
      name: name.trim(),
      description: description.trim() || null,
      default_tuition_fee: tuitionFee.trim() ? Number(tuitionFee) : null,
      nb_niveaux: type === "cursus" ? nbNiveaux : null,
      duree_valeur: type === "formation_courte" ? (pricingMode === "forfaitaire" ? dureeValeur : (dureeValeurStr.trim() ? dureeValeur : null)) : null,
      duree_unite: type === "formation_courte" ? dureeUnite : null,
      pricing_mode: type === "formation_courte" ? pricingMode : null,
      cursus_fee_mode: type === "cursus" ? cursusFeeMode : null,
      mode,
      payment_plan: filierePaymentPlan,
      head_trainer_id: headTrainerId || null,
    }).eq("id", filiereId);
    if (e1) throw new Error(`Programme : ${e1.message}`);

    const campusIds = selectedCampusIds.length > 0 ? selectedCampusIds : campuses.length === 1 ? [campuses[0].id] : [];
    await supabase.from("filiere_campus").delete().eq("filiere_id", filiereId);
    for (const campusId of campusIds) {
      const { error: fcErr } = await supabase.from("filiere_campus").insert({ filiere_id: filiereId, campus_id: campusId });
      if (fcErr) throw new Error(`Liaison campus : ${fcErr.message}`);
    }

    const createdDisciplines: Record<string, string> = {};

    async function resolveDisciplineId(m: MatiereDraft): Promise<string | null> {
      if (m.discipline_id) return m.discipline_id;
      if (!m.newDisciplineName.trim()) return null;
      const key = m.newDisciplineName.trim().toLowerCase();
      if (createdDisciplines[key]) return createdDisciplines[key];

      const { data: existingDisc } = await supabase
        .from("exam_disciplines")
        .select("id")
        .or(`is_builtin.eq.true,center_id.eq.${centerId || "00000000-0000-0000-0000-000000000000"}`)
        .ilike("name", m.newDisciplineName.trim())
        .limit(1)
        .maybeSingle();

      if (existingDisc?.id) {
        createdDisciplines[key] = existingDisc.id;
        return existingDisc.id;
      }

      const code = `${slugify(m.newDisciplineName)}_${Math.random().toString(36).slice(2, 6)}`;
      const { data: disc, error: discErr } = await supabase
        .from("exam_disciplines")
        .insert({ name: m.newDisciplineName.trim(), code, is_builtin: false, center_id: centerId })
        .select("id").single();
      if (discErr || !disc) throw new Error(`Matière « ${m.newDisciplineName.trim()} » : ${discErr?.message || "refus"}`);
      createdDisciplines[key] = disc.id;
      return disc.id;
    }

    async function saveMatiereRow(
      m: MatiereDraft,
      niveauId: string | null,
      annee: number,
      fmId?: string | null,
      initialFormateurIds?: string[],
    ) {
      const coeff = Number(m.coefficient) > 0 ? Number(m.coefficient) : 1;
      const maxScore = Number(m.max_score) > 0 ? Number(m.max_score) : 20;

      if (fmId) {
        const { error: metaErr } = await supabase
          .from("filiere_matieres")
          .update({ coefficient: coeff, max_score: maxScore })
          .eq("id", fmId);
        if (metaErr) throw new Error(`Barème / coeff. : ${metaErr.message}`);
        const initial = initialFormateurIds || [];
        const toAdd = m.formateurIds.filter((f) => !initial.includes(f));
        const toRemove = initial.filter((f) => !m.formateurIds.includes(f));
        for (const f of toAdd) {
          const { error } = await supabase.from("matiere_formateurs").insert({ filiere_matiere_id: fmId, formateur_id: f });
          if (error) throw new Error(`Habilitation : ${error.message}`);
        }
        for (const f of toRemove) {
          const { error } = await supabase.from("matiere_formateurs").delete().eq("filiere_matiere_id", fmId).eq("formateur_id", f);
          if (error) throw new Error(`Retrait formateur : ${error.message}`);
        }
        return fmId;
      }
      const disciplineId = await resolveDisciplineId(m);
      if (!disciplineId) return null;
      const { data: fm, error: fe } = await supabase
        .from("filiere_matieres")
        .insert({
          filiere_id: filiereId,
          discipline_id: disciplineId,
          niveau_id: niveauId,
          annee,
          obligatoire: true,
          coefficient: coeff,
          max_score: maxScore,
        })
        .select("id").single();
      if (fe || !fm) throw new Error(`Matière non enregistrée : ${fe?.message || "refus"}`);
      for (const f of m.formateurIds) {
        const { error } = await supabase.from("matiere_formateurs").insert({ filiere_matiere_id: fm.id, formateur_id: f });
        if (error) throw new Error(`Habilitation : ${error.message}`);
      }
      return fm.id as string;
    }

    async function saveClasses(list: ClasseDraft[], niveauId: string | null, attachFiliereId?: string | null) {
      for (const c of list) {
        if (!c.nom.trim()) continue;
        if (c.id) {
          // groupes_un_seul_parent : un seul de niveau_id / filiere_id
          const patch: Record<string, unknown> = { nom: c.nom.trim() };
          if (niveauId) {
            patch.niveau_id = niveauId;
            patch.filiere_id = null;
          } else if (attachFiliereId) {
            patch.filiere_id = attachFiliereId;
            patch.niveau_id = null;
          }
          const { error } = await supabase.from("groupes").update(patch).eq("id", c.id);
          if (error) throw new Error(`Classe : ${error.message}`);
        } else {
          const payload: Record<string, unknown> = niveauId
            ? {
                niveau_id: niveauId,
                nom: c.nom.trim(),
                created_by: userId,
              }
            : {
                filiere_id: attachFiliereId || filiereId,
                nom: c.nom.trim(),
                created_by: userId,
              };
          const { data: newGroupe, error } = await supabase.from("groupes").insert(payload).select("id").single();
          if (error || !newGroupe) throw new Error(`Classe « ${c.nom.trim()} » : ${error?.message || "refus"}`);
          await supabase.rpc("ensure_groupe_room", { p_groupe_id: newGroupe.id, p_center_id: centerId });
        }
      }
    }

    if (type === "cursus") {
      const keptNiveauIds: string[] = [];
      const keptClasseIds: string[] = [];
      const keptMatiereIds: string[] = [];
      const niveauIdByAnnee: Record<number, string> = {};

      for (const n of niveaux) {
        let niveauId = n.id ?? null;
        if (!niveauId) {
          const { data: nid, error } = await supabase.rpc("ensure_niveau", { p_filiere_id: filiereId, p_annee: n.numero });
          if (error || !nid) throw new Error(`Niveau ${n.numero} : ${error?.message || "échec"}`);
          niveauId = nid as string;
        }
        keptNiveauIds.push(niveauId);
        niveauIdByAnnee[n.numero] = niveauId;

        const { error: ne } = await supabase.from("niveaux").update({
          nom: n.nom?.trim() || null,
          tuition_fee: n.tuition_fee.trim() ? Number(n.tuition_fee) : null,
          payment_plan: formatPaymentPlan(n.fees, n.installments),
          seuil_passage: n.seuil_passage.trim() ? Number(n.seuil_passage) : null,
        }).eq("id", niveauId);
        if (ne) throw new Error(`Niveau ${n.numero} : ${ne.message}`);

        await saveClasses(n.classes, niveauId);
        n.classes.forEach((c) => c.id && keptClasseIds.push(c.id));
      }

      for (const m of matieresProgram) {
        for (const annee of m.niveauNumeros || []) {
          const niveauId = niveauIdByAnnee[annee];
          if (!niveauId) continue;
          const existing = m.existingByNiveau?.[annee];
          const savedId = await saveMatiereRow(m, niveauId, annee, existing?.fm_id ?? null, existing?.initialFormateurIds);
          if (savedId) keptMatiereIds.push(savedId);
        }
      }

      if (!editLocked) {
        for (const id of initialMatiereIds.filter((i) => !keptMatiereIds.includes(i))) {
          await supabase.from("filiere_matieres").delete().eq("id", id);
        }
        for (const id of initialClasseIds.filter((i) => !keptClasseIds.includes(i))) {
          await supabase.from("groupes").delete().eq("id", id);
        }
        for (const id of initialNiveauIds.filter((i) => !keptNiveauIds.includes(i))) {
          await supabase.from("filiere_matieres").delete().eq("niveau_id", id);
          await supabase.from("groupes").delete().eq("niveau_id", id);
          await supabase.from("niveaux").delete().eq("id", id);
        }
      }
    } else {
      const phantomNiveauId = await ensureShortPhantomNiveau(filiereId);
      const keptClasseIds: string[] = [];
      const keptMatiereIds: string[] = [];
      await saveClasses(classesCourtes, phantomNiveauId);
      for (const m of matieresCourtes) {
        const savedId = await saveMatiereRow(m, phantomNiveauId, 0, m.fm_id, m.initialFormateurIds);
        if (savedId) keptMatiereIds.push(savedId);
      }
      classesCourtes.forEach((c) => c.id && keptClasseIds.push(c.id));
      if (!editLocked) {
        for (const id of initialMatiereIds.filter((i) => !keptMatiereIds.includes(i))) {
          await supabase.from("filiere_matieres").delete().eq("id", id);
        }
        for (const id of initialClasseIds.filter((i) => !keptClasseIds.includes(i))) {
          await supabase.from("groupes").delete().eq("id", id);
        }
      }
    }
  }

  // ===================== SOUMISSION =====================
  async function handleSubmit() {
    const validationError = validate();
    if (validationError) { setErrorMsg(validationError); return; }
    if (!centerId || !userId) { setErrorMsg("Session invalide."); return; }

    setSaving(true);
    setErrorMsg("");
    try {
      if (isEditMode && editFiliereId) {
        await saveExistingProgram(editFiliereId);
        setCreated({ id: editFiliereId, name: name.trim(), updated: true });
      } else {
      const filierePaymentPlan =
        type === "formation_courte" || (type === "cursus" && cursusFeeMode === "uniforme")
          ? formatPaymentPlan(shortFees, shortInstallments)
          : formatPaymentPlan([], []);

      const { data: filiere, error: filErr } = await supabase
        .from("filieres")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          center_id: centerId,
          created_by: userId,
          type,
          mode,
          nb_niveaux: type === "cursus" ? nbNiveaux : null,
          duree_valeur: type === "formation_courte"
            ? (pricingMode === "forfaitaire" ? dureeValeur : (dureeValeurStr.trim() ? dureeValeur : null))
            : null,
          duree_unite: type === "formation_courte" ? dureeUnite : null,
          pricing_mode: type === "formation_courte" ? pricingMode : null,
          cursus_fee_mode: type === "cursus" ? cursusFeeMode : null,
          default_tuition_fee: tuitionFee.trim() ? Number(tuitionFee) : null,
          payment_plan: filierePaymentPlan,
          head_trainer_id: headTrainerId || null,
          status: "draft",
        })
        .select("id, name").single();

      if (filErr?.message?.includes("QUOTA_FILIERES_ATTEINT")) {
        throw new Error(`Limite de ton plan atteinte (${includedProgrammes} programme${includedProgrammes! > 1 ? "s" : ""} max).`);
      }
      if (filErr || !filiere) throw new Error(filErr?.message || "Création du programme échouée.");
      const filiereId = filiere.id;

      // Lier le programme aux campus sélectionnés
      const campusIds = selectedCampusIds.length > 0 ? selectedCampusIds : campuses.length === 1 ? [campuses[0].id] : [];
      for (const campusId of campusIds) {
        const { error: fcErr } = await supabase.from("filiere_campus").insert({ filiere_id: filiereId, campus_id: campusId });
        if (fcErr) throw new Error(`Liaison campus échouée : ${fcErr.message}`);
      }

      // Créer le forum du programme
      await supabase.rpc("ensure_programme_room", { p_filiere_id: filiereId, p_center_id: centerId });

      const createdDisciplines: Record<string, string> = {};

      async function resolveDisciplineId(m: MatiereDraft): Promise<string | null> {
        if (m.discipline_id) return m.discipline_id;
        if (!m.newDisciplineName.trim()) return null;
        const key = m.newDisciplineName.trim().toLowerCase();
        if (createdDisciplines[key]) return createdDisciplines[key];

        const { data: existingDisc } = await supabase
          .from("exam_disciplines")
          .select("id")
          .or(`is_builtin.eq.true,center_id.eq.${centerId || "00000000-0000-0000-0000-000000000000"}`)
          .ilike("name", m.newDisciplineName.trim())
          .limit(1)
          .maybeSingle();

        if (existingDisc?.id) {
          createdDisciplines[key] = existingDisc.id;
          return existingDisc.id;
        }

        const code = `${slugify(m.newDisciplineName)}_${Math.random().toString(36).slice(2, 6)}`;
        const { data: disc, error: discErr } = await supabase
          .from("exam_disciplines")
          .insert({ name: m.newDisciplineName.trim(), code, is_builtin: false, center_id: centerId })
          .select("id").single();
        if (discErr || !disc) throw new Error(`Matière « ${m.newDisciplineName.trim()} » : ${discErr?.message || "création refusée"}`);
        createdDisciplines[key] = disc.id;
        return disc.id;
      }

      async function saveMatiereAndFormateurs(
        disciplineId: string,
        niveauId: string | null,
        annee: number,
        formateurIds: string[],
        rawCoeff: number | string = 1,
        rawMaxScore: number | string = 20,
      ) {
        const coeff = Number(rawCoeff) > 0 ? Number(rawCoeff) : 1;
        const maxScore = Number(rawMaxScore) > 0 ? Number(rawMaxScore) : 20;
        const { data: fm, error: fmErr } = await supabase
          .from("filiere_matieres")
          .insert({
            filiere_id: filiereId,
            discipline_id: disciplineId,
            niveau_id: niveauId,
            annee,
            obligatoire: true,
            coefficient: coeff,
            max_score: maxScore,
          })
          .select("id").single();
        if (fmErr || !fm) throw new Error(`Matière non enregistrée : ${fmErr?.message || "insertion refusée"}`);
        for (const formateurId of formateurIds) {
          const { error: mfErr } = await supabase.from("matiere_formateurs").insert({ filiere_matiere_id: fm.id, formateur_id: formateurId });
          if (mfErr) throw new Error(`Habilitation formateur échouée : ${mfErr.message}`);
        }
      }

      if (type === "cursus") {
        const niveauIdByAnnee: Record<number, string> = {};
        for (const n of niveaux) {
          const { data: niveauId, error: nivErr } = await supabase.rpc("ensure_niveau", { p_filiere_id: filiereId, p_annee: n.numero });
          if (nivErr || !niveauId) throw new Error(`Niveau ${n.numero} non créé : ${nivErr?.message || "échec"}`);
          niveauIdByAnnee[n.numero] = niveauId as string;

          const { error: updateErr } = await supabase.from("niveaux").update({
            tuition_fee: n.tuition_fee.trim() ? Number(n.tuition_fee) : null,
            payment_plan: formatPaymentPlan(n.fees, n.installments),
            seuil_passage: n.seuil_passage.trim() ? Number(n.seuil_passage) : null,
          }).eq("id", niveauId);
          if (updateErr) throw new Error(`Paramètres du niveau ${n.numero} non enregistrés : ${updateErr.message}`);

          for (const classe of n.classes) {
            const classeNom = classe.nom.trim();
            const { data: newGroupe, error: gErr } = await supabase.from("groupes").insert({ niveau_id: niveauId, nom: classeNom, created_by: userId }).select("id").single();
            if (gErr || !newGroupe) throw new Error(`Salle « ${classeNom} » non créée : ${gErr?.message}`);
            await supabase.rpc("ensure_groupe_room", { p_groupe_id: newGroupe.id, p_center_id: centerId });
          }
        }

        for (const m of matieresProgram) {
          const disciplineId = await resolveDisciplineId(m);
          if (!disciplineId) continue;
          for (const annee of m.niveauNumeros || []) {
            const niveauId = niveauIdByAnnee[annee];
            if (!niveauId) continue;
            await saveMatiereAndFormateurs(
              disciplineId,
              niveauId,
              annee,
              m.formateurIds,
              m.coefficient,
              m.max_score,
            );
          }
        }
      } else {
        const phantomNiveauId = await ensureShortPhantomNiveau(filiereId);
        for (const classe of classesCourtes) {
          const classeNom = classe.nom.trim();
          if (!classeNom) continue;
          // groupes_un_seul_parent : rattacher au niveau fantôme uniquement (pas filiere_id en plus)
          const { data: newGroupe, error: gErr } = await supabase.from("groupes").insert({
            niveau_id: phantomNiveauId,
            nom: classeNom,
            created_by: userId,
          }).select("id").single();
          if (gErr || !newGroupe) throw new Error(`Salle « ${classeNom} » non créée : ${gErr?.message}`);
          await supabase.rpc("ensure_groupe_room", { p_groupe_id: newGroupe.id, p_center_id: centerId });
        }
        for (const m of matieresCourtes) {
          const disciplineId = await resolveDisciplineId(m);
          if (!disciplineId) continue;
          await saveMatiereAndFormateurs(
            disciplineId,
            phantomNiveauId,
            0,
            m.formateurIds,
            m.coefficient,
            m.max_score,
          );
        }
      }

      setCreated({ id: filiereId, name: name.trim() });
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  // ===================== PDF =====================
  const buildProgrammePdfData = useCallback((): ProgrammePdfData => {
    const modeLabels: Record<ModeEnseignement, string> = {
      presentiel: "Présentiel",
      en_ligne: "En ligne",
      hybride: "Hybride",
    };
    const campusNames = campuses
      .filter((c) => selectedCampusIds.includes(c.id))
      .map((c) => c.name);
    const directeur = staffMembers.find((s) => s.id === headTrainerId);
    const directeurLabel = directeur
      ? `${directeur.prenom}${directeur.nom ? ` ${directeur.nom}` : ""}`
      : "";

    const feeRows = (fees: FeeDraft[]) =>
      fees
        .filter((f) => f.label.trim() && parseAmount(f.montant) > 0)
        .map((f) => ({ label: f.label.trim(), montant: parseAmount(f.montant) }));
    const instRows = (list: PaymentInstallment[]) =>
      list
        .filter((i) => i.montant.trim() !== "")
        .map((i) => ({ montant: parseAmount(i.montant), jours: Number(i.jours || 0) }));

    const trainerLabel = (ids: string[]) =>
      ids
        .map((id) => {
          const t = trainers.find((x) => x.id === id);
          return t ? `${t.prenom}${t.nom ? ` ${t.nom}` : ""}` : null;
        })
        .filter(Boolean)
        .join(", ");

    const isCursus = type === "cursus";
    const isUniforme = isCursus && cursusFeeMode === "uniforme";
    const globalTuition = parseAmount(tuitionFee);
    const globalFees = (!isCursus || isUniforme) ? feeRows(shortFees) : [];
    const globalTotal = (!isCursus || isUniforme)
      ? parseAmount(computeTotal(tuitionFee, shortFees))
      : globalTuition;

    const niveauxPdf = isCursus
      ? (isUniforme
          ? [
              {
                label: "Programme (tarif uniforme)",
                tuition: globalTuition,
                fees: globalFees,
                total: globalTotal,
                totalWords: amountInWordsFr(globalTotal),
                installments: instRows(shortInstallments),
                classes: niveaux.flatMap((n) => n.classes.map((c) => c.nom.trim()).filter(Boolean)),
              },
            ]
          : niveaux.map((n) => {
              const tuition = parseAmount(n.tuition_fee.trim() ? n.tuition_fee : tuitionFee);
              const fees = feeRows(n.fees);
              const total = tuition + fees.reduce((a, f) => a + f.montant, 0);
              return {
                label: `Niveau ${n.numero}${n.nom ? ` — ${n.nom}` : ""}`,
                tuition,
                fees,
                total,
                totalWords: amountInWordsFr(total),
                installments: instRows(n.installments),
                classes: n.classes.map((c) => c.nom.trim()).filter(Boolean),
              };
            }))
      : [
          {
            label: "Programme",
            tuition: globalTuition,
            fees: globalFees,
            total: globalTotal,
            totalWords: amountInWordsFr(globalTotal),
            installments: instRows(shortInstallments),
            classes: classesCourtes.map((c) => c.nom.trim()).filter(Boolean),
          },
        ];

    const matieresSrc = isCursus ? matieresProgram : matieresCourtes;
    const matieres = matieresSrc.map((m) => ({
      name: matiereDisplayName(m),
      niveaux: isCursus
        ? (m.niveauNumeros || []).map((num) => `Niv. ${num}`).join(", ")
        : "Formation courte",
      formateurs: trainerLabel(m.formateurIds),
    }));

    return {
      name: (name.trim() || "Programme").toLocaleUpperCase("fr-FR"),
      description: description.trim(),
      typeLabel: isCursus ? "Cursus pluriannuel" : "Formation courte",
      modeLabel: modeLabels[mode],
      structureLabel: isCursus
        ? `${nbNiveaux} niveau${nbNiveaux > 1 ? "x" : ""}`
        : `${dureeValeur} ${dureeUnite}`,
      programId: editFiliereId || created?.id || null,
      campuses: campusNames,
      directeur: directeurLabel,
      globalTuition,
      globalFees,
      globalTotal,
      globalTotalWords: amountInWordsFr(globalTotal),
      globalInstallments: (!isCursus || isUniforme) ? instRows(shortInstallments) : [],
      niveaux: niveauxPdf,
      matieres,
      isCursus,
    };
  }, [
    campuses, selectedCampusIds, staffMembers, headTrainerId, type, cursusFeeMode, tuitionFee, shortFees,
    shortInstallments, niveaux, classesCourtes, matieresProgram, matieresCourtes, trainers,
    disciplines, name, description, mode, nbNiveaux, dureeValeur, dureeUnite, editFiliereId, created,
  ]);

  const handleDownloadPdf = async () => {
    if (!centerId) return;
    setPdfBusy(true);
    try {
      const cfg = await fetchDocumentExportConfig(supabase, centerId);
      await downloadProgrammePdf(buildProgrammePdfData(), cfg);
    } catch (e: any) {
      const msg = e.message || "Export PDF impossible.";
      setErrorMsg(msg);
      if (created) window.alert(msg);
    } finally {
      setPdfBusy(false);
    }
  };

  // ===================== RENDER =====================
  if (loading) return <CenterPageLoading className="bg-[#FFFBF7]" />;

  // --- Écran de succès ---
  if (created) {
    return (
      <div className={`${centerNotoSans.className} min-h-[100dvh] flex items-center justify-center p-6`} style={{ backgroundColor: PAGE_BG }}>
          <div className="max-w-xl w-full p-8 sm:p-10 rounded-2xl border border-black/[0.06] text-center" style={{ backgroundColor: SURFACE }}>
            <div className="flex justify-center mb-6"><CheckCircle2 size={52} className="text-emerald-500" /></div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 uppercase" style={{ color: BLUE }}>
              {created.updated
                ? `"${(created.name || "").toLocaleUpperCase("fr-FR")}" a été mis à jour`
                : `"${(created.name || "").toLocaleUpperCase("fr-FR")}" a été créé`}
            </h2>
            <p className="text-sm font-medium text-neutral-500 mb-8 leading-relaxed">
              {created.updated
                ? "Les modifications sont enregistrées. Publiez le programme s'il est encore en brouillon pour accueillir des inscriptions."
                : <>Le programme est en <span className="font-bold text-red-600">brouillon</span>. Ouvrez-le pour fixer les derniers détails et le <span className="font-bold" style={{ color: BLUE }}>publier</span> — il doit être publié pour accueillir des inscriptions.</>}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfBusy}
                className="px-5 h-11 rounded-lg text-sm font-semibold border border-black/[0.08] text-neutral-700 hover:bg-black/[0.03] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pdfBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Télécharger le PDF
              </button>
              <OutlineHeaderButton onClick={() => router.push("/centre/filieres")}>
                Voir mes programmes
              </OutlineHeaderButton>
            </div>
          </div>
      </div>
    );
  }

  const niveauActuel = niveaux.find((n) => n.numero === expandedNiveau);
  const shortTotal = computeTotal(tuitionFee, shortFees);
  const niveauTotal = niveauActuel
    ? computeTotal(niveauActuel.tuition_fee.trim() ? niveauActuel.tuition_fee : tuitionFee, niveauActuel.fees)
    : "0";

  // --- Étape 1 : choix du parcours (création uniquement) ---
  if (!isEditMode && uiStep === "parcours") {
    return (
      <div className={`${centerNotoSans.className} min-h-[100dvh]`} style={{ backgroundColor: PAGE_BG }}>
        <header className="sticky top-0 z-30 h-[68px] border-b border-black/[0.06] flex items-center gap-3 px-4 sm:px-6" style={{ backgroundColor: PAGE_BG }}>
          <button
            type="button"
            onClick={() => router.push("/centre/filieres")}
            className="h-9 w-9 rounded-lg border border-black/[0.08] text-neutral-600 hover:bg-black/[0.03] inline-flex items-center justify-center shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight truncate" style={{ color: BLUE }}>
            Nouveau programme
          </h1>
        </header>

        <div className="nexa-center-shell pt-8 sm:pt-12 pb-16 max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Étape 1 sur 2</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight mb-2" style={{ color: BLUE }}>
            Quel parcours proposez-vous ?
          </h2>
          <p className="text-base text-neutral-500 font-medium mb-8 max-w-xl leading-relaxed">
            Choisissez la structure du programme. Vous pourrez ensuite renseigner les informations générales, les tarifs et les matières.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {([
              {
                value: "cursus" as const,
                title: "Cursus pluriannuel",
                desc: "Plusieurs niveaux ou années, progression et passage de niveau.",
                icon: Layers,
              },
              {
                value: "formation_courte" as const,
                title: "Formation courte",
                desc: "Parcours court, durée catalogue, tarif forfaitaire ou mensuel.",
                icon: Clock,
              },
            ]).map(({ value, title, desc, icon: Icon }) => {
              const selected = type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`text-left rounded-xl border p-5 sm:p-6 transition-all ${
                    selected
                      ? "border-[#eb670e]/50 shadow-[0_0_0_1px_rgba(235,103,14,0.12)]"
                      : "border-black/[0.08] hover:border-black/[0.16]"
                  }`}
                  style={{ backgroundColor: selected ? "#FFF5EE" : SURFACE }}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center border border-black/[0.06]"
                      style={{ backgroundColor: selected ? "#FFE8D6" : PAGE_BG }}
                    >
                      <Icon size={20} style={{ color: selected ? ORANGE : BLUE }} />
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selected ? "border-[#eb670e]/70 bg-[#eb670e]" : "border-neutral-300"
                      }`}
                    >
                      {selected && <CheckCircle2 size={12} className="text-white" />}
                    </span>
                  </div>
                  <p className="text-lg font-extrabold tracking-tight mb-1.5" style={{ color: BLUE }}>{title}</p>
                  <p className="text-sm text-neutral-500 font-medium leading-relaxed">{desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <OutlineHeaderButton onClick={() => setUiStep("form")} className="h-11 px-5 text-sm">
              Continuer
              <span aria-hidden>→</span>
            </OutlineHeaderButton>
            <p className="text-sm text-neutral-400 font-medium">
              Sélection actuelle :{" "}
              <span className="font-semibold" style={{ color: BLUE }}>
                {type === "cursus" ? "Cursus pluriannuel" : "Formation courte"}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${centerNotoSans.className} h-[100dvh] flex flex-col overflow-hidden`} style={{ backgroundColor: PAGE_BG }}>
      <header className="shrink-0 h-[68px] border-b border-black/[0.06] flex items-center gap-3 px-4 sm:px-6 z-30" style={{ backgroundColor: PAGE_BG }}>
        <button
          type="button"
          onClick={() => {
            if (!isEditMode && uiStep === "form") setUiStep("parcours");
            else router.push("/centre/filieres");
          }}
          className="h-9 w-9 rounded-lg border border-black/[0.08] text-neutral-600 hover:bg-black/[0.03] inline-flex items-center justify-center shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          {!isEditMode && (
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400 leading-none mb-1">
              Étape 2 sur 2 · {type === "cursus" ? "Cursus" : "Formation courte"}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight truncate" style={{ color: BLUE }}>
            {isEditMode ? "Modifier le programme" : "Informations générales"}
          </h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-10">
      <div className="nexa-center-shell pt-6 sm:pt-8">
        {editLocked && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 p-3.5 mb-6" style={{ backgroundColor: SURFACE }}>
            <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 font-medium leading-relaxed">
              Des étudiants sont inscrits. Vous pouvez <b>ajouter et renommer</b>, mais pas <b>supprimer</b> de niveaux, salles ou matières déjà liées.
            </p>
          </div>
        )}
        {isQuotaReached && (
          <div className="rounded-xl border border-red-200 p-4 mb-6" style={{ backgroundColor: SURFACE }}>
            <p className="text-sm font-bold text-red-600">Limite de votre plan atteinte ({includedProgrammes} programme{includedProgrammes! > 1 ? "s" : ""} maximum).</p>
          </div>
        )}

        <ProgramSection icon={BookOpen} title="Informations générales" description="Nom, description, structure et mode d'enseignement.">
          <div>
            <label className={FIELD_LABEL}>Nom du programme *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Baccalauréat Scientifique"
              className={`${FIELD_INPUT} ${isDuplicateProgramName ? "border-red-400 focus:border-red-500 ring-2 ring-red-100" : ""}`}
            />
            {isDuplicateProgramName && (
              <p className="text-xs font-bold text-red-500 mt-1.5 flex items-center gap-1">
                ⚠️ Un programme nommé « {name.trim()} » existe déjà dans votre centre. Veuillez choisir un autre nom.
              </p>
            )}
          </div>
          <div>
            <label className={FIELD_LABEL}>ID programme</label>
            <input
              value={isEditMode && editFiliereId ? editFiliereId : "Généré à l'enregistrement"}
              disabled
              className="w-full h-12 px-4 rounded-lg border border-black/[0.06] bg-white/60 text-base font-mono text-neutral-500"
            />
          </div>
          <div>
            <label className={FIELD_LABEL}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Détails du programme..."
              className="w-full p-3.5 rounded-lg border border-black/[0.08] bg-white text-base font-semibold outline-none resize-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10"
            />
          </div>
          <div>
            <label className={FIELD_LABEL_INLINE}>
              <Clock size={15} /> Structure
              {isEditMode && (
                <span className="ml-1 text-sm font-medium text-neutral-400">
                  ({type === "cursus" ? "Cursus pluriannuel" : "Formation courte"} — non modifiable)
                </span>
              )}
            </label>
            {type === "cursus" ? (
              <div>
                <label className={FIELD_LABEL}>Nombre de niveaux / années</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={nbNiveauxStr}
                  onChange={(e) => setNbNiveauxStr(e.target.value.replace(/[^0-9]/g, ""))}
                  className={`${FIELD_INPUT_SM} w-32 text-center`}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={FIELD_LABEL}>
                    Durée catalogue{pricingMode === "mensuel" ? " (indicative)" : " *"}
                  </label>
                  <div className="flex gap-3 items-end flex-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={dureeValeurStr}
                      onChange={(e) => setDureeValeurStr(e.target.value.replace(/[^0-9]/g, ""))}
                      className={`${FIELD_INPUT_SM} w-24 text-center`}
                    />
                    <div className="flex gap-1.5">
                      {(["jours", "semaines", "mois"] as DureeUnite[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setDureeUnite(u)}
                          className={`h-12 px-4 rounded-lg border text-sm font-semibold capitalize ${
                            dureeUnite === u
                              ? "border-[#11224E] text-[#11224E] bg-white"
                              : "border-black/[0.08] text-neutral-500 bg-white/70"
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  {pricingMode === "mensuel" && (
                    <p className={FIELD_HINT}>
                      En tarif mensuel, la durée facturée se choisit à chaque inscription (en mois).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <h3 className={FIELD_LABEL_INLINE}>
              <Monitor size={15} /> Mode d&apos;enseignement
            </h3>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: "presentiel" as const, label: "Présentiel", icon: Users },
                { value: "en_ligne" as const, label: "En ligne", icon: Monitor },
                { value: "hybride" as const, label: "Hybride", icon: GitBranch },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex items-center gap-2 px-4 h-12 rounded-lg border text-sm font-semibold ${
                    mode === value
                      ? "border-[#11224E] text-[#11224E] bg-white"
                      : "border-black/[0.08] text-neutral-500 bg-white/70"
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
        </ProgramSection>

        <ProgramSection icon={MapPin} title="Campus et directeur" description="Où le programme est enseigné, et qui le pilote (optionnel).">
          {campuses.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {campuses.map((c) => {
                const selected = selectedCampusIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCampus(c.id)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-left ${
                      selected ? "border-[#11224E] bg-white" : "border-black/[0.08] bg-white/70"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selected ? "bg-[#11224E] border-[#11224E]" : "border-neutral-300"}`}>
                      {selected && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: BLUE }}>{c.name}</p>
                      {c.city && <p className="text-sm font-medium text-neutral-400">{c.city}{c.is_main ? " · Principal" : ""}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400 font-medium">Aucun campus actif — configurez-en un dans Paramètres.</p>
          )}
          <div>
            <label className={FIELD_LABEL_INLINE}>
              <Shield size={15} /> Directeur de programme
              <span className="font-medium text-neutral-400">— optionnel</span>
            </label>
            <select value={headTrainerId} onChange={(e) => setHeadTrainerId(e.target.value)} className={FIELD_SELECT}>
              <option value="">Aucun directeur assigné</option>
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>{s.prenom}{s.nom ? ` ${s.nom}` : ""} — {s.role === "center_manager" ? "Responsable" : s.role === "trainer" ? "Formateur" : "Staff"}</option>
              ))}
            </select>
          </div>
        </ProgramSection>

        {type === "cursus" && (
          <ProgramSection
            icon={Gauge}
            title="Seuil de passage"
            description="Moyenne minimale (/20) pour passer au niveau suivant. Configurable par niveau."
          >
            <div className="flex gap-1.5 flex-wrap mb-4">
              {niveaux.map((n) => (
                <button
                  key={n.numero}
                  type="button"
                  onClick={() => setExpandedNiveau(n.numero)}
                  className={`px-4 h-11 rounded-lg text-sm font-semibold ${
                    expandedNiveau === n.numero ? "text-white" : "bg-white text-neutral-600 border border-black/[0.08]"
                  }`}
                  style={expandedNiveau === n.numero ? { backgroundColor: BLUE } : undefined}
                >
                  Niveau {n.numero}
                </button>
              ))}
            </div>
            {niveauActuel && (
              <div>
                <label className={FIELD_LABEL}>
                  Seuil de passage — Niveau {niveauActuel.numero} (/20)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={niveauActuel.seuil_passage}
                  onChange={(e) => updateNiveau(niveauActuel.numero, { seuil_passage: e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".") })}
                  placeholder="Ex. 10"
                  className={`${FIELD_INPUT_SM} w-40`}
                />
                <p className={FIELD_HINT}>Vide = décision 100 % manuelle à la fin d&apos;année.</p>
              </div>
            )}
          </ProgramSection>
        )}

        <ProgramSection icon={Tag} title="Tarification" description="Prix de formation, frais supplémentaires intitulés, total et échéancier.">
          {type === "formation_courte" ? (
            <>
              <div>
                <label className={FIELD_LABEL}>Mode de tarification</label>
                <div className="flex p-1 rounded-lg bg-white border border-black/[0.08] mb-1 gap-1 max-w-md">
                  <button
                    type="button"
                    onClick={() => setPricingMode("forfaitaire")}
                    className={`flex-1 py-2.5 px-3 rounded-md text-sm font-semibold ${pricingMode === "forfaitaire" ? "bg-[#11224E] text-white" : "text-neutral-500"}`}
                  >
                    Forfaitaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode("mensuel")}
                    className={`flex-1 py-2.5 px-3 rounded-md text-sm font-semibold ${pricingMode === "mensuel" ? "bg-[#11224E] text-white" : "text-neutral-500"}`}
                  >
                    Mensuelle
                  </button>
                </div>
                <p className={FIELD_HINT}>
                  {pricingMode === "mensuel"
                    ? "Prix par mois × durée choisie à l'inscription (mois entiers)."
                    : "Montant unique pour tout le programme, durée fixe."}
                </p>
              </div>
              <PriceBlock
                value={tuitionFee}
                onChange={(v) => {
                  setTuitionFee(v);
                  if (shortInstallmentsLocked && sumInstallments(shortInstallments) > parseAmount(computeTotal(v, shortFees))) {
                    setShortInstallmentsLocked(false);
                  }
                }}
                locked={priceLocked}
                onLock={() => setPriceLocked(true)}
                onUnlock={() => setPriceLocked(false)}
                label={pricingMode === "mensuel" ? "Prix par mois" : "Prix total du programme"}
              />
              <FeesBlock
                fees={shortFees}
                onAdd={addShortFee}
                onUpdate={updateShortFee}
                onRemove={removeShortFee}
                locked={shortFeesLocked}
                onLock={lockShortFees}
                onUnlock={() => setShortFeesLocked(false)}
              />
              <TotalDisplay
                total={shortTotal}
                label={pricingMode === "mensuel" ? "Total catalogue (1 mois + frais)" : undefined}
              />
              {pricingMode === "mensuel" && (
                <p className="text-sm text-neutral-400 font-medium -mt-2">
                  À l&apos;inscription : total = prix/mois × nombre de mois (+ frais).
                </p>
              )}
              <InstallmentsBlock
                installments={shortInstallments}
                totalPrice={shortTotal}
                locked={shortInstallmentsLocked}
                onLock={() => setShortInstallmentsLocked(true)}
                onUnlock={() => setShortInstallmentsLocked(false)}
                onAdd={addShortInstallment}
                onUpdate={updateShortInstallment}
                onRemove={removeShortInstallment}
                label="Plan de paiement"
              />
            </>
          ) : (
            <>
              <div>
                <label className={FIELD_LABEL}>Mode de tarification cursus</label>
                <div className="flex p-1 rounded-lg bg-white border border-black/[0.08] mb-1 gap-1 max-w-md">
                  <button
                    type="button"
                    onClick={() => setCursusFeeMode("par_niveau")}
                    className={`flex-1 py-2.5 px-3 rounded-md text-sm font-semibold ${cursusFeeMode === "par_niveau" ? "bg-[#11224E] text-white" : "text-neutral-500"}`}
                  >
                    Par niveau
                  </button>
                  <button
                    type="button"
                    onClick={() => setCursusFeeMode("uniforme")}
                    className={`flex-1 py-2.5 px-3 rounded-md text-sm font-semibold ${cursusFeeMode === "uniforme" ? "bg-[#11224E] text-white" : "text-neutral-500"}`}
                  >
                    Uniforme
                  </button>
                </div>
                <p className={FIELD_HINT}>
                  {cursusFeeMode === "uniforme"
                    ? "Le prix global s'applique à chaque inscription, quel que soit le niveau."
                    : "Le prix du niveau est prioritaire ; sinon héritage du prix global."}
                </p>
              </div>
              <PriceBlock
                value={tuitionFee}
                onChange={(v) => {
                  setTuitionFee(v);
                  if (cursusFeeMode === "uniforme" && shortInstallmentsLocked && sumInstallments(shortInstallments) > parseAmount(computeTotal(v, shortFees))) {
                    setShortInstallmentsLocked(false);
                  }
                }}
                locked={priceLocked}
                onLock={() => setPriceLocked(true)}
                onUnlock={() => setPriceLocked(false)}
                label={cursusFeeMode === "uniforme" ? "Prix uniforme du programme" : "Prix de référence global (indicatif)"}
              />
              {cursusFeeMode === "uniforme" && (
                <>
                  <FeesBlock
                    fees={shortFees}
                    onAdd={addShortFee}
                    onUpdate={updateShortFee}
                    onRemove={removeShortFee}
                    locked={shortFeesLocked}
                    onLock={lockShortFees}
                    onUnlock={() => setShortFeesLocked(false)}
                    label="Frais supplémentaires du programme"
                  />
                  <TotalDisplay total={shortTotal} label="Total par inscription" />
                  <InstallmentsBlock
                    installments={shortInstallments}
                    totalPrice={shortTotal}
                    locked={shortInstallmentsLocked}
                    onLock={() => setShortInstallmentsLocked(true)}
                    onUnlock={() => setShortInstallmentsLocked(false)}
                    onAdd={addShortInstallment}
                    onUpdate={updateShortInstallment}
                    onRemove={removeShortInstallment}
                    label="Échéancier du programme"
                  />
                </>
              )}
              {cursusFeeMode === "par_niveau" && (
                <p className="text-sm text-neutral-400 -mt-2">Fixez le vrai prix, les frais et l&apos;échéancier dans chaque niveau ci-dessous.</p>
              )}
              {cursusFeeMode === "par_niveau" && (
              <div className="flex gap-1.5 flex-wrap">
                {niveaux.map((n) => (
                  <button
                    key={n.numero}
                    type="button"
                    onClick={() => setExpandedNiveau(n.numero)}
                    className={`px-4 h-11 rounded-lg text-sm font-semibold ${expandedNiveau === n.numero ? "text-white" : "bg-white text-neutral-600 border border-black/[0.08]"}`}
                    style={expandedNiveau === n.numero ? { backgroundColor: BLUE } : undefined}
                  >
                    Niveau {n.numero}
                  </button>
                ))}
              </div>
              )}
              {cursusFeeMode === "par_niveau" && niveauActuel && (
                <div className="space-y-4 pt-2 border-t border-black/[0.06]">
                  <p className="text-sm font-semibold text-neutral-600">Tarification — Niveau {niveauActuel.numero}</p>
                  <PriceBlock
                    value={niveauActuel.tuition_fee}
                    onChange={(v) => {
                      const patch: Partial<NiveauDraft> = { tuition_fee: v };
                      if (niveauActuel.installmentsLocked && sumInstallments(niveauActuel.installments) > parseAmount(computeTotal(v, niveauActuel.fees))) {
                        patch.installmentsLocked = false;
                      }
                      updateNiveau(niveauActuel.numero, patch);
                    }}
                    locked={niveauActuel.priceLocked}
                    onLock={() => updateNiveau(niveauActuel.numero, { priceLocked: true })}
                    onUnlock={() => updateNiveau(niveauActuel.numero, { priceLocked: false })}
                    placeholder={tuitionFee || "Hérite du prix global"}
                    label={`Prix formation — niveau ${niveauActuel.numero}`}
                  />
                  <FeesBlock
                    fees={niveauActuel.fees}
                    onAdd={() => addNiveauFee(niveauActuel.numero)}
                    onUpdate={(id, key, val) => updateNiveauFee(niveauActuel.numero, id, key, val)}
                    onRemove={(id) => removeNiveauFee(niveauActuel.numero, id)}
                    locked={niveauActuel.feesLocked}
                    onLock={() => lockNiveauFees(niveauActuel.numero)}
                    onUnlock={() => updateNiveau(niveauActuel.numero, { feesLocked: false })}
                    label={`Frais supplémentaires — niveau ${niveauActuel.numero}`}
                  />
                  <TotalDisplay total={niveauTotal} label={`Total niveau ${niveauActuel.numero}`} />
                  <InstallmentsBlock
                    installments={niveauActuel.installments}
                    totalPrice={niveauTotal}
                    locked={niveauActuel.installmentsLocked}
                    onLock={() => updateNiveau(niveauActuel.numero, { installmentsLocked: true })}
                    onUnlock={() => updateNiveau(niveauActuel.numero, { installmentsLocked: false })}
                    onAdd={(prefill) => addNiveauInstallment(niveauActuel.numero, prefill)}
                    onUpdate={(id, key, val) => updateNiveauInstallment(niveauActuel.numero, id, key, val)}
                    onRemove={(id) => removeNiveauInstallment(niveauActuel.numero, id)}
                    label={`Échéancier — niveau ${niveauActuel.numero}`}
                  />
                </div>
              )}
            </>
          )}
        </ProgramSection>

        <ProgramSection icon={Layers} title="Salles de classe" description="Indiquez le nombre de salles, puis donnez-leur un nom.">
          {type === "cursus" ? (
            <>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {niveaux.map((n) => (
                  <button key={n.numero} type="button" onClick={() => setExpandedNiveau(n.numero)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase ${expandedNiveau === n.numero ? "text-white" : "bg-neutral-100 text-neutral-500"}`} style={expandedNiveau === n.numero ? { backgroundColor: BLUE } : {}}>
                    Niveau {n.numero}
                    {n.classes.length === 0 && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-amber-400 align-middle" />}
                  </button>
                ))}
              </div>
              {niveauActuel && (
                <ClassroomsBlock
                  classes={niveauActuel.classes}
                  onSetCount={(n) => setClassesCountNiveau(niveauActuel.numero, n)}
                  onRename={(idx, val) => renameClasse(niveauActuel.numero, idx, val)}
                  editLocked={editLocked}
                  niveauLabel={`Niveau ${niveauActuel.numero}`}
                />
              )}
            </>
          ) : (
            <ClassroomsBlock
              classes={classesCourtes}
              onSetCount={setClassesCourtesCount}
              onRename={renameClasseCourte}
              editLocked={editLocked}
            />
          )}
        </ProgramSection>

        <ProgramSection icon={BookOpen} title="Matières du programme" description="Validez une matière à la fois pour alléger l'écran. Formateurs optionnels — complétez dans Staff.">
          {type === "cursus" ? (
            <>
              {matieresProgram.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {matieresProgram.map((m) => (
                    <li key={m.key} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate" style={{ color: BLUE }}>{matiereDisplayName(m)}</p>
                        <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                          Niv. {(m.niveauNumeros || []).join(", ") || "—"}
                          {` · /${m.max_score || 20} · ×${m.coefficient || 1}`}
                          {m.formateurIds.length > 0 ? ` · ${m.formateurIds.length} formateur${m.formateurIds.length > 1 ? "s" : ""}` : " · formateur optionnel"}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button type="button" onClick={() => editMatiereProgram(m.key!)} disabled={!!draftMatiereProgram} className="h-9 px-2.5 rounded-lg border border-neutral-200 text-[10px] font-black uppercase text-neutral-500 disabled:opacity-40">Modifier</button>
                        <button type="button" onClick={() => removeMatiereProgram(m.key!)} className="w-9 h-9 flex items-center justify-center text-red-500 bg-red-50 rounded-lg border border-red-100"><Trash2 size={14} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {draftMatiereProgram ? (
                <div className="bg-white border-2 border-orange-200/80 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: ORANGE }}>Nouvelle matière</p>
                  <select
                    value={draftMatiereProgram.discipline_id}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      updateMatiereProgram(draftMatiereProgram.key!, { discipline_id: e.target.value, newDisciplineName: "" });
                    }}
                    className={FIELD_INPUT}
                  >
                    <option value="" disabled>Choisir une matière existante…</option>
                    {disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => updateMatiereProgram(draftMatiereProgram.key!, { discipline_id: "", newDisciplineName: "" })}
                    className={`w-full h-11 rounded-xl border flex items-center justify-center gap-1.5 text-[10px] font-black uppercase transition-colors ${
                      !draftMatiereProgram.discipline_id
                        ? "border-orange-300 bg-orange-50"
                        : "border-dashed border-orange-200 hover:bg-orange-50"
                    }`}
                    style={{ color: ORANGE }}
                  >
                    <Plus size={14} /> Créer une nouvelle matière
                  </button>
                  {!draftMatiereProgram.discipline_id && (
                    <div>
                      <input
                        value={draftMatiereProgram.newDisciplineName}
                        onChange={(e) => updateMatiereProgram(draftMatiereProgram.key!, { newDisciplineName: e.target.value })}
                        placeholder="Intitulé de la matière..."
                        className={FIELD_INPUT}
                      />
                      {(() => {
                        const raw = draftMatiereProgram.newDisciplineName.trim().toLowerCase();
                        if (!raw) return null;
                        const match = disciplines.find((d) => d.name.trim().toLowerCase() === raw);
                        if (match) {
                          return (
                            <button
                              type="button"
                              onClick={() => updateMatiereProgram(draftMatiereProgram.key!, { discipline_id: match.id, newDisciplineName: "" })}
                              className="mt-1.5 w-full text-left text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-lg border border-blue-200 flex items-center justify-between transition-colors"
                            >
                              <span>💡 La matière « <b>{match.name}</b> » existe déjà.</span>
                              <span className="underline shrink-0">Sélectionner</span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-black uppercase text-neutral-400 mb-2">Niveaux concernés</p>
                    <div className="flex flex-wrap gap-2">
                      {niveaux.map((n) => {
                        const checked = (draftMatiereProgram.niveauNumeros || []).includes(n.numero);
                        return (
                          <button
                            key={n.numero}
                            type="button"
                            onClick={() => toggleMatiereNiveau(draftMatiereProgram.key!, n.numero)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border ${checked ? "text-white border-transparent" : "bg-white border-neutral-200 text-neutral-500"}`}
                            style={checked ? { backgroundColor: BLUE } : {}}
                          >
                            Niv. {n.numero}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={FIELD_LABEL}>Barème (sur)</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={draftMatiereProgram.max_score === 0 ? "" : (draftMatiereProgram.max_score ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          updateMatiereProgram(draftMatiereProgram.key!, { max_score: raw === "" ? "" : Number(raw) });
                        }}
                        placeholder="20"
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <p className={FIELD_LABEL}>Coefficient</p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draftMatiereProgram.coefficient === 0 ? "" : (draftMatiereProgram.coefficient ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                          updateMatiereProgram(draftMatiereProgram.key!, { coefficient: raw === "" ? "" : (parseFloat(raw) || (raw as any)) });
                        }}
                        placeholder="1"
                        className={FIELD_INPUT}
                      />
                    </div>
                  </div>
                  <FormateursBlock
                    trainers={trainers}
                    matiereData={draftMatiereProgram}
                    onToggle={(id) => toggleFormateurProgram(draftMatiereProgram.key!, id)}
                    onOpenQuickCreate={() => openQuickTrainer({ type: "program", matiereKey: draftMatiereProgram.key! })}
                  />
                  {matiereDraftError && <p className="text-[11px] font-bold text-red-500">{matiereDraftError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelDraftMatiereProgram} className="flex-1 h-11 rounded-xl border border-neutral-200 text-[10px] font-black uppercase text-neutral-500">Annuler</button>
                    <button type="button" onClick={confirmDraftMatiereProgram} className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase text-white" style={{ backgroundColor: BLUE }}>
                      <CheckCircle2 size={14} className="inline mr-1" /> Valider la matière
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setDraftMatiereProgram(defaultMatiere()); setDraftProgramIsEdit(false); setMatiereDraftError(""); }} className="w-full h-11 rounded-xl border border-dashed border-orange-200 hover:bg-orange-50 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase" style={{ color: ORANGE }}>
                  <Plus size={14} /> Ajouter une matière
                </button>
              )}
            </>
          ) : (
            <>
              {matieresCourtes.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {matieresCourtes.map((m) => (
                    <li key={m.key} className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate" style={{ color: BLUE }}>{matiereDisplayName(m)}</p>
                        <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                          {`/${m.max_score || 20} · ×${m.coefficient || 1}`}
                          {m.formateurIds.length > 0 ? ` · ${m.formateurIds.length} formateur${m.formateurIds.length > 1 ? "s" : ""}` : " · Formateur optionnel"}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button type="button" onClick={() => editMatiereCourteRow(m.key!)} disabled={!!draftMatiereCourte} className="h-9 px-2.5 rounded-lg border border-neutral-200 text-[10px] font-black uppercase text-neutral-500 disabled:opacity-40">Modifier</button>
                        <button type="button" onClick={() => removeMatiereCourteByKey(m.key!)} className="w-9 h-9 flex items-center justify-center text-red-500 bg-red-50 rounded-lg border border-red-100"><Trash2 size={14} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {draftMatiereCourte ? (
                <div className="bg-white border-2 border-orange-200/80 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: ORANGE }}>Nouvelle matière</p>
                  <select
                    value={draftMatiereCourte.discipline_id}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      updateMatiereCourteDraft({ discipline_id: e.target.value, newDisciplineName: "" });
                    }}
                    className={FIELD_INPUT}
                  >
                    <option value="" disabled>Choisir une matière existante…</option>
                    {disciplines.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => updateMatiereCourteDraft({ discipline_id: "", newDisciplineName: "" })}
                    className={`w-full h-11 rounded-xl border flex items-center justify-center gap-1.5 text-[10px] font-black uppercase transition-colors ${
                      !draftMatiereCourte.discipline_id
                        ? "border-orange-300 bg-orange-50"
                        : "border-dashed border-orange-200 hover:bg-orange-50"
                    }`}
                    style={{ color: ORANGE }}
                  >
                    <Plus size={14} /> Créer une nouvelle matière
                  </button>
                  {!draftMatiereCourte.discipline_id && (
                    <div>
                      <input
                        value={draftMatiereCourte.newDisciplineName}
                        onChange={(e) => updateMatiereCourteDraft({ newDisciplineName: e.target.value })}
                        placeholder="Intitulé de la matière..."
                        className={FIELD_INPUT}
                      />
                      {(() => {
                        const raw = draftMatiereCourte.newDisciplineName.trim().toLowerCase();
                        if (!raw) return null;
                        const match = disciplines.find((d) => d.name.trim().toLowerCase() === raw);
                        if (match) {
                          return (
                            <button
                              type="button"
                              onClick={() => updateMatiereCourteDraft({ discipline_id: match.id, newDisciplineName: "" })}
                              className="mt-1.5 w-full text-left text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-lg border border-blue-200 flex items-center justify-between transition-colors"
                            >
                              <span>💡 La matière « <b>{match.name}</b> » existe déjà.</span>
                              <span className="underline shrink-0">Sélectionner</span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={FIELD_LABEL}>Barème (sur)</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={draftMatiereCourte.max_score === 0 ? "" : (draftMatiereCourte.max_score ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          updateMatiereCourteDraft({ max_score: raw === "" ? "" : Number(raw) });
                        }}
                        placeholder="20"
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <p className={FIELD_LABEL}>Coefficient</p>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={draftMatiereCourte.coefficient === 0 ? "" : (draftMatiereCourte.coefficient ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
                          updateMatiereCourteDraft({ coefficient: raw === "" ? "" : (parseFloat(raw) || (raw as any)) });
                        }}
                        placeholder="1"
                        className={FIELD_INPUT}
                      />
                    </div>
                  </div>
                  <FormateursBlock
                    trainers={trainers}
                    matiereData={draftMatiereCourte}
                    onToggle={toggleFormateurCourteDraft}
                    onOpenQuickCreate={() => openQuickTrainer({ type: "courte-draft" })}
                  />
                  {matiereDraftError && <p className="text-[11px] font-bold text-red-500">{matiereDraftError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelDraftMatiereCourte} className="flex-1 h-11 rounded-xl border border-neutral-200 text-[10px] font-black uppercase text-neutral-500">Annuler</button>
                    <button type="button" onClick={confirmDraftMatiereCourte} className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase text-white" style={{ backgroundColor: BLUE }}>
                      <CheckCircle2 size={14} className="inline mr-1" /> Valider la matière
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setDraftMatiereCourte(defaultMatiere()); setDraftCourteIsEdit(false); setMatiereDraftError(""); }} className="w-full h-11 rounded-xl border border-dashed border-orange-200 hover:bg-orange-50 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase" style={{ color: ORANGE }}>
                  <Plus size={14} /> Ajouter une matière
                </button>
              )}
            </>
          )}
        </ProgramSection>

        {errorMsg && <p className="text-xs font-black text-red-500 bg-red-50 border border-red-200 p-3 rounded-xl mb-4">{errorMsg}</p>}

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy || !name.trim()}
            className="sm:w-auto h-14 px-5 flex items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-neutral-200 bg-white text-neutral-700 disabled:opacity-50"
          >
            {pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Aperçu PDF
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || isQuotaReached} className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-md disabled:opacity-50" style={{ backgroundColor: BLUE }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : isEditMode ? <CheckCircle2 size={16} /> : <Plus size={16} />}{" "}
            {isEditMode ? "Enregistrer les modifications" : "Enregistrer et créer le programme"}
          </button>
        </div>
      </div>
      </div>

      {/* ══════════════════ MODAL : CRÉATION RAPIDE FORMATEUR ══════════════════ */}
      {quickTrainerCtx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !qtSaving && setQuickTrainerCtx(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border p-6" onClick={(e) => e.stopPropagation()}>
            {qtResult ? (
              <div className="text-center py-2">
                <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-3" />
                <h3 className="text-sm font-black mb-2" style={{ color: BLUE }}>Formateur créé</h3>
                <p className="text-[11px] text-neutral-500 font-medium mb-3">
                  Il est sélectionné sur la matière. Complétez son profil dans <b>Staff</b>.
                </p>
                {qtResult.emailSent ? (
                  <p className="text-[11px] text-emerald-700 font-bold mb-4">Accès envoyés par email.</p>
                ) : qtResult.temporaryPassword ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left mb-4">
                    <p className="text-[10px] font-bold text-amber-700 mb-1">Mot de passe temporaire :</p>
                    <p className="font-mono font-black text-xs bg-white border rounded-lg p-2">{qtResult.temporaryPassword}</p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setQuickTrainerCtx(null)}
                  className="w-full h-11 rounded-xl text-xs font-black uppercase text-white"
                  style={{ backgroundColor: BLUE }}
                >
                  Continuer
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black flex items-center gap-2" style={{ color: BLUE }}><UserPlus size={18} style={{ color: ORANGE }} /> Créer un formateur</h3>
                  <button type="button" onClick={() => setQuickTrainerCtx(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"><X size={16} /></button>
                </div>
                <p className="text-[11px] text-neutral-400 mb-4 font-medium">Création sommaire — complétez le profil ensuite dans Staff.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Prénom *</label>
                    <input value={qtPrenom} onChange={(e) => setQtPrenom(e.target.value)} placeholder="Prénom" className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Nom *</label>
                    <input value={qtNom} onChange={(e) => setQtNom(e.target.value)} placeholder="Nom de famille" className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1 flex items-center gap-1"><Mail size={10} /> Email *</label>
                    <input type="email" value={qtEmail} onChange={(e) => setQtEmail(e.target.value)} placeholder="email@exemple.com" className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1 flex items-center gap-1"><Phone size={10} /> Téléphone</label>
                    <input type="tel" value={qtPhone} onChange={(e) => setQtPhone(e.target.value)} placeholder="+237..." className="w-full h-11 px-3 rounded-xl border bg-neutral-50 text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>
                {qtError && <p className="text-[11px] font-bold text-red-500 mt-3">{qtError}</p>}
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setQuickTrainerCtx(null)} className="flex-1 h-11 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-wider text-neutral-500 hover:bg-neutral-50 transition-colors">Annuler</button>
                  <button type="button" onClick={submitQuickTrainer} disabled={qtSaving} className="flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: ORANGE }}>
                    {qtSaving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Créer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}