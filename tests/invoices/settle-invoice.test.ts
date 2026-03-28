import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it } from 'vitest';
import { settleInvoice } from '@/lib/settlement/actions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createUserClient() {
  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing Supabase publishable environment variables.');
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const cleanup = {
  invoiceIds: [] as string[],
  userIds: [] as string[],
};

afterEach(async () => {
  const admin = createAdminClient();

  for (const invoiceId of cleanup.invoiceIds.splice(0)) {
    await admin.from('transactions').delete().eq('invoice_id', invoiceId);
    await admin.from('events').delete().or(`entity_id.eq.${invoiceId},metadata->>invoice_id.eq.${invoiceId}`);
    await admin.from('fractions').delete().eq('invoice_id', invoiceId);
    await admin.from('invoices').delete().eq('id', invoiceId);
  }

  for (const userId of cleanup.userIds.splice(0)) {
    await admin.auth.admin.deleteUser(userId);
  }
});

async function createConfirmedUser(role: 'cedente' | 'inversor', displayName: string) {
  const admin = createAdminClient();
  const email = `settle-${role}-${randomUUID()}@gmail.com`;
  const password = 'password123';

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      display_name: displayName,
      company_name: `${displayName} SA`,
    },
  });

  expect(error).toBeNull();
  cleanup.userIds.push(data.user!.id);

  return { email, password, id: data.user!.id };
}

async function signIn(email: string, password: string) {
  const client = createUserClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return client;
}

async function createFundedInvoice({
  cedenteId,
  investorIds,
  amount = 1500000,
  netAmount = 1275000,
  withDisbursement = false,
}: {
  cedenteId: string;
  investorIds: string[];
  amount?: number;
  netAmount?: number;
  withDisbursement?: boolean;
}) {
  const admin = createAdminClient();
  const invoiceNumber = `SETT-${randomUUID()}`;

  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .insert({
      cedente_id: cedenteId,
      status: 'funded',
      pagador_cuit: '30712345678',
      pagador_name: 'Settlement Pagador SA',
      invoice_number: invoiceNumber,
      description: 'Factura fondeada para probar settlement.',
      amount: amount.toFixed(2),
      net_amount: netAmount.toFixed(2),
      issue_date: '2026-03-28',
      due_date: '2026-06-28',
      risk_tier: 'A',
      discount_rate: '0.1500',
      total_fractions: investorIds.length,
      funded_fractions: investorIds.length,
      funded_at: '2026-03-28T00:00:00.000Z',
    })
    .select('id, invoice_number')
    .single();

  expect(invoiceError).toBeNull();
  cleanup.invoiceIds.push(invoice!.id);

  const baseNetAmount = Math.floor((netAmount / investorIds.length) * 100) / 100;
  const fractions = investorIds.map((investorId, index) => {
    const isLast = index === investorIds.length - 1;
    const consumed = Number((baseNetAmount * index).toFixed(2));
    const fractionNetAmount = isLast ? Number((netAmount - consumed).toFixed(2)) : Number(baseNetAmount.toFixed(2));

    return {
      invoice_id: invoice!.id,
      fraction_index: index + 1,
      amount: fractionNetAmount.toFixed(2),
      net_amount: fractionNetAmount.toFixed(2),
      status: 'sold',
      investor_id: investorId,
      purchased_at: '2026-03-28T00:00:00.000Z',
    };
  });

  const { data: createdFractions, error: fractionError } = await admin
    .from('fractions')
    .insert(fractions)
    .select('id, fraction_index, investor_id, net_amount');

  expect(fractionError).toBeNull();

  const { error: purchaseLedgerError } = await admin.from('transactions').insert(
    createdFractions!.map((fraction) => ({
      type: 'fraction_purchase',
      invoice_id: invoice!.id,
      fraction_id: fraction.id,
      from_user_id: fraction.investor_id,
      to_user_id: cedenteId,
      amount: Number(fraction.net_amount).toFixed(2),
      description: `Purchase of fraction ${fraction.fraction_index} for invoice ${invoice!.invoice_number}`,
      metadata: {
        invoice_id: invoice!.id,
        fraction_index: fraction.fraction_index,
        investor_id: fraction.investor_id,
      },
    })),
  );

  expect(purchaseLedgerError).toBeNull();

  if (withDisbursement) {
    const { error: disbursementError } = await admin.from('transactions').insert({
      type: 'disbursement_to_cedente',
      invoice_id: invoice!.id,
      from_user_id: null,
      to_user_id: cedenteId,
      amount: netAmount.toFixed(2),
      description: `Disbursement for invoice ${invoice!.invoice_number}`,
      metadata: {
        invoice_id: invoice!.id,
        simulated: false,
        source: 'fund_invoice',
      },
    });

    expect(disbursementError).toBeNull();
  }

  return invoice!.id;
}

