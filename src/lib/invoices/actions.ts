'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildRiskNarrative } from '@/lib/risk/llm';
import { getBcraSnapshot } from '@/lib/risk/bcra';
import { scoreRiskDeterministically } from '@/lib/risk/deterministic';
import {
  invoiceOriginationSchema,
  serializeInvoiceOriginationInput,
  type InvoiceOriginationFormInput,
  type InvoiceOriginationInput,
} from '@/lib/invoices/schemas';

export type InvoiceActionResult = {
  status: 'success' | 'error';
  message?: string;
  redirectTo?: string;
  invoiceId?: string;
  fieldErrors?: Partial<Record<keyof InvoiceOriginationFormInput, string>>;
};

type InvoiceRecord = {
  id: string;
  status: string;
};

type InvoiceActionServices = {
  getActor: () => Promise<{ userId: string; role: 'cedente' | 'inversor' } | null>;
  createInvoice: (payload: ReturnType<typeof serializeInvoiceOriginationInput> & { cedente_id: string }) => Promise<InvoiceRecord>;
  transitionInvoice: (invoiceId: string, status: 'validating' | 'validated', actorId: string) => Promise<void>;
  getBcraSnapshot: typeof getBcraSnapshot;
  scoreRisk: typeof scoreRiskDeterministically;
  buildRiskNarrative: typeof buildRiskNarrative;
  persistRiskResult: (payload: {
    invoiceId: string;
    riskTier: string;
    discountRate: number;
    explanation: string;
    bcraData: unknown;
  }) => Promise<void>;
};

function toFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? 'Campo inválido']),
  );
}

async function buildServerServices(): Promise<InvoiceActionServices> {
  const supabase = await createSupabaseServerClient();

  return {
    async getActor() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single<{ role: 'cedente' | 'inversor' }>();

      return profile ? { userId: user.id, role: profile.role } : null;
    },
    async createInvoice(payload) {
      const { data, error } = await supabase.from('invoices').insert(payload).select('id, status').single<InvoiceRecord>();
      if (error || !data) throw new Error(error?.message ?? 'No pudimos crear la factura.');
      return data;
    },
    async transitionInvoice(invoiceId, status, actorId) {
      const { error } = await supabase.rpc('transition_invoice', {
        p_invoice_id: invoiceId,
        p_new_status: status,
        p_actor_id: actorId,
      });
      if (error) throw new Error(error.message);
    },
    getBcraSnapshot,
    scoreRisk: scoreRiskDeterministically,
    buildRiskNarrative,
    async persistRiskResult(payload) {
      const { error } = await supabase
        .from('invoices')
        .update({
          bcra_data: payload.bcraData,
          risk_tier: payload.riskTier,
          discount_rate: payload.discountRate,
          risk_explanation: payload.explanation,
        })
        .eq('id', payload.invoiceId);

      if (error) throw new Error(error.message);
    },
  };
}

export async function submitInvoiceForOrigination(
  payload: InvoiceOriginationFormInput,
  services: InvoiceActionServices,
): Promise<InvoiceActionResult> {
  const parsed = invoiceOriginationSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos de la factura e intentá de nuevo.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const actor = await services.getActor();

  if (!actor || actor.role !== 'cedente') {
    return {
      status: 'error',
      message: 'Solo un cedente autenticado puede originar facturas.',
    };
  }

  const serialized = serializeInvoiceOriginationInput(parsed.data);
  const invoice = await services.createInvoice({
    ...serialized,
    cedente_id: actor.userId,
  });

  await services.transitionInvoice(invoice.id, 'validating', actor.userId);

  const bcraResult = await services.getBcraSnapshot(parsed.data.pagadorCuit);
  const deterministic = services.scoreRisk({
    snapshot: bcraResult.snapshot,
    source: bcraResult.source,
    asOfDate: parsed.data.issueDate,
    dueDate: parsed.data.dueDate,
  });
  const narrative = await services.buildRiskNarrative({
    payerName: parsed.data.pagadorName,
    tier: deterministic.tier,
    discountRate: deterministic.discountRate,
    evidence: bcraResult.snapshot.evidence,
  });

  await services.persistRiskResult({
    invoiceId: invoice.id,
    riskTier: deterministic.tier,
    discountRate: deterministic.discountRate,
    explanation: narrative.explanation,
    bcraData: {
      source: bcraResult.source,
      snapshot: bcraResult.snapshot,
      raw: bcraResult.raw,
      deterministic,
      narrative,
    },
  });

  await services.transitionInvoice(invoice.id, 'validated', actor.userId);

  return {
    status: 'success',
    redirectTo: `/cedente/invoices/${invoice.id}`,
    invoiceId: invoice.id,
  };
}

export async function submitInvoiceAction(payload: InvoiceOriginationFormInput): Promise<InvoiceActionResult> {
  return submitInvoiceForOrigination(payload, await buildServerServices());
}
