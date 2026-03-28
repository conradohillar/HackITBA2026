import { createClient } from '@supabase/supabase-js';
import { getCurrentAuthState, type AuthProfile } from '@/lib/auth/session';
import type { AuthRole } from '@/lib/auth/types';
import { buildTimeline, type TimelineItem } from '@/lib/settlement/timeline';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AuthState = {
  user: { id: string } | null;
  profile: Pick<AuthProfile, 'role'> | null;
};

type InvoiceQueryRow = {
  id: string;
  status: string;
  invoice_number: string;
  pagador_name: string;
  pagador_cuit: string;
  amount: number | string | null;
  net_amount: number | string | null;
  due_date: string;
  total_fractions?: number | null;
  funded_fractions?: number | null;
};

type TransactionQueryRow = {
  id: string;
  type: string;
  invoice_id: string;
  amount: number | string | null;
  created_at: string;
  description: string | null;
  from_user_id?: string | null;
  to_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type InvestorHoldingRow = InvoiceQueryRow & {
  invoice_id?: string;
  invoice_amount?: number | string | null;
  invoice_net_amount?: number | string | null;
  owned_fractions: number;
  invested_principal: number | string | null;
  realized_return: number | string | null;
};

type EventRow = {
  id: string | number;
  created_at: string;
  event_type: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type QueryDependencies = {
  getAuthState: () => Promise<AuthState>;
  listCedenteInvoices: (userId: string) => Promise<InvoiceQueryRow[]>;
  listCedenteTransactions: (userId: string) => Promise<TransactionQueryRow[]>;
  listInvestorHoldings: (userId: string) => Promise<InvestorHoldingRow[]>;
  listInvestorTransactions: (userId: string) => Promise<TransactionQueryRow[]>;
  getCedenteInvoice: (userId: string, invoiceId: string) => Promise<InvoiceQueryRow | null>;
  getInvestorInvoiceHolding: (userId: string, invoiceId: string) => Promise<InvestorHoldingRow | null>;
  listInvoiceTransactions: (invoiceId: string) => Promise<TransactionQueryRow[]>;
  listInvoiceEvents: (invoiceId: string) => Promise<{ invoiceEvents: EventRow[]; fractionEvents: EventRow[] }>;
  buildTimeline: typeof buildTimeline;
};

type DashboardTransaction = {
  id: string;
  type: string;
  amount: number;
  at: string;
  description: string;
};

type InvoiceTransaction = DashboardTransaction & {
  direction: 'in' | 'out';
};

type CedenteDashboard = {
  statusCounts: Record<string, number>;
  totalCapitalRaised: number;
  effectiveFinancingCost: number;
  spreadTotal: number;
  recentTransactions: DashboardTransaction[];
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    amount: number;
    netAmount: number;
    dueDate: string;
  }>;
};

type InvestorDashboard = {
  holdings: Array<{
    invoiceId: string;
    invoiceNumber: string;
    payerName: string;
    payerCuit: string;
    ownedFractions: number;
    investedPrincipal: number;
    expectedReturn: number;
    realizedReturn: number;
    status: string;
  }>;
  weightedAverageYield: number;
  expectedOpenReturn: number;
  realizedReturnTotal: number;
  topPayerConcentration: number;
  holdingsByStatus: Record<string, number>;
  diversificationCount: number;
  payerBreakdown: Array<{
    payerCuit: string;
    payerName: string;
    investedPrincipal: number;
    share: number;
  }>;
  recentTransactions: DashboardTransaction[];
};

type CedenteInvoiceSettlementView = {
  invoice: {
    id: string;
    status: string;
    invoiceNumber: string;
    pagadorName: string;
    amount: number;
    netAmount: number;
    dueDate: string;
  };
  timeline: TimelineItem[];
  transactionHistory: InvoiceTransaction[];
  settlement: {
    principalTotal: number;
    interestTotal: number;
    cedenteDisbursementTotal: number;
    canSettle: boolean;
  };
};

type InvestorInvoiceSettlementView = {
  invoice: CedenteInvoiceSettlementView['invoice'];
  timeline: TimelineItem[];
  transactionHistory: InvoiceTransaction[];
  holding: {
    ownedFractions: number;
    investedPrincipal: number;
    expectedReturn: number;
    realizedReturn: number;
  };
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

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function createPrivilegedReadClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service role environment for settlement read models.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function expectedReturnForHolding(
  holding: Pick<InvestorHoldingRow, 'amount' | 'net_amount' | 'invested_principal' | 'invoice_amount' | 'invoice_net_amount'>,
) {
  const invoiceAmount = toNumber(holding.invoice_amount ?? holding.amount);
  const invoiceNetAmount = toNumber(holding.invoice_net_amount ?? holding.net_amount);
  const investedPrincipal = toNumber(holding.invested_principal);

  if (invoiceAmount <= 0 || invoiceNetAmount <= 0 || investedPrincipal <= 0) {
    return 0;
  }

  return roundToCents((investedPrincipal / invoiceNetAmount) * invoiceAmount);
}

function mapDashboardTransaction(transaction: TransactionQueryRow): DashboardTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: toNumber(transaction.amount),
    at: transaction.created_at,
    description: transaction.description ?? transaction.type,
  };
}

