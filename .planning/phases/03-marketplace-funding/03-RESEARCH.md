# Phase 3: Marketplace & Funding - Research

**Researched:** 2026-03-28
**Domain:** Investor marketplace, Supabase realtime, and race-condition-safe funding on top of the existing Next.js + Supabase stack
**Confidence:** HIGH

## User Constraints

- No `03-CONTEXT.md` exists for this phase.
- Use `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, Phase 1 and 2 artifacts, and the current codebase as source of truth.
- Research only; do not implement product code in this phase artifact.
- Phase focus is fixed by roadmap: investor browsing, multi-fraction purchase, live funding progress, and automatic transition to `funded`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FUND-01 | Investor can browse marketplace of invoices in funding status with key metrics | Reuse investor RLS + funding-ready invoices/fractions; upgrade `/inversor/dashboard` into the marketplace landing with server query + client realtime island |
| FUND-02 | Investor can purchase one or more fractions of a tokenized invoice | Add a `public.fund_invoice(...)` RPC as the only write path; call it from a server action |
| FUND-03 | Marketplace displays real-time funding progress (% funded) per invoice | Drive progress from `invoices.funded_fractions` and `total_fractions`; subscribe to `invoices` updates and fall back to 2s polling |
| FUND-04 | Each fraction displays expected return (principal + interest) before purchase | Compute per-fraction purchase price from `fractions.net_amount`; compute expected return from the invoice face value share and discount rate |
| FUND-05 | Funding progress updates in real-time via Supabase subscriptions | Enable `invoices` and `fractions` on `supabase_realtime`, use one channel per view, and degrade cleanly to polling when channel health drops |
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

Phase 3 should extend the Phase 2 handoff instead of creating a second funding architecture. The database already contains funding-ready invoices (`status='funding'`), exact fraction rows, investor-facing read policies, and a browser Supabase client. The missing pieces are a marketplace read model, a purchase RPC, realtime publication enablement, and investor-facing UI on the stable `/inversor/dashboard` route.

The strongest planning decision is to make `public.fund_invoice(...)` the sole correctness boundary for purchases. Current Phase 2 work already proved the pattern with `public.tokenize_invoice(...)`: application code validates/authenticates, but the database function owns the transaction, locking, counter update, transaction rows, and final status transition. Phase 3 should mirror that pattern rather than doing any read-then-write purchase flow in TypeScript.

Realtime should be driven from invoice-level progress, not from a noisy marketplace-wide fraction stream. The purchase RPC should update `invoices.funded_fractions`, and the UI should subscribe primarily to `public.invoices` changes. `public.fractions` subscriptions are still useful for a single-invoice detail view or purchase drawer, but the marketplace grid itself should stay invoice-centric and fall back to 2-second polling if channel health is poor.

**Primary recommendation:** Upgrade `/inversor/dashboard` into the marketplace landing, add a `public.fund_invoice(...)` RPC plus a fraction-purchase event trigger, enable `invoices`/`fractions` in `supabase_realtime`, and keep all purchase writes behind one server action that calls the RPC.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.2.1` (repo), `16.2.1` latest | App Router pages, Server Actions, RSC | Already installed and matches the existing auth + server-action architecture |
| `react` | `19.2.0` (repo), `19.2.4` latest | Interactive client islands for realtime and purchase UX | Existing app runtime; no Phase 3-specific reason to upgrade |
| `@supabase/supabase-js` | `2.100.1` (repo/latest) | Browser reads, realtime subscriptions, RPC calls | Official client for subscriptions and database RPC |
| `@supabase/ssr` | `0.9.0` (repo/latest) | Authenticated server/browser client setup | Already powers route protection and server queries |
| `zod` | `4.3.6` | Purchase input validation | Continue the current server-action boundary pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-hook-form` | `7.72.0` | Purchase quantity form state | Use for fraction-quantity selection if Phase 3 uses a modal/form UX |
| `sonner` | `2.0.7` | Purchase success/error toasts | Use for optimistic UX around RPC results |
| `@playwright/test` | `1.55.1` (repo), `1.58.2` latest | Desktop/mobile browser verification | Existing project exit gate for changed flows |
| `vitest` | `3.2.4` (repo), `4.1.2` latest | Unit/integration regression tests | Existing project test runner |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Action → RPC purchase flow | Route Handler + direct table mutations | More boilerplate and weaker invariant protection |
| Invoice-level realtime | Marketplace-wide fraction subscriptions | Higher event volume and more client complexity |
| Realtime-first with polling fallback | Polling only | Simpler, but misses the roadmap requirement unless subscriptions remain primary |

**Installation:**
```bash
# No new runtime dependency is required for Phase 3.
# Reuse the existing app stack.
```

**Version verification:**
- `next@16.2.1` — npm latest verified 2026-03-28
- `react@19.2.4` — npm latest verified 2026-03-28; repo is on `19.2.0`, which is acceptable for planning
- `@supabase/supabase-js@2.100.1` — npm latest verified 2026-03-28
- `@supabase/ssr@0.9.0` — npm latest verified 2026-03-28
- `@playwright/test@1.58.2` — npm latest verified 2026-03-28; repo is on `1.55.1`, no required upgrade for this phase
- `vitest@4.1.2` — npm latest verified 2026-03-28; repo is on `3.2.4`, no required upgrade for this phase

## Architecture Patterns

### Current Architecture Touchpoints

| Existing Touchpoint | Reuse in Phase 3 |
|---------------------|------------------|
| `src/app/(inversor)/inversor/dashboard/page.tsx` | Stable investor landing route; should become the marketplace page rather than adding a new post-login destination |
| `src/app/(inversor)/layout.tsx` + `src/lib/auth/guards.ts` + `proxy.ts` | Keeps marketplace routes investor-only without new auth plumbing |
| `src/lib/supabase/server.ts` / `src/lib/supabase/client.ts` | Server query for initial render; browser client for realtime/polling |
| `src/components/invoices/risk-badge.tsx` | Reuse the A/B/C/D visual contract on marketplace cards |
| `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` | Extend this existing detail page with funding progress for the issuer; no new cedente route needed |
| `public.transition_invoice(...)` | Remains the only status-transition boundary; `fund_invoice(...)` should call it when funding reaches 100% |
| `public.tokenize_invoice(...)` | Proven pattern for atomic DB correctness boundaries; Phase 3 should mirror it |
| `public.invoices.total_fractions` + `funded_fractions` | Canonical progress fields for marketplace cards and realtime updates |
| `public.fractions` | Canonical purchasable units; purchase logic should update these rows, not invent a second holdings table |
| `public.transactions` | Existing append-only ledger for `fraction_purchase` rows |
| `public.events` | Existing audit spine, but it currently logs invoice transitions only; Phase 3 should add fraction-purchase events |

### Existing Schema / Function Reuse

| Existing Table / Function | Reuse Strategy | Phase 3 Gap |
|---------------------------|----------------|-------------|
| `public.invoices` | Marketplace source table for funding invoices, risk tier, discount rate, face value, and progress counters | Needs invoice progress updates during purchases; no realtime publication yet |
| `public.fractions` | Individual purchasable units; already statused as `available` / `sold` | No purchase RPC or fraction-purchase trigger yet |
| `public.transactions` | Store `fraction_purchase` ledger rows | Funding path must start inserting rows; `transactions_fraction_id_fkey` should gain an index |
| `public.events` | Timeline/audit sink | Needs a trigger for `available -> sold` fraction updates |
| `public.transition_invoice(...)` | Auto-transition `funding -> funded` when the last fraction sells | Must be called by the new funding RPC |
| `public.user_role()` | Fast DB-side investor role check | Funding RPC should use it internally before mutating data |

### Required New Routes / Components / Actions / Functions

#### Routes
- **Modify** `src/app/(inversor)/inversor/dashboard/page.tsx` — make this the marketplace landing because current auth redirects already point here.
- **Modify** `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` — add a read-only funding progress module so cedentes can watch live progress on the existing detail page.
- **Optional** `src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx` — only if the planner wants a dedicated investor detail page instead of a modal/drawer. Not required for Phase 3 success criteria.

#### Components
- `src/components/marketplace/marketplace-grid.tsx` — client/server boundary for the investor listing
- `src/components/marketplace/marketplace-card.tsx` — invoice card with risk badge, progress, maturity, and CTA
- `src/components/marketplace/funding-progress-bar.tsx` — shared percentage + fraction counts for investor and cedente views
- `src/components/marketplace/purchase-fractions-form.tsx` — quantity selector + submit UX
- `src/components/marketplace/expected-return-preview.tsx` — purchase price, expected return, and yield preview
- `src/components/marketplace/realtime-status.tsx` — shows “Live” vs “Polling fallback” for operator clarity during demo

#### Server Actions / TS functions
- `src/lib/marketplace/queries.ts` — `getMarketplaceInvoices()`, `getInvoiceFundingSnapshot(invoiceId)`
- `src/lib/marketplace/actions.ts` — `purchaseFractionsAction({ invoiceId, fractionCount })`
- `src/lib/marketplace/calculations.ts` — progress %, per-fraction expected return, total checkout summary
- `src/lib/marketplace/realtime.ts` or `src/hooks/use-marketplace-realtime.ts` — channel lifecycle + polling fallback

#### Database functions / migrations
- `public.fund_invoice(p_invoice_id uuid, p_fraction_count integer)` — **required** correctness boundary
- `log_fraction_purchase()` trigger on `public.fractions` — **required** for audit/timeline continuity
- Realtime publication migration — **required** to add `public.invoices` and `public.fractions` to `supabase_realtime`
- Index migration — **recommended** for `public.transactions(fraction_id)` and `public.fractions(invoice_id, status, fraction_index)`

### Pattern 1: Server-render the marketplace, hydrate only the live pieces
**What:** The investor dashboard should fetch its initial funding list in an RSC/server query, then hand it to a client island that manages realtime and purchase UX.
**When to use:** Marketplace landing and any invoice funding module.
**Why:** It matches the current auth/query split, keeps SEO/first paint simple, and limits client complexity to the parts that need subscriptions.

### Pattern 2: Purchase flow = Server Action → RPC, never direct table writes
**What:** The client submits `invoiceId + fractionCount` to a server action. The action validates input and session, then calls `supabase.rpc('fund_invoice', ...)`.
**When to use:** Every investor purchase.
**Why:** Current RLS intentionally allows investors to read but not directly update `fractions` or `invoices`. Keep that boundary.

### Pattern 3: Realtime should be invoice-driven, with polling fallback
**What:** Subscribe to `public.invoices` changes for marketplace progress and status. Use `public.fractions` subscriptions only for a single-invoice view when detailed row ownership matters.
**When to use:** Dashboard-wide cards and any detailed purchase screen.
**Why:** The invoice already has `funded_fractions`; updating that in the RPC makes the marketplace grid cheap to keep live.

### Pattern 4: Shared funding UI across roles
**What:** The same progress and return-preview primitives should render on investor cards and the cedente detail page.
**When to use:** Anywhere Phase 3 shows funding progress.
**Why:** Phase 2 already established reusable invoice UI (`risk-badge`, detail page cards); keep Phase 3 equally compositional.

### Real-time Strategy

#### Primary path
1. Add `public.invoices` and `public.fractions` to the `supabase_realtime` publication.
2. On `/inversor/dashboard`, fetch the initial marketplace list server-side.
3. In a single client channel, listen to `public.invoices` `INSERT`/`UPDATE` events for funding/funded rows and patch local card state.
4. If an investor opens a single-invoice purchase panel or detail page, attach one invoice-scoped `public.fractions` listener for that invoice only.
5. Remove channels on unmount/navigation.

#### Fallback path
- If the channel does not reach `SUBSCRIBED`, errors, or closes unexpectedly, switch to 2-second polling using the browser client and the same RLS-safe marketplace query.
- Keep the polling fallback visible in the UI via a small status chip; this helps demo operators explain degraded realtime without guessing.
- Do not run both full polling and broad subscriptions forever; polling is a fallback mode, not the steady state.

#### Current blocker found during research
- `pg_publication_tables` currently shows **no** `public` tables in `supabase_realtime`, so subscriptions will not work until Phase 3 adds a migration or dashboard change.

### Race-condition-safe funding path

**Recommended RPC contract:**
- Prefer `public.fund_invoice(p_invoice_id uuid, p_fraction_count integer)` and derive the actor from `auth.uid()` inside the function.
- Validate that the caller is authenticated and `public.user_role() = 'inversor'`.
- Explicitly `revoke execute ... from public` and `grant execute ... to authenticated, service_role`.

**Recommended transaction flow inside `fund_invoice(...)`:**
1. `SELECT ... FROM public.invoices WHERE id = p_invoice_id FOR UPDATE`.
2. Reject unless invoice status is `funding`.
3. Lock the requested number of `available` fraction rows ordered by `fraction_index` with `FOR UPDATE SKIP LOCKED`.
4. If fewer than `p_fraction_count` rows are locked, raise an error or return a structured rejection; do **not** partially overfill without an explicit product decision.
5. Update the locked fractions to `status='sold'`, set `investor_id`, and stamp `purchased_at`.
6. Insert one `transactions` row per purchased fraction with `type='fraction_purchase'` and `amount = fractions.net_amount`.
7. Increment `public.invoices.funded_fractions` by the number of sold rows.
8. If `funded_fractions = total_fractions`, call `public.transition_invoice(..., 'funded', auth.uid())`.
9. Return a compact result payload: purchased count, checkout total, new funded count, funding percentage, and final invoice status.

**Expected return calculation guidance:**
- Purchase price should come from `fractions.net_amount`.
- Because fractions currently store discounted values only, compute display-time expected return from proportional face-value share:
  - `expectedReturn = round((fraction.net_amount / invoice.net_amount) * invoice.amount, 2)`
  - `interest = expectedReturn - fraction.net_amount`
- This is sufficient for Phase 3 display. Phase 4 settlement should centralize the exact same pro-rata math in the database to avoid drift.

### Anti-Patterns to Avoid
- **Direct `update fractions ...` from the app:** breaks concurrency guarantees and bypasses the intended boundary.
- **Making realtime depend on marketplace-wide fraction events:** too chatty; use invoice counters for the grid.
- **Passing `investor_id` from the browser into a security-definer RPC without validation:** invites spoofing; derive from `auth.uid()`.
- **Using `reserved` as a fake escrow phase for v1:** payment gateways are explicitly out of scope; sell directly in one atomic transaction.
- **Relying on realtime alone:** roadmap already documents a 2-second polling fallback; keep it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Purchase concurrency | App-level read-then-write purchase code | `public.fund_invoice(...)` with locks | Prevents over-funding and double-sells |
| Funding progress | Separate denormalized marketplace table | Existing `invoices.funded_fractions` / `total_fractions` | Already fits the roadmap and realtime feed |
| Investor gating | Client-only role checks | Existing `proxy.ts`, `requireRole`, and RLS | Security is already solved upstream |
| Realtime transport | Custom WebSocket server | Supabase Realtime + polling fallback | Lowest integration cost, matches current stack |
| Return preview | Hardcoded percentages in UI | Shared calculation helper from invoice + fraction data | Keeps card, modal, and tests consistent |

**Key insight:** Phase 3 is mostly a composition phase. The codebase already has the right app shell, auth boundaries, and funding-ready data; the only hard new problem is the purchase transaction boundary.

## Common Pitfalls

### Pitfall 1: Realtime is coded before publication is enabled
**What goes wrong:** subscriptions connect but no marketplace cards update.
**Why it happens:** `public.invoices` and `public.fractions` are not currently in `supabase_realtime`.
**How to avoid:** make publication enablement a Wave 0 task and verify it before building live UI.
**Warning signs:** channel status is healthy but no payloads arrive.

### Pitfall 2: Over-funding via concurrent purchases
**What goes wrong:** two investors each buy the "last" fractions and the invoice over-sells.
**Why it happens:** purchase logic reads remaining supply outside the database transaction boundary.
**How to avoid:** use `FOR UPDATE` on the invoice row and lock the candidate fraction rows in the same function.
**Warning signs:** `funded_fractions > total_fractions` or more sold rows than total fractions.

### Pitfall 3: Marketplace cards subscribe to fraction events directly
**What goes wrong:** noisy updates, duplicate handling, and more complexity than needed.
**Why it happens:** the UI ignores the fact that the invoice already stores a funding counter.
**How to avoid:** use invoice updates for the dashboard and reserve fraction subscriptions for one invoice at a time.
**Warning signs:** a single purchase causes many dashboard re-renders.

### Pitfall 4: Expected return math drifts from future settlement math
**What goes wrong:** the investor preview says one thing and the later settlement distributes another.
**Why it happens:** Phase 3 invents ad hoc UI math unrelated to the database's eventual pro-rata rule.
**How to avoid:** centralize the proportional formula in one helper now and mirror it in Phase 4 DB logic.
**Warning signs:** preview totals do not sum back to invoice face value.

### Pitfall 5: Security-definer RPC is left broadly executable
**What goes wrong:** anonymous or wrong-role callers can hit the funding function.
**Why it happens:** Postgres functions are executable broadly unless permissions are tightened.
**How to avoid:** set `search_path`, revoke public execute, grant only what is needed, and re-check role inside the function.
**Warning signs:** the function succeeds from contexts that should only have read access.

## Code Examples

Verified patterns from official sources:

### Subscribe to Postgres changes with one channel
```typescript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes
const channel = supabase
  .channel('marketplace-feed')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'invoices' },
    (payload) => {
      // patch local marketplace state
    },
  )
  .subscribe()

