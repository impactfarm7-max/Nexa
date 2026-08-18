export type FinanceMethod = "virement" | "mobile_money" | "especes" | "autre";

export const FINANCE_METHODS: readonly FinanceMethod[];

export function isFinanceMethod(value: unknown): value is FinanceMethod;

export type PaymentInput = {
  center_id: string;
  amount: number;
  method: FinanceMethod;
  period_label: string | null;
  paid_at: string;
  note: string | null;
};

export type ValidatePaymentResult =
  | { ok: true; value: PaymentInput }
  | { ok: false; errors: string[] };

export function validatePaymentInput(body: unknown): ValidatePaymentResult;

export type MonthlyRevenueBucket = { key: string; year: number; month: number; total: number };

export function buildMonthlyRevenue(
  payments: { amount: number; paid_at: string }[],
  monthsCount: number,
  now?: Date,
): MonthlyRevenueBucket[];

export function financeMethodLabel(method: string, locale: "fr" | "en"): string;
