"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Eye, GraduationCap, Users } from "lucide-react";
import { peekCenterBootstrap } from "@/app/utils/center-me-cache";
import { peekStudentAccess } from "@/app/utils/student-access-cache";
import { useI18n } from "@/app/i18n/I18nProvider";
import {
  VIEW_AS_EVENT,
  canUseViewAs,
  isCenterViewActor,
  pathForViewAs,
  resolveCurrentView,
  viewAsOptions,
  writeViewAs,
  type ViewAsMode,
} from "@/app/utils/view-as";
import { BLUE } from "@/app/centre/center-page-ui";

type Variant = "light" | "dark" | "student";

function roleFromCaches(): string | null {
  const boot = peekCenterBootstrap();
  const bootRole = (boot?.me?.role as string | undefined) || null;
  if (bootRole) return bootRole;
  return peekStudentAccess()?.profile?.role || null;
}

export default function ViewAsMenu({ variant = "light" }: { variant?: Variant }) {
  const { t } = useI18n();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [current, setCurrent] = useState<ViewAsMode | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  const sync = useCallback(() => {
    const r = roleFromCaches();
    setRole(r);
    setCurrent(resolveCurrentView(r));
  }, []);

  useEffect(() => {
    sync();
    const poll = window.setInterval(() => {
      if (roleFromCaches()) {
        sync();
        window.clearInterval(poll);
      }
    }, 250);
    const stop = window.setTimeout(() => window.clearInterval(poll), 5000);
    window.addEventListener(VIEW_AS_EVENT, sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
      window.removeEventListener(VIEW_AS_EVENT, sync);
      window.removeEventListener("focus", sync);
    };
  }, [sync]);

  const options = viewAsOptions(role, current);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, 220);
      let left = r.right - width;
      if (left < 8) left = 8;
      setPos({ top: r.bottom + 6, left, width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!canUseViewAs(role) || options.length === 0) return null;

  const labelFor = (mode: ViewAsMode) => {
    if (mode === "center") return t("centre", "viewAsCenter");
    if (mode === "staff") return t("centre", "viewAsStaff");
    return t("centre", "viewAsStudent");
  };

  const iconFor = (mode: ViewAsMode) => {
    if (mode === "center") return Building2;
    if (mode === "staff") return Users;
    return GraduationCap;
  };

  const go = (mode: ViewAsMode) => {
    if (mode === "center") writeViewAs(null);
    else if (mode === "staff") writeViewAs(isCenterViewActor(role) ? "staff" : null);
    else writeViewAs("student");
    setOpen(false);
    router.push(pathForViewAs(mode));
  };

  const btnCls =
    variant === "dark"
      ? "h-8 px-2.5 rounded-lg border border-white/20 bg-white/10 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 hover:bg-white/15"
      : variant === "student"
        ? "h-10 md:h-12 px-3 rounded-full border border-neutral-200 bg-white text-xs md:text-sm font-semibold text-neutral-700 inline-flex items-center gap-2 shadow-sm hover:bg-neutral-50"
        : "h-9 px-2.5 rounded-lg border border-black/[0.08] bg-white text-[12px] font-semibold text-neutral-700 inline-flex items-center gap-1.5 hover:bg-black/[0.03]";

  const menu = open ? (
    <div
      ref={panelRef}
      className="fixed z-[100] max-h-[min(16rem,50vh)] overflow-y-auto rounded-lg border border-black/[0.08] bg-white shadow-xl"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
      role="menu"
    >
      <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
        {t("centre", "viewAsLabel")}
      </p>
      {options.map((mode) => {
        const Icon = iconFor(mode);
        return (
          <button
            key={mode}
            type="button"
            role="menuitem"
            onClick={() => go(mode)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[12px] font-semibold text-neutral-700 hover:bg-black/[0.04] transition-colors"
          >
            <span className="w-4 shrink-0 flex justify-center">
              <Icon size={13} className="text-neutral-400" />
            </span>
            {labelFor(mode)}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("centre", "viewAsLabel")}
        onClick={() => setOpen((v) => !v)}
        className={btnCls}
        style={variant === "light" ? { borderColor: `${BLUE}22` } : undefined}
      >
        <Eye size={variant === "student" ? 16 : 14} className="shrink-0" />
        <span className="truncate max-w-[9rem] sm:max-w-[11rem]">{t("centre", "viewAsLabel")}</span>
        <ChevronDown size={14} className={`shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {typeof document !== "undefined" && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
