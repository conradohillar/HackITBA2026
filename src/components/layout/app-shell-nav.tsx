'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AppShellNavProps = {
  isAuthenticated: boolean;
  role: 'cedente' | 'inversor' | null;
};

export function AppShellNav({ isAuthenticated, role }: AppShellNavProps) {
  const pathname = usePathname();

  if (!isAuthenticated || !role) {
    return (
      <>
        <Link className={navClassName(pathname === '/login')} href="/login">
          Ingresar
        </Link>
        <Link className={navClassName(pathname === '/signup')} href="/signup">
          Crear cuenta
        </Link>
      </>
    );
  }

  if (role === 'cedente') {
    return (
      <>
        {pathname !== '/cedente/dashboard' ? (
          <Link className={navClassName(false)} href="/cedente/dashboard">
            Panel cedente
          </Link>
        ) : null}
        {pathname !== '/cedente/invoices/new' ? (
          <Link className={navClassName(false)} href="/cedente/invoices/new">
            Cargar cheque
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      {pathname !== '/inversor/dashboard' ? (
        <Link className={navClassName(false)} href="/inversor/dashboard">
          Panel inversor
        </Link>
      ) : null}
    </>
  );
}

function navClassName(active: boolean) {
  return `rounded-full border px-4 py-2 transition ${
    active
      ? 'border-emerald-300/40 bg-white/10 text-white'
      : 'border-white/10 text-slate-200 hover:border-emerald-300/40 hover:bg-white/5'
  }`;
}

