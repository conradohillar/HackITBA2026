---
phase: 03-marketplace-funding
plan: 02
subsystem: database
tags: [postgres, supabase, rpc, realtime, funding, vitest]
requires:
  - phase: 02-invoice-origination-risk-engine
    provides: Funding-ready invoices, fractions, and enforced invoice transitions
  - phase: 03-marketplace-funding
    provides: Marketplace contracts and funding read models
provides:
  - Atomic `fund_invoice()` purchase boundary with row locking
  - Fraction purchase audit trigger and supporting indexes
  - Realtime publication enablement for funding invoice views
affects: [marketplace-ui, server-actions, realtime, validation]
tech-stack:
  added: [no new dependencies]
  patterns: [database-owned funding writes, lock-first purchase flow, invoice-centric realtime publication]
key-files:
  created: [supabase/migrations/0005_phase3_marketplace_funding.sql, tests/invoices/fund-invoice.test.ts]
  modified: []
key-decisions:
  - "Kept `fund_invoice()` as the only purchase write path so investor flows never perform app-level read-then-write mutations."
  - "Rejected short supply requests instead of partially filling so demo behavior stays deterministic under contention."
  - "Published `invoices` and `fractions` together so dashboard progress and detail views share one realtime source of truth."
patterns-established:
  - "Pattern 1: funding purchases lock the invoice row and candidate fractions in the same RPC before any state change."
  - "Pattern 2: fraction sales emit append-only audit events via trigger, not ad hoc app logging."
requirements-completed: [FUND-02, FUND-03, FUND-05]
duration: 6min
completed: 2026-03-28
---

# Phase 3 Plan 2: Add the DB-enforced `fund_invoice()` boundary, locking, and publication enablement Summary

**Atomic investor funding now runs through a locked Supabase RPC that writes sold fractions, ledger rows, audit events, and realtime-ready invoice progress without overselling.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T10:24:00Z
- **Completed:** 2026-03-28T10:30:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added a hosted-database Vitest suite that proves concurrent funding requests cannot oversell an invoice.
- Implemented `public.fund_invoice()` with investor auth checks, row locking, exact-fill rejection, transaction inserts, and automatic `funded` transition.
- Enabled fraction purchase audit logging plus `supabase_realtime` publication for `invoices` and `fractions`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author concurrency-first funding boundary tests** - `a2bfc86` (test)
2. **Task 2: Implement the atomic `fund_invoice()` migration, purchase trigger, and realtime publication** - `2695bfb` (feat)

## Files Created/Modified
- `tests/invoices/fund-invoice.test.ts` - hosted integration coverage for oversell protection, exact-fill rejection, and funded ledger assertions
- `supabase/migrations/0005_phase3_marketplace_funding.sql` - funding RPC, fraction purchase trigger, realtime publication, and funding indexes

## Decisions Made
- Used `FOR UPDATE` on the invoice row plus `FOR UPDATE SKIP LOCKED` on ordered available fractions so concurrent buyers cannot claim the same inventory.
- Raised a clear availability error when fewer fractions remain than requested instead of silently partially fulfilling.
- Inserted one `fraction_purchase` ledger row per sold fraction so Phase 4 settlement has a complete append-only funding trail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Seeded the new DB tests with the now-required invoice description field**
- **Found during:** Task 1 (Author concurrency-first funding boundary tests)
- **Issue:** The hosted schema rejected the test invoice seed because invoices now require `description`, causing the RED phase to fail for the wrong reason.
- **Fix:** Added a valid description to the test invoice factory so the suite fails only on the missing `fund_invoice()` boundary.
- **Files modified:** `tests/invoices/fund-invoice.test.ts`
- **Verification:** `npx vitest run tests/invoices/fund-invoice.test.ts`
- **Committed in:** `a2bfc86`

**2. [Rule 1 - Bug] Qualified the invoice counter update inside `fund_invoice()`**
- **Found during:** Task 2 (Implement the atomic `fund_invoice()` migration, purchase trigger, and realtime publication)
- **Issue:** The first RPC version hit `column reference "funded_fractions" is ambiguous` because the RETURNS TABLE output name shadowed the invoice column during the counter update.
- **Fix:** Qualified the invoice update with an explicit table alias so the funding counter increments correctly inside the RPC.
- **Files modified:** `supabase/migrations/0005_phase3_marketplace_funding.sql`
- **Verification:** `npx vitest run tests/invoices/fund-invoice.test.ts`
- **Committed in:** `2695bfb`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required to make the planned database boundary verifiable and correct. No scope creep.

## Issues Encountered
- The hosted schema already included the Phase 2 description requirement, so seed fixtures had to match production invariants.
- The initial RPC implementation conflicted with PL/pgSQL output-column names; aliasing the invoice table resolved it cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 can now call `supabase.rpc('fund_invoice', ...)` from a validated server action.
- Marketplace realtime work can subscribe to published `invoices` and `fractions` instead of polling only.

## Self-Check: PASSED

---
*Phase: 03-marketplace-funding*
*Completed: 2026-03-28*
