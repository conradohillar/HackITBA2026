# Research Summary: Karaí

> Crowdfactoring marketplace — HackITBA 2026 (36h, 4-person team)
> Synthesized: 2026-03-28

---

## Recommended Stack (from STACK.md)

**Frontend:** Next.js 16 (App Router) + Tailwind CSS 4 + shadcn/ui + Recharts. Server Components by default, `'use client'` only for interactive islands (forms, charts, real-time subscriptions). Server Actions for all mutations — no API route boilerplate.

**Backend:** Next.js Server Actions for mutations, Route Handlers only for BCRA proxy (CORS), webhooks, and cron triggers. Zod 4 validates all inputs at the boundary.

**Database & Auth:** Supabase (PostgreSQL + Auth + Real-time + RLS). Single managed service, free tier sufficient. `@supabase/ssr` for cookie-based auth in App Router.

**AI/Risk Engine:** Vercel AI SDK 6 + `gpt-4o` via `@ai-sdk/openai`. `generateObject()` with Zod schema for structured risk output. `gpt-4o-mini` as fallback.

**Tokenization:** Node.js `crypto.createHash('sha256')` — zero dependencies, deterministic hash stored as `token_hash`. No blockchain needed.

**Event Sourcing:** PostgreSQL `events` table (append-only) + database triggers. Supabase Real-time subscriptions for live feeds.

**Deployment:** Vercel (zero-config Next.js) + Supabase hosted. Four env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

**Key exclusions:** No ORM (Supabase client suffices), no tRPC (Server Actions replace it), no separate API server, no Redux/Zustand, no web3 libraries, no Kafka.

---

## Feature Scope (from FEATURES.md)

### Table Stakes (v1 must-haves)

| Area | Features |
|------|----------|
| Invoice Management | Upload + data capture, validation, status lifecycle (draft→settled), unique hash/ID |
| Risk Assessment | Payer credit scoring (not seller), tier classification (A/B/C/D), dynamic discount rate, risk transparency |
| Investment | Marketplace listing, fractional funding, investment commitment, funding progress bar, expected return display |
| Settlement | Maturity tracking, settlement execution, pro-rata distribution, audit trail |
| User Management | Auth, RBAC (cedente vs inversor), profiles, role-specific dashboards |

### Key Differentiators

1. **Real BCRA API integration** — live data from Argentina's central bank (deudas, históricas, cheques rechazados). Genuine technical advantage most hackathon projects can't match.
2. **LLM-generated risk narrative** — explainable AI that cites specific data points. Pitch gold.
3. **Multi-signal risk model** — BCRA situation + debt trends + bounced checks + invoice-to-exposure ratio.
4. **Real-time funding animation** — Supabase subscriptions for live "wow" moment.

### What to Avoid

Secondary market, real KYC/AML, ARCA/AFIP integration, smart contracts, OCR, multi-currency, accounting integrations, reverse factoring, email/SMS notifications, payment gateways, mobile optimization, admin panel, dispute resolution.

### Critical Path

Auth → Invoice Upload → BCRA Scoring → Marketplace → Funding → Settlement

---

## Architecture (from ARCHITECTURE.md)

### System Overview

Two deployment targets: **Vercel** (Next.js app — pages, API routes, Server Actions) and **Supabase** (PostgreSQL + Auth + Real-time + DB functions/triggers). External services: BCRA API (public, no auth) and OpenAI LLM API.

### Key Patterns

**State Machine:** Invoice lifecycle enforced via PostgreSQL function (`transition_invoice`) with `FOR UPDATE` locking, explicit transition map, and automatic event emission. States: `draft → validating → validated → tokenized → funding → funded → settling → settled` (plus `rejected` and `defaulted` terminal states).

**Event Sourcing:** Append-only `events` table populated by (1) explicit calls from `transition_invoice()` and (2) triggers on fraction purchases. RLS enforces insert-only — no updates or deletes. Queryable audit trail per entity.

**RBAC:** Two-layer security — Next.js middleware prevents navigation to wrong-role pages; Supabase RLS prevents data leaks at the database level. Cedentes see only their invoices; investors see all listed invoices but only their own fractions.

**Risk Pipeline:** Submit → parallel BCRA fetch (3 endpoints) → compose LLM prompt → `generateObject()` structured output → validate + store risk tier, discount rate, explanation → transition to `validated`.

