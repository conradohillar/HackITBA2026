import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
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
    await admin.from('invoices').delete().eq('id', invoiceId);
  }

  for (const userId of cleanup.userIds.splice(0)) {
    await admin.auth.admin.deleteUser(userId);
  }
});

async function createConfirmedUser(role: 'cedente' | 'inversor', displayName: string) {
  const admin = createAdminClient();
  const email = `rls-${role}-${randomUUID()}@gmail.com`;
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

describe('Phase 1 RLS policies', () => {
  it('blocks anonymous reads and writes on protected tables', async () => {
    const anon = createUserClient();

    const profileRead = await anon.from('profiles').select('id').limit(1);
    expect(profileRead.error?.message).toMatch(/permission denied/i);

    const invoiceInsert = await anon.from('invoices').insert({
      cedente_id: randomUUID(),
      pagador_cuit: '30712345678',
      pagador_name: 'Anon SA',
      invoice_number: `FAC-${randomUUID()}`,
      description: 'Intento anonimo',
      amount: '1000.00',
      issue_date: '2026-03-28',
      due_date: '2026-04-28',
    });

    expect(invoiceInsert.error).toBeTruthy();
    expect(invoiceInsert.error?.message).toMatch(/permission denied/i);
  });

  it('allows self-profile access, isolates cedente invoices, and exposes marketplace rows to investors', async () => {
    const admin = createAdminClient();
    const cedenteA = await createConfirmedUser('cedente', 'Cedente Uno');
    const cedenteB = await createConfirmedUser('cedente', 'Cedente Dos');
    const inversor = await createConfirmedUser('inversor', 'Inversor Uno');

    const { data: ownInvoice } = await admin
      .from('invoices')
      .insert({
        cedente_id: cedenteA.id,
        status: 'draft',
        pagador_cuit: '30712345678',
        pagador_name: 'Techint SA',
        invoice_number: `FAC-${randomUUID()}`,
        description: 'Factura propia visible solo para el cedente',
        amount: '1500000.00',
        issue_date: '2026-03-28',
        due_date: '2026-06-28',
      })
      .select('id')
      .single();

    const { data: marketplaceInvoice } = await admin
      .from('invoices')
      .insert({
        cedente_id: cedenteB.id,
        status: 'funding',
        pagador_cuit: '30798765432',
        pagador_name: 'YPF SA',
        invoice_number: `FAC-${randomUUID()}`,
        description: 'Factura publicada en marketplace',
        amount: '2450000.00',
        issue_date: '2026-03-28',
        due_date: '2026-06-28',
      })
      .select('id')
      .single();

    expect(ownInvoice).toBeTruthy();
    expect(marketplaceInvoice).toBeTruthy();
    cleanup.invoiceIds.push(ownInvoice!.id, marketplaceInvoice!.id);

    const cedenteClient = await signIn(cedenteA.email, cedenteA.password);
    const investorClient = await signIn(inversor.email, inversor.password);

    const ownProfile = await cedenteClient.from('profiles').select('id, role').eq('id', cedenteA.id).single();
    expect(ownProfile.error).toBeNull();
    expect(ownProfile.data).toMatchObject({ id: cedenteA.id, role: 'cedente' });

    const cedenteInvoices = await cedenteClient.from('invoices').select('id, status').order('created_at');
    expect(cedenteInvoices.error).toBeNull();
    expect(cedenteInvoices.data?.map((invoice) => invoice.id)).toEqual([ownInvoice!.id]);

    const investorInvoices = await investorClient.from('invoices').select('id, status').order('created_at');
    expect(investorInvoices.error).toBeNull();
    expect(investorInvoices.data).toContainEqual({ id: marketplaceInvoice!.id, status: 'funding' });
    expect(investorInvoices.data?.some((invoice) => invoice.id === ownInvoice!.id)).toBe(false);
  });
});
