# Phase 2: Invoice Origination & Risk Engine - Research

**Researched:** 2026-03-28
**Domain:** Next.js invoice origination + Supabase-backed risk pipeline + BCRA integration + deterministic/LLM scoring
**Confidence:** MEDIUM-HIGH

## User Constraints

- No `02-CONTEXT.md` exists for this phase.
- Use `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, existing Phase 1 artifacts, and the current codebase as source of truth.
- Research only; do not implement product code in this phase artifact.
- Phase focus is fixed by roadmap: invoice upload, BCRA-based payer scoring, deterministic fallback, SHA-256 tokenization, and fraction creation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | PyME can upload invoice with payer CUIT, face value, due date, and description | New cedente invoice form, `invoices` insert flow, schema migration for missing `description` column |
| INV-03 | System generates SHA-256 hash as unique token ID upon tokenization | Node `crypto` hash utility + atomic tokenization write path |
| INV-05 | Tokenized invoice is split into configurable fractions for marketplace listing | Deterministic fraction splitter with remainder-on-last-fraction + `fractions` inserts + transition to `funding` |
| RISK-01 | System scores payer credit risk using payer CUIT | BCRA lookup pipeline keyed by `pagador_cuit` |
| RISK-02 | System classifies payer into risk tier (A/B/C/D) | Deterministic engine as source of truth; optional LLM narrative layered on top |
| RISK-03 | System calculates dynamic discount rate from risk tier + days to maturity | Shared pricing utility using tier + days-to-maturity formula |
| RISK-04 | System fetches real BCRA data for the payer | Server-side BCRA client/proxy + cache-first strategy in `bcra_cache` |
| RISK-05 | LLM generates human-readable risk narrative citing specific BCRA data points | AI SDK structured output with explicit evidence fields and validation |
| RISK-06 | Deterministic fallback engine produces risk tier + rate when BCRA or LLM are unavailable | Cache-first + timeout + rule-based engine that never depends on live LLM success |
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

Phase 2 should be planned as a cedente-only origination pipeline that reuses almost all of Phase 1’s foundations instead of introducing a second architecture. The current codebase already has the right auth boundaries (`proxy.ts`, `requireRole`, Supabase SSR clients), the right persistence model (`invoices`, `fractions`, `events`, `bcra_cache`), and the right state machine (`transition_invoice`). The planner should keep writes in Server Actions, keep reads in Supabase/RSC, and reserve Route Handlers for the BCRA proxy/diagnostics path only.

The main schema gap is that `INV-01` requires an invoice description, but `public.invoices` does not currently have a `description` column. Beyond that, most of the needed persistence already exists. Phase 2 should therefore bias toward minimal schema changes, a deterministic risk engine first, and an atomic tokenization step that creates fractions and drives the invoice to `funding` without leaking intermediate inconsistencies to Phase 3.

The only materially uncertain integration is live BCRA contract verification. Existing project research consistently targets `centraldedeudores/v1.0`, but direct probes from this environment did not return a confirmed usable response. That is not a human blocker because the roadmap already mandates cache + graceful degradation; it does mean execution should include a Wave 0 contract-verification task before wiring the final proxy/parser.

**Primary recommendation:** Plan Phase 2 around one cedente flow: create draft invoice → transition to `validating` → fetch/cache/normalize BCRA data → compute deterministic tier/rate → optionally generate LLM narrative → persist results → tokenize atomically → transition to `funding`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `16.2.1` | App Router pages, Server Actions, Route Handlers | Already installed and matches current project architecture |
| `@supabase/supabase-js` | `2.100.1` | Database/auth client | Already the project’s persistence/auth spine |
| `@supabase/ssr` | `0.9.0` | SSR auth/cookie handling | Already used in Phase 1 and required for secure server actions |
| `zod` | `4.3.6` | Input/output validation | Reuse for invoice form payloads, BCRA normalization, and LLM schemas |
| `react-hook-form` | `7.72.0` | Cedente invoice form state | Already installed and matches current auth form pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ai` | `6.0.141` | Structured LLM generation/streaming | Use for risk narrative only; deterministic engine remains authoritative |
| `@ai-sdk/openai` | `3.0.48` | OpenAI provider for AI SDK | Use if Phase 2 keeps OpenAI as the LLM provider |
| `date-fns` | `4.1.0` | Days-to-maturity/date formatting | Useful for pricing math and due-date UI |
| `sonner` | `2.0.7` | Toasts for submit/validate/tokenize states | Optional for UX polish, not required for core correctness |
| `lucide-react` | `1.7.0` | Icons for risk badges/status UI | Optional for polish |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AI SDK structured output | Raw OpenAI SDK | Slightly fewer dependencies, but weaker alignment with typed object generation/streaming patterns |
| BCRA Route Handler proxy | Direct server-side fetches only | Simpler code, but worse debuggability/reuse if multiple server paths need the same normalization/cache behavior |
| App-level tokenization loop | SQL function for tokenization | App-only is faster to write, but SQL function is safer if you want atomic fraction creation + status mutation |

