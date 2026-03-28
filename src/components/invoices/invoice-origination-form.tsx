'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitInvoiceAction } from '@/lib/invoices/actions';
import { invoiceOriginationSchema, type InvoiceOriginationFormInput } from '@/lib/invoices/schemas';

export function InvoiceOriginationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<InvoiceOriginationFormInput>({
    resolver: zodResolver(invoiceOriginationSchema),
    defaultValues: {
      pagadorCuit: '30712345678',
      pagadorName: 'Techint SA',
      invoiceNumber: 'FAC-2026-001',
      faceValue: 1500000,
      issueDate: '2026-03-28',
      dueDate: '2026-06-28',
      description: 'Factura por servicios industriales y mantenimiento de planta.',
      fractionCount: 8,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await submitInvoiceAction(values);

      if (result.status === 'error') {
        setFormError(result.message ?? 'No pudimos originar la factura.');
        Object.entries(result.fieldErrors ?? {}).forEach(([key, message]) => {
          form.setError(key as keyof InvoiceOriginationFormInput, { message });
        });
        return;
      }

      router.push(result.redirectTo ?? '/cedente/invoices/new');
      router.refresh();
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { name: 'pagadorCuit', label: 'CUIT del pagador', type: 'text' },
          { name: 'pagadorName', label: 'Razón social pagador', type: 'text' },
          { name: 'invoiceNumber', label: 'Número de factura', type: 'text' },
          { name: 'faceValue', label: 'Monto nominal (ARS)', type: 'number' },
          { name: 'issueDate', label: 'Fecha de emisión', type: 'date' },
          { name: 'dueDate', label: 'Fecha de vencimiento', type: 'date' },
          { name: 'fractionCount', label: 'Cantidad de fracciones', type: 'number' },
        ].map((field) => (
          <div key={field.name}>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={field.name}>
              {field.label}
            </label>
            <input
              id={field.name}
              type={field.type}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
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
          className="w-full rounded-3xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
          {...form.register('description')}
        />
        {form.formState.errors.description ? (
          <p className="mt-2 text-sm text-rose-300">{form.formState.errors.description.message}</p>
        ) : null}
      </div>

      {formError ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p> : null}

      <button
        className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Validando factura…' : 'Originar factura'}
      </button>
    </form>
  );
}
