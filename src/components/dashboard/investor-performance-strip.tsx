type InvestorPerformanceStripProps = {
  investedCapital: number;
  expectedOpenReturn: number;
  realizedReturnTotal: number;
  topPayerConcentration: number;
};

export function InvestorPerformanceStrip({
  investedCapital,
  expectedOpenReturn,
  realizedReturnTotal,
  topPayerConcentration,
}: InvestorPerformanceStripProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-4">
      <PerformanceCard label="Capital invertido" value={formatCurrency(investedCapital)} />
      <PerformanceCard label="Retorno esperado abierto" value={formatCurrency(expectedOpenReturn)} />
      <PerformanceCard label="Retorno realizado" value={formatCurrency(realizedReturnTotal)} />
      <PerformanceCard label="Mayor concentración" value={`${(topPayerConcentration * 100).toFixed(1)}%`} />
    </section>
  );
}

function PerformanceCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}
