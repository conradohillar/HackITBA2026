import { describe, expect, it } from 'vitest';
import { buildSettlementDistribution } from '@/lib/settlement/distribution';

describe('settlement distribution math', () => {
  it('allocates interest pro-rata and gives the final fraction the locked remainder', () => {
    const distribution = buildSettlementDistribution({
      invoiceAmount: 80000,
      invoiceNetAmount: 70000,
      fractions: [
        { fractionId: 'frac-1', fractionIndex: 1, investorId: 'investor-1', netAmount: 11666.67 },
        { fractionId: 'frac-2', fractionIndex: 2, investorId: 'investor-2', netAmount: 11666.67 },
        { fractionId: 'frac-3', fractionIndex: 3, investorId: 'investor-3', netAmount: 11666.67 },
        { fractionId: 'frac-4', fractionIndex: 4, investorId: 'investor-4', netAmount: 11666.67 },
        { fractionId: 'frac-5', fractionIndex: 5, investorId: 'investor-5', netAmount: 11666.66 },
        { fractionId: 'frac-6', fractionIndex: 6, investorId: 'investor-6', netAmount: 11666.66 },
      ],
    });

    expect(distribution.rows).toEqual([
      expect.objectContaining({ fractionIndex: 1, principalAmount: 11666.67, interestAmount: 1666.67 }),
      expect.objectContaining({ fractionIndex: 2, principalAmount: 11666.67, interestAmount: 1666.67 }),
      expect.objectContaining({ fractionIndex: 3, principalAmount: 11666.67, interestAmount: 1666.67 }),
      expect.objectContaining({ fractionIndex: 4, principalAmount: 11666.67, interestAmount: 1666.67 }),
      expect.objectContaining({ fractionIndex: 5, principalAmount: 11666.66, interestAmount: 1666.67 }),
      expect.objectContaining({ fractionIndex: 6, principalAmount: 11666.66, interestAmount: 1666.65 }),
    ]);

    expect(distribution.totals).toEqual({
      principalTotal: 70000,
      interestTotal: 10000,
    });
  });
});
