import { notFound } from 'next/navigation';
import { getInvoiceDetail } from '@/lib/invoices/queries';
import { EventTimeline } from '@/components/invoices/event-timeline';
import { RiskSummaryCard } from '@/components/invoices/risk-summary-card';
import { InvoiceStatusStepper } from '@/components/invoices/invoice-status-stepper';
import { SettlementActionForm } from '@/components/invoices/settlement-action-form';
import { SettlementSummary } from '@/components/invoices/settlement-summary';
import { TokenizationSummary } from '@/components/invoices/tokenization-summary';
import { getCedenteInvoiceSettlementView } from '@/lib/settlement/queries';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const [invoice, settlementView] = await Promise.all([getInvoiceDetail(invoiceId), getCedenteInvoiceSettlementView(invoiceId)]);

  if (!invoice || !settlementView) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.18),transparent_35%),linear-gradient(180deg,rgba(10,20,17,0.94),rgba(8,12,11,0.8))] p-8 shadow-2xl shadow-black/20">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Cheque originado</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">{invoice.invoice_number}</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric label="Pagador" value={invoice.pagador_name} />
          <Metric label="CUIT" value={invoice.pagador_cuit} />
          <Metric label="Monto" value={`ARS ${Number(invoice.amount).toLocaleString('es-AR')}`} />
          <Metric label="Vencimiento" value={invoice.due_date} />
        </div>
        <p className="mt-6 max-w-3xl leading-7 text-slate-300">{invoice.description}</p>
      </div>

      <InvoiceStatusStepper currentStatus={invoice.status} />

      {invoice.risk_tier && invoice.discount_rate !== null && invoice.risk_explanation && invoice.riskSummary ? (
        <RiskSummaryCard
          tier={invoice.risk_tier as 'A' | 'B' | 'C' | 'D'}
          discountRate={Number(invoice.discount_rate)}
          explanation={invoice.risk_explanation}
          currentSituation={invoice.riskSummary.currentSituation}
          daysOverdue={invoice.riskSummary.daysOverdue}
          rejectedChecksCount={invoice.riskSummary.rejectedChecksCount}
          rejectedChecksAmount={invoice.riskSummary.rejectedChecksAmount}
          historicalTrend={invoice.riskSummary.historicalTrend}
          deterministicSignals={invoice.riskSummary.deterministicSignals}
          narrativeSource={invoice.riskSummary.narrativeSource}
          evidence={invoice.riskSummary.evidence}
        />
      ) : null}

      {invoice.tokenizationStatus.tokenHash && invoice.tokenizationStatus.totalFractions ? (
        <TokenizationSummary
          autoPublishedToFunding={invoice.tokenizationStatus.autoPublishedToFunding}
          tokenHash={invoice.tokenizationStatus.tokenHash}
          netAmount={invoice.tokenizationStatus.netAmount}
          totalFractions={invoice.tokenizationStatus.totalFractions}
        />
      ) : null}

      <SettlementSummary
        cedenteDisbursementTotal={settlementView.settlement.cedenteDisbursementTotal}
        description="Leé el capital levantado, el spread liquidado y el desembolso al cedente sin recalcular nada en cliente para este cheque."
        interestTotal={settlementView.settlement.interestTotal}
        principalTotal={settlementView.settlement.principalTotal}
      />

      <SettlementActionForm canSettle={settlementView.settlement.canSettle} invoiceId={invoiceId} />

      <EventTimeline items={settlementView.timeline} />

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,16,0.92),rgba(8,12,11,0.78))] p-6 shadow-xl shadow-black/15">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Historial transaccional</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Ledger visible para el cedente</h2>
        <div className="mt-6 space-y-3">
          {settlementView.transactionHistory.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-slate-300">
              Todavía no hay movimientos visibles para este emisor.
            </p>
          ) : (
            settlementView.transactionHistory.map((transaction) => (
              <article key={transaction.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr,auto] md:items-center">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{transaction.type}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{transaction.description}</p>
                  <p className="mt-1 text-sm text-slate-400">{transaction.at}</p>
                </div>
                <p className="text-right text-lg font-semibold text-white">{formatCurrency(transaction.amount)}</p>
              </article>
            ))
          )}
        </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
