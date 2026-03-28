import { getFundingProgressPercentage } from '@/lib/marketplace/calculations';

type FundingProgressBarProps = {
  fundedFractions: number;
  totalFractions: number;
};

export function FundingProgressBar({ fundedFractions, totalFractions }: FundingProgressBarProps) {
  const progress = getFundingProgressPercentage({ fundedFractions, totalFractions });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>Funding</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-sky-300 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-slate-400">
        {fundedFractions} / {totalFractions} fracciones fondeadas
      </p>
    </div>
  );
}