**Route Structure:** Parenthesized route groups `(cedente)` and `(inversor)` for layout separation. State transitions exposed as explicit endpoints (`/submit`, `/tokenize`, `/list`, `/settle`).

### Database Schema (6 tables)

| Table | Purpose |
|-------|---------|
| `profiles` | Extends auth.users with role, CUIT, company |
| `invoices` | Core asset — face value, risk data, status, token hash |
| `fractions` | Tradeable units of tokenized invoices |
| `transactions` | Money movement ledger |
| `events` | Append-only audit trail |
| `bcra_cache` | Cached BCRA responses by CUIT |

---

## Critical Pitfalls (from PITFALLS.md)

### Top 5 Most Dangerous

| # | Pitfall | Impact | Prevention |
|---|---------|--------|------------|
| **P4** | **Over-funding race condition** — two investors fund simultaneously, exceeding 100% | Data corruption, broken invariant | PostgreSQL function with `SELECT ... FOR UPDATE` + atomic check-and-fund. Never do read-then-write from API routes. |
| **P1** | **Float precision in monetary math** — `0.1 + 0.2 ≠ 0.3` corrupts every calculation | Silent financial errors compound across fractions | Store as integer centavos or `NUMERIC(15,2)`. All arithmetic in centavos, convert only for display. Bake into schema from day zero. |
| **P7** | **BCRA API down during demo** — government endpoint, slow/unreliable on weekends | Entire happy path dies if risk scoring hard-depends on live call | Cache aggressively in DB. Pre-warm demo CUITs. Deterministic fallback (situación 1→A, 2→B, etc.) if API unreachable. 5s timeout. |
| **P11** | **Tables without RLS = full data exposure** — anon key is in client JS | Anyone can read/write all financial data | Enable RLS on every table immediately at creation. Zero policies = deny all by default. Add incrementally. |
| **P10** | **LLM hallucinating risk scores** — invents data, inconsistent tiers, breaks JSON parsing | Wrong risk assessments, parsing failures | `generateObject()` with strict Zod schema. Few-shot examples. Validate output. Build deterministic fallback first, LLM second. |

### Other Notable Pitfalls

- **P2:** Fraction rounding residuals — assign remainder to last fraction, enforce DB constraint.
- **P5:** Missing state transitions — use ENUM + transition validation function.
- **P6:** Supabase Real-time subscription conflicts — use single broad subscription + client-side filtering, or fall back to 2s polling.
- **P13:** Service role key leaked to client — only use in server-side code, grep before demo.
- **P16:** Building auth before happy path — build core flow first with hardcoded users, add auth later.
- **P17:** Unconvincing demo data — curated seed with real Argentine companies and plausible amounts.
- **P20:** No end-to-end demo script — full happy path on Vercel by hour 24.

---

## Key Insights

Cross-cutting insights from combining all four research dimensions:

1. **The deterministic fallback pattern is load-bearing.** BCRA downtime (PITFALLS) + LLM hallucination (PITFALLS) + hackathon time pressure (FEATURES) all converge on one strategy: build a rule-based risk engine first (situación 1→A, 2→B, etc.), then layer the LLM on top. This means the demo never breaks even if both external services fail.

2. **Supabase is simultaneously the biggest accelerator and risk.** It provides auth, RBAC, real-time, and PostgreSQL in one service (STACK), and the architecture depends deeply on RLS + triggers + DB functions (ARCHITECTURE). But misconfigured RLS silently exposes everything (PITFALLS P11-P14). The team must treat RLS as a first-class concern alongside schema design, not an afterthought.

3. **The financial domain demands DB-level correctness.** Three of the top five pitfalls (P1 float precision, P2 fraction rounding, P4 over-funding race) are solved at the PostgreSQL level, not in application code. The `transition_invoice()` function, `FOR UPDATE` locking, and `NUMERIC(15,2)` columns are not optional — they're the foundation. This means the DB schema phase is the most critical in the entire build.

4. **"Real BCRA data" is both the killer differentiator and the biggest demo risk.** Every research document highlights it: STACK designs around it, FEATURES calls it "very high impact", ARCHITECTURE builds a pipeline for it, PITFALLS warns it might be down during the demo. The caching + fallback strategy must be non-negotiable from hour 1.

