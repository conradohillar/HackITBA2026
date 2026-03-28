# Requirements: Karaí

**Defined:** 2026-03-28
**Core Value:** El happy path completo funciona de punta a punta en la demo: PyME sube factura → se evalúa riesgo con BCRA + IA → inversores fondean fracciones → plataforma liquida y distribuye capital + intereses.

## v1 Requirements

Requirements for hackathon demo. Each maps to roadmap phases.

### Invoice Management

- [x] **INV-01**: PyME can upload invoice with payer CUIT, face value, due date, and description
- [x] **INV-02**: Invoice follows enforced status lifecycle (draft → validating → validated → tokenized → funding → funded → settling → settled)
- [x] **INV-03**: System generates SHA-256 hash as unique token ID upon tokenization
- [ ] **INV-04**: User can view invoice detail with full status history and event timeline
- [x] **INV-05**: Tokenized invoice is split into configurable fractions for marketplace listing

### Risk Assessment

- [x] **RISK-01**: System scores payer credit risk (not the cedente) using payer's CUIT
- [x] **RISK-02**: System classifies payer into risk tier (A/B/C/D) based on scoring
- [x] **RISK-03**: System calculates dynamic discount rate from risk tier + days to maturity
- [x] **RISK-04**: System fetches real BCRA data (deudas actuales, históricas, cheques rechazados) for the payer
- [x] **RISK-05**: LLM generates human-readable risk narrative citing specific BCRA data points
- [x] **RISK-06**: Deterministic fallback engine produces risk tier + rate when BCRA or LLM are unavailable

### Investment / Funding

- [x] **FUND-01**: Investor can browse marketplace of invoices in funding status with key metrics
- [x] **FUND-02**: Investor can purchase one or more fractions of a tokenized invoice
- [x] **FUND-03**: Marketplace displays real-time funding progress (% funded) per invoice
- [x] **FUND-04**: Each fraction displays expected return (principal + interest) before purchase
- [x] **FUND-05**: Funding progress updates in real-time via Supabase subscriptions

### Settlement & Distribution

- [ ] **SETT-01**: System tracks invoice maturity dates and triggers settlement simulation
- [ ] **SETT-02**: Upon settlement, system distributes principal + interest pro-rata to fraction holders
- [ ] **SETT-03**: User can view transaction history (investments, returns, disbursements)

### User Management

- [x] **USER-01**: User can sign up with email/password and select role (cedente or inversor)
- [ ] **USER-02**: Cedente sees role-specific dashboard (invoices, status, total raised, effective cost)
- [ ] **USER-03**: Inversor sees role-specific dashboard (portfolio, weighted avg yield, diversification)
- [x] **USER-04**: RBAC enforced at middleware (route protection) and database (RLS policies) levels

### Observability / Audit

- [x] **AUDIT-01**: All state transitions and financial events are logged to append-only event table
- [ ] **AUDIT-02**: Invoice detail includes visual event timeline showing full lifecycle

## v2 Requirements

Deferred beyond hackathon. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: User receives in-app notifications for funding milestones
- **NOTF-02**: Cedente receives notification when invoice is fully funded

### Compliance

- **COMP-01**: Real KYC/AML onboarding flow
- **COMP-02**: Real ARCA/AFIP integration for invoice verification

### Advanced Features

- **ADV-01**: Secondary market for fraction resale before maturity
- **ADV-02**: OCR-based invoice data extraction from uploaded images/PDFs
- **ADV-03**: Multi-currency support (ARS/USD)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Smart contracts on testnet | Simulated in backend — no time for blockchain setup in 36h |
| Real ARCA/AFIP integration | No API access — mocked for demo |
| Secondary market | Excessive complexity for hackathon scope |
| Mobile app | Web-first, responsive enough for demo |
| Real KYC/AML | No compliance APIs — mocked onboarding |
| Payment gateway integration | Funds simulated, no real money movement |
| Email/SMS notifications | No demo value for 3-min pitch |
| Admin panel | Not needed for happy path demo |
| Dispute resolution | Beyond hackathon scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INV-01 | Phase 2: Invoice Origination & Risk Engine | Completed |
| INV-02 | Phase 1: Foundation & Auth | Completed |
| INV-03 | Phase 2: Invoice Origination & Risk Engine | Completed |
| INV-04 | Phase 4: Settlement, Dashboards & Demo Polish | Not started |
| INV-05 | Phase 2: Invoice Origination & Risk Engine | Completed |
| RISK-01 | Phase 2: Invoice Origination & Risk Engine | Completed |
| RISK-02 | Phase 2: Invoice Origination & Risk Engine | Completed |
| RISK-03 | Phase 2: Invoice Origination & Risk Engine | Completed |
| RISK-04 | Phase 2: Invoice Origination & Risk Engine | Completed |
| RISK-05 | Phase 2: Invoice Origination & Risk Engine | Completed |
| RISK-06 | Phase 2: Invoice Origination & Risk Engine | Completed |
| FUND-01 | Phase 3: Marketplace & Funding | Completed |
| FUND-02 | Phase 3: Marketplace & Funding | Completed |
| FUND-03 | Phase 3: Marketplace & Funding | Completed |
| FUND-04 | Phase 3: Marketplace & Funding | Completed |
| FUND-05 | Phase 3: Marketplace & Funding | Completed |
| SETT-01 | Phase 4: Settlement, Dashboards & Demo Polish | Not started |
| SETT-02 | Phase 4: Settlement, Dashboards & Demo Polish | Not started |
| SETT-03 | Phase 4: Settlement, Dashboards & Demo Polish | Not started |
| USER-01 | Phase 1: Foundation & Auth | Completed |
| USER-02 | Phase 4: Settlement, Dashboards & Demo Polish | Not started |
| USER-03 | Phase 4: Settlement, Dashboards & Demo Polish | Not started |
| USER-04 | Phase 1: Foundation & Auth | Completed |
| AUDIT-01 | Phase 1: Foundation & Auth | Completed |
| AUDIT-02 | Phase 4: Settlement, Dashboards & Demo Polish | Not started |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✅

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after Phase 3 execution*
