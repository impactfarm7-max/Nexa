export type AiCreditType = "tutor_ia" | "exam_sim" | "ai_corrections" | "course_builder";

export type AiCreditWallet = {
  generic: number;
  tutor_ia: number;
  exam_sim: number;
  ai_corrections: number;
  course_builder: number;
};

export const AI_CREDIT_TYPES: readonly AiCreditType[];

export const PROFILE_TOTAL_COLUMN: Record<AiCreditType, string>;

export function emptyWallet(): AiCreditWallet;

export function isAiCreditType(value: unknown): value is AiCreditType;

export function applyPurchase(
  wallet: AiCreditWallet,
  options: { mode: "generic"; quantity: number } | { mode: "typed"; type: AiCreditType; quantity: number },
): AiCreditWallet;

export function applyGrantDebit(
  wallet: AiCreditWallet,
  options: { source: "generic" | "typed"; type: AiCreditType; quantity: number },
): AiCreditWallet;