**Installation:**
```bash
npm install ai @ai-sdk/openai date-fns sonner lucide-react
```

**Version verification:**
- `ai@6.0.141` — npm latest verified 2026-03-28
- `@ai-sdk/openai@3.0.48` — npm latest verified 2026-03-28
- `date-fns@4.1.0` — npm latest verified 2026-03-28
- `lucide-react@1.7.0` — npm latest verified 2026-03-28
- `sonner@2.0.7` — npm latest verified 2026-03-28

## Architecture Patterns

### Current Architecture Touchpoints

| Existing Touchpoint | Reuse in Phase 2 |
|---------------------|------------------|
| `proxy.ts` | Keeps `/cedente/*` protected while invoice origination screens are added |
| `src/lib/auth/guards.ts` + `(cedente)` layout | Ensures invoice origination pages/actions remain cedente-only |
| `src/lib/supabase/server.ts` | Server Actions should use this client for authenticated writes |
| `public.transition_invoice()` | Remains the only allowed state-transition path |
| `public.events` | Captures transition audit log automatically; Phase 2 should keep passing `actor_id` |
| `public.bcra_cache` | Reuse as the canonical cache for BCRA responses; do not expose directly to clients |
| Existing Playwright/Vitest harness | Extend rather than replace for Phase 2 validation |

### Recommended Project Structure

```text
src/
├── app/
│   ├── (cedente)/cedente/invoices/new/page.tsx      # invoice origination form
│   ├── (cedente)/cedente/invoices/[invoiceId]/page.tsx
│   └── api/bcra/[resource]/route.ts                 # optional server-only proxy/diagnostic path
├── components/
│   └── invoices/
│       ├── invoice-origination-form.tsx
│       ├── risk-summary-card.tsx
│       ├── risk-badge.tsx
│       ├── tokenization-summary.tsx
│       └── invoice-status-stepper.tsx
├── lib/
│   ├── invoices/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── schemas.ts
│   ├── risk/
│   │   ├── bcra.ts
│   │   ├── normalize.ts
│   │   ├── deterministic.ts
│   │   └── llm.ts
│   └── tokenization/
│       ├── hash.ts
│       └── fractions.ts
supabase/
└── migrations/
    └── 0003_phase2_invoice_origination.sql
```

### Pattern 1: Server Action orchestration, not client mutation chains
**What:** The client form submits once to a server action that authenticates, validates, writes the draft invoice, and orchestrates validation/tokenization steps.
**When to use:** All cedente-originated mutations.
**Why:** It matches current auth patterns and avoids leaking service-level concerns to the browser.

### Pattern 2: Cache-first BCRA lookup with normalized output
**What:** Server code first checks `bcra_cache`, then calls the live BCRA source with a 5s timeout only on miss/stale, then stores normalized raw payloads back into cache.
**When to use:** Every risk computation.
**Why:** This satisfies roadmap fallback requirements and de-risks demo latency.

### Pattern 3: Deterministic engine is the source of truth; LLM is presentation
**What:** Tier and discount rate come from deterministic code. The LLM only produces a narrative and must cite already-computed evidence.
**When to use:** All Phase 2 scoring flows.
**Why:** It guarantees RISK-06 and prevents the LLM from becoming a correctness boundary.

### Pattern 4: Atomic tokenization boundary
**What:** Hash generation, fraction creation, invoice net amount update, and `validated → tokenized → funding` transitions should occur in one transactional boundary.
**When to use:** Final step after a successful risk assessment.
**Why:** It prevents partially-tokenized invoices and keeps Phase 3 marketplace reads clean.

### Required New Routes / Components / Actions / Functions

#### Routes
- `src/app/(cedente)/cedente/invoices/new/page.tsx` — primary invoice upload/origination screen
- `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` — post-submit detail/status/risk/tokenization result
- `src/app/api/bcra/[resource]/route.ts` — optional but recommended server-only proxy for BCRA contract normalization, cache warmup, and diagnostics

