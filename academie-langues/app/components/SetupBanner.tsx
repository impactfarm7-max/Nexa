"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Props {
  step: "settings" | "programme";
  centerType?: string;
}

function BannerInner({ step }: Props) {
  const searchParams = useSearchParams();
  if (searchParams.get("setup") !== "1") return null;

  return (
    <div className="w-full border-b bg-white px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14 py-3 sticky top-0 z-40">
      <p className="text-[11px] font-medium text-neutral-400 tracking-wide">
        {step === "settings"
          ? "Configuration · Étape 1 — Identité du centre"
          : "Configuration · Étape 2 — Programme"}
      </p>
    </div>
  );
}

export default function SetupBanner(props: Props) {
  return (
    <Suspense fallback={null}>
      <BannerInner {...props} />
    </Suspense>
  );
}
