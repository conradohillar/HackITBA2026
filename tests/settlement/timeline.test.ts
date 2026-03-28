import { describe, expect, it } from 'vitest';
import { buildTimeline } from '@/lib/settlement/timeline';

describe('settlement timeline normalization', () => {
  it('merges invoice events, fraction purchases, and financial transactions into one ascending chronology', () => {
    const timeline = buildTimeline({
      invoiceEvents: [
        {
          id: 'evt-settled',
          created_at: '2026-03-28T15:00:00.000Z',
          event_type: 'invoice.transitioned',
          old_data: { status: 'settling' },
          new_data: { status: 'settled' },
          metadata: {},
        },
        {
          id: 'evt-validated',
          created_at: '2026-03-28T10:00:00.000Z',
          event_type: 'invoice.transitioned',
          old_data: { status: 'draft' },
          new_data: { status: 'validated' },
          metadata: {},
        },
      ],
      fractionEvents: [
        {
          id: 'evt-purchase',
          created_at: '2026-03-28T11:00:00.000Z',
          event_type: 'fraction.purchased',
          old_data: { status: 'available' },
          new_data: { status: 'sold', investor_id: 'investor-1' },
          metadata: { invoice_id: 'invoice-1', fraction_index: 1 },
        },
      ],
      transactions: [
        {
          id: 'txn-interest',
          created_at: '2026-03-28T14:00:00.000Z',
          type: 'interest_distribution',
          amount: 50,
          description: 'Interest distribution for fraction 1',
          metadata: { fraction_index: 1 },
        },
        {
          id: 'txn-disbursement',
          created_at: '2026-03-28T12:00:00.000Z',
          type: 'disbursement_to_cedente',
          amount: 800,
          description: 'Disbursement for invoice INV-001',
          metadata: { simulated: false },
        },
        {
          id: 'txn-principal',
          created_at: '2026-03-28T13:00:00.000Z',
          type: 'settlement_payment',
          amount: 400,
          description: 'Principal repayment for fraction 1',
          metadata: { fraction_index: 1 },
        },
      ],
    });

    expect(timeline).toEqual([
      {
        id: 'evt-validated',
        at: '2026-03-28T10:00:00.000Z',
        kind: 'status',
        label: 'Factura pasó a validated',
        metadata: { status: 'validated' },
      },
      {
        id: 'evt-purchase',
        at: '2026-03-28T11:00:00.000Z',
        kind: 'status',
        label: 'Fracción 1 comprada',
        metadata: { fractionIndex: 1, investorId: 'investor-1' },
      },
      {
        id: 'txn-disbursement',
        at: '2026-03-28T12:00:00.000Z',
        kind: 'financial',
        label: 'Desembolso al cedente',
        amount: 800,
        metadata: { simulated: false, type: 'disbursement_to_cedente' },
      },
      {
        id: 'txn-principal',
        at: '2026-03-28T13:00:00.000Z',
        kind: 'financial',
        label: 'Pago de capital',
        amount: 400,
        metadata: { fractionIndex: 1, type: 'settlement_payment' },
      },
      {
        id: 'txn-interest',
        at: '2026-03-28T14:00:00.000Z',
        kind: 'financial',
        label: 'Distribución de interés',
        amount: 50,
        metadata: { fractionIndex: 1, type: 'interest_distribution' },
      },
      {
        id: 'evt-settled',
        at: '2026-03-28T15:00:00.000Z',
        kind: 'status',
        label: 'Factura pasó a settled',
        metadata: { status: 'settled' },
      },
    ]);
  });
});
