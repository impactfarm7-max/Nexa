"use client";

import { useEffect, useState } from "react";
import { Download, Plus, Share, Smartphone, X } from "lucide-react";
import { BRAND } from "@/app/utils/brand";
import {
  initPwaInstallCapture,
  isIosDevice,
  isPwaInstalled,
  promptPwaInstall,
} from "@/app/utils/pwa-install";
import { useI18n } from "@/app/i18n/I18nProvider";

type Props = {
  className?: string;
  labelClassName?: string;
};

/** Bouton "Télécharger l'app" (install PWA) — à placer dans l'en-tête des pages "Mon profil". */
export default function DownloadAppButton({ className = "", labelClassName = "hidden md:inline" }: Props) {
  const { t } = useI18n();
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);

  useEffect(() => {
    initPwaInstallCapture();
    const sync = () => setCanInstallApp(!isPwaInstalled());
    sync();
    window.addEventListener("nexa-pwa-install-ready", sync);
    return () => window.removeEventListener("nexa-pwa-install-ready", sync);
  }, []);

  const handleDownloadApp = async () => {
    if (installBusy || isPwaInstalled()) return;

    if (isIosDevice()) {
      setIosInstallOpen(true);
      return;
    }

    setInstallBusy(true);
    try {
      await promptPwaInstall();
      setCanInstallApp(!isPwaInstalled());
    } finally {
      setInstallBusy(false);
    }
  };

  if (!canInstallApp) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void handleDownloadApp()}
        disabled={installBusy}
        aria-label={t("dashboard", "profilDownloadApp")}
        className={`flex h-10 sm:h-11 items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white shadow-md shadow-orange-500/30 transition hover:opacity-95 disabled:opacity-60 ${className}`}
        style={{ backgroundColor: BRAND.orange }}
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        <span className={labelClassName}>
          {installBusy ? t("dashboard", "profilInstalling") : t("dashboard", "profilDownloadApp")}
        </span>
        <Download className="h-3.5 w-3.5 opacity-90 md:hidden" />
      </button>

      {iosInstallOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl">
            <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />
            <div className="p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg"
                    style={{ backgroundColor: BRAND.blue }}
                  >
                    <span className="text-sm font-black tracking-tight text-orange-400">NEXA</span>
                  </div>
                  <div>
                    <p className="text-sm font-black leading-tight text-slate-900">
                      {t("dashboard", "profilInstallApp")}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {t("dashboard", "profilInstallIosDevices")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIosInstallOpen(false)}
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
                  aria-label={t("dashboard", "profilCancel")}
                >
                  <X size={14} className="text-slate-500" />
                </button>
              </div>

              <div className="mb-5 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
                    <Share size={14} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{t("dashboard", "profilInstallStep1")}</p>
                    <p className="text-[10px] font-medium text-slate-500">{t("dashboard", "profilInstallStep1Hint")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                    style={{ backgroundColor: BRAND.blue }}
                  >
                    <Plus size={14} className="text-white" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{t("dashboard", "profilInstallStep2")}</p>
                    <p className="text-[10px] font-medium text-slate-500">{t("dashboard", "profilInstallStep2Hint")}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIosInstallOpen(false)}
                className="flex h-11 w-full items-center justify-center rounded-2xl text-xs font-black uppercase tracking-widest text-white"
                style={{ backgroundColor: BRAND.orange }}
              >
                {t("dashboard", "profilInstallGotIt")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
