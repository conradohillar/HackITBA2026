type TransactionHistoryItem = {
  id: string;
  type: string;
  amount: number;
  at: string;
  description: string;
};

type TransactionHistoryTableProps = {
  items: TransactionHistoryItem[];
  emptyMessage: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TransactionHistoryTable({ items, emptyMessage }: TransactionHistoryTableProps) {
  if (items.length === 0) {
    return <p className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-6 text-slate-300">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,16,0.92),rgba(8,12,11,0.8))] shadow-xl shadow-black/15">
      <div className="grid grid-cols-[1.4fr,0.8fr,0.8fr] gap-4 border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.25em] text-slate-400">
        <span>Movimiento</span>
        <span>Fecha</span>
        <span className="text-right">Monto</span>
      </div>
      <div className="divide-y divide-white/10">
        {items.map((item) => (
          <article key={item.id} className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1.4fr,0.8fr,0.8fr] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.type}</p>
              <p className="mt-1 text-base font-semibold text-white">{item.description}</p>
            </div>
            <p className="text-sm text-slate-300">{item.at}</p>
            <p className="text-right text-base font-semibold text-white">{formatCurrency(item.amount)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
