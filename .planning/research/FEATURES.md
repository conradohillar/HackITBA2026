# Features Research: Karaí

> Sources: Invoinet (AR), MarketFinance/MarketInvoice (UK), PlatformBlack (UK), Inversa Invoice Market (ES), Facturedo (CL/PE), Stage11 SaaS (white-label), Pymecred (AR), Argentine SGR ecosystem, DeFa/InvoFi (blockchain), BCRA API docs.

---

## Table Stakes (must have)

These are baseline expectations — users leave without them.

### Invoice Management

| Feature | Description | Complexity | Platforms |
|---------|-------------|------------|-----------|
| **Invoice upload & data capture** | PyME uploads invoice data (debtor CUIT, amount, due date, invoice number). Manual form or OCR-assisted. | Low | All platforms |
| **Invoice validation** | Verify invoice fields are complete, amounts are plausible, due date is future, no duplicates | Low | All platforms |
| **Invoice status lifecycle** | States: pending → approved → listed → funding → funded → settling → settled | Medium | All platforms |
| **Unique invoice hash/ID** | SHA-256 hash or UUID as immutable reference. Simulates tokenization without smart contracts | Low | DeFa, InvoFi, Karaí design |

### Risk Assessment

| Feature | Description | Complexity | Platforms |
|---------|-------------|------------|-----------|
| **Payer credit scoring** | Automated risk assessment of the debtor (not the PyME). Core differentiator of factoring vs lending | High | All platforms |
| **Risk tier classification** | Letter grades (A/B/C/D) or numeric tiers that map to discount rates | Medium | Inversa, MarketFinance, DeFa |
| **Discount rate calculation** | Dynamic rate based on risk tier + term + market conditions. Determines investor yield and PyME cost | Medium | All platforms |
| **Risk transparency for investors** | Investors see the risk tier, score rationale, and key metrics before committing funds | Low | Inversa, DeFa, MarketFinance |

### Investment / Funding

| Feature | Description | Complexity | Platforms |
|---------|-------------|------------|-----------|
| **Marketplace listing** | Scored invoices appear in a browsable/filterable list for investors | Medium | All crowdfactoring platforms |
| **Fractional funding** | Multiple investors fund portions of one invoice until 100% filled | Medium | Inversa, Facturedo, DeFa |
| **Investment commitment** | Investor selects invoice + amount → funds are reserved/escrowed | Medium | All platforms |
| **Funding progress indicator** | Visual bar showing % funded for each invoice | Low | Inversa, Facturedo |
| **Expected return display** | Show projected yield (annual %, absolute $) per invoice based on discount rate and term | Low | All platforms |

### Settlement & Distribution

| Feature | Description | Complexity | Platforms |
|---------|-------------|------------|-----------|
| **Maturity tracking** | Track due dates, days to maturity, upcoming settlements | Low | All platforms |
| **Settlement execution** | At maturity: corporate pays → platform distributes capital + interest to investors | Medium | All platforms |
| **Capital + interest distribution** | Pro-rata distribution to each fractional investor based on their share | Medium | Inversa, Facturedo |
| **Transaction history / audit trail** | Immutable log of all events: upload, scoring, listing, investment, settlement | Medium | All platforms, Inversa (blockchain) |

### User Management

| Feature | Description | Complexity | Platforms |
|---------|-------------|------------|-----------|
| **Authentication** | Email/password or OAuth login | Low | All platforms |
| **Role-based access (RBAC)** | Distinct experiences for PyME (cedente) vs Investor (fondeador) | Medium | All platforms |
| **Basic user profile** | Name, CUIT, contact info, bank account reference | Low | All platforms |
| **Dashboard per role** | PyME sees their invoices + status; Investor sees portfolio + available invoices | Medium | All platforms |

---

## Differentiators (competitive advantage)

Features that set Karaí apart or add significant demo/pitch value.

### AI-Powered Risk Engine (Karaí's core differentiator)