#### Components
- `src/components/invoices/invoice-origination-form.tsx` — cedente form following the current RHF + zod pattern
- `src/components/invoices/risk-summary-card.tsx` — tier, rate, and evidence summary
- `src/components/invoices/risk-badge.tsx` — A/B/C/D badge reused later in marketplace cards
- `src/components/invoices/tokenization-summary.tsx` — token hash preview, fraction count, remainder handling summary
- `src/components/invoices/invoice-status-stepper.tsx` — visual state progress through `draft → funding`

#### Server Actions / TS functions
- `createInvoiceDraftAction(formData)`
- `validateInvoiceRiskAction(invoiceId)` or a combined `submitInvoiceForOriginationAction(formData)`
- `tokenizeInvoiceAction(invoiceId, totalFractions)`
- `startInvoiceFundingAction(invoiceId)` only if tokenization and funding are intentionally split in the UI
- `validateCuit()`, `normalizeBcraPayload()`, `scoreInvoiceDeterministically()`, `generateRiskNarrative()`, `buildInvoiceTokenHash()`, `splitInvoiceIntoFractions()`

#### Database functions / migrations
- **Required migration:** add `public.invoices.description text not null`
- **Recommended hardening:** add `check (risk_tier in ('A','B','C','D'))` or convert `risk_tier` to an enum/check-constrained text column
- **Recommended index:** `idx_invoices_pagador_cuit` for invoice queries by payer CUIT
- **Optional SQL function:** `public.tokenize_invoice(p_invoice_id uuid, p_fraction_count integer, p_actor_id uuid)` for atomic fraction creation and transition chaining

### Schema Reuse

| Existing Table/Field | Reuse Strategy | Phase 2 Change Needed |
|----------------------|----------------|-----------------------|
| `invoices` | Primary aggregate for origination, risk result, tokenization metadata | Add `description`; optionally tighten `risk_tier` constraint |
| `invoices.bcra_data` | Store normalized merged BCRA snapshot used for scoring | No schema change required |
| `invoices.token_hash` | Store SHA-256 simulated token ID | No schema change required |
| `invoices.net_amount` | Store discounted amount after pricing | No schema change required |
| `invoices.total_fractions` / `funded_fractions` | Marketplace handoff fields for Phase 3 | No schema change required |
| `fractions` | Reuse for all fractionalization records | No schema change required; Phase 2 owns initial inserts |
| `events` | Transition audit trail already works | No schema change required |
| `bcra_cache` | Reuse for cache TTL and prewarmed demo CUITs | No schema change required |
| `transactions` | Not needed yet for Phase 2 happy path | Leave untouched |

### Anti-Patterns to Avoid
- **Client-side BCRA calls:** exposes a brittle public dependency and bypasses cache control.
- **LLM decides tier/rate:** violates RISK-06 and makes correctness nondeterministic.
- **Direct status updates with `update invoices set status = ...`:** must go through `transition_invoice()`.
- **Fraction split with naive division only:** guarantees rounding drift.
- **Writing to `bcra_cache` from user-scoped clients:** keep it server/service-role only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA tokenization | Custom crypto package | Node `crypto.createHash('sha256')` | Built-in, deterministic, zero dependency |
| LLM output parsing | Regex/manual JSON extraction | AI SDK `generateObject()` / validated schema | Safer structured output |
| Invoice state machine | Ad hoc status strings | Existing `transition_invoice()` | DB-enforced sequence already exists |
| BCRA persistence cache | In-memory process cache only | `bcra_cache` table | Survives deploys and supports prewarming |
| Fraction math | UI-driven split logic | Shared server utility or SQL function | Keeps sums exact and reproducible |

**Key insight:** Phase 2 is mostly an orchestration problem. The project already has the durable schema and auth base; the planner should avoid inventing new infrastructure layers.

## External API Strategy for BCRA

### Recommended approach
1. Validate and sanitize CUIT input on the server (`digits only` + checksum validation).
2. Read `bcra_cache` for a non-expired row first.
3. On miss/stale, call the three project-assumed Central de Deudores endpoints with a shared 5s timeout.
4. Normalize each response into a stable internal shape with defaults for missing/empty structures.
5. Upsert raw endpoint payloads plus timestamps into `bcra_cache`.
6. Merge normalized BCRA data into a single risk-input object and persist that snapshot into `invoices.bcra_data`.

