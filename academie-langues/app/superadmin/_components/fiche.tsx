import type { ReactNode } from "react";

export function FicheSection({
  label,
  children,
  cols = 2,
}: {
  label: string;
  children: ReactNode;
  /** Max columns — keep ≤2 in side panels so values never crush. */
  cols?: 1 | 2;
}) {
  return (
    <section className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400/80">{label}</p>
      <div
        className={`grid gap-2.5 ${cols === 1 ? "grid-cols-1" : "grid-cols-1 min-[380px]:grid-cols-2"}`}
      >
        {children}
      </div>
    </section>
  );
}

export function FicheField({
  label,
  value,
  icon,
  mono,
  span,
  nowrap,
}: {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  mono?: boolean;
  span?: boolean;
  /** Keep phone / short codes on one line when possible. */
  nowrap?: boolean;
}) {
  const empty = value == null || value === "";
  return (
    <div
      className={`min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 ${
        span ? "col-span-full" : ""
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div
        className={`mt-1.5 flex min-w-0 items-start gap-2 text-[13px] font-semibold leading-snug text-white ${
          mono ? "font-mono text-xs tracking-wide" : ""
        }`}
      >
        {icon ? <span className="mt-0.5 shrink-0 text-orange-400/70">{icon}</span> : null}
        {empty ? (
          <span className="text-slate-600">—</span>
        ) : (
          <span
            className={`min-w-0 ${
              nowrap
                ? "overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                : "break-words [overflow-wrap:break-word]"
            }`}
            title={typeof value === "string" ? value : undefined}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

/** Full-width stacked row — label left / value right on wide, stack on narrow. */
export function FicheRow({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  mono?: boolean;
}) {
  const empty = value == null || value === "";
  return (
    <div className="col-span-full flex min-w-0 flex-col gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <p className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div
        className={`flex min-w-0 items-start gap-2 text-[13px] font-semibold leading-snug text-white sm:text-right ${
          mono ? "font-mono text-xs tracking-wide" : ""
        }`}
      >
        {icon ? <span className="mt-0.5 shrink-0 text-orange-400/70 sm:order-2">{icon}</span> : null}
        {empty ? (
          <span className="text-slate-600">—</span>
        ) : (
          <span className="min-w-0 break-words [overflow-wrap:break-word]" title={typeof value === "string" ? value : undefined}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
