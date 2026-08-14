import type { AiCreditType } from "../../../data/aiCredits.core.mjs";

export type GrantInput = {
  beneficiaryId: string;
  creditType: AiCreditType;
  quantity: number;
  source: "generic" | "typed";
  paymentAmount: number | null;
  paymentReason: string | null;
};

export function parseGrantInput(body: unknown): GrantInput | null;
