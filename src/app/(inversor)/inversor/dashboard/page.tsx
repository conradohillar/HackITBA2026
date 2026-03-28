import { logoutAction } from '@/lib/auth/actions';
import { getCurrentAuthState } from '@/lib/auth/session';
import { DashboardHero } from '@/components/layout/dashboard-hero';

export default async function InversorDashboardPage() {
  const { profile } = await getCurrentAuthState();

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl px-6 py-16">
      <DashboardHero
        companyName={profile?.company_name}
        description="Tu siguiente paso va a ser explorar la marketplace de facturas. En esta fase dejamos listo el acceso y el aterrizaje inmediato para inversores."
        displayName={profile?.display_name}
        role="inversor"
        title="Bienvenido al workspace de inversión"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Próximo plan: marketplace y funding</div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Tus compras aparecerán acá</div>
          <form action={logoutAction}>
            <button className="w-full rounded-2xl bg-white px-5 py-5 font-semibold text-slate-950" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </DashboardHero>
    </section>
  );
}
