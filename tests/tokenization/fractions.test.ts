import { describe, expect, it } from 'vitest';
import { splitInvoiceIntoFractions } from '@/lib/tokenization/fractions';

describe('invoice fraction splitting', () => {
  it('preserves two-decimal precision and assigns the remainder to the last fraction', () => {
    const fractions = splitInvoiceIntoFractions(100, 3);

    expect(fractions).toEqual([33.33, 33.33, 33.34]);
    expect(fractions.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('rejects invalid fraction counts before persistence', () => {
    expect(() => splitInvoiceIntoFractions(100, 0)).toThrow(/fracciones/i);
    expect(() => splitInvoiceIntoFractions(100, -1)).toThrow(/fracciones/i);
    expect(() => splitInvoiceIntoFractions(100, 2.5)).toThrow(/fracciones/i);
  });
});
