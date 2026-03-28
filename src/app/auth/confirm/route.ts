import { redirect } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDashboardPathForRole } from '@/lib/auth/session';
import type { AuthRole } from '@/lib/auth/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  if (!tokenHash || !type) {
    redirect('/login?error=confirm-link');
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    redirect('/login?error=confirm-link');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role as AuthRole | undefined;
  redirect(role ? getDashboardPathForRole(role) : '/login');
}
