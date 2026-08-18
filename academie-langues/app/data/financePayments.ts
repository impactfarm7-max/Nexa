import * as core from "./financePayments.core.mjs";

export type FinanceMethod = "virement" | "mobile_money" | "especes" | "autre";

export const FINANCE_METHODS = core.FINANCE_METHODS as readonly FinanceMethod[];

export const isFinanceMethod = core.isFinanceMethod as (value: unknown) => value is FinanceMethod;

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

export const validatePaymentInput = core.validatePaymentInput as (body: unknown) => ValidatePaymentResult;

export type MonthlyRevenueBucket = { key: string; year: number; month: number; total: number };

export const buildMonthlyRevenue = core.buildMonthlyRevenue as (
  payments: { amount: number; paid_at: string }[],
  monthsCount: number,
  now?: Date,
) => MonthlyRevenueBucket[];

export const financeMethodLabel = core.financeMethodLabel as (method: string, locale: "fr" | "en") => string;
