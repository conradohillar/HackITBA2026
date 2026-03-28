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

const createdUserIds: string[] = [];

test.afterEach(async () => {
  const admin = createAdminClient();

  while (createdUserIds.length) {
    const userId = createdUserIds.pop();
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

async function runSignupFlow(
  page: Parameters<typeof test>[0]['page'],
  role: 'cedente' | 'inversor',
  dashboardPath: '/cedente/dashboard' | '/inversor/dashboard',
  dashboardTitle: string,
) {
  const email = `karai.demo+${randomUUID()}@gmail.com`;
  const password = 'password123';
  const displayName = role === 'cedente' ? 'María Cedente' : 'Ivo Inversor';
  const companyName = role === 'cedente' ? 'Acme SA' : 'Capital Norte';

  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Nombre visible').fill(displayName);
  await page.getByLabel('Empresa (opcional)').fill(companyName);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByText(role === 'cedente' ? 'Cedente · PyME que sube facturas' : 'Inversor · Compra fracciones con retorno fijo').click();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(new RegExp(`${dashboardPath}$`));
  await expect(page.getByRole('heading', { name: dashboardTitle })).toBeVisible();
  await expect(page.getByText(displayName)).toBeVisible();

  const admin = createAdminClient();
  const { data: userLookup } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const userId = userLookup.users.find((user) => user.email === email)?.id;
  if (userId) createdUserIds.push(userId);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(new RegExp(`${dashboardPath}$`));
}

test.describe('auth signup flow', () => {
  test('cedente signup lands on the cedente dashboard', async ({ page }) => {
    await runSignupFlow(page, 'cedente', '/cedente/dashboard', 'Bienvenido al workspace de PyME');
  });

  test('inversor signup lands on the investor dashboard', async ({ page }) => {
    await runSignupFlow(page, 'inversor', '/inversor/dashboard', 'Bienvenido al workspace de inversión');
  });
});
