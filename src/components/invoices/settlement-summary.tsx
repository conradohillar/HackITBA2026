type SettlementSummaryProps = {
  principalTotal: number;
  interestTotal: number;
  cedenteDisbursementTotal?: number;
  heading?: string;
  description?: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SettlementSummary({
  principalTotal,
  interestTotal,
  cedenteDisbursementTotal,
  heading = 'Resumen financiero',
  description = 'Principal, spread y desembolsos registrados para este cheque.',
}: SettlementSummaryProps) {
  const totalInvestorPayout = principalTotal + interestTotal;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Settlement</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{heading}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{description}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Capital a inversores" value={formatCurrency(principalTotal)} />
        <Metric label="Interés distribuido" value={formatCurrency(interestTotal)} />
        <Metric label="Payout total" value={formatCurrency(totalInvestorPayout)} />
        {typeof cedenteDisbursementTotal === 'number' ? (
          <Metric label="Desembolso cedente" value={formatCurrency(cedenteDisbursementTotal)} />
        ) : null}
      </div>
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
