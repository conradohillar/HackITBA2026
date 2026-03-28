# Phase 1: Foundation & Auth - Research

**Researched:** 2026-03-28
**Domain:** Next.js 16 + Supabase SSR Auth + PostgreSQL schema/RLS + Vercel deployment
**Confidence:** HIGH

## User Constraints

- No `*-CONTEXT.md` exists for this phase.
- Use `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/research/*`, and `AGENTS.md` as source of truth.
- Repo currently contains planning docs only; there is no application code, package.json, test setup, or deployment linkage yet.
- Phase goal is fixed by roadmap: **DB schema, auth, RBAC, project scaffold**.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-02 | Invoice follows enforced status lifecycle (draft → validating → validated → tokenized → funding → funded → settling → settled) | PostgreSQL `invoice_status` enum + `transition_invoice()` function + append-only events + DB-level validation |
| USER-01 | User can sign up with email/password and select role (cedente or inversor) | Supabase password auth + signup metadata + `auth.users` → `public.profiles` trigger + SSR auth clients |
| USER-04 | RBAC enforced at middleware/route protection and database (RLS) levels | Next.js `proxy.ts` for optimistic redirects, DAL/server checks close to data, and RLS policies with role-aware filters |
| AUDIT-01 | All state transitions and financial events are logged to append-only event table | `events` table, trigger-backed inserts, and no-update/no-delete policy design from day zero |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Use `.planning/` artifacts as source of truth for scope, phase state, and next actions.
- Prefer unattended execution; stop only for true human-only blockers.
- Keep GSD artifacts current; do not bypass GSD workflow.
- For every frontend/page/route/user-flow change, use Playwright MCP before marking work complete.
- Playwright verification must cover happy path on desktop and mobile widths.
- Start needed local app processes yourself; do not ask the user to run them.
- Use Supabase MCP and other configured MCP tools when helpful.
- Human-only blockers are limited to missing secrets, auth approvals, billing gates, or irreducible product decisions.

## Summary

Phase 1 should establish the permanent technical spine of the project, not just a login screen. The recommended implementation is a single Next.js 16 App Router app scaffolded into this repo, deployed to Vercel, backed by the already-provisioned Supabase project. Auth should use Supabase password auth with SSR cookies via `@supabase/ssr`, while authorization should be split across (1) optimistic route redirects in `proxy.ts`, (2) secure server checks in Server Components / Server Actions / Route Handlers, and (3) strict RLS policies in Postgres.

The database work is the load-bearing part of this phase. The schema should be created immediately as versioned SQL migrations in-repo: `profiles`, `invoices`, `fractions`, `transactions`, `events`, and `bcra_cache`, plus enums, indexes, `transition_invoice()` and the profile bootstrap trigger. Because later phases depend on correctness here, money columns should use `NUMERIC(15,2)`, state changes should only happen through SQL functions, and the events table should be append-only from the beginning.

The main planning adjustment versus older assumptions is that current docs recommend `proxy.ts` + server-side secure checks rather than relying on layout-only or middleware-only auth logic, and Supabase now recommends publishable keys for new apps instead of defaulting to legacy anon keys. Also, hosted Supabase projects require email confirmation by default for password signup, which conflicts with the roadmap success criterion of immediate post-signup landing unless Phase 1 explicitly disables confirmations or fully implements the confirm-email PKCE flow.

**Primary recommendation:** Break Phase 1 into five plans: scaffold/deploy, schema/events, auth/profile bootstrap, RBAC/RLS/proxy, and validation/seed smoke checks.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.2.1` | Fullstack App Router app | Current stable release; route groups, Server Actions, and current auth guidance fit this phase directly |
| `tailwindcss` | `4.2.2` | Styling foundation | Matches project constraint and fastest path to presentable auth/dashboard shells |
| `@supabase/supabase-js` | `2.100.1` | Auth, DB, realtime client | Official client; works in browser and server contexts |
| `@supabase/ssr` | `0.9.0` | SSR cookie auth integration | Official Supabase SSR adapter for Next.js App Router |
| `zod` | `4.3.6` | Runtime validation | Validate signup payloads, role selection, and server action input boundaries |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` | `7.72.0` | Signup/login form state | Use for role-select signup and auth forms once scaffold exists |
| `@hookform/resolvers` | `5.2.2` | Zod form integration | Use with `react-hook-form` for server/client schema parity |
| `shadcn` CLI | `4.1.1` | UI primitives setup | Use after scaffold for auth pages and empty dashboards |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth + `@supabase/ssr` | NextAuth / Clerk / Better Auth | Slower integration, duplicates auth system, and weakens direct alignment with RLS |
| SQL migrations + Supabase client | Prisma / Drizzle ORM | Extra abstraction and migration overhead for a 36h hackathon |
| `proxy.ts` + DAL checks | Layout-only guards | Layout checks are explicitly risky with partial rendering and are not sufficient protection |

