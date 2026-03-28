# Phase 4: Settlement, Dashboards & Demo Polish - Research

**Researched:** 2026-03-28
**Domain:** Settlement simulation, role dashboards, audit timeline composition, and Vercel demo validation on the existing Next.js + Supabase stack
**Confidence:** HIGH

## User Constraints

- No `04-CONTEXT.md` exists for this phase.
- Use `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, previous phase artifacts, and the current codebase as source of truth.
- Research only; do not implement product code.
- Phase focus is fixed by roadmap: settlement, role-specific dashboards, invoice timeline/history, and demo-ready end-to-end validation on Vercel.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-04 | User can view invoice detail with full status history and event timeline | Extend both invoice detail routes with a normalized timeline query over `events` + `transactions`, and expand UI beyond the current funding-only/status-stepper view |
| SETT-01 | System tracks invoice maturity dates and triggers settlement simulation | Reuse `invoices.due_date` and `invoice_status` lifecycle; add a single DB settlement RPC plus a server action/button to simulate maturity for demo-safe execution |
| SETT-02 | Upon settlement, system distributes principal + interest pro-rata to fraction holders | Reuse `fractions`, `transactions`, `transition_invoice()`, and `fractions.settled_at`; centralize payout math in the DB with remainder-safe last-fraction handling |
| SETT-03 | User can view transaction history (investments, returns, disbursements) | Reuse `transactions` table and existing RLS; add dashboard/detail query helpers and ensure `disbursement_to_cedente`, `settlement_payment`, and `interest_distribution` rows are written |
| USER-02 | Cedente sees role-specific dashboard (invoices, status, total raised, effective cost) | Replace the placeholder cedente dashboard with invoice-status aggregates, capital raised, financing-cost summaries, and transaction history derived from owned invoices + ledger rows |
| USER-03 | Inversor sees role-specific dashboard (portfolio, weighted avg yield, diversification) | Keep `/inversor/dashboard` as landing, add portfolio metrics above/below marketplace, and derive holdings from sold/settled fractions joined to invoices |
| AUDIT-02 | Invoice detail includes visual event timeline showing full lifecycle | Use append-only `events` for status changes/purchases and `transactions` for financial movements; render one chronological timeline component on detail pages |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Use `.planning/` artifacts as the source of truth for scope, phase state, and next actions.
- Prefer unattended execution; stop only for true human-only blockers.
- Keep GSD artifacts current; do not bypass the GSD workflow.
- For every frontend/page/route/user-flow change, use Playwright MCP before marking work complete.
- Playwright verification must cover happy path on desktop and mobile widths.
- Start needed local app processes yourself; do not ask the user to run them.
- Use Supabase MCP and other configured MCP tools when helpful.
- Human-only blockers are limited to missing secrets, auth approvals, billing gates, or irreducible product decisions.

## Summary

Phase 4 should extend the existing funding architecture, not introduce a second ledger or dashboard model. The schema already contains the lifecycle states needed for settlement (`funded -> settling -> settled`), fraction-level ownership (`fractions.investor_id`), append-only audit storage (`events`, `transactions`), and settlement-oriented columns (`fractions.settled_at`, `invoices.settled_at`). The biggest gap is not schema shape; it is missing write paths and read models. Today the app has funding flows, but no settlement RPC, no dashboard aggregations, no timeline query layer, and no transaction-history surfaces.

The most important planning decision is to keep settlement as a single database correctness boundary, mirroring `fund_invoice()` and `tokenize_invoice()`. Settlement math must not live in React or server actions because it needs row locks, lifecycle transitions, per-fraction payout records, and remainder-safe rounding. Phase 4 should add one `public.settle_invoice(...)` RPC, then build dashboard/timeline queries on top of the resulting ledger and event data.

For demo-readiness, do not depend on natural maturity or background schedulers. Every current invoice in the database has `due_date = 2026-06-28`, which means neither local nor Vercel can complete the happy path by waiting for real maturity. The practical v1 path is manual settlement simulation from the UI: track `due_date`, show it, and let an authenticated actor trigger a demo-safe settlement action that records clearly simulated financial events.

**Primary recommendation:** Add a single `public.settle_invoice(...)` RPC, extend `fund_invoice()` to emit cedente disbursement ledger rows when funding closes, keep `/inversor/dashboard` as the investor landing but add portfolio sections, replace the cedente dashboard placeholder with real aggregates, and drive the invoice timeline from a normalized server-side union of `events` and `transactions`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.2.1` (repo/latest verified) | App Router pages, RSC, Server Actions | Already powers auth, dashboards, and invoice routes |
| `react` | `19.2.0` (repo) | Interactive dashboard/timeline islands | Existing runtime; no Phase 4-specific reason to swap patterns |
| `@supabase/supabase-js` | `2.100.1` (repo/latest verified) | Browser reads, realtime updates, RPC calls | Existing marketplace pattern already depends on it |
| `@supabase/ssr` | `0.9.0` (repo/latest verified) | Authenticated server/client Supabase setup | Current route/query/auth boundary |
| `zod` | `4.3.6` (repo) | Settlement action input validation | Matches the current server-action boundary style |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | `4.1.0` | Relative/absolute timestamp formatting in timelines and dashboards | Use for human-readable event chronology |
| `@playwright/test` | `1.55.1` (repo), `1.58.2` latest | Desktop/mobile happy-path verification | Required by AGENTS.md for frontend/user-flow changes |
| `vitest` | `3.2.4` (repo), `4.1.2` latest | Settlement math/query/action regression tests | Existing project test runner |
| `lucide-react` | `1.7.0` | Timeline and dashboard iconography | Use if Phase 4 wants light visual polish without a new icon stack |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DB RPC for settlement | Server action with direct table updates | Weaker invariants, harder locking, math drift risk |
| Derive dashboards from new materialized tables | Query existing `invoices`, `fractions`, `transactions` | New tables are unnecessary at hackathon scale |
| Cron/background job for settlement | Manual settlement simulation action | Cron is more realistic, but slower and unnecessary for the demo |
| Dedicated investor portfolio route | Expand `/inversor/dashboard` | New route is optional; keeping the landing stable preserves existing auth redirects |

