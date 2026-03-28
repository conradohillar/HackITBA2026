# Pitfalls Research: Karaí

> Crowdfactoring / invoice tokenization marketplace — 36h hackathon build
> Stack: Next.js + Supabase + Vercel · BCRA API · LLM risk scoring · Team of 4

---

## Critical Pitfalls

### Financial Precision

**P1: Floating-point corruption in discount/interest calculations**

JavaScript IEEE 754 floats silently corrupt monetary math: `0.1 + 0.2 === 0.30000000000000004`. In a factoring platform this hits every calculation — discount rate application, fraction pricing, interest distribution, and settlement amounts. Errors compound across multiple investors funding fractions of the same invoice.

- **Warning signs**: Fraction amounts don't sum to invoice total. Settlement payouts are off by centavos. Rounding tests pass in isolation but fail on aggregate operations.
- **Prevention**: Store all monetary values as integer centavos in the DB (`amount_cents INTEGER`). Perform all arithmetic in centavos. Only convert to pesos for display (`amount_cents / 100`). Use `NUMERIC(15,2)` in PostgreSQL for any column that stores money — never `FLOAT` or `REAL`.
- **Phase**: Must be baked into the DB schema design and all API routes from day zero. Retrofitting is extremely expensive.

**P2: Rounding residuals when splitting invoices into fractions**

If a $100,000.00 invoice is split into 7 fractions, naive division produces $14,285.714285... per fraction. Multiplying back gives $99,999.999995 — the platform "loses" 0.5 centavos. Over many invoices, residuals accumulate and break accounting invariants.

- **Warning signs**: `SUM(fraction_amounts) != invoice_total` in the DB. Ledger doesn't balance on settlement.
- **Prevention**: Assign the remainder to the last fraction. E.g., 6 fractions of $14,285.71 + 1 fraction of $14,285.74 = $100,000.00 exactly. Enforce `CHECK` constraint: `SUM(fraction_amount_cents) = invoice_amount_cents` at the DB level.
- **Phase**: Fraction creation logic (marketplace/tokenization phase).

**P3: Discount rate vs. interest rate confusion**

Factoring uses a *discount rate* (deducted upfront from face value), not an *interest rate* (charged on principal). Mixing these up produces wrong pricing. A 5% monthly discount on a 90-day $1M invoice means the PyME receives $850,000 — not $1M minus $150K in interest.

- **Warning signs**: PyME payout + platform fee + investor return != invoice face value. Demo numbers look "off" to anyone with finance background (judges).
- **Prevention**: Define the formula once in a shared utility: `pyme_payout = face_value * (1 - discount_rate * days / 360)`. Use 360-day convention (standard in Argentine factoring). Document the formula in a code comment.
- **Phase**: Risk scoring / pricing engine phase.

---

### State Machine / Concurrency

**P4: Over-funding race condition — multiple investors funding simultaneously**

Two investors see an invoice needing $50,000 more. Both submit $50,000. Without concurrency control, the invoice gets $100,000 over-funded. This is the #1 correctness bug in any crowdfunding backend.

- **Warning signs**: `funded_amount > target_amount` rows in DB. Negative "remaining" amounts shown in UI.
- **Prevention**: Use a PostgreSQL function with `SELECT ... FOR UPDATE` on the invoice row before inserting a funding record. The function atomically checks remaining capacity and rejects/adjusts the investment if it would exceed the target. Wrap in a single transaction. Never do read-then-write from the API route without a lock.

```sql
CREATE OR REPLACE FUNCTION fund_invoice(
  p_invoice_id UUID, p_investor_id UUID, p_amount_cents BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_remaining BIGINT;
  v_actual BIGINT;
BEGIN
  SELECT (target_amount_cents - funded_amount_cents)
    INTO v_remaining
    FROM invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'fully_funded');
  END IF;

  v_actual := LEAST(p_amount_cents, v_remaining);

  UPDATE invoices SET funded_amount_cents = funded_amount_cents + v_actual
    WHERE id = p_invoice_id;

  INSERT INTO investments (invoice_id, investor_id, amount_cents)
    VALUES (p_invoice_id, p_investor_id, v_actual);

  RETURN jsonb_build_object('ok', true, 'invested', v_actual);
END;
$$ LANGUAGE plpgsql;
```

