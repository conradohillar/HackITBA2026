import { describe, expect, it, vi } from 'vitest';
import { submitInvoiceForOrigination } from '@/lib/invoices/actions';
import { invoiceOriginationSchema, serializeInvoiceOriginationInput } from '@/lib/invoices/schemas';

describe('invoice origination schema', () => {
  it('validates and serializes the phase 2 invoice payload contract', () => {
    const parsed = invoiceOriginationSchema.parse({
      pagadorCuit: '30-71234567-8',
      pagadorName: 'Techint SA',
      invoiceNumber: 'FAC-0001',
      faceValue: 1500000,
      issueDate: '2026-03-28',
      dueDate: '2026-06-28',
      description: '  Factura por servicios industriales  ',
      fractionCount: 8,
    });

    expect(serializeInvoiceOriginationInput(parsed)).toEqual({
      pagador_cuit: '30712345678',
      pagador_name: 'Techint SA',
      invoice_number: 'FAC-0001',
      amount: '1500000.00',
      issue_date: '2026-03-28',
      due_date: '2026-06-28',
      description: 'Factura por servicios industriales',
      total_fractions: 8,
    });
  });

  it('rejects empty descriptions before any database write', () => {
    const parsed = invoiceOriginationSchema.safeParse({
      pagadorCuit: '30712345678',
      pagadorName: 'Techint SA',
      invoiceNumber: 'FAC-0002',
      faceValue: 500000,
      issueDate: '2026-03-28',
      dueDate: '2026-04-28',
      description: '   ',
      fractionCount: 5,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.description?.[0]).toMatch(/descripción/i);
  });

  it('rejects malformed CUIT values before any database write', () => {
    const parsed = invoiceOriginationSchema.safeParse({
      pagadorCuit: '20-0000000-0',
      pagadorName: 'Pagador inválido',
      invoiceNumber: 'FAC-0003',
      faceValue: 250000,
      issueDate: '2026-03-28',
      dueDate: '2026-04-28',
      description: 'Factura con CUIT inválido',
      fractionCount: 4,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.pagadorCuit?.[0]).toMatch(/CUIT/i);
  });

  it('creates a draft invoice, validates risk, and persists the stored risk snapshot', async () => {
    const createInvoice = vi.fn().mockResolvedValue({ id: 'invoice-1', status: 'draft' });
    const transitionInvoice = vi.fn().mockResolvedValue(undefined);
    const persistRiskResult = vi.fn().mockResolvedValue(undefined);

    const result = await submitInvoiceForOrigination(
      {
        pagadorCuit: '30712345678',
        pagadorName: 'Techint SA',
        invoiceNumber: 'FAC-100',
        faceValue: 1500000,
        issueDate: '2026-03-28',
        dueDate: '2026-06-28',
        description: 'Factura por servicios industriales.',
        fractionCount: 8,
      },
      {
        getActor: vi.fn().mockResolvedValue({ userId: 'cedente-1', role: 'cedente' }),
        createInvoice,
        transitionInvoice,
        getBcraSnapshot: vi.fn().mockResolvedValue({
          source: 'cache',
          snapshot: {
            cuit: '30712345678',
            empresa: 'Techint SA',
            situacion: 1,
            montoTotal: 125000000,
            diasAtraso: 0,
            historicalSituations: [{ period: '2026-02', situacion: 1 }],
            rejectedChecks: { count: 0, amount: 0 },
            evidence: ['Situación BCRA actual: 1.'],
          },
          raw: { deudores: {}, historicas: {}, cheques: {} },
        }),
        scoreRisk: vi.fn().mockReturnValue({
          tier: 'A',
          discountRate: 0.145,
          signals: ['Perfil sin señales adversas relevantes'],
          fallbackUsed: false,
          daysToMaturity: 92,
        }),
        buildRiskNarrative: vi.fn().mockResolvedValue({
          explanation: 'Pagador sólido con historial estable.',
          evidence: ['Situación BCRA actual: 1.'],
          fallbackUsed: false,
        }),
        persistRiskResult,
      },
    );

    expect(createInvoice).toHaveBeenCalledOnce();
    expect(transitionInvoice).toHaveBeenNthCalledWith(1, 'invoice-1', 'validating', 'cedente-1');
    expect(persistRiskResult).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'invoice-1',
        riskTier: 'A',
        discountRate: 0.145,
      }),
    );
    expect(transitionInvoice).toHaveBeenNthCalledWith(2, 'invoice-1', 'validated', 'cedente-1');
    expect(result).toEqual({
      status: 'success',
      redirectTo: '/cedente/invoices/invoice-1',
      invoiceId: 'invoice-1',
    });
  });

  it('falls back cleanly when the live BCRA path is unavailable', async () => {
    const result = await submitInvoiceForOrigination(
      {
        pagadorCuit: '30798765432',
        pagadorName: 'YPF SA',
        invoiceNumber: 'FAC-101',
        faceValue: 900000,
        issueDate: '2026-03-28',
        dueDate: '2026-05-12',
        description: 'Factura con fallback de BCRA.',
        fractionCount: 6,
      },
      {
        getActor: vi.fn().mockResolvedValue({ userId: 'cedente-1', role: 'cedente' }),
        createInvoice: vi.fn().mockResolvedValue({ id: 'invoice-2', status: 'draft' }),
        transitionInvoice: vi.fn().mockResolvedValue(undefined),
        getBcraSnapshot: vi.fn().mockResolvedValue({
          source: 'fallback',
          snapshot: {
            cuit: '30798765432',
            empresa: 'Sin datos BCRA',
            situacion: 0,
            montoTotal: 0,
            diasAtraso: 0,
            historicalSituations: [],
            rejectedChecks: { count: 0, amount: 0 },
            evidence: ['Sin deuda informada en BCRA.'],
          },
          raw: { deudores: null, historicas: null, cheques: null },
        }),
        scoreRisk: vi.fn().mockReturnValue({
          tier: 'C',
          discountRate: 0.28,
          signals: ['Fallback determinístico por ausencia de datos BCRA en vivo'],
          fallbackUsed: true,
          daysToMaturity: 45,
        }),
        buildRiskNarrative: vi.fn().mockResolvedValue({
          explanation: 'Se aplicó fallback determinístico sin interrumpir al usuario.',
          evidence: ['Sin deuda informada en BCRA.'],
          fallbackUsed: true,
        }),
        persistRiskResult: vi.fn().mockResolvedValue(undefined),
      },
    );

    expect(result.status).toBe('success');
    expect(result.redirectTo).toBe('/cedente/invoices/invoice-2');
  });

  it('rejects unauthenticated or wrong-role execution before any invoice write occurs', async () => {
    const createInvoice = vi.fn();

    const result = await submitInvoiceForOrigination(
      {
        pagadorCuit: '30712345678',
        pagadorName: 'Techint SA',
        invoiceNumber: 'FAC-102',
        faceValue: 1500000,
        issueDate: '2026-03-28',
        dueDate: '2026-06-28',
        description: 'Factura protegida por RBAC.',
        fractionCount: 8,
      },
      {
        getActor: vi.fn().mockResolvedValue({ userId: 'investor-1', role: 'inversor' }),
        createInvoice,
        transitionInvoice: vi.fn(),
        getBcraSnapshot: vi.fn(),
        scoreRisk: vi.fn(),
        buildRiskNarrative: vi.fn(),
        persistRiskResult: vi.fn(),
      },
    );

    expect(createInvoice).not.toHaveBeenCalled();
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/cedente autenticado/i);
  });
});