**Installation:**
```bash
# No new runtime dependency is required for Phase 4.
# Reuse the existing app stack.
```

**Version verification:**
- `next@16.2.1` — npm latest verified 2026-03-28
- `@supabase/supabase-js@2.100.1` — npm latest verified 2026-03-28
- `@supabase/ssr@0.9.0` — npm latest verified 2026-03-28
- `@playwright/test` repo is `1.55.1`; npm latest is `1.58.2` on 2026-03-28, but upgrade is not required for planning
- `vitest` repo is `3.2.4`; npm latest is `4.1.2` on 2026-03-28, but upgrade is not required for planning

## Architecture Patterns

### Current Architecture Touchpoints

| Existing Touchpoint | Reuse in Phase 4 |
|---------------------|------------------|
| `src/app/(cedente)/cedente/dashboard/page.tsx` | Replace placeholder shell with issuer metrics + transaction history |
| `src/app/(inversor)/inversor/dashboard/page.tsx` | Keep as investor landing and add portfolio metrics around the existing marketplace |
| `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` | Extend with timeline, settlement CTA/status, and financial history |
| `src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx` | Extend from funding-only purchase screen into a holding/settlement detail view |
| `src/lib/marketplace/queries.ts` + `read-model.ts` | Follow the same dependency-injectable query/read-model pattern for dashboard and timeline data |
| `src/lib/marketplace/actions.ts` | Mirror the same server-action → RPC orchestration for settlement actions |
| `public.transition_invoice(...)` | Remains the only invoice lifecycle transition boundary |
| `public.fund_invoice(...)` | Should be extended to insert `disbursement_to_cedente` when an invoice becomes fully funded |
| `public.transactions` | Canonical transaction history for purchases, disbursement, principal repayment, and interest |
| `public.events` | Canonical append-only audit stream for lifecycle and fraction status events |
| `src/components/marketplace/funding-progress-bar.tsx` + `expected-return-preview.tsx` | Reuse on dashboards/detail pages for funding and expected-return context |

