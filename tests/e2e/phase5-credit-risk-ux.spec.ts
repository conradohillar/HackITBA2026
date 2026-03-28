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

const cleanup: Array<{ userIds: string[]; invoiceNumber: string }> = [];

test.afterEach(async () => {
  const admin = createAdminClient();

  while (cleanup.length) {
    const item = cleanup.pop();
    if (!item) continue;

    const { data: invoices } = await admin.from('invoices').select('id').eq('invoice_number', item.invoiceNumber);
    const invoiceIds = invoices?.map((invoice) => invoice.id) ?? [];

    if (invoiceIds.length) {
      await admin.from('events').delete().in('entity_id', invoiceIds);
      await admin.from('transactions').delete().in('invoice_id', invoiceIds);
      await admin.from('fractions').delete().in('invoice_id', invoiceIds);
      await admin.from('invoices').delete().in('id', invoiceIds);
    }

    for (const userId of item.userIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

async function login(page: Page, email: string, password: string, expectedPath: RegExp) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  try {
    await expect(page).toHaveURL(expectedPath, { timeout: 7_500 });
  } catch {
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(expectedPath, { timeout: 10_000 });
  }
}

test('phase 5 risk detail and investor cheque navigation work on desktop and mobile', async ({ page }) => {
  test.setTimeout(90_000);
  const admin = createAdminClient();
  const cedenteEmail = `karai.phase5.cedente+${randomUUID()}@gmail.com`;
  const investorEmail = `karai.phase5.investor+${randomUUID()}@gmail.com`;
  const password = 'password123';
  const invoiceNumber = `FAC-${randomUUID()}`;

  const { data: cedenteData, error: cedenteError } = await admin.auth.admin.createUser({
    email: cedenteEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'cedente',
      display_name: 'Maria Cedente',
      company_name: 'Acme SA',
    },
  });

  const { data: investorData, error: investorError } = await admin.auth.admin.createUser({
    email: investorEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'inversor',
      display_name: 'Ines Inversora',
      company_name: 'Capital Sur',
    },
  });

  expect(cedenteError).toBeNull();
  expect(investorError).toBeNull();
  cleanup.push({ userIds: [cedenteData.user!.id, investorData.user!.id], invoiceNumber });

  await login(page, cedenteEmail, password, /\/cedente\/dashboard$/);

  await page.goto('/cedente/invoices/new');
  await page.getByLabel('Número de factura').fill(invoiceNumber);
  await page.getByLabel('Descripción').fill('Factura creada para validar riesgo estructurado y navegación inversora.');
  await page.getByRole('button', { name: 'Originar factura' }).click();

  await expect(page).toHaveURL(/\/cedente\/invoices\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: invoiceNumber })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Situación BCRA', { exact: true })).toBeVisible();
  await expect(page.getByText('Cheques rechazados', { exact: true })).toBeVisible();
  await expect(page.getByText('Origen narrativa', { exact: true })).toBeVisible();
  await expect(page.getByText('Tokenizada automáticamente', { exact: true })).toBeVisible();
  await expect(page.getByText('Publicada en funding', { exact: true })).toBeVisible();

  const invoiceId = page.url().split('/').at(-1);
  expect(invoiceId).toBeTruthy();

  await login(page, investorEmail, password, /\/inversor\/dashboard$/);

  await expect(page.getByText('Retorno esperado abierto', { exact: true })).toBeVisible();
  await expect(page.getByText('Mayor concentración', { exact: true })).toBeVisible();
  await expect(page.getByText('Días al vencimiento', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('CUIT', { exact: true }).first()).toBeVisible();

  await page.getByRole('link', { name: 'Ver detalle' }).first().click();
  await expect(page).toHaveURL(/\/inversor\/invoices\/[^/]+$/);
  await expect(page.getByText('Días al vencimiento', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Retorno por fracción', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Fracción', { exact: true }).first()).toBeVisible();

  await page.goto(`/inversor/invoices/${invoiceId}`);
  await expect(page.getByText('Días al vencimiento', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Retorno por fracción', { exact: true }).first()).toBeVisible();
});
