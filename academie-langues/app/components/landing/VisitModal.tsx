"use client";

import { useState } from "react";
import { X, Building2, GraduationCap, Loader2 } from "lucide-react";
import { BRAND } from "@/app/utils/brand";

type CenterKind = "libre" | "tcf";
type ViewAs = "center" | "student";

const CENTER_LABEL: Record<CenterKind, string> = {
  libre: "Centre Libre",
  tcf: "Centre TCF Canada",
};

export default function VisitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [centerKind, setCenterKind] = useState<CenterKind | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setCenterKind(null);
    setError(null);
    setLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickCenterKind = (kind: CenterKind) => {
    setCenterKind(kind);
    setStep(2);
  };

  const pickViewAs = async (viewAs: ViewAs) => {
    if (!centerKind || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerKind, viewAs }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Impossible d'ouvrir la visite.");
        setLoading(false);
        return;
      }
      sessionStorage.setItem(
        "nexa_visit_pending",
        JSON.stringify({
          token_hash: data.token_hash,
          centerKind,
          viewAs,
          centerName: data.centerName,
          next: viewAs === "center" ? "/centre/dashboard" : "/dashboard",
        }),
      );
      window.location.assign("/visite/enter");
    } catch {
      setError("Erreur réseau, réessayez.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={close}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: BRAND.orange }}>
              Visite guidée
            </p>
            <h2 className="mt-1 text-lg font-black" style={{ color: BRAND.blue }}>
              {step === 1 ? "Quel type de centre ?" : `${CENTER_LABEL[centerKind!]} — en tant que ?`}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        {step === 1 ? (
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => pickCenterKind("libre")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7]"
            >
              <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />
              <span className="text-sm font-bold text-neutral-700">Centre Libre</span>
            </button>
            <button
              type="button"
              onClick={() => pickCenterKind("tcf")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7]"
            >
              <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />
              <span className="text-sm font-bold text-neutral-700">Centre TCF Canada</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void pickViewAs("center")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: BRAND.orange }} /> : <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />}
              <span className="text-sm font-bold text-neutral-700">Centre (responsable)</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void pickViewAs("student")}
              className="flex items-center gap-3 rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-[#FFFBF7] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: BRAND.orange }} /> : <GraduationCap className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />}
              <span className="text-sm font-bold text-neutral-700">Étudiant</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-1 text-xs font-bold text-neutral-400 hover:text-neutral-600"
            >
              ← Changer de type de centre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