### Existing Schema / Function Reuse

| Existing Table / Function | Reuse Strategy | Phase 4 Gap |
|---------------------------|----------------|-------------|
| `public.invoices` | Source of dashboard status counts, due dates, financing totals, and final settlement status | No settlement trigger/write path yet |
| `public.fractions` | Source of investor holdings and fraction-level payout distribution | No `sold -> settled` write path yet |
| `public.transactions` | Already contains the exact enum types needed for disbursements and returns | Only `fraction_purchase` rows are written today |
| `public.events` | Already append-only and suited for lifecycle timeline rendering | Timeline query layer does not exist yet |
| `public.transition_invoice(...)` | Use for `funded -> settling -> settled` transitions inside settlement RPC | No caller currently reaches settlement statuses |
| `public.fund_invoice(...)` | Existing funding correctness boundary to preserve | Needs a final disbursement ledger insert when status becomes `funded` |
| `public.log_fraction_purchase()` | Existing audit trigger for funding events | No equivalent handling for settlement completion; timeline must rely on transactions + invoice transitions unless expanded |

### Required Routes / Components / Actions / Functions

#### Routes
- **Modify** `src/app/(cedente)/cedente/dashboard/page.tsx` — issuer dashboard with grouped invoices, capital raised, effective financing cost, and recent ledger rows.
- **Modify** `src/app/(inversor)/inversor/dashboard/page.tsx` — keep marketplace, add portfolio summary, diversification, weighted yield, and owned/settled history.
- **Modify** `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` — add timeline, settlement CTA/state, and invoice financial history.
- **Modify** `src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx` — support `funding|funded|settling|settled`, show holding/return state after purchase, and keep purchase UI only when relevant.

#### Components
- `src/components/dashboard/metric-card.tsx` — shared KPI card for both roles.
- `src/components/dashboard/transaction-history-table.tsx` — shared ledger history renderer.
- `src/components/dashboard/portfolio-breakdown.tsx` — investor diversification/payer mix.
- `src/components/invoices/event-timeline.tsx` — normalized visual lifecycle timeline.
- `src/components/invoices/settlement-summary.tsx` — principal, interest, status, and payout totals.
- `src/components/invoices/settlement-action-form.tsx` — demo-safe settlement trigger button/feedback.
- **Modify** `src/components/invoices/invoice-status-stepper.tsx` — extend the lifecycle through `funded`, `settling`, and `settled`.

#### Server Actions / TS functions
- `src/lib/settlement/actions.ts` — `settleInvoiceAction({ invoiceId })` with Zod validation and role checks.
- `src/lib/settlement/queries.ts` — dashboard KPIs, transaction history, and per-invoice settlement read models.
- `src/lib/settlement/timeline.ts` — normalize `events` + `transactions` into one chronological shape.
- `src/lib/settlement/calculations.ts` — weighted yield, effective financing cost, diversification, and optional display helpers.

#### Database functions / migrations
- `public.settle_invoice(p_invoice_id uuid)` — **required** correctness boundary for settlement.
- Extend `public.fund_invoice(...)` — **required** to insert a single `disbursement_to_cedente` row when funding closes.
- Optional trigger expansion on `public.fractions` — **optional** if the planner wants explicit `fraction.settled` events; not required if the timeline already uses transactions plus invoice transitions.

