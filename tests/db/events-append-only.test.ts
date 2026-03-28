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

const cleanup: Array<{ eventId?: number; invoiceId: string; userId: string }> = [];

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

describe('events append-only invariants', () => {
  it('writes a transition event and blocks event updates', async () => {
    const admin = createAdminClient();
    const email = `audit-${randomUUID()}@karai.app`;

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        role: 'cedente',
        display_name: 'Audit Demo',
        company_name: 'Audit SA',
      },
    });

    expect(userError).toBeNull();
    const userId = userData.user!.id;

    const { data: invoice, error: invoiceError } = await admin
      .from('invoices')
      .insert({
        cedente_id: userId,
        pagador_cuit: '30712345678',
        pagador_name: 'YPF SA',
        invoice_number: `FAC-${randomUUID()}`,
        amount: '990000.00',
        issue_date: '2026-03-28',
        due_date: '2026-06-28',
      })
      .select('id')
      .single();

    expect(invoiceError).toBeNull();
    cleanup.push({ invoiceId: invoice!.id, userId });

    const transition = await admin.rpc('transition_invoice', {
      p_invoice_id: invoice!.id,
      p_new_status: 'validating',
      p_actor_id: userId,
    });

    expect(transition.error).toBeNull();

    const { data: events, error: eventsError } = await admin
      .from('events')
      .select('id, entity_type, event_type, old_data, new_data, actor_id')
      .eq('entity_type', 'invoice')
      .eq('entity_id', invoice!.id)
      .order('created_at', { ascending: true });

    expect(eventsError).toBeNull();
    expect(events).toHaveLength(1);
    expect(events?.[0]).toMatchObject({
      entity_type: 'invoice',
      event_type: 'invoice.transitioned',
      actor_id: userId,
      old_data: { status: 'draft' },
      new_data: { status: 'validating' },
    });

    const updateAttempt = await admin.from('events').update({ event_type: 'tampered' }).eq('id', events![0].id);

    expect(updateAttempt.error).toBeTruthy();
    expect(updateAttempt.error?.message).toMatch(/append-only|immutable|update/i);
  });
});
