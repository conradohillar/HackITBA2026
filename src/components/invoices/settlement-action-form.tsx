'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { settleInvoiceAction } from '@/lib/settlement/actions';

type SettlementActionFormProps = {
  invoiceId: string;
  canSettle: boolean;
};

export function SettlementActionForm({ invoiceId, canSettle }: SettlementActionFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Acción demo</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Liquidar factura</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
        Ejecutá la simulación de settlement para registrar desembolso, devoluciones de capital e interés sobre la misma factura.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            const response = await settleInvoiceAction({ invoiceId });
            setResult(response.message);
            router.refresh();
          });
        }}
      >
        <button
          className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSettle || isPending}
          type="submit"
        >
          {!canSettle ? 'Settlement no disponible' : isPending ? 'Liquidando...' : 'Simular settlement'}
        </button>
      </form>

      <p className="mt-3 text-sm text-emerald-100">
        {canSettle ? 'Disponible cuando la factura ya quedó 100% fondeada.' : 'La factura ya fue liquidada o todavía no alcanzó el estado funded.'}
      </p>
      {result ? <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">{result}</p> : null}
    </section>
  );
}