**Installation:**
```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers
npx shadcn@latest init
```

**Version verification:**
- `next@16.2.1` — published 2026-03-27
- `@supabase/supabase-js@2.100.1` — published 2026-03-26
- `@supabase/ssr@0.9.0` — published 2026-03-02
- `tailwindcss@4.2.2` — current npm latest verified
- `zod@4.3.6` — published 2026-01-22
- `react-hook-form@7.72.0` — published 2026-03-22
- `shadcn@4.1.1` — published 2026-03-27

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── app/
│   ├── (public)/              # landing, login, signup
│   ├── (cedente)/             # cedente dashboard shell
│   ├── (inversor)/            # inversor dashboard shell
│   ├── auth/confirm/          # PKCE/email confirmation exchange route
│   └── api/health/            # deploy + auth smoke endpoint
├── lib/
│   ├── auth/                  # DAL, role checks, schemas
│   ├── supabase/              # browser/server clients
│   └── db/                    # typed query helpers / constants
├── components/
│   ├── auth/                  # signup/login forms
│   └── layout/                # nav, shells, guards
├── types/
│   └── database.ts            # generated Supabase types
supabase/
├── migrations/                # schema + RLS + functions in git
└── seed.sql                   # demo-safe starter data
proxy.ts                       # optimistic auth redirects + token refresh
```

### Pattern 1: SSR Supabase client split
**What:** Separate browser and server client creators using `@supabase/ssr`.
**When to use:** Immediately in scaffold; all auth, route handlers, server actions, and browser subscriptions depend on it.
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### Pattern 2: Signup metadata → profile trigger
**What:** Capture role/company data at signup and copy it into `public.profiles` with a DB trigger on `auth.users`.
**When to use:** Phase 1 signup flow; avoids partial account creation and keeps profile bootstrap server-side.
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name, company_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    new.raw_user_meta_data ->> 'company_name'
  );
  return new;
end;
$$;
```

