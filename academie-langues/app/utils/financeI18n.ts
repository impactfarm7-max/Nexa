export function localizeInstallmentLabel(label: string | null | undefined, locale: string): string {
  const value = label?.trim() || "";
  if (locale !== "en" || !value) return value;
  return value
    .replace(/^(?:Échéance|Echeance)\b/i, "Installment")
    .replace(/\(Acompte\)/gi, "(Deposit)")
    .replace(/^(?:À|A) l['’]inscription$/i, "Upon enrollment")
    .replace(/^Solde apr(?:è|e)s r(?:é|e)duction$/i, "Balance after discount");
}

export function localizePaymentMethod(method: string | null | undefined, locale: string): string {
  const value = method?.trim() || "";
  if (locale !== "en" || !value) return value;
  const normalized = value.toLocaleLowerCase("fr-FR").replace(/_/g, " ");
  if (["espèces", "especes", "cash"].includes(normalized)) return "Cash";
  if (["virement", "virement bancaire", "bank transfer", "transfer"].includes(normalized)) return "Bank transfer";
  if (["chèque", "cheque", "check"].includes(normalized)) return "Check";
  if (["carte", "carte bancaire", "card"].includes(normalized)) return "Card";
  if (["mobile money", "momo"].includes(normalized)) return "Mobile Money";
  return value;
}
