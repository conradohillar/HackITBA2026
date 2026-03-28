import type { RiskTier } from '@/lib/risk/pricing';

const tierStyles: Record<RiskTier, string> = {
  A: 'border-emerald-300/30 bg-emerald-400/15 text-emerald-200',
  B: 'border-sky-300/30 bg-sky-400/15 text-sky-200',
  C: 'border-amber-300/30 bg-amber-400/15 text-amber-200',
  D: 'border-rose-300/30 bg-rose-400/15 text-rose-200',
};

export function RiskBadge({ tier }: { tier: RiskTier }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${tierStyles[tier]}`}>Tier {tier}</span>;
}
