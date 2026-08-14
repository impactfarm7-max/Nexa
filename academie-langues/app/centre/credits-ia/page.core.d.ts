export type CreditWallet = Record<string, number>;

export function chooseGrantSource(
  wallet: CreditWallet | null | undefined,
  creditType: string,
): "typed" | "generic";

export function findRequestedBeneficiary<T extends { id?: string; email?: string | null }>(
  beneficiaries: T[],
  requested: string | null | undefined,
): T | null;
