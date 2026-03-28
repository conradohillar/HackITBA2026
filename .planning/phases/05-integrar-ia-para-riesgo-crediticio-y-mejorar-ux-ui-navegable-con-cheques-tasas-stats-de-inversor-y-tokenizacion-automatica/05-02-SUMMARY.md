---
phase: 05-integrar-ia-para-riesgo-crediticio-y-mejorar-ux-ui-navegable-con-cheques-tasas-stats-de-inversor-y-tokenizacion-automatica
plan: 02
subsystem: api
tags: [investor-dashboard, marketplace, read-model, analytics, cheque]
requires:
  - phase: 04-settlement-dashboards-demo-polish
    provides: Investor dashboards, marketplace funding math, and settlement read models
provides:
  - Investor dashboard analytics for open return, realized return, concentration, and status mix
  - Cheque-centric marketplace card contract with payer, maturity, and per-fraction economics
  - Shared query-layer math that keeps React presentation-only
affects: [phase-05-plan-03, phase-05-plan-04, verifier, investor-demo]
tech-stack:
  added: [no new dependencies]
  patterns: [query-layer analytics, shared marketplace card contracts, deterministic maturity math]
key-files:
  created: []
  modified: [src/lib/settlement/queries.ts, src/lib/marketplace/types.ts, src/lib/marketplace/read-model.ts, src/lib/marketplace/queries.ts, tests/dashboard/queries.test.ts, tests/marketplace/queries.test.ts, tests/marketplace/returns.test.ts]
key-decisions:
  - "Kept all investor outcome math in server/query utilities so the UI only formats stable analytics fields."
  - "Promoted per-fraction economics into `MarketplaceInvoiceCard` so dashboard cards and detail routes share one contract."
patterns-established:
  - "Pattern 1: investor dashboard analytics should expose both portfolio totals and status breakdowns from the read model."
  - "Pattern 2: cheque-card contracts should include raw facts plus derived economics so server and browser refresh paths stay aligned."
requirements-completed: [UX-02, UX-03]
duration: 7min
completed: 2026-03-28
---

# Phase 5 Plan 2: Investor analytics and cheque-card contracts now ship from the query layer Summary

**Investor dashboards and marketplace cards now share richer server-shaped analytics, maturity facts, and per-fraction economics without recreating math in React.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T14:43:00Z
- **Completed:** 2026-03-28T14:50:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added open-return, realized-return, concentration, and holdings-by-status analytics to `getInvestorDashboard()`.
- Extended marketplace invoice cards with payer CUIT, maturity, progress, and per-fraction economics.
- Locked the new contracts with updated dashboard and marketplace Vitest coverage.

## Task Commits

Implemented in one contract-focused commit because both tasks changed the shared server shapes together:

1. **Task 1: Enrich the investor dashboard read model with portfolio outcomes** - `c492179` (feat)
2. **Task 2: Extend the marketplace card contract with cheque facts and per-fraction economics** - `c492179` (feat)

## Files Created/Modified
- `src/lib/settlement/queries.ts` - richer investor analytics payload
- `src/lib/marketplace/types.ts` - expanded cheque-card contract
- `src/lib/marketplace/read-model.ts` - derived maturity, progress, and per-fraction economics
- `src/lib/marketplace/queries.ts` - payer CUIT selection for shared marketplace reads
- `tests/dashboard/queries.test.ts` - investor analytics regression coverage
- `tests/marketplace/queries.test.ts` - card and snapshot contract assertions
- `tests/marketplace/returns.test.ts` - return math coverage retained for the richer contract

## Decisions Made
- Calculated `expectedOpenReturn` as total expected payout for still-open holdings so the landing page speaks in investor-facing outcome terms.
- Derived `progressPercentage` and maturity directly inside the read model so realtime refreshes reuse the same math as SSR.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The two planned tasks touched the same shared contract surface, so they were shipped together in one query-layer commit to avoid churn between intermediate shapes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The investor UI can now render cheque-style cards and richer dashboard strips without inventing its own calculations.
- Phase 5 browser validation has stable fields to assert for returns, maturity, and progress on both dashboard and detail routes.

## Self-Check: PASSED

---
*Phase: 05-integrar-ia-para-riesgo-crediticio-y-mejorar-ux-ui-navegable-con-cheques-tasas-stats-de-inversor-y-tokenizacion-automatica*
*Completed: 2026-03-28*
