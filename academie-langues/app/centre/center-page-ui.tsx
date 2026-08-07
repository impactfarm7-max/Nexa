"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { Noto_Sans } from "next/font/google";
import { Search } from "lucide-react";
import { BRAND } from "@/app/utils/brand";
import { useI18n } from "@/app/i18n/I18nProvider";

/** UI Google-class — aligné page Programmes */
export const centerNotoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const BLUE = "#11224E";
export const ORANGE = "#eb670e";
/** Fond pages centre = même crème que la sidebar */
export const PAGE_BG = BRAND.bg;
/** Surfaces secondaires (inputs, pastilles) — léger contraste sur PAGE_BG */
export const SURFACE = "#F7F7F6";

/**
 * Logo / pictogramme carré bordure bleue — motif partagé sidebar + headers pages.
 * Carré (pas pill) : rounded-lg + filet bleu NEXA.
 */
export function CenterBrandMark({
  src,
  alt = "",
  icon: Icon,
  size = 36,
  className = "",
}: {
  src?: string | null;
  alt?: string;
  icon?: ElementType;
  size?: number;
  className?: string;
}) {
  const dim = `${size}px`;
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-lg flex items-center justify-center bg-white ${className}`}
      style={{
        width: dim,
        height: dim,
        border: `1.5px solid ${BLUE}`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : Icon ? (
        <Icon size={Math.round(size * 0.45)} style={{ color: BLUE }} strokeWidth={1.75} />
      ) : (
        <span className="text-[11px] font-extrabold" style={{ color: BLUE }}>N</span>
      )}
    </div>
  );
}

/**
 * Échelle typo centre (convention dashboard) — tailles en px :
 * H0 16 · H1 14 · label gris 12 · chiffres = KPIs Finances (16 / 18)
 */
export const CENTER_TYPE = {
  /** Titre principal de page (ex. « Bonjour, Marie ») */
  h0: "text-[16px] font-extrabold tracking-tight leading-tight",
  /** Nom de rubrique (ex. « Finances », « Cours · cette semaine ») */
  h1: "text-[14px] font-extrabold tracking-tight leading-tight",
  /** Libellé gris (ex. « C.A. attendu ») */
  label: "text-[12px] font-medium leading-snug text-neutral-500",
  /** Chiffre / KPI — aligné FinanceKpiCard (text-base → sm:text-lg) */
  figure: "text-base sm:text-lg font-extrabold tracking-tight tabular-nums leading-none",
  /** Texte secondaire / sous-libellé */
  muted: "text-[12px] font-medium leading-snug text-neutral-400",
} as const;

const outlineBtn =
  "flex h-9 sm:h-10 items-center justify-center gap-2 rounded-lg bg-transparent px-3.5 sm:px-4 text-xs font-semibold tracking-wide shrink-0 transition-all duration-200 hover:bg-[#11224E]/[0.04] active:scale-[0.98]";

/** Shell : header fixe 68px + scroll contenu — fond = sidebar */
export function CenterPageLayout({
  header,
  children,
  className = "",
}: {
  header: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${centerNotoSans.className} h-[100dvh] flex flex-col overflow-hidden text-[#11224E] ${className}`}
      style={{ backgroundColor: PAGE_BG }}
    >
      {header}
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-10">
        {children}
      </div>
    </div>
  );
}

export function CenterPageHeader({
  title,
  actions,
  backButton,
}: {
  title: string;
  actions?: ReactNode;
  backButton?: ReactNode;
}) {
  return (
    <header
      className="shrink-0 h-[68px] border-b border-black/[0.06] z-30"
      style={{ backgroundColor: PAGE_BG }}
    >
      <div className="nexa-center-shell h-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {backButton}
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight min-w-0 leading-tight truncate"
            style={{ color: BLUE }}
          >
            {title}
          </h1>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
      </div>
    </header>
  );
}

