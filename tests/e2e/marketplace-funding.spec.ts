import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials for Playwright cleanup.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const cleanup: Array<{ invoiceId: string; userIds: string[] }> = [];

test.afterEach(async () => {
  const admin = createAdminClient();

  while (cleanup.length) {
    const item = cleanup.pop();
    if (!item) continue;

    await admin.from('transactions').delete().eq('invoice_id', item.invoiceId);
    await admin.from('events').delete().or(`entity_id.eq.${item.invoiceId},metadata->>invoice_id.eq.${item.invoiceId}`);
    await admin.from('fractions').delete().eq('invoice_id', item.invoiceId);
    await admin.from('invoices').delete().eq('id', item.invoiceId);

    for (const userId of item.userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

test('investor can browse marketplace, inspect returns, and buy fractions', async ({ page }) => {
  test.setTimeout(60_000);
  const admin = createAdminClient();
  const suffix = randomUUID();
  const cedenteEmail = `karai.cedente+${suffix}@gmail.com`;
  const investorEmail = `karai.investor+${suffix}@gmail.com`;
  const password = 'password123';
  const invoiceNumber = `FUND-${suffix.slice(0, 8)}`;

  const { data: cedenteData, error: cedenteError } = await admin.auth.admin.createUser({
    email: cedenteEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'cedente',
      display_name: 'Cedente Demo',
      company_name: 'Cedente Demo SA',
    },
  });
  expect(cedenteError).toBeNull();

  const { data: investorData, error: investorError } = await admin.auth.admin.createUser({
    email: investorEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'inversor',
      display_name: 'Investor Demo',
      company_name: 'Investor Demo SA',
    },
  });
  expect(investorError).toBeNull();

  const { data: invoice, error: invoiceError } = await admin
    .from('invoices')
    .insert({
      cedente_id: cedenteData.user!.id,
      status: 'funding',
      pagador_cuit: '30712345678',
      pagador_name: 'Pagador Demo SA',
      invoice_number: invoiceNumber,
      description: 'Factura seeded para la validación E2E de marketplace funding.',
      amount: '4000.00',
      net_amount: '3200.00',
      issue_date: '2026-03-28',
      due_date: '2026-06-28',
      risk_tier: 'A',
      discount_rate: '0.2000',
      total_fractions: 4,
      funded_fractions: 1,
    })
    .select('id')
    .single();
  expect(invoiceError).toBeNull();

  const invoiceId = invoice!.id;
  cleanup.push({ invoiceId, userIds: [cedenteData.user!.id, investorData.user!.id] });

  const { error: fractionsError } = await admin.from('fractions').insert([
    {
      invoice_id: invoiceId,
      fraction_index: 1,
      amount: '800.00',
      net_amount: '800.00',
      status: 'sold',
      investor_id: investorData.user!.id,
      purchased_at: new Date().toISOString(),
    },
    { invoice_id: invoiceId, fraction_index: 2, amount: '800.00', net_amount: '800.00', status: 'available' },
    { invoice_id: invoiceId, fraction_index: 3, amount: '800.00', net_amount: '800.00', status: 'available' },
    { invoice_id: invoiceId, fraction_index: 4, amount: '800.00', net_amount: '800.00', status: 'available' },
  ]);
  expect(fractionsError).toBeNull();

  await page.goto('/login');
  await page.getByLabel('Email').fill(investorEmail);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/inversor\/dashboard$/);

  const invoiceCard = page.locator('article').filter({ hasText: invoiceNumber });
  await expect(page.getByRole('heading', { name: 'Marketplace de facturas en funding' })).toBeVisible();
  await expect(invoiceCard.getByText(invoiceNumber)).toBeVisible();
  await expect(invoiceCard.getByText('Tier A', { exact: true })).toBeVisible();
  await expect(invoiceCard.getByText('1 / 4 fracciones fondeadas')).toBeVisible();
  await expect(invoiceCard.getByRole('link', { name: 'Ver detalle' })).toBeVisible();

  await invoiceCard.getByRole('link', { name: 'Ver detalle' }).click();
  await expect(page).toHaveURL(new RegExp(`/inversor/invoices/${invoiceId}$`));
  await expect(page.getByRole('heading', { name: invoiceNumber })).toBeVisible();
  await expect(page.getByText('Retorno estimado')).toBeVisible();
  await expect(page.getByText('1 / 4 fracciones fondeadas')).toBeVisible();
  await expect(page.getByText(/Live|Fallback cada 2s|Conectando…/)).toBeVisible();

  await page.getByLabel('Cantidad de fracciones').fill('2');
  await expect(page.getByText('$ 1.600,00')).toBeVisible();
  await expect(page.getByText('$ 2.000,00')).toBeVisible();

  await page.getByRole('button', { name: 'Comprar fracciones' }).click();
  await expect(page.getByText(/Compra registrada con éxito|quedó totalmente fondeada/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('3 / 4 fracciones fondeadas')).toBeVisible({ timeout: 30_000 });

  const { data: refreshedInvoice, error: refreshedInvoiceError } = await admin
    .from('invoices')
    .select('funded_fractions, status')
    .eq('id', invoiceId)
    .single();
  expect(refreshedInvoiceError).toBeNull();
  expect(refreshedInvoice).toMatchObject({
    funded_fractions: 3,
    status: 'funding',
  });
});
