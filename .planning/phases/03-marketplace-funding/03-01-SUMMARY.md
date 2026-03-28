---
phase: 03-marketplace-funding
plan: 01
subsystem: api
tags: [marketplace, funding, vitest, supabase, investor]
requires:
  - phase: 02-invoice-origination-risk-engine
    provides: Funding-ready invoices with token hashes, net amounts, and fractions
provides:
  - Shared marketplace contracts for investor-facing funding data
  - Centralized funding progress and expected return math
  - RLS-safe investor marketplace and invoice detail query layer
affects: [marketplace-ui, funding-rpc, realtime, settlement]
tech-stack:
  added: [no new dependencies]
  patterns: [shared funding math helpers, investor read model via server queries, injectable query dependencies for tests]
key-files:
  created: [src/lib/marketplace/types.ts, src/lib/marketplace/calculations.ts, src/lib/marketplace/queries.ts, tests/marketplace/progress.test.ts, tests/marketplace/returns.test.ts, tests/marketplace/queries.test.ts]
  modified: []
key-decisions:
  - "Kept marketplace contracts type-only so later UI and realtime plans can consume one stable data shape."
  - "Computed expected return from fraction net amount versus invoice net and face value so previews stay aligned with future settlement math."
  - "Made marketplace queries dependency-injectable so Vitest can cover server reads without a Next.js request context."
patterns-established:
  - "Pattern 1: investor funding calculations live in one shared server helper module with cent-level regression coverage."
  - "Pattern 2: marketplace pages should consume invoice-card and funding-snapshot contracts from `src/lib/marketplace/*` rather than ad hoc joins."
requirements-completed: [FUND-01, FUND-03, FUND-04]
duration: 5min
completed: 2026-03-28
---

# Phase 3 Plan 1: Define marketplace contracts, expected-return math, and investor funding queries Summary

**Investor marketplace reads now share typed funding contracts, centralized return math, and a single server query layer for listing and invoice snapshots.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T10:14:13Z
- **Completed:** 2026-03-28T10:19:13Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Added shared marketplace card, funding snapshot, and purchase summary contracts.
- Centralized funding progress, expected return, interest, and checkout calculations with dedicated Vitest coverage.
- Implemented investor-only marketplace listing and detail snapshot queries that precompute funding-ready metrics.

## Task Commits

Each task was committed atomically:

1. **Task 0: Write marketplace interface contracts** - `fde2df0` (feat)
2. **Task 1: Implement shared funding progress and expected return calculations** - `8ef477b` (test), `c20a865` (feat)
3. **Task 2: Build the investor marketplace and detail read model** - `e23d8d5` (test), `199b7c6` (feat)

## Files Created/Modified
- `src/lib/marketplace/types.ts` - shared contracts for investor marketplace cards, snapshots, and purchase totals
- `src/lib/marketplace/calculations.ts` - funding progress, expected return, interest, and checkout summary helpers
- `src/lib/marketplace/queries.ts` - investor marketplace listing and invoice funding snapshot query layer
- `tests/marketplace/progress.test.ts` - progress rounding regression coverage
- `tests/marketplace/returns.test.ts` - expected return and checkout summary regression coverage
- `tests/marketplace/queries.test.ts` - investor read-model coverage and unauthorized lookup protection

## Decisions Made
- Kept the marketplace read model invoice-centric so dashboard cards can rely on `funded_fractions` instead of joining live fraction streams.
- Reused the Phase 3 research formula `fraction.net_amount / invoice.net_amount * invoice.amount` for display-time expected returns.
- Added dependency injection seams to the query layer so tests stay fast and do not depend on Next request-scoped cookies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed Next request-scope coupling from marketplace query tests**
- **Found during:** Task 2 (Build the investor marketplace and detail read model)
- **Issue:** Vitest hit Next's `cookies()` request-scope guard before injected query mocks could run.
- **Fix:** Refactored default marketplace query dependencies to create the Supabase server client lazily and allow full dependency injection in tests.
- **Files modified:** `src/lib/marketplace/queries.ts`
- **Verification:** `npx vitest run tests/marketplace/queries.test.ts tests/marketplace/progress.test.ts tests/marketplace/returns.test.ts`
- **Committed in:** `199b7c6`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The auto-fix kept the planned query layer intact while making its regression tests executable outside Next request scope.

## Issues Encountered
- Vitest initially failed because default server-query setup touched `cookies()` too early; resolved by lazily creating the Supabase dependency.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 UI plans can now consume stable marketplace contracts and trusted progress/return helpers.
- The funding RPC and realtime plans can reuse the same invoice snapshot shape without re-deriving percentages or return math.

## Self-Check: PASSED

---
*Phase: 03-marketplace-funding*
*Completed: 2026-03-28*
