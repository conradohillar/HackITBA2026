# Karaí

## What This Is

Un marketplace de crowdfactoring que tokeniza facturas corporativas para inyectar liquidez inmediata a PyMEs argentinas. Las PyMEs (cedentes) suben facturas por cobrar a grandes corporaciones, el sistema evalúa el riesgo del pagador con datos reales del BCRA e IA, y los inversores minoristas fondean fracciones de esa deuda obteniendo retornos predecibles respaldados por activos reales (RWA).

## Core Value

El happy path completo funciona de punta a punta en la demo: PyME sube factura → se evalúa riesgo con BCRA + IA → inversores fondean fracciones → plataforma liquida y distribuye capital + intereses.

## Requirements

### Validated

- IA risk experience on cedente detail: structured BCRA facts, deterministic provenance, and automatic tokenization handoff are validated in Phase 5: IA Risk + UX Polish
- Investor navigation polish: cheque-style marketplace cards, richer portfolio outcomes, and desktop/mobile happy-path proof are validated in Phase 5: IA Risk + UX Polish

### Active

- [ ] Motor de originación: carga de datos de factura, validación y generación de hash SHA-256
- [ ] Scoring de riesgo con IA: consulta real a API BCRA (deudas, históricas, cheques rechazados) + LLM que produce tier, tasa de descuento y explicación base
- [ ] Marketplace de fracciones: dashboard donde facturas tokenizadas se listan y fondean por múltiples inversores
- [ ] Fondeo colectivo: inversores compran fracciones hasta completar el 100% del monto
- [ ] Liquidación simulada: al vencimiento se simula el pago corporativo, se quema el token y se distribuyen capital + intereses
- [ ] Trazabilidad de eventos: registro transaccional inmutable del flujo de fondos (oferta, match, desembolso)
- [ ] Autenticación y RBAC: roles separados para PyMEs (cedentes) e inversores (fondeadores)
- [ ] Dashboard profesional para la demo con UX pulida base

## Current State

Phase 5 complete: Karaí now explains cedente risk with structured persisted facts, makes the automatic tokenization-to-funding handoff explicit, and gives investors a cheque-centric dashboard/detail journey validated on desktop and mobile.

### Out of Scope

- Integración real con ARCA/AFIP — se usan mocks, no hay acceso a API real
- Smart contracts en testnet pública — la lógica de tokenización se simula en backend
- Mercado secundario de fracciones — complejidad excesiva para 36h
- App móvil nativa — web-first
- KYC/AML real — se mockea el onboarding de compliance

## Context

Hackathon HackITBA 2026, 36 horas de desarrollo. Equipo de 4 personas. El proyecto apunta a demostrar que el factoring puede democratizarse: las PyMEs acceden a liquidez basada en la solvencia del pagador (no la propia), y los inversores minoristas acceden a un mercado de deuda fraccionada antes reservado a institucionales.

El 67% de las PyMEs argentinas está excluido del financiamiento productivo por fricciones burocráticas y aforos del 20% que aplica la banca tradicional. Las corporaciones pagan a 90-120 días, asfixiando el capital de trabajo.

El diferenciador técnico es el motor de riesgo con IA que consulta datos reales del BCRA:
- **Central de Deudores** — situación crediticia actual del pagador (situación 1-5, monto, días de atraso, refinanciaciones, procesos judiciales)
- **Deudas Históricas** — tendencia crediticia por períodos (mejorando/empeorando)
- **Cheques Rechazados** — historial de cheques rebotados del pagador

El LLM interpreta estos datos y produce un risk tier (A/B/C/D), tasa de descuento dinámica, y explicación legible. Señales adicionales: ratio monto factura vs exposición total del pagador, datos mockeados de ARCA (antigüedad empresa, compliance fiscal, sector).

## Constraints

- **Tiempo**: 36 horas estrictas. Cortar código 3h antes del cierre para pitch y demo
- **APIs externas**: Sin claves bancarias ni fiscales reales (excepto BCRA que es pública). Integraciones de terceros se simulan
- **Deploy**: Todo en Vercel (frontend + API routes) con Supabase (auth, DB, real-time)
- **Tech stack**: Next.js fullstack, Supabase (PostgreSQL + Auth), Tailwind CSS, Node.js
- **Equipo**: 4 personas, división de trabajo flexible

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js fullstack en Vercel | Un solo deploy target, API routes integradas, SSR para demo rápida | — Pending |
| Supabase en vez de MongoDB | Auth + RBAC out-of-the-box, PostgreSQL con Row Level Security, real-time subscriptions para updates del marketplace | — Pending |
| API BCRA real (no mock) | Diferenciador fuerte ante jurado: datos reales del banco central alimentando el modelo de IA | — Pending |
| LLM para risk scoring | Produce explicación legible del riesgo, no solo un número. Demo gold para el pitch | — Pending |
| Hash SHA-256 como "token" | Simula inmutabilidad sin smart contracts reales. Suficiente para demostrar el concepto | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 after Phase 5 completion*
