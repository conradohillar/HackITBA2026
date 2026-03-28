import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AuthRedirectTarget, AuthRole } from '@/lib/auth/types';

export type AuthProfile = {
  id: string;
  role: AuthRole;
  display_name: string;
  company_name: string | null;
};

export function getDashboardPathForRole(role: AuthRole): AuthRedirectTarget {
  return role === 'cedente' ? '/cedente/dashboard' : '/inversor/dashboard';
}

export async function getCurrentAuthState() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, display_name, company_name')
    .eq('id', user.id)
    .single<AuthProfile>();

  return {
    user,
    profile: profile ?? null,
  };
}
