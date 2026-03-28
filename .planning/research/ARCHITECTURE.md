# Architecture Research: Karaí

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Next.js App)                        │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Pages/App    │  │  API Routes  │  │  Server Actions (optional)│ │
│  │  Router (SSR) │  │  /api/*      │  │  for mutations            │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────────┘ │
│         │                 │                       │                 │
│         ▼                 ▼                       ▼                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Supabase Client (JS SDK)                        │   │
│  │  - Auth (session management, JWT)                            │   │
│  │  - Realtime (subscriptions on invoices, fractions)           │   │
│  │  - Database (typed queries via generated types)              │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE PLATFORM                            │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  Auth       │  │ PostgreSQL │  │  Realtime   │  │  Storage    │  │
│  │  (GoTrue)   │  │  + RLS     │  │  (Channels) │  │  (invoices) │  │
│  └────────────┘  └─────┬──────┘  └────────────┘  └─────────────┘  │
│                        │                                            │
│              ┌─────────┴──────────┐                                 │
│              │  DB Functions /    │                                  │
│              │  Triggers          │                                  │
│              └────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘

External Services:
  ┌────────────┐    ┌────────────┐
  │  BCRA API  │    │  LLM API   │
  │  (public)  │    │ (OpenAI /  │
  │            │    │  similar)  │
  └────────────┘    └────────────┘
```

Three-tier architecture collapsed into two deployment targets (Vercel + Supabase). API routes handle external integrations (BCRA, LLM) and orchestration logic that can't live in RLS policies or database functions. The client connects directly to Supabase for reads, auth, and realtime — API routes handle writes that require validation or side effects.

---

## Database Schema Design

### Core Tables

```sql
-- Enum types
CREATE TYPE user_role AS ENUM ('cedente', 'inversor', 'admin');
CREATE TYPE invoice_status AS ENUM (
  'draft', 'validating', 'validated', 'tokenized',
  'funding', 'funded', 'settling', 'settled', 'rejected', 'defaulted'
);
CREATE TYPE fraction_status AS ENUM ('available', 'reserved', 'sold', 'settled');
CREATE TYPE transaction_type AS ENUM (
  'fraction_purchase', 'disbursement_to_cedente',
  'settlement_payment', 'interest_distribution', 'refund'
);

-- Profiles extend Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  display_name TEXT NOT NULL,
  cuit TEXT,  -- Argentine tax ID
  company_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices: the core asset being tokenized
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedente_id UUID NOT NULL REFERENCES profiles(id),
  status invoice_status NOT NULL DEFAULT 'draft',

  -- Invoice data
  pagador_cuit TEXT NOT NULL,           -- Payer's CUIT (used for BCRA lookup)
  pagador_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,        -- Face value in ARS
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Risk assessment (populated after scoring)
  risk_tier TEXT,                        -- A/B/C/D
  discount_rate NUMERIC(5,4),           -- e.g., 0.0850 = 8.5%
  risk_explanation TEXT,                 -- LLM-generated explanation
  bcra_data JSONB,                      -- Raw BCRA response cached

  -- Tokenization
  token_hash TEXT,                       -- SHA-256 hash
  net_amount NUMERIC(15,2),             -- amount * (1 - discount_rate)
  total_fractions INTEGER,               -- Number of fractions created
  funded_fractions INTEGER DEFAULT 0,    -- Fractions sold so far

  -- Timestamps for state machine transitions
  validated_at TIMESTAMPTZ,
  tokenized_at TIMESTAMPTZ,
  funding_started_at TIMESTAMPTZ,
  funded_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fractions: tradeable units of a tokenized invoice
CREATE TABLE fractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  fraction_index INTEGER NOT NULL,       -- 1..N within the invoice
  amount NUMERIC(15,2) NOT NULL,         -- Face value of this fraction
  net_amount NUMERIC(15,2) NOT NULL,     -- What investor pays (discounted)
  status fraction_status NOT NULL DEFAULT 'available',
  investor_id UUID REFERENCES profiles(id),
  purchased_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(invoice_id, fraction_index)
);

-- Transactions: money movement ledger
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  fraction_id UUID REFERENCES fractions(id),
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID REFERENCES profiles(id),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event log: append-only audit trail
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type TEXT NOT NULL,             -- 'invoice', 'fraction', 'transaction'
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,              -- 'status_changed', 'fraction_purchased', etc.
  old_data JSONB,
  new_data JSONB,
  actor_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_cedente ON invoices(cedente_id);
CREATE INDEX idx_fractions_invoice ON fractions(invoice_id);
CREATE INDEX idx_fractions_investor ON fractions(investor_id);
CREATE INDEX idx_fractions_status ON fractions(status) WHERE status = 'available';
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX idx_events_created ON events(created_at);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
```

### Design Rationale

- **Fractions as rows, not a counter**: Each fraction is a discrete row so investors can see exactly what they own, and the marketplace can list/filter available fractions. The `funded_fractions` counter on invoices is a denormalized optimization updated via trigger.
- **JSONB for BCRA data**: The BCRA response structure may vary across endpoints (deudas, historicas, cheques). Store raw, query when needed.
- **Numeric(15,2) for money**: Never use float for currency. 15 digits covers up to trillions of ARS.
- **Events table is append-only**: No UPDATEs or DELETEs allowed (enforced by RLS). This is the audit trail.

---

## Invoice State Machine

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ submit()
                         ▼
                    ┌──────────────┐
                    │  VALIDATING  │ ← BCRA fetch + LLM scoring in progress
                    └────┬────┬────┘
                         │    │
              score OK   │    │ score FAIL / tier D
                         ▼    ▼
                ┌───────────┐  ┌──────────┐
                │ VALIDATED │  │ REJECTED │ (terminal)
                └─────┬─────┘  └──────────┘
                      │ tokenize()
                      ▼
                ┌─────────────┐
                │  TOKENIZED  │ ← Hash generated, fractions created
                └──────┬──────┘
                       │ list_on_marketplace()
                       ▼
                ┌──────────┐
                │ FUNDING  │ ← Investors buying fractions
                └────┬─────┘
                     │ all fractions sold (100%)
                     ▼
                ┌──────────┐
                │  FUNDED  │ ← Net amount disbursed to cedente
                └────┬─────┘
                     │ due_date reached → simulate corporate payment
                     ▼
                ┌───────────┐
                │ SETTLING  │ ← Distribution in progress
                └─────┬─────┘
                      │ all investors paid
                      ▼
                ┌──────────┐
                │ SETTLED  │ (terminal)
                └──────────┘
```

### Transition Logic (DB function)

```sql
CREATE OR REPLACE FUNCTION transition_invoice(
  p_invoice_id UUID,
  p_new_status invoice_status,
  p_actor_id UUID
) RETURNS invoices AS $$
DECLARE
  v_invoice invoices;
  v_allowed BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;

  -- Validate transition
  v_allowed := CASE
    WHEN v_invoice.status = 'draft' AND p_new_status = 'validating' THEN TRUE
    WHEN v_invoice.status = 'validating' AND p_new_status IN ('validated', 'rejected') THEN TRUE
    WHEN v_invoice.status = 'validated' AND p_new_status = 'tokenized' THEN TRUE
    WHEN v_invoice.status = 'tokenized' AND p_new_status = 'funding' THEN TRUE
    WHEN v_invoice.status = 'funding' AND p_new_status = 'funded' THEN TRUE
    WHEN v_invoice.status = 'funded' AND p_new_status = 'settling' THEN TRUE
    WHEN v_invoice.status = 'settling' AND p_new_status = 'settled' THEN TRUE
    WHEN v_invoice.status = 'funding' AND p_new_status = 'defaulted' THEN TRUE
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_invoice.status, p_new_status;
  END IF;

  UPDATE invoices
  SET status = p_new_status,
      updated_at = now(),
      validated_at = CASE WHEN p_new_status = 'validated' THEN now() ELSE validated_at END,
      tokenized_at = CASE WHEN p_new_status = 'tokenized' THEN now() ELSE tokenized_at END,
      funding_started_at = CASE WHEN p_new_status = 'funding' THEN now() ELSE funding_started_at END,
      funded_at = CASE WHEN p_new_status = 'funded' THEN now() ELSE funded_at END,
      settled_at = CASE WHEN p_new_status = 'settled' THEN now() ELSE settled_at END
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  -- Emit event
  INSERT INTO events (entity_type, entity_id, event_type, old_data, new_data, actor_id)
  VALUES ('invoice', p_invoice_id, 'status_changed',
    jsonb_build_object('status', v_invoice.status),
    jsonb_build_object('status', p_new_status),
    p_actor_id);

  RETURN v_invoice;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

The `FOR UPDATE` lock prevents race conditions on concurrent transitions. `SECURITY DEFINER` lets the function bypass RLS to write events while the calling user only needs permission to invoke the function.

---

## API Route Structure

```
app/
├── api/
│   ├── invoices/
│   │   ├── route.ts              # GET: list invoices (marketplace), POST: create draft
│   │   ├── [id]/
│   │   │   ├── route.ts          # GET: single invoice detail
│   │   │   ├── submit/
│   │   │   │   └── route.ts      # POST: draft → validating (triggers risk pipeline)
│   │   │   ├── tokenize/
│   │   │   │   └── route.ts      # POST: validated → tokenized (creates fractions)
│   │   │   ├── list/
│   │   │   │   └── route.ts      # POST: tokenized → funding
│   │   │   └── settle/
│   │   │       └── route.ts      # POST: funded → settling → settled (simulation)
│   │   └── marketplace/
│   │       └── route.ts          # GET: public marketplace (funding invoices + fractions)
│   │
│   ├── fractions/
│   │   ├── [id]/
│   │   │   └── purchase/
│   │   │       └── route.ts      # POST: investor buys a fraction
│   │   └── my/
│   │       └── route.ts          # GET: investor's portfolio
│   │
│   ├── risk/
│   │   ├── score/
│   │   │   └── route.ts          # POST: orchestrates BCRA + LLM pipeline
│   │   └── bcra/
│   │       └── route.ts          # GET: raw BCRA data for a CUIT (debug/display)
│   │
│   ├── transactions/
│   │   └── route.ts              # GET: transaction history (filtered by user/invoice)
│   │
│   ├── events/
│   │   └── route.ts              # GET: event log for an entity
│   │
│   └── auth/
│       └── callback/
│           └── route.ts          # Supabase auth callback handler
│
├── (cedente)/                    # Route group for PyME views
│   ├── dashboard/
│   ├── invoices/
│   │   ├── new/
│   │   └── [id]/
│   └── layout.tsx                # Cedente layout with role guard
│
├── (inversor)/                   # Route group for investor views
│   ├── dashboard/
│   ├── marketplace/
│   ├── portfolio/
│   └── layout.tsx                # Investor layout with role guard
│
├── (public)/                     # Landing, auth pages
│   ├── login/
│   └── register/
│
└── layout.tsx                    # Root layout with Supabase provider
```

### API Design Principles

- **State transitions are explicit endpoints** (`/submit`, `/tokenize`, `/list`, `/settle`) rather than generic PATCH with status in body. This makes each transition a named action with its own validation, side effects, and permissions.
- **Risk scoring is server-side only** — BCRA fetch and LLM calls happen in API routes, never client-side. API keys stay on the server.
- **Route groups** `(cedente)` and `(inversor)` use Next.js parenthesized groups for layout separation without URL segments. Middleware enforces role-based access.

---

## Risk Scoring Pipeline

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  POST        │     │  API Route:      │     │  BCRA API       │
│  /api/       │────▶│  /api/risk/score │────▶│  (3 endpoints)  │
│  invoices/   │     │                  │     │                 │
│  [id]/submit │     │  Orchestrator    │     │  - Deudores     │
└──────────────┘     └────────┬─────────┘     │  - Históricas   │
                              │               │  - Cheques      │
                              │               └────────┬────────┘
                              │                        │
                              │    ┌───────────────────┘
                              │    │  BCRA responses (parallel fetch)
                              ▼    ▼
                     ┌──────────────────┐
                     │  Compose LLM     │
                     │  Prompt          │
                     │                  │
                     │  System: "You    │
                     │  are a credit    │
                     │  risk analyst.." │
                     │                  │
                     │  User: BCRA data │
                     │  + invoice data  │
                     │  + ARCA mock     │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  LLM API Call    │
                     │  (structured     │
                     │   output / JSON) │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐     ┌──────────────────┐
                     │  Parse response: │     │  UPDATE invoice  │
                     │  - risk_tier     │────▶│  SET risk_tier,  │
                     │  - discount_rate │     │  discount_rate,  │
                     │  - explanation   │     │  risk_explanation│
                     │  - confidence    │     │  bcra_data, ...  │
                     └──────────────────┘     │  status =        │
                                              │  'validated'     │
                                              └──────────────────┘
```

### BCRA Fetch Detail

Three parallel requests to the BCRA Central de Deudores API:

| Endpoint | Data Returned | Risk Signal |
|----------|--------------|-------------|
| `/deudores/{cuit}` | Current credit situation (1-5 scale), amount, days overdue, refinancing, judicial processes | Primary: is the payer currently in good standing? |
| `/deudores/historicas/{cuit}` | Historical credit trend across periods | Trend: improving or deteriorating? |
| `/cheques/{cuit}` | Bounced check history | Red flag: pattern of payment failures |

### LLM Prompt Structure

```
System: You are a credit risk analyst for an invoice factoring platform in Argentina.
Analyze the payer's creditworthiness based on BCRA data and produce a risk assessment.

Output JSON with:
- risk_tier: "A" | "B" | "C" | "D" (A=lowest risk, D=highest/reject)
- discount_rate: number between 0.03 and 0.25
- explanation: string (2-3 sentences, Spanish, for investor consumption)
- confidence: number 0-1

User: {
  "invoice": { amount, due_date, days_to_maturity },
  "payer_bcra": { deudores_response, historicas_response, cheques_response },
  "payer_arca_mock": { company_age_years, fiscal_compliance, sector }
}
```

### Rate Calculation

The LLM proposes a `discount_rate`. The system applies bounds:

| Tier | Rate Range | Meaning |
|------|-----------|---------|
| A | 3% – 8% | Low risk, blue-chip payer |
| B | 8% – 14% | Moderate risk |
| C | 14% – 20% | Higher risk, higher return |
| D | — | Rejected, not listed |

`net_amount = amount × (1 - discount_rate × days_to_maturity / 365)`

---

## Real-time Updates

### Supabase Realtime Subscriptions

Two primary subscription channels:

**1. Marketplace Feed** (investor-facing)

```typescript
// Subscribe to invoices entering/leaving 'funding' status
supabase
  .channel('marketplace')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'invoices',
    filter: 'status=eq.funding'
  }, (payload) => {
    // Update marketplace listing in real-time
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'invoices',
    filter: 'status=eq.funding'
  }, (payload) => {
    // Update funded_fractions counter live
  })
  .subscribe();
```

**2. Invoice Detail** (both roles, when viewing a specific invoice)

```typescript
// Subscribe to fraction purchases on a specific invoice
supabase
  .channel(`invoice:${invoiceId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'fractions',
    filter: `invoice_id=eq.${invoiceId}`
  }, (payload) => {
    // Fraction was purchased — update progress bar
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'invoices',
    filter: `id=eq.${invoiceId}`
  }, (payload) => {
    // Status changed — update state machine UI
  })
  .subscribe();
```

### Realtime Enablement

Supabase Realtime must be enabled per table in the dashboard. Enable for:
- `invoices` (status changes, funded_fractions counter)
- `fractions` (purchase events)

Do NOT enable for `events` or `transactions` — those are read on demand, not pushed.

### Client Pattern

Use a custom React hook that wraps subscription lifecycle:

```typescript
function useInvoiceRealtime(invoiceId: string) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fractions, setFractions] = useState<Fraction[]>([]);

  useEffect(() => {
    // Initial fetch
    // Set up subscription
    // Return cleanup function that unsubscribes
  }, [invoiceId]);

  return { invoice, fractions };
}
```

---

## Event Sourcing / Audit Log

### Pattern: Event Log Table + Triggers

Every state change writes to the `events` table. Two mechanisms:

**1. Explicit events** from `transition_invoice()` (shown above) — captures status transitions with old/new state.

**2. Trigger-based events** for fraction purchases:

```sql
CREATE OR REPLACE FUNCTION log_fraction_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'available' AND NEW.status = 'sold' THEN
    INSERT INTO events (entity_type, entity_id, event_type, old_data, new_data, actor_id)
    VALUES (
      'fraction', NEW.id, 'fraction_purchased',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'investor_id', NEW.investor_id, 'amount', NEW.net_amount),
      NEW.investor_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_fraction_purchase
  AFTER UPDATE ON fractions
  FOR EACH ROW
  EXECUTE FUNCTION log_fraction_purchase();
```

**3. Transaction log** for money movements — the `transactions` table itself is an append-only ledger. Every financial operation (purchase, disbursement, settlement, interest distribution) creates a transaction row.

### Querying the Audit Trail

```sql
-- Full timeline for an invoice
SELECT * FROM events
WHERE entity_type = 'invoice' AND entity_id = $1
ORDER BY created_at ASC;

-- All events across entities related to an invoice (join through fractions)
SELECT e.* FROM events e
WHERE (e.entity_type = 'invoice' AND e.entity_id = $1)
   OR (e.entity_type = 'fraction' AND e.entity_id IN (
         SELECT id FROM fractions WHERE invoice_id = $1))
ORDER BY e.created_at ASC;
```

### Immutability Enforcement

```sql
-- Prevent updates/deletes on events table
CREATE POLICY events_insert_only ON events
  FOR ALL USING (false);  -- Block all by default

CREATE POLICY events_allow_insert ON events
  FOR INSERT WITH CHECK (true);  -- Allow inserts only

-- Functions with SECURITY DEFINER bypass RLS to insert
```

---

## RBAC & Row Level Security

### Role Model

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| `cedente` (PyME) | Create invoices, submit for scoring, view own invoices + events | See other cedentes' invoices, buy fractions, see investor data |
| `inversor` (Investor) | Browse marketplace, buy fractions, view portfolio, view events | Create invoices, see cedente details beyond company name |
| `admin` | Everything | — (for hackathon debug/demo) |

### RLS Policies

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users see their own, plus basic info of counterparties
CREATE POLICY profiles_own ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY profiles_read_public ON profiles
  FOR SELECT USING (true);  -- Display names are public

-- Invoices: cedentes see their own; investors see funding/funded/settling/settled
CREATE POLICY invoices_cedente ON invoices
  FOR ALL USING (cedente_id = auth.uid());

CREATE POLICY invoices_marketplace ON invoices
  FOR SELECT USING (
    status IN ('funding', 'funded', 'settling', 'settled')
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'inversor'
    )
  );

-- Fractions: investors see available + their own; cedentes see fractions of their invoices
CREATE POLICY fractions_available ON fractions
  FOR SELECT USING (
    status = 'available'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'inversor'
    )
  );

CREATE POLICY fractions_own ON fractions
  FOR SELECT USING (investor_id = auth.uid());

CREATE POLICY fractions_cedente ON fractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = fractions.invoice_id
      AND invoices.cedente_id = auth.uid()
    )
  );

-- Transactions: users see their own (from or to)
CREATE POLICY transactions_own ON transactions
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

-- Events: users see events for entities they can access
CREATE POLICY events_read ON events
  FOR SELECT USING (
    actor_id = auth.uid()
    OR (entity_type = 'invoice' AND entity_id IN (
      SELECT id FROM invoices  -- RLS on invoices already filters
    ))
    OR (entity_type = 'fraction' AND entity_id IN (
      SELECT id FROM fractions  -- RLS on fractions already filters
    ))
  );
```

### Middleware-Level Role Guard

```typescript
// middleware.ts — runs on every request
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req: request });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role-based route protection
  if (request.nextUrl.pathname.startsWith('/dashboard/cedente')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (profile?.role !== 'cedente') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  // Similar for /dashboard/inversor
}
```

Two-layer security: middleware prevents navigation to wrong role pages; RLS prevents data leaks even if someone crafts direct API/Supabase calls.

---

## Component Dependencies

```
                    ┌─────────────────┐
                    │  Auth + Profiles │  ← Foundation: everything needs user identity
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Invoice CRUD   │  ← Core entity: create, read, state machine
                    │  + State Machine│
                    └────┬───────┬────┘
                         │       │
              ┌──────────▼──┐  ┌─▼──────────────┐
              │  Risk       │  │  Fractions      │
              │  Pipeline   │  │  + Marketplace  │
              │  (BCRA+LLM) │  │                 │
              └──────┬──────┘  └────────┬────────┘
                     │                  │
                     │         ┌────────▼────────┐
                     │         │  Transactions   │
                     │         │  + Settlement   │
                     │         └────────┬────────┘
                     │                  │
              ┌──────▼──────────────────▼────────┐
              │  Events / Audit Log              │
              │  (writes from all components)    │
              └──────────────────┬───────────────┘
                                 │
              ┌──────────────────▼───────────────┐
              │  Real-time Subscriptions          │
              │  (reads from invoices, fractions) │
              └──────────────────────────────────┘
```

### Dependency Matrix

| Component | Depends On | Depended On By |
|-----------|-----------|---------------|
| Auth + Profiles | Supabase Auth | Everything |
| Invoice CRUD | Auth | Risk Pipeline, Fractions, Events |
| Risk Pipeline | Invoice CRUD, BCRA API, LLM API | Tokenization (gate) |
| Fractions + Marketplace | Invoice CRUD (tokenized invoices) | Transactions, Real-time |
| Transactions + Settlement | Fractions (purchased), Invoice state | Events |
| Events / Audit Log | All write operations | UI (timeline views) |
| Real-time | Supabase Realtime, Invoices, Fractions | Marketplace UI, Invoice detail UI |
| Dashboard UI | All of the above | — (leaf node) |

---

## Suggested Build Order

Optimized for a 4-person team over 36 hours. Phases are parallelizable after Phase 1.

### Phase 1: Foundation (Hours 0–4) — All hands

1. **Project scaffold**: Next.js app, Supabase project, env vars, deploy pipeline to Vercel
2. **Database schema**: Run all CREATE TABLE/TYPE/INDEX statements
3. **Auth flow**: Supabase Auth with email/password, profile creation with role selection
4. **RLS policies**: Apply all policies, test with both roles
5. **Base layout**: Route groups for cedente/inversor, middleware role guard

> **Gate**: Can sign up as cedente or inversor, see role-appropriate empty dashboard.

### Phase 2: Core Flows (Hours 4–16) — Split into tracks

**Track A (2 devs): Invoice + Risk Pipeline**
1. Invoice creation form (cedente)
2. Invoice state machine (DB function + API routes for transitions)
3. BCRA API integration (3 endpoints, parallel fetch)
4. LLM risk scoring (prompt engineering, structured output parsing)
5. Submit flow: draft → validating → validated (wired end-to-end)

**Track B (2 devs): Marketplace + Fractions**
1. Tokenization logic: SHA-256 hash generation, fraction creation
2. Marketplace page: list funding invoices with progress bars
3. Fraction purchase flow: investor buys, fraction status updates
4. Real-time subscriptions: marketplace feed + invoice detail
5. Portfolio page: investor's purchased fractions

> **Gate**: Can upload invoice, get risk score from real BCRA data, tokenize, list on marketplace, investor buys fractions — all with real-time updates.

### Phase 3: Settlement + Polish (Hours 16–28)

**Track A: Settlement**
1. Funding completion trigger: all fractions sold → funded status
2. Disbursement to cedente (simulated): create transaction record
3. Settlement simulation: due date trigger, corporate payment, interest distribution
4. Transaction history views for both roles

**Track B: UX + Audit**
1. Event timeline component (shows full invoice lifecycle)
2. Dashboard stats (cedente: total raised, invoices by status; investor: portfolio value, returns)
3. UI polish: loading states, error handling, empty states, animations
4. Risk score display: tier badge, explanation card, BCRA data visualization

> **Gate**: Full happy path works end-to-end. Both dashboards show meaningful data.

### Phase 4: Demo Prep (Hours 28–33)

1. Seed data: pre-populate marketplace with invoices at various stages
2. Demo script: walkthrough of the happy path with real BCRA data
3. Edge case handling: what if BCRA is down? LLM timeout? Double-purchase?
4. Performance pass: loading states, optimistic updates

### Phase 5: Buffer (Hours 33–36)

Reserved for pitch preparation and unexpected issues.

---

*Researched: 2026-03-28 | Stack: Next.js 15 + Supabase + Vercel | Constraint: 36h hackathon*
