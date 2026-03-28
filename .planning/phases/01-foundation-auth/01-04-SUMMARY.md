---
phase: 01-foundation-auth
plan: 04
subsystem: auth
tags: [supabase-auth, server-actions, react-hook-form, zod, playwright]
requires:
  - phase: 01-foundation-auth
    provides: Schema migration with profiles trigger and shared SSR auth contracts
provides:
  - Immediate-login signup, login, logout, and confirm-link fallback flows
  - Role-select auth screens wired to cedente and inversor dashboards
  - Desktop and mobile signup/login regression coverage plus MCP browser verification
affects: [rbac, dashboards, deployment]
tech-stack:
  added: [server actions, react-hook-form + zod auth UI]
  patterns: [admin-assisted confirmed signup on server, role-based dashboard resolution]
key-files:
  created: [src/lib/auth/actions.ts, src/lib/auth/session.ts, src/components/auth/signup-form.tsx, src/app/auth/confirm/route.ts]
  modified: [src/app/(public)/signup/page.tsx, src/app/(public)/login/page.tsx, tests/e2e/auth-signup.spec.ts, playwright.config.ts]
key-decisions:
  - "Resolved dashboard routing from profile role data so both signup and login share one redirect contract."
  - "Kept /auth/confirm as a recovery path while making immediate-login signup the primary demo experience."
patterns-established:
  - "Pattern 1: auth forms use react-hook-form + zod on the client and server actions on the backend."
  - "Pattern 2: dashboard pages render authenticated profile context and expose server-action logout."
requirements-completed: [USER-01]
duration: 35min
completed: 2026-03-28
---

# Phase 1 Plan 4: Implement immediate-login role-select auth flow with desktop/mobile coverage Summary

**Immediate role-select signup now creates a confirmed Supabase account, signs the user in on the server, and lands them on the correct cedente or inversor dashboard on desktop and mobile.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-28T08:37:30Z
- **Completed:** 2026-03-28T09:12:30Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Added server-side signup, login, logout, and confirm-link flows on top of the shared Supabase SSR boundary.
- Built client-side login and signup forms with role selection, inline validation, and role-aware dashboard redirects.
- Verified the happy path with Playwright CLI on desktop and mobile and repeated the flow manually through the Playwright MCP at desktop and mobile widths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement server-side auth actions with immediate-login signup default** - `561e151` (feat)
2. **Task 2: Build auth screens and verify signup flow on desktop and mobile** - `05654af` (feat)

## Files Created/Modified
- `src/lib/auth/actions.ts` - server actions for signup, login, and logout
- `src/lib/auth/session.ts` - shared dashboard-path and current-auth helpers
- `src/app/auth/confirm/route.ts` - confirm-link recovery route
- `src/components/auth/login-form.tsx` - login form with zod + react-hook-form validation
- `src/components/auth/signup-form.tsx` - role-select signup form with immediate redirect behavior
- `src/app/(public)/login/page.tsx` - login experience copy and layout
- `src/app/(public)/signup/page.tsx` - signup experience copy and layout
- `src/app/(cedente)/cedente/dashboard/page.tsx` - cedente post-auth landing shell
- `src/app/(inversor)/inversor/dashboard/page.tsx` - inversor post-auth landing shell
- `tests/e2e/auth-signup.spec.ts` - desktop/mobile signup and login regression flow

## Decisions Made
- Used server-side admin user creation plus immediate password sign-in to guarantee the roadmap's instant-dashboard happy path.
- Added Playwright cleanup through the service-role admin client so repeated browser tests do not accumulate auth users.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced hosted email-confirmation dependency with server-confirmed signup**
- **Found during:** Task 1 (Implement server-side auth actions with immediate-login signup default)
- **Issue:** The hosted Supabase project still required email confirmation for normal password signups, so `auth.signUp()` returned no live session and broke the roadmap's immediate-dashboard requirement.
- **Fix:** The server action now creates a confirmed user with the service-role admin client, then signs in through the shared SSR auth client to establish the session immediately. `/auth/confirm` remains as fallback recovery.
- **Files modified:** `src/lib/auth/actions.ts`, `src/lib/auth/session.ts`, `src/app/auth/confirm/route.ts`
- **Verification:** `npx vitest run tests/auth/auth-actions.test.ts`; `npx playwright test tests/e2e/auth-signup.spec.ts --project=chromium`; `npx playwright test tests/e2e/auth-signup.spec.ts --project="Mobile Chrome"`; Playwright MCP desktop/mobile signup checks
- **Committed in:** `561e151` (part of task commit)

**2. [Rule 3 - Blocking] Moved Playwright local automation off an occupied dev port**
- **Found during:** Task 2 (Build auth screens and verify signup flow on desktop and mobile)
- **Issue:** Port `3000` was already occupied in this environment, causing the configured Playwright web server startup to fail.
- **Fix:** Updated the local Playwright base URL and web server command to use port `3001` while keeping deployed tests overridable through `PLAYWRIGHT_BASE_URL`.
- **Files modified:** `playwright.config.ts`
- **Verification:** Desktop and mobile Playwright CLI runs completed successfully
- **Committed in:** `05654af` (part of task commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both changes preserved the intended user flow and made the mandated auth verification executable without waiting on external config changes.

## Issues Encountered
- Playwright browsers were not installed initially, so Chromium had to be installed before the browser suite could run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cedentes and inversors can now authenticate and land on the correct dashboard shell.
- RBAC work can focus on protection and authorization because the happy-path auth UX already exists.

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-28*
