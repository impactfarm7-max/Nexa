"use client";

import { amountInWordsFr } from "@/app/utils/amountInWordsFr";
import { useI18n } from "@/app/i18n/I18nProvider";

function parsePositiveAmount(amount: number | string | null | undefined): number {
  if (amount == null || amount === "") return 0;
  const n =
    typeof amount === "string"
      ? Number(String(amount).replace(/\D/g, ""))
      : Math.floor(Number(amount));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

export function AmountInWords({
  amount,
  className,
}: {
  amount: number | string | null | undefined;
  className?: string;
}) {
  const { locale } = useI18n();
  const n = parsePositiveAmount(amount);
  if (n <= 0) return null;
  if (locale === "en") return null;
  return (
    <p className={className ?? "text-[11px] text-neutral-500 italic mt-1.5 leading-snug"}>
      En lettres : {amountInWordsFr(n)}
    </p>
  );
}
