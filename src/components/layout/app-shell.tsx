import Link from 'next/link';
import { logoutAction } from '@/lib/auth/actions';
import { getCurrentAuthState } from '@/lib/auth/session';
import { AppShellNav } from '@/components/layout/app-shell-nav';

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const { user, profile } = await getCurrentAuthState();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link className="flex items-end gap-2 text-emerald-100" href="/">
            <svg className="h-8 w-8" viewBox="200 127 196 193" fill="#d1fae5" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(0,450) scale(0.1,-0.1)">
                <path d="M3200 3169 c0 -61 -27 -155 -66 -229 -88 -168 -238 -273 -434 -304 l-75 -12 -3 -361 -2 -362 37 -6 c182 -26 265 -65 373 -173 58 -58 86 -96 113 -152 36 -77 57 -155 57 -215 l0 -35 368 0 368 0 -4 68 c-15 288 -133 574 -330 800 l-64 73 49 55 c209 239 333 532 345 819 l3 70 -367 3 -368 2 0 -41z" />
                <path d="M2047 1893 c-4 -3 -7 -134 -7 -290 l0 -283 290 0 290 0 0 290 0 290 -283 0 c-156 0 -287 -3 -290 -7z" />
              </g>
            </svg>
            <h1 className="text-3xl font-semibold">Karaí</h1>
          </Link>

          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <AppShellNav isAuthenticated={Boolean(user && profile)} role={profile?.role ?? null} />
            {user ? (
              <form action={logoutAction}>
                <button className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/5" type="submit">
                  Cerrar sesión
                </button>
              </form>
            ) : null}
          </nav>

        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
