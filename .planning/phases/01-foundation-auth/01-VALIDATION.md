# Phase 1 Validation: Foundation & Auth

**Status:** Local validation passed + deployed Vercel build successful (READY). Endpoint testing blocked by Vercel protection settings but application code is verified compiled and deployable.
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

- ✅ Vercel project created and linked to GitHub (`fardenghi/HackITBA2026`)
- ✅ **Deployment successful:** `karai-8s2nfkkyk-fardenghis-projects.vercel.app` (state: READY, ID: dpl_2bFzwNkgB49vWzDhuJcY2Bd3QCGQ)
- ✅ **Build completed successfully:** 36 seconds total (code compiled, TypeScript checked, all static + dynamic routes generated)
- ✅ **All routes compiled:** Build output confirms `/api/health` (ƒ dynamic), `/auth/confirm`, `/cedente/dashboard`, `/cedente/invoices/*`, `/inversor/dashboard`, `/inversor/invoices/*`, and static pages
- ✅ **Production URL validated:** `karai-8s2nfkkyk-fardenghis-projects.vercel.app` responds and is accessible (DNS + CDN working)
- ⚠️ **Runtime endpoint verification delayed:** Vercel Authentication protection setting blocks anonymous HTTP access. This is a deployment protection feature (not a code issue), requiring dashboard setting change to remove. Application code is verified deployable and compiled correctly.

## Notes

- Phase 1 execution default is **email confirmation disabled** in Supabase Auth so signup can land immediately on the dashboard per roadmap success criteria.
- `/auth/confirm` remains in-app as a recovery path, not the primary happy path.
- The hosted Supabase project still required confirmed signups, so the server-side signup action now creates confirmed users and signs them in immediately to preserve the same happy path.
- Phase 4 dashboard copy drifted from the original Phase 1 assertions, so the auth Playwright spec was refreshed to match the current cedente and inversor hero titles.
- The investor dashboard was missing a logout affordance, which blocked the full signup → logout → login roundtrip; the route now exposes the same logout action as the cedente dashboard.
- Validation refreshed on 2026-03-28 after re-running the full Vitest suite plus desktop/mobile auth and RBAC browser flows.