### Pattern 1: Dashboard queries stay server-rendered and dependency-injectable
**What:** Follow the existing Phase 3 pattern: server-side Supabase queries produce a stable typed read model, with client islands only where live updates or forms are needed.
**When to use:** Cedente dashboard, investor dashboard summaries, and invoice detail timeline payloads.
**Why:** It matches the current architecture and keeps tests cheap with mocked dependencies.

### Pattern 2: Settlement flow = Server Action → RPC, never direct table writes
**What:** A server action validates input and session, then calls `supabase.rpc('settle_invoice', ...)`.
**When to use:** Every settlement simulation.
**Why:** Settlement needs locks, lifecycle transitions, and multi-row ledger writes.

### Pattern 3: Timeline is a read-model union, not a new table
**What:** Query `events` and `transactions`, map both to a shared timeline item type, sort by timestamp ascending, and render one visual stream.
**When to use:** Cedente and investor invoice detail pages.
**Why:** The data already exists in append-only tables; Phase 4 should not introduce a duplicate audit store.

### Pattern 4: Investor dashboard remains the marketplace landing
**What:** Keep `/inversor/dashboard` as the authenticated landing route, then add a portfolio summary and owned-history sections without moving the marketplace.
**When to use:** User-facing investor dashboard implementation.
**Why:** Existing login/signup/proxy logic already redirects here, and Phase 3 validation depends on this route.

### Settlement / Distribution Strategy

#### Recommended RPC contract
- Prefer `public.settle_invoice(p_invoice_id uuid)` and derive the actor from `auth.uid()` inside the function.
- Require the caller to be authenticated and either the owning `cedente` or a privileged server/admin path.
- Revoke public execute and grant only to `authenticated` and `service_role`.

#### Recommended settlement flow inside `settle_invoice(...)`
1. `SELECT ... FROM public.invoices WHERE id = p_invoice_id FOR UPDATE`.
2. Reject unless invoice status is `funded`.
3. For demo mode, allow settlement before `due_date` but record that it was simulated in `transactions.metadata`; do not invent cron for v1.
4. Transition invoice to `settling` via `public.transition_invoice(...)`.
5. Lock sold fraction rows for the invoice ordered by `fraction_index`.
6. Insert a missing `disbursement_to_cedente` row only if it was never written during funding close (backfill-safe behavior for already funded invoices).
7. For each sold fraction, mark `status='settled'` and set `settled_at`.
8. Insert one `settlement_payment` row for principal (`amount = fraction.net_amount`) to the investor.
9. Insert one `interest_distribution` row for profit using proportional allocation of the invoice spread with last-fraction remainder correction.
10. Transition invoice to `settled` via `public.transition_invoice(...)`.

#### Recommended interest allocation math
- Principal pool = `invoice.net_amount`
- Interest pool = `invoice.amount - invoice.net_amount`
- Per fraction principal = exact `fractions.net_amount`
- Per fraction interest = proportional share of the invoice interest pool:
  - `raw_interest = (fraction.net_amount / invoice.net_amount) * interest_pool`
  - round each fraction to cents except the last locked fraction, which receives the remainder so total interest equals `invoice.amount - invoice.net_amount`

**Why this strategy:** it preserves exact investor principal, keeps total payouts equal to the face value, and handles the remainder-safe fraction splits introduced in Phase 2.

### Role-specific Dashboard Metrics

#### Cedente dashboard
- **Invoices by status:** count `draft|validating|validated|tokenized|funding|funded|settling|settled` for `cedente_id = auth.uid()`.
- **Total capital raised:** `sum(net_amount)` for invoices in `funded|settling|settled`.
- **Effective financing cost:** `(sum(amount) - sum(net_amount)) / sum(amount)` across funded-or-beyond invoices; also show ARS spread total.
- **Recent ledger activity:** `fraction_purchase`, `disbursement_to_cedente`, and settlement-related incoming rows from `transactions` where `to_user_id = auth.uid()`.

