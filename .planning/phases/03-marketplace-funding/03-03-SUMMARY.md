---
phase: 03-marketplace-funding
plan: 03
subsystem: ui
tags: [nextjs, server-actions, realtime, polling, react, vitest]
requires:
  - phase: 03-marketplace-funding
    provides: Atomic funding RPC, marketplace contracts, and funding calculations
provides:
  - Validated investor purchase server action for `fund_invoice`
  - Realtime subscription controller with 2-second polling fallback
  - Shared funding progress, return preview, and connection-status components
affects: [marketplace-dashboard, investor-detail, e2e-validation]
tech-stack:
  added: [no new dependencies]
  patterns: [server-action-to-rpc funding writes, controller-based realtime fallback, reusable funding display widgets]
key-files:
  created: [src/lib/marketplace/actions.ts, src/hooks/use-marketplace-realtime.ts, src/components/marketplace/funding-progress-bar.tsx, src/components/marketplace/expected-return-preview.tsx, src/components/marketplace/realtime-status.tsx, tests/marketplace/realtime.test.ts]
  modified: []
key-decisions:
  - "Kept purchase validation in a server action so UI code never calls `fund_invoice` directly from the browser."
  - "Mode switching lives in a small controller so Vitest can verify realtime and polling behavior without rendering React."
  - "Funding widgets consume shared calculation helpers instead of re-implementing progress or return math in JSX."
patterns-established:
  - "Pattern 1: marketplace clients subscribe to invoice updates first and only fall back to 2-second polling when the channel is unhealthy."
  - "Pattern 2: purchase forms should call `purchaseFractionsAction()` and surface the returned success/error copy without duplicating auth checks."
requirements-completed: [FUND-02, FUND-03, FUND-04, FUND-05]
duration: 8min
completed: 2026-03-28
---

# Phase 3 Plan 3: Wire purchase actions, realtime subscriptions, and polling fallback primitives Summary

**Investor funding now flows through one validated server action while marketplace clients can stay live on Supabase subscriptions and degrade visibly to polling when channels fail.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T10:30:24Z
- **Completed:** 2026-03-28T10:38:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `purchaseFractionsAction()` plus a testable `purchaseFractions()` helper that validates payloads and investor identity before calling `fund_invoice`.
- Built a reusable realtime controller and `useMarketplaceRealtime()` hook that switch cleanly between `connecting`, `live`, and `polling` modes.
- Added shared progress, return-preview, and realtime-status components for upcoming dashboard and detail screens.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement the purchase action and realtime fallback state machine** - `1e7932c` (test), `d39e5e5` (feat)
2. **Task 2: Build shared funding UI primitives for progress, returns, and channel status** - `9aa2033` (feat)

## Files Created/Modified
- `tests/marketplace/realtime.test.ts` - regression coverage for purchase validation, live patching, and polling fallback
- `src/lib/marketplace/actions.ts` - validated server action boundary for investor purchases
- `src/hooks/use-marketplace-realtime.ts` - realtime controller, patch helper, and React hook
- `src/components/marketplace/funding-progress-bar.tsx` - reusable invoice funding progress widget
- `src/components/marketplace/expected-return-preview.tsx` - reusable purchase total and return preview widget
- `src/components/marketplace/realtime-status.tsx` - visible live versus fallback status chip

## Decisions Made
- Returned structured success/error payloads from the purchase action so forms can show precise feedback without inferring RPC failures.
- Kept the realtime controller separate from the hook so fallback behavior is unit-testable outside a browser renderer.
- Reused the Phase 3 calculation helpers in every new widget so future marketplace pages stay numerically consistent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected the test inputs so validation and authorization failures were isolated**
- **Found during:** Task 1 (Implement the purchase action and realtime fallback state machine)
- **Issue:** The first test draft used non-UUID invoice IDs, so Zod validation failed before the non-investor authorization branch could be exercised.
- **Fix:** Updated the auth-related test cases to use a valid UUID while leaving the explicit invalid-payload case intact.
- **Files modified:** `tests/marketplace/realtime.test.ts`
- **Verification:** `npx vitest run tests/marketplace/realtime.test.ts tests/invoices/fund-invoice.test.ts`
- **Committed in:** `d39e5e5`

**2. [Rule 1 - Bug] Fixed the realtime controller unsubscribe typing for production builds**
- **Found during:** Task 2 (Build shared funding UI primitives for progress, returns, and channel status)
- **Issue:** `next build` failed because the controller initialized `unsubscribe` with a narrower `() => undefined` type than the actual cleanup callbacks.
- **Fix:** Widened the cleanup function to `() => void`, matching the runtime behavior of Supabase channel teardown.
- **Files modified:** `src/hooks/use-marketplace-realtime.ts`
- **Verification:** `npm run build && npx vitest run tests/marketplace/progress.test.ts tests/marketplace/returns.test.ts tests/marketplace/realtime.test.ts tests/invoices/fund-invoice.test.ts`
- **Committed in:** `d39e5e5`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** The fixes kept the planned server-action and realtime design intact while making the new primitives testable and build-safe.

## Issues Encountered
- The first build surfaced a cleanup-function typing mismatch in the new realtime controller.
- Purchase validation tests needed one valid UUID path so auth checks could be exercised independently from schema validation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 04 can now assemble `/inversor/dashboard` and the investor detail page using stable action, realtime, and widget primitives.
- Phase 3 browser verification can assert a visible live/fallback status chip instead of guessing channel health.

## Self-Check: PASSED

---
*Phase: 03-marketplace-funding*
*Completed: 2026-03-28*
