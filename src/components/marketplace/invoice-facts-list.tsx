type InvoiceFactsListProps = {
  payerCuit: string;
  daysToMaturity: number;
  discountRate: number;
  availableFractions: number;
  perFractionNetAmount: number;
  perFractionExpectedReturn: number;
  progressPercentage: number;
};

export function InvoiceFactsList({
  payerCuit,
  daysToMaturity,
  discountRate,
  availableFractions,
  perFractionNetAmount,
  perFractionExpectedReturn,
  progressPercentage,
}: InvoiceFactsListProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Fact label="CUIT" value={payerCuit} />
      <Fact label="Días al vencimiento" value={`${daysToMaturity}`} />
      <Fact label="Tasa" value={`${(discountRate * 100).toFixed(1)}%`} />
      <Fact label="Fracción" value={`ARS ${perFractionNetAmount.toLocaleString('es-AR')}`} />
      <Fact label="Retorno por fracción" value={`ARS ${perFractionExpectedReturn.toLocaleString('es-AR')}`} />
      <Fact label="Disponibles" value={`${availableFractions}`} />
      <Fact label="Progreso" value={`${progressPercentage.toFixed(1)}%`} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
