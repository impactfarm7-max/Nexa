"use client";

import { Loader2, LogOut } from "lucide-react";

export function LogoutConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="w-full max-w-md rounded-[1.75rem] border border-neutral-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <LogOut className="h-5 w-5" />
        </div>
        <h2 id="logout-confirm-title" className="text-center text-lg font-black text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm font-medium leading-relaxed text-slate-500">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-neutral-100 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-red-600 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
