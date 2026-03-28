---
phase: 05-integrar-ia-para-riesgo-crediticio-y-mejorar-ux-ui-navegable-con-cheques-tasas-stats-de-inversor-y-tokenizacion-automatica
plan: 01
subsystem: ui
tags: [risk, bcra, invoice-detail, cedente, tokenization]
requires:
  - phase: 04-settlement-dashboards-demo-polish
    provides: Cedente invoice detail route and settlement-era lifecycle surfaces
provides:
  - Structured cedente invoice-detail risk facts sourced from persisted BCRA snapshots
  - Explicit tokenization-to-funding handoff messaging on the cedente detail route
  - Stable invoice-detail contract for risk provenance and marketplace publication status
affects: [phase-05-plan-04, verifier, cedente-demo]
tech-stack:
  added: [no new dependencies]
  patterns: [persisted-risk read models, server-shaped detail contracts, explicit tokenization messaging]
key-files:
  created: [tests/invoices/invoice-detail-risk-view.test.ts]
  modified: [src/lib/invoices/queries.ts, src/components/invoices/risk-summary-card.tsx, src/components/invoices/tokenization-summary.tsx, src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx]
key-decisions:
  - "Derived cedente risk facts only from persisted `bcra_data` so the detail route never recomputes live scoring in the browser."
  - "Exposed tokenization status as a dedicated sub-object to make the automatic funding handoff explicit without adding a new mutation path."
patterns-established:
  - "Pattern 1: invoice-detail queries can expose structured sub-objects (`riskSummary`, `tokenizationStatus`) instead of leaking raw persistence shapes to components."
  - "Pattern 2: cedente lifecycle UI should explain automatic backend steps in the same detail surface instead of implying a second manual action."
requirements-completed: [AI-01, AI-02, UX-01]
duration: 8min
completed: 2026-03-28
---

# Phase 5 Plan 1: Cedente invoice detail now explains risk facts and tokenization handoff Summary

**Cedente invoice detail now renders persisted BCRA facts, narrative provenance, and the automatic tokenization-to-funding handoff in one server-shaped screen.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T14:35:00Z
- **Completed:** 2026-03-28T14:43:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added a tested `riskSummary` and `tokenizationStatus` contract to the cedente invoice-detail query.
- Rebuilt the risk card around structured BCRA facts, deterministic signals, and narrative provenance.
- Reworded tokenization UI so the cedente can see that marketplace publication happened automatically in the submit journey.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the cedente invoice-detail query with structured risk facts and provenance** - `60b3c15` (feat)
2. **Task 2: Render the richer AI risk panel and explicit automatic-tokenization handoff** - `a32f339` (feat)

## Files Created/Modified
- `tests/invoices/invoice-detail-risk-view.test.ts` - regression coverage for risk fact reshaping, provenance, and tokenization status
- `src/lib/invoices/queries.ts` - structured risk/tokenization read model for cedente detail views
- `src/components/invoices/risk-summary-card.tsx` - labeled BCRA fact cards and deterministic signal chips
- `src/components/invoices/tokenization-summary.tsx` - automatic tokenization/funding confirmation messaging
- `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` - wiring for the richer detail contract

## Decisions Made
- Kept the authoritative tier/rate on the persisted invoice record while deriving presentation facts from `bcra_data`.
- Used a dedicated `narrativeSource` field so the UI can explain LLM vs fallback output without inferring from copy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed an inline dependency guard in the invoice-detail query override path**
- **Found during:** Task 2 (Render the richer AI risk panel and explicit automatic-tokenization handoff)
- **Issue:** The query override branch referenced `overrides` without a null guard, which broke `npm run build`.
- **Fix:** Switched the conditional to use optional chaining before merging injected test dependencies.
- **Files modified:** `src/lib/invoices/queries.ts`
- **Verification:** `npx vitest run tests/invoices/invoice-detail-risk-view.test.ts && npm run build`
- **Committed in:** `a32f339`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix stayed inside the planned contract work and was required to keep the new read model build-safe.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The investor-side wave can now consume richer risk/tokenization language that matches the cedente journey.
- Phase 5 validation can assert explicit cedente copy for both structured risk and automatic funding publication.

## Self-Check: PASSED

---
*Phase: 05-integrar-ia-para-riesgo-crediticio-y-mejorar-ux-ui-navegable-con-cheques-tasas-stats-de-inversor-y-tokenizacion-automatica*
*Completed: 2026-03-28*
