# Stack Research: Karaí

> Crowdfactoring / invoice tokenization marketplace — HackITBA 2026 (36h)
> Researched: 2026-03-28

---

## Recommended Stack

### Frontend

| Choice | Version | Rationale |
|--------|---------|-----------|
| **Next.js 16** (App Router) | `16.2.x` | Fullstack framework deployed as a single Vercel project. App Router gives RSC for fast initial loads (demo gold), Server Actions for mutations without API boilerplate, and streaming for progressive UIs. 400% faster dev startup in v16 matters for hackathon velocity. |
| **Tailwind CSS 4** | `4.2.x` | Zero-config CSS engine in v4 (no `tailwind.config.js` needed), lightning-fast builds via Oxide engine. Utility-first = fast iteration without context-switching to CSS files. |
| **shadcn/ui** (CLI v4) | `latest` | Not a dependency — copies component source into your repo. Gives production-quality Radix-based primitives (Dialog, Dropdown, Table, Tabs, Card) styled with Tailwind. No version lock-in, full control. Critical for polished demo UX in 36h. |
| **Lucide React** | `1.7.x` | Icon library used by shadcn/ui. Tree-shakeable, consistent style, 1500+ icons. |
| **Recharts** | `3.8.x` | Declarative React charting for investor dashboards (portfolio allocation, risk distribution). Built on D3 but exposes React components. Lightweight alternative to heavy BI libraries. |

**Key Frontend Patterns:**
- **Server Components by default.** Only add `'use client'` for interactive islands (forms, real-time subscriptions, charts).
- **Server Actions for mutations** (create invoice, fund fraction, simulate liquidation). Each action validates with Zod, checks auth, then mutates DB. No `/api/` route needed.
- **Route Handlers (`route.ts`) only for**: webhook endpoints, BCRA API proxy (to avoid CORS), and any endpoint that external services call.
- **Streaming + Suspense** for the risk scoring flow: show skeleton while LLM processes, stream the explanation in.
- **`loading.tsx` + `error.tsx`** per route segment for instant perceived performance.

### Backend / API

| Choice | Version | Rationale |
|--------|---------|-----------|
| **Next.js Server Actions** | (built-in) | Mutations: invoice creation, fraction purchase, liquidation trigger. Each action is a `'use server'` function — typed, validated, directly callable from forms. Eliminates API route boilerplate. |
| **Next.js Route Handlers** | (built-in) | Used only for: (1) BCRA API proxy to avoid CORS + add caching, (2) Supabase webhook receivers, (3) any cron-like simulation triggers. |
| **Zod** | `4.3.x` | Runtime schema validation for all inputs. TypeScript types evaporate at runtime — Zod catches malformed data at the boundary. v4 has 10x faster parsing and smaller bundle. |
| **React Hook Form** | `7.72.x` | Uncontrolled form management with minimal re-renders. Pairs with `@hookform/resolvers` for Zod integration. Essential for the multi-step invoice upload flow. |

