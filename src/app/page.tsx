import Link from 'next/link';
import { DollarSpin } from '@/components/marketing/dollar-spin';

const journey = [
  {
    step: '01',
    title: 'Cedente carga el cheque',
    description: 'Sube pagador, monto y vencimiento. Karaí dispara BCRA + narrativa IA sin pedir pasos manuales extra.',
    href: '/cedente/invoices/new',
  },
  {
    step: '02',
    title: 'Karaí calcula riesgo y tasa',
    description: 'El scoring combina señales determinísticas, explicación asistida por OpenAI y una tasa visible para compra.',
    href: '/login',
  },
  {
    step: '03',
    title: 'Se tokeniza automaticamente',
    description: 'La emisión se divide en la mayor cantidad de fracciones posible para no superar ARS 100.000 por token.',
    href: '/signup',
  },
  {
    step: '04',
    title: 'El inversor compra con contexto',
    description: 'Dashboard, ficha del cheque, tasa, rendimiento actual, retorno esperado y navegación completa en desktop y mobile.',
    href: '/inversor/dashboard',
  },
] as const;

const highlights = [
  'Tasa anual visible antes de comprar',
  'Cheque cards con detalle alcanzable',
  'Stats para inversor: retorno actual, abierto y concentracion',
  'Narrativa de riesgo con IA sobre datos BCRA',
] as const;

export default function HomePage() {
  return (
    <div className="marketing-grid">
      <section className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <h2 className="max-w-4xl text-5xl font-semibold leading-tight text-white md:text-6xl">
            Cheques tokenizados, tasa clara y flujos realmente navegables.
          </h2>
          <DollarSpin />
        </div>

        <div className="mt-10 space-y-8">
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            Karaí conecta PyMEs que quieren adelantar cheques con inversores que buscan mejores rendimientos, con análisis de riesgo potenciado por OpenAI y operaciones aseguradas en la blockchain.
          </p>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 px-5 py-4 text-sm text-slate-200" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {journey.map((item) => (
            <Link className="marketing-panel rounded-[1.75rem] p-6 transition hover:-translate-y-1 hover:border-emerald-300/30" href={item.href} key={item.step}>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Paso {item.step}</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
