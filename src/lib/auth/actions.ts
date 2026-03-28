'use server';

import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { buildSignupMetadata, loginSchema, signupSchema } from '@/lib/auth/schemas';
import { getDashboardPathForRole } from '@/lib/auth/session';
import type { AuthRole, LoginPayload, SignupPayload } from '@/lib/auth/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthActionResult = {
  status: 'success' | 'error';
  message?: string;
  redirectTo?: string;
  fieldErrors?: Partial<Record<keyof SignupPayload | keyof LoginPayload, string>>;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function toFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? 'Campo inválido']),
  );
}

async function resolveRedirectForUser(roleHint?: AuthRole) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roleFromMetadata = user?.user_metadata?.role as AuthRole | undefined;
  const role = roleHint ?? roleFromMetadata;

  if (!user || !role) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: AuthRole }>();

  return getDashboardPathForRole(profile?.role ?? role);
}

export async function signupAction(payload: SignupPayload): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá los datos e intentá de nuevo.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const values = parsed.data;
  const admin = getAdminClient();

  const { error: createError } = await admin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: buildSignupMetadata(values),
  });

  if (createError) {
    return {
      status: 'error',
      message: createError.message,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (signInError) {
    return {
      status: 'error',
      message: signInError.message,
    };
  }

  const redirectTo = await resolveRedirectForUser(values.role);

  if (!redirectTo) {
    return {
      status: 'error',
      message: 'No pudimos resolver el dashboard para tu rol.',
    };
  }

  return {
    status: 'success',
    redirectTo,
  };
}

export async function loginAction(payload: LoginPayload): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Revisá tus credenciales e intentá de nuevo.',
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: 'error',
      message: error.message,
    };
  }

  const redirectTo = await resolveRedirectForUser();

  if (!redirectTo) {
    return {
      status: 'error',
      message: 'Tu cuenta no tiene un perfil asignado todavía.',
    };
  }

  return {
    status: 'success',
    redirectTo,
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