### Operational notes
- Pre-warm the three seeded demo CUITs already present in `supabase/seed.sql`.
- Treat live BCRA as best-effort enrichment, not a hard runtime dependency.
- Keep the cache TTL long enough for demo safety; the current schema defaults to 7 days and that is acceptable for hackathon scope.
- Add a small internal diagnostic path or script so execution can verify the live contract fast before wiring the final parser.

### Confidence note
Existing roadmap/project research consistently references `centraldedeudores/v1.0` debt/historical/rejected-check endpoints, but direct probe attempts from this environment did not yield a confirmed working contract. Plan around that uncertainty by making “verify live BCRA response contract” the first execution task in the phase.

## LLM + Fallback Strategy

### Deterministic engine (authoritative)
Recommended minimum rubric:
- Primary signal: current BCRA `situacion`
- Secondary signals: historical trend, rejected checks count/amount, days to maturity, invoice amount vs total exposure
- Output fields: `tier`, `discountRate`, `signals`, `fallbackUsed`

Suggested default mapping:
- `situacion 1` → Tier `A`
- `situacion 2` → Tier `B`
- `situacion 3` → Tier `C`
- `situacion >= 4` → Tier `D`

Then adjust rate within a bounded range using days-to-maturity and adverse signals.

### LLM layer (non-authoritative)
- Input: normalized BCRA snapshot + deterministic tier/rate + 3-5 evidence bullets
- Output: narrative only, plus optionally `citations/evidence` strings that must match supplied facts
- Validation: zod schema; if validation fails, keep deterministic result and store a fallback explanation string
- Timeout/rate-limit handling: do not block invoice validation success if the narrative step fails

### Fallback order
1. Fresh `bcra_cache` + deterministic engine + cached/stored narrative
2. Fresh `bcra_cache` + deterministic engine + new LLM narrative
3. Live BCRA fetch + deterministic engine + new LLM narrative
4. Live BCRA fetch fails → deterministic engine from stale cache
5. BCRA and LLM both fail → deterministic engine from stale cache or prewarmed demo payload, with clear internal fallback flag but no user-visible crash

## Common Pitfalls

### Pitfall 1: `INV-01` cannot be met with the current schema
**What goes wrong:** the form collects description, but `public.invoices` has no `description` column.
**Why it happens:** Phase 1 schema optimized for lifecycle, not full origination payload.
**How to avoid:** make the migration the first schema task in Phase 2.
**Warning signs:** server action invents hidden defaults or drops the description field.

### Pitfall 2: BCRA contract drift crashes “good payer” scenarios
**What goes wrong:** parser assumes one response shape and breaks on empty/no-debt payloads.
**Why it happens:** external APIs often vary by debtor status and endpoint state.
**How to avoid:** normalize every endpoint with defaults and fixture-test three payer profiles.
**Warning signs:** one demo CUIT works, another returns null/undefined errors.

### Pitfall 3: Tokenization leaves partial writes
**What goes wrong:** invoice gets `token_hash` but fractions are incomplete, or status reaches `funding` before fractions exist.
**Why it happens:** multiple app-level writes without a single transaction boundary.
**How to avoid:** keep token hash, net amount, fraction inserts, and transition chain atomic.
**Warning signs:** `total_fractions` does not match actual row count in `fractions`.

### Pitfall 4: LLM narrative contradicts deterministic tier
**What goes wrong:** UI shows tier B but explanation sounds tier A or invents unsupported facts.
**Why it happens:** unconstrained prompt/output contract.
**How to avoid:** deterministic tier/rate are inputs, not outputs; validate LLM object strictly.
**Warning signs:** narrative cites data points absent from `bcra_data`.

### Pitfall 5: Phase 2 forgets the Phase 3 handoff
**What goes wrong:** invoices validate but never become visible to investors.
**Why it happens:** plan stops at `tokenized` and omits the final `funding` transition.
**How to avoid:** Phase 2 must end with marketplace-readable `funding` rows and fractions created.
**Warning signs:** investor RLS policy works, but marketplace query returns nothing.

## Code Examples

Verified/current patterns to follow:

### Server Action auth boundary
```typescript
// Source: https://nextjs.org/docs/app/guides/forms
'use server'

export async function submitInvoice(formData: FormData) {
  const raw = Object.fromEntries(formData)
  // zod validate
  // verify auth/role
  // mutate
}
```