async function createNonFundedInvoice(cedenteId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('invoices')
    .insert({
      cedente_id: cedenteId,
      status: 'tokenized',
      pagador_cuit: '30712345678',
      pagador_name: 'Settlement Pagador SA',
      invoice_number: `INVALID-${randomUUID()}`,
      description: 'Factura todavía no fondeada.',
      amount: '900000.00',
      net_amount: '810000.00',
      issue_date: '2026-03-28',
      due_date: '2026-06-28',
      risk_tier: 'A',
      discount_rate: '0.1000',
      total_fractions: 3,
      funded_fractions: 0,
    })
    .select('id')
    .single();

  expect(error).toBeNull();
  cleanup.invoiceIds.push(data!.id);

  return data!.id;
}

async function createFundingInvoice({
  cedenteId,
  totalFractions,
  amount = 1500000,
  netAmount = 1275000,
}: {
  cedenteId: string;
  totalFractions: number;
  amount?: number;
  netAmount?: number;
}) {
  const admin = createAdminClient();
  const invoiceNumber = `FAC-${randomUUID()}`;
  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .insert({
      cedente_id: cedenteId,
      status: 'funding',
      pagador_cuit: '30712345678',
      pagador_name: 'Funding Pagador SA',
      invoice_number: invoiceNumber,
      description: 'Factura para probar funding + settlement.',
      amount: amount.toFixed(2),
      net_amount: netAmount.toFixed(2),
      issue_date: '2026-03-28',
      due_date: '2026-06-28',
      risk_tier: 'A',
      discount_rate: '0.1450',
      total_fractions: totalFractions,
      funded_fractions: 0,
    })
    .select('id')
    .single();

  expect(invoiceError).toBeNull();
  cleanup.invoiceIds.push(invoice!.id);

  const baseNetAmount = Math.floor((netAmount / totalFractions) * 100) / 100;
  const fractions = Array.from({ length: totalFractions }, (_, index) => {
    const isLast = index === totalFractions - 1;
    const consumed = Number((baseNetAmount * index).toFixed(2));
    const fractionNetAmount = isLast ? Number((netAmount - consumed).toFixed(2)) : Number(baseNetAmount.toFixed(2));

    return {
      invoice_id: invoice!.id,
      fraction_index: index + 1,
      amount: fractionNetAmount.toFixed(2),
      net_amount: fractionNetAmount.toFixed(2),
      status: 'available',
    };
  });

  const { error: fractionError } = await admin.from('fractions').insert(fractions);
  expect(fractionError).toBeNull();

  return invoice!.id;
}

async function callFundInvoice(client: SupabaseClient, invoiceId: string, fractionCount: number) {
  return client.rpc('fund_invoice', {
    p_invoice_id: invoiceId,
    p_fraction_count: fractionCount,
  });
}

function createSettlementServices(client: SupabaseClient, actorId: string) {
  return {
    getActor: async () => ({ userId: actorId, role: 'cedente' as const }),
    callSettleInvoice: async ({ invoiceId }: { invoiceId: string }) => {
      const { data, error } = await client.rpc('settle_invoice', {
        p_invoice_id: invoiceId,
      });

      if (error || !data) {
        throw new Error(error?.message ?? 'No pudimos liquidar la factura.');
      }

      const row = Array.isArray(data) ? data[0] : data;

      return {
        invoiceId: row.invoice_id,
        invoiceStatus: row.invoice_status,
        settledFractions: Number(row.settled_fractions ?? 0),
        principalTotal: Number(row.principal_total ?? 0),
        interestTotal: Number(row.interest_total ?? 0),
        cedenteDisbursementTotal: Number(row.cedente_disbursement_total ?? 0),
      };
    },
  };
}

