---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 03-03-PLAN.md next
status: executing
stopped_at: Completed 03-marketplace-funding-02-PLAN.md
last_updated: "2026-03-28T10:31:25.018Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 16
  completed_plans: 13
---

# Project State: Karaí

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)
**Core value:** El happy path completo funciona de punta a punta en la demo: PyME sube factura → se evalúa riesgo con BCRA + IA → inversores fondean fracciones → plataforma liquida y distribuye capital + intereses.
**Current focus:** Phase 3

## Current Status

- **Phase:** 3 — Marketplace & Funding
- **Status:** In progress
- **Milestone:** v1
- **Current plan:** 03-03-PLAN.md next

## Phase Progress

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation & Auth | Completed |
| 2 | Invoice Origination & Risk Engine | Completed |
| 3 | Marketplace & Funding | In progress (2/5 plans complete) |
| 4 | Settlement, Dashboards & Demo Polish | Not started |

## Recent Activity

- 2026-03-28 Project initialized
- 2026-03-28 Requirements defined (25 v1 across 6 categories)
- 2026-03-28 Research completed (stack, features, architecture, pitfalls)
- 2026-03-28 Roadmap created (4 phases, coarse granularity)
- 2026-03-28 Phase 1 implementation completed (auth, RBAC, schema, validation)
- 2026-03-28 Phase 2 implementation completed (invoice origination, risk engine, tokenization, desktop/mobile verification)
- 2026-03-28 Phase 3 Plan 01 completed (marketplace contracts, funding math, investor read model)
- 2026-03-28 Phase 3 Plan 02 completed (atomic funding RPC, locking, purchase audit trigger, realtime publication)

## Decisions

- 2026-03-28 Phase 3 keeps marketplace contracts type-only so UI/realtime layers share one stable funding shape.
- 2026-03-28 Expected return previews use proportional invoice math from fraction net amount versus invoice net and face value.
- 2026-03-28 Marketplace query utilities stay dependency-injectable so Vitest can validate server reads without a Next request scope.
- [Phase 03]: Kept fund_invoice() as the only purchase write path so marketplace buys stay race-safe inside the database.
- [Phase 03]: Rejected short-supply requests instead of partially filling so Phase 3 purchases remain deterministic.
- [Phase 03]: Published invoices and fractions to supabase_realtime so dashboard and detail views share one live funding source.

## Performance Metrics

- 2026-03-28 — Phase `03-marketplace-funding` Plan `01` — duration `5min` — tasks `3` — files `6`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `02` — duration `6min` — tasks `2` — files `2`

## Session

- **Last session:** 2026-03-28T10:31:25.016Z
- **Stopped At:** Completed 03-marketplace-funding-02-PLAN.md

## Current Readiness

- Phase 2 validation artifact: `.planning/phases/02-invoice-origination-risk-engine/02-VALIDATION.md`
- Phase 3 funding boundary is live: `public.fund_invoice()` now locks invoice and fraction rows, inserts purchase ledger records, and transitions invoices to `funded` at 100%.
- Phase 3 Plan 01 summary: `.planning/phases/03-marketplace-funding/03-01-SUMMARY.md`
- Phase 3 Plan 02 summary: `.planning/phases/03-marketplace-funding/03-02-SUMMARY.md`
- Next execution target: `03-03-PLAN.md` for the purchase server action, realtime hook, and shared funding UI primitives.
- Known external caveat: live BCRA probe paths still return 404 from this environment, so the happy path intentionally uses the pre-warmed cache + deterministic engine.

---
*Last updated: 2026-03-28 after Phase 3 Plan 02 execution*
