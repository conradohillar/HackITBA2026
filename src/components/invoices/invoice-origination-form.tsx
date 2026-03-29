'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitInvoiceAction } from '@/lib/invoices/actions';
import { invoiceOriginationSchema, type InvoiceOriginationFormInput } from '@/lib/invoices/schemas';
import { MAX_TOKEN_PRICE_PESOS } from '@/lib/tokenization/fractions';

export function InvoiceOriginationForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<InvoiceOriginationFormInput>({
    resolver: zodResolver(invoiceOriginationSchema),
    defaultValues: {
      pagadorCuit: '30712345678',
      pagadorName: 'Techint SA',
      invoiceNumber: 'CHQ-2026-001',
      faceValue: 1500000,
      issueDate: '2026-03-28',
      dueDate: '2026-06-28',
      description: 'Cheque de pago diferido por servicios industriales y mantenimiento de planta.',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await submitInvoiceAction(values);

      if (result.status === 'error') {
        setFormError(result.message ?? 'No pudimos originar el cheque.');
        Object.entries(result.fieldErrors ?? {}).forEach(([key, message]) => {
          form.setError(key as keyof InvoiceOriginationFormInput, { message });
        });
        return;
      }

      window.location.assign(result.redirectTo ?? '/cedente/invoices/new');
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { name: 'pagadorCuit', label: 'CUIT del pagador', type: 'text' },
          { name: 'pagadorName', label: 'Razón social pagador', type: 'text' },
          { name: 'invoiceNumber', label: 'Número de cheque', type: 'text' },
          { name: 'faceValue', label: 'Monto nominal (ARS)', type: 'number' },
          { name: 'issueDate', label: 'Fecha de emisión', type: 'date' },
          { name: 'dueDate', label: 'Fecha de vencimiento', type: 'date' },
        ].map((field) => (
          <div key={field.name}>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={field.name}>
              {field.label}
            </label>
            <input
              id={field.name}
              type={field.type}
              className="w-full rounded-2xl border border-white/10 bg-zinc-800/50 px-4 py-3 text-white outline-none"
              {...form.register(field.name as keyof InvoiceOriginationFormInput, {
                valueAsNumber: field.type === 'number',
              })}
            />
            {form.formState.errors[field.name as keyof InvoiceOriginationFormInput] ? (
              <p className="mt-2 text-sm text-rose-300">
                {form.formState.errors[field.name as keyof InvoiceOriginationFormInput]?.message as string}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="description">
          Descripción
        </label>
        <textarea
          id="description"
          rows={5}
          className="w-full rounded-3xl border border-white/10 bg-zinc-800/50 px-4 py-3 text-white outline-none"
          {...form.register('description')}
        />
        {form.formState.errors.description ? (
          <p className="mt-2 text-sm text-rose-300">{form.formState.errors.description.message}</p>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-400/10 p-5 text-sm text-emerald-50">
        Karaí define la tokenización automáticamente cuando termina el scoring: divide el cheque en fracciones con un valor mínimo de ARS {MAX_TOKEN_PRICE_PESOS.toLocaleString('es-AR')} por token.
      </div>

      {formError ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p> : null}

      <button
        className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Analizando cheque…' : 'Originar cheque'}
      </button>
    </form>
  );
}
