type PortfolioBreakdownItem = {
  payerCuit: string;
  payerName: string;
  investedPrincipal: number;
  share: number;
};

type PortfolioBreakdownProps = {
  items: PortfolioBreakdownItem[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PortfolioBreakdown({ items }: PortfolioBreakdownProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-6 text-slate-300">
        Tu mix de pagadores aparecerá acá cuando tengas holdings fondeados o liquidados.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Diversificación</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Mix por pagador</h2>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <article key={item.payerCuit} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-white">{item.payerName}</p>
                <p className="text-sm text-slate-400">CUIT {item.payerCuit}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Capital invertido</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(item.investedPrincipal)}</p>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-300" style={{ width: `${Math.max(item.share * 100, 6)}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-300">{(item.share * 100).toFixed(1)}% del capital invertido</p>
          </article>
        ))}
      </div>
    </section>
  );
}
