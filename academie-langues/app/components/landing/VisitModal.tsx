"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Building2, GraduationCap, Loader2, Check } from "lucide-react";
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
  const [selectedViewAs, setSelectedViewAs] = useState<ViewAs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setCenterKind(null);
    setSelectedViewAs(null);
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
    setSelectedViewAs(viewAs);
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
        setSelectedViewAs(null);
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
      setSelectedViewAs(null);
    }
  };

  const optionClass = (selected: boolean) =>
    `flex items-center gap-3 rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed ${
      selected
        ? "border-transparent shadow-lg"
        : "border-black/10 hover:border-black/20 hover:bg-[#FFFBF7]"
    }`;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        onClick={close}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: BRAND.orange }}>
                Visite guidée
              </p>
              <AnimatePresence mode="wait">
                <motion.h2
                  key={step}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.16 }}
                  className="mt-1 text-lg font-black"
                  style={{ color: BRAND.blue }}
                >
                  {step === 1 ? "Quel type de centre ?" : `${CENTER_LABEL[centerKind!]} en tant que ?`}
                </motion.h2>
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 gap-3"
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pickCenterKind("libre")}
                  className={optionClass(false)}
                >
                  <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />
                  <span className="text-sm font-bold text-neutral-700">Centre Libre</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pickCenterKind("tcf")}
                  className={optionClass(false)}
                >
                  <Building2 className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />
                  <span className="text-sm font-bold text-neutral-700">Centre TCF Canada</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 gap-3"
              >
                {(["center", "student"] as ViewAs[]).map((viewAs) => {
                  const isSelected = selectedViewAs === viewAs;
                  const Icon = viewAs === "center" ? Building2 : GraduationCap;
                  const label = viewAs === "center" ? "Centre (responsable)" : "Étudiant";
                  return (
                    <motion.button
                      key={viewAs}
                      type="button"
                      disabled={loading}
                      whileHover={!loading ? { scale: 1.015 } : undefined}
                      whileTap={!loading ? { scale: 0.98 } : undefined}
                      animate={isSelected ? { scale: [1, 1.03, 1] } : {}}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      onClick={() => void pickViewAs(viewAs)}
                      className={optionClass(isSelected)}
                      style={isSelected ? { backgroundColor: `${BRAND.orange}10`, boxShadow: `0 0 0 2px ${BRAND.orange}` } : undefined}
                    >
                      {isSelected && loading ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" style={{ color: BRAND.orange }} />
                      ) : isSelected ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: BRAND.orange }}
                        >
                          <Check className="h-3 w-3" />
                        </motion.span>
                      ) : (
                        <Icon className="h-5 w-5 shrink-0" style={{ color: BRAND.orange }} />
                      )}
                      <span className="text-sm font-bold text-neutral-700">{label}</span>
                    </motion.button>
                  );
                })}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep(1)}
                  className="mt-1 text-xs font-bold text-neutral-400 transition hover:text-neutral-600 disabled:opacity-50"
                >
                  ← Changer de type de centre
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
