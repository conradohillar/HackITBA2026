import { describe, expect, it } from 'vitest';
import { getInvoiceDetail } from '@/lib/invoices/queries';

describe('invoice detail risk view', () => {
  it('reshapes persisted BCRA data into a stable risk summary', async () => {
    const detail = await getInvoiceDetail('invoice-1', {
      getAuthState: async () => ({ user: { id: 'cedente-1' }, profile: { role: 'cedente' as const } }),
      getInvoice: async () => ({
        id: 'invoice-1',
        status: 'funding',
        pagador_cuit: '30712345678',
        pagador_name: 'Acme Pagador',
        invoice_number: 'FAC-100',
        amount: 100000,
        issue_date: '2026-03-28',
        due_date: '2026-06-28',
        description: 'Factura de prueba',
        risk_tier: 'A',
        discount_rate: 0.145,
        risk_explanation: 'Perfil saludable según señales persistidas.',
        bcra_data: {
          snapshot: {
            situacion: 1,
            diasAtraso: 4,
            rejectedChecks: { count: 2, amount: 12345.67 },
            historicalSituations: [
              { period: '2026-01', situacion: 1 },
              { period: '2026-02', situacion: 2 },
            ],
            evidence: ['Situacion estable', 'Cheques controlados'],
          },
          deterministic: {
            signals: ['Situacion BCRA 1', 'Atraso reportado: 4 dias'],
          },
          narrative: {
            fallbackUsed: false,
          },
        },
        token_hash: 'abc123',
        net_amount: 87500,
        total_fractions: 8,
      }),
    });

    expect(detail?.riskSummary?.currentSituation).toBe(1);
    expect(detail?.riskSummary?.daysOverdue).toBe(4);
    expect(detail?.riskSummary?.rejectedChecksCount).toBe(2);
    expect(detail?.riskSummary?.rejectedChecksAmount).toBe(12345.67);
    expect(detail?.riskSummary?.historicalTrend).toEqual([
      { period: '2026-01', situacion: 1 },
      { period: '2026-02', situacion: 2 },
    ]);
    expect(detail?.riskSummary?.narrativeSource).toBe('llm');
  });

  it('marks fallback narratives explicitly without changing deterministic facts', async () => {
    const detail = await getInvoiceDetail('invoice-2', {
      getAuthState: async () => ({ user: { id: 'cedente-1' }, profile: { role: 'cedente' as const } }),
      getInvoice: async () => ({
        id: 'invoice-2',
        status: 'settling',
        pagador_cuit: '30712345679',
        pagador_name: 'Pagador Dos',
        invoice_number: 'FAC-200',
        amount: 80000,
        issue_date: '2026-03-28',
        due_date: '2026-06-28',
        description: 'Factura fallback',
        risk_tier: 'C',
        discount_rate: 0.21,
        risk_explanation: 'Narrativa deterministica.',
        bcra_data: {
          snapshot: {
            situacion: 3,
            diasAtraso: 31,
            rejectedChecks: { count: 1, amount: 5000 },
            historicalSituations: [{ period: '2026-03', situacion: 3 }],
            evidence: ['Fallback usado'],
          },
          deterministic: {
            signals: ['Fallback deterministico'],
          },
          narrative: {
            fallbackUsed: true,
          },
        },
        token_hash: 'def456',
        net_amount: 70000,
        total_fractions: 10,
      }),
    });

    expect(detail?.riskSummary?.narrativeSource).toBe('deterministic-fallback');
    expect(detail?.risk_tier).toBe('C');
    expect(detail?.discount_rate).toBe(0.21);
    expect(detail?.riskSummary?.deterministicSignals).toEqual(['Fallback deterministico']);
  });

  it('exposes automatic tokenization status from persisted invoice artifacts', async () => {
    const detail = await getInvoiceDetail('invoice-3', {
      getAuthState: async () => ({ user: { id: 'cedente-1' }, profile: { role: 'cedente' as const } }),
      getInvoice: async () => ({
        id: 'invoice-3',
        status: 'funded',
        pagador_cuit: '30712345670',
        pagador_name: 'Pagador Tres',
        invoice_number: 'FAC-300',
        amount: 60000,
        issue_date: '2026-03-28',
        due_date: '2026-06-28',
        description: 'Factura tokenizada',
        risk_tier: 'B',
        discount_rate: 0.18,
        risk_explanation: 'Narrativa valida',
        bcra_data: {
          snapshot: {
            evidence: [],
          },
        },
        token_hash: 'ghi789',
        net_amount: 54000,
        total_fractions: 6,
      }),
    });

    expect(detail?.tokenizationStatus).toEqual({
      autoPublishedToFunding: true,
      tokenHash: 'ghi789',
      netAmount: 54000,
      totalFractions: 6,
    });
  });
});
