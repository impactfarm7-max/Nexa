"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { ACTION_TONE } from "@/app/utils/action-tones";
import { BLUE } from "@/app/centre/center-page-ui";
import { useI18n } from "@/app/i18n/I18nProvider";

export type ActionFeedbackStatus = "loading" | "success" | "error" | "empty";

export type ActionFeedbackPayload = {
  status: ActionFeedbackStatus;
  title: string;
  message?: string;
};

export type ActionFeedbackRunOptions<T> = {
  loadingTitle?: string;
  loadingMessage?: string;
  successTitle?: string;
  successMessage?: string | ((result: T) => string);
  errorTitle?: string;
  emptyWhen?: (result: T) => boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Skip the success popup (e.g. a dedicated celebration modal follows). */
  silentSuccess?: boolean;
  autoCloseMs?: number;
};

export type ActionRunResult<T> =
  | { ok: true; data: T }
  | { ok: false };

type ActionFeedbackContextValue = {
  show: (payload: ActionFeedbackPayload, autoCloseMs?: number) => void;
  close: () => void;
  run: <T>(fn: () => Promise<T>, opts?: ActionFeedbackRunOptions<T>) => Promise<ActionRunResult<T>>;
};

const ActionFeedbackContext = createContext<ActionFeedbackContextValue | null>(null);

export function ActionFeedbackModal({
  state,
  onClose,
}: {
  state: ActionFeedbackPayload;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const loading = state.status === "loading";
  const icon =
    state.status === "loading" ? <Loader2 size={20} className="animate-spin" style={{ color: BLUE }} />
    : state.status === "success" ? <CheckCircle2 size={20} className={ACTION_TONE.successIcon} />
    : state.status === "empty" ? <Inbox size={20} className="text-neutral-400" />
    : <AlertTriangle size={20} className={ACTION_TONE.dangerIcon} />;
  const iconBg =
    state.status === "loading" ? "bg-[#11224E]/[0.06]"
    : state.status === "success" ? "bg-emerald-50"
    : state.status === "empty" ? "bg-neutral-100"
    : "bg-red-50";
  const titleCls =
    state.status === "error" ? ACTION_TONE.negativeText
    : state.status === "success" ? ACTION_TONE.positiveText
    : "";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-black/[0.06] shadow-2xl p-5"
        role="status"
        aria-live="polite"
        aria-busy={loading}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className={`text-sm font-bold ${titleCls}`} style={titleCls ? undefined : { color: BLUE }}>
              {state.title}
            </h3>
            {state.message ? (
              <p className="text-[13px] text-neutral-500 mt-1.5 leading-relaxed">{state.message}</p>
            ) : null}
          </div>
        </div>
        {!loading && (
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={onClose} className={ACTION_TONE.ghostBtnMd}>
              {t("common", "actionOk")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<ActionFeedbackPayload | null>(null);
  const timerRef = useRef<number | null>(null);
  const statusRef = useRef<ActionFeedbackStatus | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    if (statusRef.current === "loading") return;
    clearTimer();
    statusRef.current = null;
    setState(null);
  }, [clearTimer]);

  const show = useCallback((payload: ActionFeedbackPayload, autoCloseMs?: number) => {
    clearTimer();
    statusRef.current = payload.status;
    setState(payload);
    const ms = autoCloseMs ?? (payload.status === "success" ? 2200 : undefined);
    if (ms && payload.status !== "loading") {
      timerRef.current = window.setTimeout(() => {
        statusRef.current = null;
        setState(null);
        timerRef.current = null;
      }, ms);
    }
  }, [clearTimer]);

  const run = useCallback(async <T,>(
    fn: () => Promise<T>,
    opts?: ActionFeedbackRunOptions<T>,
  ): Promise<ActionRunResult<T>> => {
    show({
      status: "loading",
      title: opts?.loadingTitle ?? t("common", "actionLoadingTitle"),
      message: opts?.loadingMessage ?? t("common", "actionLoadingMessage"),
    });
    try {
      const result = await fn();
      if (opts?.emptyWhen?.(result)) {
        show({
          status: "empty",
          title: opts.emptyTitle ?? t("common", "actionEmptyTitle"),
          message: opts.emptyMessage ?? t("common", "actionEmptyMessage"),
        });
        return { ok: true, data: result };
      }
      if (opts?.silentSuccess) {
        clearTimer();
        statusRef.current = null;
        setState(null);
        return { ok: true, data: result };
      }
      show({
        status: "success",
        title: opts?.successTitle ?? t("common", "actionSuccessTitle"),
        message: typeof opts?.successMessage === "function"
          ? opts.successMessage(result)
          : (opts?.successMessage ?? t("common", "actionSuccessMessage")),
      }, opts?.autoCloseMs);
      return { ok: true, data: result };
    } catch (e) {
      show({
        status: "error",
        title: opts?.errorTitle ?? t("common", "actionErrorTitle"),
        message: e instanceof Error ? e.message : t("common", "actionErrorMessage"),
      });
      return { ok: false };
    }
  }, [clearTimer, show, t]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo(() => ({ show, close, run }), [show, close, run]);

  return (
    <ActionFeedbackContext.Provider value={value}>
      {children}
      {state ? <ActionFeedbackModal state={state} onClose={close} /> : null}
    </ActionFeedbackContext.Provider>
  );
}

export function useActionFeedback() {
  const ctx = useContext(ActionFeedbackContext);
  if (!ctx) throw new Error("useActionFeedback must be used inside ActionFeedbackProvider");
  return ctx;
}
