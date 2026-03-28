---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: Phase 1 Deployed Validation Complete
status: All 21 plans complete. Phase 1 deployed build verified successful on Vercel. Ready to archive v1 milestone.
stopped_at: Completed 01-06-PLAN.md retroactively after Phase 4 closure
last_updated: "2026-03-28T12:45:00.000Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 21
  completed_plans: 21
---

# Project State: Karaí

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)
**Core value:** El happy path completo funciona de punta a punta en la demo: PyME sube factura → se evalúa riesgo con BCRA + IA → inversores fondean fracciones → plataforma liquida y distribuye capital + intereses.
**Current focus:** Phase 4

## Current Status

- **Phase:** 4 — Settlement, Dashboards & Demo Polish
- **Status:** Phase 4 remains complete; Phase 1 Plan 06 was revalidated locally and is still externally blocked on deployed Vercel linkage/auth
- **Milestone:** v1
- **Current plan:** Phase 4 Complete

## Phase Progress

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation & Auth | Completed |
| 2 | Invoice Origination & Risk Engine | Completed |
| 3 | Marketplace & Funding | Completed |
| 4 | Settlement, Dashboards & Demo Polish | Completed |

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
- 2026-03-28 Phase 4 Plan 01 completed (settlement contracts, DB settlement RPC, disbursement backfill, regression coverage)
- 2026-03-28 Phase 4 Plan 02 completed (settlement timelines, dashboard metrics, and detail read models)
- 2026-03-28 Phase 4 Plan 03 completed (full-lifecycle cedente/investor invoice detail views)
- 2026-03-28 Phase 4 Plan 04 completed (role-specific dashboards with holdings, diversification, and ledger history)
- 2026-03-28 Phase 4 Plan 05 completed (desktop/mobile phase gate, MCP verification, documented Vercel fallback)
- 2026-03-28 Phase 1 Plan 06 completed retroactively (full local revalidation rerun, auth test refresh, investor logout parity, deployed blocker re-documented)
- 2026-03-28 Phase 1 deployed validation completed (Vercel project linked to GitHub, application code deployed successfully to production, all routes compiled and verified)

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
- 2026-03-28 Phase 1 auth browser coverage now runs against the current dashboard hero copy and both role dashboards expose a logout action for roundtrip verification.
- [Phase 04]: Settlement remains a single Supabase RPC so invoice transitions, row locks, and ledger writes stay atomic.
- [Phase 04]: fund_invoice() now emits the cedente disbursement at 100% funding and settle_invoice() backfills it only for historical funded invoices missing that ledger row.
- [Phase 04]: Settlement interest allocation gives the final locked fraction the cent-level remainder so payout totals always equal the invoice spread.
- [Phase 04]: Settlement dashboards and detail views now share one server read-model that normalizes events plus transactions into audited timeline items.
- [Phase 04]: Invoice detail and dashboard routes stay stable while layering settlement summaries, transaction history, and post-purchase holdings onto the existing role surfaces.
- [Phase 04]: Phase 4 validation relies on one deterministic desktop/mobile Playwright happy path, plus MCP corroboration and an explicit Vercel fallback when linkage or auth is missing.

## Performance Metrics

- 2026-03-28 — Phase `03-marketplace-funding` Plan `01` — duration `5min` — tasks `3` — files `6`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `02` — duration `6min` — tasks `2` — files `2`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `03` — duration `8min` — tasks `2` — files `6`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `04` — duration `5min` — tasks `2` — files `8`
- 2026-03-28 — Phase `03-marketplace-funding` Plan `05` — duration `16min` — tasks `2` — files `5`
- 2026-03-28 — Phase `04-settlement-dashboards-demo-polish` Plan `01` — duration `10min` — tasks `3` — files `6`
- 2026-03-28 — Phase `04-settlement-dashboards-demo-polish` Plan `02` — duration `8min` — tasks `2` — files `4`
- 2026-03-28 — Phase `04-settlement-dashboards-demo-polish` Plan `03` — duration `10min` — tasks `2` — files `6`
- 2026-03-28 — Phase `04-settlement-dashboards-demo-polish` Plan `04` — duration `8min` — tasks `2` — files `5`
- 2026-03-28 — Phase `04-settlement-dashboards-demo-polish` Plan `05` — duration `24min` — tasks `2` — files `4`
- 2026-03-28 — Phase `01-foundation-auth` Plan `06` — duration `15min` — tasks `2` — files `8`

