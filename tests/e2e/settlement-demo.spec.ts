import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

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

const cleanup: Array<{ invoiceNumber: string; userIds: string[] }> = [];

test.afterEach(async () => {
  const admin = createAdminClient();

  while (cleanup.length) {
    const item = cleanup.pop();
    if (!item) continue;

    const { data: invoices } = await admin.from('invoices').select('id').eq('invoice_number', item.invoiceNumber);
    const invoiceIds = invoices?.map((invoice) => invoice.id) ?? [];

    if (invoiceIds.length) {
      await admin.from('transactions').delete().in('invoice_id', invoiceIds);
      for (const invoiceId of invoiceIds) {
        await admin.from('events').delete().or(`entity_id.eq.${invoiceId},metadata->>invoice_id.eq.${invoiceId}`);
      }
      await admin.from('fractions').delete().in('invoice_id', invoiceIds);
      await admin.from('invoices').delete().in('id', invoiceIds);
    }

    for (const userId of item.userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

async function signup(page: Page, role: 'cedente' | 'inversor', email: string, password: string, displayName: string) {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Nombre visible').fill(displayName);
  await page.getByLabel('Empresa (opcional)').fill(`${displayName} SA`);
  await page.getByLabel('Contraseña').fill(password);

  if (role === 'inversor') {
    await page.getByText('Inversor · Compra fracciones con retorno fijo').click();
  }

  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(new RegExp(role === 'cedente' ? '/cedente/dashboard$' : '/inversor/dashboard$'), { timeout: 45_000 });
}

async function getUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });

  expect(error).toBeNull();
  return data.users.find((user) => user.email === email)?.id ?? '';
}

test('desktop/mobile happy path runs from signup through settlement dashboards and timeline review', async ({ browser, page }) => {
  test.setTimeout(180_000);

  const suffix = randomUUID().slice(0, 8);
  const invoiceNumber = `SETT-${suffix}`;
  const cedenteEmail = `karai.cedente+${suffix}@gmail.com`;
  const investorEmail = `karai.investor+${suffix}@gmail.com`;
  const password = 'password123';

  await test.step('cedente signs up and originates an invoice', async () => {
    await signup(page, 'cedente', cedenteEmail, password, 'Cedente Demo');
    await expect(page.getByRole('heading', { name: 'Control de colocación y settlement' })).toBeVisible();

    await page.goto('/cedente/invoices/new');
    await page.getByLabel('Número de factura').fill(invoiceNumber);
    await page.getByLabel('Descripción').fill('Factura originada por el spec Phase 4 para validar funding, settlement y dashboards.');
    await page.getByRole('button', { name: 'Originar factura' }).click();

    await expect(page).toHaveURL(/\/cedente\/invoices\/[^/]+$/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: invoiceNumber })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Tokenización')).toBeVisible();
    await expect(page.getByText('Timeline auditable')).toBeVisible();
  });

  const investorContext = await browser.newContext();
  const investorPage = await investorContext.newPage();

  let invoiceId = '';
  const cedenteUserId = await getUserIdByEmail(cedenteEmail);

  await test.step('investor signs up, funds the invoice, and sees the holding state', async () => {
    await signup(investorPage, 'inversor', investorEmail, password, 'Investor Demo');
    await expect(investorPage.getByRole('heading', { name: 'Marketplace + portafolio vivo' })).toBeVisible();

    const invoiceCard = investorPage.locator('article').filter({ hasText: invoiceNumber }).first();
    await expect(invoiceCard).toBeVisible({ timeout: 45_000 });
    await invoiceCard.getByRole('link', { name: 'Ver detalle' }).click();

    await expect(investorPage).toHaveURL(/\/inversor\/invoices\/[^/]+$/);
    invoiceId = investorPage.url().split('/').pop() ?? '';

    await investorPage.getByLabel('Cantidad de fracciones').fill('8');
    await investorPage.getByRole('button', { name: 'Comprar fracciones' }).click();
    await expect(investorPage.getByText(/Compra registrada con éxito|totalmente fondeada/i)).toBeVisible({ timeout: 45_000 });
    await expect(investorPage.getByText('Fracciones propias')).toBeVisible({ timeout: 45_000 });
    await expect(investorPage.getByText('Resumen del holding')).toBeVisible();
  });

  const investorUserId = await getUserIdByEmail(investorEmail);
  cleanup.push({ invoiceNumber, userIds: [cedenteUserId, investorUserId].filter(Boolean) });

  await test.step('cedente settles the funded invoice and sees ledger updates', async () => {
    await page.goto(`/cedente/invoices/${invoiceId}`);
    await expect(page.getByRole('button', { name: 'Simular settlement' })).toBeEnabled({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Simular settlement' }).click();
    await expect(page.getByText('Liquidación simulada registrada con éxito.')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Settlement no disponible')).toBeVisible({ timeout: 45_000 });

    await page.goto('/cedente/dashboard');
    await expect(page.getByRole('heading', { name: 'Control de colocación y settlement' })).toBeVisible();
    await expect(page.getByText('Ledger reciente')).toBeVisible();
    await expect(page.getByText(invoiceNumber, { exact: true }).first()).toBeVisible();
  });

  await test.step('investor reviews settled detail and dashboard metrics', async () => {
    await investorPage.goto(`/inversor/invoices/${invoiceId}`);
    await expect(investorPage.getByText('Capital + rendimiento registrados')).toBeVisible({ timeout: 45_000 });
    await expect(investorPage.getByText('Distribución de interés').first()).toBeVisible();
    await expect(investorPage.getByText('Timeline auditable')).toBeVisible();

    await investorPage.goto('/inversor/dashboard');
    await expect(investorPage.getByText('Yield promedio', { exact: true })).toBeVisible();
    await expect(investorPage.getByText('Diversificación', { exact: true }).first()).toBeVisible();
    await expect(investorPage.getByText(invoiceNumber, { exact: true }).first()).toBeVisible();
  });

  await investorContext.close();
});