function sortTransactionsDesc<T extends { at: string }>(transactions: T[]) {
  return [...transactions].sort((left, right) => right.at.localeCompare(left.at));
}

function isAccessibleRole(state: AuthState, role: AuthRole) {
  return Boolean(state.user && state.profile?.role === role);
}

function mapInvoiceSummary(invoice: InvoiceQueryRow) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    amount: toNumber(invoice.amount),
    netAmount: toNumber(invoice.net_amount),
    dueDate: invoice.due_date,
  };
}

function mapInvoiceDetail(invoice: InvoiceQueryRow) {
  return {
    id: invoice.id,
    status: invoice.status,
    invoiceNumber: invoice.invoice_number,
    pagadorName: invoice.pagador_name,
    amount: toNumber(invoice.amount),
    netAmount: toNumber(invoice.net_amount),
    dueDate: invoice.due_date,
  };
}

function mapRoleTransactionHistory(transactions: TransactionQueryRow[], userId: string): InvoiceTransaction[] {
  return sortTransactionsDesc(
    transactions.map((transaction) => ({
      ...mapDashboardTransaction(transaction),
      direction: transaction.to_user_id === userId ? ('in' as const) : ('out' as const),
    })),
  );
}

async function createDefaultDependencies(): Promise<QueryDependencies> {
  const supabase = await createSupabaseServerClient();
  const privileged = createPrivilegedReadClient();

  return {
    getAuthState: getCurrentAuthState,
    listCedenteInvoices: async (userId) => {
      const { data } = await supabase
        .from('invoices')
        .select('id, status, invoice_number, pagador_name, pagador_cuit, amount, net_amount, due_date, total_fractions, funded_fractions')
        .eq('cedente_id', userId)
        .order('due_date', { ascending: true });

      return (data as InvoiceQueryRow[] | null) ?? [];
    },
    listCedenteTransactions: async (userId) => {
      const { data } = await supabase
        .from('transactions')
        .select('id, type, invoice_id, amount, created_at, description, from_user_id, to_user_id, metadata')
        .eq('to_user_id', userId)
        .in('type', ['fraction_purchase', 'disbursement_to_cedente'])
        .order('created_at', { ascending: false })
        .limit(10);

      return (data as TransactionQueryRow[] | null) ?? [];
    },
    listInvestorHoldings: async (userId) => {
      const { data } = await supabase
        .from('fractions')
        .select(
          'invoice_id, net_amount, investor_id, status, invoices!inner(id, status, invoice_number, pagador_name, pagador_cuit, amount, net_amount, due_date, total_fractions, funded_fractions)',
        )
        .eq('investor_id', userId)
        .in('status', ['sold', 'settled'])
        .in('invoices.status', ['funding', 'funded', 'settling', 'settled'])
        .order('invoice_id', { ascending: true });

      const grouped = new Map<string, InvestorHoldingRow>();

      for (const row of ((data as Array<{
        invoice_id: string;
        net_amount: number | string;
        invoices: InvoiceQueryRow;
      }> | null) ?? [])) {
        const existing = grouped.get(row.invoice_id);
        const investedPrincipal = toNumber(row.net_amount);

        if (existing) {
          existing.owned_fractions += 1;
          existing.invested_principal = roundToCents(toNumber(existing.invested_principal) + investedPrincipal);
          continue;
        }

        grouped.set(row.invoice_id, {
          ...row.invoices,
          owned_fractions: 1,
          invested_principal: investedPrincipal,
          realized_return: 0,
        });
      }

      const invoiceIds = [...grouped.keys()];

      if (invoiceIds.length > 0) {
        const { data: realizedRows } = await supabase
          .from('transactions')
          .select('invoice_id, amount')
          .eq('to_user_id', userId)
          .eq('type', 'interest_distribution')
          .in('invoice_id', invoiceIds);

        for (const row of (realizedRows as Array<{ invoice_id: string; amount: number | string }> | null) ?? []) {
          const current = grouped.get(row.invoice_id);

          if (current) {
            current.realized_return = roundToCents(toNumber(current.realized_return) + toNumber(row.amount));
          }
        }
      }

      return [...grouped.values()];
    },
    listInvestorTransactions: async (userId) => {
      const { data } = await supabase
        .from('transactions')
        .select('id, type, invoice_id, amount, created_at, description, from_user_id, to_user_id, metadata')
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .in('type', ['fraction_purchase', 'settlement_payment', 'interest_distribution'])
        .order('created_at', { ascending: false })
        .limit(10);

      return (data as TransactionQueryRow[] | null) ?? [];
    },
    getCedenteInvoice: async (userId, invoiceId) => {
      const { data } = await supabase
        .from('invoices')
        .select('id, status, invoice_number, pagador_name, pagador_cuit, amount, net_amount, due_date, total_fractions, funded_fractions')
        .eq('id', invoiceId)
        .eq('cedente_id', userId)
        .maybeSingle();

      return (data as InvoiceQueryRow | null) ?? null;
    },
    getInvestorInvoiceHolding: async () => null,
    listInvoiceTransactions: async (invoiceId) => {
      const { data } = await privileged
        .from('transactions')
        .select('id, type, invoice_id, amount, created_at, description, from_user_id, to_user_id, metadata')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      return (data as TransactionQueryRow[] | null) ?? [];
    },
    listInvoiceEvents: async (invoiceId) => {
      const [{ data: invoiceEvents }, { data: fractionEvents }] = await Promise.all([
        privileged
          .from('events')
          .select('id, created_at, event_type, old_data, new_data, metadata')
          .eq('entity_type', 'invoice')
          .eq('entity_id', invoiceId)
          .order('created_at', { ascending: true }),
        privileged
          .from('events')
          .select('id, created_at, event_type, old_data, new_data, metadata')
          .eq('entity_type', 'fraction')
          .eq('metadata->>invoice_id', invoiceId)
          .order('created_at', { ascending: true }),
      ]);

      return {
        invoiceEvents: (invoiceEvents as EventRow[] | null) ?? [],
        fractionEvents: (fractionEvents as EventRow[] | null) ?? [],
      };
    },
    buildTimeline,
  } as QueryDependencies;
}