export function OutlineHeaderButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${outlineBtn} disabled:opacity-40 ${className}`}
      style={{ color: BLUE, border: `1.5px solid ${BLUE}` }}
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const { locale } = useI18n();
  const resolvedLabel = label || (locale === "en" ? "Back" : "Retour");
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 w-9 rounded-lg border border-black/[0.08] text-neutral-600 hover:bg-black/[0.03] inline-flex items-center justify-center shrink-0 transition-colors duration-200"
      aria-label={resolvedLabel}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
  );
}

/** Stats gauche · recherche + filtres droite — même ligne que Programmes */
export function CenterToolbar({
  stats,
  children,
  className = "",
  layout = "inline",
}: {
  stats: ReactNode;
  children?: ReactNode;
  className?: string;
  /** `stacked` : KPIs sur une ligne pleine largeur, filtres en dessous (pages denses type Finances) */
  layout?: "inline" | "stacked";
}) {
  if (layout === "stacked") {
    return (
      <div className={`center-toolbar-in space-y-4 ${className}`}>
        <div
          className="flex flex-nowrap items-center overflow-x-auto min-w-0 gap-x-1 sm:gap-x-2 text-[15px] sm:text-base font-medium leading-snug [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ color: BLUE }}
        >
          {stats}
        </div>
        {children && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 print:hidden">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`center-toolbar-in flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${className}`}>
      <div
        className="text-sm sm:text-[15px] font-medium shrink-0 leading-normal"
        style={{ color: BLUE }}
      >
        {stats}
      </div>
      {children && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto lg:max-w-2xl lg:ml-auto print:hidden">
          {children}
        </div>
      )}
    </div>
  );
}

export function StatSep({ wide = false }: { wide?: boolean }) {
  return (
    <span className={`opacity-30 shrink-0 ${wide ? "mx-4 sm:mx-5" : "mx-1.5"}`}>·</span>
  );
}

export function ToolbarSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { locale } = useI18n();
  const resolvedPlaceholder = placeholder || (locale === "en" ? "Search…" : "Rechercher…");
  return (
    <div className="relative flex-1 min-w-0 sm:min-w-[12rem]">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        className="w-full h-9 pl-9 pr-3 rounded-lg border border-black/[0.08] text-[13px] font-medium outline-none focus:border-[#11224E]/40 focus:ring-2 focus:ring-[#11224E]/10 placeholder:text-neutral-400 transition-shadow duration-200"
        style={{ backgroundColor: SURFACE }}
      />
    </div>
  );
}

export function ToolbarSelect({
  value,
  onChange,
  options,
  label,
  minWidth = "7.5rem",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  minWidth?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-9 px-2.5 rounded-lg border border-black/[0.08] bg-white text-[12px] font-semibold text-neutral-700 outline-none focus:border-[#11224E]/40 transition-colors duration-200"
      style={{ minWidth }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function CenterPageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`nexa-center-shell pt-4 sm:pt-5 space-y-4 min-w-0 ${className}`}>
      {children}
    </div>
  );
}

export function CenterDataTable({
  columns,
  children,
  columnWidths,
  minWidth = "700px",
  className = "",
}: {
  columns: string[];
  children: ReactNode;
  /** Largeurs fixes optionnelles (ex. `"14%"`, `"10.5rem"`). Colonnes sans valeur prennent l'espace restant. */
  columnWidths?: (string | undefined)[];
  /** Largeur minimale de la table pour activer le scroll horizontal */
  minWidth?: string;
  className?: string;
}) {
  return (
    <div className={`center-table-wrap w-full min-w-0 overflow-x-auto border border-black/[0.08] rounded-lg bg-white ${className}`}>
      <table className="w-full table-fixed text-left border-collapse" style={{ minWidth }}>
        {columnWidths && columnWidths.length > 0 && (
          <colgroup>
            {columns.map((col, i) => (
              <col key={col} style={columnWidths[i] ? { width: columnWidths[i] } : undefined} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr className="border-b border-black/[0.08] bg-[#F7F7F6]">
            {columns.map((col, i) => (
              <th
                key={col}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 ${
                  i === columns.length - 1 ? "text-center" : ""
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function CenterTableRow({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  const style: CSSProperties = { animationDelay: `${Math.min(index, 12) * 45}ms` };
  return (
    <tr
      className="center-row-in border-b border-black/[0.05] last:border-0 hover:bg-black/[0.015] transition-colors duration-150"
      style={style}
    >
      {children}
    </tr>
  );
}

export function TableBtnPreview({ onClick, label }: { onClick: () => void; label?: string }) {
  const { locale } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 px-2 rounded-md text-[11px] font-semibold text-neutral-600 border border-black/[0.08] bg-white hover:bg-black/[0.03] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      {label || (locale === "en" ? "Preview" : "Aperçu")}
    </button>
  );
}

export function TableBtnModify({ onClick, label }: { onClick: () => void; label?: string }) {
  const { locale } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 px-2 rounded-md text-[11px] font-semibold bg-transparent transition-all duration-200 hover:bg-[#11224E]/[0.04] hover:scale-[1.02] active:scale-[0.98]"
      style={{ color: BLUE, border: `1.5px solid ${BLUE}` }}
    >
      {label || (locale === "en" ? "Edit" : "Modifier")}
    </button>
  );
}

export function TableActions({ children }: { children: ReactNode }) {
  return (
    <td className="px-3 py-4 text-center align-top whitespace-nowrap">
      <div className="inline-flex items-center justify-center gap-1.5 flex-nowrap">{children}</div>
    </td>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="p-12 sm:p-14 text-center rounded-lg border border-dashed border-neutral-200 center-toolbar-in"
      style={{ backgroundColor: SURFACE }}
    >
      <p className="text-sm font-bold text-neutral-600">{title}</p>
      {hint && <p className="text-xs text-neutral-400 mt-1 font-medium">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Placeholder produit — IA à venir (désactivé + cadenas). */
export function AgentIaComingSoonButton({
  title,
}: {
  title?: string;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      disabled
      title={title || t("centre", "centerAiComingSoonTitle")}
      className="print:hidden flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-lg px-3 sm:px-3.5 text-xs font-semibold tracking-wide shrink-0 cursor-not-allowed opacity-55"
      style={{ color: BLUE, border: `1.5px solid ${BLUE}` }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <span className="hidden md:inline">{t("centre", "centerAiAgent")}</span>
      <span className="md:hidden">{t("centre", "centerAiShort")}</span>
      <span className="hidden sm:inline text-[10px] font-medium opacity-70">{t("centre", "centerAiComingSoon")}</span>
    </button>
  );
}

// ── Legacy aliases (dashboard / détail) ─────────────────────────────────────
export const PrimaryButton = OutlineHeaderButton;
export const HeaderPrimaryButton = OutlineHeaderButton;
export const HeaderSecondaryButton = OutlineHeaderButton;
export const SecondaryButton = OutlineHeaderButton;
