export function chooseGrantSource(wallet, creditType) {
  return Number(wallet?.[creditType] || 0) > 0 ? "typed" : "generic";
}

export function findRequestedBeneficiary(beneficiaries, requested) {
  const query = typeof requested === "string" ? requested.trim().toLowerCase() : "";
  if (!query) return null;

  return (
    beneficiaries.find(
      (person) =>
        String(person.id || "").toLowerCase() === query ||
        String(person.email || "").toLowerCase() === query,
    ) || null
  );
}