**Key Backend Patterns:**
- **Server Action security**: Every `'use server'` function is a public POST endpoint. Always: (1) validate input with Zod, (2) verify auth via `supabase.auth.getUser()`, (3) check role authorization, (4) return typed results.
- **BCRA API proxy**: Route Handler at `/api/bcra/[endpoint]/route.ts` that calls `https://api.bcra.gob.ar/centraldedeudores/v1.0/` server-side, caches responses for 1h (corporate credit doesn't change by the minute), and normalizes the response.
- **Error boundaries**: Use `error.tsx` at the route level + try/catch in Server Actions returning `{ success: boolean, error?: string }` patterns.

### Database & Auth

| Choice | Version | Rationale |
|--------|---------|-----------|
| **Supabase** (hosted) | `latest` | PostgreSQL + Auth + Real-time + RLS in one managed service. Free tier is generous for hackathons. No infra to manage. |
| **@supabase/supabase-js** | `2.100.x` | Isomorphic client. Use server-side client in Server Actions (with service role key for admin ops), browser client for real-time subscriptions. |
| **@supabase/ssr** | `latest` | Official Next.js integration for cookie-based auth in App Router. Handles server/client component auth seamlessly. |

**Schema Patterns for Financial App:**

```
profiles (id FK→auth.users, role ENUM('pyme','investor'), company_name, cuit, ...)
invoices (id, cedente_id FK→profiles, pagador_cuit, pagador_name, monto_original,
          monto_descontado, tasa_descuento, fecha_emision, fecha_vencimiento,
          token_hash TEXT, status ENUM('pending_scoring','scored','listed','funded',
          'matured','liquidated','defaulted'), risk_tier, risk_explanation,
          created_at, updated_at)
fractions (id, invoice_id FK→invoices, investor_id FK→profiles, monto, 
           porcentaje, status ENUM('active','liquidated'), created_at)
events (id UUID, entity_type, entity_id, event_type, actor_id FK→profiles,
        payload JSONB, created_at TIMESTAMPTZ DEFAULT now())
bcra_cache (cuit BIGINT PK, deudas JSONB, historicas JSONB, cheques JSONB,
            fetched_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
```

**RLS Patterns:**
- **PyMEs** see only their own invoices (`cedente_id = auth.uid()`).
- **Investors** see all `listed` invoices (read) but only their own fractions.
- **Events table**: append-only for all authenticated users, read filtered by `actor_id = auth.uid()` or by related entity ownership.
- Use a `SECURITY DEFINER` function `public.user_role()` that returns the role from `profiles` — avoids exposing the profiles table in every policy.
- **Force RLS** on all tables. Use service role key only in Server Actions for admin operations (status transitions, liquidation).

**Real-time:**
- Subscribe to `invoices` table changes (status updates) on the marketplace dashboard.
- Subscribe to `fractions` inserts on the invoice detail page (live funding progress bar).

### AI / Risk Engine

| Choice | Version | Rationale |
|--------|---------|-----------|
| **Vercel AI SDK** | `6.0.x` | First-class streaming in Next.js. `streamText()` pipes LLM output directly to the client via RSC streaming. Agent abstraction available but overkill here — use raw `generateText` / `streamText`. |
| **OpenAI SDK** (via AI SDK provider) | `6.33.x` | Best model quality for structured risk analysis. Use `@ai-sdk/openai` provider adapter — not the raw SDK directly. |
| **Model: `gpt-4o`** | — | Best balance of quality/speed/cost for structured JSON output. `gpt-4o-mini` as fallback if rate-limited. Avoid `gpt-5.2` — overkill latency for a hackathon demo. |

**Risk Scoring Architecture:**

1. **Data Collection** (Server Action):
   - Fetch BCRA data via proxy: `/Deudas/{cuit}`, `/Deudas/Historicas/{cuit}`, `/Deudas/ChequesRechazados/{cuit}`
   - Cache in `bcra_cache` table (TTL 1h)
   - Merge with invoice metadata (monto, plazo, sector)

2. **LLM Scoring** (Server Action with streaming):
   - System prompt defines the scoring rubric: risk tiers (A/B/C/D), discount rate ranges, required output JSON schema
   - User prompt includes: BCRA data summary, invoice details, mock ARCA data
   - Use `generateObject()` from AI SDK with Zod schema for structured output:
     ```
     { tier: 'A'|'B'|'C'|'D', tasa_descuento: number, 
       explicacion: string, senales: string[] }
     ```
   - Stream the explanation to the UI while the structured scoring is computed

3. **Caching**: Store the risk result in the `invoices` row (risk_tier, risk_explanation). Don't re-score unless BCRA data refreshed.

**BCRA API Endpoints (real, public, no auth):**
- `GET /centraldedeudores/v1.0/Deudas/{cuit}` — current credit situation (situación 1-5, amounts, delays)
- `GET /centraldedeudores/v1.0/Deudas/Historicas/{cuit}` — multi-period credit trend
- `GET /centraldedeudores/v1.0/Deudas/ChequesRechazados/{cuit}` — bounced checks by cause

### Hashing & Tokenization

| Choice | Version | Rationale |
|--------|---------|-----------|
| **Node.js `crypto` (built-in)** | — | `crypto.createHash('sha256')` is built into Node.js. Zero dependencies. Produces the deterministic hash that serves as the simulated "token ID". |

**Token Simulation Pattern:**

```typescript
import { createHash } from 'crypto';

function tokenizeInvoice(invoice: {
  id: string; cedente_cuit: string; pagador_cuit: string;
  monto: number; fecha_emision: string;
}): string {
  const payload = JSON.stringify({
    id: invoice.id,
    cedente: invoice.cedente_cuit,
    pagador: invoice.pagador_cuit,
    monto: invoice.monto,
    emision: invoice.fecha_emision,
    timestamp: Date.now(),
  });
  return createHash('sha256').update(payload).digest('hex');
}
```

- Store the hash in `invoices.token_hash`.
- Display truncated hash in the UI as the "token ID" (e.g., `0x3f8a...b2c1`).
- The hash is deterministic proof that the invoice data hasn't been tampered with — sufficient for the demo narrative.
- **No blockchain needed.** The hash + event log together simulate token immutability.

### Event Logging / Audit Trail

**Pattern: Append-only event table + database triggers.**

| Choice | Version | Rationale |
|--------|---------|-----------|
| **PostgreSQL `events` table** | (built-in) | Simple, queryable, real-time via Supabase subscriptions. No need for Kafka or EventStoreDB in a 36h hackathon. |
| **Database triggers** | (built-in) | Automatically capture state transitions without application code remembering to log. |

**Event Types:**

```
INVOICE_CREATED, INVOICE_SCORED, INVOICE_LISTED, 
FRACTION_PURCHASED, INVOICE_FULLY_FUNDED, 
LIQUIDATION_TRIGGERED, FUNDS_DISTRIBUTED, 
INVOICE_DEFAULTED
```

**Implementation:**
- Every state transition writes to the `events` table with: `entity_type`, `entity_id`, `event_type`, `actor_id`, `payload` (JSONB with before/after state).
- Use a PostgreSQL trigger on `invoices` status changes to auto-insert events (ensures no event is missed even if app code has bugs).
- The `events` table is **append-only** — RLS policy allows INSERT for authenticated users, SELECT filtered by ownership, no UPDATE or DELETE.
- Query the event stream for the audit trail UI: `SELECT * FROM events WHERE entity_id = ? ORDER BY created_at`.
- Supabase Real-time subscription on `events` table for live activity feed on dashboard.

### Deployment

| Choice | Rationale |
|--------|-----------|
| **Vercel** (Hobby/Pro) | Next.js-native deployment. Zero-config. Automatic preview deploys per branch. Edge Functions for the BCRA proxy if latency matters. |
| **Supabase** (hosted, free tier) | Managed PostgreSQL, Auth, Real-time. Free tier: 500MB DB, 50K auth users, 2GB bandwidth. More than enough for hackathon. |
| **Environment Variables** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`. Set in Vercel dashboard, never in code. |

**Deployment Patterns:**
- **Single `vercel.json`** is rarely needed — Next.js 16 on Vercel is zero-config.
- **Edge runtime** for the BCRA proxy route handler (`export const runtime = 'edge'`) — faster cold starts for API calls.
- **ISR / caching**: Cache BCRA proxy responses with `next: { revalidate: 3600 }` (1h) — corporate credit situations don't change in real-time.
- **Supabase migrations**: Use `supabase db push` for hackathon speed. Don't bother with migration files for 36h.

### Key Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `16.2.x` | Fullstack React framework |
| `react` / `react-dom` | `19.x` | UI runtime (ships with Next.js 16) |
| `tailwindcss` | `4.2.x` | Utility-first CSS |
| `@supabase/supabase-js` | `2.100.x` | Supabase client |
| `@supabase/ssr` | `latest` | Next.js App Router auth integration |
| `ai` (Vercel AI SDK) | `6.0.x` | LLM streaming + structured output |
| `@ai-sdk/openai` | `latest` | OpenAI provider for AI SDK |
| `zod` | `4.3.x` | Runtime schema validation |
| `react-hook-form` | `7.72.x` | Performant form management |
| `@hookform/resolvers` | `latest` | Zod resolver for react-hook-form |
| `recharts` | `3.8.x` | React charting (investor dashboards) |
| `lucide-react` | `1.7.x` | Icons (shadcn/ui default) |
| `date-fns` | `4.1.x` | Date formatting (vencimiento, plazos) |
| `sonner` | `latest` | Toast notifications (shadcn/ui default) |

**Install command:**
```bash
npx create-next-app@latest karai --typescript --tailwind --eslint --app --src-dir
cd karai
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr ai @ai-sdk/openai zod react-hook-form @hookform/resolvers recharts date-fns sonner
npx shadcn@latest add button card dialog dropdown-menu input label table tabs badge separator skeleton toast
```

---

## What NOT to Use

| Avoid | Why |
|-------|-----|
| **Prisma / Drizzle ORM** | Supabase client handles queries + RLS natively. Adding an ORM means fighting RLS, duplicating auth logic, and adding migration complexity. For a 36h hackathon, `supabase.from('table').select()` is sufficient and type-safe with generated types. |
| **tRPC** | Server Actions in Next.js 16 provide typed server functions natively. tRPC adds a router layer that duplicates what App Router already gives you. |
| **Express / Fastify / separate API server** | Next.js Route Handlers + Server Actions cover all backend needs. A separate server means two deploy targets, two processes, CORS headaches. |
| **MongoDB / Firestore** | Relational data (invoices → fractions → events) with financial integrity constraints needs PostgreSQL. Document stores can't enforce foreign keys or run the atomic transactions this domain requires. |
| **Redux / Zustand for global state** | Supabase Real-time + React Server Components + `useOptimistic` cover the state management needs. No client-side store needed for this app shape. |
| **Ethers.js / Viem / wagmi** | No actual blockchain integration. SHA-256 hashing via Node.js `crypto` is the token simulation strategy. Adding web3 libraries adds 500KB+ to the bundle for zero benefit. |
| **Kafka / RabbitMQ / EventStoreDB** | The `events` PostgreSQL table + Supabase Real-time is the event sourcing layer. Message brokers are for multi-service architectures, not a monolithic hackathon app. |
| **NextAuth.js / Clerk** | Supabase Auth is already included. Adding another auth provider creates identity fragmentation and breaks RLS policies that depend on `auth.uid()`. |
| **Chart.js** | Recharts has a more React-native API (declarative components vs imperative canvas). Chart.js requires ref-based imperative setup that fights React's model. |
| **Moment.js** | Dead library (maintenance mode since 2020). `date-fns` is tree-shakeable and lighter. |
| **`gpt-5.2` / `o3`** | Higher latency, higher cost, no meaningful quality gain for structured risk scoring. `gpt-4o` with a well-crafted system prompt + Zod structured output achieves the same result 3x faster. |

---

## Confidence Levels

| Recommendation | Confidence | Notes |
|----------------|------------|-------|
| Next.js 16 + App Router | **Very High** | Project constraint. v16 is stable LTS. No alternative considered. |
| Supabase (PostgreSQL + Auth + RT) | **Very High** | Project constraint. Perfect fit for RBAC + real-time marketplace. |
| Tailwind CSS 4 | **Very High** | Project constraint. v4 zero-config is a genuine DX improvement. |
| shadcn/ui | **Very High** | De facto standard for Tailwind + Radix component libraries. Copies source = no dependency risk. |
| Vercel AI SDK 6 | **High** | Best streaming integration with Next.js. `generateObject()` with Zod schema is exactly what the risk engine needs. Alternative: raw OpenAI SDK — works but loses streaming convenience. |
| `gpt-4o` as model | **High** | Best quality/latency tradeoff. Could use `gpt-4o-mini` if budget is tight — risk explanation quality drops but still usable. |
| Zod 4 | **Very High** | Industry standard for TS runtime validation. v4 is 10x faster. No real alternative. |
| Recharts 3 | **High** | Best React-native charting. Alternative: Nivo — slightly prettier but heavier API surface for a hackathon. |
| PostgreSQL events table for audit | **High** | Right-sized for 36h. A proper event store (EventStoreDB) is better architecturally but overkill. The append-only table + triggers pattern is battle-tested. |
| SHA-256 via Node.js `crypto` | **Very High** | Built-in, zero dependency, deterministic. No reason to use anything else for hash-based token simulation. |
| react-hook-form | **High** | Best form library for complex multi-step forms. Alternative: conform — newer but less ecosystem support. |
| Server Actions over API routes | **High** | Right choice for mutations in App Router. API routes still needed for the BCRA proxy and webhooks. |
| No ORM (use Supabase client) | **Medium-High** | Correct for hackathon speed. In production, Drizzle + Supabase would give better type safety and migration management. |
| No separate state management | **High** | RSC + Supabase Real-time covers the needs. Zustand would only be needed if complex client-side state emerges (unlikely in this app shape). |

---

*This document feeds into roadmap/phase creation. All versions verified via npm/GitHub as of 2026-03-28.*
