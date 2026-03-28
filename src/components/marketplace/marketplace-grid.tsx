'use client';

import { useCallback } from 'react';
import { MarketplaceCard } from '@/components/marketplace/marketplace-card';
import { useMarketplaceRealtime } from '@/hooks/use-marketplace-realtime';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toMarketplaceInvoiceCard, type MarketplaceInvoiceRow } from '@/lib/marketplace/read-model';
import type { MarketplaceInvoiceCard as MarketplaceInvoiceCardType } from '@/lib/marketplace/types';

type MarketplaceGridProps = {
  initialInvoices: MarketplaceInvoiceCardType[];
};

export function MarketplaceGrid({ initialInvoices }: MarketplaceGridProps) {
  const refresh = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
        .from('invoices')
        .select(
          'id, status, invoice_number, pagador_name, pagador_cuit, amount, net_amount, risk_tier, discount_rate, total_fractions, funded_fractions, due_date',
        )
      .in('status', ['funding', 'funded'])
      .order('due_date', { ascending: true });

    return ((data as MarketplaceInvoiceRow[] | null) ?? [])
      .map(toMarketplaceInvoiceCard)
      .filter((invoice): invoice is MarketplaceInvoiceCardType => invoice !== null);
  }, []);

  const { invoices, mode } = useMarketplaceRealtime({
    initialInvoices,
    refresh,
  });

  if (invoices.length === 0) {
    return (
        <div className="rounded-[2rem] border border-dashed border-white/15 bg-slate-950/30 p-8 text-slate-300">
        Todavía no hay cheques en funding. Cuando un cedente complete la tokenización automática, aparecerán acá.
        </div>
      );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {invoices.map((invoice) => (
        <MarketplaceCard key={invoice.id} invoice={invoice} mode={mode} />
      ))}
    </div>
  );
}
