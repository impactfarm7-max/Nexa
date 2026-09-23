# Jury / Passage de niveau — Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes track progress.

**Goal:** Harden per-student passage (LMD ajourne suggestion, block on provisional grades, rattrapage CTA), then add a promo-scoped Jury board with immediate bulk decisions.

**Architecture:** Reuse `passage-niveau` decide/reopen. Extend LMD suggestion to `admis|redouble|ajourne`. Add GET list + thin batch POST for promo. UI under Examens → Jury.

**Tech Stack:** Next.js App Router, Supabase admin, existing centre UI patterns.

**Spec:** Chat design 2026-09-23 — Option C = A then B; jury 1A (by promo) + 2A (immediate decide).

## Global Constraints

- University cursus only; least-privilege trainers cannot decide passage.
- Hard-block decide if any grade for the enrollment is `provisional` (no override in v1).
- No PV / draft / multi-promo jury in v1.
- Reopen remains ajourne-only.

---

## File map

| File | Role |
|------|------|
| `app/utils/lmd-results.ts` | Suggestion includes ajourne |
| `app/utils/cursus-passage.ts` | Shared suggestion type helper if needed |
| `app/api/centre/passage-niveau/route.ts` | Provisional guard; GET `groupe_id` list; POST batch |
| `app/components/centre/students/PassageNiveauPanel.tsx` | Show ajourne suggestion + rattrapage CTA |
| `app/centre/examens/jury/page.tsx` | New Jury board UI |
| examens hub / nav | Link to Jury |
| `*.test.mjs` | LMD suggestion + provisional guard helpers |

---

### Task 1 — LMD suggestion ajourne

- [x] Update `computeLmdProgress` suggestion: pending/unconfigured → null; no failures → admis; failures → **ajourne** (staff can still pick redouble).
- [x] Update `lmd-results.test.mjs`.
- [x] Update PassageNiveauPanel suggestion colors/labels for ajourne.

### Task 2 — Block provisional grades on decide

- [x] In POST `passage-niveau`, if any grade for enrollment has status provisional → 409 `GRADES_PROVISIONAL`.
- [x] GET preview returns `provisional_grades_count` + `can_decide` false when > 0.
- [x] Panel shows message pointing to Examens → Notes validation.

### Task 3 — Ajourné → rattrapage CTA

- [x] When `passage_decision === ajourne`, show CTA to open LMD panel / recover (or link text to dossier Notes rattrapage).

### Task 4 — Jury API (promo list + batch)

- [x] GET `?groupe_id=` returns rows for jury board.
- [x] Bulk via client loop on existing POST decide (immediate 2A).

### Task 5 — Jury UI page

- [x] `/centre/examens/jury` — filters + table + bulk actions.
- [x] Wire nav from examens hub.
- [ ] i18n keys FR/EN (inline locale for v1 hub/jury copy).

### Task 6 — Verify

- [x] `tsc` + focused tests.
- [ ] Commit when user asks.
