import type { TimelineItem } from '@/lib/settlement/timeline';

type EventTimelineProps = {
  items: TimelineItem[];
};

function formatAmount(amount?: number) {
  if (typeof amount !== 'number') {
    return null;
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function EventTimeline({ items }: EventTimelineProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-white/15 bg-slate-950/30 p-6 text-slate-300">
        Todavía no hay hitos auditables para esta factura.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Timeline auditable</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Lifecycle + movimientos financieros</h2>
        </div>
        <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">{items.length} hitos</span>
      </div>

      <ol className="mt-6 space-y-4">
        {items.map((item, index) => {
          const amount = formatAmount(item.amount);
          const isFinancial = item.kind === 'financial';

          return (
            <li key={item.id} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[auto,1fr,auto] md:items-center">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold uppercase tracking-[0.2em] ${
                  isFinancial ? 'bg-sky-400/15 text-sky-200' : 'bg-emerald-400/15 text-emerald-200'
                }`}
              >
                {index + 1}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{isFinancial ? 'Financiero' : 'Estado'}</p>
                <p className="mt-1 text-lg font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm text-slate-400">{formatTimestamp(item.at)}</p>
              </div>
              {amount ? <p className="text-right text-base font-semibold text-white">{amount}</p> : <div />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
