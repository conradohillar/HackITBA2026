import { describe, expect, it } from 'vitest';

describe('Phase 1 RLS harness', () => {
  it('starts with explicit policy coverage placeholders', () => {
    expect(['anon-denial', 'self-profile', 'invoice-isolation', 'marketplace-visibility']).toContain(
      'marketplace-visibility',
    );
  });
});
