import { notFound } from 'next/navigation';
import { getInvoiceDetail } from '@/lib/invoices/queries';
import { RiskSummaryCard } from '@/components/invoices/risk-summary-card';
import { InvoiceStatusStepper } from '@/components/invoices/invoice-status-stepper';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const invoice = await getInvoiceDetail(invoiceId);

  if (!invoice) {
    notFound();
  }

  const evidence = invoice.bcra_data?.snapshot?.evidence ?? [];

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Factura originada</p>
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

      {invoice.risk_tier && invoice.discount_rate !== null && invoice.risk_explanation ? (
        <RiskSummaryCard
          tier={invoice.risk_tier as 'A' | 'B' | 'C' | 'D'}
          discountRate={Number(invoice.discount_rate)}
          explanation={invoice.risk_explanation}
          evidence={evidence}
        />
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