- **Phase**: Funding/marketplace phase. This must be a DB-level function, not application-level logic.

**P5: Invoice state machine with missing transitions**

An invoice flows through: `draft → pending_review → scored → listed → funding → funded → settling → settled`. Skipping states or allowing invalid transitions (e.g., `draft → funded`) corrupts data. Without an explicit state machine, ad-hoc status updates will eventually produce an impossible state.

- **Warning signs**: Invoices stuck in intermediate states. UI shows contradictory information (e.g., "funded" but no investors).
- **Prevention**: Add a `status` ENUM column with a PostgreSQL `CHECK` constraint or trigger that only allows valid transitions. Define the transition map in a single source of truth (a constant object in code). Never set status directly — always go through a transition function.
- **Phase**: DB schema design + all phases that mutate invoice status.

**P6: Realtime subscriptions delivering stale or duplicate events**

Supabase Realtime has a known issue: multiple channels subscribed to the same table with different filters may only deliver to the most recently created subscription (GitHub issue #1524). In a marketplace where both the PyME dashboard and investor dashboard subscribe to invoice changes, one of them may silently stop receiving updates.

- **Warning signs**: One role's dashboard updates in real-time while the other doesn't. Works in dev with one browser, breaks with two.
- **Prevention**: Use a single broad subscription per table and filter client-side, rather than multiple narrow subscriptions. Alternatively, use polling as a fallback for the demo — a 2-second interval `setInterval` fetch is more reliable than debugging Realtime edge cases in a hackathon.
- **Phase**: Frontend dashboard phase. Decide early: Realtime vs. polling. For a 36h hackathon, polling is safer.

---

### BCRA API Integration

**P7: BCRA API downtime / slow responses during demo**

The BCRA API (`api.bcra.gob.ar`) is a government endpoint. It can be slow (2-5s responses), rate-limited without documentation, or simply down during weekends/off-hours — exactly when a hackathon demo happens. If the risk scoring engine hard-depends on a live BCRA call, a timeout kills the entire happy path.

- **Warning signs**: Risk scoring takes >3s in testing. Intermittent 503/504 errors. Timeouts during weekend testing.
- **Prevention**: **Cache BCRA responses aggressively** in Supabase — once you query a CUIT, store the result with a timestamp. For the demo, pre-warm the cache with 3-5 demo CUITs (large Argentine corporations: Techint, YPF, Arcor, etc.) before presenting. Implement a fallback: if BCRA is unreachable, serve cached data or a realistic mock. Set a 5s timeout on BCRA calls with graceful degradation.
- **Phase**: Risk scoring / BCRA integration phase.

**P8: BCRA CUIT format validation**

The BCRA API expects `Identificacion` as a raw integer (e.g., `20123456789`), not formatted with hyphens (`20-12345678-9`). Passing a formatted string returns a cryptic error, not a helpful validation message.

- **Warning signs**: API returns 400 or empty results for CUITs that should have data.
- **Prevention**: Strip all non-numeric characters from CUIT input before API calls. Validate CUIT check digit (modulo 11 algorithm) before sending to BCRA. This catches typos early and avoids wasting API calls.
- **Phase**: Risk scoring / BCRA integration phase.

**P9: BCRA response structure varies by debtor status**

A CUIT with no debts returns a different JSON structure than one with debts. A CUIT with no rejected checks returns a different structure than one with history. Parsing code that assumes a fixed shape will crash on "clean" debtors — exactly the well-rated companies you want to demo.

- **Warning signs**: Risk scoring works for "bad" test CUITs but crashes for "good" ones. Null pointer errors in production.
- **Prevention**: Defensively destructure BCRA responses with fallback defaults. Test with at least 3 profiles: clean CUIT, CUIT with debts in situación 1-2, CUIT with serious delinquency (situación 4-5). Store sample responses for each profile as test fixtures.
- **Phase**: BCRA integration phase.

**P10: LLM hallucinating risk scores**

The LLM receives BCRA data and must produce a structured output (tier A/B/C/D, discount rate, explanation). Without strict output formatting, the LLM may invent data not in the BCRA response, produce inconsistent tiers, or return unstructured text that breaks JSON parsing.

- **Warning signs**: Risk tier doesn't correlate with BCRA data. LLM returns narrative instead of structured JSON. Parsing errors in API route.
- **Prevention**: Use structured output (JSON mode / function calling) with the LLM. Provide a strict schema: `{ tier: "A"|"B"|"C"|"D", discount_rate: number, explanation: string }`. Include few-shot examples in the system prompt. Validate LLM output against the schema before storing. Have a deterministic fallback: if LLM fails, derive tier from simple rules (situación 1 → A, situación 2 → B, etc.).
- **Phase**: Risk scoring phase. The deterministic fallback should be built first, LLM enhancement second.

---

### Supabase / Auth / RLS

**P11: Tables without RLS enabled — full data exposure**

Supabase exposes a PostgREST API on the `anon` key visible in client-side JavaScript. Any table without RLS enabled is fully readable/writable by anyone with the key. This means investor financial data, PyME invoice details, and funding records are publicly accessible.

- **Warning signs**: Data loads work "magically" without auth checks. Queries return data for all users, not just the current one.
- **Prevention**: Enable RLS on every table immediately after creation. Start with `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` with zero policies (denies all by default). Add policies incrementally per role. Use the Supabase dashboard to verify RLS status — green shield icon means enabled.
- **Phase**: DB schema / auth phase. Non-negotiable from the first migration.

**P12: RLS policies that don't distinguish PyME vs. Investor roles**

The platform has two distinct roles with asymmetric access: PyMEs see only their own invoices, investors see all listed invoices but only their own investments. A single `auth.uid() = user_id` policy doesn't capture this — it either over-restricts (investors can't see invoices) or under-restricts (PyMEs see other PyMEs' invoices).

- **Warning signs**: Investors see an empty marketplace. Or PyMEs see each other's draft invoices.
- **Prevention**: Store role in a `profiles` table or as a JWT custom claim. Write separate policies per role:
  - PyME SELECT: `auth.uid() = cedente_id`
  - Investor SELECT on listed invoices: `status IN ('listed', 'funding', 'funded') AND EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'investor')`
  - Investor SELECT on own investments: `auth.uid() = investor_id`
- **Phase**: Auth / RBAC phase. Design policies on paper before implementing.

**P13: Supabase service_role key leaked to client**

Using `SUPABASE_SERVICE_ROLE_KEY` in client-side code (or in a Next.js component that isn't a Server Component / API route) bypasses all RLS. This is equivalent to having no security.

- **Warning signs**: RLS policies seem to have no effect. Client-side code references `service_role`.
- **Prevention**: Only use `service_role` in server-side code (API routes, server actions). Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side. Verify with `grep -r "service_role" src/` before demo. Set up two Supabase clients: one server-side (service role), one client-side (anon key).
- **Phase**: Project setup / auth phase.

**P14: Forgetting RLS on Supabase Storage buckets**

If invoices or documents are stored in Supabase Storage, the bucket needs its own RLS policies. Default public buckets expose all uploaded files to anyone.

- **Warning signs**: Invoice PDFs accessible without auth via direct URL.
- **Prevention**: Create private buckets. Add storage policies: PyMEs can upload/read their own files, investors can read files for invoices they've funded. For the hackathon, simplest approach: don't use Storage at all — store invoice data as DB rows, not file uploads.
- **Phase**: If file upload is implemented, address in that phase. Otherwise skip.

---

### Hackathon-Specific

**P15: Over-engineering the token simulation**

The SHA-256 "token" is a demo concept, not a real blockchain integration. Spending hours on token lifecycle, burn mechanics, or transfer tracking is time stolen from the core happy path. Judges care about the use case and UX, not the hash function.

- **Warning signs**: More than 2 hours spent on token logic. Team discussing "smart contract" patterns for a simulated system.
- **Prevention**: Token = `SHA256(invoice_id + timestamp)` stored in a column. That's it. One function, one column. The "tokenization" story is told in the pitch deck, not in code complexity.
- **Phase**: Wherever invoice creation happens. Should be < 30 minutes of work.

**P16: Building auth before the happy path works**

Auth, role management, and RLS are important but invisible to judges watching a demo. If the team spends the first 12 hours on auth and runs out of time for the marketplace flow, the demo fails.

- **Warning signs**: Day 1 ends with a login screen but no invoices, no scoring, no funding.
- **Prevention**: Build the happy path first with hardcoded users (seed two users in Supabase: one PyME, one investor). Add real auth/RLS as a hardening layer in the last third of the hackathon. The demo can use two pre-logged-in browser windows — judges don't need to see a registration flow.
- **Phase**: Auth is a parallel workstream, not a blocker. Plan accordingly.

**P17: Uncontrolled demo data**

Random/generated test data looks unconvincing. An invoice from "Test Company SA" paying "ACME Corp" with a $999,999.99 amount destroys credibility. Judges want to believe this could be real.

- **Warning signs**: Demo shows Lorem Ipsum, placeholder names, or absurd numbers.
- **Prevention**: Create a curated seed script with realistic Argentine companies, plausible invoice amounts ($500K-$5M range), realistic CUIT numbers for real companies (public info), and proper dates (90-120 day payment terms). Pre-load this seed before every demo run. Rehearse the demo flow with this exact data.
- **Phase**: Seed data should be created in parallel with DB schema. Polish it before the final demo window.

**P18: Vercel cold start killing the demo**

Vercel serverless functions cold-start in 1-3 seconds. If the first action in the demo is an API call (e.g., invoice upload → BCRA query → LLM scoring), the judge sees a spinner for 5+ seconds and loses interest.

- **Warning signs**: First request after deploy is noticeably slower than subsequent ones.
- **Prevention**: "Warm up" the app 5 minutes before the demo by hitting every API route. Pre-cache BCRA responses for demo CUITs. Consider using Vercel Edge Functions for latency-critical routes (but be aware they can't use Node.js-specific APIs). If possible, run through the happy path once right before the live demo.
- **Phase**: Final demo prep, not during development.

**P19: Not having a fallback for external service failures**

During the demo, any external call can fail: BCRA, LLM provider, even Supabase. Without fallbacks, one 500 error kills a 36-hour effort.

- **Warning signs**: No error handling in API routes. No loading/error states in UI.
- **Prevention**: For every external dependency, have a cached/mocked fallback:
  - BCRA down → serve pre-cached response
  - LLM down → serve deterministic risk score from rules
  - Supabase down → this is fatal, but unlikely; have the seed script ready to redeploy from scratch
- **Phase**: Build fallbacks as part of each integration, not as an afterthought.

---

### Demo Readiness

**P20: No end-to-end demo script**

The team builds features in isolation and never runs the full flow until demo time. Integration bugs surface 30 minutes before presenting.

- **Warning signs**: "It works on my machine" from team members. No one has run the full flow on the deployed URL.
- **Prevention**: By hour 24 (12h before deadline), have the complete happy path working end-to-end on the Vercel deployment, even if rough. Spend the last 12h on polish, edge cases, and rehearsal. Write a literal demo script: "Step 1: Open PyME dashboard. Step 2: Click 'Upload Invoice'..." and rehearse it 3 times.
- **Phase**: Every phase should be tested against the running deployment, not just locally.

**P21: Mobile/responsive breakage during presentation**

Demo day often involves projectors with unexpected resolutions or judges looking at their own laptops. If the UI was only tested on a 1440p monitor, it may break on a 1080p projector or a judge's 13" laptop.

- **Warning signs**: UI looks perfect on dev machines but hasn't been tested at other viewport sizes.
- **Prevention**: Test at 1280x720 and 1920x1080. Use Tailwind's responsive utilities. Don't try to make it fully responsive — just ensure the demo path doesn't break on common resolutions. Fix overflow/scroll issues.
- **Phase**: UI/dashboard phase. Quick check during final polish.

**P22: LLM latency making the demo feel slow**

LLM calls (risk scoring explanation) can take 3-8 seconds. If the demo flow requires waiting for the LLM synchronously, the presenter fills dead air awkwardly.

- **Warning signs**: Silence during demo while waiting for AI response. Presenter says "this usually takes a moment..."
- **Prevention**: Pre-compute risk scores for demo invoices and cache them. Show a skeleton/loading state with a progress indicator ("Analyzing BCRA data...", "Generating risk assessment..."). If using the live LLM, stream the response to show progressive output. For the demo, having pre-cached scores is the safest path.
- **Phase**: Risk scoring phase (caching) + frontend phase (loading states).

---

## Prevention Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | All monetary columns use `INTEGER` (centavos) or `NUMERIC(15,2)` — no `FLOAT` | ☐ |
| 2 | Fraction sum constraint: `SUM(fractions) = invoice_total` enforced in DB | ☐ |
| 3 | Funding function uses `SELECT ... FOR UPDATE` (no read-then-write from API) | ☐ |
| 4 | Invoice status column is an ENUM with transition validation | ☐ |
| 5 | RLS enabled on every table (`\d tablename` shows `RLS enabled`) | ☐ |
| 6 | `service_role` key only used in server-side code | ☐ |
| 7 | BCRA responses cached in DB with fallback for API downtime | ☐ |
| 8 | CUIT validation (strip formatting + check digit) before BCRA calls | ☐ |
| 9 | LLM output validated against JSON schema with deterministic fallback | ☐ |
| 10 | Curated demo seed data with realistic Argentine companies/amounts | ☐ |
| 11 | End-to-end happy path working on Vercel by hour 24 | ☐ |
| 12 | Demo rehearsed 3x with written script | ☐ |
| 13 | External service fallbacks tested (BCRA down, LLM down) | ☐ |
| 14 | App warmed up before demo (all routes hit, BCRA cache primed) | ☐ |

---

## Phase Mapping

| Pitfall | Phase That Must Address It |
|---------|---------------------------|
| P1 (float precision) | DB schema design — first migration |
| P2 (fraction rounding) | Invoice tokenization / fraction creation |
| P3 (discount vs interest) | Risk scoring / pricing engine |
| P4 (over-funding race) | Marketplace funding logic — DB function |
| P5 (state machine) | DB schema + every phase that mutates invoice status |
| P6 (realtime issues) | Frontend dashboards — decide polling vs realtime early |
| P7 (BCRA downtime) | BCRA integration — build cache + fallback |
| P8 (CUIT format) | BCRA integration — input validation |
| P9 (BCRA response shape) | BCRA integration — defensive parsing |
| P10 (LLM hallucination) | Risk scoring — deterministic fallback first, LLM second |
| P11 (no RLS) | DB schema — enable on table creation |
| P12 (role-based RLS) | Auth / RBAC phase |
| P13 (service key leak) | Project setup — Supabase client configuration |
| P14 (storage RLS) | File upload phase (if applicable) |
| P15 (over-engineering tokens) | Invoice creation — keep it minimal |
| P16 (auth before happy path) | Sprint planning — sequence matters |
| P17 (bad demo data) | Seed script — parallel with schema work |
| P18 (cold start) | Pre-demo preparation |
| P19 (no fallbacks) | Each integration phase |
| P20 (no e2e script) | Hour 24 checkpoint |
| P21 (responsive breakage) | UI polish window |
| P22 (LLM latency) | Risk scoring (cache) + frontend (loading states) |

---

*Generated: 2026-03-28 · Stack: Next.js + Supabase + Vercel · Domain: Argentine crowdfactoring*
