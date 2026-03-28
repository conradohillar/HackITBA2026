import { InvoiceOriginationForm } from '@/components/invoices/invoice-origination-form';

export default function NewInvoicePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Cedente flow</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Subí una factura y dispará el motor de riesgo</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
          Cargá los datos del pagador, el monto y la descripción. Karaí crea el draft, consulta BCRA, calcula el tier y deja la factura lista para tokenización.
        </p>
      </div>

      <div className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/40 p-8">
        <InvoiceOriginationForm />
      </div>
    </section>
  );
}
