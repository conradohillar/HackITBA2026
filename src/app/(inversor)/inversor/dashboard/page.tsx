import Link from 'next/link';
import { logoutAction } from '@/lib/auth/actions';
import { getCurrentAuthState } from '@/lib/auth/session';
import { InvestorPerformanceStrip } from '@/components/dashboard/investor-performance-strip';
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
  const investedCapital = dashboard.holdings.reduce((sum, holding) => sum + holding.investedPrincipal, 0);

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl space-y-8 px-6 py-16">
      <DashboardHero
        companyName={profile?.company_name}
        description="Tu home sigue siendo el marketplace, ahora con retornos abiertos, cheque cards navegables y un resumen legible de concentración y estados del portafolio."
        displayName={profile?.display_name}
        role="inversor"
        title="Marketplace de cheques + portafolio vivo"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Cheque cards con tasa, vencimiento, progreso y economía por fracción antes del CTA.</div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-slate-300">Retorno esperado abierto, retorno realizado y concentración calculados en el query layer.</div>
          <form action={logoutAction}>
            <button className="w-full rounded-2xl bg-white px-5 py-5 font-semibold text-slate-950" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </DashboardHero>

      <InvestorPerformanceStrip
        expectedOpenReturn={dashboard.expectedOpenReturn}
        investedCapital={investedCapital}
        realizedReturnTotal={dashboard.realizedReturnTotal}
        topPayerConcentration={dashboard.topPayerConcentration}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard hint={`${dashboard.holdings.length} holdings visibles`} label="Portafolio" value={`${dashboard.holdings.length}`} />
        <MetricCard hint="Ganancia esperada/realizada ponderada por principal invertido" label="Yield promedio" value={`${(dashboard.weightedAverageYield * 100).toFixed(2)}%`} />
        <MetricCard hint="Cantidad de pagadores distintos en cartera" label="Diversificación" value={`${dashboard.diversificationCount}`} />
        <MetricCard hint="Capital invertido acumulado en holdings visibles" label="Capital invertido" value={formatCurrency(investedCapital)} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Estados del portafolio</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">HoldingsByStatus visible en el home</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Object.entries(dashboard.holdingsByStatus).map(([status, count]) => (
            <MetricCard key={status} hint="Holdings visibles para este estado" label={status} value={`${count}`} />
          ))}
        </div>
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
              <div className="mt-4 flex justify-end">
                <Link className="text-sm font-semibold text-sky-200" href={`/inversor/invoices/${holding.invoiceId}`}>
                  Ver cheque completo →
                </Link>
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
