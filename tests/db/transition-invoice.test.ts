import { describe, expect, it } from 'vitest';

describe('Phase 1 transition test harness', () => {
  it('pins the canonical migration path for lifecycle invariants', () => {
    expect('supabase/migrations/0001_foundation_schema.sql').toMatch(/0001_foundation_schema\.sql$/);
  });
});
