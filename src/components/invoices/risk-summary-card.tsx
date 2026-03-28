import { RiskBadge } from '@/components/invoices/risk-badge';
import type { RiskTier } from '@/lib/risk/pricing';

type RiskSummaryCardProps = {
  tier: RiskTier;
  discountRate: number;
  explanation: string;
  currentSituation: number;
  daysOverdue: number;
  rejectedChecksCount: number;
  rejectedChecksAmount: number;
  historicalTrend: Array<{ period: string; situacion: number }>;
  deterministicSignals: string[];
  narrativeSource: 'llm' | 'deterministic-fallback';
  evidence: string[];
};

export function RiskSummaryCard({
  tier,
  discountRate,
  explanation,
  currentSituation,
  daysOverdue,
  rejectedChecksCount,
  rejectedChecksAmount,
  historicalTrend,
  deterministicSignals,
  narrativeSource,
  evidence,
}: RiskSummaryCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Resultado de riesgo</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Scoring validado para marketplace</h2>
        </div>
        <RiskBadge tier={tier} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Situación BCRA" value={String(currentSituation || '0')} />
        <FactCard label="Atraso" value={`${daysOverdue} días`} />
        <FactCard label="Cheques rechazados" value={`${rejectedChecksCount} casos`} />
        <FactCard label="Origen narrativa" value={narrativeSource === 'llm' ? 'LLM' : 'Fallback deterministico'} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-400">Tasa de descuento</p>
          <p className="mt-2 text-3xl font-semibold text-white">{(discountRate * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-400">Monto rechazado</p>
          <p className="mt-2 text-3xl font-semibold text-white">ARS {rejectedChecksAmount.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-400">Narrativa</p>
          <p className="mt-2 text-base leading-7 text-slate-200">{explanation}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-400">Tendencia</p>
          <p className="mt-2 text-base leading-7 text-slate-200">
            {historicalTrend.length > 0
              ? historicalTrend.map((item) => `${item.period}: S${item.situacion}`).join(' · ')
              : 'Sin historial reciente'}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Señales determinísticas</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200">
          {deterministicSignals.length > 0 ? (
            deterministicSignals.map((signal) => (
              <span key={signal} className="rounded-full border border-white/10 px-3 py-2">
                {signal}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-white/10 px-3 py-2">Sin señales adversas relevantes</span>
          )}
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

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
