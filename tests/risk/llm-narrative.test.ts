import { describe, expect, it, vi } from 'vitest';
import { buildRiskNarrative } from '@/lib/risk/llm';

describe('risk narrative generation', () => {
  const input = {
    payerName: 'YPF SA',
    tier: 'B' as const,
    discountRate: 0.205,
    evidence: ['Situación BCRA actual: 2.', 'Cheques rechazados: 1 por ARS 185000.00.'],
  };

  it('accepts deterministic inputs only and returns a schema-validated narrative', async () => {
    const generateObjectImpl = vi.fn().mockResolvedValue({
      object: {
        explanation: 'YPF SA presenta riesgo moderado por situación 2 y un cheque rechazado reciente.',
        evidence: ['Situación BCRA actual: 2.', 'Cheques rechazados: 1 por ARS 185000.00.'],
      },
    });

    const result = await buildRiskNarrative(input, { generateObjectImpl, model: 'fake-model' });

    expect(generateObjectImpl).toHaveBeenCalledOnce();
    expect(result).toEqual({
      explanation: 'YPF SA presenta riesgo moderado por situación 2 y un cheque rechazado reciente.',
      evidence: ['Situación BCRA actual: 2.', 'Cheques rechazados: 1 por ARS 185000.00.'],
      fallbackUsed: false,
    });
  });

  it('falls back to a deterministic explanation when model output is invalid or timed out', async () => {
    const generateObjectImpl = vi.fn().mockRejectedValue(new Error('timeout'));

    const result = await buildRiskNarrative(input, { generateObjectImpl, model: 'fake-model' });

    expect(result.fallbackUsed).toBe(true);
    expect(result.explanation).toMatch(/Tier B/);
    expect(result.evidence).toEqual(input.evidence);
  });

  it('filters invented evidence and keeps only supplied facts', async () => {
    const generateObjectImpl = vi.fn().mockResolvedValue({
      object: {
        explanation: 'Narrativa válida con un hecho inventado.',
        evidence: ['Situación BCRA actual: 2.', 'Dato inventado'],
      },
    });

    const result = await buildRiskNarrative(input, { generateObjectImpl, model: 'fake-model' });

    expect(result.evidence).toEqual(['Situación BCRA actual: 2.']);
    expect(result.fallbackUsed).toBe(false);
  });
});
