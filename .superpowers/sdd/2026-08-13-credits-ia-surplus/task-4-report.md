# Task 4 Report — Centre API: grant credits

## Implemented

- Added `GET /api/centre/credits` for `center_manager` and `campus_manager` users.
  - Resolves the caller's `center_id` from `profiles`.
  - Returns the center wallet with zero defaults when no wallet row exists.
  - Returns the latest 50 grants with beneficiary `prenom`, `nom`, and `email`.
- Added `POST /api/centre/credits`.
  - Validates beneficiary, credit type, quantity, source, and optional payment details.
  - Restricts beneficiaries to the manager's center.
  - Returns HTTP 409 with `{ "error": "INSUFFICIENT_STOCK" }` when stock is unavailable.
  - Returns the updated wallet, grant row, and beneficiary quota totals.
- Added the `grant_center_ai_credits` service-role RPC.
  - Locks the beneficiary and wallet rows.
  - Atomically debits generic or typed stock, increments the mapped profile total, and inserts the grant.
  - Revalidates the credit-type/profile-column mapping inside PostgreSQL.
  - Does not modify any `*_used` counter.
- Added focused parser tests for normal grants, paid grants, and invalid input.

## Files

- `academie-langues/app/api/centre/credits/route.ts`
- `academie-langues/app/api/centre/credits/route.core.mjs`
- `academie-langues/app/api/centre/credits/route.core.d.ts`
- `academie-langues/app/api/centre/credits/route.core.test.mjs`
- `academie-langues/supabase-center-ai-credits.sql`

## Verification

- Red phase: the new parser test failed because `route.core.mjs` did not exist.
- `npm test`: 56 tests passed, 0 failed.
- `npx tsc --noEmit`: passed with exit code 0.

## Deployment note

Apply the updated `academie-langues/supabase-center-ai-credits.sql` before calling the POST route. The database-backed smoke scenario requires a configured Supabase environment and was not run locally.