### Pattern 3: Proxy for optimistic auth + secure checks near data
**What:** Use `proxy.ts` for redirects/session refresh, but keep real authorization in DAL/server code and RLS.
**When to use:** All protected routes.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/authentication
export default async function proxy(req: NextRequest) {
  // optimistic session redirect only
}
```

### Pattern 4: DB-enforced state machine and audit log
**What:** `invoice_status` enum + `transition_invoice()` + automatic event inserts.
**When to use:** Before any feature work in later phases; Phase 1 owns the invariant.

### Anti-Patterns to Avoid
- **Layout-only auth checks:** Next.js docs warn layouts do not re-check auth on every navigation under partial rendering.
- **Client-side role enforcement only:** must be backed by RLS and server checks.
- **Direct status updates in app code:** all status transitions should go through SQL function(s).
- **Dashboard-only schema changes:** phase artifacts must live in git as SQL migrations.
- **Legacy anon-key-first setup for new apps:** prefer publishable key for new projects.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom password/session system | Supabase Auth + `@supabase/ssr` | Removes password/security burden and aligns with DB auth context |
| Route/session refresh | DIY cookie/session refresh | Supabase SSR client + `proxy.ts` | Official SSR pattern already handles PKCE/session refresh |
| Authorization | App-only role filters | Postgres RLS + DAL + proxy redirects | Defense in depth; browser is not trustworthy |
| Profile bootstrap | Ad hoc post-signup inserts only | `auth.users` trigger from signup metadata | Avoids half-created accounts and centralizes profile creation |
| Audit logging | JS event writes sprinkled everywhere | DB triggers + append-only `events` table | Harder to forget, easier to verify |
| Schema correctness | ORM-generated loose schema | Explicit SQL migrations | Needed for enums, functions, RLS, triggers, and future locking logic |

**Key insight:** The “fast” path in this domain is to lean harder on Supabase/Postgres primitives, not to replace them with custom Node abstractions.

## Common Pitfalls

### Pitfall 1: Hosted Supabase email confirmation blocks immediate post-signup landing
**What goes wrong:** user signs up but cannot land on dashboard immediately.
**Why it happens:** hosted Supabase enables email confirmations by default for password auth.
**How to avoid:** explicitly decide in Phase 1: disable confirmations for demo speed, or fully implement `/auth/confirm` PKCE flow and redirect URLs.
**Warning signs:** signup succeeds but no authenticated dashboard session exists.

### Pitfall 2: Proxy/session refresh omitted in SSR setup
**What goes wrong:** auth randomly appears stale on server-rendered pages.
**Why it happens:** current Supabase SSR flow expects proxy-based token refresh.
**How to avoid:** add `proxy.ts` in scaffold wave, not later.
**Warning signs:** browser seems logged in, server components behave logged out.

### Pitfall 3: RLS enabled but policies are slow or incomplete
**What goes wrong:** empty dashboards, leaked rows, or bad performance.
**Why it happens:** missing `TO authenticated`, missing `(select auth.uid())`, missing indexes on policy columns.
**How to avoid:** write explicit role policies, null-safe checks, and indexes on every policy-driving FK.
**Warning signs:** investors see nothing, or anon unexpectedly sees data.

### Pitfall 4: Trigger-based profile creation blocks signup
**What goes wrong:** `auth.signUp()` fails because `handle_new_user()` throws.
**Why it happens:** bad enum cast, missing nullable handling, or overly strict fields.
**How to avoid:** keep trigger minimal, test with both roles, and make optional fields nullable.
**Warning signs:** signup fails only after adding profile trigger.

### Pitfall 5: Auth checks only in UI shells
**What goes wrong:** protected data still reachable through direct route/API calls.
**Why it happens:** optimistic redirects are mistaken for authorization.
**How to avoid:** duplicate checks in server actions/route handlers and rely on RLS for final enforcement.
**Warning signs:** crafted request bypasses page navigation restrictions.

## Code Examples

Verified patterns from official sources:

### Signup with role metadata
```typescript
// Source: https://supabase.com/docs/guides/auth/managing-user-data
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role: 'cedente',
      display_name: 'Karaí Demo PyME',
      company_name: 'Acme SA',
    },
  },
})
```

### Enable RLS and scope a self-row policy
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);
```

### Password signup with PKCE confirm route in Next.js
```typescript
// Source: https://supabase.com/docs/guides/auth/passwords
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({ type, token_hash })
    redirect('/')
  }

  redirect('/auth/auth-code-error')
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` as default recommendation | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` recommended for new apps | Current Supabase SSR docs / API key changes | Better key rotation story; use legacy anon only if needed for compatibility |
| Next.js middleware-only auth guidance | `proxy.ts` for optimistic checks + secure DAL/server checks | Current Next.js 16 auth docs | Planner should create `proxy.ts`, not rely on layout-only gating |

**Deprecated/outdated:**
- Treating layout guards as sufficient authorization.
- Treating legacy anon key as the preferred new-project key.

## Open Questions

1. **Should email confirmations be disabled for the demo?**
   - What we know: hosted Supabase enables them by default.
   - What's unclear: whether the team prefers fast demo signup or full confirm-email flow.
   - Recommendation: default to disabling confirmations for Phase 1 unless a product reason says otherwise.

2. **Should admin role exist in Phase 1 schema?**
   - What we know: earlier research includes `admin` for debugging; roadmap requirements do not need it.
   - What's unclear: whether adding it helps demo recovery or adds unnecessary policy surface.
   - Recommendation: keep enum extensible but do not build admin UI/policies unless execution needs debug escape hatches.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js scaffold/build | ✓ | `v20.13.0` | — |
| npm | Package install / scripts | ✓ | `10.5.2` | — |
| Git | Versioned scaffold and migrations | ✓ | `2.50.1` | — |
| Vercel CLI | Initial deploy/link | ✓ | `48.8.0` | Use Vercel MCP/dashboard if CLI flow fails |
| Supabase CLI | Local migrations / auth config / types | ✓ | `2.67.1` | Use Supabase MCP/dashboard; note CLI is behind latest `2.84.2` |
| Supabase hosted project | Auth + DB target | ✓ | existing project | `https://cagccepnmsxspoifgvfb.supabase.co` |
| Supabase public schema | Phase 1 DB deployment target | ✓ | empty | — |
| Vercel project linkage in repo | Deployment continuity | ✗ | — | Create/link during execution |
| App scaffold (`package.json`, src/) | All implementation | ✗ | — | Create in first plan with `create-next-app` |