### Structured LLM output
```typescript
// Source: https://vercel.com/docs/ai-sdk
import { generateObject } from 'ai'
import { z } from 'zod'

const RiskNarrativeSchema = z.object({
  explanation: z.string(),
  evidence: z.array(z.string()).max(5),
})

const { object } = await generateObject({
  model,
  schema: RiskNarrativeSchema,
  prompt,
})
```

### SHA-256 token hash
```typescript
import { createHash } from 'node:crypto'

export function buildInvoiceTokenHash(payload: object) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
```

### Remainder-safe fraction split
```typescript
export function splitInvoiceIntoFractions(total: number, count: number) {
  const base = Math.floor((total / count) * 100) / 100
  const fractions = Array.from({ length: count }, () => base)
  const assigned = Number((base * count).toFixed(2))
  fractions[count - 1] = Number((fractions[count - 1] + (total - assigned)).toFixed(2))
  return fractions
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API-route-first mutation layer | Server Actions for authenticated mutations | Current Next.js App Router guidance | Phase 2 should keep invoice origination in server actions |
| Unstructured LLM text parsing | Schema-validated object generation | Current AI SDK guidance | Safer risk narrative integration |
| Direct anon-key SSR setup | Publishable-key-friendly SSR split | Current Supabase SSR docs | Keep current Phase 1 client setup |

**Deprecated/outdated:**
- Letting the LLM decide credit tier/rate directly.
- Calling external risk APIs from the browser.

## Open Questions

1. **What exact live BCRA endpoint contract is reachable from the target environment?**
   - What we know: project research and roadmap target the Central de Deudores endpoints; cache-first strategy is already planned.
   - What's unclear: exact current response shape/path availability from this environment.
   - Recommendation: execution Wave 0 should verify the live contract before final parser wiring; no human product input needed.

2. **Should tokenization and listing be one user action or two?**
   - What we know: success criteria require ending in `funding`.
   - What's unclear: whether UX should expose a separate “Tokenizar” confirmation step.
   - Recommendation: keep one happy-path submit-and-process flow for hackathon speed; separate only if UX polish time exists.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js app, server actions, crypto hashing | ✓ | `v20.13.0` | — |
| npm | Package install/scripts | ✓ | `10.5.2` | — |
| Playwright CLI | Required browser verification | ✓ | `1.58.2` | — |
| Vercel CLI | Deploy/preview validation | ✓ | `48.8.0` | Vercel MCP if CLI auth fails |
| Supabase CLI | Local migration/type workflows | ✓ | `2.67.1` | Supabase MCP/dashboard; installed CLI is behind latest |
| Supabase hosted project | Auth/DB target | ✓ | existing project | — |
| `OPENAI_API_KEY` env | LLM narrative generation | ✓ | present | Deterministic narrative fallback if API call fails |
| BCRA live endpoint contract | Real payer-data enrichment | ✗ | unverified from current probes | `bcra_cache` + prewarmed demo CUITs + Wave 0 contract verification |

**Missing dependencies with no fallback:**
- None that block planning.

**Missing dependencies with fallback:**
- Verified live BCRA contract is currently uncertain; planner should include a first execution task to validate and adapt the proxy/parser.
- AI packages are not yet installed in `package.json`; execution can add them without human input.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `npx vitest run tests/invoices tests/risk tests/tokenization` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INV-01 | Cedente submits invoice form and draft row is created | e2e + integration | `npx playwright test tests/e2e/invoice-origination.spec.ts --project=chromium && npx vitest run tests/invoices/create-invoice.test.ts` | ❌ Wave 0 |
| INV-03 | Tokenization generates stable SHA-256 hash | unit | `npx vitest run tests/tokenization/hash.test.ts` | ❌ Wave 0 |
| INV-05 | Fraction split sums exactly and creates marketplace-ready rows | unit + integration | `npx vitest run tests/tokenization/fractions.test.ts tests/invoices/tokenize-invoice.test.ts` | ❌ Wave 0 |
| RISK-01 | Payer risk is derived from payer CUIT lookup | integration | `npx vitest run tests/risk/bcra-client.test.ts tests/risk/deterministic-engine.test.ts` | ❌ Wave 0 |
| RISK-02 | Tier is A/B/C/D from deterministic scoring | unit | `npx vitest run tests/risk/deterministic-engine.test.ts` | ❌ Wave 0 |
| RISK-03 | Discount rate reflects tier + days to maturity | unit | `npx vitest run tests/risk/pricing.test.ts` | ❌ Wave 0 |
| RISK-04 | Live/cached BCRA fetch path works with normalization | integration | `npx vitest run tests/risk/bcra-client.test.ts` | ❌ Wave 0 |
| RISK-05 | Narrative cites known evidence and validates schema | unit/integration | `npx vitest run tests/risk/llm-narrative.test.ts` | ❌ Wave 0 |
| RISK-06 | BCRA/LLM failure still yields deterministic tier/rate | integration | `npx vitest run tests/risk/fallbacks.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Vitest file for the changed subsystem
- **Per wave merge:** `npx vitest run`
- **Phase gate:** `npx vitest run && npx playwright test tests/e2e/invoice-origination.spec.ts --project=chromium && npx playwright test tests/e2e/invoice-origination.spec.ts --project="Mobile Chrome"`

