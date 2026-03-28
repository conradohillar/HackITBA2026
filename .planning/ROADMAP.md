# Roadmap: Karaí

**Created:** 2026-03-28
**Granularity:** Coarse
**Milestone:** v1 — Hackathon Demo (36h, 4-person team)

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation & Auth | DB schema, auth, RBAC, project scaffold — the load-bearing base | INV-02, USER-01, USER-04, AUDIT-01 | 4 |
| 2 | Invoice Origination & Risk Engine | Invoice upload → BCRA scoring → tokenization → fractionalization | INV-01, INV-03, INV-05, RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06 | 5 |
| 3 | Marketplace & Funding | Investors browse, purchase fractions, watch funding progress live | FUND-01, FUND-02, FUND-03, FUND-04, FUND-05 | 5 |
| 4 | Settlement, Dashboards & Demo Polish | Close the loop: settlement, dashboards, event timeline, demo-ready UX | INV-04, SETT-01, SETT-02, SETT-03, USER-02, USER-03, AUDIT-02 | 5 |

**Total:** 4 phases · 25 requirements mapped · 19 success criteria

## Phase Details

### Phase 1: Foundation & Auth
**Goal:** Deploy the full database schema (6 tables, ENUMs, transition function, RLS), wire auth with role selection, and establish route-level RBAC — so every subsequent phase builds on a correct, secure foundation.
**Requirements:** INV-02, USER-01, USER-04, AUDIT-01
**UI hint:** yes (signup flow, role-gated layouts, empty dashboards)

**Success Criteria:**
1. User signs up with email/password, selects role (cedente or inversor), and lands on role-appropriate dashboard
2. Middleware redirects unauthenticated users to login; cedente cannot access inversor routes and vice versa
3. RLS enabled on all 6 tables — anon key cannot read or write data without authenticated session
4. `transition_invoice()` function rejects invalid state transitions (e.g., `draft → funded` returns error)

**Plans:** 6 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold the Next.js app and stable Phase 1 route shells
- [x] 01-02-PLAN.md — Define Supabase SSR/auth contracts and Phase 1 test harnesses
- [x] 01-03-PLAN.md — Create the versioned Supabase schema, transition function, and audit invariants
- [x] 01-04-PLAN.md — Implement immediate-login role-select auth flow with desktop/mobile coverage
- [x] 01-05-PLAN.md — Enforce RBAC across proxy/server guards and database RLS policies
- [x] 01-06-PLAN.md — Seed, validate locally and on Vercel, and update the phase validation artifact

**Notes:**
- This is the most critical phase per research: float precision (`NUMERIC(15,2)`), race condition prevention (`FOR UPDATE`), and fraction rounding constraints are baked into the schema here
- Seed script started with realistic Argentine companies and plausible amounts
- Deploy to Vercel immediately — all subsequent work is tested on production URL

---

### Phase 2: Invoice Origination & Risk Engine
**Goal:** Cedente uploads an invoice, system fetches live BCRA data, scores payer risk with deterministic engine + LLM, tokenizes the invoice (SHA-256), and splits it into purchasable fractions.
**Requirements:** INV-01, INV-03, INV-05, RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06
**UI hint:** yes (invoice form, risk display with tier badge + narrative)

**Success Criteria:**
1. Cedente submits invoice form (CUIT, face value, due date, description) → record created with `draft` status and transitions to `validating`
2. System fetches live BCRA data for payer CUIT and produces risk tier (A/B/C/D), dynamic discount rate, and LLM-generated narrative citing specific data points
3. When BCRA API or LLM is unavailable, deterministic fallback produces risk tier and discount rate without user-visible error
4. Validated invoice is tokenized (SHA-256 hash generated) and split into configurable fractions with correct remainder handling
5. Invoice transitions through `draft → validating → validated → tokenized → funding` in enforced sequence

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Close the invoice description schema gap and verify the live BCRA contract early
- [x] 02-02-PLAN.md — Build deterministic scoring, pricing, fallback handling, and LLM narrative generation
- [x] 02-03-PLAN.md — Implement the cedente invoice origination flow and validated risk result UI
- [x] 02-04-PLAN.md — Tokenize validated invoices and split exact fractions with remainder-safe handling
- [x] 02-05-PLAN.md — Verify the full Phase 2 happy path with Vitest plus desktop/mobile Playwright coverage