| Feature | Description | Complexity | Impact |
|---------|-------------|------------|--------|
| **Real BCRA API integration** | Live queries to Central de Deudores (deudas actuales, históricas, cheques rechazados) via public API endpoints | Medium | **Very High** — real data from Argentina's central bank is a powerful demo moment |
| **LLM-generated risk narrative** | AI produces human-readable explanation of why a payer is tier A vs C, citing specific data points | Medium | **Very High** — "explainable AI" angle is pitch gold |
| **Multi-signal risk model** | Combines BCRA situation (1-6 scale), debt trends (improving/worsening), bounced checks, invoice-to-exposure ratio | High | **High** — more sophisticated than single-metric scoring |
| **Dynamic rate from risk** | Discount rate auto-calculated from tier, not manually set. Higher risk = higher yield to compensate investors | Low | **Medium** — standard in sophisticated platforms, missing in basic ones |

### UX / Demo Differentiators

| Feature | Description | Complexity | Impact |
|---------|-------------|------------|--------|
| **Real-time funding animation** | Live updates when an invoice gets funded (Supabase real-time subscriptions) | Medium | **High** — creates "wow" demo moment |
| **Risk explanation modal** | Click to expand AI-generated risk narrative for any invoice | Low | **High** — shows AI depth without cluttering UI |
| **Portfolio summary for investors** | Total invested, weighted average yield, diversification across risk tiers | Medium | **Medium** — shows platform maturity |
| **PyME liquidity dashboard** | Shows total invoices, amount advanced, effective cost, timeline | Medium | **Medium** — demonstrates PyME value prop |

### Trust & Transparency

| Feature | Description | Complexity | Impact |
|---------|-------------|------------|--------|
| **Event timeline per invoice** | Visual timeline: uploaded → scored → listed → 40% funded → 100% funded → settled | Low | **Medium** — builds trust, good for demo |
| **Platform-wide stats** | Total funded, avg return, avg time to fund, number of PyMEs served | Low | **Low** — social proof, easy to implement |

---

## Anti-Features (do NOT build)

Deliberately excluded — too complex, out of scope, or negative ROI for a 36h hackathon.

| Anti-Feature | Why NOT | What platforms have it |
|--------------|---------|----------------------|
| **Secondary market** | Requires order book, bid/ask matching, price discovery. Massive complexity. | PlatformBlack (auction model), Inversa (sell positions) |
| **Real KYC/AML** | Requires ID verification provider, compliance flows, document storage. Mock it. | Stage11, MarketFinance, all regulated platforms |
| **Real ARCA/AFIP integration** | No API access, would need scraping or mock. Not worth the hassle. | Invoinet (connects to AFIP), Pymecred |
| **Smart contracts / on-chain tokens** | Deploying to testnet adds infra complexity with no demo payoff over simulated hashes | DeFa, InvoFi |
| **OCR / invoice image parsing** | AI vision for invoice extraction is fragile and a yak-shave. Use manual form entry. | Stage11, FactorFox |
| **Multi-currency support** | Argentine platform, everything in ARS. Don't add USD toggle. | Stage11, MarketFinance |
| **Accounting software integrations** | Xero/Sage/Quickbooks connectors are weeks of work. | MarketFinance, Stage11 |
| **Reverse factoring / supply chain finance** | Different product requiring corporate buyer onboarding. Out of scope. | Stage11, Invoinet |
| **Email/SMS notifications** | Nice-to-have but not demo-critical. Use in-app status instead. | All production platforms |
| **Payment gateway / real money movement** | Simulated settlement is sufficient. No MercadoPago/Stripe integration needed. | All production platforms |
| **Mobile-responsive optimization** | Desktop-first for demo/pitch. Don't spend time on mobile breakpoints. | All production platforms |
| **Admin panel** | No platform admin needed for demo. Seed data directly. | Stage11, all production platforms |
| **Dispute resolution / collections** | Post-default recovery flow is production-only complexity. | MarketFinance, Pymecred |
| **Credit insurance / non-recourse option** | Requires insurance provider integration. All hackathon invoices "pay" on time. | Some SGRs, MarketFinance |

---

## Feature Dependencies