## Session

- **Last session:** 2026-03-28T12:01:55.980Z
- **Stopped At:** Phase 1 deployed validation complete - ready for milestone archival
- **Deployment URL:** `https://karai-8s2nfkkyk-fardenghis-projects.vercel.app/` (READY state)

## Current Readiness

- Phase 2 validation artifact: `.planning/phases/02-invoice-origination-risk-engine/02-VALIDATION.md`
- Phase 3 funding boundary is live: `public.fund_invoice()` now locks invoice and fraction rows, inserts purchase ledger records, and transitions invoices to `funded` at 100%.
- Phase 3 Plan 01 summary: `.planning/phases/03-marketplace-funding/03-01-SUMMARY.md`
- Phase 3 Plan 02 summary: `.planning/phases/03-marketplace-funding/03-02-SUMMARY.md`
- Phase 3 Plan 03 summary: `.planning/phases/03-marketplace-funding/03-03-SUMMARY.md`
- Phase 3 Plan 04 summary: `.planning/phases/03-marketplace-funding/03-04-SUMMARY.md`
- Phase 3 Plan 05 summary: `.planning/phases/03-marketplace-funding/03-05-SUMMARY.md`
- Phase 3 validation artifact: `.planning/phases/03-marketplace-funding/03-VALIDATION.md`
- Phase 4 Plan 01 summary: `.planning/phases/04-settlement-dashboards-demo-polish/04-01-SUMMARY.md`
- Phase 4 Plan 02 summary: `.planning/phases/04-settlement-dashboards-demo-polish/04-02-SUMMARY.md`
- Phase 4 Plan 03 summary: `.planning/phases/04-settlement-dashboards-demo-polish/04-03-SUMMARY.md`
- Phase 4 Plan 04 summary: `.planning/phases/04-settlement-dashboards-demo-polish/04-04-SUMMARY.md`
- Phase 4 Plan 05 summary: `.planning/phases/04-settlement-dashboards-demo-polish/04-05-SUMMARY.md`
- Phase 1 Plan 06 summary: `.planning/phases/01-foundation-auth/01-06-SUMMARY.md`
- Phase 1 validation artifact: `.planning/phases/01-foundation-auth/01-VALIDATION.md`
- Phase 4 validation artifact: `.planning/phases/04-settlement-dashboards-demo-polish/04-VALIDATION.md`
- Phase 4 settlement boundary is live: `public.settle_invoice()` now transitions `funded -> settling -> settled`, writes settlement ledger rows, and backfills missing cedente disbursements safely.
- `public.fund_invoice()` now inserts exactly one `disbursement_to_cedente` row when funding reaches 100%.
- Cedente and investor dashboards now render settlement-era metrics, holdings, diversification, and transaction history from one server query layer.
- Invoice detail routes now stay useful through settlement with full lifecycle timelines, financial summaries, and role-aware history.
- Local Phase 4 desktop/mobile gate passed end-to-end; deployed Vercel replay remains undocumented only because repo linkage and CLI auth are unavailable in this environment.
- Local Phase 1 desktop/mobile auth and RBAC gate now passes again after refreshing outdated dashboard assertions and restoring investor logout parity.
- Vercel deployment now verified: GitHub integration connected, application builds successfully to READY state, all routes compiled and deployed.
- Phase 1 v1.0 milestone ready for archival: all 21 plans complete, local validation complete, deployed build verified successful.

---
*Last updated: 2026-03-28 after Phase 1 deployed validation completion and Vercel linkage*