#### Inversor dashboard
- **Portfolio holdings:** sold/settled fractions owned by `auth.uid()` joined to invoice metadata.
- **Weighted average yield:** `sum(expected_gain_or_realized_gain) / sum(invested_principal)` across owned fractions; weight by `fractions.net_amount`, not by fraction count.
- **Diversification:** `count(distinct invoices.pagador_cuit)` across owned fractions, with optional per-payer breakdown.
- **Recent transactions:** `fraction_purchase`, `settlement_payment`, and `interest_distribution` rows where the user is sender/recipient.

### Audit Timeline Strategy

**Recommended query model:**
- Invoice lifecycle events: `events` where `entity_type='invoice' and entity_id=invoiceId`
- Fraction purchase events: `events` where `entity_type='fraction' and metadata->>'invoice_id' = invoiceId`
- Financial events: `transactions` where `invoice_id = invoiceId`

**Recommended UI strategy:**
- Show lifecycle transitions from `events` as status milestones.
- Show monetary flows from `transactions` as financial milestones.
- Collapse duplicate purchase noise by grouping multiple fraction purchases with the same timestamp/actor when useful.
- Keep timeline query server-side because the current `events` RLS policy is too broad for confident client-side reuse.

### Anti-Patterns to Avoid
- **Direct settlement updates from TypeScript:** breaks financial invariants and lifecycle sequencing.
- **New portfolio tables:** investor holdings already exist in `fractions`.
- **Polling-only invoice detail timelines:** timeline data is historical; fetch it server-side and revalidate on action success instead of building another realtime stream.
- **Assuming natural due dates will drive the demo:** current data maturity dates are in the future.
- **Moving the investor landing route:** breaks existing auth redirect contracts and prior phase validation assumptions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settlement orchestration | App-level multi-query settlement logic | `public.settle_invoice(...)` | Locks + payouts + transitions belong in one DB transaction |
| Cedente/investor ledger | New wallet table | Existing `public.transactions` | The enum already supports purchases, disbursements, and returns |
| Investor holdings | Separate portfolio table | `public.fractions` joined to `public.invoices` | Ownership already lives on fractions |
| Audit storage | New timeline table | Read-model union of `events` + `transactions` | Existing append-only tables already represent the lifecycle |
| Demo scheduler | Cron or background worker | Manual server action / button for simulation | Faster, deterministic, and enough for a hackathon demo |

**Key insight:** Phase 4 is a ledger/read-model phase. The schema is already settlement-capable; the missing work is one correct write boundary plus queries/components that surface the data coherently.

## Common Pitfalls

### Pitfall 1: Settlement math drifts from marketplace preview math
**What goes wrong:** investor preview says one payout, actual settlement writes another.
**Why it happens:** principal/interest math is recomputed differently in UI and DB.
**How to avoid:** make the DB the source of truth for settlement amounts and keep TS helpers display-only.
**Warning signs:** sum of payout rows does not equal invoice face value.

### Pitfall 2: Historical funded invoices have no cedente disbursement row
**What goes wrong:** transaction history misses the cedente payout step.
**Why it happens:** `fund_invoice()` currently writes only `fraction_purchase` rows.
**How to avoid:** update `fund_invoice()` for new invoices and let `settle_invoice()` backfill missing disbursement rows once per invoice.
**Warning signs:** funded invoice has purchases but no `disbursement_to_cedente` transaction.

### Pitfall 3: Timeline queries trust current `events` RLS as-is
**What goes wrong:** authenticated users can read broader event data than intended.
**Why it happens:** `events_visible_for_accessible_invoices` checks invoice/fraction existence, not user accessibility.
**How to avoid:** tighten the policy or keep timeline reads server-side with explicit invoice ownership/role checks.
**Warning signs:** any authenticated user can query unrelated invoice/fraction events.

### Pitfall 4: Investor detail route disappears after funding closes
**What goes wrong:** purchased invoices become inaccessible or not found once they move beyond `funded`.
**Why it happens:** current investor funding query only accepts `funding|funded`.
**How to avoid:** expand read models and route logic to include `settling|settled` for owned holdings.
**Warning signs:** investor purchase succeeds, then later detail page 404s.

