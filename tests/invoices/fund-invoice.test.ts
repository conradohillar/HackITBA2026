import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it } from 'vitest';

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
  const email = `fund-${role}-${randomUUID()}@gmail.com`;
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
      description: 'Factura de funding creada por Vitest para validar fund_invoice.',
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

  const fractionNetAmount = Number((netAmount / totalFractions).toFixed(2));
  const fractions = Array.from({ length: totalFractions }, (_, index) => ({
    invoice_id: invoice!.id,
    fraction_index: index + 1,
    amount: fractionNetAmount.toFixed(2),
    net_amount: fractionNetAmount.toFixed(2),
    status: 'available',
  }));

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

describe('Phase 3 fund_invoice boundary', () => {
  it('never oversells under concurrent purchase attempts', async () => {
    const cedente = await createConfirmedUser('cedente', 'Cedente Funding');
    const investorA = await createConfirmedUser('inversor', 'Investor A');
    const investorB = await createConfirmedUser('inversor', 'Investor B');
    const invoiceId = await createFundingInvoice({ cedenteId: cedente.id, totalFractions: 2 });

    const [clientA, clientB] = await Promise.all([
      signIn(investorA.email, investorA.password),
      signIn(investorB.email, investorB.password),
    ]);

    const [purchaseA, purchaseB] = await Promise.allSettled([
      callFundInvoice(clientA, invoiceId, 2),
      callFundInvoice(clientB, invoiceId, 2),
    ]);

    const admin = createAdminClient();
    const { data: invoice } = await admin
      .from('invoices')
      .select('funded_fractions, total_fractions, status')
      .eq('id', invoiceId)
      .single();
    const { count: soldCount } = await admin
      .from('fractions')
      .select('*', { count: 'exact', head: true })
      .eq('invoice_id', invoiceId)
      .eq('status', 'sold');

    expect([purchaseA.status, purchaseB.status]).toContain('fulfilled');
    expect(invoice).toMatchObject({
      funded_fractions: 2,
      total_fractions: 2,
      status: 'funded',
    });
    expect(soldCount).toBe(2);
  });

  it('rejects requests larger than remaining supply instead of partially filling', async () => {
    const cedente = await createConfirmedUser('cedente', 'Cedente Supply');
    const investorA = await createConfirmedUser('inversor', 'Investor Supply A');
    const investorB = await createConfirmedUser('inversor', 'Investor Supply B');
    const invoiceId = await createFundingInvoice({ cedenteId: cedente.id, totalFractions: 3 });

    const [clientA, clientB] = await Promise.all([
      signIn(investorA.email, investorA.password),
      signIn(investorB.email, investorB.password),
    ]);

    const firstPurchase = await callFundInvoice(clientA, invoiceId, 2);
    expect(firstPurchase.error).toBeNull();

    const secondPurchase = await callFundInvoice(clientB, invoiceId, 2);

    expect(secondPurchase.error).toBeTruthy();
    expect(secondPurchase.error?.message).toMatch(/available|remain|fraction/i);

    const admin = createAdminClient();
    const { data: invoice } = await admin
      .from('invoices')
      .select('funded_fractions, total_fractions, status')
      .eq('id', invoiceId)
      .single();
    const { count: soldCount } = await admin
      .from('fractions')
      .select('*', { count: 'exact', head: true })
      .eq('invoice_id', invoiceId)
      .eq('status', 'sold');

    expect(invoice).toMatchObject({
      funded_fractions: 2,
      total_fractions: 3,
      status: 'funding',
    });
    expect(soldCount).toBe(2);
  });

  it('marks the invoice funded and records one transaction per sold fraction', async () => {
    const cedente = await createConfirmedUser('cedente', 'Cedente Ledger');
    const investorA = await createConfirmedUser('inversor', 'Investor Ledger A');
    const investorB = await createConfirmedUser('inversor', 'Investor Ledger B');
    const invoiceId = await createFundingInvoice({ cedenteId: cedente.id, totalFractions: 3 });

    const [clientA, clientB] = await Promise.all([
      signIn(investorA.email, investorA.password),
      signIn(investorB.email, investorB.password),
    ]);

    const purchaseA = await callFundInvoice(clientA, invoiceId, 1);
    expect(purchaseA.error).toBeNull();

    const purchaseB = await callFundInvoice(clientB, invoiceId, 2);
    expect(purchaseB.error).toBeNull();

    const admin = createAdminClient();
    const { data: invoice } = await admin
      .from('invoices')
      .select('status, funded_fractions, total_fractions, funded_at')
      .eq('id', invoiceId)
      .single();
    const { data: transactions } = await admin
      .from('transactions')
      .select('type, invoice_id, fraction_id, from_user_id, to_user_id, amount')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    expect(invoice).toMatchObject({
      status: 'funded',
      funded_fractions: 3,
      total_fractions: 3,
    });
    expect(invoice?.funded_at).toBeTruthy();
    expect(transactions).toHaveLength(3);
    expect(transactions?.every((entry) => entry.type === 'fraction_purchase')).toBe(true);
    expect(transactions?.every((entry) => entry.invoice_id === invoiceId)).toBe(true);
    expect(transactions?.every((entry) => entry.fraction_id)).toBe(true);
    expect(transactions?.every((entry) => entry.to_user_id === cedente.id)).toBe(true);
  });
});
