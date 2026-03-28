---
phase: 05-integrar-ia-para-riesgo-crediticio-y-mejorar-ux-ui-navegable-con-cheques-tasas-stats-de-inversor-y-tokenizacion-automatica
plan: 03
subsystem: ui
tags: [dashboard, marketplace, investor, cheque, navigation]
requires:
  - phase: 05-integrar-ia-para-riesgo-crediticio-y-mejorar-ux-ui-navegable-con-cheques-tasas-stats-de-inversor-y-tokenizacion-automatica
    provides: Investor analytics and enriched marketplace cheque contracts
provides:
  - Reusable investor performance strip and cheque facts presenter
  - Marketplace cards and detail pages redesigned around cheque economics
  - Marketplace-first investor navigation with richer landing metrics
affects: [phase-05-plan-04, verifier, investor-demo]
tech-stack:
  added: [no new dependencies]
  patterns: [presentation-only dashboard strips, reusable cheque fact blocks, marketplace-first navigation]
key-files:
  created: [src/components/dashboard/investor-performance-strip.tsx, src/components/marketplace/invoice-facts-list.tsx]
  modified: [src/components/marketplace/marketplace-card.tsx, src/components/marketplace/marketplace-grid.tsx, src/components/marketplace/purchase-fractions-form.tsx, src/app/(inversor)/inversor/dashboard/page.tsx, src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx]
key-decisions:
  - "Kept `/inversor/dashboard` as the home route and layered richer analytics above the marketplace instead of splitting navigation into new pages."
  - "Reused the same cheque-facts component across card and detail surfaces so maturity and per-fraction economics stay consistent."
patterns-established:
  - "Pattern 1: investor routes should keep the marketplace visible while surfacing portfolio outcomes above the fold."
  - "Pattern 2: cheque-style facts belong in reusable presentation components, not duplicated page markup."
requirements-completed: [UX-02, UX-03]
duration: 8min
completed: 2026-03-28
---

# Phase 5 Plan 3: Investor dashboard and detail routes now feel like a cheque marketplace Summary

**Investor landing and detail routes now present portfolio outcomes, cheque facts, and per-fraction economics through reusable premium-feeling UI blocks while preserving the marketplace-first flow.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T14:50:00Z
- **Completed:** 2026-03-28T14:58:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added a dedicated investor outcome strip for invested capital, open return, realized return, and concentration.
- Introduced a shared cheque-facts list reused by marketplace cards and investor detail pages.
- Rebuilt the investor dashboard/detail experience around cheque-style cards, status summaries, and a stable back-link to `/inversor/dashboard`.

## Task Commits

Implemented in one UI-focused commit because both tasks were coupled to the same new presentation components:

1. **Task 1: Create reusable investor outcome and cheque-facts presentation components** - `705d208` (feat)
2. **Task 2: Rebuild the investor dashboard and detail route around cheque-style cards and richer stats** - `705d208` (feat)

## Files Created/Modified
- `src/components/dashboard/investor-performance-strip.tsx` - investor outcome summary strip
- `src/components/marketplace/invoice-facts-list.tsx` - reusable cheque facts block
- `src/components/marketplace/marketplace-card.tsx` - cheque-centric marketplace card layout
- `src/components/marketplace/marketplace-grid.tsx` - empty-state copy aligned to automatic tokenization
- `src/components/marketplace/purchase-fractions-form.tsx` - snapshot refresh aligned to the richer card contract
- `src/app/(inversor)/inversor/dashboard/page.tsx` - landing route with performance strip, status summary, holdings, and marketplace grid
- `src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx` - detail route with shared cheque facts above the purchase form

## Decisions Made
- Preserved the holdings section so existing portfolio context stays visible while the new marketplace blocks add richer navigation.
- Kept the detail page back-link pointed at `/inversor/dashboard` to reinforce the marketplace-first browsing loop.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The refresh queries in marketplace client components also needed `pagador_cuit` after the contract expansion, so both browser refresh paths were updated alongside the UI work.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 validation can now prove the same cheque facts on dashboard cards and investor detail views.
- The investor flow is ready for desktop/mobile browser evidence and requirement-level verification.

## Self-Check: PASSED

---
*Phase: 05-integrar-ia-para-riesgo-crediticio-y-mejorar-ux-ui-navegable-con-cheques-tasas-stats-de-inversor-y-tokenizacion-automatica*
*Completed: 2026-03-28*
