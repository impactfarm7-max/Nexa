"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { ACTION_TONE } from "@/app/utils/action-tones";
import { BLUE } from "@/app/centre/center-page-ui";

export type ActionConfirmTone = "danger" | "positive" | "warning";

export function ActionConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ActionConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const icon =
    tone === "positive" ? <CheckCircle2 size={18} className={ACTION_TONE.successIcon} />
    : <AlertTriangle size={18} className={tone === "warning" ? "text-amber-500" : ACTION_TONE.dangerIcon} />;
  const iconBg =
    tone === "positive" ? "bg-emerald-50"
    : tone === "warning" ? "bg-amber-50"
    : "bg-red-50";
  const confirmCls =
    tone === "positive" ? ACTION_TONE.positiveBtnMd
    : tone === "warning" ? ACTION_TONE.warningBtn
    : ACTION_TONE.negativeBtnMd;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-black/[0.06] shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-bold" style={{ color: BLUE }}>{title}</h3>
            <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={ACTION_TONE.ghostBtnMd}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={confirmCls}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