### Wave 0 Gaps
- [ ] `tests/e2e/invoice-origination.spec.ts`
- [ ] `tests/invoices/create-invoice.test.ts`
- [ ] `tests/invoices/tokenize-invoice.test.ts`
- [ ] `tests/risk/bcra-client.test.ts`
- [ ] `tests/risk/deterministic-engine.test.ts`
- [ ] `tests/risk/pricing.test.ts`
- [ ] `tests/risk/llm-narrative.test.ts`
- [ ] `tests/risk/fallbacks.test.ts`
- [ ] `tests/tokenization/hash.test.ts`
- [ ] `tests/tokenization/fractions.test.ts`

## Dependencies / Blockers

### Dependencies
- Phase 1 auth/RBAC foundation is present and reusable.
- Hosted Supabase schema already includes `invoices`, `fractions`, `events`, and `bcra_cache`.
- Seeded demo CUITs already exist in `bcra_cache` and should be preserved.
- `OPENAI_API_KEY` is present, but AI SDK packages are not yet installed in the repo.

### Non-human blockers / execution risks
- Live BCRA contract verification is unresolved from this environment.
- `public.bcra_cache` currently has RLS enabled with no policies; that is acceptable for server-only access, but planners should avoid any client reads and may add an explicit no-access policy if they want the security advisory silenced.
- Supabase security advisors also flagged mutable `search_path` on `set_updated_at` and `prevent_append_only_mutation`; these are not Phase 2 blockers but are worth folding into a future hardening pass if touched.
- Phase 1 validation noted invalid Vercel CLI auth token for deployed checks; that does not block planning and can be worked around with Vercel MCP or refreshed auth during execution.

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, and explicit fallback/caching notes
- `.planning/REQUIREMENTS.md` - exact requirement text for INV-01/03/05 and RISK-01..06
- `.planning/PROJECT.md` - product constraints, BCRA/LLM positioning, deploy targets
- `.planning/phases/01-foundation-auth/01-RESEARCH.md` - Phase 1 architectural commitments inherited by this phase
- `supabase/migrations/0001_foundation_schema.sql` - actual schema/function reuse opportunities and gaps
- `supabase/migrations/0002_rls_and_rbac.sql` - current RLS behavior that Phase 2 must preserve
- `supabase/seed.sql` - prewarmed `bcra_cache` demo data
- `src/lib/auth/actions.ts`, `src/lib/auth/guards.ts`, `src/lib/auth/session.ts`, `src/lib/supabase/server.ts`, `proxy.ts` - current auth/server-action architecture to extend
- `https://nextjs.org/docs/app/guides/forms` - Server Action form guidance and server-side auth warning
- `https://supabase.com/docs/guides/auth/server-side/nextjs` - current SSR/proxy auth guidance
- `https://vercel.com/docs/ai-sdk` - `generateObject` structured-output guidance

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` - prior synthesized stack and risk-pipeline guidance
- `.planning/research/STACK.md` - prior recommended package and route-handler patterns
- `.planning/research/PITFALLS.md` - domain-specific failure modes for BCRA, LLM, and fraction math

### Tertiary (LOW confidence)
- Existing project research references to BCRA `centraldedeudores/v1.0` endpoints; live endpoint contract could not be directly confirmed from this environment during research.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - current repo/dependency state and official Next.js/Supabase/AI docs align
- Architecture: HIGH - Phase 1 codebase already fixes the core shape; Phase 2 mostly extends it
- External BCRA strategy: MEDIUM - cache/fallback approach is solid, but live contract verification remains unresolved
- Pitfalls: HIGH - directly supported by current schema, roadmap notes, and existing project research

**Research date:** 2026-03-28
**Valid until:** 2026-04-04
