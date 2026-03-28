---
phase: 01-foundation-auth
plan: 05
subsystem: auth
tags: [rls, rbac, proxy, nextjs, playwright]
requires:
  - phase: 01-foundation-auth
    provides: Auth flow, schema migration, and shared session helpers
provides:
  - RLS coverage across all six foundation tables
  - Proxy and server-side role guards for protected cedente and inversor routes
  - Desktop and mobile RBAC regression coverage for browser redirects
affects: [dashboards, marketplace, transactions, verification]
tech-stack:
  added: [proxy.ts, Supabase RLS policies]
  patterns: [defense-in-depth auth via proxy plus layout guards plus RLS]
key-files:
  created: [supabase/migrations/0002_rls_and_rbac.sql, proxy.ts, src/lib/auth/guards.ts]
  modified: [tests/db/rls-policies.test.ts, tests/e2e/rbac.spec.ts]
key-decisions:
  - "Kept browser redirects optimistic in proxy.ts but duplicated hard authorization in server layouts and Postgres RLS."
  - "Denied anonymous access by revoking table privileges rather than relying on empty-policy behavior alone."
patterns-established:
  - "Pattern 1: protected role areas live under /cedente and /inversor and are guarded in proxy plus layout."
  - "Pattern 2: RLS tests authenticate real users against the hosted project to verify role isolation end-to-end."
requirements-completed: [USER-04]
duration: 28min
completed: 2026-03-28
---

# Phase 1 Plan 5: Enforce RBAC across proxy/server guards and database RLS policies Summary

**Proxy redirects, server layouts, and RLS policies now work together so anonymous users and wrong-role users cannot reach protected Phase 1 data or routes.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-03-28T09:12:30Z
- **Completed:** 2026-03-28T09:40:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Enabled RLS on all six foundation tables and added explicit role/ownership policies plus grants.
- Added `proxy.ts`, role guards, and protected layouts so route-level redirects happen before protected pages render.
- Verified RBAC with live DB tests and browser redirects on both desktop and mobile, including Playwright MCP checks.

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply and test RLS policies for all foundation tables** - `9feb21f` (feat)
2. **Task 2: Add proxy redirects and verify RBAC on desktop and mobile** - `025473d` (feat)

## Files Created/Modified
- `supabase/migrations/0002_rls_and_rbac.sql` - enables RLS, grants, and role-aware policies
- `proxy.ts` - optimistic session refresh and route-level role redirects
- `src/lib/auth/guards.ts` - server-side hard authorization helper
- `src/app/(cedente)/layout.tsx` - cedente layout guard
- `src/app/(inversor)/layout.tsx` - inversor layout guard
- `tests/db/rls-policies.test.ts` - verifies anon denial, self-profile reads, and investor marketplace visibility
- `tests/e2e/rbac.spec.ts` - verifies anonymous and wrong-role browser redirects

## Decisions Made
- Revoked table privileges for `anon` and `authenticated` first, then granted back only the minimum operations the current phase needs.
- Left `bcra_cache` with RLS enabled and no user-facing grants so future server-side integrations can own it without accidental client exposure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated anon-denial assertions to match real Postgres permission behavior**
- **Found during:** Task 1 (Apply and test RLS policies for all foundation tables)
- **Issue:** The initial RLS regression assumed anonymous reads would return empty arrays, but the combination of revoked grants plus RLS correctly returned `permission denied` errors instead.
- **Fix:** Tightened the test to assert explicit permission-denied failures for anonymous access attempts.
- **Files modified:** `tests/db/rls-policies.test.ts`
- **Verification:** `npx vitest run tests/db/rls-policies.test.ts`
- **Committed in:** `9feb21f` (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The security posture stayed stricter than planned and the test suite now reflects the actual enforcement semantics.

## Issues Encountered
- Parallel Playwright runs can contend for the local dev server port, so the RBAC desktop/mobile suite was executed sequentially after the config stabilized.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Protected pages are now safe to expand with real data queries.
- Phase 1 has the required defense-in-depth foundation for later marketplace and settlement work.

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-28*
