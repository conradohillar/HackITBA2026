import { describe, expect, it } from 'vitest';
import {
  getCedenteDashboard,
  getCedenteInvoiceSettlementView,
  getInvestorDashboard,
  getInvestorInvoiceSettlementView,
} from '@/lib/settlement/queries';

const cedenteUser = { id: 'cedente-1' };
const investorUser = { id: 'investor-1' };

describe('Phase 4 settlement read models', () => {
  it('returns cedente status metrics, capital raised, financing cost, and only cedente-relevant ledger rows', async () => {
    const dashboard = await getCedenteDashboard({
      getAuthState: async () => ({ user: cedenteUser, profile: { role: 'cedente' as const } }),
      listCedenteInvoices: async () => [
        {
          id: 'invoice-funded',
          status: 'funded',
          invoice_number: 'FAC-001',
          pagador_name: 'Pagador Uno',
          pagador_cuit: '30712345678',
          amount: 1000,
          net_amount: 800,
          due_date: '2026-06-28',
        },
        {
          id: 'invoice-settled',
          status: 'settled',
          invoice_number: 'FAC-002',
          pagador_name: 'Pagador Dos',
          pagador_cuit: '30712345679',
          amount: 2000,
          net_amount: 1700,
          due_date: '2026-07-01',
        },
        {
          id: 'invoice-funding',
          status: 'funding',
          invoice_number: 'FAC-003',
          pagador_name: 'Pagador Tres',
          pagador_cuit: '30712345670',
          amount: 900,
          net_amount: 0,
          due_date: '2026-07-03',
        },
      ],
      listCedenteTransactions: async () => [
        {
          id: 'tx-purchase',
          type: 'fraction_purchase',
          invoice_id: 'invoice-funded',
          amount: 800,
          created_at: '2026-03-28T10:00:00.000Z',
          description: 'Compra de fracción',
          to_user_id: 'cedente-1',
        },
        {
          id: 'tx-disbursement',
          type: 'disbursement_to_cedente',
          invoice_id: 'invoice-settled',
          amount: 1700,
          created_at: '2026-03-28T12:00:00.000Z',
          description: 'Desembolso al cedente',
          to_user_id: 'cedente-1',
        },
        {
          id: 'tx-interest',
          type: 'interest_distribution',
          invoice_id: 'invoice-settled',
          amount: 300,
          created_at: '2026-03-28T13:00:00.000Z',
          description: 'Interés al inversor',
          to_user_id: 'investor-1',
        },
      ],
    });

    expect(dashboard.statusCounts).toEqual({ funded: 1, settled: 1, funding: 1 });
    expect(dashboard.totalCapitalRaised).toBe(2500);
    expect(dashboard.spreadTotal).toBe(500);
    expect(dashboard.effectiveFinancingCost).toBeCloseTo(500 / 3000, 5);
    expect(dashboard.recentTransactions).toEqual([
      {
        id: 'tx-disbursement',
        type: 'disbursement_to_cedente',
        amount: 1700,
        at: '2026-03-28T12:00:00.000Z',
        description: 'Desembolso al cedente',
      },
      {
        id: 'tx-purchase',
        type: 'fraction_purchase',
        amount: 800,
        at: '2026-03-28T10:00:00.000Z',
        description: 'Compra de fracción',
      },
    ]);
  });

  it('returns investor holdings, weighted yield, diversification, and transaction history through settled status', async () => {
    const dashboard = await getInvestorDashboard({
      getAuthState: async () => ({ user: investorUser, profile: { role: 'inversor' as const } }),
      listInvestorHoldings: async () => [
        {
          invoice_id: 'invoice-funding',
          invoice_number: 'INV-001',
          pagador_name: 'Pagador Uno',
          pagador_cuit: '30712345678',
          status: 'funding',
          invoice_amount: 1000,
          invoice_net_amount: 800,
          owned_fractions: 1,
          invested_principal: 400,
          realized_return: 0,
        },
        {
          invoice_id: 'invoice-settled',
          invoice_number: 'INV-002',
          pagador_name: 'Pagador Dos',
          pagador_cuit: '30712345679',
          status: 'settled',
          invoice_amount: 2000,
          invoice_net_amount: 1600,
          owned_fractions: 2,
          invested_principal: 800,
          realized_return: 200,
        },
      ],
      listInvestorTransactions: async () => [
        {
          id: 'tx-interest',
          type: 'interest_distribution',
          invoice_id: 'invoice-settled',
          amount: 200,
          created_at: '2026-03-28T12:00:00.000Z',
          description: 'Interés recibido',
        },
        {
          id: 'tx-purchase',
          type: 'fraction_purchase',
          invoice_id: 'invoice-funding',
          amount: 400,
          created_at: '2026-03-28T10:00:00.000Z',
          description: 'Compra de fracción',
        },
      ],
    });

    expect(dashboard.holdings).toEqual([
      {
        invoiceId: 'invoice-funding',
        invoiceNumber: 'INV-001',
        payerName: 'Pagador Uno',
        payerCuit: '30712345678',
        ownedFractions: 1,
        investedPrincipal: 400,
        expectedReturn: 500,
        realizedReturn: 0,
        status: 'funding',
      },
      {
        invoiceId: 'invoice-settled',
        invoiceNumber: 'INV-002',
        payerName: 'Pagador Dos',
        payerCuit: '30712345679',
        ownedFractions: 2,
        investedPrincipal: 800,
        expectedReturn: 1000,
        realizedReturn: 200,
        status: 'settled',
      },
    ]);
    expect(dashboard.weightedAverageYield).toBeCloseTo((100 + 200) / 1200, 5);
    expect(dashboard.expectedOpenReturn).toBe(500);
    expect(dashboard.realizedReturnTotal).toBe(200);
    expect(dashboard.topPayerConcentration).toBeCloseTo(800 / 1200, 5);
    expect(dashboard.holdingsByStatus).toEqual({ funding: 1, funded: 0, settling: 0, settled: 1 });
    expect(dashboard.diversificationCount).toBe(2);
    expect(dashboard.payerBreakdown).toEqual([
      { payerCuit: '30712345679', payerName: 'Pagador Dos', investedPrincipal: 800, share: 800 / 1200 },
      { payerCuit: '30712345678', payerName: 'Pagador Uno', investedPrincipal: 400, share: 400 / 1200 },
    ]);
    expect(dashboard.recentTransactions).toEqual([
      {
        id: 'tx-interest',
        type: 'interest_distribution',
        amount: 200,
        at: '2026-03-28T12:00:00.000Z',
        description: 'Interés recibido',
      },
      {
        id: 'tx-purchase',
        type: 'fraction_purchase',
        amount: 400,
        at: '2026-03-28T10:00:00.000Z',
        description: 'Compra de fracción',
      },
    ]);
  });

  it('returns detail read models for accessible invoices and keeps investor holdings visible after settlement', async () => {
    const invoice = {
      id: 'invoice-settled',
      status: 'settled',
      invoice_number: 'INV-900',
      pagador_name: 'Pagador Persistente',
      pagador_cuit: '30712345680',
      amount: 1500,
      net_amount: 1200,
      due_date: '2026-06-28',
      total_fractions: 3,
      funded_fractions: 3,
    };

    const timeline = [
      { id: 'evt-1', at: '2026-03-28T08:00:00.000Z', kind: 'status' as const, label: 'Factura pasó a funded' },
      { id: 'txn-1', at: '2026-03-28T09:00:00.000Z', kind: 'financial' as const, label: 'Pago de capital', amount: 400 },
    ];

    const transactionHistory = [
      {
        id: 'txn-2',
        type: 'interest_distribution',
        amount: 100,
        at: '2026-03-28T09:01:00.000Z',
        direction: 'in' as const,
        description: 'Interés realizado',
      },
      {
        id: 'txn-1',
        type: 'settlement_payment',
        amount: 400,
        at: '2026-03-28T09:00:00.000Z',
        direction: 'in' as const,
        description: 'Pago de capital',
      },
    ];

    const cedenteView = await getCedenteInvoiceSettlementView('invoice-settled', {
      getAuthState: async () => ({ user: cedenteUser, profile: { role: 'cedente' as const } }),
      getCedenteInvoice: async () => invoice,
      listInvoiceTransactions: async () => [
        {
          id: 'txn-1',
          type: 'settlement_payment',
          amount: 400,
          created_at: '2026-03-28T09:00:00.000Z',
          description: 'Pago de capital',
          to_user_id: 'investor-1',
        },
        {
          id: 'txn-2',
          type: 'disbursement_to_cedente',
          amount: 1200,
          created_at: '2026-03-28T08:30:00.000Z',
          description: 'Desembolso al cedente',
          to_user_id: 'cedente-1',
        },
      ],
      listInvoiceEvents: async () => ({ invoiceEvents: [], fractionEvents: [] }),
      buildTimeline: () => timeline,
    });

    expect(cedenteView).toMatchObject({
      invoice: {
        id: 'invoice-settled',
        status: 'settled',
        invoiceNumber: 'INV-900',
        pagadorName: 'Pagador Persistente',
        amount: 1500,
        netAmount: 1200,
        dueDate: '2026-06-28',
      },
      timeline,
      transactionHistory: [
        {
          id: 'txn-2',
          type: 'disbursement_to_cedente',
          amount: 1200,
          at: '2026-03-28T08:30:00.000Z',
          direction: 'in',
          description: 'Desembolso al cedente',
        },
      ],
      settlement: {
        principalTotal: 400,
        interestTotal: 0,
        cedenteDisbursementTotal: 1200,
        canSettle: false,
      },
    });

    const investorView = await getInvestorInvoiceSettlementView('invoice-settled', {
      getAuthState: async () => ({ user: investorUser, profile: { role: 'inversor' as const } }),
      getInvestorInvoiceHolding: async () => ({
        ...invoice,
        owned_fractions: 1,
        invested_principal: 400,
        realized_return: 100,
      }),
      listInvoiceTransactions: async () => [
        {
          id: 'txn-1',
          type: 'settlement_payment',
          amount: 400,
          created_at: '2026-03-28T09:00:00.000Z',
          description: 'Pago de capital',
          to_user_id: 'investor-1',
        },
        {
          id: 'txn-2',
          type: 'interest_distribution',
          amount: 100,
          created_at: '2026-03-28T09:01:00.000Z',
          description: 'Interés realizado',
          to_user_id: 'investor-1',
        },
      ],
      listInvoiceEvents: async () => ({ invoiceEvents: [], fractionEvents: [] }),
      buildTimeline: () => timeline,
    });

    expect(investorView).toMatchObject({
      invoice: {
        id: 'invoice-settled',
        status: 'settled',
      },
      timeline,
      transactionHistory,
      holding: {
        ownedFractions: 1,
        investedPrincipal: 400,
        expectedReturn: 500,
        realizedReturn: 100,
      },
    });

    await expect(
      getInvestorInvoiceSettlementView('invoice-settled', {
        getAuthState: async () => ({ user: investorUser, profile: { role: 'inversor' as const } }),
        getInvestorInvoiceHolding: async () => null,
      }),
    ).resolves.toBeNull();
  });
});
