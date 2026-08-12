"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { superadminFetch } from "@/app/utils/superadmin-api-client";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useActionFeedback } from "@/app/components/ActionFeedback";
import { ConfirmDialog } from "./ConfirmDialog";

type PauseCenter = { id: string; name: string };

export function PauseModal({
  center,
  onClose,
  onSuccess,
}: {
  center: PauseCenter;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const feedback = useActionFeedback();
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const execute = async () => {
    setConfirmOpen(false);
    const result = await feedback.run(
      async () => {
        await superadminFetch(`/api/superadmin/centers/${center.id}/pause`, {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        });
        onSuccess();
      },
      {
        successTitle: t("superadmin", "centresPauseSuccess"),
        successMessage: t("superadmin", "centresPauseSuccessMsg", { name: center.name }),
        errorTitle: t("superadmin", "requestsActionImpossible"),
      },
    );
    if (result.ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0f1c] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-white">{t("superadmin", "centresModalPauseTitle")}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-400">{center.name}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("superadmin", "centresModalPauseReasonPlaceholder")}
          rows={3}
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400 placeholder:text-slate-600"
        />
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5"
          >
            {t("superadmin", "centresConfirmCancel")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/90 px-4 py-2.5 text-sm font-black text-white hover:opacity-90"
          >
            {t("superadmin", "centresActionPause")}
          </button>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title={t("superadmin", "centresModalPauseTitle")}
          message={t("superadmin", "centresConfirmPause", { name: center.name })}
          confirmLabel={t("superadmin", "centresActionPause")}
          cancelLabel={t("superadmin", "centresConfirmCancel")}
          variant="danger"
          onConfirm={() => void execute()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
