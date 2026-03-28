import type { MarketplaceRealtimeMode } from '@/hooks/use-marketplace-realtime';

type RealtimeStatusProps = {
  mode: MarketplaceRealtimeMode;
};

const copy: Record<MarketplaceRealtimeMode, { label: string; className: string }> = {
  connecting: {
    label: 'Conectando…',
    className: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
  },
  live: {
    label: 'Live',
    className: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
  },
  polling: {
    label: 'Fallback cada 2s',
    className: 'border-sky-300/30 bg-sky-400/10 text-sky-100',
  },
};

export function RealtimeStatus({ mode }: RealtimeStatusProps) {
  const status = copy[mode];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${status.className}`}>
      {status.label}
    </span>
  );
}
