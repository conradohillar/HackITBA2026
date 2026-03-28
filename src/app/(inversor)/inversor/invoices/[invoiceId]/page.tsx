import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventTimeline } from '@/components/invoices/event-timeline';
import { InvoiceStatusStepper } from '@/components/invoices/invoice-status-stepper';
import { InvoiceFactsList } from '@/components/marketplace/invoice-facts-list';
import { SettlementSummary } from '@/components/invoices/settlement-summary';
import { PurchaseFractionsForm } from '@/components/marketplace/purchase-fractions-form';
import { RiskBadge } from '@/components/invoices/risk-badge';
import { getInvoiceFundingSnapshot } from '@/lib/marketplace/queries';
import { getInvestorInvoiceSettlementView } from '@/lib/settlement/queries';

export default async function InvestorInvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const [snapshot, settlementView] = await Promise.all([getInvoiceFundingSnapshot(invoiceId), getInvestorInvoiceSettlementView(invoiceId)]);

  if (!snapshot && !settlementView) {
    notFound();
  }

  const currentStatus =
    settlementView?.invoice.status ?? (snapshot ? (snapshot.availableFractions === 0 ? 'funded' : 'funding') : 'funding');
  const title = settlementView?.invoice.invoiceNumber ?? snapshot?.invoiceNumber ?? 'Factura';
  const payerName = settlementView?.invoice.pagadorName ?? snapshot?.pagadorName ?? '';
  const amount = settlementView?.invoice.amount ?? snapshot?.amount ?? 0;
  const netAmount = settlementView?.invoice.netAmount ?? snapshot?.netAmount ?? 0;
  const dueDate = settlementView?.invoice.dueDate ?? snapshot?.dueDate ?? '';
  const discountRate = snapshot?.discountRate ?? 0;
  const riskTier = snapshot?.riskTier ?? 'A';
  const payerCuit = snapshot?.payerCuit ?? '';
  const daysToMaturity = snapshot?.daysToMaturity ?? 0;
  const availableFractions = snapshot?.availableFractions ?? 0;
  const perFractionNetAmount = snapshot?.perFractionNetAmount ?? 0;
  const perFractionExpectedReturn = snapshot?.perFractionExpectedReturn ?? 0;
  const progressPercentage = snapshot?.progressPercentage ?? 0;

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-8">
        <Link className="text-sm font-semibold text-sky-200" href="/inversor/dashboard">
          ← Volver al marketplace
        </Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Detalle de inversión</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">{title}</h1>
            <p className="mt-2 text-lg text-slate-300">{payerName}</p>
          </div>
          <RiskBadge tier={riskTier} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Monto total" value={`ARS ${amount.toLocaleString('es-AR')}`} />
          <Metric label="Monto neto" value={`ARS ${netAmount.toLocaleString('es-AR')}`} />
          <Metric label="Tasa descuento" value={`${(discountRate * 100).toFixed(1)}%`} />
          <Metric label="Vencimiento" value={dueDate} />
        </div>
      </div>

      <InvoiceStatusStepper currentStatus={currentStatus} />

      {snapshot ? (
        <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Ficha del cheque</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Días al vencimiento y economía por fracción antes de comprar</h2>
          <div className="mt-6">
            <InvoiceFactsList
              availableFractions={availableFractions}
              daysToMaturity={daysToMaturity}
              discountRate={discountRate}
              payerCuit={payerCuit}
              perFractionExpectedReturn={perFractionExpectedReturn}
              perFractionNetAmount={perFractionNetAmount}
              progressPercentage={progressPercentage}
            />
          </div>
        </section>
      ) : null}

      {settlementView ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Metric label="Fracciones propias" value={`${settlementView.holding.ownedFractions}`} />
            <Metric label="Capital invertido" value={formatCurrency(settlementView.holding.investedPrincipal)} />
            <Metric label="Retorno esperado" value={formatCurrency(settlementView.holding.expectedReturn)} />
          </section>

          <SettlementSummary
            description="Tu vista de portafolio conserva capital invertido, retorno esperado y retorno realizado cuando la factura avanza a settlement."
            heading="Resumen del holding"
            interestTotal={settlementView.holding.realizedReturn}
            principalTotal={settlementView.holding.investedPrincipal}
          />

          <EventTimeline items={settlementView.timeline} />

          <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Movimientos del inversor</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Capital + rendimiento registrados</h2>
            <div className="mt-6 space-y-3">
              {settlementView.transactionHistory.map((transaction) => (
                <article key={transaction.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr,auto] md:items-center">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{transaction.type}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{transaction.description}</p>
                    <p className="mt-1 text-sm text-slate-400">{transaction.at}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{transaction.direction === 'in' ? 'Ingreso' : 'Egreso'}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(transaction.amount)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {snapshot ? <PurchaseFractionsForm initialSnapshot={snapshot} /> : null}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