describe('Phase 4 settlement boundary', () => {
  it('settles funded invoices through settling into settled, marks sold fractions settled, and rejects invalid statuses', async () => {
    const cedente = await createConfirmedUser('cedente', 'Cedente Settlement');
    const investors = await Promise.all([
      createConfirmedUser('inversor', 'Investor Settlement A'),
      createConfirmedUser('inversor', 'Investor Settlement B'),
      createConfirmedUser('inversor', 'Investor Settlement C'),
    ]);
    const invoiceId = await createFundedInvoice({
      cedenteId: cedente.id,
      investorIds: investors.map((investor) => investor.id),
    });
    const invalidInvoiceId = await createNonFundedInvoice(cedente.id);
    const cedenteClient = await signIn(cedente.email, cedente.password);

    const result = await settleInvoice({ invoiceId }, createSettlementServices(cedenteClient, cedente.id));

    expect(result).toMatchObject({
      status: 'success',
      settlement: {
        invoiceId,
        invoiceStatus: 'settled',
        settledFractions: 3,
      },
    });

    const admin = createAdminClient();
    const { data: invoice } = await admin.from('invoices').select('status, settled_at').eq('id', invoiceId).single();
    const { data: fractions } = await admin
      .from('fractions')
      .select('status, settled_at')
      .eq('invoice_id', invoiceId)
      .order('fraction_index', { ascending: true });
    const { data: events } = await admin
      .from('events')
      .select('new_data, created_at')
      .eq('entity_type', 'invoice')
      .eq('entity_id', invoiceId)
      .order('created_at', { ascending: true });

    expect(invoice).toMatchObject({ status: 'settled' });
    expect(invoice?.settled_at).toBeTruthy();
    expect(fractions).toHaveLength(3);
    expect(fractions?.every((fraction) => fraction.status === 'settled' && Boolean(fraction.settled_at))).toBe(true);
    expect(events?.slice(-2).map((event) => event.new_data.status)).toEqual(['settling', 'settled']);

    await expect(settleInvoice({ invoiceId: invalidInvoiceId }, createSettlementServices(cedenteClient, cedente.id))).resolves.toMatchObject({
      status: 'error',
      message: expect.stringMatching(/funded/i),
    });
  });

  it('backfills one missing cedente disbursement and writes one principal plus one interest row per sold fraction', async () => {
    const cedente = await createConfirmedUser('cedente', 'Cedente Ledger');
    const investors = await Promise.all([
      createConfirmedUser('inversor', 'Investor Ledger A'),
      createConfirmedUser('inversor', 'Investor Ledger B'),
      createConfirmedUser('inversor', 'Investor Ledger C'),
    ]);
    const invoiceId = await createFundedInvoice({
      cedenteId: cedente.id,
      investorIds: investors.map((investor) => investor.id),
      withDisbursement: false,
    });
    const cedenteClient = await signIn(cedente.email, cedente.password);

    const result = await settleInvoice({ invoiceId }, createSettlementServices(cedenteClient, cedente.id));
    expect(result.status).toBe('success');

    const admin = createAdminClient();
    const { data: transactions } = await admin
      .from('transactions')
      .select('type, amount, to_user_id, metadata')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    const disbursements = transactions?.filter((transaction) => transaction.type === 'disbursement_to_cedente') ?? [];
    const principalRows = transactions?.filter((transaction) => transaction.type === 'settlement_payment') ?? [];
    const interestRows = transactions?.filter((transaction) => transaction.type === 'interest_distribution') ?? [];

    expect(disbursements).toHaveLength(1);
    expect(disbursements[0]).toMatchObject({
      amount: 1275000,
      to_user_id: cedente.id,
      metadata: expect.objectContaining({ simulated: true }),
    });
    expect(principalRows).toHaveLength(3);
    expect(interestRows).toHaveLength(3);
    expect(principalRows.reduce((sum, row) => sum + Number(row.amount), 0)).toBe(1275000);
    expect(interestRows.reduce((sum, row) => sum + Number(row.amount), 0)).toBe(225000);
  });

  it('records a single cedente disbursement when funding closes and settlement does not duplicate it', async () => {
    const cedente = await createConfirmedUser('cedente', 'Cedente Funding Close');
    const investorA = await createConfirmedUser('inversor', 'Investor Funding Close A');
    const investorB = await createConfirmedUser('inversor', 'Investor Funding Close B');
    const invoiceId = await createFundingInvoice({
      cedenteId: cedente.id,
      totalFractions: 3,
    });

    const [clientA, clientB] = await Promise.all([
      signIn(investorA.email, investorA.password),
      signIn(investorB.email, investorB.password),
    ]);

    const firstPurchase = await callFundInvoice(clientA, invoiceId, 1);
    expect(firstPurchase.error).toBeNull();

    const finalPurchase = await callFundInvoice(clientB, invoiceId, 2);
    expect(finalPurchase.error).toBeNull();

    const admin = createAdminClient();
    const { data: fundedTransactions } = await admin
      .from('transactions')
      .select('type, amount, to_user_id')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    expect(fundedTransactions?.filter((transaction) => transaction.type === 'disbursement_to_cedente')).toHaveLength(1);
    expect(fundedTransactions?.filter((transaction) => transaction.type === 'disbursement_to_cedente')[0]).toMatchObject({
      amount: 1275000,
      to_user_id: cedente.id,
    });

    const cedenteClient = await signIn(cedente.email, cedente.password);
    const settlementResult = await settleInvoice({ invoiceId }, createSettlementServices(cedenteClient, cedente.id));
    expect(settlementResult.status).toBe('success');

    const { data: finalTransactions } = await admin
      .from('transactions')
      .select('type')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    expect(finalTransactions?.filter((transaction) => transaction.type === 'disbursement_to_cedente')).toHaveLength(1);
    expect(finalTransactions?.filter((transaction) => transaction.type === 'settlement_payment')).toHaveLength(3);
    expect(finalTransactions?.filter((transaction) => transaction.type === 'interest_distribution')).toHaveLength(3);
  });
});