5. **Server Actions + Supabase eliminate an entire infrastructure layer.** The STACK explicitly excludes tRPC, ORMs, separate API servers, and state management libraries. The ARCHITECTURE confirms this: mutations flow through Server Actions with Zod validation, reads go through Supabase client with RLS. This dramatically reduces code surface for a 4-person team in 36 hours.

6. **Demo perception drives technical decisions.** Pre-caching BCRA responses (PITFALLS P7), streaming LLM output (STACK), real-time funding animations (FEATURES), Vercel warm-up (PITFALLS P18), and curated seed data (PITFALLS P17) are all "invisible" engineering that makes the 3-minute demo feel polished. Allocate time for this explicitly.

---

## Build Order Recommendation

Optimized for 36-hour hackathon with 4-person team. Phases overlap — parallel tracks run simultaneously.

### Phase 1: Foundation (Hours 0–4) — All 4 devs

- Project scaffold: `create-next-app`, Supabase project, env vars, Vercel deploy
- Full DB schema: 6 tables, ENUMs, indexes, `transition_invoice()` function, triggers
- RLS policies on all tables from the start
- Auth flow: email/password, profile creation with role selection
- Base layouts: `(cedente)` and `(inversor)` route groups, middleware role guard
- Curated seed script started (realistic Argentine companies, plausible amounts)

**Gate:** Sign up as cedente or inversor, see role-appropriate empty dashboard on Vercel.

### Phase 2: Core Flows (Hours 4–16) — Split into 2 tracks

**Track A (2 devs): Invoice → Risk Pipeline**
- Invoice creation form (cedente)
- BCRA API integration (3 parallel endpoints, caching, CUIT validation)
- Deterministic fallback risk engine (rule-based, no LLM)
- LLM risk scoring layered on top (structured output, streaming explanation)
- Full submit flow: draft → validating → validated, wired end-to-end

**Track B (2 devs): Marketplace → Funding**
- Tokenization: SHA-256 hash, fraction creation with remainder handling
- Marketplace page: list funding invoices, filters, progress bars
- Fraction purchase flow: `fund_invoice()` DB function with `FOR UPDATE` locking
- Real-time subscriptions (or 2s polling fallback)
- Investor portfolio page

**Gate:** Upload invoice → get real BCRA risk score → tokenize → list → investor buys fractions.

### Phase 3: Settlement + Polish (Hours 16–26) — 2 tracks

**Track A: Settlement + Audit**
- Funding completion → `funded` status transition
- Disbursement simulation (transaction record for cedente)
- Settlement: due date → corporate payment → pro-rata interest distribution
- Event timeline component (full invoice lifecycle visualization)
- Transaction history for both roles

**Track B: Dashboards + UX**
- Cedente dashboard: invoices by status, total raised, effective cost
- Investor dashboard: portfolio value, weighted avg yield, diversification
- Risk display: tier badge, explanation card, BCRA data summary
- Loading states, error handling, empty states, toast notifications
- Platform-wide stats banner

**Gate:** Full happy path end-to-end on Vercel. Both dashboards show meaningful data.

### Phase 4: Demo Prep (Hours 26–32)

- Finalize seed data with pre-cached BCRA responses and pre-computed risk scores
- Write and rehearse demo script (literal step-by-step)
- Test external service fallbacks (BCRA down, LLM timeout)
- Test at 1280x720 and 1920x1080 resolutions
- Warm up Vercel — hit every route
- Run complete happy path 3 times on deployed URL

### Phase 5: Buffer + Pitch (Hours 32–36)

- Reserved for unexpected issues
- Pitch deck finalization
- Final rehearsal

### Time Allocation Summary

| Phase | Hours | % of Total | Focus |
|-------|-------|-----------|-------|
| Foundation | 4h | 11% | Schema, auth, deploy, scaffold |
| Core Flows | 12h | 33% | Invoice + risk + marketplace + funding |
| Settlement + Polish | 10h | 28% | Settlement, dashboards, UX |
| Demo Prep | 6h | 17% | Seed data, testing, rehearsal |
| Buffer + Pitch | 4h | 11% | Safety margin |

---

*Synthesized from: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
*Project: Karaí — Argentine crowdfactoring marketplace*
*Date: 2026-03-28*