**Missing dependencies with no fallback:**
- None identified for research/planning.

**Missing dependencies with fallback:**
- No linked Vercel project in repo yet; can be created/linked during execution.
- Supabase CLI is outdated; MCP/dashboard can cover schema work if CLI friction appears.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright E2E + Vitest unit/integration (recommended) |
| Config file | `playwright.config.ts`, `vitest.config.ts` |
| Quick run command | `npx vitest run tests/db/transition-invoice.test.ts tests/auth/profile-trigger.test.ts` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INV-02 | Invalid invoice transitions are rejected | integration | `npx vitest run tests/db/transition-invoice.test.ts` | ❌ Wave 0 |
| USER-01 | Signup with role lands on correct dashboard shell | e2e | `npx playwright test tests/e2e/auth-signup.spec.ts --project=chromium` | ❌ Wave 0 |
| USER-04 | Wrong-role route redirect + DB row isolation | e2e + integration | `npx playwright test tests/e2e/rbac.spec.ts && npx vitest run tests/db/rls-policies.test.ts` | ❌ Wave 0 |
| AUDIT-01 | State transition inserts immutable event row | integration | `npx vitest run tests/db/events-append-only.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest DB/auth test for changed area
- **Per wave merge:** full Vitest suite
- **Phase gate:** full Vitest suite + Playwright auth/RBAC flow on desktop and mobile widths before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `package.json` and app scaffold
- [ ] `playwright.config.ts` and browser install step
- [ ] `vitest.config.ts`
- [ ] `tests/e2e/auth-signup.spec.ts`
- [ ] `tests/e2e/rbac.spec.ts`
- [ ] `tests/db/transition-invoice.test.ts`
- [ ] `tests/db/rls-policies.test.ts`
- [ ] `tests/db/events-append-only.test.ts`

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` - product constraints, deploy target, auth/RBAC requirement
- `.planning/ROADMAP.md` - Phase 1 goal, requirements, success criteria
- `.planning/REQUIREMENTS.md` - exact requirement text for INV-02, USER-01, USER-04, AUDIT-01
- `https://nextjs.org/docs/app/api-reference/file-conventions/route-groups` - route groups behavior, caveats, current version `16.2.1`
- `https://nextjs.org/docs/app/guides/authentication` - current auth/proxy/DAL guidance for Next.js 16
- `https://supabase.com/docs/guides/auth/server-side/nextjs` - official `@supabase/ssr` setup, cookie refresh, publishable-key guidance
- `https://supabase.com/docs/guides/database/postgres/row-level-security` - RLS rules, `auth.uid()`, `TO authenticated`, performance guidance
- `https://supabase.com/docs/guides/auth/passwords` - password auth, PKCE confirm flow, hosted email confirmation default
- `https://supabase.com/docs/guides/auth/managing-user-data` - `public.profiles` trigger pattern and signup metadata

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` - stack direction, useful but partially superseded by current docs
- `.planning/research/ARCHITECTURE.md` - schema and phase decomposition hypotheses
- `.planning/research/PITFALLS.md` - project-specific failure modes to preserve in planning

### Tertiary (LOW confidence)
- None required for final recommendations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - current npm versions verified and official docs align with project constraints
- Architecture: HIGH - roadmap, Next.js docs, and Supabase docs all support the recommended shape
- Pitfalls: HIGH - most are directly evidenced by official docs or current project constraints

**Research date:** 2026-03-28
**Valid until:** 2026-04-27