// cleanup
await supabase.removeChannel(channel)
```

### Call a Postgres RPC from Supabase JS
```typescript
// Source: https://supabase.com/docs/reference/javascript/rpc
const { data, error } = await supabase.rpc('fund_invoice', {
  p_invoice_id: invoiceId,
  p_fraction_count: fractionCount,
})
```

### Enable Realtime for target tables
```sql
-- Source: https://supabase.com/docs/guides/realtime/postgres-changes
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.fractions;
```

### Shared funding progress helper
```typescript
export function getFundingProgress(fundedFractions: number, totalFractions: number) {
  if (totalFractions <= 0) return 0
  return Math.round((fundedFractions / totalFractions) * 100)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Build custom sockets for live dashboards | Use Supabase Realtime channels on Postgres changes | Current Supabase guidance | Faster integration for a hackathon stack |
| API route orchestrates multi-table purchase writes | Database RPC called from `supabase-js` | Current Supabase + current project pattern | Stronger invariants, less boilerplate |
| Broad client subscriptions everywhere | Narrow, table-specific subscriptions with cleanup and fallback | Current Supabase docs + project pitfalls | Lower DB and client noise |

**Deprecated/outdated:**
- Treating direct app-level table mutations as acceptable for concurrent purchase flows.
- Assuming Realtime works without explicitly adding tables to `supabase_realtime`.

## Open Questions

1. **Should partial fulfillment be allowed when fewer fractions remain than requested?**
   - What we know: the requirement only says investors can purchase one or more fractions; it does not require partial fills.
   - What's unclear: whether the UX should auto-buy the remaining quantity or reject the request.
   - Recommendation: reject with a clear message in Phase 3 for deterministic demo behavior; partial fill can be a future enhancement.

2. **Does Phase 3 need a dedicated investor invoice detail route?**
   - What we know: success criteria can be satisfied from a marketplace landing plus purchase panel.
   - What's unclear: whether the planner wants a cleaner route-based purchase flow for richer UX.
   - Recommendation: keep `/inversor/dashboard` as the primary marketplace surface and add a dedicated detail route only if a later plan needs it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js app/runtime | ✓ | `v20.13.0` | — |
| npm | Scripts/dependencies | ✓ | `10.5.2` | — |
| Playwright CLI | Required browser verification | ✓ | `1.58.2` | — |
| Vitest | Unit/integration verification | ✓ | `3.2.4` | — |
| Supabase CLI | Migrations/type workflows | ✓ | `2.67.1` | Supabase MCP/dashboard if CLI friction appears |
| Hosted Supabase project | Auth, DB, Realtime target | ✓ | existing project | — |
| Realtime publication on `public.invoices` / `public.fractions` | FUND-05 live updates | ✗ | — | 2-second polling fallback until enabled |

**Missing dependencies with no fallback:**
- None that block planning.

**Missing dependencies with fallback:**
- Realtime publication is not enabled for the needed tables yet; Phase 3 can still execute with the documented polling fallback while adding the publication migration.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run tests/marketplace tests/invoices/fund-invoice.test.ts` |
| Full suite command | `npx vitest run && npx playwright test tests/e2e/marketplace-funding.spec.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FUND-01 | Investor sees funding invoices with risk, rate, and progress | integration + e2e | `npx vitest run tests/marketplace/queries.test.ts && npx playwright test tests/e2e/marketplace-funding.spec.ts --project=chromium` | ❌ Wave 0 |
| FUND-02 | Investor buys one or more fractions via the RPC boundary | integration | `npx vitest run tests/invoices/fund-invoice.test.ts` | ❌ Wave 0 |
| FUND-03 | Funding percentage updates after purchases | unit + e2e | `npx vitest run tests/marketplace/progress.test.ts && npx playwright test tests/e2e/marketplace-funding.spec.ts --project=chromium` | ❌ Wave 0 |
| FUND-04 | UI shows expected return before purchase | unit + e2e | `npx vitest run tests/marketplace/returns.test.ts && npx playwright test tests/e2e/marketplace-funding.spec.ts --project=chromium` | ❌ Wave 0 |
| FUND-05 | Live updates work via Supabase subscriptions, with fallback path available | integration + e2e/manual | `npx vitest run tests/marketplace/realtime.test.ts && npx playwright test tests/e2e/marketplace-funding.spec.ts --project="Mobile Chrome"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest for the touched marketplace/funding area
- **Per wave merge:** `npx vitest run`
- **Phase gate:** targeted Vitest + Playwright desktop/mobile funding happy path + one two-browser realtime check (or fallback demonstration if Realtime is intentionally degraded)

### Wave 0 Gaps
- [ ] `tests/invoices/fund-invoice.test.ts` — RPC concurrency and final-state assertions
- [ ] `tests/marketplace/queries.test.ts` — funding-list read model coverage
- [ ] `tests/marketplace/progress.test.ts` — progress percentage helpers
- [ ] `tests/marketplace/returns.test.ts` — expected return math
- [ ] `tests/marketplace/realtime.test.ts` — subscription/fallback state machine
- [ ] `tests/e2e/marketplace-funding.spec.ts` — investor browse + buy + live-update happy path on desktop/mobile

## Dependencies / Blockers

### Dependencies
- Phase 1 auth/RBAC foundation is already present and reusable.
- Phase 2 leaves invoices in `funding` with complete fraction rows and token hashes; current database data confirms three funding-ready invoices with 8 available fractions each.
- Existing RLS already allows investor read access to marketplace invoices and available fractions.
- Existing Playwright cleanup patterns and admin-client approach can be reused for investor purchase E2E tests.

### Non-human blockers / execution risks
- `public.fund_invoice(...)` does not exist yet.
- `public.events` currently records invoice transitions only; fraction purchases will not appear in the audit trail until a trigger is added.
- `supabase_realtime` currently has no `public` tables published, so live updates are not wired yet.
- Performance advisor flagged the missing `transactions(fraction_id)` index; Phase 3 is the right time to add it because purchases will start using that foreign key heavily.

### Human blockers
- None identified.

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` - Phase 3 goal, requirements, success criteria, and the explicit `fund_invoice()` + polling-fallback direction
- `.planning/REQUIREMENTS.md` - exact requirement text for FUND-01..05
- `.planning/STATE.md` - Phase 3 readiness and Phase 2 handoff state
- `.planning/phases/01-foundation-auth/01-RESEARCH.md` - inherited auth/RBAC/Supabase architecture
- `.planning/phases/02-invoice-origination-risk-engine/02-RESEARCH.md` - funding handoff assumptions and reused touchpoints
- `.planning/phases/02-invoice-origination-risk-engine/02-03-SUMMARY.md` - established server-action and stored-detail patterns
- `.planning/phases/02-invoice-origination-risk-engine/02-04-SUMMARY.md` - atomic tokenization-to-funding pattern and data handoff
- `.planning/phases/02-invoice-origination-risk-engine/02-VALIDATION.md` - verified funding-ready invoice outputs
- `src/app/(inversor)/inversor/dashboard/page.tsx` - current investor landing route to extend
- `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` - current cedente detail route to extend with funding progress
- `src/lib/invoices/actions.ts` - existing server-action → RPC orchestration pattern
- `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `proxy.ts`, `src/lib/auth/guards.ts` - current auth/query/realtime client boundaries
- `supabase/migrations/0001_foundation_schema.sql` - current schema, enums, transition function, transactions/events tables
- `supabase/migrations/0002_rls_and_rbac.sql` - current investor/cedente read policies and mutation limits
- `supabase/migrations/0004_phase2_tokenize_invoice.sql` - current atomic RPC pattern to mirror
- `https://supabase.com/docs/guides/realtime/postgres-changes` - Postgres changes subscriptions, publication enablement, caveats
- `https://supabase.com/docs/guides/realtime/subscribing-to-database-changes` - channel setup and current guidance on database-change subscriptions
- `https://supabase.com/docs/reference/javascript/rpc` - official RPC invocation pattern from `supabase-js`
- `https://supabase.com/docs/guides/database/functions` - database-function security guidance (`security definer`, `search_path`, execute grants)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` - earlier marketplace/realtime architecture hypotheses worth preserving
- `.planning/research/PITFALLS.md` - concurrency and realtime failure modes that still apply
- `.planning/research/SUMMARY.md` - prior phase decomposition and funding flow framing

### Tertiary (LOW confidence)
- None required for the core recommendation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phase 3 can reuse the installed stack; official docs validate the critical Supabase patterns
- Architecture: HIGH - current codebase and migrations already define the route/auth/data boundaries Phase 3 should extend
- Realtime strategy: HIGH - official Supabase docs support the subscription model, and research found the concrete current publication gap
- Funding concurrency path: MEDIUM-HIGH - the DB-function recommendation is strongly supported by current project constraints and existing RPC patterns; the exact RPC return shape remains a planning choice

**Research date:** 2026-03-28
**Valid until:** 2026-04-04