async function resolveDependencies(overrides?: Partial<QueryDependencies>) {
  if (overrides?.getAuthState) {
    return {
      getAuthState: overrides.getAuthState,
      listCedenteInvoices: overrides.listCedenteInvoices ?? (async () => []),
      listCedenteTransactions: overrides.listCedenteTransactions ?? (async () => []),
      listInvestorHoldings: overrides.listInvestorHoldings ?? (async () => []),
      listInvestorTransactions: overrides.listInvestorTransactions ?? (async () => []),
      getCedenteInvoice: overrides.getCedenteInvoice ?? (async () => null),
      getInvestorInvoiceHolding:
        overrides.getInvestorInvoiceHolding ??
        (async (userId: string, invoiceId: string) => {
          const holdings = await (overrides.listInvestorHoldings ?? (async () => []))(userId);
          return holdings.find((holding) => holding.id === invoiceId) ?? null;
        }),
      listInvoiceTransactions: overrides.listInvoiceTransactions ?? (async () => []),
      listInvoiceEvents: overrides.listInvoiceEvents ?? (async () => ({ invoiceEvents: [], fractionEvents: [] })),
      buildTimeline: overrides.buildTimeline ?? buildTimeline,
    } satisfies QueryDependencies;
  }

  const defaults = await createDefaultDependencies();

  if (overrides?.getInvestorInvoiceHolding) {
    return { ...defaults, ...overrides } satisfies QueryDependencies;
  }

  return {
    ...defaults,
    getInvestorInvoiceHolding: async (userId: string, invoiceId: string) => {
      const holdings = await (overrides?.listInvestorHoldings ?? defaults.listInvestorHoldings)(userId);
      return holdings.find((holding) => holding.id === invoiceId) ?? null;
    },
    ...overrides,
  } satisfies QueryDependencies;
}

