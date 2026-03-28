'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExpectedReturnPreview } from '@/components/marketplace/expected-return-preview';
import { FundingProgressBar } from '@/components/marketplace/funding-progress-bar';
import { RealtimeStatus } from '@/components/marketplace/realtime-status';
import { useMarketplaceRealtime } from '@/hooks/use-marketplace-realtime';
import { purchaseFractionsAction, type PurchaseFractionsResult } from '@/lib/marketplace/actions';
import { buildInvoiceFundingSnapshot, type FractionRow, type MarketplaceInvoiceRow } from '@/lib/marketplace/read-model';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { InvoiceFundingSnapshot } from '@/lib/marketplace/types';

type PurchaseFractionsFormProps = {
  initialSnapshot: InvoiceFundingSnapshot;
};

export function PurchaseFractionsForm({ initialSnapshot }: PurchaseFractionsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fractionCount, setFractionCount] = useState(1);
  const [result, setResult] = useState<PurchaseFractionsResult | null>(null);
  const initialInvoices = useMemo(() => [initialSnapshot], [initialSnapshot]);

  const refresh = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: invoice } = await supabase
        .from('invoices')
        .select(
          'id, status, invoice_number, pagador_name, pagador_cuit, amount, net_amount, risk_tier, discount_rate, total_fractions, funded_fractions, due_date',
        )
      .eq('id', initialSnapshot.id)
      .in('status', ['funding', 'funded'])
      .maybeSingle();

    if (!invoice) {
      return [initialSnapshot];
    }

    const { data: fractions } = await supabase
      .from('fractions')
      .select('id, net_amount')
      .eq('invoice_id', initialSnapshot.id)
      .eq('status', 'available')
      .order('fraction_index', { ascending: true });

    const snapshot = buildInvoiceFundingSnapshot(
      invoice as MarketplaceInvoiceRow,
      ((fractions as FractionRow[] | null) ?? []),
    );

    return snapshot ? [snapshot] : [initialSnapshot];
  }, [initialSnapshot]);

  const { invoices, mode } = useMarketplaceRealtime({
    initialInvoices,
    refresh,
  });
  const snapshot = invoices[0] ?? initialSnapshot;

  const maxFractionCount = Math.max(snapshot.availableFractions, 1);
  const safeFractionCount = Math.min(fractionCount, maxFractionCount);

  const feedbackClassName = useMemo(() => {
    if (!result) return null;
    return result.status === 'success'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
      : 'border-rose-300/30 bg-rose-400/10 text-rose-100';
  }, [result]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-white">Comprar fracciones</h2>
          <RealtimeStatus mode={mode} />
        </div>

        <FundingProgressBar fundedFractions={snapshot.fundedFractions} totalFractions={snapshot.totalFractions} />

        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Disponibles" value={`${snapshot.availableFractions}`} />
          <Metric label="Precio por fracción" value={`ARS ${snapshot.perFractionNetAmount.toLocaleString('es-AR')}`} />
          <Metric label="Retorno por fracción" value={`ARS ${snapshot.perFractionExpectedReturn.toLocaleString('es-AR')}`} />
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(async () => {
              const nextResult = await purchaseFractionsAction({
                invoiceId: snapshot.id,
                fractionCount: safeFractionCount,
              });

              setResult(nextResult);
              router.refresh();
            });
          }}
        >
          <label className="block text-sm text-slate-300" htmlFor="fraction-count">
            Cantidad de fracciones
          </label>
          <input
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-0"
            id="fraction-count"
            max={maxFractionCount}
            min={1}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              setFractionCount(Number.isNaN(nextValue) ? 1 : nextValue);
            }}
            type="number"
            value={safeFractionCount}
          />

          {result?.status === 'error' && result.fieldErrors?.fractionCount ? (
            <p className="text-sm text-rose-200">{result.fieldErrors.fractionCount}</p>
          ) : null}

          <button
            className="w-full rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || snapshot.availableFractions <= 0}
            type="submit"
          >
            {snapshot.availableFractions <= 0 ? 'No hay fracciones disponibles' : isPending ? 'Procesando compra...' : 'Comprar fracciones'}
          </button>
        </form>

        {result && feedbackClassName ? <p className={`rounded-2xl border px-4 py-3 text-sm ${feedbackClassName}`}>{result.message}</p> : null}
      </div>

      <ExpectedReturnPreview
        fractionCount={safeFractionCount}
        perFractionExpectedReturn={snapshot.perFractionExpectedReturn}
        perFractionNetAmount={snapshot.perFractionNetAmount}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
