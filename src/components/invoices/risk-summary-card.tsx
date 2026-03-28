import { RiskBadge } from '@/components/invoices/risk-badge';
import type { RiskTier } from '@/lib/risk/pricing';

type RiskSummaryCardProps = {
  tier: RiskTier;
  discountRate: number;
  explanation: string;
  evidence: string[];
};

export function RiskSummaryCard({ tier, discountRate, explanation, evidence }: RiskSummaryCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Resultado de riesgo</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Scoring validado para marketplace</h2>
        </div>
        <RiskBadge tier={tier} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-400">Tasa de descuento</p>
          <p className="mt-2 text-3xl font-semibold text-white">{(discountRate * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-400">Narrativa</p>
          <p className="mt-2 text-base leading-7 text-slate-200">{explanation}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Evidencia BCRA</p>
        <ul className="mt-4 space-y-3 text-sm text-slate-200">
          {evidence.map((item) => (
            <li key={item} className="rounded-2xl border border-white/10 px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
