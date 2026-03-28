---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: Phase 4 planning next
status: ready_for_phase_4
stopped_at: Completed 03-marketplace-funding-05-PLAN.md
last_updated: "2026-03-28T10:59:30.000Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 16
  completed_plans: 16
---

# Project State: Karaí

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)
**Core value:** El happy path completo funciona de punta a punta en la demo: PyME sube factura → se evalúa riesgo con BCRA + IA → inversores fondean fracciones → plataforma liquida y distribuye capital + intereses.
**Current focus:** Phase 4

## Current Status

- **Phase:** 3 — Marketplace & Funding
- **Status:** Completed
- **Milestone:** v1
- **Current plan:** Phase 4 planning next

## Phase Progress

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation & Auth | Completed |
| 2 | Invoice Origination & Risk Engine | Completed |
| 3 | Marketplace & Funding | Completed |
| 4 | Settlement, Dashboards & Demo Polish | Ready to start |

## Recent Activity

- 2026-03-28 Project initialized
- 2026-03-28 Requirements defined (25 v1 across 6 categories)
- 2026-03-28 Research completed (stack, features, architecture, pitfalls)
- 2026-03-28 Roadmap created (4 phases, coarse granularity)
- 2026-03-28 Phase 1 implementation completed (auth, RBAC, schema, validation)
- 2026-03-28 Phase 2 implementation completed (invoice origination, risk engine, tokenization, desktop/mobile verification)
- 2026-03-28 Phase 3 Plan 01 completed (marketplace contracts, funding math, investor read model)
- 2026-03-28 Phase 3 Plan 02 completed (atomic funding RPC, locking, purchase audit trigger, realtime publication)
- 2026-03-28 Phase 3 Plan 03 completed (purchase action, realtime fallback hook, shared funding widgets)
- 2026-03-28 Phase 3 Plan 04 completed (investor marketplace landing, detail page, purchase flow)
- 2026-03-28 Phase 3 Plan 05 completed (desktop/mobile validation, MCP checks, fallback hardening)

## Decisions

- 2026-03-28 Phase 3 keeps marketplace contracts type-only so UI/realtime layers share one stable funding shape.
- 2026-03-28 Expected return previews use proportional invoice math from fraction net amount versus invoice net and face value.
- 2026-03-28 Marketplace query utilities stay dependency-injectable so Vitest can validate server reads without a Next request scope.
- [Phase 03]: Kept fund_invoice() as the only purchase write path so marketplace buys stay race-safe inside the database.
- [Phase 03]: Rejected short-supply requests instead of partially filling so Phase 3 purchases remain deterministic.
- [Phase 03]: Published invoices and fractions to supabase_realtime so dashboard and detail views share one live funding source.
- 2026-03-28 Purchase validation now lives in one server action before any `fund_invoice()` RPC call.
- 2026-03-28 Marketplace clients prefer invoice subscriptions and only fall back to 2-second polling when channel health drops.
- 2026-03-28 Funding progress, return preview, and realtime status now render through shared marketplace widgets.
- 2026-03-28 `/inversor/dashboard` remains the single investor landing route and now renders the live funding marketplace.
- 2026-03-28 Shared marketplace read-model serialization now powers both server queries and browser polling refreshes.
- 2026-03-28 Investor detail pages can stay live with typed funding snapshots while purchases submit through the server action boundary.
- 2026-03-28 Marketplace realtime views now auto-fallback to polling if a channel never reaches `SUBSCRIBED`.

## Performance Metrics

- 2026-03-28 — Phase `03-marketplace-funding` Plan `01` — duration `5min` — tasks `3` — files `6`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `02` — duration `6min` — tasks `2` — files `2`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `03` — duration `8min` — tasks `2` — files `6`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `04` — duration `5min` — tasks `2` — files `8`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `05` — duration `16min` — tasks `2` — files `5`

## Session

- **Last session:** 2026-03-28T10:59:30.000Z
- **Stopped At:** Completed 03-marketplace-funding-05-PLAN.md

## Current Readiness

- Phase 2 validation artifact: `.planning/phases/02-invoice-origination-risk-engine/02-VALIDATION.md`
- Phase 3 funding boundary is live: `public.fund_invoice()` now locks invoice and fraction rows, inserts purchase ledger records, and transitions invoices to `funded` at 100%.
- Phase 3 Plan 01 summary: `.planning/phases/03-marketplace-funding/03-01-SUMMARY.md`
- Phase 3 Plan 02 summary: `.planning/phases/03-marketplace-funding/03-02-SUMMARY.md`
- Phase 3 Plan 03 summary: `.planning/phases/03-marketplace-funding/03-03-SUMMARY.md`
- Phase 3 Plan 04 summary: `.planning/phases/03-marketplace-funding/03-04-SUMMARY.md`
- Phase 3 Plan 05 summary: `.planning/phases/03-marketplace-funding/03-05-SUMMARY.md`
- Phase 3 validation artifact: `.planning/phases/03-marketplace-funding/03-VALIDATION.md`
- Phase 4 can proceed without human input, but it still needs planning artifacts because no `04-*` plans exist yet.
- Known external caveat: live BCRA probe paths still return 404 from this environment, so the happy path intentionally uses the pre-warmed cache + deterministic engine.

---
*Last updated: 2026-03-28 after Phase 3 completion*
