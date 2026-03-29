import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-6">
      <div className="space-y-6">
        <h2 className="text-5xl font-semibold text-white md:text-6xl">
          Elegí tu rol y empezá a operar cheques tokenizados con scoring automático y tasas transparentes.
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-slate-200">
            Cedente: sube cheques, recibe score y tokenización automática.
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 text-slate-200">
            Inversor: ve tasa anual, retorno abierto y ficha del cheque antes de comprar.
          </div>
        </div>
      </div>

      <SignupForm />
    </section>
  );
}
