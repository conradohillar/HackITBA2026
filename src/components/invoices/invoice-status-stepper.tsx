const statuses = ['draft', 'validating', 'validated', 'tokenized', 'funding'] as const;

const labels: Record<(typeof statuses)[number], string> = {
  draft: 'Draft',
  validating: 'Validating',
  validated: 'Validated',
  tokenized: 'Tokenized',
  funding: 'Funding',
};

export function InvoiceStatusStepper({ currentStatus }: { currentStatus: string }) {
  const activeIndex = statuses.indexOf(currentStatus as (typeof statuses)[number]);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Estado de lifecycle</p>
      <div className="mt-5 grid gap-4 md:grid-cols-5">
        {statuses.map((status, index) => {
          const isActive = index <= activeIndex;
          return (
            <div
              key={status}
              className={`rounded-2xl border px-4 py-4 text-sm ${isActive ? 'border-emerald-300/30 bg-emerald-400/10 text-white' : 'border-white/10 bg-black/20 text-slate-400'}`}
            >
              <p className="text-xs uppercase tracking-[0.25em]">{index + 1}</p>
              <p className="mt-2 font-semibold">{labels[status]}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
