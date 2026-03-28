import { InvoiceOriginationForm } from '@/components/invoices/invoice-origination-form';

export default function NewInvoicePage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-[2rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.2),transparent_35%),linear-gradient(180deg,rgba(8,24,18,0.92),rgba(9,17,15,0.82))] p-8 shadow-2xl shadow-black/20">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Cedente flow</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Subí un cheque y dispará el motor de riesgo</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-200">
          Cargá los datos del pagador, el monto y la descripción. Karaí crea el draft, consulta BCRA, genera narrativa IA, calcula la tasa y deja el cheque tokenizado sin que el cedente elija fracciones manualmente.
        </p>
      </div>

      <div className="mt-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,16,0.92),rgba(8,12,11,0.78))] p-8 shadow-xl shadow-black/15">
        <InvoiceOriginationForm />
      </div>
    </section>
  );
}
