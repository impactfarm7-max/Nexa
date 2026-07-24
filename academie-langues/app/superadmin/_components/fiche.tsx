import type { ReactNode } from "react";

export function FicheSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-orange-400/70">{label}</p>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[420px]:grid-cols-2 sm:grid-cols-4">{children}</div>
    </div>
  );
}

export function FicheField({
  label,
  value,
  icon,
  mono,
  span,
}: {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  mono?: boolean;
  span?: boolean;
}) {
  return (
    <div className={`min-w-0 overflow-hidden ${span ? "col-span-full" : ""}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <div
        className={`mt-1 flex min-w-0 items-start gap-1.5 text-sm font-bold text-white ${
          mono ? "font-mono" : ""
        }`}
      >
        {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
        <span className="min-w-0 break-all [overflow-wrap:anywhere]">
          {value || <span className="text-slate-600">—</span>}
        </span>
      </div>
    </div>
  );
}
