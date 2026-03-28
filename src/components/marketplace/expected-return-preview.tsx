import { calculateCheckoutSummary } from '@/lib/marketplace/calculations';

type ExpectedReturnPreviewProps = {
  fractionCount: number;
  perFractionNetAmount: number;
  perFractionExpectedReturn: number;
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
});

export function ExpectedReturnPreview({
  fractionCount,
  perFractionNetAmount,
  perFractionExpectedReturn,
}: ExpectedReturnPreviewProps) {
  const summary = calculateCheckoutSummary({
    fractionCount,
    perFractionNetAmount,
    perFractionExpectedReturn,
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Retorno estimado</p>
      <dl className="mt-4 space-y-3 text-sm text-slate-300">
        <div className="flex items-center justify-between gap-4">
          <dt>Fracciones</dt>
          <dd>{summary.fractionCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Desembolso</dt>
          <dd>{currencyFormatter.format(summary.checkoutTotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Retorno esperado</dt>
          <dd>{currencyFormatter.format(summary.expectedReturnTotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 font-semibold text-emerald-200">
          <dt>Interés estimado</dt>
          <dd>{currencyFormatter.format(summary.expectedInterestTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}
