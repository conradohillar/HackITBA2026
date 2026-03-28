import { describe, expect, it, vi } from 'vitest';
import { getInvoiceFundingSnapshot, getMarketplaceInvoices } from '@/lib/marketplace/queries';

describe('marketplace queries', () => {
  it('returns only funding-ready invoices with the investor card metrics', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-31T00:00:00.000Z'));

    const invoices = await getMarketplaceInvoices({
      getAuthState: vi.fn().mockResolvedValue({ user: { id: 'investor-1' }, profile: { role: 'inversor' } }),
      listFundingInvoices: vi.fn().mockResolvedValue([
        {
          id: 'inv-1',
          status: 'funding',
          invoice_number: 'FAC-100',
          pagador_name: 'Techint SA',
          pagador_cuit: '30711222333',
          amount: 80000,
          net_amount: 70000,
          risk_tier: 'A',
          discount_rate: 0.145,
          total_fractions: 8,
          funded_fractions: 3,
          due_date: '2026-06-30',
        },
        {
          id: 'inv-2',
          status: 'funded',
          invoice_number: 'FAC-200',
          pagador_name: 'Arcor SAIC',
          pagador_cuit: '30799888777',
          amount: 50000,
          net_amount: 45000,
          risk_tier: 'B',
          discount_rate: 0.18,
          total_fractions: 5,
          funded_fractions: 5,
          due_date: '2026-07-15',
        },
        {
          id: 'inv-3',
          status: 'draft',
          invoice_number: 'FAC-300',
          pagador_name: 'Should Not Leak',
          pagador_cuit: '30000000000',
          amount: 10000,
          net_amount: 9000,
          risk_tier: 'C',
          discount_rate: 0.22,
          total_fractions: 4,
          funded_fractions: 0,
          due_date: '2026-07-20',
        },
      ]),
    });

    expect(invoices).toEqual([
      {
        id: 'inv-1',
        invoiceNumber: 'FAC-100',
        pagadorName: 'Techint SA',
        payerCuit: '30711222333',
        amount: 80000,
        netAmount: 70000,
        riskTier: 'A',
        discountRate: 0.145,
        totalFractions: 8,
        fundedFractions: 3,
        availableFractions: 5,
        daysToMaturity: 91,
        perFractionNetAmount: 8750,
        perFractionExpectedReturn: 10000,
        progressPercentage: 37.5,
        dueDate: '2026-06-30',
      },
      {
        id: 'inv-2',
        invoiceNumber: 'FAC-200',
        pagadorName: 'Arcor SAIC',
        payerCuit: '30799888777',
        amount: 50000,
        netAmount: 45000,
        riskTier: 'B',
        discountRate: 0.18,
        totalFractions: 5,
        fundedFractions: 5,
        availableFractions: 0,
        daysToMaturity: 106,
        perFractionNetAmount: 9000,
        perFractionExpectedReturn: 10000,
        progressPercentage: 100,
        dueDate: '2026-07-15',
      },
    ]);

    vi.useRealTimers();
  });

  it('returns the invoice funding snapshot with available fractions and return inputs', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-31T00:00:00.000Z'));

    const snapshot = await getInvoiceFundingSnapshot('inv-1', {
      getAuthState: vi.fn().mockResolvedValue({ user: { id: 'investor-1' }, profile: { role: 'inversor' } }),
      getFundingInvoiceById: vi.fn().mockResolvedValue({
        id: 'inv-1',
        status: 'funding',
        invoice_number: 'FAC-100',
        pagador_name: 'Techint SA',
        pagador_cuit: '30711222333',
        amount: 80000,
        net_amount: 70000,
        risk_tier: 'A',
        discount_rate: 0.145,
        total_fractions: 8,
        funded_fractions: 3,
        due_date: '2026-06-30',
      }),
      listAvailableFractionsByInvoiceId: vi.fn().mockResolvedValue([
        { id: 'frac-4', net_amount: 8750 },
        { id: 'frac-5', net_amount: 8750 },
        { id: 'frac-6', net_amount: 8750 },
        { id: 'frac-7', net_amount: 8750 },
        { id: 'frac-8', net_amount: 8750 },
      ]),
    });

    expect(snapshot).toEqual({
      id: 'inv-1',
      invoiceNumber: 'FAC-100',
      pagadorName: 'Techint SA',
      payerCuit: '30711222333',
      amount: 80000,
      netAmount: 70000,
      riskTier: 'A',
      discountRate: 0.145,
      totalFractions: 8,
      fundedFractions: 3,
      availableFractions: 5,
      daysToMaturity: 91,
      dueDate: '2026-06-30',
      availableFractionIds: ['frac-4', 'frac-5', 'frac-6', 'frac-7', 'frac-8'],
      perFractionNetAmount: 8750,
      perFractionExpectedReturn: 10000,
      progressPercentage: 37.5,
    });

    vi.useRealTimers();
  });

  it('returns null for missing or unauthorized invoice lookups', async () => {
    await expect(
      getInvoiceFundingSnapshot('inv-404', {
        getAuthState: vi.fn().mockResolvedValue({ user: { id: 'cedente-1' }, profile: { role: 'cedente' } }),
        getFundingInvoiceById: vi.fn(),
        listAvailableFractionsByInvoiceId: vi.fn(),
      }),
    ).resolves.toBeNull();

    await expect(
      getInvoiceFundingSnapshot('inv-404', {
        getAuthState: vi.fn().mockResolvedValue({ user: { id: 'investor-1' }, profile: { role: 'inversor' } }),
        getFundingInvoiceById: vi.fn().mockResolvedValue(null),
        listAvailableFractionsByInvoiceId: vi.fn(),
      }),
    ).resolves.toBeNull();
  });
});