### Pitfall 5: Demo depends on Vercel deployment state that is not linked locally
**What goes wrong:** final validation cannot target the deployed URL on schedule.
**Why it happens:** the repo has no `.vercel/project.json`, and the accessible Vercel projects from this environment do not identify a linked Karaí project.
**How to avoid:** keep local validation working, but treat deployed URL discovery/linking as a Wave 0 execution task before the final demo sweep.
**Warning signs:** `PLAYWRIGHT_BASE_URL` is unset and no production URL is known.

## Code Examples

Verified patterns from official sources:

### Call a Postgres RPC from Supabase JS
```typescript
// Source: https://supabase.com/docs/reference/javascript/rpc
const { data, error } = await supabase.rpc('settle_invoice', {
  p_invoice_id: invoiceId,
})
```

### Security-definer function guidance
```sql
-- Source: https://supabase.com/docs/guides/database/functions
create function public.example_function()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- fully qualify relations here
end;
$$;
```

### Revalidate dashboard/detail shells after a server action
```typescript
import { revalidatePath } from 'next/cache'

revalidatePath('/cedente/dashboard')
revalidatePath('/inversor/dashboard')
revalidatePath(`/cedente/invoices/${invoiceId}`)
revalidatePath(`/inversor/invoices/${invoiceId}`)
```

### Timeline normalization shape
```typescript
type TimelineItem = {
  id: string
  at: string
  kind: 'status' | 'financial'
  label: string
  amount?: number
  metadata?: Record<string, unknown>
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate dashboard-only aggregates | Read models over normalized operational tables | Current project architecture | Faster delivery, less schema sprawl |
| App-layer orchestration for financial workflows | DB RPC boundary called from server actions | Established in Phases 2-3 | Stronger correctness guarantees |
| Route-per-surface proliferation | Stable role landing routes with richer sections | Current auth/Phase 3 design | Preserves redirect contracts and browser coverage |

**Deprecated/outdated:**
- Assuming funding completion alone satisfies transaction-history requirements.
- Assuming the current invoice status stepper is complete; it stops at `funding` today.

## Open Questions

1. **Who should be allowed to click the settlement simulation button in v1?**
   - What we know: settlement needs an authenticated actor and the demo must complete immediately.
   - What's unclear: whether only the cedente owner, any authenticated operator, or a hidden admin path should trigger it.
   - Recommendation: default to the owning `cedente` on the issuer detail page; allow `service_role` only for tests/admin seeding.

2. **Should the investor dashboard show only owned invoices beyond funding, or the marketplace plus owned portfolio together?**
   - What we know: `/inversor/dashboard` must remain the landing route.
   - What's unclear: whether portfolio and marketplace should be merged on one page or split into tabs/sections.
   - Recommendation: keep one page with KPI summary + holdings/history + marketplace section to avoid a route churn.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js app/runtime | ✓ | `v20.13.0` | — |
| npm | Scripts/dependencies | ✓ | `10.5.2` | — |
| Playwright CLI | Browser verification | ✓ | `1.58.2` | — |
| Vitest | Unit/integration verification | ✓ | `3.2.4` | — |
| Supabase CLI | Migrations/local workflows | ✓ | `2.67.1` | Supabase MCP |
| Vercel CLI | Deploy/link/debug workflow | ✓ | `48.8.0` | Vercel MCP |
| Supabase hosted project | Auth, DB, realtime | ✓ | existing project | — |
| `NEXT_PUBLIC_SUPABASE_URL` | App/runtime/tests | ✓ | env present | — |
| publishable Supabase key (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` or legacy anon) | Browser auth/tests | ✓ | env present | Legacy anon key already present |
| `SUPABASE_SERVICE_ROLE_KEY` | Server actions, admin tests, cache helpers | ✓ | env present | — |
| `OPENAI_API_KEY` | LLM narrative generation during full demo path | ✓ | env present | Deterministic fallback already works if API fails |
| Deployed Vercel project linkage in repo | Final deployed-url verification | ✗ | — | manual `vercel link` / known deployed URL |
| Natural maturity dates for immediate settlement demo | SETT-01 happy path | ✗ | all current due dates are `2026-06-28` | manual settlement simulation action |

