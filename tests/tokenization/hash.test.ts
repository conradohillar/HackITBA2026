import { describe, expect, it } from 'vitest';
import { buildInvoiceTokenHash } from '@/lib/tokenization/hash';

describe('invoice token hash', () => {
  it('returns the same SHA-256 hash for identical payloads and changes when payload changes', () => {
    const payload = {
      invoiceId: 'invoice-1',
      pagadorCuit: '30712345678',
      amount: 1500000,
      dueDate: '2026-06-28',
    };

    expect(buildInvoiceTokenHash(payload)).toBe(buildInvoiceTokenHash(payload));
    expect(buildInvoiceTokenHash(payload)).not.toBe(
      buildInvoiceTokenHash({ ...payload, amount: 1500001 }),
    );
  });
});
