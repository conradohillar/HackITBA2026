import Link from 'next/link';
import { logoutAction } from '@/lib/auth/actions';
import { getCurrentAuthState, getDashboardPathForRole } from '@/lib/auth/session';
import { AppShellNav } from '@/components/layout/app-shell-nav';

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const { user, profile } = await getCurrentAuthState();
  const dashboardHref = profile ? getDashboardPathForRole(profile.role) : '/signup';
  const contextLabel = !profile
    ? 'demo publico'
    : profile.role === 'cedente'
      ? 'operacion cedente'
      : 'mesa inversora';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link className="flex items-center gap-3" href="/">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">HackITBA 2026</p>
              <h1 className="text-xl font-semibold text-white">Karaí</h1>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <AppShellNav isAuthenticated={Boolean(user && profile)} role={profile?.role ?? null} />
            {!user ? (
              <Link className="rounded-full border border-white/10 px-4 py-2 transition hover:border-emerald-300/40 hover:bg-white/5" href={dashboardHref}>
                Ver demo
              </Link>
            ) : null}
            {user ? (
              <form action={logoutAction}>
                <button className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/5" type="submit">
                  Cerrar sesión
                </button>
              </form>
            ) : null}
          </nav>

          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
            {contextLabel} · ai credit scoring · cheques navegables
          </p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
