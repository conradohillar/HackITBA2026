import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentAuthState } from '@/lib/auth/session';

type InvoiceRiskSummary = {
  currentSituation: number;
  daysOverdue: number;
  rejectedChecksCount: number;
  rejectedChecksAmount: number;
  historicalTrend: Array<{ period: string; situacion: number }>;
  deterministicSignals: string[];
  narrativeSource: 'llm' | 'deterministic-fallback';
  evidence: string[];
};

type InvoiceTokenizationStatus = {
  autoPublishedToFunding: boolean;
  tokenHash: string | null;
  netAmount: number;
  totalFractions: number;
};

export type InvoiceDetailRecord = {
  id: string;
  status: string;
  pagador_cuit: string;
  pagador_name: string;
  invoice_number: string;
  amount: number;
  issue_date: string;
  due_date: string;
  description: string;
  risk_tier: string | null;
  discount_rate: number | null;
  risk_explanation: string | null;
  bcra_data: {
    snapshot?: {
      situacion?: number;
      diasAtraso?: number;
      rejectedChecks?: {
        count?: number;
        amount?: number;
      };
      historicalSituations?: Array<{ period?: string; situacion?: number }>;
      evidence?: string[];
    };
    deterministic?: {
      signals?: string[];
    };
    narrative?: {
      fallbackUsed?: boolean;
    };
  } | null;
  token_hash: string | null;
  net_amount: number | null;
  total_fractions: number | null;
};

export type InvoiceDetailView = InvoiceDetailRecord & {
  riskSummary: InvoiceRiskSummary | null;
  tokenizationStatus: InvoiceTokenizationStatus;
};

type InvoiceQueryDependencies = {
  getAuthState: typeof getCurrentAuthState;
  getInvoice: (invoiceId: string, userId: string) => Promise<InvoiceDetailRecord | null>;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

async function createDependencies(): Promise<InvoiceQueryDependencies> {
  const supabase = await createSupabaseServerClient();

  return {
    getAuthState: getCurrentAuthState,
    getInvoice: async (invoiceId, userId) => {
      const { data } = await supabase
        .from('invoices')
        .select(
          'id, status, pagador_cuit, pagador_name, invoice_number, amount, issue_date, due_date, description, risk_tier, discount_rate, risk_explanation, bcra_data, token_hash, net_amount, total_fractions',
        )
        .eq('id', invoiceId)
        .eq('cedente_id', userId)
        .single<InvoiceDetailRecord>();

      return data ?? null;
    },
  };
}

function buildRiskSummary(record: InvoiceDetailRecord): InvoiceRiskSummary | null {
  if (!record.risk_tier || record.discount_rate === null) {
    return null;
  }

  const snapshot = record.bcra_data?.snapshot;

  return {
    currentSituation: toNumber(snapshot?.situacion),
    daysOverdue: toNumber(snapshot?.diasAtraso),
    rejectedChecksCount: toNumber(snapshot?.rejectedChecks?.count),
    rejectedChecksAmount: toNumber(snapshot?.rejectedChecks?.amount),
    historicalTrend: (snapshot?.historicalSituations ?? []).map((item) => ({
      period: String(item.period ?? ''),
      situacion: toNumber(item.situacion),
    })),
    deterministicSignals: record.bcra_data?.deterministic?.signals ?? [],
    narrativeSource: record.bcra_data?.narrative?.fallbackUsed ? 'deterministic-fallback' : 'llm',
    evidence: snapshot?.evidence ?? [],
  };
}

function buildTokenizationStatus(record: InvoiceDetailRecord): InvoiceTokenizationStatus {
  return {
    autoPublishedToFunding:
      Boolean(record.token_hash) &&
      record.net_amount !== null &&
      Boolean(record.total_fractions) &&
      ['funding', 'funded', 'settling', 'settled'].includes(record.status),
    tokenHash: record.token_hash,
    netAmount: toNumber(record.net_amount),
    totalFractions: record.total_fractions ?? 0,
  };
}

export async function getInvoiceDetail(
  invoiceId: string,
  overrides?: Partial<InvoiceQueryDependencies>,
): Promise<InvoiceDetailView | null> {
  const dependencies = overrides?.getAuthState && overrides?.getInvoice
    ? {
        getAuthState: overrides.getAuthState,
        getInvoice: overrides.getInvoice,
      }
    : { ...(await createDependencies()), ...overrides };

  const { user } = await dependencies.getAuthState();
  if (!user) return null;

  const data = await dependencies.getInvoice(invoiceId, user.id);

  if (!data) {
    return null;
  }

  return {
    ...data,
    riskSummary: buildRiskSummary(data),
    tokenizationStatus: buildTokenizationStatus(data),
  };
}
