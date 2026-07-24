"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Lock, Wrench } from "lucide-react";
import { useOralSimulatorLock } from "@/app/hooks/useOralSimulatorLock";

type Props = {
  backHref?: string;
  backLabel?: string;
};

export default function OralSimulatorMaintenance({
  backHref = "/tcf-canada/simulateur",
  backLabel = "Retour simulateur",
}: Props) {
  const router = useRouter();
  const { countdown } = useOralSimulatorLock();

  return (
    <div className="min-h-[100dvh] bg-neutral-50 text-neutral-900 font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-neutral-200 shadow-sm hover:shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-800 stroke-[1.8]" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">{backLabel}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-orange-50 border-2 border-orange-100 rounded-full flex items-center justify-center mb-6"
        >
          <Lock className="w-10 h-10 text-orange-600 stroke-[1.5]" />
        </motion.div>

        <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider rounded-full mb-4">
          <Wrench className="w-3.5 h-3.5" />
          Maintenance en cours
        </span>

        <h1 className="text-2xl font-extrabold text-neutral-900 mb-2">Simulateur Expression Orale</h1>
        <p className="text-neutral-500 max-w-sm text-sm leading-relaxed mb-8">
          Nous améliorons le coach vocal et l&apos;expérience d&apos;entretien. Réouverture automatique dans :
        </p>

        <div className="w-full max-w-xs rounded-3xl border border-neutral-200 bg-white p-6 shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-3 text-orange-600">
            <Clock className="w-5 h-5 stroke-[2]" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Compte à rebours</span>
          </div>
          <p className="text-3xl font-black tabular-nums tracking-tight text-neutral-900">
            {countdown?.label ?? "—"}
          </p>
          {countdown && countdown.days > 0 && (
            <p className="mt-2 text-[11px] text-neutral-400 font-semibold">
              {countdown.days} jour{countdown.days > 1 ? "s" : ""} restant{countdown.days > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <p className="mt-8 text-[11px] text-neutral-400 max-w-xs">
          Les autres modules du simulateur (écrit, examen) restent disponibles.
        </p>
      </div>
    </div>
  );
}