export async function getCedenteDashboard(overrides?: Partial<QueryDependencies>): Promise<CedenteDashboard> {
  const dependencies = await resolveDependencies(overrides);
  const auth = await dependencies.getAuthState();

  if (!isAccessibleRole(auth, 'cedente')) {
    return {
      statusCounts: {},
      totalCapitalRaised: 0,
      effectiveFinancingCost: 0,
      spreadTotal: 0,
      recentTransactions: [],
      invoices: [],
    };
  }

  const userId = auth.user!.id;

  const [invoices, transactions] = await Promise.all([
    dependencies.listCedenteInvoices(userId),
    dependencies.listCedenteTransactions(userId),
  ]);

  const statusCounts = invoices.reduce<Record<string, number>>((counts, invoice) => {
    counts[invoice.status] = (counts[invoice.status] ?? 0) + 1;
    return counts;
  }, {});

  const financedInvoices = invoices.filter((invoice) => ['funded', 'settling', 'settled'].includes(invoice.status));
  const totalCapitalRaised = roundToCents(financedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.net_amount), 0));
  const spreadTotal = roundToCents(
    financedInvoices.reduce((sum, invoice) => sum + (toNumber(invoice.amount) - toNumber(invoice.net_amount)), 0),
  );
  const financedAmountTotal = roundToCents(financedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.amount), 0));

  return {
    statusCounts,
    totalCapitalRaised,
    effectiveFinancingCost: financedAmountTotal > 0 ? spreadTotal / financedAmountTotal : 0,
    spreadTotal,
    recentTransactions: sortTransactionsDesc(
      transactions
        .filter((transaction) => transaction.to_user_id === userId)
        .map(mapDashboardTransaction),
    ),
    invoices: invoices.map(mapInvoiceSummary),
  };
}

export async function getInvestorDashboard(overrides?: Partial<QueryDependencies>): Promise<InvestorDashboard> {
  const dependencies = await resolveDependencies(overrides);
  const auth = await dependencies.getAuthState();

  if (!isAccessibleRole(auth, 'inversor')) {
    return {
      holdings: [],
      weightedAverageYield: 0,
      expectedOpenReturn: 0,
      realizedReturnTotal: 0,
      topPayerConcentration: 0,
      holdingsByStatus: { funding: 0, funded: 0, settling: 0, settled: 0 },
      diversificationCount: 0,
      payerBreakdown: [],
      recentTransactions: [],
    };
  }

  const userId = auth.user!.id;

  const [holdings, transactions] = await Promise.all([
    dependencies.listInvestorHoldings(userId),
    dependencies.listInvestorTransactions(userId),
  ]);

  const mappedHoldings = holdings.map((holding) => ({
    invoiceId: holding.invoice_id ?? holding.id,
    invoiceNumber: holding.invoice_number,
    payerName: holding.pagador_name,
    payerCuit: holding.pagador_cuit,
    ownedFractions: holding.owned_fractions,
    investedPrincipal: toNumber(holding.invested_principal),
    expectedReturn: expectedReturnForHolding(holding),
    realizedReturn: toNumber(holding.realized_return),
    status: holding.status,
  }));

  const totalInvestedPrincipal = roundToCents(mappedHoldings.reduce((sum, holding) => sum + holding.investedPrincipal, 0));
  const totalYieldNumerator = roundToCents(
    mappedHoldings.reduce((sum, holding) => {
      const gain = holding.realizedReturn > 0 ? holding.realizedReturn : holding.expectedReturn - holding.investedPrincipal;
      return sum + gain;
    }, 0),
  );

  const payerMap = new Map<string, { payerCuit: string; payerName: string; investedPrincipal: number }>();
  const holdingsByStatus = mappedHoldings.reduce<Record<string, number>>(
    (counts, holding) => {
      counts[holding.status] = (counts[holding.status] ?? 0) + 1;
      return counts;
    },
    { funding: 0, funded: 0, settling: 0, settled: 0 },
  );

  for (const holding of mappedHoldings) {
    const existing = payerMap.get(holding.payerCuit);

    if (existing) {
      existing.investedPrincipal = roundToCents(existing.investedPrincipal + holding.investedPrincipal);
      continue;
    }

    payerMap.set(holding.payerCuit, {
      payerCuit: holding.payerCuit,
      payerName: holding.payerName,
      investedPrincipal: holding.investedPrincipal,
    });
  }

  const payerBreakdown = [...payerMap.values()]
    .map((payer) => ({
      ...payer,
      share: totalInvestedPrincipal > 0 ? payer.investedPrincipal / totalInvestedPrincipal : 0,
    }))
    .sort((left, right) => right.investedPrincipal - left.investedPrincipal);

  return {
    holdings: mappedHoldings,
    weightedAverageYield: totalInvestedPrincipal > 0 ? totalYieldNumerator / totalInvestedPrincipal : 0,
    expectedOpenReturn: roundToCents(
      mappedHoldings
        .filter((holding) => ['funding', 'funded', 'settling'].includes(holding.status))
        .reduce((sum, holding) => sum + holding.expectedReturn, 0),
    ),
    realizedReturnTotal: roundToCents(mappedHoldings.reduce((sum, holding) => sum + holding.realizedReturn, 0)),
    topPayerConcentration: payerBreakdown[0]?.share ?? 0,
    holdingsByStatus,
    diversificationCount: payerBreakdown.length,
    payerBreakdown,
    recentTransactions: sortTransactionsDesc(transactions.map(mapDashboardTransaction)),
  };
}

