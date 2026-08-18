"use client";

import { useState, type ElementType, type ReactNode } from "react";
import { ChevronDown, Pencil, Camera, Loader2 } from "lucide-react";

export const P_BLUE = "#11224E";
export const P_ORANGE = "#eb670e";
export const P_SURFACE = "#F7F7F6";
export const P_BORDER = "rgba(17,34,78,0.08)";

/* ── Carte d'identité ─────────────────────────────────────────────────── */

export function IdCard({
  photoUrl,
  photoIcon: PhotoIcon,
  onPhotoClick,
  photoUploading,
  name,
  verified = true,
  tags,
  children,
}: {
  photoUrl?: string | null;
  photoIcon?: ElementType;
  onPhotoClick?: () => void;
  photoUploading?: boolean;
  name: string;
  verified?: boolean;
  tags?: { label: string; tone?: "neutral" | "positive" | "warning" }[];
  /** Lignes méta (email, tél, ville…) rendues via <MetaLine> */
  children?: ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border bg-white"
      style={{ borderColor: P_BORDER }}
    >
      <div className="h-[3px] w-full" style={{ backgroundColor: P_ORANGE }} />
      <div className="p-5 sm:p-6 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 sm:gap-5">
        <div className="relative shrink-0">
          <div
            className="h-20 w-20 rounded-2xl overflow-hidden border flex items-center justify-center bg-[#F7F7F6]"
            style={{ borderColor: P_BORDER }}
          >
            {photoUploading ? (
              <Loader2 size={20} className="animate-spin" style={{ color: P_BLUE }} />
            ) : photoUrl ? (
              <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
            ) : PhotoIcon ? (
              <PhotoIcon size={28} style={{ color: P_BLUE, opacity: 0.35 }} />
            ) : null}
          </div>
          {onPhotoClick && !photoUploading && (
            <button
              type="button"
              onClick={onPhotoClick}
              aria-label="Modifier la photo"
              className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
              style={{ backgroundColor: P_ORANGE }}
            >
              <Camera size={12} className="text-white" />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-1.5">
            <h1 className="text-[19px] font-extrabold tracking-tight truncate" style={{ color: P_BLUE }}>
              {name}
            </h1>
            {verified && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M12 2l2.4 1.4 2.7-.3 1.4 2.4 2.4 1.4-.3 2.7 1.4 2.4-1.4 2.4.3 2.7-2.4 1.4-1.4 2.4-2.7-.3L12 22l-2.4-1.4-2.7.3-1.4-2.4-2.4-1.4.3-2.7L2 12l1.4-2.4-.3-2.7 2.4-1.4L6.9 3.1l2.7.3z" fill={P_ORANGE} />
                <path d="M8.5 12.3l2.4 2.4 4.6-4.9" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {tags && tags.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={
                    tag.tone === "positive"
                      ? { backgroundColor: "#ECFDF5", color: "#047857" }
                      : tag.tone === "warning"
                        ? { backgroundColor: "#FFF7ED", color: "#C2410C" }
                        : { backgroundColor: P_SURFACE, color: "rgba(17,34,78,0.65)" }
                  }
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {children && (
            <div className="mt-3.5 flex flex-col sm:flex-row flex-wrap items-center sm:items-start justify-center sm:justify-start gap-x-4 gap-y-1.5">
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MetaLine({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "rgba(17,34,78,0.55)" }}>
      <Icon size={13} style={{ color: P_ORANGE }} />
      {children}
    </span>
  );
}

/* ── Groupes de réglages ──────────────────────────────────────────────── */

export function Group({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "rgba(17,34,78,0.4)" }}>
          {title}
        </h2>
        {action}
      </div>
      <div className="rounded-2xl border bg-white overflow-hidden divide-y" style={{ borderColor: P_BORDER }}>
        {children}
      </div>
    </section>
  );
}

/** Ligne d'affichage simple (lecture seule) */
export function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5" style={{ borderColor: P_BORDER }}>
      <Icon size={16} className="shrink-0" style={{ color: P_ORANGE }} strokeWidth={1.9} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold" style={{ color: "rgba(17,34,78,0.4)" }}>{label}</p>
        <p className="text-[13.5px] font-bold truncate" style={{ color: P_BLUE }}>{value}</p>
      </div>
    </div>
  );
}

/** Ligne d'affichage éditable inline (bascule vers un <input>) */
export function EditableRow({
  icon: Icon,
  label,
  value,
  editing,
  editValue,
  onEditChange,
  type = "text",
  placeholder,
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
  editing: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5" style={{ borderColor: P_BORDER }}>
      <Icon size={16} className="shrink-0" style={{ color: P_ORANGE }} strokeWidth={1.9} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold mb-1" style={{ color: "rgba(17,34,78,0.4)" }}>{label}</p>
        {editing ? (
          <input
            type={type}
            value={editValue ?? ""}
            placeholder={placeholder}
            onChange={(e) => onEditChange?.(e.target.value)}
            className="w-full h-8 -mt-1 bg-transparent text-[13.5px] font-bold outline-none border-b"
            style={{ color: P_BLUE, borderColor: "rgba(235,103,14,0.4)" }}
          />
        ) : (
          <p className="text-[13.5px] font-bold truncate" style={{ color: P_BLUE }}>{value}</p>
        )}
      </div>
    </div>
  );
}

/** Ligne repliable (accordéon) — mot de passe, PIN, etc. */
export function AccordionRow({
  icon: Icon,
  label,
  description,
  open,
  onToggle,
  trailing,
  children,
}: {
  icon: ElementType;
  label: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-black/[0.015] transition-colors"
      >
        <span
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: P_SURFACE }}
        >
          <Icon size={16} style={{ color: P_BLUE }} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold" style={{ color: P_BLUE }}>{label}</span>
          {description && (
            <span className="block text-[12px] font-medium mt-0.5" style={{ color: "rgba(17,34,78,0.45)" }}>{description}</span>
          )}
        </span>
        {trailing}
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform"
          style={{ color: "rgba(17,34,78,0.35)", transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1" style={{ backgroundColor: P_SURFACE }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Ligne interrupteur (toggle) */
export function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: ElementType;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <Icon size={16} className="shrink-0" style={{ color: P_ORANGE }} strokeWidth={1.9} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold" style={{ color: P_BLUE }}>{label}</span>
        {description && (
          <span className="block text-[12px] font-medium mt-0.5" style={{ color: "rgba(17,34,78,0.45)" }}>{description}</span>
        )}
      </span>
      <span className="relative inline-flex h-6 w-10 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          className="absolute inset-0 rounded-full transition-colors peer-checked:[background-color:var(--on)]"
          style={{ backgroundColor: checked ? P_ORANGE : "rgba(17,34,78,0.15)" }}
        />
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(1rem)" : undefined }}
        />
      </span>
    </label>
  );
}

/** Ligne bouton simple (action / navigation) */
export function ButtonRow({
  icon: Icon,
  label,
  description,
  onClick,
  tone = "neutral",
  busy,
}: {
  icon: ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  tone?: "neutral" | "danger" | "brand";
  busy?: boolean;
}) {
  const color = tone === "danger" ? "#DC2626" : tone === "brand" ? P_ORANGE : P_BLUE;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-black/[0.015] transition-colors disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={16} className="shrink-0 animate-spin" style={{ color }} />
      ) : (
        <Icon size={16} className="shrink-0" style={{ color }} strokeWidth={1.9} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold" style={{ color }}>{label}</span>
        {description && (
          <span className="block text-[12px] font-medium mt-0.5" style={{ color: "rgba(17,34,78,0.45)" }}>{description}</span>
        )}
      </span>
    </button>
  );
}

/* ── Champs de formulaire (dans les accordéons) ──────────────────────── */

export function PField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.45)" }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border bg-white px-3 text-[13.5px] font-semibold outline-none focus:ring-2"
        style={{ borderColor: P_BORDER, color: P_BLUE }}
      />
    </label>
  );
}

export function PPinField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide" style={{ color: "rgba(17,34,78,0.45)" }}>{label}</span>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        className="h-11 w-full rounded-lg border bg-white px-3 text-center text-lg font-extrabold tracking-[0.35em] outline-none"
        style={{ borderColor: P_BORDER, color: P_BLUE }}
      />
    </label>
  );
}

export function PButton({
  children,
  onClick,
  busy,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  busy?: boolean;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`h-10 inline-flex items-center justify-center gap-2 rounded-lg px-4 text-[12.5px] font-bold disabled:opacity-50 ${
        variant === "primary" ? "text-white" : "border"
      } ${className}`}
      style={
        variant === "primary"
          ? { backgroundColor: P_ORANGE }
          : { borderColor: P_BORDER, color: P_BLUE, backgroundColor: "white" }
      }
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function useAccordion(initial: string | null = null) {
  const [open, setOpen] = useState<string | null>(initial);
  return {
    isOpen: (key: string) => open === key,
    toggle: (key: string) => setOpen((cur) => (cur === key ? null : key)),
    close: () => setOpen(null),
  };
}

export { Pencil as EditIcon };
