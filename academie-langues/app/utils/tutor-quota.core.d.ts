export const TUTOR_EXCHANGE_QUOTA: number;

export type TutorQuotaResult = {
  hasAccess: boolean;
  unlimited: boolean;
  total: number | null;
  used: number | null;
  remaining: number | null;
  exhausted: boolean;
};

export function resolveTutorQuota(
  profile:
    | {
        role?: string | null;
        tutor_ia_total?: number | string | null;
        tutor_ia_used?: number | string | null;
      }
    | null
    | undefined,
): TutorQuotaResult;
