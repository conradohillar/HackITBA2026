import { describe, expect, it } from 'vitest';
import { authRoles } from '@/lib/auth/types';
import { loginSchema, signupSchema } from '@/lib/auth/schemas';

describe('Phase 1 auth harness', () => {
  it('exposes desktop and mobile projects in Playwright config', async () => {
    const { default: config } = await import('../../playwright.config');
    const projectNames = (config.projects ?? []).map((project) => project.name);

    expect(projectNames).toContain('chromium');
    expect(projectNames).toContain('Mobile Chrome');
  });

  it('pins the shared role and schema contract for later auth work', () => {
    expect(authRoles).toEqual(['cedente', 'inversor']);

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
  });
});