**Missing dependencies with no fallback:**
- None that block planning.

**Missing dependencies with fallback:**
- Repo-local Vercel linkage is missing; execution can still proceed locally and can use a manually supplied/linked deployment target before the final demo sweep.
- Natural invoice maturity is not available for the demo window; use manual settlement simulation.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run tests/settlement tests/dashboard` |
| Full suite command | `npx vitest run && npx playwright test tests/e2e/settlement-demo.spec.ts --project=chromium && npx playwright test tests/e2e/settlement-demo.spec.ts --project="Mobile Chrome"` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INV-04 | Detail pages show full status history and normalized event timeline | integration + e2e | `npx vitest run tests/settlement/timeline.test.ts && npx playwright test tests/e2e/settlement-demo.spec.ts --project=chromium` | ❌ Wave 0 |
| SETT-01 | Funded invoice can trigger settlement simulation while honoring lifecycle rules | integration | `npx vitest run tests/invoices/settle-invoice.test.ts` | ❌ Wave 0 |
| SETT-02 | Principal + interest distribute pro-rata with no rounding drift | integration + unit | `npx vitest run tests/settlement/distribution.test.ts tests/invoices/settle-invoice.test.ts` | ❌ Wave 0 |
| SETT-03 | Users can see investments, returns, and disbursements in transaction history | integration + e2e | `npx vitest run tests/dashboard/queries.test.ts && npx playwright test tests/e2e/settlement-demo.spec.ts --project=chromium` | ❌ Wave 0 |
| USER-02 | Cedente dashboard shows invoice/status/capital/cost metrics | integration + e2e | `npx vitest run tests/dashboard/queries.test.ts && npx playwright test tests/e2e/settlement-demo.spec.ts --project=chromium` | ❌ Wave 0 |
| USER-03 | Inversor dashboard shows holdings, weighted yield, and diversification | integration + e2e | `npx vitest run tests/dashboard/queries.test.ts && npx playwright test tests/e2e/settlement-demo.spec.ts --project="Mobile Chrome"` | ❌ Wave 0 |
| AUDIT-02 | Timeline includes lifecycle + financial milestones | integration + e2e | `npx vitest run tests/settlement/timeline.test.ts && npx playwright test tests/e2e/settlement-demo.spec.ts --project=chromium` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest for touched settlement/dashboard area
- **Per wave merge:** `npx vitest run`
- **Phase gate:** full Vitest + Playwright desktop/mobile on local base URL, then repeat the same Playwright spec against the deployed Vercel URL via `PLAYWRIGHT_BASE_URL="$DEPLOYED_URL"`

### Wave 0 Gaps
- [ ] `tests/invoices/settle-invoice.test.ts` — lifecycle, locking, and ledger writes
- [ ] `tests/settlement/distribution.test.ts` — principal/interest remainder-safe math
- [ ] `tests/settlement/timeline.test.ts` — event + transaction normalization
- [ ] `tests/dashboard/queries.test.ts` — cedente/inversor KPI query coverage
- [ ] `tests/e2e/settlement-demo.spec.ts` — full signup → originate → fund → settle → dashboard/timeline happy path on desktop/mobile

## Dependencies / Blockers

### Dependencies
- Phase 1 auth/RBAC and stable dashboard routes are already in place.
- Phase 2 provides originations, risk data, tokenization, and funding-ready invoices.
- Phase 3 provides the marketplace, purchase action, investor detail route, realtime publication on `public.invoices`/`public.fractions`, and verified funding happy-path coverage.

### Non-human blockers / execution risks
- No settlement RPC exists yet.
- `transactions` currently contain only `fraction_purchase` rows; no disbursement or return history is being generated.
- `events_visible_for_accessible_invoices` is too permissive for a user-facing audit timeline and should be fixed or bypassed with server-side enforcement.
- Investor detail queries currently filter to `funding|funded`, so settled holdings are not yet readable through the existing route.
- The current invoice status stepper stops at `funding`, so the settled lifecycle is visually incomplete.
- No linked Vercel project or deployed URL is discoverable from the repo itself, so final deployed validation needs a Wave 0 deployment target check.

### Human blockers
- None identified for planning.

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` - Phase 4 goal, requirements, success criteria, and Vercel demo gate
- `.planning/REQUIREMENTS.md` - exact requirement text for INV-04, SETT-01..03, USER-02..03, AUDIT-02
- `.planning/STATE.md` - current phase readiness and Phase 3 handoff notes
- `.planning/phases/03-marketplace-funding/03-RESEARCH.md` - Phase 3 architectural contracts inherited by Phase 4
- `.planning/phases/03-marketplace-funding/03-04-SUMMARY.md` - investor dashboard/detail route decisions to preserve
- `.planning/phases/03-marketplace-funding/03-05-SUMMARY.md` - Phase 4 handoff readiness and deployed-validation expectations
- `.planning/phases/03-marketplace-funding/03-VALIDATION.md` - proven funding behavior and realtime fallback evidence
- `src/app/(cedente)/cedente/dashboard/page.tsx` - current cedente dashboard placeholder
- `src/app/(inversor)/inversor/dashboard/page.tsx` - current investor landing route
- `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` - current cedente detail route
- `src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx` - current investor detail route
- `src/lib/marketplace/actions.ts`, `src/lib/marketplace/queries.ts`, `src/lib/marketplace/read-model.ts`, `src/hooks/use-marketplace-realtime.ts` - patterns to mirror for Phase 4 actions/queries
- `src/lib/invoices/queries.ts`, `src/components/invoices/invoice-status-stepper.tsx` - current invoice-detail gaps
- `supabase/migrations/0001_foundation_schema.sql` - settlement-capable schema, enums, append-only invariants, transitions
- `supabase/migrations/0002_rls_and_rbac.sql` - current read policies and the event-policy gap
- `supabase/migrations/0004_phase2_tokenize_invoice.sql` - precedent for DB-side lifecycle orchestration
- `supabase/migrations/0005_phase3_marketplace_funding.sql` - funding RPC and purchase event trigger pattern
- Supabase MCP table/function inspection and SQL queries run on 2026-03-28 - current production-like schema state, published tables, status/transaction/event counts, due-date distribution
- `playwright.config.ts`, `vitest.config.ts`, `.env.example` - current validation and env contracts
- `https://supabase.com/docs/guides/database/functions` - security-definer/search-path/function privilege guidance
- `https://supabase.com/docs/reference/javascript/rpc` - official RPC invocation pattern

### Secondary (MEDIUM confidence)
- `https://vercel.com/docs/environment-variables/framework-environment-variables` - deployed URL env-variable behavior on Vercel
- `https://vercel.com/docs/environment-variables/manage-across-environments` - env parity and environment-run workflow for deployment validation

### Tertiary (LOW confidence)
- None required for the core recommendation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phase 4 reuses the installed stack; no new dependency decision is required
- Architecture: HIGH - current codebase and migrations already define the write/read boundaries to extend
- Settlement strategy: MEDIUM-HIGH - strongly supported by schema/function patterns, but the exact trigger actor and demo-simulation UX remain plan decisions
- Pitfalls/blockers: HIGH - directly observed from current code, RLS policy text, and live database state

**Research date:** 2026-03-28
**Valid until:** 2026-04-04
