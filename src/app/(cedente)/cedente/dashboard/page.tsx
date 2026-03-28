import { logoutAction } from '@/lib/auth/actions';
import { getCurrentAuthState } from '@/lib/auth/session';
import { DashboardHero } from '@/components/layout/dashboard-hero';

export default async function CedenteDashboardPage() {
  const { profile } = await getCurrentAuthState();

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl px-6 py-16">
      <DashboardHero
        companyName={profile?.company_name}
        description="Tu siguiente paso va a ser subir facturas y pedir scoring. En esta fase dejamos listo el aterrizaje inmediato tras el signup."
        displayName={profile?.display_name}
        role="cedente"
        title="Bienvenido al workspace de PyME"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Próximo plan: originación de factura</div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">BCRA + IA conectados en Phase 2</div>
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
