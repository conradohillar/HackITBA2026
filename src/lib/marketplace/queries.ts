import { getCurrentAuthState } from '@/lib/auth/session';
import { buildInvoiceFundingSnapshot, toMarketplaceInvoiceCard, type FractionRow, type MarketplaceInvoiceRow } from '@/lib/marketplace/read-model';
import type { MarketplaceInvoiceCard } from '@/lib/marketplace/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type QueryDependencies = {
  getAuthState: typeof getCurrentAuthState;
  listFundingInvoices: () => Promise<MarketplaceInvoiceRow[]>;
  getFundingInvoiceById: (invoiceId: string) => Promise<MarketplaceInvoiceRow | null>;
  listAvailableFractionsByInvoiceId: (invoiceId: string) => Promise<FractionRow[]>;
};

function createDefaultDependencies(): QueryDependencies {
  return {
    getAuthState: getCurrentAuthState,
    listFundingInvoices: async () => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('invoices')
        .select(
          'id, status, invoice_number, pagador_name, pagador_cuit, amount, net_amount, risk_tier, discount_rate, total_fractions, funded_fractions, due_date',
        )
        .in('status', ['funding', 'funded'])
        .order('due_date', { ascending: true });

      return (data as MarketplaceInvoiceRow[] | null) ?? [];
    },
    getFundingInvoiceById: async (invoiceId) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('invoices')
        .select(
          'id, status, invoice_number, pagador_name, pagador_cuit, amount, net_amount, risk_tier, discount_rate, total_fractions, funded_fractions, due_date',
        )
        .eq('id', invoiceId)
        .in('status', ['funding', 'funded'])
        .maybeSingle();

      return (data as MarketplaceInvoiceRow | null) ?? null;
    },
    listAvailableFractionsByInvoiceId: async (invoiceId) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('fractions')
        .select('id, net_amount')
        .eq('invoice_id', invoiceId)
        .eq('status', 'available')
        .order('fraction_index', { ascending: true });

      return (data as FractionRow[] | null) ?? [];
    },
  };
}

function resolveDependencies(overrides?: Partial<QueryDependencies>): QueryDependencies {
  return { ...createDefaultDependencies(), ...overrides } satisfies QueryDependencies;
}

export async function getMarketplaceInvoices(overrides?: Partial<QueryDependencies>) {
  const dependencies = resolveDependencies(overrides);
  const { user, profile } = await dependencies.getAuthState();

  if (!user || profile?.role !== 'inversor') {
    return [];
  }

  const invoices = await dependencies.listFundingInvoices();

  return invoices
    .map(toMarketplaceInvoiceCard)
    .filter((invoice): invoice is MarketplaceInvoiceCard => invoice !== null);
}

export async function getInvoiceFundingSnapshot(invoiceId: string, overrides?: Partial<QueryDependencies>) {
  const dependencies = resolveDependencies(overrides);
  const { user, profile } = await dependencies.getAuthState();

  if (!user || profile?.role !== 'inversor') {
    return null;
  }

  const invoice = await dependencies.getFundingInvoiceById(invoiceId);

  if (!invoice) {
    return null;
  }

  const availableFractions = await dependencies.listAvailableFractionsByInvoiceId(invoiceId);
  return buildInvoiceFundingSnapshot(invoice, availableFractions);
}
