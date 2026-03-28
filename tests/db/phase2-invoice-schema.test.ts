import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0003_phase2_invoice_origination.sql');

describe('phase 2 invoice schema migration', () => {
  it('adds a non-null description column and payer CUIT index', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toMatch(/alter table public\.invoices\s+add column if not exists description text/i);
    expect(migration).toMatch(/update public\.invoices\s+set description =/i);
    expect(migration).toMatch(/alter table public\.invoices\s+alter column description set not null/i);
    expect(migration).toMatch(/create index if not exists idx_invoices_pagador_cuit on public\.invoices\(pagador_cuit\)/i);
  });

  it('preserves the phase 1 lifecycle state machine contract', () => {
    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).not.toMatch(/drop function\s+public\.transition_invoice/i);
    expect(migration).not.toMatch(/drop type\s+public\.invoice_status/i);
    expect(migration).not.toMatch(/alter table public\.invoices\s+drop column\s+status/i);
  });
});
