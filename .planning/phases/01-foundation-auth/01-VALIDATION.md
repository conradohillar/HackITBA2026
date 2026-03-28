# Phase 1 Validation: Foundation & Auth

**Status:** Local validation passed; deployed Vercel verification blocked by missing Karaí project linkage and CLI auth
**Phase:** `01-foundation-auth`
**Purpose:** Nyquist + execution validation target for Phase 1 requirements and success criteria.

## Requirement Map

| Requirement | Evidence |
|-------------|------------------|
| INV-02 | ✅ `npx vitest run` passed, including `tests/db/transition-invoice.test.ts` against the hosted Supabase project |
| USER-01 | ✅ Local Playwright signup/login flow passed on desktop and mobile; ⛔ deployed Vercel replay still blocked because no Karaí-linked Vercel project or CLI auth is available in this workspace |
| USER-04 | ✅ `tests/db/rls-policies.test.ts` passed and local Playwright RBAC redirect flow passed on desktop/mobile |
| AUDIT-01 | ✅ `npx vitest run` passed, including `tests/db/events-append-only.test.ts` against the hosted Supabase project |

## Executed Local Checks

- ✅ `npx vitest run`
- ✅ `set -a && source ".env.local" && set +a && npx playwright test tests/e2e/auth-signup.spec.ts tests/e2e/rbac.spec.ts --project=chromium --workers=1`
- ✅ `set -a && source ".env.local" && set +a && npx playwright test tests/e2e/auth-signup.spec.ts tests/e2e/rbac.spec.ts --project="Mobile Chrome" --workers=1`
- ✅ Local health check: `curl -sf "http://127.0.0.1:3001/api/health"` → `200 {"ok":true,"phase":"01-foundation-auth","checks":{"runtime":true,"supabase":true}}`
- ⛔ `npx supabase db reset --local` could not run because the local Docker daemon is unavailable in this environment
- ⚠️ Playwright MCP verification was requested by repo policy, but no Playwright MCP tool was available in this execution environment; equivalent browser coverage was completed with Playwright CLI on desktop and mobile

## Deployed Checks

- ⛔ `vercel whoami` failed with `No existing credentials found. Please run vercel login or pass --token`.
- ⛔ `Vercel_list_teams` returned accessible teams, but `Vercel_list_projects` showed no Karaí-linked project in those teams and the repo still has no `.vercel/project.json`.
- ⛔ No deployed URL is available from this workspace, so deployed `/api/health` and deployed Playwright auth/RBAC checks could not be executed.

## Notes

- Phase 1 execution default is **email confirmation disabled** in Supabase Auth so signup can land immediately on the dashboard per roadmap success criteria.
- `/auth/confirm` remains in-app as a recovery path, not the primary happy path.
- The hosted Supabase project still required confirmed signups, so the server-side signup action now creates confirmed users and signs them in immediately to preserve the same happy path.
- Phase 4 dashboard copy drifted from the original Phase 1 assertions, so the auth Playwright spec was refreshed to match the current cedente and inversor hero titles.
- The investor dashboard was missing a logout affordance, which blocked the full signup → logout → login roundtrip; the route now exposes the same logout action as the cedente dashboard.
- Validation refreshed on 2026-03-28 after re-running the full Vitest suite plus desktop/mobile auth and RBAC browser flows.
