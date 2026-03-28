---
phase: 01-foundation-auth
plan: 03
subsystem: database
tags: [supabase, postgres, plpgsql, triggers, audit]
requires:
  - phase: 01-foundation-auth
    provides: Supabase SSR contracts and runnable Vitest harnesses
provides:
  - Versioned foundation schema for profiles, invoices, fractions, transactions, events, and bcra_cache
  - DB-owned profile bootstrap, invoice transition, and append-only audit invariants
  - Automated regression tests against the live Supabase project for lifecycle and audit correctness
affects: [auth, rbac, marketplace, settlement]
tech-stack:
  added: [Supabase migration 0001, plpgsql trigger functions]
  patterns: [db-owned lifecycle function, append-only audit triggers, auth.users to profiles bootstrap]
key-files:
  created: [supabase/migrations/0001_foundation_schema.sql]
  modified: [tests/db/transition-invoice.test.ts, tests/db/events-append-only.test.ts, tests/auth/auth-actions.test.ts, vitest.config.ts]
key-decisions:
  - "Kept roles limited to cedente and inversor in the initial schema to match the Phase 1 scope exactly."
  - "Used a DB-owned transition_invoice() function plus append-only triggers so lifecycle and audit invariants do not depend on application code."
patterns-established:
  - "Pattern 1: schema changes live in numbered Supabase SQL migrations committed to git."
  - "Pattern 2: database invariants are regression-tested against the actual Supabase project when local Docker is unavailable."
requirements-completed: [INV-02, AUDIT-01]
duration: 24min
completed: 2026-03-28
---

# Phase 1 Plan 3: Create the versioned Supabase schema, transition function, and audit invariants Summary

**A versioned Supabase schema now enforces invoice lifecycle transitions, profile bootstrap, and append-only audit logging from the database layer itself.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-28T08:13:30Z
- **Completed:** 2026-03-28T08:37:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added the first Supabase migration with all six Phase 1 foundation tables, enums, indexes, and helper functions.
- Implemented `handle_new_user()` and `transition_invoice()` so profile bootstrap and invoice lifecycle correctness live in Postgres.
- Replaced placeholder harness checks with live Supabase regression tests that prove invalid transitions fail, valid transitions emit events, and the profile trigger honors signup metadata.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the foundational Supabase migration** - `77e1f6e` (test), `6b5c66b` (feat)
2. **Task 2: Implement DB tests for lifecycle, audit, and profile bootstrap invariants** - `017af7a` (test)

## Files Created/Modified
- `supabase/migrations/0001_foundation_schema.sql` - creates Phase 1 schema, triggers, indexes, and lifecycle functions
- `tests/db/transition-invoice.test.ts` - proves invalid transitions are rejected and valid ones succeed
- `tests/db/events-append-only.test.ts` - proves transition events are written and later mutation is blocked
- `tests/auth/auth-actions.test.ts` - proves signup metadata matches the profile bootstrap trigger contract
- `vitest.config.ts` - loads `.env.local` so DB tests can execute against the configured Supabase project

## Decisions Made
- Used append-only triggers on both `events` and `transactions` immediately so audit expectations are baked in before marketplace logic exists.
- Validated the migration against the hosted Supabase project because the local Docker-based Supabase stack was unavailable in this environment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched migration verification from local Docker to the hosted Supabase project**
- **Found during:** Task 1 (Author the foundational Supabase migration)
- **Issue:** `npx supabase db lint` and `npx supabase migration up --local` could not run because Docker/local Postgres was unavailable on this machine.
- **Fix:** Applied the migration with Supabase MCP to the existing project and ran live Vitest invariants against that database instead.
- **Files modified:** `supabase/migrations/0001_foundation_schema.sql`, `vitest.config.ts`, `tests/db/transition-invoice.test.ts`, `tests/db/events-append-only.test.ts`, `tests/auth/auth-actions.test.ts`
- **Verification:** `npx vitest run tests/db/transition-invoice.test.ts tests/db/events-append-only.test.ts tests/auth/auth-actions.test.ts`; Supabase tables present via MCP inspection
- **Committed in:** `6b5c66b`, `017af7a`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The validation path changed, but the migration and invariants were still exercised against the real Phase 1 database target.

## Issues Encountered
- The remote audit tests proved that append-only enforcement also prevents test cleanup of event rows; this is acceptable for now but later demo data curation should account for historical audit records.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth screens can now rely on automatic profile creation from signup metadata.
- RBAC/RLS work has the full schema surface and lifecycle function it needs.

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-28*
