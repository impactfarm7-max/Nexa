/** Positive / negative / warning tones shared across centre UI. */
export const ACTION_TONE = {
  positiveBtn:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 border border-transparent transition-colors disabled:opacity-50",
  positiveBtnMd:
    "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 border border-transparent transition-colors disabled:opacity-50",
  negativeBtn:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 border border-transparent transition-colors disabled:opacity-50",
  negativeBtnMd:
    "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 border border-transparent transition-colors disabled:opacity-50",
  negativeOutline:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50",
  negativeOutlineMd:
    "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50",
  /** Same chrome as centre Edit buttons, tinted for semantic actions */
  ghostBtnMd:
    "h-10 px-4 rounded-lg border border-black/[0.08] bg-white inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-neutral-700 hover:bg-black/[0.03] transition-colors disabled:opacity-50",
  negativeGhostMd:
    "h-10 px-4 rounded-lg border border-red-200 bg-white inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50",
  positiveGhostMd:
    "h-10 px-4 rounded-lg border border-emerald-200 bg-white inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50",
  warningBtn:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-amber-900 border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors",
  positiveText: "text-emerald-700",
  negativeText: "text-red-600",
  warningText: "text-amber-700",
  positiveStat: "font-semibold text-emerald-700",
  negativeStat: "font-semibold text-red-600",
  warningStat: "font-semibold text-amber-700",
  positivePill:
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50",
  negativePill:
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-red-600 border border-red-200 bg-red-50",
  warningPill:
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-amber-800 border border-amber-200 bg-amber-50",
  neutralPill:
    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-600 border border-black/[0.08] bg-white",
  errorBox: "text-sm font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-100",
  errorText: "text-xs font-bold text-red-500",
  successIcon: "text-emerald-500",
  dangerIcon: "text-red-500",
  /** Hex for inline styles (PDF / print / style={{}}) — matches Tailwind red-600 / emerald-700 */
  negativeHex: "#dc2626",
  positiveHex: "#047857",
  warningHex: "#b45309",
} as const;

export function statusToneClass(
  kind: "positive" | "negative" | "warning" | "neutral",
): string {
  if (kind === "positive") return ACTION_TONE.positiveText;
  if (kind === "negative") return ACTION_TONE.negativeText;
  if (kind === "warning") return ACTION_TONE.warningText;
  return "text-neutral-600";
}
