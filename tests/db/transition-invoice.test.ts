import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it } from 'vitest';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin test environment variables.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const cleanup: Array<{ invoiceId: string; userId: string }> = [];

afterEach(async () => {
  const admin = createAdminClient();

  while (cleanup.length) {
    const item = cleanup.pop();
    if (!item) continue;

    await admin.from('events').delete().eq('entity_id', item.invoiceId);
    await admin.from('invoices').delete().eq('id', item.invoiceId);
    await admin.auth.admin.deleteUser(item.userId);
  }
});

describe('invoice transition invariants', () => {
  it('rejects invalid transitions and records allowed transitions', async () => {
    const admin = createAdminClient();
    const email = `cedente-${randomUUID()}@karai.app`;

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        role: 'cedente',
        display_name: 'Cedente Demo',
        company_name: 'Acme SA',
      },
    });

    expect(userError).toBeNull();
    const userId = userData.user!.id;

    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .insert({
        cedente_id: userId,
        pagador_cuit: '30712345678',
        pagador_name: 'Techint SA',
        invoice_number: `FAC-${randomUUID()}`,
        description: 'Servicios de consultoria Marzo 2026',
        amount: '1500000.00',
        issue_date: '2026-03-28',
        due_date: '2026-06-28',
      })
      .select('id, status')
      .single();

    expect(invoiceError).toBeNull();
    expect(invoice?.status).toBe('draft');

    cleanup.push({ invoiceId: invoice!.id, userId });

    const invalid = await admin.rpc('transition_invoice', {
      p_invoice_id: invoice!.id,
      p_new_status: 'funded',
      p_actor_id: userId,
    });

    expect(invalid.error).toBeTruthy();
    expect(invalid.error?.message).toMatch(/Invalid transition/i);

    const valid = await admin.rpc('transition_invoice', {
      p_invoice_id: invoice!.id,
      p_new_status: 'validating',
      p_actor_id: userId,
    });

    expect(valid.error).toBeNull();
    expect(valid.data).toMatchObject({
      id: invoice!.id,
      status: 'validating',
    });
    expect(valid.data?.funding_started_at).toBeNull();
  });
});