export async function getCedenteInvoiceSettlementView(
  invoiceId: string,
  overrides?: Partial<QueryDependencies>,
): Promise<CedenteInvoiceSettlementView | null> {
  const dependencies = await resolveDependencies(overrides);
  const auth = await dependencies.getAuthState();

  if (!isAccessibleRole(auth, 'cedente')) {
    return null;
  }

  const userId = auth.user!.id;

  const invoice = await dependencies.getCedenteInvoice(userId, invoiceId);

  if (!invoice) {
    return null;
  }

  const [transactions, events] = await Promise.all([
    dependencies.listInvoiceTransactions(invoiceId),
    dependencies.listInvoiceEvents(invoiceId),
  ]);
  const relevantTransactions = transactions.filter((transaction) => transaction.to_user_id === userId);

  return {
    invoice: mapInvoiceDetail(invoice),
    timeline: dependencies.buildTimeline({
      invoiceEvents: events.invoiceEvents,
      fractionEvents: events.fractionEvents,
      transactions,
    }),
    transactionHistory: mapRoleTransactionHistory(relevantTransactions, userId),
    settlement: {
      principalTotal: roundToCents(
        transactions
          .filter((transaction) => transaction.type === 'settlement_payment')
          .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0),
      ),
      interestTotal: roundToCents(
        transactions
          .filter((transaction) => transaction.type === 'interest_distribution')
          .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0),
      ),
      cedenteDisbursementTotal: roundToCents(
        transactions
          .filter((transaction) => transaction.type === 'disbursement_to_cedente')
          .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0),
      ),
      canSettle: invoice.status === 'funded',
    },
  };
}

export async function getInvestorInvoiceSettlementView(
  invoiceId: string,
  overrides?: Partial<QueryDependencies>,
): Promise<InvestorInvoiceSettlementView | null> {
  const dependencies = await resolveDependencies(overrides);
  const auth = await dependencies.getAuthState();

  if (!isAccessibleRole(auth, 'inversor')) {
    return null;
  }

  const userId = auth.user!.id;

  const holding = await dependencies.getInvestorInvoiceHolding(userId, invoiceId);

  if (!holding || !['funding', 'funded', 'settling', 'settled'].includes(holding.status)) {
    return null;
  }

  const [transactions, events] = await Promise.all([
    dependencies.listInvoiceTransactions(invoiceId),
    dependencies.listInvoiceEvents(invoiceId),
  ]);
  const relevantTransactions = transactions.filter(
    (transaction) => transaction.to_user_id === userId || transaction.from_user_id === userId,
  );

  return {
    invoice: mapInvoiceDetail(holding),
    timeline: dependencies.buildTimeline({
      invoiceEvents: events.invoiceEvents,
      fractionEvents: events.fractionEvents,
      transactions,
    }),
    transactionHistory: mapRoleTransactionHistory(relevantTransactions, userId),
    holding: {
      ownedFractions: holding.owned_fractions,
      investedPrincipal: toNumber(holding.invested_principal),
      expectedReturn: expectedReturnForHolding(holding),
      realizedReturn: toNumber(holding.realized_return),
    },
  };
}
