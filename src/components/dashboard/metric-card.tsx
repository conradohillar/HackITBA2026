type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,20,18,0.88),rgba(8,12,11,0.75))] p-5 shadow-xl shadow-black/15">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-slate-300">{hint}</p> : null}
    </article>
  );
}
