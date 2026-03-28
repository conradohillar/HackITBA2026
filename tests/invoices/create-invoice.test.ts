import { describe, expect, it } from 'vitest';
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
});
