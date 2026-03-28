import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it } from 'vitest';
import { authRoles } from '@/lib/auth/types';
import { buildSignupMetadata, loginSchema, signupSchema } from '@/lib/auth/schemas';
import { getDashboardPathForRole } from '@/lib/auth/session';

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

const createdUserIds: string[] = [];

afterEach(async () => {
  const admin = createAdminClient();

  while (createdUserIds.length) {
    const userId = createdUserIds.pop();
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

describe('Phase 1 auth harness', () => {
  it('exposes desktop and mobile projects in Playwright config', async () => {
    const { default: config } = await import('../../playwright.config');
    const projectNames = (config.projects ?? []).map((project) => project.name);

    expect(projectNames).toContain('chromium');
    expect(projectNames).toContain('Mobile Chrome');
  });

  it('pins the shared role and schema contract for later auth work', () => {
    expect(authRoles).toEqual(['cedente', 'inversor']);
    expect(getDashboardPathForRole('cedente')).toBe('/cedente/dashboard');
    expect(getDashboardPathForRole('inversor')).toBe('/inversor/dashboard');

    const signup = signupSchema.parse({
      email: 'demo@karai.app',
      password: 'password123',
      role: 'cedente',
      displayName: 'Karaí Demo',
      companyName: 'Acme SA',
    });

    const login = loginSchema.parse({
      email: 'demo@karai.app',
      password: 'password123',
    });

    expect(signup.role).toBe('cedente');
    expect(login.email).toBe('demo@karai.app');
    expect(buildSignupMetadata(signup)).toEqual({
      role: 'cedente',
      display_name: 'Karaí Demo',
      company_name: 'Acme SA',
    });
  });

  it('creates the exact signup metadata shape the profile trigger requires', async () => {
    const admin = createAdminClient();
    const email = `phase1-${randomUUID()}@karai.app`;
    const metadata = buildSignupMetadata({
      email,
      password: 'password123',
      role: 'cedente',
      displayName: 'Karaí Demo',
      companyName: 'Acme SA',
    });

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
      user_metadata: metadata,
    });

    expect(userError).toBeNull();
    expect(userData.user).toBeTruthy();

    const userId = userData.user!.id;
    createdUserIds.push(userId);

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role, display_name, company_name')
      .eq('id', userId)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toMatchObject({
      role: 'cedente',
      display_name: 'Karaí Demo',
      company_name: 'Acme SA',
    });
  });
});
