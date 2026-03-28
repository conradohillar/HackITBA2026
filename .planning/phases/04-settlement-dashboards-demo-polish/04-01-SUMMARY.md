---
phase: 04-settlement-dashboards-demo-polish
plan: 01
subsystem: database
tags: [supabase, postgres, settlement, rpc, vitest, ledger]
requires:
  - phase: 03-marketplace-funding
    provides: Funding RPC, sold fractions, invoice lifecycle transitions, and investor purchase ledger rows
provides:
  - DB-backed `settle_invoice()` settlement boundary with pro-rata payout writes
  - Funding-close disbursement ledger emission inside `fund_invoice()`
  - Typed settlement contracts plus regression coverage for lifecycle and remainder-safe distribution
affects: [phase-4-plan-02, phase-4-plan-03, phase-4-plan-04, dashboards, invoice-detail, verifier]
tech-stack:
  added: [no new dependencies]
  patterns: [server-action-to-rpc settlement flow, db-owned payout math, tdd settlement regression coverage]
key-files:
  created: [src/lib/settlement/types.ts, src/lib/settlement/actions.ts, src/lib/settlement/distribution.ts, supabase/migrations/0006_phase4_settlement.sql, tests/invoices/settle-invoice.test.ts, tests/settlement/distribution.test.ts]
  modified: [none]
key-decisions:
  - "Kept settlement as a single Supabase RPC so lifecycle transitions, row locks, and ledger writes stay in one transactional boundary."
  - "Extended `fund_invoice()` to emit the cedente disbursement at 100% funding and let `settle_invoice()` backfill it only when historical funded invoices are missing that row."
  - "Used last-fraction remainder handling for interest allocation so settlement totals always equal the invoice spread to the cent."
patterns-established:
  - "Pattern 1: settlement writes flow through a Zod-validated server action that only orchestrates auth and revalidation, never direct table mutations."
  - "Pattern 2: financial distribution math must be proven with targeted tests and executed by the database boundary, not React components."
requirements-completed: [SETT-01, SETT-02, SETT-03]
duration: 10min
completed: 2026-03-28
---

# Phase 4 Plan 1: Add the DB-backed settlement/disbursement boundary and settlement action with regression coverage Summary

**Supabase settlement RPCs now close the funding lifecycle with exact cedente disbursement, pro-rata investor payout ledger rows, and typed server-action contracts for Phase 4 surfaces.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-28T11:17:42Z
- **Completed:** 2026-03-28T11:27:46Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added shared Phase 4 settlement contracts so server actions, read models, and detail surfaces can rely on one typed payload shape.
- Locked down settlement lifecycle, funding-close disbursement, and cent-safe payout rules with red-to-green Vitest coverage.
- Implemented the `settle_invoice()` RPC plus authenticated `settleInvoiceAction()` and extended `fund_invoice()` to emit a single cedente disbursement ledger row.

## Task Commits

Each task was committed atomically:

1. **Task 0: Write settlement interface contracts** - `02b8f45` (feat)
2. **Task 1: Lock down settlement lifecycle and pro-rata payout behavior in tests** - `4fc8fd4` (test)
3. **Task 2: Implement the DB settlement boundary and authenticated trigger** - `3895aa9` (feat)

## Files Created/Modified
- `src/lib/settlement/types.ts` - shared settlement action/result and ledger-facing contract types
- `src/lib/settlement/actions.ts` - Zod-validated settlement server action and RPC orchestration
- `src/lib/settlement/distribution.ts` - deterministic remainder-safe distribution helper used by regression tests
- `supabase/migrations/0006_phase4_settlement.sql` - Phase 4 funding-close disbursement and settlement RPC boundary
- `tests/invoices/settle-invoice.test.ts` - integration coverage for lifecycle, backfill, and duplicate-disbursement safety
- `tests/settlement/distribution.test.ts` - unit coverage for cent-safe interest allocation

## Decisions Made
- Kept the settlement write path inside Supabase RPCs so invoice transitions, fraction locking, and transaction inserts stay atomic.
- Emitted `disbursement_to_cedente` at funding close for new invoices and treated settlement-time insertion as a backfill-only path.
- Returned normalized settlement totals from the RPC/action so upcoming dashboard and detail plans can consume one stable result shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed an ambiguous `invoice_id` reference inside `settle_invoice()`**
- **Found during:** Task 2 (Implement the DB settlement boundary and authenticated trigger)
- **Issue:** The first settlement implementation used unqualified `invoice_id` references in a `RETURNS TABLE` function, which caused PostgreSQL to treat the output column and table column as ambiguous and reject live settlement calls.
- **Fix:** Qualified the sold-fraction queries with explicit table aliases and re-applied the migration.
- **Files modified:** `supabase/migrations/0006_phase4_settlement.sql`
- **Verification:** `npx vitest run tests/settlement/distribution.test.ts tests/invoices/settle-invoice.test.ts`
- **Committed in:** `3895aa9`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required for the new RPC to execute successfully and did not expand scope beyond the settlement boundary promised by the plan.

## Issues Encountered
- The first green-pass SQL implementation failed against the live database because `RETURNS TABLE` output names shadowed unqualified query columns inside `settle_invoice()`.
- ESLint’s flat-config CLI rejected the older `--file` flag, so direct file paths were used for targeted lint verification instead.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 dashboard and timeline plans can now read one trusted settlement ledger backed by `transactions`, `fractions`, and invoice lifecycle events.
- Upcoming detail/dashboard work can consume `SettlementActionResult` directly and assume funded invoices now carry a cedente disbursement row even when funding just completed.

## Self-Check: PASSED

---
*Phase: 04-settlement-dashboards-demo-polish*
*Completed: 2026-03-28*
