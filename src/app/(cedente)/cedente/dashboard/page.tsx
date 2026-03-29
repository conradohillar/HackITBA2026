import Link from 'next/link';
import { getCurrentAuthState } from '@/lib/auth/session';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TransactionHistoryTable } from '@/components/dashboard/transaction-history-table';
import { DashboardHero } from '@/components/layout/dashboard-hero';
import { getCedenteDashboard } from '@/lib/settlement/queries';

export default async function CedenteDashboardPage() {
  const { profile } = await getCurrentAuthState();
  const dashboard = await getCedenteDashboard();
  const statusEntries = Object.entries(dashboard.statusCounts);

  return (
    <section className="mx-auto min-h-[calc(100vh-81px)] max-w-6xl space-y-8 px-6 py-16">
      <DashboardHero
        companyName={profile?.company_name}
        description="Seguimiento operativo del pipeline completo: cheques emitidos, capital levantado, costo efectivo y próximos hitos de settlement." 
        displayName={profile?.display_name}
        role="cedente"
        title="Control de colocación y settlement"
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Siguiente acción</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Cargá un cheque nuevo y dejá que Karaí haga el resto.</h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Consultamos al BCRA, analizamos el índice de riesgo usando un modelo de IA, calculamos la tasa apropiada y tokenizamos automáticamente.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="rounded-full bg-emerald-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-emerald-200" href="/cedente/invoices/new">
                Cargar cheque
              </Link>
              <span className="rounded-full border border-white/10 px-4 py-3 text-sm text-slate-300">
                {dashboard.invoices.length} cheques visibles en pipeline
              </span>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Lectura rápida</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {statusEntries.length > 0 ? (
                statusEntries.slice(0, 4).map(([status, count]) => (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={status}>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{status}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{count}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300 sm:col-span-2">
                  Todavía no hay cheques activos. Cargá el primero para habilitar el pipeline.
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardHero>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard hint={`${dashboard.statusCounts.funding ?? 0} en funding · ${dashboard.statusCounts.funded ?? 0} funded`} label="Cheques activos" value={`${dashboard.invoices.length}`} />
        <MetricCard hint="Capital total recaudado en cheques fondeados y liquidados" label="Capital levantado" value={formatCurrency(dashboard.totalCapitalRaised)} />
        <MetricCard hint="Spread total sobre monto nominal de cheques fondeados o liquidados" label="Costo efectivo" value={`${(dashboard.effectiveFinancingCost * 100).toFixed(2)}%`} />
        <MetricCard hint="Spread acumulado" label="Spread total" value={formatCurrency(dashboard.spreadTotal)} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,16,0.92),rgba(8,12,11,0.78))] p-6 shadow-xl shadow-black/15">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Cheques del cedente</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Pipeline visible de originación a settlement</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {dashboard.invoices.map((invoice) => (
            <article key={invoice.id} className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 shadow-lg shadow-black/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{invoice.status}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{invoice.invoiceNumber}</p>
                </div>
                <p className="text-right text-sm text-slate-300">{invoice.dueDate}</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <MetricCard label="Monto" value={formatCurrency(invoice.amount)} />
                <MetricCard label="Monto neto" value={formatCurrency(invoice.netAmount)} />
              </div>
              <div className="mt-4 flex justify-end">
                <Link className="text-sm font-semibold text-emerald-200" href={`/cedente/invoices/${invoice.id}`}>
                  Ver cheque completo →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Ledger reciente</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Compras y desembolsos visibles para la PyME</h2>
        </div>
        <TransactionHistoryTable emptyMessage="Todavía no hay movimientos recientes para mostrar." items={dashboard.recentTransactions} />
      </section>
    </section>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}