```
Authentication & RBAC
  └── User Profiles
       ├── PyME Dashboard ──────────────┐
       │    └── Invoice Upload          │
       │         └── Invoice Validation │
       │              └── BCRA API Query ──→ LLM Risk Scoring
       │                                        └── Risk Tier + Rate
       │                                             └── Marketplace Listing
       └── Investor Dashboard ──────────────────────────┘
            └── Browse Marketplace
                 └── Fractional Investment
                      └── Funding Progress (real-time)
                           └── Settlement Simulation
                                └── Capital + Interest Distribution
                                     └── Transaction History
```

**Critical path:** Auth → Invoice Upload → BCRA Scoring → Marketplace → Funding → Settlement

**Parallel workstreams possible:**
- Auth/RBAC + DB schema (workstream 1)
- BCRA API client + LLM scoring engine (workstream 2)
- Marketplace UI + investment flow (workstream 3, starts after schema ready)
- Settlement simulation (workstream 4, can start late)

---

## Hackathon Priority Matrix

### P0 — Demo-critical (must work for pitch)

| Feature | Est. Hours | Owner Hint |
|---------|-----------|------------|
| Auth + RBAC (Supabase) | 2-3h | Backend |
| DB schema (invoices, investments, users, events) | 2-3h | Backend |
| Invoice upload form + validation | 2-3h | Full-stack |
| BCRA API integration (3 endpoints) | 3-4h | Backend |
| LLM risk scoring (tier + narrative) | 3-4h | Backend/AI |
| Marketplace listing page with filters | 3-4h | Frontend |
| Fractional investment flow | 3-4h | Full-stack |
| Settlement simulation + distribution | 2-3h | Backend |
| **Subtotal** | **~20-28h** | |

### P1 — High impact, build if time allows

| Feature | Est. Hours | Why |
|---------|-----------|-----|
| Real-time funding updates (Supabase subscriptions) | 2-3h | Demo wow factor |
| Risk explanation modal | 1-2h | Shows AI depth |
| Investor portfolio summary | 2-3h | Polished feel |
| Event timeline per invoice | 2-3h | Trust & traceability |
| Platform-wide stats banner | 1h | Social proof |

### P2 — Nice polish, only if ahead of schedule

| Feature | Est. Hours | Why |
|---------|-----------|-----|
| PyME liquidity dashboard | 2-3h | Secondary persona |
| Funding progress animations | 1-2h | Visual polish |
| Seed data generator | 1-2h | Richer demo |
| Dark mode | 1h | Aesthetic |

---

## Key Insights from Research

1. **All platforms score the payer, not the seller.** This is factoring's fundamental insight — the PyME's creditworthiness is irrelevant; the corporate debtor's ability to pay is what matters. Karaí's BCRA integration nails this.

2. **Fractional funding is the crowdfactoring differentiator.** Traditional factoring (SGRs, banks) funds 100% from one source. Crowdfactoring's value is democratizing access for retail investors. This must be front-and-center in the UI.

3. **Transparency wins.** Inversa uses blockchain timestamps, DeFa has 30+ verification parameters. For a hackathon, the LLM narrative explanation achieves the same trust signal with less infrastructure.

4. **Argentine SGRs are the incumbent competitor.** They require PyME membership (socio partícipe), guarantee funds (fondo de riesgo), and have heavy bureaucracy. Karaí's pitch should contrast: "No SGR membership, no aforos, no papeles — just the invoice and BCRA data."

5. **Speed-to-liquidity is the PyME's metric.** Pymecred promises "minutes", Invoinet promises "instant". The demo should show the full cycle completing fast — upload to funded in one session.

6. **BCRA API is a real, free, public resource.** Three endpoints (deudas, históricas, cheques rechazados) queried by CUIT. This is a genuine technical advantage that most hackathon projects can't match.

---
*Research completed: 2026-03-28*
*Sources: Invoinet, MarketFinance, PlatformBlack, Inversa, Facturedo, Stage11, Pymecred, SGR ecosystem, DeFa, InvoFi, BCRA API docs*
