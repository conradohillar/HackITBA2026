import { logoutAction } from '@/lib/auth/actions';
import { getCurrentAuthState } from '@/lib/auth/session';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PortfolioBreakdown } from '@/components/dashboard/portfolio-breakdown';
import { TransactionHistoryTable } from '@/components/dashboard/transaction-history-table';
import { DashboardHero } from '@/components/layout/dashboard-hero';
import { MarketplaceGrid } from '@/components/marketplace/marketplace-grid';
import { getMarketplaceInvoices } from '@/lib/marketplace/queries';
import { getInvestorDashboard } from '@/lib/settlement/queries';

export default async function InversorDashboardPage() {
  const { profile } = await getCurrentAuthState();
  const [invoices, dashboard] = await Promise.all([getMarketplaceInvoices(), getInvestorDashboard()]);

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl space-y-8 px-6 py-16">
      <DashboardHero
        companyName={profile?.company_name}
        description="Tu home sigue siendo el marketplace, ahora con holdings, yield ponderado, concentración por pagador y movimientos recientes del portafolio."
        displayName={profile?.display_name}
        role="inversor"
        title="Marketplace + portafolio vivo"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Holdings visibles en funding, funded, settling y settled.</div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Yield promedio ponderado y mix por pagador calculados con datos persistidos.</div>
          <form action={logoutAction}>
            <button className="w-full rounded-2xl bg-white px-5 py-5 font-semibold text-slate-950" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </DashboardHero>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard hint={`${dashboard.holdings.length} holdings visibles`} label="Portafolio" value={`${dashboard.holdings.length}`} />
        <MetricCard hint="Ganancia esperada/realizada ponderada por principal invertido" label="Yield promedio" value={`${(dashboard.weightedAverageYield * 100).toFixed(2)}%`} />
        <MetricCard hint="Cantidad de pagadores distintos en cartera" label="Diversificación" value={`${dashboard.diversificationCount}`} />
        <MetricCard hint="Capital invertido acumulado en holdings visibles" label="Capital invertido" value={formatCurrency(dashboard.holdings.reduce((sum, holding) => sum + holding.investedPrincipal, 0))} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Holdings</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Facturas compradas y estado del retorno</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {dashboard.holdings.map((holding) => (
            <article key={holding.invoiceId} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{holding.status}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{holding.invoiceNumber}</p>
                  <p className="mt-1 text-sm text-slate-300">{holding.payerName}</p>
                </div>
                <p className="text-sm text-slate-400">{holding.ownedFractions} fracciones</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MetricCard label="Principal" value={formatCurrency(holding.investedPrincipal)} />
                <MetricCard label="Retorno esperado" value={formatCurrency(holding.expectedReturn)} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr,0.8fr]">
        <section className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Ledger reciente</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Compras, devoluciones de capital e interés</h2>
          </div>
          <TransactionHistoryTable emptyMessage="Todavía no hay movimientos recientes para tu cartera." items={dashboard.recentTransactions} />
        </section>

        <PortfolioBreakdown items={dashboard.payerBreakdown} />
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Marketplace</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Seguí comprando sin salir del dashboard</h2>
        </div>
        <MarketplaceGrid initialInvoices={invoices} />
      </section>
    </section>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(amount);
}
