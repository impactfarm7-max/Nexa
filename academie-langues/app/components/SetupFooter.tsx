"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { useI18n } from "@/app/i18n/I18nProvider";

const BLUE  = "#11224E";
const ORANGE = "#eb670e";

interface Props {
  step: "settings" | "programme";
  centerType?: string;
  onSave: () => Promise<void>;
  saving?: boolean;
  hidden?: boolean;
}

function FooterInner({ step, centerType, onSave, saving, hidden }: Props) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (searchParams.get("setup") !== "1" || hidden) return null;

  const isLastStep =
    step === "programme" || (step === "settings" && centerType !== "tcf_canada");

  const handleNext = async () => {
    await onSave();
    if (step === "settings") {
      if (centerType === "tcf_canada") {
        router.push("/centre/tcf/programme?setup=1");
      } else {
        router.push("/centre/setup-done");
      }
    } else {
      router.push("/centre/setup-done");
    }
  };

  return (
    <div
      className="fixed bottom-0 right-0 z-50 bg-white border-t border-neutral-200 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-end gap-3"
      style={{ left: "var(--nexa-center-sidebar-w, 0px)" }}
    >
      <button
        onClick={handleNext}
        disabled={saving}
        className="h-10 w-full sm:w-auto px-6 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: isLastStep ? ORANGE : BLUE }}
      >
        {saving
          ? <Loader2 size={14} className="animate-spin" />
          : isLastStep
            ? t("common", "setupFinish")
            : <><span>{t("common", "setupNext")}</span><ArrowRight size={14} /></>
        }
      </button>
    </div>
  );
}

export default function SetupFooter(props: Props) {
  return (
    <Suspense fallback={null}>
      <FooterInner {...props} />
    </Suspense>
  );
}