**Notes:**
- Deterministic fallback first, LLM second (research key insight #1)
- Cache BCRA responses in `bcra_cache` table — pre-warm demo CUITs
- 5-second timeout on BCRA calls with graceful degradation

---

### Phase 3: Marketplace & Funding
**Goal:** Investors browse tokenized invoices, purchase fractions with atomic race-condition-safe transactions, and watch funding progress update in real-time.
**Requirements:** FUND-01, FUND-02, FUND-03, FUND-04, FUND-05
**UI hint:** yes (marketplace grid, fraction cards, progress bars, real-time updates)

**Success Criteria:**
1. Investor sees marketplace listing all invoices in `funding` status with risk tier, discount rate, and funding progress bar
2. Investor purchases one or more fractions; concurrent purchases never exceed 100% of invoice value (`fund_invoice()` with `FOR UPDATE` locking)
3. Each fraction displays expected return (principal + interest) calculated from discount rate before purchase
4. Funding progress updates in real-time via Supabase subscriptions without page refresh
5. Invoice automatically transitions to `funded` when 100% of fractions are purchased

**Plans:** 5 plans

Plans:
- [x] 03-01-PLAN.md — Define marketplace contracts, expected-return math, and investor funding queries
- [ ] 03-02-PLAN.md — Add the DB-enforced `fund_invoice()` boundary, locking, and publication enablement
- [ ] 03-03-PLAN.md — Wire purchase actions, realtime subscriptions, and polling fallback primitives
- [ ] 03-04-PLAN.md — Build the investor marketplace landing, detail route, and fraction purchase UI
- [ ] 03-05-PLAN.md — Verify the Phase 3 happy path with Vitest plus desktop/mobile Playwright coverage

**Notes:**
- `fund_invoice()` PostgreSQL function is the correctness boundary — application code never does read-then-write
- Real-time subscriptions preferred; 2-second polling as fallback if subscription issues arise (pitfall P6)

---

### Phase 4: Settlement, Dashboards & Demo Polish
**Goal:** Close the full lifecycle: settlement distributes returns, role-specific dashboards show meaningful metrics, event timeline visualizes the full journey, and the happy path runs flawlessly on Vercel.
**Requirements:** INV-04, SETT-01, SETT-02, SETT-03, USER-02, USER-03, AUDIT-02
**UI hint:** yes (dashboards, transaction history, event timeline, polished UX)

**Success Criteria:**
1. Settlement simulation triggers at maturity: principal + interest distributed pro-rata to all fraction holders with correct transaction records
2. Cedente dashboard shows invoices grouped by status, total capital raised, and effective financing cost
3. Inversor dashboard shows portfolio holdings, weighted average yield, and diversification across payers
4. Invoice detail page displays visual event timeline from creation through settlement (all state transitions + financial events)
5. Full happy path runs end-to-end on Vercel: signup → upload invoice → risk score → tokenize → fund → settle → see returns

**Plans:** (populated during planning)

**Notes:**
- Demo readiness is the exit gate — happy path on Vercel by hour 26
- Curated seed data with pre-cached BCRA responses and pre-computed risk scores
- Test at demo resolutions (1280x720, 1920x1080)
- Run complete happy path 3 times on deployed URL before considering this phase done

---

## Coverage Validation

All 25 v1 requirements mapped to exactly one phase:

| Requirement | Phase | Category |
|-------------|-------|----------|
| INV-01 | 2 | Invoice Management |
| INV-02 | 1 | Invoice Management |
| INV-03 | 2 | Invoice Management |
| INV-04 | 4 | Invoice Management |
| INV-05 | 2 | Invoice Management |
| RISK-01 | 2 | Risk Assessment |
| RISK-02 | 2 | Risk Assessment |
| RISK-03 | 2 | Risk Assessment |
| RISK-04 | 2 | Risk Assessment |
| RISK-05 | 2 | Risk Assessment |
| RISK-06 | 2 | Risk Assessment |
| FUND-01 | 3 | Investment / Funding |
| FUND-02 | 3 | Investment / Funding |
| FUND-03 | 3 | Investment / Funding |
| FUND-04 | 3 | Investment / Funding |
| FUND-05 | 3 | Investment / Funding |
| SETT-01 | 4 | Settlement & Distribution |
| SETT-02 | 4 | Settlement & Distribution |
| SETT-03 | 4 | Settlement & Distribution |
| USER-01 | 1 | User Management |
| USER-02 | 4 | User Management |
| USER-03 | 4 | User Management |
| USER-04 | 1 | User Management |
| AUDIT-01 | 1 | Observability / Audit |
| AUDIT-02 | 4 | Observability / Audit |

**Unmapped:** 0

---
*Roadmap created: 2026-03-28*
*Derived from: PROJECT.md, REQUIREMENTS.md, research/SUMMARY.md*
